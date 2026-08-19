import { auth } from "../firebase/client.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

export const AuthService = {
    async register(email, password, displayName) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email,
            displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        return user;
    },
    
    async login(email, password) {
        return await signInWithEmailAndPassword(auth, email, password);
    },
    
    async logout() {
        return await signOut(auth);
    }
};
