import { auth, db } from "../firebase/client.js";
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const AuthService = {
    async register(email, password, username, displayName) {
        const usernameCanonical = username.toLowerCase().trim();
        const usernameRef = doc(db, "usernames", usernameCanonical);
        
        // 1. Reserved check
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
            throw new Error("USERNAME_TAKEN");
        }
        
        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        try {
            // 3. Reserve Username
            await setDoc(usernameRef, { uid: user.uid });
            
            // 4. Create Profile
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email,
                username,
                usernameCanonical,
                displayName,
                emailVerified: false, // Trusted auth claim only
                accountStatus: "active",
                createdAt: serverTimestamp()
            });
            
            // 5. Send Verification
            await sendEmailVerification(user);
        } catch (error) {
            // Basic compensation: try to delete user if profile fails
            await user.delete();
            throw error;
        }
        
        return user;
    }
};
