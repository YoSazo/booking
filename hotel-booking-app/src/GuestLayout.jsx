import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import './GuestLayout.css';

const NAV_TABS = [
  { key: 'stay', label: 'Your Stay', path: '/guest/home' },
  { key: 'book', label: 'Book', path: '/' },
];

function activeTabForPath(pathname) {
  if (pathname === '/') return 'book';
  if (
    pathname.startsWith('/guest/')
    || pathname.startsWith('/booking')
  ) return 'stay';
  return 'book';
}

function isFocusedFlow(pathname) {
  return pathname === '/install'
    || pathname === '/guest-info'
    || pathname === '/confirmation'
    || pathname === '/final-confirmation'
    || pathname.startsWith('/guest/messages');
}

export default function GuestLayout({ children }) {
  const { isGuest, guestStay, syncGuestStay, apiBaseUrl, hotelId } = useGuest();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : true
  );
  const [installedApp, setInstalledApp] = useState(() => isStandalone());

  const activeTab = activeTabForPath(location.pathname);
  const activeIndex = NAV_TABS.findIndex((tab) => tab.key === activeTab);

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
          (message) => message.sender === 'hotel' && !message.guestReadAt
        ).length;
        setUnreadCount(unread);
        if (installedApp && 'setAppBadge' in navigator && unread > 0) {
          navigator.setAppBadge(unread).catch(() => {});
        } else if (installedApp && 'clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch(() => {});
        }
      }
    } catch (error) { /* quiet badge refresh */ }
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl, installedApp]);

  useEffect(() => {
    // The conversation owns refresh while open. Everywhere else this powers
    // the small unread marker on Your Stay.
    if (!installedApp || !isGuest || location.pathname.startsWith('/guest/messages')) return;
    fetchUnread();
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') fetchUnread();
    };
    const interval = window.setInterval(refreshWhenVisible, 15000);
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
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      window.removeEventListener('marketel:guest-refresh', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('marketel:guest-messages-read', clearUnread);
    };
  }, [installedApp, isGuest, fetchUnread, location.pathname]);

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

  const showTabs = installedApp && isMobile && !isFocusedFlow(location.pathname);

  const openTab = useCallback((tab) => {
    if (!tab || tab.key === activeTab) return;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    syncGuestStay();
    window.dispatchEvent(new CustomEvent('marketel:guest-refresh', {
      detail: { source: 'top-navigation', tab: tab.key },
    }));
    navigate(tab.path);
  }, [activeTab, navigate, syncGuestStay]);

  return (
    <div
      style={{
        ...styles.wrapper,
        '--guest-nav-clearance': '0px',
        '--guest-top-tabs-height': showTabs
          ? 'calc(63px + env(safe-area-inset-top, 0px))'
          : '0px',
      }}
    >
      {showTabs && (
        <div className="guest-top-tabs-shell">
          <nav className="guest-top-tabs" aria-label="Guest app navigation" role="tablist">
            <span
              className="guest-top-tabs__slider"
              aria-hidden="true"
              style={{
                opacity: activeIndex >= 0 ? 1 : 0,
                transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
              }}
            />
            {NAV_TABS.map((tab, index) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                className={`guest-top-tabs__tab${activeIndex === index ? ' is-active' : ''}`}
                onClick={() => openTab(tab)}
              >
                <span>{tab.label}</span>
                {tab.key === 'stay' && unreadCount > 0 && (
                  <span className="guest-top-tabs__badge" aria-label={`${unreadCount} unread messages`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    minHeight: '100dvh',
    background: '#EFF4F0',
  },
  content: {
    width: '100%',
    minHeight: 'calc(100dvh - var(--guest-top-tabs-height, 0px))',
    boxSizing: 'border-box',
  },
};
