import { test, before, after } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import fs from "node:fs";

const PROJECT_ID = "usernames-test-project";
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

after(async () => {
  await testEnv.cleanup();
});

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function userDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

test("anonymous user can read usernames", async () => {
  await assertSucceeds(
    getDoc(doc(anonymousDb(), "usernames/testuser"))
  );
});

test("authenticated user can write own username mapping", async () => {
  const uid = "user123";
  const db = userDb(uid);
  
  await assertSucceeds(
    setDoc(doc(db, "usernames/testuser"), {
      uid: uid
    })
  );
});

test("authenticated user cannot write other user's username mapping", async () => {
  const uid = "user123";
  const db = userDb(uid);
  
  await assertFails(
    setDoc(doc(db, "usernames/otheruser"), {
      uid: "otheruser_uid"
    })
  );
});
