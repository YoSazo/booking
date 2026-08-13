const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
const boundChatRoots = new Set();

function editableInside(root, selector) {
  const active = document.activeElement;
  return !!(active && root.contains(active) && active.matches(selector));
}

function syncBodyKeyboardClass() {
  document.body?.classList.toggle(
    'marketel-chat-keyboard-open',
    [...boundChatRoots].some((root) => root.classList.contains('marketel-chat-keyboard-open'))
  );
}

/**
 * Pins a chat surface to the browser's visual viewport.
 *
 * Mobile Safari and WKWebView keep the layout viewport at its full height when
 * the software keyboard opens. Fixed elements that use 100vh therefore end up
 * behind the keyboard. This helper follows visualViewport instead, leaving the
 * conversation as the only scrolling region and the composer at its bottom.
 */
export function bindChatKeyboardViewport(root, {
  fieldSelector = EDITABLE_SELECTOR,
  scrollSelector = null,
} = {}) {
  if (!root) return () => {};
  if (typeof root.__marketelChatKeyboardCleanup === 'function') {
    return root.__marketelChatKeyboardCleanup;
  }
  boundChatRoots.add(root);

  const visualViewport = window.visualViewport;
  let animationFrame = 0;
  let fullViewportHeight = Math.max(
    window.innerHeight || 0,
    visualViewport?.height || 0
  );
  let keyboardOpen = false;
  let touchStartY = null;

  const activeScroller = () => (
    scrollSelector ? root.querySelector(scrollSelector) : null
  );

  const scrollConversationToBottom = () => {
    const scroller = activeScroller();
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  };

  const applyViewport = () => {
    animationFrame = 0;
    const visibleHeight = Math.max(1, Math.round(
      visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
    ));
    const hasFocusedField = editableInside(root, fieldSelector);

    if (!hasFocusedField) {
      fullViewportHeight = Math.max(fullViewportHeight, visibleHeight, window.innerHeight || 0);
    }

    const occludedHeight = Math.max(0, fullViewportHeight - visibleHeight);
    const nextKeyboardOpen = hasFocusedField && occludedHeight > 80;
    // iOS 26 can briefly retain a stale offsetTop after dismissal. Once no
    // field owns the keyboard, anchoring to zero avoids exposing the page below.
    const visibleTop = nextKeyboardOpen
      ? Math.max(0, Math.round(visualViewport?.offsetTop || 0))
      : 0;

    root.style.setProperty('--marketel-chat-viewport-height', `${visibleHeight}px`);
    root.style.setProperty('--marketel-chat-viewport-top', `${visibleTop}px`);
    root.classList.toggle('marketel-chat-keyboard-open', nextKeyboardOpen);
    syncBodyKeyboardClass();

    if (nextKeyboardOpen && !keyboardOpen) {
      requestAnimationFrame(scrollConversationToBottom);
    }
    keyboardOpen = nextKeyboardOpen;
  };

  const scheduleViewport = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(applyViewport);
  };

  const settleViewport = () => {
    scheduleViewport();
    window.setTimeout(scheduleViewport, 80);
    window.setTimeout(scheduleViewport, 280);
  };

  const onFocusIn = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    settleViewport();
  };

  const onFocusOut = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    settleViewport();
  };

  const onTouchStart = (event) => {
    if (!keyboardOpen || !event.touches?.length) return;
    const scroller = activeScroller();
    if (!scroller || !scroller.contains(event.target)) return;
    touchStartY = event.touches[0].clientY;
  };

  const onTouchMove = (event) => {
    if (touchStartY == null || !event.touches?.length) return;
    const distance = event.touches[0].clientY - touchStartY;
    if (distance > 52) {
      const active = document.activeElement;
      if (active && root.contains(active)) active.blur();
      touchStartY = null;
      settleViewport();
    }
  };

  const onTouchEnd = () => { touchStartY = null; };

  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchmove', onTouchMove, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('resize', scheduleViewport);
  visualViewport?.addEventListener('resize', scheduleViewport);
  visualViewport?.addEventListener('scroll', scheduleViewport);
  applyViewport();

  const cleanup = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', scheduleViewport);
    visualViewport?.removeEventListener('resize', scheduleViewport);
    visualViewport?.removeEventListener('scroll', scheduleViewport);
    root.classList.remove('marketel-chat-keyboard-open');
    root.style.removeProperty('--marketel-chat-viewport-height');
    root.style.removeProperty('--marketel-chat-viewport-top');
    boundChatRoots.delete(root);
    delete root.__marketelChatKeyboardCleanup;
    syncBodyKeyboardClass();
  };

  root.__marketelChatKeyboardCleanup = cleanup;
  return cleanup;
}
