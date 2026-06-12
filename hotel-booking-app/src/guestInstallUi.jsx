import React from 'react';

export const BRAND = '#2E7D5B';

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export function qrCodeUrl(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function HotelIcon({ hotelName, appIconUrl, size = 52 }) {
  const initial = (hotelName || 'H').trim().charAt(0).toUpperCase();
  if (appIconUrl) {
    return (
      <img
        src={appIconUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: size * 0.27, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.27, flexShrink: 0,
      background: BRAND, color: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800,
    }}>
      {initial}
    </div>
  );
}

export function IosInstallSteps({ hotelName, appIconUrl }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={44} />
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.45 }}>
          On iPhone, use <strong>Safari</strong> — then Share → <strong>Add to Home Screen</strong>
        </div>
      </div>
      {[
        ['1', <>Tap the <strong>Share</strong> button in Safari</>],
        ['2', <>Scroll and tap <strong>Add to Home Screen</strong> ➕</>],
        ['3', <>Tap <strong>Add</strong> — {hotelName || 'we'}'re on your home screen</>],
      ].map(([num, text]) => (
        <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: '#f0fdf4',
            color: BRAND, fontWeight: 800, fontSize: 13, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{num}</span>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.45, paddingTop: 3 }}>{text}</div>
        </div>
      ))}
    </div>
  );
}

export function IosInstallSheet({ hotelName, appIconUrl, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', width: '100%', maxWidth: 440,
          borderRadius: '20px 20px 0 0', padding: '24px 22px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
              Install {hotelName || 'our app'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Takes 5 seconds — message us anytime.
            </div>
          </div>
        </div>
        <IosInstallSteps hotelName={hotelName} appIconUrl={appIconUrl} />
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 22, padding: 14, borderRadius: 12,
            border: 'none', background: BRAND, color: 'white', fontSize: 15,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function InstallBenefits() {
  const items = [
    { emoji: '💬', text: 'Message the front desk — WiFi, early check-in, anything' },
    { emoji: '🔔', text: 'Get replies and hotel updates on your phone' },
    { emoji: '🏨', text: 'Book direct next time — no searching, no middleman' },
  ];
  return (
    <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <li key={item.text} style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          fontSize: 13, color: '#4b5563', lineHeight: 1.5, marginBottom: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
