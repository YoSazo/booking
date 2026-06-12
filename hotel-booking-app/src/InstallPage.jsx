import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Smartphone, CheckCircle2 } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import {
  BRAND, isIos, isAndroid, qrCodeUrl,
  HotelIcon, IosInstallSteps, IosInstallSheet, InstallBenefits,
} from './guestInstallUi.jsx';

function InstallPage({ hotel, apiBaseUrl = '', hotelId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setGuestStay, guestStay } = useGuest();
  const resolvedHotelId = hotelId || hotel?.id;
  const code = searchParams.get('code') || '';
  const ref = searchParams.get('ref') || 'direct';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [lookupDone, setLookupDone] = useState(!code);

  const hotelName = hotel?.name || 'Your Hotel';
  const appIconUrl = hotel?.appIconUrl || '';
  const installPageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

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

  // Link reservation when opened from email / QR with ?code=
  useEffect(() => {
    if (!code || !resolvedHotelId || !apiBaseUrl || guestStay?.code === code) {
      setLookupDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ hotelId: resolvedHotelId, code });
        const res = await fetch(`${apiBaseUrl}/api/booking/lookup?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.success && data.booking) {
          const b = data.booking;
          setGuestStay({
            code: b.reservationCode,
            email: b.guestEmail || '',
            checkout: b.checkout,
            name: [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ').trim(),
            phone: b.guestPhone || '',
          });
        }
      } catch (e) { /* ignore */ }
      if (!cancelled) setLookupDone(true);
    })();
    return () => { cancelled = true; };
  }, [code, resolvedHotelId, apiBaseUrl, guestStay?.code, setGuestStay]);

  const handleInstall = async () => {
    if (isIos()) {
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

  if (!lookupDone) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (installed) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <CheckCircle2 size={48} color={BRAND} style={{ marginBottom: 12 }} />
          <h1 style={styles.title}>{hotelName} is on your phone</h1>
          <p style={styles.subtitle}>Open it from your home screen anytime.</p>
          <button
            type="button"
            onClick={() => navigate(guestStay?.code ? '/guest/home' : '/')}
            style={styles.primaryBtn}
          >
            {guestStay?.code ? 'Go to my stay' : 'Book a room'}
          </button>
          {guestStay?.code && (
            <button
              type="button"
              onClick={() => navigate('/guest/messages')}
              style={styles.secondaryBtn}
            >
              Message the front desk
            </button>
          )}
        </div>
      </div>
    );
  }

  const showQr = typeof window !== 'undefined' && window.innerWidth >= 480 && installPageUrl;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={72} />
        </div>
        <h1 style={styles.title}>Add {hotelName} to your phone</h1>
        <p style={styles.subtitle}>
          {ref === 'checkin-reminder'
            ? 'You\'re almost here — install now so you can message us and get updates.'
            : 'Works like an app. No app store. Message us anytime and book direct next stay.'}
        </p>

        <InstallBenefits />

        {showQr && (
          <div style={styles.qrBlock}>
            <p style={styles.qrLabel}>Scan on your phone</p>
            <img src={qrCodeUrl(installPageUrl, 180)} alt="QR code" width={180} height={180} style={{ borderRadius: 12 }} />
          </div>
        )}

        {isIos() ? (
          <div style={{ marginBottom: 16 }}>
            <IosInstallSteps hotelName={hotelName} appIconUrl={appIconUrl} />
            <button type="button" onClick={() => setShowIosSheet(true)} style={{ ...styles.primaryBtn, marginTop: 16 }}>
              <Smartphone size={18} /> Show me how
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            style={styles.primaryBtn}
            disabled={!deferredPrompt && !isAndroid()}
          >
            <Smartphone size={18} />
            {deferredPrompt ? 'Install now' : (isAndroid() ? 'Use Chrome menu → Install app' : 'Open on your phone to install')}
          </button>
        )}

        {!isIos() && !deferredPrompt && (
          <p style={styles.hint}>
            On this device: open this page on your phone in Chrome, then tap Install when prompted.
          </p>
        )}

        {guestStay?.code && (
          <button type="button" onClick={() => navigate('/guest/check-in')} style={styles.secondaryBtn}>
            Continue to check-in →
          </button>
        )}
      </div>

      {showIosSheet && (
        <IosInstallSheet hotelName={hotelName} appIconUrl={appIconUrl} onClose={() => setShowIosSheet(false)} />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '60vh',
    padding: '24px 16px 40px',
    background: '#f4f7f9',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 480,
    margin: '0 auto',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: '28px 22px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 800,
    color: '#1a1a2e',
    lineHeight: 1.25,
  },
  subtitle: {
    margin: '0 0 20px',
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.55,
  },
  primaryBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: BRAND,
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  secondaryBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #d7e3dc',
    background: '#f5f9f6',
    color: BRAND,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  },
  qrBlock: {
    background: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 1.5,
    margin: '8px 0 0',
  },
  loading: {
    textAlign: 'center',
    padding: 48,
    color: '#6b7280',
  },
};

export default InstallPage;
