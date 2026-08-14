const FORM_FIELD_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(', ');

const CHAT_SURFACE_SELECTOR = '.messages-workspace, .marketel-support-overlay';
const FORM_SURFACE_SELECTOR = [
  '.rooms-modal-bg',
  '.edit-add-room-modal',
  '#notesModal',
  '[data-marketel-keyboard-surface]',
].join(', ');
const NATIVE_AUTH_SELECTOR = '.login-screen';

function isNativeApp() {
  return document.body?.classList.contains('native-ios')
    || window.location.protocol === 'capacitor:'
    || window.Capacitor?.isNativePlatform?.() === true;
}

function keyboardHeightFromEvent(event) {
  return Math.max(0, Number(event?.keyboardHeight || event?.detail?.keyboardHeight || 0));
}

export function enableNativeKeyboardAccessoryBar() {
  if (!isNativeApp()) return;
  let attempts = 0;
  const enable = () => {
    attempts += 1;
    const keyboard = window.Capacitor?.Plugins?.Keyboard;
    if (typeof keyboard?.setAccessoryBarVisible === 'function') {
      Promise.resolve(keyboard.setAccessoryBarVisible({ isVisible: true })).catch(() => {});
      return;
    }
    if (attempts < 6) window.setTimeout(enable, attempts * 120);
  };
  enable();
}

function scrollableParent(field, surface) {
  let node = field?.parentElement;
  while (node && node !== surface && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY || style.overflow || '')) return node;
    node = node.parentElement;
  }
  return surface;
}

/**
 * Capacitor intentionally uses KeyboardResize.None because chat composers own
 * their keyboard space. Ordinary forms therefore need their own visible-area
 * treatment: constrain the active sheet to the unobscured viewport and scroll
 * only the focused control into view. This avoids translating the whole app.
 */
export function bindFormKeyboardViewport() {
  const visualViewport = window.visualViewport;
  const timers = new Set();
  let frame = 0;
  let activeField = null;
  let activeSurface = null;
  let nativeKeyboardHeight = 0;
  let keyboardOpen = false;
  let fullViewportBottom = Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0,
    (visualViewport?.height || 0) + (visualViewport?.offsetTop || 0)
  );

  const visualBounds = () => {
    const top = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
    const height = Math.max(1, Math.round(
      visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
    ));
    return { top, height, bottom: top + height };
  };

  const clearSurface = () => {
    activeSurface?.classList.remove('marketel-form-keyboard-surface', 'marketel-auth-keyboard-surface');
    activeSurface?.style.removeProperty('--marketel-form-visible-top');
    activeSurface?.style.removeProperty('--marketel-form-visible-height');
    activeSurface?.style.removeProperty('--marketel-auth-keyboard-height');
    document.body?.classList.remove('marketel-form-keyboard-open');
    keyboardOpen = false;
  };

  const ensureFieldVisible = () => {
    if (!keyboardOpen || !activeField?.isConnected) return;
    const bounds = visualBounds();
    const nativeBottom = nativeKeyboardHeight > 0
      ? fullViewportBottom - nativeKeyboardHeight
      : fullViewportBottom;
    const visualInset = Math.max(0, fullViewportBottom - bounds.bottom);
    const visibleBottom = Math.min(
      nativeKeyboardHeight > 0 ? nativeBottom : fullViewportBottom,
      visualInset > 80 ? bounds.bottom : fullViewportBottom
    );
    const visibleTop = bounds.top;
    const fieldRect = activeField.getBoundingClientRect();
    const margin = 18;
    let delta = 0;
    if (fieldRect.bottom > visibleBottom - margin) {
      delta = fieldRect.bottom - (visibleBottom - margin);
    } else if (fieldRect.top < visibleTop + margin) {
      delta = fieldRect.top - (visibleTop + margin);
    }
    if (Math.abs(delta) < 1) return;
    const scroller = scrollableParent(activeField, activeSurface);
    if (scroller && scroller !== document.body && scroller !== document.documentElement) {
      scroller.scrollTop += delta;
    } else {
      window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
    }
  };

  const applyViewport = () => {
    frame = 0;
    if (!activeField?.isConnected || document.activeElement !== activeField) {
      if (nativeKeyboardHeight <= 0) clearSurface();
      return;
    }

    const bounds = visualBounds();
    const visualInset = Math.max(0, fullViewportBottom - bounds.bottom);
    const keyboardInset = Math.max(visualInset, nativeKeyboardHeight);
    const nextKeyboardOpen = isNativeApp() && keyboardInset > 80;
    if (!nextKeyboardOpen) {
      clearSurface();
      return;
    }

    const nativeBottom = nativeKeyboardHeight > 0
      ? fullViewportBottom - nativeKeyboardHeight
      : fullViewportBottom;
    const visibleBottom = Math.min(
      nativeKeyboardHeight > 0 ? nativeBottom : fullViewportBottom,
      visualInset > 80 ? bounds.bottom : fullViewportBottom
    );
    const visibleTop = bounds.top;
    const visibleHeight = Math.max(160, visibleBottom - visibleTop);

    keyboardOpen = true;
    document.body?.classList.add('marketel-form-keyboard-open');
    if (activeSurface) {
      if (activeSurface.matches(NATIVE_AUTH_SELECTOR)) {
        activeSurface.classList.add('marketel-auth-keyboard-surface');
        activeSurface.style.setProperty('--marketel-auth-keyboard-height', `${Math.round(keyboardInset)}px`);
      } else {
        activeSurface.classList.add('marketel-form-keyboard-surface');
        activeSurface.style.setProperty('--marketel-form-visible-top', `${visibleTop}px`);
        activeSurface.style.setProperty('--marketel-form-visible-height', `${visibleHeight}px`);
      }
    }
    requestAnimationFrame(ensureFieldVisible);
  };

  const schedule = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(applyViewport);
  };

  const scheduleAfter = (delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      schedule();
    }, delay);
    timers.add(timer);
  };

  const settle = () => {
    schedule();
    scheduleAfter(70);
    scheduleAfter(180);
    scheduleAfter(360);
    scheduleAfter(520);
  };

  const onFocusIn = (event) => {
    const field = event.target;
    if (!field?.matches?.(FORM_FIELD_SELECTOR) || field.closest(CHAT_SURFACE_SELECTOR)) return;
    clearSurface();
    activeField = field;
    activeSurface = field.closest(NATIVE_AUTH_SELECTOR) || field.closest(FORM_SURFACE_SELECTOR);
    fullViewportBottom = Math.max(
      fullViewportBottom,
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      (visualViewport?.height || 0) + (visualViewport?.offsetTop || 0)
    );
    settle();
  };

  const onFocusOut = (event) => {
    if (event.target !== activeField) return;
    scheduleAfter(80);
    scheduleAfter(320);
  };

  const onKeyboardWillShow = (event) => {
    if (!activeField || activeField.closest(CHAT_SURFACE_SELECTOR)) return;
    nativeKeyboardHeight = keyboardHeightFromEvent(event);
    settle();
  };

  const onKeyboardWillHide = () => {
    nativeKeyboardHeight = 0;
    settle();
  };

  const onKeyboardDidHide = () => {
    nativeKeyboardHeight = 0;
    clearSurface();
    if (document.activeElement !== activeField) {
      activeField = null;
      activeSurface = null;
    }
  };

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  window.addEventListener('keyboardWillShow', onKeyboardWillShow);
  window.addEventListener('keyboardWillHide', onKeyboardWillHide);
  window.addEventListener('keyboardDidHide', onKeyboardDidHide);
  window.addEventListener('orientationchange', settle);
  visualViewport?.addEventListener('resize', schedule);
  visualViewport?.addEventListener('scroll', schedule);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('keyboardWillShow', onKeyboardWillShow);
    window.removeEventListener('keyboardWillHide', onKeyboardWillHide);
    window.removeEventListener('keyboardDidHide', onKeyboardDidHide);
    window.removeEventListener('orientationchange', settle);
    visualViewport?.removeEventListener('resize', schedule);
    visualViewport?.removeEventListener('scroll', schedule);
    clearSurface();
  };
}
