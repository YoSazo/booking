// Web half of Live Activities.
//
// The native plugin only surfaces tokens; registration happens here so it goes
// through api(), which already carries the CRM token, the hotel scope and the
// native origin rewrite. Keeping one auth path is the point — a second one in
// Swift would be a second thing to keep correct.
//
// Everything here is best-effort. Live Activities are an extra surface on the
// existing decision pipeline, so nothing in Front Desk may depend on them
// working, and every failure degrades to the push notification that already
// ships today.

import { crm } from './state.js';

const BACKEND_ORIGIN = 'https://guest-lodge-backend.onrender.com';

let wired = false;

function plugin() {
  const registry = window.Capacitor?.Plugins;
  return registry?.LiveActivity || null;
}

function isNativeShell() {
  return window.location.protocol === 'capacitor:'
    || !!window.Capacitor?.isNativePlatform?.();
}

async function post(path, body) {
  if (typeof window.api !== 'function') return null;
  try {
    return await window.api('POST', path, body);
  } catch (error) {
    // A rejected registration must never surface to the owner; the booking
    // alert still arrives through the normal push.
    console.warn('[live-activity]', path, error?.message || error);
    return null;
  }
}

/**
 * Hand the signed-in session to the widget process. Lock Screen buttons run
 * outside the webview and cannot read localStorage, so this is the only way a
 * one-tap decision can authenticate.
 */
export async function syncLiveActivityCredentials() {
  const api = plugin();
  if (!api?.setCredentials) return;
  try {
    await api.setCredentials({
      crmToken: crm.token || '',
      hotelId: crm.activeHotelId || '',
      backendOrigin: BACKEND_ORIGIN,
    });
  } catch (_) { /* capability probe failures are not user-facing */ }
}

export async function clearLiveActivityCredentials() {
  const api = plugin();
  if (!api) return;
  // End the cards first: a card that outlives the session would offer a
  // decision the device is no longer authorised to make.
  try { await api.endAll?.(); } catch (_) {}
  try { await api.clearCredentials?.(); } catch (_) {}
}

/**
 * Wire the token streams once per app launch.
 * Returns the capability report so callers can decide what to tell the owner.
 */
export async function initLiveActivities() {
  if (wired || !isNativeShell()) return { supported: false };
  const api = plugin();
  if (!api?.getCapabilities) return { supported: false };

  let capabilities = { supported: false, pushToStart: false, enabled: false };
  try {
    capabilities = await api.getCapabilities();
  } catch (_) {
    return { supported: false };
  }
  if (!capabilities.supported) return capabilities;

  wired = true;

  // Per install. Without it a booking cannot raise a card while the app is
  // closed, which is the only moment that matters.
  api.addListener?.('pushToStartToken', ({ token }) => {
    if (!token) return;
    post('/api/push/live-activity/starter', { startToken: token });
  });

  // Per activity. This token is the only way to update or end that card.
  api.addListener?.('activityToken', ({ activityId, bookingId, token }) => {
    if (!activityId || !token || !bookingId) return;
    post('/api/push/live-activity/register', { activityId, bookingId, updateToken: token });
  });

  // The owner can swipe a card away. Recording it stops us pushing to a token
  // with nothing left to update.
  api.addListener?.('activityEnded', ({ activityId }) => {
    if (!activityId) return;
    post('/api/push/live-activity/ended', { activityId });
  });

  try { await api.startObserving(); } catch (_) {}
  await syncLiveActivityCredentials();

  return capabilities;
}
