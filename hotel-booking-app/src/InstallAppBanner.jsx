import React, { useState, useEffect } from 'react';

const BRAND = '#2E7D5B';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac with touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

// "Tap to Install" — lets a guest add this property to their home screen so
// they book direct next time (no Safari, no OTA). Android/desktop use the
// native install prompt; iOS Safari gets a themed Add-to-Home-Screen sheet.
function InstallAppBanner({ hotelName, appIconUrl, hotelId }) {
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
  if (typeof window !== 'undefined' && window.innerWidth > 768) return null;
  if (installed || isStandalone() || dismissed) return null;
  if (!ios && !deferredPrompt) return null;

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
      <div style={{
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
            Book direct in one tap — no searching, no fees.
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
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: 'none',
            background: 'transparent', color: '#9ca3af', fontSize: 18, lineHeight: 1,
            cursor: 'pointer', fontFamily: 'inherit', padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {showIosSheet && (
        <div
          onClick={() => setShowIosSheet(false)}
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
              animation: 'installSheetUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              {iconTile}
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
                  Install {hotelName || 'our app'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Takes 5 seconds — book direct anytime.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#f0fdf4',
                  color: BRAND, fontWeight: 800, fontSize: 13, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>1</span>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.4 }}>
                  Tap the <strong>Share</strong> button
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, margin: '0 4px', verticalAlign: 'middle',
                    color: '#007aff',
                  }}>
                    <svg width="16" height="18" viewBox="0 0 16 20" fill="none">
                      <path d="M8 1L8 13" stroke="#007aff" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M4.5 4.5L8 1L11.5 4.5" stroke="#007aff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 8H2.5C1.67 8 1 8.67 1 9.5V17C1 17.83 1.67 18.5 2.5 18.5H13.5C14.33 18.5 15 17.83 15 17V9.5C15 8.67 14.33 8 13.5 8H13" stroke="#007aff" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  in your browser bar
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#f0fdf4',
                  color: BRAND, fontWeight: 800, fontSize: 13, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>2</span>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.4 }}>
                  Scroll down and tap <strong>Add to Home Screen</strong>
                  <span style={{ marginLeft: 4 }}>➕</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#f0fdf4',
                  color: BRAND, fontWeight: 800, fontSize: 13, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>3</span>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.4 }}>
                  Tap <strong>Add</strong> — done! We're on your home screen.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosSheet(false)}
              style={{
                width: '100%', marginTop: 22, padding: '14px', borderRadius: 12,
                border: 'none', background: BRAND, color: 'white', fontSize: 15,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes installSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>
  );
}

export default InstallAppBanner;
