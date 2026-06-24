import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { isStandalone } from './pwaUtils.js';
import { BRAND, isIos, HotelIcon, IosInstallSheet } from './guestInstallUi.jsx';
import { trackGuestInstall } from './guestInstallTracking.js';

function GuestInstallCard({
  hotelName,
  appIconUrl,
  hotelId,
  reservationCode,
  apiBaseUrl = '',
  touchpoint = 'card',
  variant = 'card',
  headline,
  subline,
}) {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `installDismissed_${hotelId || 'default'}`;
  const ios = isIos();
  const isHero = variant === 'hero';
  const effectiveCode = reservationCode || undefined;

  const markInstalled = useCallback(() => {
    setInstalled(true);
    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'installed',
      reservationCode: effectiveCode,
    });
  }, [apiBaseUrl, hotelId, touchpoint, effectiveCode]);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') setDismissed(true);
    } catch (e) { /* ignore */ }

    if (isStandalone()) {
      markInstalled();
      return undefined;
    }

    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'view',
      reservationCode: effectiveCode,
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
  }, [storageKey, apiBaseUrl, hotelId, touchpoint, effectiveCode, markInstalled]);

  if (installed || isStandalone() || dismissed) return null;

  const installPath = effectiveCode
    ? `/install?code=${encodeURIComponent(effectiveCode)}&ref=${encodeURIComponent(touchpoint)}`
    : `/install?ref=${encodeURIComponent(touchpoint)}`;

  const trackCta = () => {
    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'cta_click',
      reservationCode: effectiveCode,
    });
  };

  const handlePrimary = async () => {
    trackCta();
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

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, '1'); } catch (e) { /* ignore */ }
  };

  const title = headline || `Add ${hotelName || 'us'} to your home screen`;
  const subtitle = subline || 'Get check-in updates and message the front desk — lives on your home screen. No App Store.';

  const iosSheet = showIosSheet && (
    <IosInstallSheet
      hotelName={hotelName}
      appIconUrl={appIconUrl}
      title={`Install ${hotelName || 'our app'}`}
      subtitle="Add it to your home screen — takes 3 seconds."
      onClose={() => setShowIosSheet(false)}
    />
  );

  if (isHero) {
    return (
      <>
        <div style={{
          background: 'linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%)',
          borderRadius: 16, padding: '20px 18px', margin: '0 0 20px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.75, marginBottom: 4 }}>
                No App Store · about 3 seconds
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>{subtitle}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrimary}
            style={{
              width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none',
              background: 'white', color: '#1a5c3f', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Smartphone size={18} /> Add to Home Screen
          </button>
          {!ios && !deferredPrompt && (
            <button
              type="button"
              onClick={() => { trackCta(); navigate(installPath); }}
              style={{
                width: '100%', marginTop: 8, padding: 10, borderRadius: 10, border: 'none',
                background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              See step-by-step instructions →
            </button>
          )}
        </div>
        {iosSheet}
      </>
    );
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 16,
        padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        margin: '20px 0 8px',
      }}>
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={handlePrimary}
          style={{
            flexShrink: 0, padding: '10px 14px', borderRadius: 10, border: 'none',
            background: BRAND, color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
        <button
          type="button"
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
      {iosSheet}
    </>
  );
}

export default GuestInstallCard;
