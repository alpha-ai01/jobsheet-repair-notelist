import { collection, doc, query, where, getDocs, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

export const JobsheetRepository = {
    async create(groupId, data, userId) {
        // Implementation note: Job number generation should be handled in a transaction
        // or using a secure counter if needed for uniqueness.
        // For now, simplify with a client-generated ID or basic auto-increment simulation.
        const jobsheetRef = doc(collection(db, "groups", groupId, "jobsheets"));
        
        await runTransaction(db, async (transaction) => {
            transaction.set(jobsheetRef, {
                ...data,
                groupId,
                createdBy: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });
        return jobsheetRef.id;
    },

    async getAll(groupId) {
        const q = query(collection(db, "groups", groupId, "jobsheets"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
