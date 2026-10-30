// Guestel, the guest app, and its App Clip are off for now (Oct 30 2026): the
// Marketel app on the App Store is a different product, so nothing on the
// booking sites offers an app. VITE_GUEST_APP=on at build time turns it back on.
export const GUEST_APP_ENABLED = import.meta.env?.VITE_GUEST_APP === 'on';
