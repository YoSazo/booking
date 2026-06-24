import React, { useState, useEffect } from 'react';
import { isStandalone } from './pwaUtils.js';
import { BRAND, IosInstallSheet } from './guestInstallUi.jsx';

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ios = isIos();

  // Don't show if already installed/running standalone, or if there's no way to
  // install (non-iOS browser that never fired beforeinstallprompt). The banner is
  // not dismissible — it stays as a passive Install affordance.
  // Owner preview from Front Desk always shows the banner so they can see guest UI.
  if (!ownerPreview) {
    if (installed || isStandalone()) return null;
    if (!ios && !deferredPrompt) return null;
  }

  const handleInstall = async () => {
    if (ios) {
      setShowIosSheet(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const iconTile = appIconUrl ? (
    <img src={appIconUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      background: BRAND, color: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 22, fontWeight: 800,
    }}>{(hotelName || 'B').trim().charAt(0).toUpperCase()}</div>
  );

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
          onClick={handleInstall}
          style={{
            width: '100%', marginTop: 14, padding: '12px 16px', borderRadius: 10,
            border: 'none', background: BRAND, color: 'white', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Install
        </button>
      </div>

      {showIosSheet && (
        <IosInstallSheet
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          title={`Install ${hotelName || 'our app'}`}
          subtitle="Takes about 3 seconds — book direct anytime."
          onClose={() => setShowIosSheet(false)}
        />
      )}
    </>
  );
}

export default InstallAppBanner;
