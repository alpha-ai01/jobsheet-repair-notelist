import assert from 'node:assert';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-billing-test",
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

describe("Billing Security Rules", () => {
  it("should deny client-side write to entitlements", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(alice.firestore().doc("entitlements/alice").set({ trialConsumed: false }));
  });
});
