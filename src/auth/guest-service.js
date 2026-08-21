export const GuestService = {
    generateGuestId() {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `#USR-${randomNum}`;
    },
    
    initGuestSession() {
        const guestId = this.generateGuestId();
        localStorage.setItem('smart_repair_guest_id', guestId);
        return guestId;
    },

    getGuestId() {
        return localStorage.getItem('smart_repair_guest_id');
    }
};
