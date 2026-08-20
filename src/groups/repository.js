import { functions } from "../firebase/client.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

export const GroupRepository = {
    async createGroup(name) {
        const createGroupCallable = httpsCallable(functions, "createGroup");
        const result = await createGroupCallable({ name });
        return result.data.groupId;
    },
    
    async getGroup(groupId) {
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        return groupSnap.exists() ? { id: groupSnap.id, ...groupSnap.data() } : null;
    }
};
