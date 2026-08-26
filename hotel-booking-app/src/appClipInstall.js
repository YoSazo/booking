// Guestel App Clip install link. iOS recognizes this HTTPS route through the
// site's AASA file; every other browser simply lands on the same hotel's web
// booking engine. Keep it gated until the App Clip experience is approved.

// Release gate: do not strand Safari users on Apple's error page before the
// App Store Connect default experience is approved. Vercel can enable this
// without a code change via VITE_GUESTEL_APP_CLIP_ENABLED=true.
export const APP_CLIP_INSTALL_ENABLED = import.meta.env.VITE_GUESTEL_APP_CLIP_ENABLED === 'true';

// Invocation URL for a Safari button tap.
//
// IMPORTANT: navigating to an associated domain (clip.mktel.co / a hotel subdomain)
// does NOT pop the App Clip card — Safari just loads the page. Only Apple's hosted
// default link (appclip.apple.com/id?p=<bundle>) invokes the card from a link/button.
// The clip reads the hotel from the domain/hotelId param below; extra params (intent,
// handoff) ride along to the clip too. (QR codes / NFC use clip.mktel.co/clip/<id>
// separately — those ARE supported invocation surfaces; a plain navigation is not.)
export function guestelInvocationUrl({ hotelId, intent = 'add', handoffToken } = {}) {
  const params = new URLSearchParams({ p: 'com.bookmarketel.guestel.Clip' });
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (/\.mktel\.co$/i.test(host)) {
    params.set('domain', host);
  } else if (hotelId) {
    params.set('hotelId', hotelId);
  }
  if (intent) params.set('intent', intent);
  // One-use, handoff-only capability — cannot read messages or mutate a reservation;
  // Guestel exchanges it for the normal token.
  if (handoffToken) params.set('handoff', handoffToken);
  return `https://appclip.apple.com/id?${params.toString()}`;
}
