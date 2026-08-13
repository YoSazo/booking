import { useEffect, useRef, useState } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

function isEditable(element) {
  return !!element?.matches?.(EDITABLE_SELECTOR);
}

/**
 * Tracks the complete keyboard transition, not only its final open state.
 * Focus starts the transition before iOS animates; blur does not release it
 * until VisualViewport is full-sized again. This avoids exposing the route
 * underneath during Safari's asynchronous viewport updates.
 */
export default function useVisualKeyboard() {
  const [keyboardActive, setKeyboardActive] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const timers = new Set();
    let frame = 0;
    let settleFrame = 0;
    let fullHeight = Math.max(window.innerHeight || 0, viewport?.height || 0);
    let savedScrollY = window.scrollY || 0;

    const setActive = (active) => {
      if (activeRef.current === active) return;
      activeRef.current = active;
      document.documentElement.classList.toggle('marketel-keyboard-active', active);
      setKeyboardActive(active);
    };

    const readViewport = () => ({
      height: Math.max(1, Math.round(
        viewport?.height || window.innerHeight || document.documentElement.clientHeight
      )),
      top: Math.max(0, Math.round(viewport?.offsetTop || 0)),
    });

    const finish = (height) => {
      document.documentElement.style.setProperty('--marketel-visual-height', `${height}px`);
      document.documentElement.style.setProperty('--marketel-visual-top', '0px');
      document.documentElement.classList.remove('marketel-keyboard-open');
      setActive(false);
      window.scrollTo(0, savedScrollY);
    };

    const apply = () => {
      frame = 0;
      const current = readViewport();
      const focused = isEditable(document.activeElement);

      if (!activeRef.current && !focused) {
        fullHeight = Math.max(current.height, window.innerHeight || 0);
      }
      if (focused && !activeRef.current) {
        savedScrollY = window.scrollY || 0;
        setActive(true);
      }

      const hiddenHeight = Math.max(0, fullHeight - current.height);
      const open = activeRef.current && hiddenHeight > 80;
      document.documentElement.style.setProperty('--marketel-visual-height', `${current.height}px`);
      document.documentElement.style.setProperty(
        '--marketel-visual-top',
        `${activeRef.current ? current.top : 0}px`
      );
      document.documentElement.classList.toggle('marketel-keyboard-open', open);

      if (activeRef.current && !focused && hiddenHeight <= 80) {
        if (settleFrame) cancelAnimationFrame(settleFrame);
        settleFrame = requestAnimationFrame(() => {
          settleFrame = requestAnimationFrame(() => {
            settleFrame = 0;
            if (!isEditable(document.activeElement)) {
              const settled = readViewport();
              fullHeight = Math.max(settled.height, window.innerHeight || 0);
              finish(settled.height);
            }
          });
        });
      }
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
    };

    const onFocusIn = (event) => {
      if (!isEditable(event.target)) return;
      savedScrollY = window.scrollY || 0;
      setActive(true);
      settle();
    };

    const onFocusOut = (event) => {
      if (!isEditable(event.target)) return;
      // Remain active until the keyboard and viewport finish dismissing.
      settle();
      scheduleAfter(520);
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
      if (settleFrame) cancelAnimationFrame(settleFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', settle);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.documentElement.classList.remove('marketel-keyboard-active', 'marketel-keyboard-open');
      document.documentElement.style.removeProperty('--marketel-visual-height');
      document.documentElement.style.removeProperty('--marketel-visual-top');
    };
  }, []);

  return keyboardActive;
}
