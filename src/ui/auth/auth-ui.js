import { AuthService } from "../../auth/auth-service.js";
import { PermissionService } from "../../permissions/permission-service.js";
import { Permissions } from "../../permissions/permissions.js";
import { auth } from "../../firebase/client.js";

export function initAuthUI(onSuccess, onRegister) {
    const container = document.getElementById("auth_area");
    container.innerHTML = `
        <div class="max-w-md mx-auto p-6 bg-white rounded-3xl soft-card">
            <div class="text-center mb-6">
                <div class="text-4xl mb-2">🛠️</div>
                <h1 class="text-2xl font-black">SmartRepair</h1>
                <h2 class="text-lg font-bold mt-2">เข้าสู่ระบบ</h2>
            </div>
            
            <div id="auth_error" class="hidden text-red-600 text-xs text-center mb-3"></div>

            <input type="email" id="email" placeholder="Email" class="w-full p-3 mb-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
            <div class="relative mb-3">
                <input type="password" id="password" placeholder="รหัสผ่าน" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                <button id="togglePass" class="absolute right-3 top-3.5 text-xs text-slate-400">👁️</button>
            </div>
            
            <button id="loginBtn" class="w-full p-3 bg-blue-600 text-white rounded-xl font-bold mb-3">🔑 เข้าสู่ระบบ</button>
            
            <div class="text-center">
                <button id="forgotPass" class="text-xs text-blue-600 font-semibold mb-4">ลืมรหัสผ่าน?</button>
                <div class="text-xs text-slate-500">
                    ยังไม่มีบัญชี? <button id="toRegister" class="text-blue-600 font-bold">สมัครสมาชิกเลย</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("togglePass").addEventListener("click", (e) => {
        e.preventDefault();
        const p = document.getElementById("password");
        p.type = p.type === "password" ? "text" : "password";
    });

    document.getElementById("loginBtn").addEventListener("click", async () => {
        try {
            await AuthService.login(document.getElementById("email").value, document.getElementById("password").value);
            onSuccess();
        } catch (e) {
            document.getElementById("auth_error").textContent = e.message;
            document.getElementById("auth_error").classList.remove("hidden");
        }
    });

    document.getElementById("forgotPass").addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        if (!email) return alert("กรุณากรอก Email");
        await AuthService.sendResetEmail(email);
        alert("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว");
    });

    document.getElementById("toRegister").addEventListener("click", onRegister);
}
