import React, { useEffect } from 'react';
import { qrCodeUrl } from './guestInstallUi.jsx';

function bookingPageScanUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set('ref', 'desktop-qr');
  url.searchParams.delete('scroll');
  url.searchParams.delete('install-preview');
  return url.toString();
}

function GuestInstallQrOverlay({ hotelName, onClose }) {
  const scanUrl = bookingPageScanUrl();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="guest-install-qr-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-install-qr-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <button type="button" className="guest-install-qr-overlay__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="guest-install-qr-overlay__card">
        <div className="guest-install-qr-overlay__eyebrow">Scan with your phone</div>
        <h2 id="guest-install-qr-title">Save {hotelName || 'this property'} to your Home Screen</h2>
        <p>This QR opens this booking page on your phone. Tap Add — no App Store.</p>
        <img src={qrCodeUrl(scanUrl, 280)} alt="QR code to open this booking page on your phone" width="280" height="280" />
        <p className="guest-install-qr-overlay__hint">Opens in Safari or Chrome on your phone.</p>
      </div>
    </div>
  );
}

export default GuestInstallQrOverlay;
