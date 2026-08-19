import { JobsheetRepository } from "../../jobsheets/repository.js";

export function initJobsheetUI(groupId) {
    const container = document.getElementById("main_app");
    container.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-md">
            <h2 class="text-xl font-bold mb-4">รายการงานซ่อม</h2>
            <div id="jobsList" class="space-y-2"></div>
        </div>
    `;

    loadJobs(groupId);
}

async function loadJobs(groupId) {
    const jobs = await JobsheetRepository.getAll(groupId);
    const list = document.getElementById("jobsList");
    list.innerHTML = jobs.map(job => `
        <div class="p-2 border rounded">
            ${job.customerName} - ${job.status}
        </div>
    `).join("");
}
