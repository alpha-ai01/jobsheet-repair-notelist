import { AuthService } from "../../auth/auth-service.js";

export function initAuthUI(onSuccess, onRegister) {
    const container = document.getElementById("auth_area");
    container.innerHTML = `
        <div class="max-w-md mx-auto p-6 bg-white rounded-3xl soft-card">
            <h1 class="text-2xl font-black mb-6 text-center">SmartRepair</h1>
            <input type="email" id="login_email" placeholder="Email" class="w-full p-3 mb-3 border rounded-xl">
            <input type="password" id="login_password" placeholder="รหัสผ่าน" class="w-full p-3 mb-4 border rounded-xl">
            <button id="loginBtn" class="w-full p-3 bg-blue-600 text-white rounded-xl font-bold mb-3">เข้าสู่ระบบ</button>
            <div class="text-center text-sm">
                <button id="toRegister" class="text-blue-600">สมัครสมาชิก</button>
            </div>
        </div>
    `;

    document.getElementById("loginBtn").addEventListener("click", async () => {
        const email = document.getElementById("login_email").value;
        const password = document.getElementById("login_password").value;
        try {
            await AuthService.login(email, password);
            onSuccess();
        } catch (e) {
            alert(e.message);
        }
    });

    document.getElementById("toRegister").addEventListener("click", onRegister);
}
