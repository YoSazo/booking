import React from 'react';
import { Home, CalendarSearch, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGuest } from './GuestProvider.jsx';

export default function GuestLayout({ children, hotelName }) {
  const { isGuest, isLoading } = useGuest();
  const location = useLocation();
  const navigate = useNavigate();

  // If not a guest (and not loading), we shouldn't really be in the guest layout,
  // but just in case, we can just render the children without the shell.
  if (!isGuest && !isLoading) {
    return <>{children}</>;
  }

  // Front Desk CSS Variables injected at the top level
  const guestThemeVars = {
    '--green': '#2E7D5B',
    '--green-light': '#4CAF7D',
    '--green-pale': '#E8F5EE',
    '--bg': '#EEF2EF',
    '--text': '#1A2B22',
    '--text-muted': '#6B7D72',
    '--border': '#D8E4DC',
    backgroundColor: 'var(--bg)',
    minHeight: '100vh',
    fontFamily: '"DM Sans", sans-serif',
    paddingBottom: '80px', // Space for bottom nav
  };

  const navItems = [
    { label: 'My Stay', path: '/guest/dashboard', icon: Home },
    { label: 'Book', path: '/guest/book', icon: CalendarSearch },
    { label: 'Profile', path: '/guest/profile', icon: User },
  ];

  return (
    <div style={guestThemeVars} className="guest-layout-wrapper">
      {/* Optional: A simple top header like the Front Desk */}
      <div style={{
        background: '#fff',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 8px rgba(46,125,91,0.05)'
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          {hotelName || 'Guest Portal'}
        </h1>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px', maxWidth: '860px', margin: '0 auto' }}>
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 12px rgba(46,125,91,0.05)',
        zIndex: 100
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/guest/dashboard' && location.pathname.startsWith('/booking/'));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: isActive ? 'var(--green)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                width: '33%',
                padding: '4px'
              }}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
