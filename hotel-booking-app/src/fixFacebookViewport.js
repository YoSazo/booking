/**
 * The visible area, published as CSS custom properties.
 *
 * This file used to only set `--real-vh`, which no stylesheet ever consumed —
 * the workaround was inert. It now does the job properly, for every browser
 * rather than just Facebook's.
 *
 * The problem is not specific to the in-app browser: any chrome that retracts
 * on scroll breaks bottom-anchored controls. `100dvh` grows when Safari's
 * toolbar collapses, pinning a control onto the screen edge — and that edge is
 * where Safari spends the first tap restoring its own chrome instead of
 * delivering it to the page. On the booking engine that means a guest can tap
 * Apply in the date picker and have nothing happen.
 *
 * `visualViewport` reports the genuinely visible region whatever chrome is
 * present, so one mechanism covers Safari, the Facebook/Instagram in-app
 * browser, Android Chrome and an installed PWA.
 *
 * Published on <html>:
 *   --mv-vh      visible height in px
 *   --mv-vt      visual viewport offset from the layout viewport top
 *   --real-vh    1% of the visible height (kept for the original API)
 *
 * CSS fallbacks must use `svh`, never `dvh`: with no JS, erring toward the
 * chrome-visible size keeps controls off the edge.
 */

const ua = navigator.userAgent || navigator.vendor || window.opera || '';
const isFBBrowser = /FBAN|FBAV|Instagram|BusinessSuite|FBForBusinessActivity/.test(ua);

// Chrome that can retract is the only chrome that creates a tap-steal band. An
// installed PWA has none and must not pay for the guard.
function chromeCanRetract() {
  try {
    if (window.navigator?.standalone === true) return false;
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return false;
    if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return false;
    return !!window.matchMedia?.('(pointer: coarse)')?.matches;
  } catch (_) {
    return false;
  }
}

function bindVisualViewportUnits() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let frame = 0;

  root.classList.add(isFBBrowser ? 'fb-browser' : 'normal-browser');
  // Pages Manager carries extra hidden bottom chrome.
  if (ua.indexOf('FBAN/FBPageAdmin') > -1) root.classList.add('fb-page-admin');
  root.classList.toggle('mv-retractable-chrome', chromeCanRetract());

  // Largest viewport ever handed to us — converges on "screen with no chrome".
  let tallestSeen = 0;

  const apply = () => {
    frame = 0;
    // window.innerHeight is unreliable in the Facebook in-app browser, which is
    // why the original file clamped it against screen.height. visualViewport is
    // correct there, so it leads and the clamp is only a fallback.
    const fallback = Math.min(window.innerHeight || 0, screen.height || Infinity)
      || window.innerHeight || root.clientHeight || 0;
    const height = Math.max(1, Math.round(viewport?.height || fallback));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));

    // The tap-steal band only exists while the toolbar is collapsed; an
    // expanded toolbar already fills that strip. Guarding against it then just
    // leaves dead space under the control.
    tallestSeen = Math.max(tallestSeen, height, window.screen?.height || 0);
    root.classList.toggle('mv-chrome-hidden', tallestSeen - height <= 35);

    root.style.setProperty('--mv-vh', `${height}px`);
    root.style.setProperty('--mv-vt', `${top}px`);
    root.style.setProperty('--real-vh', `${height * 0.01}px`);
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
  // Safari settles its toolbar animation after the resize event lands.
  window.addEventListener('orientationchange', () => window.setTimeout(apply, 350));
  window.addEventListener('pageshow', schedule);
}

bindVisualViewportUnits();
