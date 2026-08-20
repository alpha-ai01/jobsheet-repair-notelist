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
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

const PROJECT_ID = "smart-repair-workspace-v2";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8081,
      rules: fs.readFileSync("firestore.workspace.rules", "utf8")
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, "users/ownerA"), {
      uid: "ownerA", firstName: "Owner", email: "ownerA@test.com"
    });
    await setDoc(doc(db, "users/managerA"), {
      uid: "managerA", firstName: "Manager", email: "managerA@test.com"
    });
    await setDoc(doc(db, "users/memberA"), {
      uid: "memberA", firstName: "Member", email: "memberA@test.com"
    });
    await setDoc(doc(db, "users/ownerB"), {
      uid: "ownerB", firstName: "Owner B", email: "ownerB@test.com"
    });

    await setDoc(doc(db, "workspaces/A"), {
      ownerUid: "ownerA", name: "Shop A", status: "active",
      plan: "free", subscriptionStatus: "active", memberLimit: 1
    });
    await setDoc(doc(db, "workspaces/B"), {
      ownerUid: "ownerB", name: "Shop B", status: "active",
      plan: "free", subscriptionStatus: "active", memberLimit: 1
    });

    for (const [uid, role] of [
      ["ownerA", "owner"], ["managerA", "manager"], ["memberA", "member"]
    ]) {
      await setDoc(doc(db, `workspaces/A/members/${uid}`), {
        uid, role, status: "active"
      });
    }
    await setDoc(doc(db, "workspaces/B/members/ownerB"), {
      uid: "ownerB", role: "owner", status: "active"
    });

    const recent = Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
    const old = Timestamp.fromMillis(Date.now() - 4 * 60 * 60 * 1000);

    await setDoc(doc(db, "workspaces/A/repairs/recentJob"), {
      jobNumber: "A-001", createdBy: "memberA", status: "waiting",
      createdAt: recent, updatedAt: recent
    });
    await setDoc(doc(db, "workspaces/A/repairs/oldJob"), {
      jobNumber: "A-002", createdBy: "memberA", status: "waiting",
      createdAt: old, updatedAt: old
    });
    await setDoc(doc(db, "workspaces/A/repairs/doneJob"), {
      jobNumber: "A-003", createdBy: "memberA", status: "done",
      createdAt: recent, updatedAt: recent
    });
    await setDoc(doc(db, "workspaces/B/repairs/bJob"), {
      jobNumber: "B-001", createdBy: "ownerB", status: "waiting",
      createdAt: recent, updatedAt: recent
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

const dbFor = uid => testEnv.authenticatedContext(uid, {
  email: `${uid}@test.com`
}).firestore();

test("anonymous cannot read workspace", async () => {
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "workspaces/A")));
});

test("member A can read workspace A", async () => {
  await assertSucceeds(getDoc(doc(dbFor("memberA"), "workspaces/A")));
});

test("member A cannot read workspace B", async () => {
  await assertFails(getDoc(doc(dbFor("memberA"), "workspaces/B")));
});

test("owner A cannot read workspace B data", async () => {
  await assertFails(getDoc(doc(dbFor("ownerA"), "workspaces/B/repairs/bJob")));
});

test("member A can create job in workspace A", async () => {
  await assertSucceeds(setDoc(doc(dbFor("memberA"), "workspaces/A/repairs/newJob"), {
    jobNumber: "A-NEW",
    createdBy: "memberA",
    status: "waiting",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("member A cannot create job in workspace B", async () => {
  await assertFails(setDoc(doc(dbFor("memberA"), "workspaces/B/repairs/hack"), {
    createdBy: "memberA",
    status: "waiting",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("member can update recent unfinished job", async () => {
  await assertSucceeds(updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/recentJob"), {
    status: "repairing",
    statusUpdatedBy: "memberA",
    statusUpdatedByEmail: "memberA@test.com",
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("member cannot update job older than 3 hours", async () => {
  await assertFails(updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/oldJob"), {
    status: "repairing",
    statusUpdatedBy: "memberA",
    statusUpdatedByEmail: "memberA@test.com",
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("member cannot update completed job", async () => {
  await assertFails(updateDoc(doc(dbFor("memberA"), "workspaces/A/repairs/doneJob"), {
    status: "repairing",
    statusUpdatedBy: "memberA",
    statusUpdatedByEmail: "memberA@test.com",
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("manager can update old job", async () => {
  await assertSucceeds(updateDoc(doc(dbFor("managerA"), "workspaces/A/repairs/oldJob"), {
    status: "repairing",
    updatedAt: serverTimestamp()
  }));
});

test("member cannot delete job", async () => {
  await assertFails(deleteDoc(doc(dbFor("memberA"), "workspaces/A/repairs/recentJob")));
});

test("owner can delete job", async () => {
  await assertSucceeds(deleteDoc(doc(dbFor("ownerA"), "workspaces/A/repairs/recentJob")));
});

test("manager can create member membership", async () => {
  await assertSucceeds(setDoc(doc(dbFor("managerA"), "workspaces/A/members/newMember"), {
    uid: "newMember", role: "member", status: "active"
  }));
});

test("owner can create manager membership", async () => {
  await assertSucceeds(setDoc(doc(dbFor("ownerA"), "workspaces/A/members/newManager"), {
    uid: "newManager", role: "manager", status: "active"
  }));
});

test("member cannot change memberships", async () => {
  await assertFails(updateDoc(doc(dbFor("memberA"), "workspaces/A/members/managerA"), {
    role: "member",
    updatedAt: serverTimestamp()
  }));
});

test("status history is append-only", async () => {
  const db = dbFor("memberA");
  const ref = doc(db, "workspaces/A/repairs/recentJob/statusHistory/h1");

  await assertSucceeds(setDoc(ref, {
    fromStatus: "waiting",
    toStatus: "repairing",
    changedByUid: "memberA",
    changedByRole: "member",
    note: "start",
    changedAt: serverTimestamp()
  }));

  await assertFails(updateDoc(ref, { note: "changed" }));
  await assertFails(deleteDoc(ref));
});

test("unknown top-level collection is denied", async () => {
  await assertFails(getDoc(doc(dbFor("ownerA"), "secret/x")));
});
