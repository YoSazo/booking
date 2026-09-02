import React, { useEffect, useState } from 'react';
import { BRAND, HotelIcon, isAndroid, isIos } from './guestInstallUi.jsx';
import { trackGuestInstall } from './guestInstallTracking.js';
import GuestInstallQrOverlay from './GuestInstallQrOverlay.jsx';
import { guestelInvocationUrl } from './appClipInstall.js';

// The booking engine has one guest-app path: Guestel. iPhone taps invoke the
// App Clip; desktop taps reveal the exact same experience as a QR code.
function InstallAppBanner({
  hotelName,
  appIconUrl,
  hotelId,
  ownerPreview = false,
  sticky = false,
  flush = false,
  bottomOffset = 0,
  touchpoint = 'booking-page',
  apiBaseUrl = '',
  hotelSubscribed = true,
}) {
  const [showQr, setShowQr] = useState(false);
  const [showUnavailableInfo, setShowUnavailableInfo] = useState(false);
  const ios = isIos();
  const android = isAndroid();
  const inGuestelClip = typeof window !== 'undefined'
    && !!window.webkit?.messageHandlers?.guestelClip;

  useEffect(() => {
    if (ownerPreview || android) return;
    trackGuestInstall(apiBaseUrl, hotelId, { touchpoint, eventType: 'view' });
  }, [android, apiBaseUrl, hotelId, ownerPreview, touchpoint]);

  // Guestel is currently an Apple experience. Do not replace it with a second,
  // browser-specific install system on Android.
  if (android && !ownerPreview) return null;

  const handleOpenGuestel = () => {
    if (hotelSubscribed !== true) {
      setShowUnavailableInfo(true);
      return;
    }
    if (!ownerPreview) {
      trackGuestInstall(apiBaseUrl, hotelId, { touchpoint, eventType: 'cta_click' });
    }
    if (inGuestelClip) {
      window.webkit.messageHandlers.guestelClip.postMessage({ type: 'requestInstall' });
      return;
    }
    if (ios) {
      window.location.assign(guestelInvocationUrl({ hotelId, intent: 'add' }));
      return;
    }
    setShowQr(true);
  };

  const offset = Number.isFinite(Number(bottomOffset)) ? Number(bottomOffset) : 0;
  const shellStyle = sticky ? {
    position: 'fixed', left: 0, right: 0,
    bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px))`,
    zIndex: 8500, padding: '0 14px', pointerEvents: 'none',
  } : {};
  const locked = hotelSubscribed !== true;
  const lockedCopy = ownerPreview
    ? 'Included with Marketel: direct rebooking, stays, and guest messages.'
    : 'Guestel connects when this Marketel property is activated.';

  return (
    <>
      <div id="guest-install" style={shellStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, background: 'white',
          border: '1px solid #d8e4dc', borderRadius: 16, padding: 12,
          boxShadow: sticky ? '0 10px 34px rgba(26,43,34,0.18)' : '0 4px 16px rgba(0,0,0,0.06)',
          margin: sticky ? '0 auto' : flush ? 0 : '20px 0 8px',
          maxWidth: sticky ? 520 : undefined, pointerEvents: 'auto',
        }}>
          <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={44} style={{ boxShadow: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>
              Keep {hotelName || 'this property'} in Guestel
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.35 }}>
              {locked ? lockedCopy : 'Book direct, keep your stay, and message the Front Desk.'}
            </div>
          </div>
          <button type="button" onClick={handleOpenGuestel} aria-disabled={locked} style={{
            flexShrink: 0, padding: '10px 14px', borderRadius: 10,
            border: locked ? '1px solid #b9d3c4' : 'none',
            background: locked ? '#edf7f1' : BRAND,
            color: locked ? '#276648' : 'white', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {locked ? (ownerPreview ? 'Preview' : 'Not live') : ios || inGuestelClip ? 'Add' : 'Show QR'}
          </button>
        </div>
      </div>

      {showQr && (
        <GuestInstallQrOverlay hotelName={hotelName} hotelId={hotelId} intent="book" ref={touchpoint} onClose={() => setShowQr(false)} />
      )}

      {showUnavailableInfo && (
        <div role="presentation" onClick={() => setShowUnavailableInfo(false)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
          padding: 20, background: 'rgba(18,31,24,.46)', backdropFilter: 'blur(6px)',
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="owner-install-preview-title"
            onClick={(event) => event.stopPropagation()} style={{
              width: 'min(390px,100%)', padding: '24px 22px 20px', border: '1px solid #d8e4dc',
              borderRadius: 20, background: 'white', boxShadow: '0 28px 70px rgba(18,49,31,.24)', textAlign: 'center',
            }}>
            <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={58} style={{ margin: '0 auto 14px' }} />
            <h2 id="owner-install-preview-title" style={{ margin: 0, color: '#1a2b22', fontSize: 21, lineHeight: 1.2 }}>
              Guestel is included when you activate Marketel.
            </h2>
            <p style={{ margin: '11px 0 18px', color: '#66756c', fontSize: 14, lineHeight: 1.55 }}>
              This button will open your property through Apple&apos;s Guestel App Clip. Guests can book direct, keep the property, and message your Front Desk.
            </p>
            <button type="button" onClick={() => setShowUnavailableInfo(false)} style={{
              width: '100%', minHeight: 48, padding: '12px 16px', border: 0, borderRadius: 12,
              background: BRAND, color: 'white', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallAppBanner;
