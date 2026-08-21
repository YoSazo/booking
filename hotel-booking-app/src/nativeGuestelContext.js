// Guestel and its App Clip render the public booking engine as app
// functionality. They intentionally opt out of the website's advertising and
// behavioral-analytics pipeline so their App Store privacy declaration can
// remain tracking-free.
export function isNativeGuestelContext() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('guestelNative') === '1'
    || window.__GUESTEL_NATIVE__ === true
    || window.__GUESTEL_APP_CLIP__ === true;
}
