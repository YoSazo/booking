import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Share, Smartphone, Loader2, Copy, ArrowRight, MessageCircle } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import {
  BRAND,
  INSTALL_THEME,
  isIos,
  isAndroid,
  qrCodeUrl,
  HotelIcon,
  IosInstallSheet,
  AndroidInstallSteps,
  InstallBenefits,
  SuccessCheckIcon,
} from './guestInstallUi.jsx';
import { trackGuestInstall, installTouchpointFromRef } from './guestInstallTracking.js';

function InstallPage({ hotel, apiBaseUrl = '', hotelId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setGuestStay, guestStay } = useGuest();
  const resolvedHotelId = hotelId || hotel?.id;
  const code = searchParams.get('code') || '';
  const ref = searchParams.get('ref') || 'direct';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [installing, setInstalling] = useState(false);
  const [lookupDone, setLookupDone] = useState(!code);
  const [copied, setCopied] = useState(false);

  const hotelName = hotel?.name || 'Your Hotel';
  const appIconUrl = hotel?.appIconUrl || '';
  const installPageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const touchpoint = installTouchpointFromRef(ref);
  const trackCode = code || guestStay?.code || undefined;
  const ios = isIos();
  const android = isAndroid();
  const showQr = typeof window !== 'undefined' && window.innerWidth >= 480 && installPageUrl && !ios && !android;

  const markInstalled = useCallback(() => {
    setInstalled(true);
    trackGuestInstall(apiBaseUrl, resolvedHotelId, {
      touchpoint,
      eventType: 'installed',
      reservationCode: trackCode,
    });
  }, [apiBaseUrl, resolvedHotelId, touchpoint, trackCode]);

  useEffect(() => {
    if (isStandalone()) {
      markInstalled();
      return undefined;
    }

    trackGuestInstall(apiBaseUrl, resolvedHotelId, {
      touchpoint,
      eventType: 'view',
      reservationCode: trackCode,
    });

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      markInstalled();
      setDeferredPrompt(null);
      setInstalling(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [apiBaseUrl, resolvedHotelId, touchpoint, trackCode, markInstalled]);

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

  const trackCta = () => {
    trackGuestInstall(apiBaseUrl, resolvedHotelId, {
      touchpoint,
      eventType: 'cta_click',
      reservationCode: trackCode,
    });
  };

  const handleInstall = async () => {
    trackCta();
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') markInstalled();
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyLink = async () => {
    if (!installPageUrl) return;
    try {
      await navigator.clipboard.writeText(installPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) { /* ignore */ }
  };

  const subtitle = ref === 'checkin-reminder'
    ? "You're almost here — install now so you can message us and get updates."
    : 'Works like an app. No app store. Message us anytime and book direct next time.';

  if (!lookupDone) {
    return (
      <div style={styles.page}>
        <div style={styles.body}>
          <div style={styles.loading}>Loading…</div>
        </div>
      </div>
    );
  }

  if (installed) {
    return (
      <div style={styles.page}>
        <style>{installKeyframes}</style>
        <div style={styles.body}>
          <div style={styles.main}>
            <SuccessCheckIcon />
            <h1 style={styles.title}>{hotelName} is on your phone</h1>
            <p style={{ ...styles.subtitle, marginBottom: 0 }}>Open it anytime from your home screen — no browser needed.</p>
          </div>
          <div style={styles.footer}>
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
                <MessageCircle size={16} strokeWidth={2.2} />
                Message the front desk
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  let ctaBlock = null;
  if (ios) {
    ctaBlock = (
      <>
        <button
          type="button"
          onClick={() => { trackCta(); setShowIosSheet(true); }}
          style={styles.primaryBtn}
        >
          <Share size={18} color="#fff" strokeWidth={2.2} />
          Show me how
        </button>
        <p style={styles.hint}>Takes 3 seconds · works just like an app</p>
      </>
    );
  } else if (android && deferredPrompt) {
    ctaBlock = (
      <>
        <button
          type="button"
          onClick={handleInstall}
          style={styles.primaryBtn}
          disabled={installing}
        >
          {installing ? (
            <>
              <Loader2 size={18} strokeWidth={2.2} style={{ animation: 'installSpin 0.8s linear infinite' }} />
              Installing…
            </>
          ) : (
            <>
              <Smartphone size={18} strokeWidth={2.2} />
              Add to Home Screen
            </>
          )}
        </button>
        <p style={styles.hint}>Takes 3 seconds · works just like an app</p>
      </>
    );
  } else if (android) {
    // D10: no browser prompt available — never a disabled button. Show the
    // manual Chrome steps, which always work.
    ctaBlock = (
      <>
        <button
          type="button"
          onClick={() => { trackCta(); setShowAndroidSteps((v) => !v); }}
          style={styles.primaryBtn}
        >
          <Smartphone size={18} strokeWidth={2.2} />
          {showAndroidSteps ? 'Hide steps' : 'Add to Home Screen'}
        </button>
        {showAndroidSteps && (
          <div style={{ marginTop: 16, textAlign: 'left', background: INSTALL_THEME.bg, border: `1px solid ${INSTALL_THEME.border}`, borderRadius: 14, padding: 16 }}>
            <AndroidInstallSteps />
          </div>
        )}
        <p style={styles.hint}>Takes 3 seconds · works just like an app</p>
      </>
    );
  } else if (showQr) {
    ctaBlock = (
      <>
        <div style={styles.qrBlock}>
          <p style={styles.qrLabel}>Scan with your phone</p>
          <img src={qrCodeUrl(installPageUrl, 170)} alt="QR code" width={170} height={170} style={{ borderRadius: 12, display: 'block', margin: '0 auto' }} />
        </div>
        <div style={styles.copyRow}>
          <input readOnly value={installPageUrl} style={styles.copyInput} aria-label="Install page link" />
          <button type="button" onClick={handleCopyLink} style={styles.copyBtn}>
            {copied ? 'Copied!' : <><Copy size={14} strokeWidth={2.2} /> Copy</>}
          </button>
        </div>
      </>
    );
  } else {
    ctaBlock = (
      <p style={styles.hint}>
        Open this page on your phone in Chrome or Safari to install.
      </p>
    );
  }

  return (
    <div style={styles.page}>
      <style>{installKeyframes}</style>
      <div style={styles.body}>
        <div style={styles.main}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={72} />
          </div>
          <h1 style={styles.title}>Add {hotelName} to your phone</h1>
          <p style={styles.subtitle}>{subtitle}</p>

          <InstallBenefits />
        </div>

        <div style={styles.footer}>
          {ctaBlock}
          {guestStay?.code && (
            <button type="button" onClick={() => navigate('/guest/check-in')} style={styles.secondaryBtn}>
              Continue to check-in
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {showIosSheet && (
        <IosInstallSheet
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          title={`Install ${hotelName}`}
          subtitle="Add it to your home screen — takes 3 seconds."
          onClose={() => setShowIosSheet(false)}
        />
      )}
    </div>
  );
}

const installKeyframes = `
  @keyframes installPopIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
  @keyframes installSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles = {
  page: {
    minHeight: '100dvh',
    width: '100%',
    background: INSTALL_THEME.white,
    fontFamily: "'DM Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    boxSizing: 'border-box',
  },
  body: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    padding: 'max(32px, env(safe-area-inset-top)) 22px max(28px, env(safe-area-inset-bottom))',
    maxWidth: 480,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  footer: {
    flexShrink: 0,
    paddingTop: 28,
    textAlign: 'center',
  },
  title: {
    margin: '0 0 10px',
    fontSize: 22,
    fontWeight: 800,
    color: INSTALL_THEME.text,
    lineHeight: 1.28,
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 14,
    color: INSTALL_THEME.textMuted,
    lineHeight: 1.55,
  },
  primaryBtn: {
    width: '100%',
    padding: 15,
    borderRadius: 14,
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
    boxShadow: '0 6px 16px rgba(46,125,91,0.25)',
  },
  secondaryBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: `1.5px solid ${BRAND}`,
    background: INSTALL_THEME.white,
    color: BRAND,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrBlock: {
    background: INSTALL_THEME.bg,
    border: `1px solid ${INSTALL_THEME.border}`,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    textAlign: 'center',
  },
  qrLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: INSTALL_THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 12px',
  },
  copyRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
  },
  copyInput: {
    flex: 1,
    minWidth: 0,
    padding: '10px 12px',
    borderRadius: 10,
    border: `1.5px solid ${INSTALL_THEME.border}`,
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: 11.5,
    color: INSTALL_THEME.textMuted,
    background: INSTALL_THEME.white,
    boxSizing: 'border-box',
  },
  copyBtn: {
    flexShrink: 0,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: BRAND,
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    fontSize: 11.5,
    color: INSTALL_THEME.textMuted,
    marginTop: 12,
    lineHeight: 1.5,
  },
  loading: {
    textAlign: 'center',
    padding: 48,
    color: INSTALL_THEME.textMuted,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default InstallPage;
