import { useEffect, useRef, useState } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

function isEditable(element) {
  return !!element?.matches?.(EDITABLE_SELECTOR);
}

/**
 * Tracks the keyboard without resizing or translating the route. Messaging
 * composers consume the exposed bottom inset; ordinary forms keep Safari's
 * standard focused-field scrolling behavior.
 */
export default function useVisualKeyboard() {
  const [keyboardActive, setKeyboardActive] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const timers = new Set();
    let frame = 0;
    let fullViewportBottom = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      (viewport?.height || 0) + (viewport?.offsetTop || 0)
    );

    const setActive = (active) => {
      if (activeRef.current === active) return;
      activeRef.current = active;
      document.documentElement.classList.toggle('marketel-keyboard-active', active);
      setKeyboardActive(active);
    };

    const viewportBottom = () => {
      const height = Math.max(1, Math.round(
        viewport?.height || window.innerHeight || document.documentElement.clientHeight
      ));
      const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
      return top + height;
    };

    const finish = () => {
      document.documentElement.style.setProperty('--marketel-keyboard-inset', '0px');
      document.documentElement.classList.remove('marketel-keyboard-open');
      setActive(false);
    };

    const apply = () => {
      frame = 0;
      const currentBottom = viewportBottom();
      const focused = isEditable(document.activeElement);

      if (!activeRef.current && !focused) {
        fullViewportBottom = Math.max(
          currentBottom,
          window.innerHeight || 0,
          document.documentElement.clientHeight || 0
        );
      }
      if (focused && !activeRef.current) setActive(true);

      const keyboardInset = activeRef.current
        ? Math.max(0, fullViewportBottom - currentBottom)
        : 0;
      const open = activeRef.current && keyboardInset > 80;
      document.documentElement.style.setProperty(
        '--marketel-keyboard-inset',
        `${open ? Math.round(keyboardInset) : 0}px`
      );
      document.documentElement.classList.toggle('marketel-keyboard-open', open);

      if (activeRef.current && !focused && keyboardInset <= 80) finish();
    };

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
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
      if (!isEditable(event.target)) return;
      setActive(true);
      settle();
    };

    const onFocusOut = (event) => {
      if (!isEditable(event.target)) return;
      settle();
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', settle);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    apply();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', settle);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.documentElement.classList.remove('marketel-keyboard-active', 'marketel-keyboard-open');
      document.documentElement.style.removeProperty('--marketel-keyboard-inset');
    };
  }, []);

  return keyboardActive;
}
