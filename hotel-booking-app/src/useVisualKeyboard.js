import { useEffect, useRef, useState } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

function isEditable(element) {
  return !!element?.matches?.(EDITABLE_SELECTOR);
}

/**
 * Tracks the portion of the page that is actually visible above a mobile
 * software keyboard. Safari/WKWebView resize visualViewport, not necessarily
 * the CSS layout viewport, so 100vh alone cannot keep a chat composer visible.
 */
export default function useVisualKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    let fullHeight = Math.max(window.innerHeight || 0, viewport?.height || 0);

    const apply = () => {
      frame = 0;
      const visibleHeight = Math.max(1, Math.round(
        viewport?.height || window.innerHeight || document.documentElement.clientHeight
      ));
      const focused = isEditable(document.activeElement);

      if (!focused && !openRef.current) fullHeight = visibleHeight;

      const nextOpen = focused && Math.max(0, fullHeight - visibleHeight) > 80;
      const visibleTop = nextOpen
        ? Math.max(0, Math.round(viewport?.offsetTop || 0))
        : 0;

      document.documentElement.style.setProperty('--marketel-visual-height', `${visibleHeight}px`);
      document.documentElement.style.setProperty('--marketel-visual-top', `${visibleTop}px`);
      document.documentElement.classList.toggle('marketel-keyboard-open', nextOpen);

      if (openRef.current !== nextOpen) {
        openRef.current = nextOpen;
        setKeyboardOpen(nextOpen);
        window.dispatchEvent(new CustomEvent('marketel:keyboard-change', {
          detail: { open: nextOpen, height: visibleHeight },
        }));
      }
    };

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    const settle = () => {
      schedule();
      window.setTimeout(schedule, 80);
      window.setTimeout(schedule, 280);
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', settle);
    document.addEventListener('focusin', settle);
    document.addEventListener('focusout', settle);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    apply();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', settle);
      document.removeEventListener('focusin', settle);
      document.removeEventListener('focusout', settle);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.documentElement.classList.remove('marketel-keyboard-open');
      document.documentElement.style.removeProperty('--marketel-visual-height');
      document.documentElement.style.removeProperty('--marketel-visual-top');
    };
  }, []);

  return keyboardOpen;
}
