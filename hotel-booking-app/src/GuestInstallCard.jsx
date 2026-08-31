import React, { useEffect, useState } from 'react';
import { QrCode, Smartphone } from 'lucide-react';
import { BRAND, isAndroid, isIos, HotelIcon } from './guestInstallUi.jsx';
import { trackGuestInstall } from './guestInstallTracking.js';
import GuestInstallQrOverlay from './GuestInstallQrOverlay.jsx';
import { guestelInvocationUrl } from './appClipInstall.js';

function GuestInstallCard({
  hotelName,
  appIconUrl,
  walletImageUrl,
  walletSubtitle,
  hotelId,
  reservationCode,
  handoffToken,
  reservationAccessToken,
  apiBaseUrl = '',
  touchpoint = 'card',
  variant = 'card',
  headline,
  subline,
}) {
  const [showQr, setShowQr] = useState(false);
  const [qrHandoff, setQrHandoff] = useState(handoffToken || '');
  const ios = isIos();
  const android = isAndroid();
  const inGuestelClip = typeof window !== 'undefined'
    && !!window.webkit?.messageHandlers?.guestelClip;
  const isHero = variant === 'hero';
  const isConfirmation = variant === 'confirmation';
  const effectiveCode = reservationCode || undefined;

  useEffect(() => {
    if (android) return;
    trackGuestInstall(apiBaseUrl, hotelId, {
      touchpoint,
      eventType: 'view',
      reservationCode: effectiveCode,
    });
  }, [android, apiBaseUrl, effectiveCode, hotelId, touchpoint]);

  if (android) return null;

  const trackCta = () => trackGuestInstall(apiBaseUrl, hotelId, {
    touchpoint,
    eventType: 'cta_click',
    reservationCode: effectiveCode,
  });

  const freshHandoff = async () => {
    if (!isConfirmation || !reservationAccessToken) return handoffToken;
    try {
      const response = await fetch(`${apiBaseUrl}/api/guest/native/handoff/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reservationAccessToken}` },
        body: '{}',
      });
      const data = await response.json().catch(() => ({}));
      return response.ok && data.handoffToken ? data.handoffToken : handoffToken;
    } catch (_) {
      return handoffToken;
    }
  };

  const handlePrimary = async () => {
    trackCta();
    const effectiveHandoff = await freshHandoff();
    if (inGuestelClip) {
      if (effectiveHandoff) {
        window.webkit.messageHandlers.guestelClip.postMessage({ type: 'handoff', token: effectiveHandoff });
      }
      window.webkit.messageHandlers.guestelClip.postMessage({ type: 'requestInstall' });
      return;
    }
    if (ios) {
      window.location.assign(guestelInvocationUrl({
        hotelId,
        intent: isConfirmation ? 'stay' : 'add',
        handoffToken: isConfirmation ? effectiveHandoff : undefined,
      }));
      return;
    }
    setQrHandoff(effectiveHandoff || '');
    setShowQr(true);
  };

  const title = headline || (isConfirmation
    ? `Keep your ${hotelName || 'property'} stay in Guestel`
    : `Keep ${hotelName || 'this property'} in Guestel`);
  const subtitle = subline || (isConfirmation
    ? 'See stay updates, message the Front Desk, and book direct again without searching.'
    : 'Book direct, message the Front Desk, and return anytime without searching again.');
  const primaryLabel = isConfirmation ? 'Keep this stay in Guestel' : 'Open in Guestel';
  const ButtonIcon = ios || inGuestelClip ? Smartphone : QrCode;

  const overlay = showQr && (
    <GuestInstallQrOverlay
      hotelName={hotelName}
      hotelId={hotelId}
      intent={isConfirmation ? 'stay' : 'book'}
      handoffToken={isConfirmation ? qrHandoff : undefined}
      ref={touchpoint}
      onClose={() => setShowQr(false)}
    />
  );

  if (isHero) {
    return (
      <>
        <div style={{ background: 'linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%)', borderRadius: 16, padding: '20px 18px', margin: '0 0 20px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', opacity: .75, marginBottom: 4 }}>One guest app · every direct stay</div>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, opacity: .88, lineHeight: 1.5 }}>{subtitle}</div>
            </div>
          </div>
          <button type="button" onClick={handlePrimary} style={{
            width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none',
            background: 'white', color: '#1a5c3f', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}><ButtonIcon size={18} /> {ios || inGuestelClip ? primaryLabel : 'Show Guestel QR'}</button>
        </div>
        {overlay}
      </>
    );
  }

  if (isConfirmation) {
    const walletInitial = (hotelName || 'P').trim().charAt(0).toUpperCase();
    return (
      <>
        <section className="guest-install-confirmation-card">
          <div className="guest-install-confirmation-card__eyebrow"><Smartphone size={14} aria-hidden="true" /> Guestel</div>
          <div className="guest-install-confirmation-card__copy">
            <div className="guest-install-confirmation-card__title">{title}</div>
            <div className="guest-install-confirmation-card__subtitle">{subtitle}</div>
          </div>
          <div className="guest-install-confirmation-wallet" aria-label={`${hotelName || 'Your property'} card in Guestel`}>
            <div className={`guest-install-confirmation-wallet__cover${walletImageUrl ? ' has-image' : ''}`}>
              <span>{walletInitial}</span>{walletImageUrl && <img src={walletImageUrl} alt="" />}
            </div>
            <div className="guest-install-confirmation-wallet__shade" aria-hidden="true" />
            <div className="guest-install-confirmation-wallet__copy"><strong>{hotelName || 'Your property'}</strong><span>{walletSubtitle || 'Direct booking'}</span></div>
          </div>
          <button type="button" onClick={handlePrimary} className="guest-install-confirmation-card__button">
            <ButtonIcon size={17} /> {ios || inGuestelClip ? primaryLabel : 'Show Guestel QR'}
          </button>
        </section>
        {overlay}
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,.06)', margin: '20px 0 8px' }}>
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        <button type="button" onClick={handlePrimary} style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 10, border: 'none', background: BRAND, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {ios || inGuestelClip ? 'Open' : 'QR'}
        </button>
      </div>
      {overlay}
    </>
  );
}

export default GuestInstallCard;
