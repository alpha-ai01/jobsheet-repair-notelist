import { auth, db } from "../firebase/client.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    },

    async sendResetEmail(email) {
        return await sendPasswordResetEmail(auth, email);
    },

    getCurrentUser() {
        return auth.currentUser;
    }
};
