import { GroupRepository } from "../../groups/repository.js";
import { auth } from "../../firebase/client.js";

export function initGroupUI(onGroupCreated) {
    const container = document.getElementById("main_app");
    container.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-md">
            <h2 class="text-xl font-bold mb-4">สร้างกลุ่ม (ร้านซ่อม)</h2>
            <input type="text" id="groupName" placeholder="ชื่อกลุ่ม/ร้าน" class="w-full p-2 mb-4 border rounded">
            <button id="createGroupBtn" class="w-full p-2 bg-blue-500 text-white rounded">สร้างกลุ่ม</button>
        </div>
    `;

    document.getElementById("createGroupBtn").addEventListener("click", async () => {
        const name = document.getElementById("groupName").value;
        const groupId = await GroupRepository.createGroup(name);
        onGroupCreated(groupId);
    });
}
