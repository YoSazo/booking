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
 * Keeps chat chrome fixed and grows only its composer beneath the visible
 * input row. The keyboard covers that extra opaque area, so the composer sits
 * directly above it without translating or resizing the whole application.
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
  let keyboardActive = false;
  let keyboardOpen = false;
  let nativeKeyboardHeight = 0;
  let touchStartY = null;
  let fullViewportBottom = Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0,
    (visualViewport?.height || 0) + (visualViewport?.offsetTop || 0)
  );

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

  const viewportBottom = () => {
    const height = Math.max(1, Math.round(
      visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
    ));
    const top = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
    return top + height;
  };

  const finishKeyboardTransition = () => {
    keyboardOpen = false;
    nativeKeyboardHeight = 0;
    root.classList.remove('marketel-chat-keyboard-open');
    root.style.setProperty('--marketel-chat-keyboard-inset', '0px');
    setKeyboardActive(false);
    syncBodyKeyboardClasses();
  };

  const applyViewport = () => {
    animationFrame = 0;
    const currentBottom = viewportBottom();
    const hasFocusedField = editableInside(root, fieldSelector);

    if (!keyboardActive && !hasFocusedField) {
      fullViewportBottom = Math.max(
        currentBottom,
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0
      );
    }
    if (hasFocusedField && !keyboardActive) setKeyboardActive(true);

    const visualInset = Math.max(0, fullViewportBottom - currentBottom);
    const keyboardInset = keyboardActive
      ? Math.max(visualInset, nativeKeyboardHeight)
      : 0;
    const nextKeyboardOpen = keyboardActive && keyboardInset > 80;

    root.style.setProperty(
      '--marketel-chat-keyboard-inset',
      `${nextKeyboardOpen ? Math.round(keyboardInset) : 0}px`
    );
    root.classList.toggle('marketel-chat-keyboard-open', nextKeyboardOpen);
    syncBodyKeyboardClasses();

    if (nextKeyboardOpen && !keyboardOpen) {
      requestAnimationFrame(scrollConversationToBottom);
    }
    keyboardOpen = nextKeyboardOpen;

    if (keyboardActive && !hasFocusedField && keyboardInset <= 80) {
      finishKeyboardTransition();
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
    scheduleAfter(520);
  };

  const onFocusIn = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    setKeyboardActive(true);
    requestAnimationFrame(scrollConversationToBottom);
    settleViewport();
  };

  const onFocusOut = (event) => {
    if (!event.target?.matches?.(fieldSelector)) return;
    settleViewport();
  };

  const eventKeyboardHeight = (event) => Math.max(0, Number(
    event?.keyboardHeight || event?.detail?.keyboardHeight || 0
  ));

  const onKeyboardWillShow = (event) => {
    if (!editableInside(root, fieldSelector)) return;
    nativeKeyboardHeight = eventKeyboardHeight(event);
    setKeyboardActive(true);
    settleViewport();
  };

  const onKeyboardWillHide = () => {
    if (!keyboardActive) return;
    nativeKeyboardHeight = 0;
    settleViewport();
  };

  const onKeyboardDidHide = () => {
    nativeKeyboardHeight = 0;
    if (!editableInside(root, fieldSelector)) finishKeyboardTransition();
    else settleViewport();
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
  window.addEventListener('orientationchange', settleViewport);
  window.addEventListener('keyboardWillShow', onKeyboardWillShow);
  window.addEventListener('keyboardWillHide', onKeyboardWillHide);
  window.addEventListener('keyboardDidHide', onKeyboardDidHide);
  visualViewport?.addEventListener('resize', scheduleViewport);
  visualViewport?.addEventListener('scroll', scheduleViewport);
  applyViewport();

  const cleanup = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', scheduleViewport);
    window.removeEventListener('orientationchange', settleViewport);
    window.removeEventListener('keyboardWillShow', onKeyboardWillShow);
    window.removeEventListener('keyboardWillHide', onKeyboardWillHide);
    window.removeEventListener('keyboardDidHide', onKeyboardDidHide);
    visualViewport?.removeEventListener('resize', scheduleViewport);
    visualViewport?.removeEventListener('scroll', scheduleViewport);
    root.classList.remove('marketel-chat-keyboard-active', 'marketel-chat-keyboard-open');
    root.style.removeProperty('--marketel-chat-keyboard-inset');
    boundChatRoots.delete(root);
    delete root.__marketelChatKeyboardCleanup;
    syncBodyKeyboardClasses();
  };

  root.__marketelChatKeyboardCleanup = cleanup;
  return cleanup;
}
