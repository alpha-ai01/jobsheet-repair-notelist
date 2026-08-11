import { test, before, beforeEach, after } from "node:test";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import fs from "node:fs";

const PROJECT_ID = "smart-repair-app-feff0";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "users/admin1"), {
      email: "admin@test.com",
      role: "admin",
      active: true,
      name: "Administrator",
    });

    await setDoc(doc(db, "users/user1"), {
      email: "user@test.com",
      role: "user",
      active: true,
      name: "User One",
    });

    await setDoc(doc(db, "users/disabled1"), {
      email: "disabled@test.com",
      role: "user",
      active: false,
      name: "Disabled User",
    });

    await setDoc(doc(db, "users/disabledAdmin"), {
      email: "disabled-admin@test.com",
      role: "admin",
      active: false,
      name: "Disabled Admin",
    });

    await setDoc(doc(db, "repairs/repair1"), {
      createdBy: "user1",
      customerName: "Customer A",
      device: "Phone",
      status: "รับเครื่อง",
    });

    await setDoc(doc(db, "customers/customer1"), {
      name: "Customer A",
      phone: "0800000000",
    });

    await setDoc(doc(db, "references/ref1"), {
      name: "Reference A",
      type: "brand",
    });

    await setDoc(doc(db, "analytics/report1"), {
      total: 10,
    });

    await setDoc(doc(db, "admin/settings"), {
      maintenance: false,
    });

    await setDoc(doc(db, "secret/test1"), {
      value: "must-not-be-readable",
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

function userDb(uid, email = `${uid}@test.com`) {
  return testEnv
    .authenticatedContext(uid, { email })
    .firestore();
}

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore();
}

/* =========================================================
   AUTH / ACTIVE
========================================================= */

test("anonymous cannot read repairs", async () => {
  await assertFails(
    getDoc(doc(anonymousDb(), "repairs/repair1"))
  );
});

test("active user can read repairs", async () => {
  await assertSucceeds(
    getDoc(doc(userDb("user1"), "repairs/repair1"))
  );
});

test("inactive user cannot read repairs", async () => {
  await assertFails(
    getDoc(doc(userDb("disabled1"), "repairs/repair1"))
  );
});

/* =========================================================
   USERS
========================================================= */

test("new user can create own profile as active user", async () => {
  const db = userDb("newUser");

  await assertSucceeds(
    setDoc(doc(db, "users/newUser"), {
      email: "new@test.com",
      name: "New User",
      role: "user",
      active: true,
    })
  );
});

test("new user cannot create own profile as admin", async () => {
  const db = userDb("attacker");

  await assertFails(
    setDoc(doc(db, "users/attacker"), {
      email: "attacker@test.com",
      role: "admin",
      active: true,
    })
  );
});

test("user cannot change own role to admin", async () => {
  const db = userDb("user1");

  await assertFails(
    updateDoc(doc(db, "users/user1"), {
      role: "admin",
    })
  );
});

test("user cannot change own active flag", async () => {
  const db = userDb("user1");

  await assertFails(
    updateDoc(doc(db, "users/user1"), {
      active: false,
    })
  );
});

test("user can update normal own profile field", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    updateDoc(doc(db, "users/user1"), {
      name: "Updated Name",
    })
  );
});

test("normal user cannot read another user's profile", async () => {
  const db = userDb("user1");

  await assertFails(
    getDoc(doc(db, "users/admin1"))
  );
});

test("admin can read another user's profile", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    getDoc(doc(db, "users/user1"))
  );
});

test("admin can change another user's active state", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    updateDoc(doc(db, "users/user1"), {
      active: false,
    })
  );
});

test("inactive admin has no admin privileges", async () => {
  const db = userDb("disabledAdmin");

  await assertFails(
    updateDoc(doc(db, "users/user1"), {
      role: "admin",
    })
  );
});

/* =========================================================
   REPAIRS
========================================================= */

test("active user can create repair with own UID", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    setDoc(doc(db, "repairs/newRepair"), {
      createdBy: "user1",
      customerName: "Customer B",
      status: "รับเครื่อง",
    })
  );
});

test("user cannot forge createdBy", async () => {
  const db = userDb("user1");

  await assertFails(
    setDoc(doc(db, "repairs/fakeRepair"), {
      createdBy: "admin1",
      customerName: "Customer X",
      status: "รับเครื่อง",
    })
  );
});

test("user can update allowed repair status fields", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    updateDoc(doc(db, "repairs/repair1"), {
      status: "กำลังซ่อม",
      statusNote: "กำลังตรวจสอบ",
      statusUpdatedBy: "user1",
      statusUpdatedByEmail: "user@test.com",
      updatedAt: new Date(),
    })
  );
});

test("user cannot modify protected repair fields", async () => {
  const db = userDb("user1");

  await assertFails(
    updateDoc(doc(db, "repairs/repair1"), {
      customerName: "HACKED",
      statusUpdatedBy: "user1",
    })
  );
});

test("user cannot fake statusUpdatedBy", async () => {
  const db = userDb("user1");

  await assertFails(
    updateDoc(doc(db, "repairs/repair1"), {
      status: "เสร็จแล้ว",
      statusUpdatedBy: "admin1",
    })
  );
});

test("normal user cannot delete repair", async () => {
  const db = userDb("user1");

  await assertFails(
    deleteDoc(doc(db, "repairs/repair1"))
  );
});

test("admin can delete repair", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    deleteDoc(doc(db, "repairs/repair1"))
  );
});

/* =========================================================
   CUSTOMERS
========================================================= */

test("active user can read customer", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    getDoc(doc(db, "customers/customer1"))
  );
});

test("active user can update customer", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    updateDoc(doc(db, "customers/customer1"), {
      phone: "0899999999",
    })
  );
});

test("normal user cannot delete customer", async () => {
  const db = userDb("user1");

  await assertFails(
    deleteDoc(doc(db, "customers/customer1"))
  );
});

test("admin can delete customer", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    deleteDoc(doc(db, "customers/customer1"))
  );
});

/* =========================================================
   REFERENCES
========================================================= */

test("active user can read references", async () => {
  const db = userDb("user1");

  await assertSucceeds(
    getDoc(doc(db, "references/ref1"))
  );
});

test("normal user cannot update references", async () => {
  const db = userDb("user1");

  await assertFails(
    updateDoc(doc(db, "references/ref1"), {
      name: "Changed by user",
    })
  );
});

test("admin can update references", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    updateDoc(doc(db, "references/ref1"), {
      name: "Changed by Admin",
    })
  );
});

/* =========================================================
   ADMIN / ANALYTICS
========================================================= */

test("normal user cannot read analytics", async () => {
  const db = userDb("user1");

  await assertFails(
    getDoc(doc(db, "analytics/report1"))
  );
});

test("admin can read analytics", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    getDoc(doc(db, "analytics/report1"))
  );
});

test("normal user cannot access admin collection", async () => {
  const db = userDb("user1");

  await assertFails(
    getDoc(doc(db, "admin/settings"))
  );
});

test("admin can access admin collection", async () => {
  const db = userDb("admin1");

  await assertSucceeds(
    getDoc(doc(db, "admin/settings"))
  );
});

/* =========================================================
   DEFAULT DENY
========================================================= */

test("unknown collections are denied for normal users", async () => {
  const db = userDb("user1");

  await assertFails(
    getDoc(doc(db, "secret/test1"))
  );
});

test("unknown collections are denied even for admins", async () => {
  const db = userDb("admin1");

  await assertFails(
    getDoc(doc(db, "secret/test1"))
  );
});
