import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc 
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

async function checkPermission() {
  console.log("=== CHECKING PERMISSIONS ===");
  try {
    // This is the UID that was created in previous failed test run
    const uid = "vzrz9IdvefVzOc7iqNkcSvbVkOx1";
    console.log("Checking path: /users/", uid);
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    console.log("Snapshot exists:", snap.exists());
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.code, error.message);
    process.exit(1);
  }
}

checkPermission();
