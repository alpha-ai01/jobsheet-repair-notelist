import { collection, doc, getDoc, setDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";
import { Roles, DefaultPermissions } from "../permissions/permissions.js";

export const GroupRepository = {
    async createGroup(name, ownerUser) {
        return await runTransaction(db, async (transaction) => {
            const groupRef = doc(collection(db, "groups"));
            const memberRef = doc(db, "groups", groupRef.id, "members", ownerUser.uid);
            
            transaction.set(groupRef, {
                name,
                ownerUid: ownerUser.uid,
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            transaction.set(memberRef, {
                uid: ownerUser.uid,
                displayName: ownerUser.displayName,
                email: ownerUser.email,
                role: Roles.OWNER,
                status: "active",
                permissions: DefaultPermissions[Roles.OWNER],
                joinedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return groupRef.id;
        });
    },
    
    async getGroup(groupId) {
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        return groupSnap.exists() ? { id: groupSnap.id, ...groupSnap.data() } : null;
    }
};
