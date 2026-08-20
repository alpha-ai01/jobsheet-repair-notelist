import { test, before, beforeEach, after } from "node:test";
import fs from "node:fs";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  query,
  where,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

const PROJECT_ID = "smart-repair-final-real";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8081,
      rules: fs.readFileSync("firestore.rules", "utf8")
    }
  });
});

beforeEach(async () => {
  await env.clearFirestore();

  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();

    for (const uid of ["ownerA", "managerA", "memberA", "ownerB"]) {
      await setDoc(doc(db, "users", uid), {
        uid,
        firstName: uid,
        email: `${uid}@test.com`,
        role: "user",
        active: true
      });
    }

    await setDoc(doc(db, "workspaces/A"), {
      ownerUid: "ownerA",
      name: "Shop A",
      status: "active",
      plan: "free",
      subscriptionStatus: "active",
      memberLimit: 1
    });

    await setDoc(doc(db, "workspaces/B"), {
      ownerUid: "ownerB",
      name: "Shop B",
      status: "active",
      plan: "free",
      subscriptionStatus: "active",
      memberLimit: 1
    });

    for (const [uid, role] of [
      ["ownerA", "owner"],
      ["managerA", "manager"],
      ["memberA", "member"]
    ]) {
      await setDoc(doc(db, `workspaces/A/members/${uid}`), {
        uid,
        role,
        status: "active",
        email: `${uid}@test.com`
      });
    }

    await setDoc(doc(db, "workspaces/B/members/ownerB"), {
      uid: "ownerB",
      role: "owner",
      status: "active",
      email: "ownerB@test.com"
    });

    const recent = Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
    const old = Timestamp.fromMillis(Date.now() - 4 * 60 * 60 * 1000);

    await setDoc(doc(db, "workspaces/A/repairs/recent"), {
      createdBy: "memberA",
      status: "waiting",
      createdAt: recent,
      updatedAt: recent
    });

    await setDoc(doc(db, "workspaces/A/repairs/old"), {
      createdBy: "memberA",
      status: "waiting",
      createdAt: old,
      updatedAt: old
    });

    await setDoc(doc(db, "workspaces/A/repairs/done"), {
      createdBy: "memberA",
      status: "done",
      createdAt: recent,
      updatedAt: recent
    });

    await setDoc(doc(db, "repairs/legacy"), {
      status: "waiting"
    });
  });
});

after(async () => {
  await env.cleanup();
});

const dbFor = uid =>
  env.authenticatedContext(uid, {
    email: `${uid}@test.com`
  }).firestore();

test("anonymous cannot read workspace", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "workspaces/A"))
  );
});

test("member can read own workspace", async () => {
  await assertSucceeds(getDoc(doc(dbFor("memberA"), "workspaces/A")));
});

test("member cannot read another workspace", async () => {
  await assertFails(getDoc(doc(dbFor("memberA"), "workspaces/B")));
});

test("legacy global repairs are locked", async () => {
  await assertFails(getDoc(doc(dbFor("ownerA"), "repairs/legacy")));
});

test("user can query own membership docs", async () => {
  const q = query(
    collectionGroup(dbFor("memberA"), "members"),
    where("uid", "==", "memberA")
  );
  await assertSucceeds(getDocs(q));
});

test("member can create a new waiting job", async () => {
  await assertSucceeds(
    setDoc(doc(dbFor("memberA"), "workspaces/A/repairs/new"), {
      createdBy: "memberA",
      status: "waiting",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("member cannot forge createdBy", async () => {
  await assertFails(
    setDoc(doc(dbFor("memberA"), "workspaces/A/repairs/forged"), {
      createdBy: "ownerA",
      status: "waiting",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("member can update recent unfinished job", async () => {
  await assertSucceeds(
    updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/recent"), {
      status: "repairing",
      statusNote: "",
      statusUpdatedBy: "memberA",
      statusUpdatedByEmail: "memberA@test.com",
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("member cannot update job older than three hours", async () => {
  await assertFails(
    updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/old"), {
      status: "repairing",
      statusNote: "",
      statusUpdatedBy: "memberA",
      statusUpdatedByEmail: "memberA@test.com",
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("member cannot reopen completed job", async () => {
  await assertFails(
    updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/done"), {
      status: "repairing",
      statusNote: "try reopen",
      statusUpdatedBy: "memberA",
      statusUpdatedByEmail: "memberA@test.com",
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("manager cannot reopen completed job without reason", async () => {
  await assertFails(
    updateDoc(doc(dbFor("managerA"), "workspaces/A/repairs/done"), {
      status: "repairing",
      statusNote: "",
      statusUpdatedBy: "managerA",
      statusUpdatedByEmail: "managerA@test.com",
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("manager can reopen completed job with reason", async () => {
  await assertSucceeds(
    updateDoc(doc(dbFor("managerA"), "workspaces/A/repairs/done"), {
      status: "repairing",
      statusNote: "customer returned",
      statusUpdatedBy: "managerA",
      statusUpdatedByEmail: "managerA@test.com",
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test("member cannot delete job", async () => {
  await assertFails(
    deleteDoc(doc(dbFor("memberA"), "workspaces/A/repairs/recent"))
  );
});

test("owner can delete job", async () => {
  await assertSucceeds(
    deleteDoc(doc(dbFor("ownerA"), "workspaces/A/repairs/recent"))
  );
});

test("manager can suspend member", async () => {
  await assertSucceeds(
    updateDoc(doc(dbFor("managerA"), "workspaces/A/members/memberA"), {
      role: "member",
      status: "suspended",
      updatedAt: serverTimestamp()
    })
  );
});

test("owner can demote manager to member", async () => {
  await assertSucceeds(
    updateDoc(doc(dbFor("ownerA"), "workspaces/A/members/managerA"), {
      role: "member",
      status: "active",
      updatedAt: serverTimestamp()
    })
  );
});

test("owner cannot modify owner", async () => {
  await assertFails(
    updateDoc(doc(dbFor("ownerA"), "workspaces/A/members/ownerA"), {
      role: "manager",
      status: "active",
      updatedAt: serverTimestamp()
    })
  );
});

test("new team membership cannot be created on free plan", async () => {
  await assertFails(
    setDoc(doc(dbFor("ownerA"), "workspaces/A/members/newMember"), {
      uid: "newMember",
      role: "member",
      status: "active"
    })
  );
});

test("workspace invitations are disabled until paid team activation", async () => {
  await assertFails(
    setDoc(doc(dbFor("ownerA"), "workspaces/A/invitations/i1"), {
      email: "new@test.com",
      role: "member"
    })
  );
});

test("audit log is append-only", async () => {
  const ref =
    doc(dbFor("managerA"), "workspaces/A/auditLogs/a1");

  await assertSucceeds(
    setDoc(ref, {
      actorUid: "managerA",
      action: "test",
      createdAt: serverTimestamp()
    })
  );

  await assertFails(updateDoc(ref, { action: "tamper" }));
  await assertFails(deleteDoc(ref));
});

test("unknown top-level collections stay denied", async () => {
  await assertFails(getDoc(doc(dbFor("ownerA"), "secret/x")));
});
