import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  deleteUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";

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

async function runE2E() {
  console.log("=== STARTING DIAGNOSTIC E2E TEST WITH STRICT SCHEMA ===");
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const email = `diagnostic-${randomSuffix}@example.com`;
  const password = "Password123!";

  let user = null;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    console.log("Auth User Created:", user.uid);

    console.log("Waiting 3 seconds for token synchronization...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Testing write to /users/{uid} with strict schema...");
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: email,
      firstName: "E2E",
      lastName: "User"
    });
    console.log("Write to /users/{uid} succeeded!");

    await deleteDoc(userRef);
    await deleteUser(user);
    console.log("Cleanup succeeded!");
    process.exit(0);
  } catch (error) {
    console.error("Diagnostic Failed:", error.code, error.message);
    if (auth.currentUser) {
      await deleteUser(auth.currentUser).catch(() => {});
    }
    process.exit(1);
  }
}

runE2E();
