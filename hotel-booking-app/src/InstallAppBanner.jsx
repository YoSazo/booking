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
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `installDismissed_${hotelId || 'default'}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') setDismissed(true);
    } catch (e) { /* ignore */ }

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
  }, [storageKey]);

  const ios = isIos();

  // Don't show if already installed/running standalone, dismissed, or if there's
  // no way to install (non-iOS browser that never fired beforeinstallprompt).
  // Owner preview from Front Desk always shows the banner so they can see guest UI.
  if (!ownerPreview) {
    if (installed || isStandalone() || dismissed) return null;
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

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, '1'); } catch (e) { /* ignore */ }
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
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        margin: '20px 0 8px',
      }}>
        {iconTile}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>
            Add {hotelName || 'us'} to your home screen
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
            Book direct in one tap next time — no fees, no app store.
          </div>
        </div>
        <button
          onClick={handleInstall}
          style={{
            flexShrink: 0, padding: '10px 16px', borderRadius: 10, border: 'none',
            background: BRAND, color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
        {!ownerPreview && (
        <button
          onClick={handleDismiss}
          style={{
            flexShrink: 0, border: 'none', background: 'transparent', color: '#9ca3af',
            fontSize: 12, fontWeight: 600, lineHeight: 1, cursor: 'pointer',
            fontFamily: 'inherit', padding: '4px 2px', whiteSpace: 'nowrap',
          }}
        >
          Maybe later
        </button>
        )}
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
