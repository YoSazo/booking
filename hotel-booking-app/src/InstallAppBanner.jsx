import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isStandalone } from './pwaUtils.js';
import { BRAND, HotelIcon, IosInstallSheet, isIos } from './guestInstallUi.jsx';
import { trackGuestInstall } from './guestInstallTracking.js';
import BookingInstallCoach from './BookingInstallCoach.jsx';

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
  guidedBookingInstall = false,
}) {
  const navigate = useNavigate();
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [showBookingCoach, setShowBookingCoach] = useState(false);
  const [showOwnerPreviewInfo, setShowOwnerPreviewInfo] = useState(false);
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
    if (ownerPreview) return undefined;

    if (isStandalone()) {
      markInstalled();
      return undefined;
    }

    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'view',
    });

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
  if (installed || (!ownerPreview && isStandalone())) return null;

  const installPath = `/install?ref=${encodeURIComponent(touchpoint)}`;
  const handleInstall = async () => {
    if (ownerPreview) {
      setShowOwnerPreviewInfo(true);
      return;
    }

    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'cta_click',
    });

    if (ios) {
      if (guidedBookingInstall) setShowBookingCoach(true);
      else setShowIosSheet(true);
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
  const buttonLocked = ownerPreview;

  const continueOwnerTour = () => {
    setShowOwnerPreviewInfo(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'marketel:show-guest-app' }, '*');
    }
  };

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
              {guidedBookingInstall ? `Get the ${hotelName || 'property'} app` : `Add ${hotelName || 'us'} to your home screen`}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.35 }}>
              {ownerPreview
                ? 'Available when you activate Marketel.'
                : guidedBookingInstall
                  ? 'Keep us one tap away for future stays. No app store.'
                  : 'Book direct in one tap next time.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            aria-disabled={buttonLocked}
            style={{
              flexShrink: 0,
              padding: '10px 14px',
              borderRadius: 10,
              border: buttonLocked ? '1px solid #cfd7d2' : 'none',
              background: buttonLocked ? '#e4e8e5' : BRAND,
              color: buttonLocked ? '#7b8780' : 'white',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: 1,
            }}
          >
            {buttonLocked ? '🔒 Install' : 'Install'}
          </button>
        </div>
      </div>
      {showOwnerPreviewInfo && (
        <div
          role="presentation"
          onClick={() => setShowOwnerPreviewInfo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            background: 'rgba(18, 31, 24, 0.46)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-install-preview-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(390px, 100%)',
              padding: '24px 22px 20px',
              border: '1px solid #d8e4dc',
              borderRadius: 20,
              background: 'white',
              boxShadow: '0 28px 70px rgba(18, 49, 31, 0.24)',
              textAlign: 'center',
            }}
          >
            <HotelIcon
              hotelName={hotelName}
              appIconUrl={appIconUrl}
              size={58}
              style={{ margin: '0 auto 14px' }}
            />
            <h2
              id="owner-install-preview-title"
              style={{ margin: 0, color: '#1a2b22', fontSize: 21, lineHeight: 1.2 }}
            >
              Your guests get this button.
            </h2>
            <p style={{ margin: '11px 0 18px', color: '#66756c', fontSize: 14, lineHeight: 1.55 }}>
              Guests tap Install to add <strong>{hotelName || 'your property'}</strong> to their Home Screen and book direct again. It turns on when you activate Marketel.
            </p>
            <button
              type="button"
              onClick={continueOwnerTour}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 16px',
                border: 0,
                borderRadius: 12,
                background: BRAND,
                color: 'white',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              See how the guest app works →
            </button>
          </div>
        </div>
      )}
      {showIosSheet && (
        <IosInstallSheet
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          title={`Install ${hotelName || 'our app'}`}
          subtitle="Add it to your home screen — takes 3 seconds."
          onClose={() => setShowIosSheet(false)}
        />
      )}
      {showBookingCoach && (
        <BookingInstallCoach
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          onClose={() => setShowBookingCoach(false)}
        />
      )}
    </>
  );
}

export default InstallAppBanner;
