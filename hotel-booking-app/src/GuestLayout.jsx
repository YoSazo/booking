import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarSearch, MessageCircle } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import useVisualKeyboard from './useVisualKeyboard.js';

const NAV_TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/guest/home' },
  { key: 'book', label: 'Book', icon: CalendarSearch, path: '/' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, path: '/guest/messages' },
];

// Liquid-glass bottom nav — a frosted, floating pill that matches the Front Desk
// visual language (sage palette, DM Sans, green active lens). Injected once so we
// can use ::before sheen + focus/active pseudo-states that inline styles can't do.
const NAV_STYLES = `
.guest-nav {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 2px;
  padding: 7px 8px;
  width: min(340px, 84%);
  border-radius: 999px;
  z-index: 10050;
  isolation: isolate;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background: rgba(255,255,255,0.5);
  -webkit-backdrop-filter: blur(28px) saturate(185%);
  backdrop-filter: blur(28px) saturate(185%);
  border: 1px solid rgba(255,255,255,0.65);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.9),
    inset 0 -1px 2px rgba(255,255,255,0.35),
    0 10px 30px rgba(26,43,34,0.18),
    0 3px 10px rgba(46,125,91,0.12);
}
.guest-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.06) 46%, rgba(255,255,255,0) 100%);
  pointer-events: none;
  z-index: -1;
}
.guest-nav__tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
}
.guest-nav__tab.is-active { transform: translateY(-3px); }
.guest-nav__icon {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.28s ease, box-shadow 0.28s ease, transform 0.15s ease;
}
.guest-nav__tab.is-active .guest-nav__icon {
  background: linear-gradient(145deg, #4CAF7D 0%, #2E7D5B 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 6px 16px rgba(46,125,91,0.42);
}
.guest-nav__tab:active .guest-nav__icon { transform: scale(0.9); }
.guest-nav__label {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  color: #6B7D72;
  transition: color 0.28s ease;
}
.guest-nav__tab.is-active .guest-nav__label { color: #2E7D5B; }
.guest-nav__dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #E05252;
  border: 2px solid rgba(255,255,255,0.95);
  box-sizing: content-box;
}
@media (prefers-reduced-motion: reduce) {
  .guest-nav__tab, .guest-nav__icon { transition: none; }
}
`;

if (typeof document !== 'undefined') {
  const id = 'guest-nav-style';
  if (!document.getElementById(id)) {
    const styleEl = document.createElement('style');
    styleEl.id = id;
    styleEl.textContent = NAV_STYLES;
    document.head.appendChild(styleEl);
  }
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

  const activeTab = (() => {
    if (location.pathname.startsWith('/guest/messages')) return 'messages';
    if (location.pathname === '/') return 'book';
    if (
      location.pathname === '/guest-info'
      || location.pathname === '/confirmation'
      || location.pathname === '/final-confirmation'
    ) {
      return null;
    }
    if (
      location.pathname.startsWith('/guest/') ||
      location.pathname.startsWith('/booking')
    ) {
      return 'home';
    }
    return 'book';
  })();

  return (
    <div style={{ ...styles.wrapper, '--guest-nav-clearance': showNav ? '116px' : '0px' }}>
      <div style={{ ...styles.content, paddingBottom: showNav ? 110 : 0 }}>{children}</div>

      {showNav && (
        <nav className="guest-app-navigation guest-nav" aria-label="Property navigation">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            const isMessages = tab.key === 'messages';
            const openTab = () => {
              document.body.style.overflow = '';
              document.body.style.position = '';
              document.body.style.top = '';
              document.body.style.width = '';
              syncGuestStay();
              window.dispatchEvent(new CustomEvent('marketel:guest-refresh', {
                detail: { source: 'navigation', tab: tab.key },
              }));
              navigate(tab.path);
            };

            return (
              <button
                key={tab.key}
                type="button"
                onClick={openTab}
                className={`guest-nav__tab${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
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
