import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarSearch, MessageCircle } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';

const NAV_TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/guest/home' },
  { key: 'book', label: 'Book', icon: CalendarSearch, path: '/' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, path: '/guest/messages' },
];

export default function GuestLayout({ children }) {
  const { isGuest, guestStay, apiBaseUrl, hotelId } = useGuest();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : true
  );

  // Track viewport width — hide nav on desktop
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Poll for unread messages every 30s
  const fetchUnread = useCallback(async () => {
    if (!guestStay?.code || !hotelId) return;
    try {
      const params = new URLSearchParams({
        hotelId,
        code: guestStay.code,
        email: guestStay.email || '',
      });
      const res = await fetch(`${apiBaseUrl}/api/guest-messages?${params}`);
      const data = await res.json();
      if (data.success) {
        const unread = data.messages.filter(
          (m) => m.sender === 'hotel' && !m.readAt
        ).length;
        setUnreadCount(unread);
      }
    } catch (e) { /* ignore */ }
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  useEffect(() => {
    if (!isGuest) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isGuest, fetchUnread]);

  // If not a guest, just pass children through
  if (!isGuest) return <>{children}</>;

  const showNav = isMobile;

  // Determine active tab
  const activeTab = NAV_TABS.find((t) => {
    if (t.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(t.path);
  })?.key || 'home';

  return (
    <div style={styles.wrapper}>
      <div style={styles.content}>{children}</div>

      {showNav && (
        <nav style={styles.pill}>
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            const isMessages = tab.key === 'messages';

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.path)}
                style={{
                  ...styles.tabButton,
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Icon wrapper */}
                <div
                  style={{
                    ...styles.iconWrapper,
                    background: isActive ? '#111' : 'transparent',
                  }}
                >
                  <Icon
                    size={22}
                    color={isActive ? '#fff' : '#64748b'}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {/* Unread dot for messages */}
                  {isMessages && unreadCount > 0 && (
                    <span style={styles.unreadDot} />
                  )}
                </div>
                {/* Label */}
                <span
                  style={{
                    ...styles.tabLabel,
                    color: isActive ? '#1a1a2e' : '#64748b',
                  }}
                >
                  {tab.label}
                </span>
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
    paddingBottom: 110,
  },
  pill: {
    position: 'fixed',
    bottom: 'max(24px, env(safe-area-inset-bottom))',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 999,
    border: '1.5px solid rgba(0,0,0,0.06)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    padding: '8px 6px',
    display: 'flex',
    justifyContent: 'space-around',
    gap: 2,
    zIndex: 9999,
    minWidth: 260,
    maxWidth: 340,
    width: '88%',
  },
  tabButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 14px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    transition: 'transform 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background 0.2s ease',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    transition: 'color 0.2s ease',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#e0245e',
    border: '2px solid #fff',
    boxSizing: 'content-box',
  },
};
