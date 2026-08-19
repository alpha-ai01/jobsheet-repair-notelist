import { auth } from "../firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuthUI } from "../ui/auth/auth-ui.js";
import { initRegisterUI } from "../ui/auth/register-ui.js";
import { initGroupUI } from "../ui/groups/group-ui.js";
import { initJobsheetUI } from "../ui/jobsheets/jobsheet-ui.js";

const authArea = document.getElementById("auth_area");
const mainApp = document.getElementById("main_app");

function loadAuth() {
    initAuthUI(
        () => {}, // onSuccess
        () => loadRegister() // onRegister
    );
}

function loadRegister() {
    initRegisterUI(
        () => loadAuth(), // onSuccess
        () => loadAuth() // onBack
    );
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        authArea.classList.add("hidden");
        mainApp.classList.remove("hidden");
        // Need to implement logic to fetch user's group
        // Temporarily showing Jobsheet UI for authorized users
        initJobsheetUI("user-group-id"); 
    } else {
        authArea.classList.remove("hidden");
        mainApp.classList.add("hidden");
        loadAuth();
    }
});
