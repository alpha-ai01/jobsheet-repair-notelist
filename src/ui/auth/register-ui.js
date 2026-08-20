import { AuthService } from "../../auth/auth-service.js";

export function initRegisterUI(onSuccess, onBack) {
    const container = document.getElementById("auth_area");
    container.innerHTML = `
        <div class="max-w-md mx-auto p-6 bg-white rounded-3xl soft-card">
            <h2 class="text-xl font-bold mb-4">สมัครสมาชิก</h2>
            <div id="reg_error" class="hidden text-red-600 text-xs text-center mb-3"></div>
            <input type="text" id="reg_name" placeholder="ชื่อ" class="w-full p-3 mb-3 border rounded-xl">
            <input type="email" id="reg_email" placeholder="Email" class="w-full p-3 mb-3 border rounded-xl">
            <input type="password" id="reg_password" placeholder="รหัสผ่าน" class="w-full p-3 mb-3 border rounded-xl">
            <input type="password" id="reg_confirm" placeholder="ยืนยันรหัสผ่าน" class="w-full p-3 mb-4 border rounded-xl">
            <button id="regBtn" class="w-full p-3 bg-green-600 text-white rounded-xl font-bold mb-3">✨ สร้างบัญชี</button>
            <div class="text-center">
                <button id="toLogin" class="text-xs text-blue-600 font-semibold">← กลับเข้าสู่ระบบ</button>
            </div>
        </div>
    `;

    document.getElementById("regBtn").addEventListener("click", async () => {
        const name = document.getElementById("reg_name").value;
        const email = document.getElementById("reg_email").value;
        const pass = document.getElementById("reg_password").value;
        const confirm = document.getElementById("reg_confirm").value;

        if (pass !== confirm) return alert("รหัสผ่านไม่ตรงกัน");
        
        try {
            await AuthService.register(email, pass, name);
            onSuccess();
        } catch (e) {
            document.getElementById("reg_error").textContent = e.message;
            document.getElementById("reg_error").classList.remove("hidden");
        }
    });

    document.getElementById("toLogin").addEventListener("click", onBack);
}
