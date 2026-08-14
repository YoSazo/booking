import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarSearch, MessageCircle } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import useVisualKeyboard from './useVisualKeyboard.js';
import './GuestLayout.css';

const NAV_TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/guest/home' },
  { key: 'book', label: 'Book', icon: CalendarSearch, path: '/' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, path: '/guest/messages' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function activeTabForPath(pathname) {
  if (pathname.startsWith('/guest/messages')) return 'messages';
  if (pathname === '/') return 'book';
  if (
    pathname === '/guest-info'
    || pathname === '/confirmation'
    || pathname === '/final-confirmation'
  ) {
    return null;
  }
  if (pathname.startsWith('/guest/') || pathname.startsWith('/booking')) return 'home';
  return 'book';
}

export default function GuestLayout({ children }) {
  const { isGuest, guestStay, syncGuestStay, apiBaseUrl, hotelId } = useGuest();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : true
  );
  // Nav only after Add to Home Screen — re-check on install + display-mode change.
  const [installedApp, setInstalledApp] = useState(() => isStandalone());
  const keyboardOpen = useVisualKeyboard();
  const navRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const activeTab = activeTabForPath(location.pathname);
  const activeIndex = NAV_TABS.findIndex((tab) => tab.key === activeTab);
  const [navPosition, setNavPosition] = useState(activeIndex >= 0 ? activeIndex : 1);
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const [navShineX, setNavShineX] = useState(170);

  useEffect(() => {
    const syncInstalled = () => setInstalledApp(isStandalone());
    syncInstalled();
    window.addEventListener('appinstalled', syncInstalled);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', syncInstalled);
    return () => {
      window.removeEventListener('appinstalled', syncInstalled);
      mq?.removeEventListener?.('change', syncInstalled);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!guestStay?.code || !hotelId) return;
    try {
      const params = new URLSearchParams({
        hotelId,
        code: guestStay.code,
        email: guestStay.email || '',
      });
      const res = await fetchWithTimeout(`${apiBaseUrl}/api/guest-messages?${params}`, {}, 12000);
      const data = await res.json();
      if (data.success) {
        const unread = data.messages.filter(
          (m) => m.sender === 'hotel' && !m.guestReadAt
        ).length;
        setUnreadCount(unread);
        if (installedApp && 'setAppBadge' in navigator && unread > 0) {
          navigator.setAppBadge(unread).catch(() => {});
        } else if (installedApp && 'clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch(() => {});
        }
      }
    } catch (e) { /* ignore */ }
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl, installedApp]);

  useEffect(() => {
    if (!installedApp || !isGuest) return;
    fetchUnread();
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') fetchUnread();
    };
    const interval = setInterval(refreshWhenVisible, 15000);
    const clearUnread = () => {
      setUnreadCount(0);
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    };
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    window.addEventListener('marketel:guest-refresh', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('marketel:guest-messages-read', clearUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      window.removeEventListener('marketel:guest-refresh', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('marketel:guest-messages-read', clearUnread);
    };
  }, [installedApp, isGuest, fetchUnread]);

  useEffect(() => {
    if (!installedApp || !('serviceWorker' in navigator)) return undefined;
    const onWorkerMessage = (event) => {
      if (event?.data?.type !== 'marketel-guest-data-updated') return;
      syncGuestStay();
      window.dispatchEvent(new CustomEvent('marketel:guest-refresh', {
        detail: event.data,
      }));
    };
    navigator.serviceWorker.addEventListener('message', onWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onWorkerMessage);
  }, [installedApp, syncGuestStay]);

  useEffect(() => {
    if (installedApp && !guestStay?.code && 'clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
      setUnreadCount(0);
    }
  }, [installedApp, guestStay?.code]);

  const isInstallPage = location.pathname === '/install';
  // Bottom nav: installed PWA only. Browser booking flow stays nav-free.
  const showNav = installedApp && isMobile && !isInstallPage && !keyboardOpen;

  useEffect(() => {
    if (!isDraggingNav && activeIndex >= 0) setNavPosition(activeIndex);
  }, [activeIndex, isDraggingNav]);

  const openTab = useCallback((tab, source = 'tap') => {
    if (!tab) return;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    syncGuestStay();
    window.dispatchEvent(new CustomEvent('marketel:guest-refresh', {
      detail: { source: `navigation-${source}`, tab: tab.key },
    }));
    navigate(tab.path);
  }, [navigate, syncGuestStay]);

  const positionForPointer = useCallback((clientX) => {
    const nav = navRef.current;
    if (!nav) return activeIndex >= 0 ? activeIndex : 1;
    const rect = nav.getBoundingClientRect();
    const edge = 8;
    const trackWidth = Math.max(1, rect.width - (edge * 2));
    const slotWidth = trackWidth / NAV_TABS.length;
    const position = (clientX - rect.left - edge - (slotWidth / 2)) / slotWidth;
    setNavShineX(clamp(clientX - rect.left, 0, rect.width));
    return clamp(position, 0, NAV_TABS.length - 1);
  }, [activeIndex]);

  const handleNavPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const nav = navRef.current;
    if (!nav) return;
    const tabButton = event.target.closest?.('[data-guest-tab-index]');
    const position = positionForPointer(event.clientX);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      position,
      moved: false,
      tapIndex: tabButton ? Number(tabButton.dataset.guestTabIndex) : null,
    };
    nav.setPointerCapture?.(event.pointerId);
    setNavPosition(position);
    setIsDraggingNav(true);
  };

  const handleNavPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const position = positionForPointer(event.clientX);
    drag.position = position;
    if (Math.abs(event.clientX - drag.startX) > 6) drag.moved = true;
    setNavPosition(position);
  };

  const finishNavPointer = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    navRef.current?.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setIsDraggingNav(false);

    if (cancelled) {
      setNavPosition(activeIndex >= 0 ? activeIndex : 1);
      return;
    }

    const destination = clamp(Math.round(drag.position), 0, NAV_TABS.length - 1);
    setNavPosition(destination);
    if (drag.moved) {
      suppressClickRef.current = true;
      openTab(NAV_TABS[destination], 'drag');
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  };

  const handleTabClick = (event, tab, index) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }
    setNavPosition(index);
    openTab(tab, 'tap');
  };

  const handleNavKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = activeIndex >= 0 ? activeIndex : 1;
    const destination = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? NAV_TABS.length - 1
        : clamp(current + (event.key === 'ArrowRight' ? 1 : -1), 0, NAV_TABS.length - 1);
    setNavPosition(destination);
    openTab(NAV_TABS[destination], 'keyboard');
    requestAnimationFrame(() => {
      navRef.current?.querySelector(`[data-guest-tab-index="${destination}"]`)?.focus();
    });
  };

  const visualActiveIndex = isDraggingNav
    ? clamp(Math.round(navPosition), 0, NAV_TABS.length - 1)
    : activeIndex;
  const lensVisible = activeIndex >= 0 || isDraggingNav;

  return (
    <div style={{ ...styles.wrapper, '--guest-nav-clearance': showNav ? '116px' : '0px' }}>
      <div style={{ ...styles.content, paddingBottom: showNav ? 110 : 0 }}>{children}</div>

      {showNav && (
        <nav
          ref={navRef}
          className={`guest-app-navigation guest-nav${isDraggingNav ? ' is-dragging' : ''}`}
          aria-label="Property navigation. Tap a tab or drag between tabs."
          onPointerDown={handleNavPointerDown}
          onPointerMove={handleNavPointerMove}
          onPointerUp={(event) => finishNavPointer(event)}
          onPointerCancel={(event) => finishNavPointer(event, true)}
          onKeyDown={handleNavKeyDown}
          style={{
            '--guest-nav-position': navPosition,
            '--guest-nav-translate': `${navPosition * 100}%`,
            '--guest-nav-shine-x': `${navShineX}px`,
            '--guest-nav-lens-opacity': lensVisible ? 1 : 0,
          }}
        >
          <span className="guest-nav__lens" aria-hidden="true" />
          {NAV_TABS.map((tab, index) => {
            const isActive = visualActiveIndex === index;
            const Icon = tab.icon;
            const isMessages = tab.key === 'messages';

            return (
              <button
                key={tab.key}
                type="button"
                data-guest-tab-index={index}
                onClick={(event) => handleTabClick(event, tab, index)}
                className={`guest-nav__tab${isActive ? ' is-active' : ''}`}
                aria-current={activeIndex === index ? 'page' : undefined}
              >
                <span className="guest-nav__icon">
                  <Icon
                    size={22}
                    color={isActive ? '#fff' : '#6B7D72'}
                    strokeWidth={isActive ? 2.3 : 1.9}
                  />
                  {isMessages && unreadCount > 0 && (
                    <span className="guest-nav__dot" />
                  )}
                </span>
                <span className="guest-nav__label">{tab.label}</span>
              </button>
            );
          })}
          <span className="guest-nav__drag-hint">Drag to switch</span>
        </nav>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    minHeight: '100vh',
  },
  content: {
    width: '100%',
    minHeight: '100vh',
  },
};
