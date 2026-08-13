const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
const boundChatRoots = new Set();

function editableInside(root, selector) {
  const active = document.activeElement;
  return !!(active && root.contains(active) && active.matches(selector));
}

function syncBodyKeyboardClasses() {
  const roots = [...boundChatRoots];
  document.body?.classList.toggle(
    'marketel-chat-keyboard-active',
    roots.some((root) => root.classList.contains('marketel-chat-keyboard-active'))
  );
  document.body?.classList.toggle(
    'marketel-chat-keyboard-open',
    roots.some((root) => root.classList.contains('marketel-chat-keyboard-open'))
  );
}

/**
 * Keeps a full-screen chat attached to the visual viewport while the software
 * keyboard animates. The active phase starts on focus (before Safari changes
 * its viewport) and survives blur until the viewport is restored, preventing
 * the one-frame flash of the page underneath on both presentation and dismiss.
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
  const timers = new Set();
  let animationFrame = 0;
  let secondAnimationFrame = 0;
  let fullViewportHeight = Math.max(
    window.innerHeight || 0,
    visualViewport?.height || 0
  );
  let keyboardActive = false;
  let keyboardOpen = false;
  let touchStartY = null;
  let savedScrollY = window.scrollY || 0;

  const activeScroller = () => (
    scrollSelector ? root.querySelector(scrollSelector) : null
  );

  const scrollConversationToBottom = () => {
    const scroller = activeScroller();
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  };

  const setKeyboardActive = (active) => {
    if (keyboardActive === active) return;
    keyboardActive = active;
    root.classList.toggle('marketel-chat-keyboard-active', active);
    syncBodyKeyboardClasses();
  };

  const visibleViewport = () => ({
    height: Math.max(1, Math.round(
      visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
    )),
    top: Math.max(0, Math.round(visualViewport?.offsetTop || 0)),
  });

  const finishKeyboardTransition = (height) => {
    keyboardOpen = false;
    root.classList.remove('marketel-chat-keyboard-open');
    root.style.setProperty('--marketel-chat-viewport-height', `${height}px`);
    root.style.setProperty('--marketel-chat-viewport-top', '0px');
    setKeyboardActive(false);
    // WebKit can leave the layout viewport panned after keyboard dismissal.
    // Restore the page only once the visual viewport is full-sized again.
    window.scrollTo(0, savedScrollY);
    syncBodyKeyboardClasses();
  };

  const applyViewport = () => {
    animationFrame = 0;
    const viewport = visibleViewport();
    const hasFocusedField = editableInside(root, fieldSelector);

    if (!keyboardActive && !hasFocusedField) {
      fullViewportHeight = Math.max(viewport.height, window.innerHeight || 0);
    }
    if (hasFocusedField && !keyboardActive) {
      savedScrollY = window.scrollY || 0;
      setKeyboardActive(true);
    }

    const occludedHeight = Math.max(0, fullViewportHeight - viewport.height);
    const nextKeyboardOpen = keyboardActive && occludedHeight > 80;

    if (keyboardActive) {
      root.style.setProperty('--marketel-chat-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--marketel-chat-viewport-top', `${viewport.top}px`);
    } else {
      root.style.setProperty('--marketel-chat-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--marketel-chat-viewport-top', '0px');
    }

    root.classList.toggle('marketel-chat-keyboard-open', nextKeyboardOpen);
    syncBodyKeyboardClasses();

    if (nextKeyboardOpen && !keyboardOpen) {
      requestAnimationFrame(scrollConversationToBottom);
    }
    keyboardOpen = nextKeyboardOpen;

    if (keyboardActive && !hasFocusedField && occludedHeight <= 80) {
      // A second animation frame is intentional: installed iOS web apps can
      // fire resize before visualViewport reflects its final restored height.
      secondAnimationFrame = requestAnimationFrame(() => {
        secondAnimationFrame = requestAnimationFrame(() => {
          secondAnimationFrame = 0;
          if (!editableInside(root, fieldSelector)) {
            const settled = visibleViewport();
            fullViewportHeight = Math.max(settled.height, window.innerHeight || 0);
            finishKeyboardTransition(settled.height);
          }
        });
      });
    }
  };

  const scheduleViewport = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(applyViewport);
  };

  const scheduleAfter = (delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      scheduleViewport();
    }, delay);
    timers.add(timer);
  };

  const settleViewport = () => {
    scheduleViewport();
    scheduleAfter(70);
    scheduleAfter(180);
    scheduleAfter(360);
  };

  const onFocusIn = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    savedScrollY = window.scrollY || 0;
    setKeyboardActive(true);
    requestAnimationFrame(scrollConversationToBottom);
    settleViewport();
  };

  const onFocusOut = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    // Keep the opaque chat surface active while the keyboard animates away.
    settleViewport();
    scheduleAfter(520);
  };

  const onKeyboardWillShow = () => {
    if (!editableInside(root, fieldSelector)) return;
    setKeyboardActive(true);
    settleViewport();
  };

  const onKeyboardWillHide = () => {
    if (!keyboardActive) return;
    settleViewport();
  };

  const onKeyboardDidHide = () => {
    if (!keyboardActive || editableInside(root, fieldSelector)) return;
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
    if (event.touches[0].clientY - touchStartY > 52) {
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
  window.addEventListener('keyboardWillShow', onKeyboardWillShow);
  window.addEventListener('keyboardWillHide', onKeyboardWillHide);
  window.addEventListener('keyboardDidHide', onKeyboardDidHide);
  visualViewport?.addEventListener('resize', scheduleViewport);
  visualViewport?.addEventListener('scroll', scheduleViewport);
  applyViewport();

  const cleanup = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (secondAnimationFrame) cancelAnimationFrame(secondAnimationFrame);
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', scheduleViewport);
    window.removeEventListener('keyboardWillShow', onKeyboardWillShow);
    window.removeEventListener('keyboardWillHide', onKeyboardWillHide);
    window.removeEventListener('keyboardDidHide', onKeyboardDidHide);
    visualViewport?.removeEventListener('resize', scheduleViewport);
    visualViewport?.removeEventListener('scroll', scheduleViewport);
    root.classList.remove('marketel-chat-keyboard-active', 'marketel-chat-keyboard-open');
    root.style.removeProperty('--marketel-chat-viewport-height');
    root.style.removeProperty('--marketel-chat-viewport-top');
    boundChatRoots.delete(root);
    delete root.__marketelChatKeyboardCleanup;
    syncBodyKeyboardClasses();
  };

  root.__marketelChatKeyboardCleanup = cleanup;
  return cleanup;
}
