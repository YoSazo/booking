const STORAGE_KEY = 'marketel_guest_stay';

/** Active stay for this hotel only (ignores legacy / other-property entries). */
export function readGuestStay(hotelId) {
  if (!hotelId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.code || !(parsed.checkout || parsed.checkoutDate)) return null;
    if (!parsed.hotelId || parsed.hotelId !== hotelId) return null;
    const checkout = new Date(parsed.checkout || parsed.checkoutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkout >= today) return parsed;
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  }
  return null;
}

export function writeGuestStay(stay) {
  if (!stay) {
    clearGuestStay();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stay));
  } catch (e) { /* ignore quota */ }
}

export function clearGuestStay() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}
