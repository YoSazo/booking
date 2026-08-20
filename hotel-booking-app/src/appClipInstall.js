// Guestel App Clip install link. iOS recognizes this HTTPS route through the
// site's AASA file; every other browser simply lands on the same hotel's web
// booking engine. Keep it gated until the App Clip experience is approved.

// Release gate: do not strand Safari users on Apple's error page before the
// App Store Connect default experience is approved. Vercel can enable this
// without a code change via VITE_GUESTEL_APP_CLIP_ENABLED=true.
export const APP_CLIP_INSTALL_ENABLED = import.meta.env.VITE_GUESTEL_APP_CLIP_ENABLED === 'true';

// One scalable invocation domain for QR codes and links. Property subdomains no
// longer need to be baked into the App Clip entitlement one by one.
export function guestelInvocationUrl({ hotelId, intent = 'add', handoffToken } = {}) {
  const base = hotelId
    ? `https://clip.mktel.co/clip/${encodeURIComponent(hotelId)}`
    : 'https://clip.mktel.co/';
  const params = new URLSearchParams();
  if (intent) params.set('intent', intent);
  // This is a one-use, handoff-only capability. It cannot read messages or
  // mutate a reservation and is exchanged by Guestel for the normal token.
  if (handoffToken) params.set('handoff', handoffToken);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
