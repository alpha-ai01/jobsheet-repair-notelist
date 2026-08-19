import { AuthService } from "../../auth/auth-service.js";

export function initAuthUI(onSuccess) {
    const container = document.getElementById("auth_area");
    container.innerHTML = `
        <div class="p-6 bg-white rounded-xl shadow-md">
            <h2 class="text-xl font-bold mb-4">เข้าสู่ระบบ / สมัครสมาชิก</h2>
            <input type="email" id="email" placeholder="Email" class="w-full p-2 mb-2 border rounded">
            <input type="password" id="password" placeholder="Password" class="w-full p-2 mb-4 border rounded">
            <button id="loginBtn" class="w-full p-2 bg-blue-500 text-white rounded mb-2">Login</button>
            <button id="registerBtn" class="w-full p-2 bg-green-500 text-white rounded">Register</button>
        </div>
    `;

    document.getElementById("loginBtn").addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        await AuthService.login(email, password);
        onSuccess();
    });

    document.getElementById("registerBtn").addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        await AuthService.register(email, password, "User");
        onSuccess();
    });
}
