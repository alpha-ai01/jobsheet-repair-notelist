import { JobsheetRepository } from "../../jobsheets/repository.js";
import { PermissionService } from "../../permissions/permission-service.js";
import { Permissions } from "../../permissions/permissions.js";
import { auth } from "../../firebase/client.js";

export async function initJobsheetUI(groupId) {
    const container = document.getElementById("main_app");
    const canCreate = await PermissionService.hasPermission(groupId, "default-user", Permissions.JOBSHEET_CREATE);

    container.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-md">
            <h2 class="text-xl font-bold mb-4">รายการงานซ่อม</h2>
            ${canCreate ? '<button id="createJobBtn" class="mb-4 p-2 bg-blue-500 text-white rounded">+ สร้างงานซ่อม</button>' : ''}
            <div id="jobsList" class="space-y-2"></div>
        </div>
    `;

    if (canCreate) {
        document.getElementById("createJobBtn").addEventListener("click", () => showCreateForm(groupId));
    }
    
    loadJobs(groupId);
}

async function loadJobs(groupId) {
    const jobs = await JobsheetRepository.getAll(groupId);
    const list = document.getElementById("jobsList");
    list.innerHTML = jobs.length === 0 ? '<p>ยังไม่มีงานซ่อม</p>' : jobs.map(job => `
        <div class="p-2 border rounded flex justify-between items-center">
            <span>${job.customerName || 'ไม่ระบุชื่อ'} - ${job.status || 'received'}</span>
            <button class="viewJobBtn" data-id="${job.id}">ดู</button>
        </div>
    `).join("");
}

function showCreateForm(groupId) {
    // Basic form implementation
    alert("Create Jobsheet Form - Implementation placeholder");
}
