import { fetchWithTimeout } from './fetchWithTimeout.js';

const STORAGE_PREFIX = 'marketel_guest_push';

const storageKey = (hotelId, reservationCode) =>
  `${STORAGE_PREFIX}:${hotelId || 'unknown'}:${reservationCode || 'unknown'}`;

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function arrayBufferToBase64(value) {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function guestPushStatus(hotelId, reservationCode) {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    if (
      Notification.permission === 'granted'
      && localStorage.getItem(storageKey(hotelId, reservationCode)) === 'enabled'
    ) {
      return 'enabled';
    }
  } catch (_) { /* storage can be unavailable in private browsing */ }
  return 'available';
}

export async function prepareGuestPush(apiBaseUrl = '') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Reply alerts took too long to get ready. Try again.')), 10000);
  });
  let keyResponse;
  let registration;
  try {
    [keyResponse, registration] = await Promise.race([
      Promise.all([
        fetchWithTimeout(`${apiBaseUrl}/api/push/vapid-public`, {}, 10000),
        navigator.serviceWorker.ready,
      ]),
      timeout,
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
  const keyData = await keyResponse.json().catch(() => ({}));
  if (!keyResponse.ok || !keyData.publicKey) {
    throw new Error('Reply alerts are temporarily unavailable. Try again.');
  }
  const subscription = await registration.pushManager.getSubscription();
  return { registration, publicKey: keyData.publicKey, subscription };
}

export async function enableGuestPush({ apiBaseUrl = '', hotelId, guestStay, prepared }) {
  if (!hotelId || !guestStay?.code) {
    throw new Error('Connect a reservation before turning on alerts.');
  }
  if (guestPushStatus(hotelId, guestStay.code) === 'unsupported') {
    throw new Error('Reply alerts are not supported on this device.');
  }
  if (!prepared?.registration || !prepared?.publicKey) {
    throw new Error('Reply alerts are still getting ready. Try again.');
  }

  // iOS only accepts this permission request when it happens directly from a
  // guest tap. Keep it before every other awaited operation in this function.
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { enabled: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
  }

  let subscription = prepared.subscription;
  if (!subscription) {
    // With the service worker and VAPID key prepared ahead of time, subscribe()
    // is the very next operation after permission and remains tied to the tap.
    subscription = await prepared.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(prepared.publicKey),
    });
  }

  const subscribeResponse = await fetchWithTimeout(`${apiBaseUrl}/api/guest-push-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      reservationCode: guestStay.code,
      email: guestStay.email || '',
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
      },
    }),
  }, 15000);
  const subscribeData = await subscribeResponse.json().catch(() => ({}));
  if (!subscribeResponse.ok || !subscribeData.success) {
    throw new Error(subscribeData.message || 'Could not turn on reply alerts. Try again.');
  }

  try {
    localStorage.setItem(storageKey(hotelId, guestStay.code), 'enabled');
  } catch (_) { /* alerts still work without the local convenience flag */ }
  window.dispatchEvent(new CustomEvent('marketel:guest-push-change', {
    detail: { hotelId, reservationCode: guestStay.code, enabled: true },
  }));
  return { enabled: true };
}
