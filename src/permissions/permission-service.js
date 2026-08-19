import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";
import { DefaultPermissions } from "./permissions.js";

export const PermissionService = {
    async getUserPermissions(groupId, userId) {
        const memberRef = doc(db, "groups", groupId, "members", userId);
        const memberSnap = await getDoc(memberRef);
        
        if (!memberSnap.exists()) return [];
        
        const memberData = memberSnap.data();
        const role = memberData.role;
        
        // Return custom permissions if set, otherwise default
        return memberData.permissions || DefaultPermissions[role] || [];
    },

    async hasPermission(groupId, userId, permission) {
        const permissions = await this.getUserPermissions(groupId, userId);
        return permissions.includes(permission);
    }
};
