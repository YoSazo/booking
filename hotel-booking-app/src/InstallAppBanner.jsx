import React, { useState } from 'react';
import { isStandalone } from './pwaUtils.js';
import { BRAND } from './guestInstallUi.jsx';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac with touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// "Tap to Install" — lets a guest add this property to their home screen so
// they book direct next time (no Safari, no OTA). Android/desktop use the
// native install prompt; iOS Safari gets a themed Add-to-Home-Screen sheet.
function InstallAppBanner({ hotelName, appIconUrl, hotelId, ownerPreview = false }) {
  // Install is gated behind Front Desk — the banner is visible so owners see
  // what guests will see, but the button is always disabled.
  const [installed, setInstalled] = useState(false);

  const iconTile = appIconUrl ? (
    <img src={appIconUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      background: BRAND, color: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 22, fontWeight: 800,
    }}>{(hotelName || 'B').trim().charAt(0).toUpperCase()}</div>
  );

  // Hide entirely if already installed as a standalone PWA
  if (installed || isStandalone()) return null;

  return (
    <>
      <div
        id="guest-install"
        style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        margin: '20px 0 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {iconTile}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>
              Add {hotelName || 'us'} to your home screen
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
              Book direct in one tap next time — no fees, no app store.
            </div>
          </div>
        </div>
        <button
          disabled
          style={{
            width: '100%', marginTop: 14, padding: '12px 16px', borderRadius: 10,
            border: 'none', background: '#c5d5cc', color: 'white', fontSize: 14,
            fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.7,
          }}
        >
          Install
        </button>
      </div>
    </>
  );
}

export default InstallAppBanner;
