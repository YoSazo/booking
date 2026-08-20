// Guestel App Clip install link.
//
// Tapping this URL in iOS Safari makes iOS present the native App Clip card
// ("Open" -> the clip launches/downloads instantly, no App Store). This is a
// supported App Clip invocation ("a link on a website"); it is NOT a JS API —
// you navigate to the link and iOS handles it.
//
// The Apple-hosted default link only renders a card once a DEFAULT APP CLIP
// EXPERIENCE is published in App Store Connect. Until that's live the URL errors,
// so keep APP_CLIP_INSTALL_ENABLED = false and iOS guests continue to get the
// working PWA "Add to Home Screen" flow. Flip to true once the ASC default
// experience is published.
export const GUESTEL_CLIP_BUNDLE_ID = 'com.bookmarketel.guestel.Clip';

export const APP_CLIP_INSTALL_ENABLED = false;

// Builds https://appclip.apple.com/id?p=<clip-bundle-id>&(domain|hotelId)=…
// We carry the hotel so the clip opens already in that property's context:
//  • On a branded *.mktel.co engine we pass the host (clip resolves it server-side
//    and can open that hotel's own booking domain).
//  • Otherwise (e.g. bookmarketel.com/?hotelId=) we pass the explicit hotelId.
export function guestelAppClipUrl({ hotelId } = {}) {
  const params = new URLSearchParams({ p: GUESTEL_CLIP_BUNDLE_ID });
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (/\.mktel\.co$/i.test(host)) {
    params.set('domain', host);
  } else if (hotelId) {
    params.set('hotelId', hotelId);
  }
  return `https://appclip.apple.com/id?${params.toString()}`;
}
