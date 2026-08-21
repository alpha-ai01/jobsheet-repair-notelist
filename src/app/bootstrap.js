import { auth } from "../firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuthUI } from "../ui/auth/auth-ui.js";
import { initRegisterUI } from "../ui/auth/register-ui.js";
import { initGroupUI } from "../ui/groups/group-ui.js";
import { initJobsheetUI } from "../ui/jobsheets/jobsheet-ui.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

const authArea = document.getElementById("auth_area");
const mainApp = document.getElementById("main_app");

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check for group membership
        const q = query(collection(db, "memberships"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const membership = snapshot.docs[0].data();
            const groupId = membership.groupId;
            authArea.classList.add("hidden");
            mainApp.classList.remove("hidden");
            initJobsheetUI(groupId);
        } else {
            // Need to create group
            initGroupUI((newGroupId) => {
                authArea.classList.add("hidden");
                mainApp.classList.remove("hidden");
                initJobsheetUI(newGroupId);
            });
        }
    } else {
        authArea.classList.remove("hidden");
        mainApp.classList.add("hidden");
        initAuthUI(() => {}, () => initRegisterUI(() => {}, () => {}));
    }
});
