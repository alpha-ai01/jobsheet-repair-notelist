import { auth } from "./firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const appContainer = document.getElementById("app");
const authArea = document.getElementById("auth_area");
const mainApp = document.getElementById("main_app");

onAuthStateChanged(auth, (user) => {
    if (user) {
        authArea.classList.add("hidden");
        mainApp.classList.remove("hidden");
        console.log("User logged in:", user.email);
        // Initialize App
    } else {
        authArea.classList.remove("hidden");
        mainApp.classList.add("hidden");
        console.log("User logged out");
    }
});
