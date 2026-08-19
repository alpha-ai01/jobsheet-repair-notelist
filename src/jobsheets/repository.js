import { collection, doc, query, where, getDocs, getDoc, serverTimestamp, runTransaction, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

export const JobsheetRepository = {
    async create(groupId, data, userId) {
        const jobsheetRef = doc(collection(db, "groups", groupId, "jobsheets"));
        
        await runTransaction(db, async (transaction) => {
            transaction.set(jobsheetRef, {
                ...data,
                groupId,
                createdBy: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                archivedAt: null
            });
        });
        return jobsheetRef.id;
    },

    async getAll(groupId) {
        const q = query(collection(db, "groups", groupId, "jobsheets"), where("archivedAt", "==", null), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(groupId, jobsheetId) {
        const docRef = doc(db, "groups", groupId, "jobsheets", jobsheetId);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },

    async update(groupId, jobsheetId, data, userId) {
        const docRef = doc(db, "groups", groupId, "jobsheets", jobsheetId);
        await runTransaction(db, async (transaction) => {
            transaction.update(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
                updatedBy: userId
            });
        });
    },

    async archive(groupId, jobsheetId, userId) {
        const docRef = doc(db, "groups", groupId, "jobsheets", jobsheetId);
        await runTransaction(db, async (transaction) => {
            transaction.update(docRef, {
                archivedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: userId
            });
        });
    }
};
