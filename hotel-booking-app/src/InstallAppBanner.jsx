import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isStandalone } from './pwaUtils.js';
import { BRAND, HotelIcon, IosInstallSheet, isIos } from './guestInstallUi.jsx';
import { trackGuestInstall } from './guestInstallTracking.js';

// "Tap to Install" — lets a guest add this property to their home screen so
// they book direct next time (no Safari, no OTA). Android/desktop use the
// native install prompt; iOS Safari gets a themed Add-to-Home-Screen sheet.
function InstallAppBanner({
  hotelName,
  appIconUrl,
  hotelId,
  ownerPreview = false,
  sticky = false,
  bottomOffset = 0,
  touchpoint = 'booking-page',
  apiBaseUrl = '',
}) {
  const navigate = useNavigate();
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const ios = isIos();

  const markInstalled = useCallback(() => {
    setInstalled(true);
    if (!ownerPreview) {
      trackGuestInstall(apiBaseUrl, hotelId, {
        touchpoint,
        eventType: 'installed',
      });
    }
  }, [apiBaseUrl, hotelId, ownerPreview, touchpoint]);

  useEffect(() => {
    if (isStandalone()) {
      markInstalled();
      return undefined;
    }

    if (!ownerPreview) {
      trackGuestInstall(apiBaseUrl, hotelId, {
        touchpoint,
        eventType: 'view',
      });
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      markInstalled();
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [apiBaseUrl, hotelId, markInstalled, ownerPreview, touchpoint]);

  // Hide entirely if already installed as a standalone PWA
  if (installed || isStandalone()) return null;

  const installPath = `/install?ref=${encodeURIComponent(touchpoint)}`;
  const handleInstall = async () => {
    if (ownerPreview) return;

    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'cta_click',
    });

    if (ios) {
      setShowIosSheet(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') markInstalled();
      setDeferredPrompt(null);
      return;
    }

    navigate(installPath);
  };

  const offset = Number.isFinite(Number(bottomOffset)) ? Number(bottomOffset) : 0;
  const shellStyle = sticky ? {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px))`,
    zIndex: 8500,
    padding: '0 14px',
    pointerEvents: 'none',
  } : {};
  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'white',
    border: '1px solid #d8e4dc',
    borderRadius: 16,
    padding: '12px 12px',
    boxShadow: sticky ? '0 10px 34px rgba(26,43,34,0.18)' : '0 4px 16px rgba(0,0,0,0.06)',
    margin: sticky ? '0 auto' : '20px 0 8px',
    maxWidth: sticky ? 520 : undefined,
    pointerEvents: 'auto',
  };
  const buttonDisabled = ownerPreview;

  return (
    <>
      <div
        id="guest-install"
        style={shellStyle}
      >
        <div style={cardStyle}>
          <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={44} style={{ boxShadow: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>
              Add {hotelName || 'us'} to your home screen
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.35 }}>
              {ownerPreview
                ? 'Install Front Desk first. Then guests can save this hotel.'
                : 'Book direct in one tap next time.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={buttonDisabled}
            style={{
              flexShrink: 0,
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: buttonDisabled ? '#c5d5cc' : BRAND,
              color: 'white',
              fontSize: 13,
              fontWeight: 800,
              cursor: buttonDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: buttonDisabled ? 0.72 : 1,
            }}
          >
            Install
          </button>
        </div>
      </div>
      {showIosSheet && (
        <IosInstallSheet
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          title={`Install ${hotelName || 'our app'}`}
          subtitle="Add it to your home screen — takes 3 seconds."
          onClose={() => setShowIosSheet(false)}
        />
      )}
    </>
  );
}

export default InstallAppBanner;
