import React, { useEffect } from 'react';
import { guestelQrInvocationUrl } from './appClipInstall.js';
import GuestelQrCode from './GuestelQrCode.jsx';

function GuestInstallQrOverlay({
  hotelName,
  hotelId,
  intent = 'book',
  handoffToken,
  ref = 'booking-engine-qr',
  onClose,
}) {
  const guestelUrl = guestelQrInvocationUrl({ hotelId, intent, handoffToken, ref });

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
        <div className="guest-install-qr-overlay__eyebrow">Guestel</div>
        <h2 id="guest-install-qr-title">Open {hotelName || 'this property'} in Guestel</h2>
        <p>Scan with an iPhone to open this property instantly and book direct.</p>
        <GuestelQrCode
          value={guestelUrl}
          size={280}
          alt={`Guestel QR code for ${hotelName || 'this property'}`}
        />
        <p className="guest-install-qr-overlay__hint">No code or property search—this QR opens the right place.</p>
      </div>
    </div>
  );
}

export default GuestInstallQrOverlay;
