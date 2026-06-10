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
    position: 'relative'
  };

  const navItems = [
    { label: 'My Stay', path: '/guest/dashboard', icon: Home },
    { label: 'Book', path: '/guest/book', icon: CalendarSearch },
  ];

  return (
    <div style={guestThemeVars} className="guest-layout-wrapper">
      {/* Main Content Area (Full screen, no constraints) */}
      <div style={{ width: '100%', minHeight: '100vh', paddingBottom: '100px' }}>
        {children}
      </div>

      {/* Floating Bottom Navigation Pill */}
      <div style={{
        position: 'fixed',
        bottom: 'max(24px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.4)',
        display: 'flex',
        justifyContent: 'center',
        padding: '6px 6px',
        borderRadius: '100px',
        boxShadow: '0 8px 32px rgba(46,125,91,0.15)',
        zIndex: 100,
        gap: '4px'
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/guest/dashboard' && location.pathname.startsWith('/booking/'));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: isActive ? 'var(--green)' : 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '10px 20px',
                borderRadius: '100px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
