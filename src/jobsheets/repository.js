import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

const JOBSHEET_COLLECTION = "jobsheets";

export const JobsheetRepository = {
    async create(data, userId) {
        const docRef = await addDoc(collection(db, JOBSHEET_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            updatedBy: userId
        });
        return docRef.id;
    },

    async getAll() {
        const q = query(collection(db, JOBSHEET_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(id) {
        const docRef = doc(db, JOBSHEET_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },

    async update(id, data, userId) {
        const docRef = doc(db, JOBSHEET_COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: userId
        });
    }
};
