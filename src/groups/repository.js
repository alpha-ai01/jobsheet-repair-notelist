import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, functions } from "../firebase/client.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

export const GroupRepository = {
    async createGroup(name, userId) {
        const createGroupCallable = httpsCallable(functions, "createGroup");
        const result = await createGroupCallable({ name, uid: userId });
        return result.data.groupId;
    },

    async getById(groupId) {
        const docRef = doc(db, "groups", groupId);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    }
};
