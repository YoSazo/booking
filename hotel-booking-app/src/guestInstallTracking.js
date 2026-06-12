/** Record guest PWA install funnel events (view, cta_click, installed). */

function sessionKey(touchpoint, reservationCode, eventType) {
  return `guest_install_evt_${eventType}_${touchpoint}_${reservationCode || 'generic'}`;
}

export function trackGuestInstall(apiBaseUrl, hotelId, { touchpoint, eventType, reservationCode }) {
  if (!apiBaseUrl || !hotelId || !touchpoint || !eventType) return;

  try {
    const dedupeEvents = eventType === 'view' || eventType === 'installed';
    if (dedupeEvents && sessionStorage.getItem(sessionKey(touchpoint, reservationCode, eventType))) {
      return;
    }
    if (dedupeEvents) {
      sessionStorage.setItem(sessionKey(touchpoint, reservationCode, eventType), '1');
    }
  } catch (e) { /* ignore */ }

  fetch(`${apiBaseUrl}/api/guest-install-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hotelId,
      touchpoint,
      eventType,
      reservationCode: reservationCode || undefined,
    }),
  }).catch(() => {});
}

/** Touchpoint from ?ref= on install page, with sane fallback. */
export function installTouchpointFromRef(ref) {
  const r = String(ref || '').trim();
  if (!r || r === 'direct') return 'install-page';
  return r;
}
