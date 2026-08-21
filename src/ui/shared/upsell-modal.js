export const UpsellModal = {
    render() {
        const modal = document.createElement('div');
        modal.id = 'upsell_modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="glass p-8 rounded-3xl max-w-sm w-full text-center border border-accent">
                <h2 class="text-2xl font-black text-white mb-4">Want Full Access?</h2>
                <p class="text-slate-300 mb-6">Create an account to manage your repairs, chat with stores, and get real-time updates.</p>
                <button id="close_upsell" class="w-full py-3 bg-accent hover:bg-orange-600 rounded-xl font-bold mb-3">Register Now</button>
                <button id="cancel_upsell" class="text-slate-400 text-sm">Maybe Later</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('close_upsell').onclick = () => window.location.href = '/register';
        document.getElementById('cancel_upsell').onclick = () => modal.remove();
    }
};
