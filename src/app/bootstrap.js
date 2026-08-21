import { GuestService } from "../auth/guest-service.js";
import { auth } from "../firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuthUI } from "../ui/auth/auth-ui.js";
import { initRegisterUI } from "../ui/auth/register-ui.js";
import { initGroupUI } from "../ui/groups/group-ui.js";
import { initJobsheetUI } from "../ui/jobsheets/jobsheet-ui.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/client.js";

import { GuestService } from "../auth/guest-service.js";
import { DemoData } from "../shared/demo-data.js";
import { UpsellModal } from "../ui/shared/upsell-modal.js";
import { auth } from "../firebase/client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// ... (rest of imports)

// ... (init guest session)

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ... (existing logic)
    } else {
        console.log("Guest Access Mode Active");
        mainApp.classList.remove("hidden");
        
        // Render Feed
        const feed = document.getElementById('repair_feed');
        const repairs = DemoData.getRepairFeed();
        feed.innerHTML = repairs.map(r => `
            <div class="glass p-5 rounded-2xl cursor-pointer hover:border-cyan-500" onclick="UpsellModal.render()">
                <div class="flex gap-4">
                    <div class="w-20 h-20 bg-slate-700 rounded-xl"></div>
                    <div class="flex-1">
                        <h3 class="font-bold">${r.model}</h3>
                        <p class="text-xs text-slate-400">Status: ${r.status}</p>
                        <p class="text-[10px] text-accent mt-1">Store: ${r.store}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
});
