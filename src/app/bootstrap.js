import { auth } from "../firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuthUI } from "../ui/auth/auth-ui.js";
import { initGroupUI } from "../ui/groups/group-ui.js";

const authArea = document.getElementById("auth_area");
const mainApp = document.getElementById("main_app");

onAuthStateChanged(auth, (user) => {
    if (user) {
        authArea.classList.add("hidden");
        mainApp.classList.remove("hidden");
        // Check for groups, if none, initGroupUI
        initGroupUI((groupId) => {
            console.log("Group created:", groupId);
            // Load Jobsheets
        });
    } else {
        authArea.classList.remove("hidden");
        mainApp.classList.add("hidden");
        initAuthUI();
    }
});
