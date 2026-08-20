import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  deleteUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
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
  console.log("=== STARTING LIVE PRODUCTION E2E AUTH TEST ===");
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const email = `e2e-test-${randomSuffix}@example.com`;
  const username = `e2e_user_${randomSuffix}`;
  const password = "Password123!";
  const displayName = "E2E Test User";

  let user = null;

  try {
    // 1. Test Registration
    console.log(`Registering new user: ${email} (${username})...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    console.log("REGISTER_RUNTIME = PASS (Firebase Auth Account Created)");

    // 2. Test Username Reservation
    console.log("Reserving username in Firestore...");
    const usernameRef = doc(db, "usernames", username);
    await setDoc(usernameRef, { uid: user.uid });
    console.log("USERNAME_RESERVATION_RUNTIME = PASS");

    // 3. Test Profile Creation
    console.log("Creating user profile in Firestore...");
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email,
      username,
      usernameCanonical: username,
      displayName,
      accountStatus: "active"
    });
    console.log("PROFILE_CREATION_RUNTIME = PASS");

    // 4. Test Sign Out
    console.log("Signing out...");
    await signOut(auth);
    console.log("LOGOUT_RUNTIME = PASS");

    // 5. Test Sign In
    console.log("Signing back in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("LOGIN_RUNTIME = PASS");

    // 6. Cleanup (E2E cleanliness)
    console.log("Cleaning up E2E records...");
    await deleteDoc(userRef);
    await deleteDoc(usernameRef);
    await deleteUser(auth.currentUser);
    console.log("CLEANUP = PASS");

    console.log("=== ALL EXECUTABLE E2E PRODUCTION AUTH TESTS PASSED ===");
    process.exit(0);
  } catch (error) {
    console.error("=== E2E AUTH RUNTIME FAILURE ===");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    
    // Attempt cleanup if auth user was created but firestore failed
    if (auth.currentUser) {
      try {
        await deleteUser(auth.currentUser);
      } catch (e) {}
    }
    process.exit(1);
  }
}

runE2E();
