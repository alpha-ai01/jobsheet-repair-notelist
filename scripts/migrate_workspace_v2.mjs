import {
  initializeApp
} from "firebase/app";

import {
  getAuth,
  signInWithEmailAndPassword
} from "firebase/auth";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import fs from "node:fs";
import path from "node:path";

const {
  SMARTREPAIR_EMAIL,
  SMARTREPAIR_PASSWORD,
  SMARTREPAIR_WORKSPACE_NAME
} = process.env;

if (!SMARTREPAIR_EMAIL || !SMARTREPAIR_PASSWORD || !SMARTREPAIR_WORKSPACE_NAME) {
  console.error("Missing migration environment variables.");
  process.exit(2);
}

const firebaseConfig = {
  apiKey: "AIzaSyCZE5VddalQi8ME7vSLDPZjEABno-3ZH5Q",
  authDomain: "smart-repair-app-feff0.firebaseapp.com",
  projectId: "smart-repair-app-feff0",
  storageBucket: "smart-repair-app-feff0.firebasestorage.app",
  messagingSenderId: "752753802805",
  appId: "1:752753802805:web:a213e8f39e6e5723563b7c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function slugify(value) {
  const ascii = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Date.now().toString(36);
  return `${ascii || "workspace"}-${suffix}`;
}

async function copyCollection(sourceName, workspaceId) {
  const sourceSnap = await getDocs(collection(db, sourceName));
  const docs = sourceSnap.docs;

  let copied = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const sourceDoc of docs) {
    const target = doc(
      db,
      "workspaces",
      workspaceId,
      sourceName,
      sourceDoc.id
    );

    batch.set(target, sourceDoc.data());
    batchCount++;
    copied++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  const targetSnap = await getDocs(
    collection(db, "workspaces", workspaceId, sourceName)
  );

  return {
    source: docs.length,
    copied,
    target: targetSnap.size,
    verified: docs.length === targetSnap.size
  };
}

console.log("Signing in...");
const credential = await signInWithEmailAndPassword(
  auth,
  SMARTREPAIR_EMAIL,
  SMARTREPAIR_PASSWORD
);

const uid = credential.user.uid;

const profileSnap = await getDoc(doc(db, "users", uid));
if (!profileSnap.exists()) {
  throw new Error("User profile /users/{uid} not found.");
}

const profile = profileSnap.data();
if (profile.active === false) {
  throw new Error("This account is disabled.");
}

const workspaceId = slugify(SMARTREPAIR_WORKSPACE_NAME);

console.log(`Creating workspace: ${workspaceId}`);

await setDoc(doc(db, "workspaces", workspaceId), {
  name: SMARTREPAIR_WORKSPACE_NAME,
  ownerUid: uid,
  status: "active",
  plan: "free",
  subscriptionStatus: "active",
  memberLimit: 1,
  migrationSource: "v1-global",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

await setDoc(
  doc(db, "workspaces", workspaceId, "members", uid),
  {
    uid,
    role: "owner",
    status: "active",
    email: credential.user.email || SMARTREPAIR_EMAIL,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
);

console.log("Copying legacy collections...");

const result = {};
for (const name of ["repairs", "customers", "references"]) {
  console.log(`- ${name}`);
  result[name] = await copyCollection(name, workspaceId);
}

const allVerified = Object.values(result).every(x => x.verified);

const report = {
  generatedAt: new Date().toISOString(),
  workspaceId,
  workspaceName: SMARTREPAIR_WORKSPACE_NAME,
  ownerUid: uid,
  ownerEmail: credential.user.email || SMARTREPAIR_EMAIL,
  collections: result,
  verified: allVerified,
  note: "Legacy top-level collections were NOT deleted."
};

const reportDir = path.resolve("migration-reports");
fs.mkdirSync(reportDir, { recursive: true });

const reportPath = path.join(
  reportDir,
  `workspace-v2-${workspaceId}.json`
);

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("\nMigration verification:");
console.table(result);

console.log(`Report: ${reportPath}`);

if (!allVerified) {
  console.error("MIGRATION VERIFICATION FAILED");
  process.exit(3);
}

console.log("\nMIGRATION VERIFIED SUCCESSFULLY");
console.log(`Workspace ID: ${workspaceId}`);
console.log("Legacy collections remain intact for rollback.");
