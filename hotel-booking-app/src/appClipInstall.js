// Guestel is the single guest-app handoff. Button taps use Apple's hosted URL
// (the only link that can present the App Clip card); QR codes use the
// associated clip.mktel.co route so the property identity travels with them.
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

export function guestelQrInvocationUrl({
  hotelId,
  intent = 'book',
  handoffToken,
  ref = 'booking-engine',
} = {}) {
  const cleanHotelId = String(hotelId || '').trim();
  if (!cleanHotelId) return guestelInvocationUrl({ hotelId, intent, handoffToken });
  const params = new URLSearchParams();
  if (intent) params.set('intent', intent);
  if (ref) params.set('ref', ref);
  if (handoffToken) params.set('handoff', handoffToken);
  const query = params.toString();
  return `https://clip.mktel.co/clip/${encodeURIComponent(cleanHotelId)}${query ? `?${query}` : ''}`;
}
