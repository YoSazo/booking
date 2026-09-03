/**
 * The visible area, published as CSS custom properties.
 *
 * Viewport units cannot express "the part of the screen the user can actually
 * touch". `100dvh` resizes live as Safari's toolbar retracts, which pins a
 * bottom-anchored control onto the screen edge the moment the toolbar collapses
 * — and that edge is where Safari swallows the first tap to restore its own
 * chrome. The control then appears dead, because restoring the toolbar also
 * shrinks `dvh` and moves the button out from under the second tap.
 *
 * `visualViewport` reports the genuinely visible region regardless of which
 * chrome is present, so one mechanism covers Safari's bottom tab bar, its
 * top-address-bar mode, landscape, the Facebook/Instagram in-app browser,
 * Android Chrome, an installed PWA and the Capacitor WKWebView.
 *
 * Published on <html>:
 *   --mv-vh      visible height in px
 *   --mv-vt      visual viewport offset from the layout viewport top
 *   --mv-chrome  how much of the layout viewport the browser chrome is covering
 *
 * Fallbacks in CSS must use `svh`, never `dvh`: with no JS, erring toward the
 * chrome-visible size keeps controls off the edge.
 */

// Chrome that can retract is the only chrome that creates a tap-steal band. An
// installed PWA and the native shell have none, and must not pay for the guard.
function chromeCanRetract() {
  try {
    if (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative) return false;
    if (window.navigator?.standalone === true) return false;
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return false;
    if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return false;
    // Desktop browsers keep their chrome outside the viewport entirely.
    return !!window.matchMedia?.('(pointer: coarse)')?.matches;
  } catch (_) {
    return false;
  }
}

export function bindVisualViewportUnits() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let frame = 0;

  root.classList.toggle('mv-retractable-chrome', chromeCanRetract());

  const apply = () => {
    frame = 0;
    const height = Math.max(1, Math.round(
      viewport?.height || window.innerHeight || root.clientHeight || 0
    ));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
    // The layout viewport is the tallest thing the page can be laid out into.
    // Whatever the visual viewport is missing from it is chrome sitting on top.
    const layout = Math.max(
      root.clientHeight || 0,
      window.innerHeight || 0,
      height + top
    );
    const chrome = Math.max(0, Math.round(layout - (height + top)));

    root.style.setProperty('--mv-vh', `${height}px`);
    root.style.setProperty('--mv-vt', `${top}px`);
    root.style.setProperty('--mv-chrome', `${chrome}px`);
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(apply);
  };

  apply();

  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  // Safari settles its toolbar animation after the resize event lands, so a
  // late pass catches the final geometry rather than a mid-transition one.
  window.addEventListener('orientationchange', () => window.setTimeout(apply, 350));
  window.addEventListener('pageshow', schedule);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.removeEventListener('pageshow', schedule);
    root.style.removeProperty('--mv-vh');
    root.style.removeProperty('--mv-vt');
    root.style.removeProperty('--mv-chrome');
  };
}
