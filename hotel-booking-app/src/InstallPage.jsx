import React, { useEffect } from 'react';
import { ArrowRight, QrCode, Smartphone } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HotelIcon } from './guestInstallUi.jsx';
import { BRAND, INSTALL_THEME, isAndroid, isIos } from './guestInstallUtils.js';
import { trackGuestInstall, installTouchpointFromRef } from './guestInstallTracking.js';
import { guestelInvocationUrl, guestelQrInvocationUrl } from './appClipInstall.js';
import GuestelQrCode from './GuestelQrCode.jsx';

// Historic /install links remain valid, but now hand off only to Guestel.
function InstallPage({ hotel, apiBaseUrl = '', hotelId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resolvedHotelId = hotelId || hotel?.id;
  const ref = searchParams.get('ref') || 'legacy-install-link';
  const code = searchParams.get('code') || '';
  const touchpoint = installTouchpointFromRef(ref);
  const ios = isIos();
  const android = isAndroid();
  const hotelName = hotel?.name || 'this property';
  const appIconUrl = hotel?.appIconUrl || '';
  const invocationUrl = guestelInvocationUrl({ hotelId: resolvedHotelId, intent: code ? 'stay' : 'add' });
  const qrUrl = guestelQrInvocationUrl({
    hotelId: resolvedHotelId,
    intent: code ? 'stay' : 'book',
    ref: touchpoint,
  });

  useEffect(() => {
    if (android) return;
    trackGuestInstall(apiBaseUrl, resolvedHotelId, {
      touchpoint,
      eventType: 'view',
      reservationCode: code || undefined,
    });
  }, [android, apiBaseUrl, code, resolvedHotelId, touchpoint]);

  const openGuestel = () => {
    trackGuestInstall(apiBaseUrl, resolvedHotelId, {
      touchpoint,
      eventType: 'cta_click',
      reservationCode: code || undefined,
    });
    window.location.assign(invocationUrl);
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={72} style={{ margin: '0 auto 18px' }} />
        <div style={styles.eyebrow}>Guestel</div>
        <h1 style={styles.title}>Keep {hotelName} with you</h1>
        <p style={styles.subtitle}>Book direct, keep your stay details, and message the Front Desk from one guest app.</p>

        {ios ? (
          <button type="button" onClick={openGuestel} style={styles.primaryButton}>
            <Smartphone size={18} /> Open in Guestel
          </button>
        ) : android ? (
          <div style={styles.unavailable}>
            Guestel is currently available on iPhone. You can keep booking on this website.
          </div>
        ) : (
          <div style={styles.qrPanel}>
            <GuestelQrCode value={qrUrl} size={220} alt={`Guestel QR code for ${hotelName}`} style={styles.qrImage} />
            <strong style={styles.qrTitle}><QrCode size={17} /> Scan with an iPhone</strong>
            <span style={styles.qrCopy}>The Guestel App Clip opens this exact property.</span>
          </div>
        )}

        <button type="button" onClick={() => navigate(code ? `/booking/${encodeURIComponent(code)}` : '/')} style={styles.secondaryButton}>
          {code ? 'View reservation' : 'Continue booking'} <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'max(24px,env(safe-area-inset-top)) 18px max(24px,env(safe-area-inset-bottom))',
    background: 'linear-gradient(180deg,#edf5f0,#f8faf9)', fontFamily: "'DM Sans',Inter,-apple-system,BlinkMacSystemFont,sans-serif", boxSizing: 'border-box',
  },
  card: {
    width: 'min(100%,430px)', padding: '30px 24px 24px', border: `1px solid ${INSTALL_THEME.border}`, borderRadius: 24,
    background: '#fff', boxShadow: '0 22px 60px rgba(27,65,45,.13)', textAlign: 'center', boxSizing: 'border-box',
  },
  eyebrow: { marginBottom: 7, color: BRAND, fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' },
  title: { margin: 0, color: INSTALL_THEME.text, fontSize: 25, lineHeight: 1.18, fontWeight: 850 },
  subtitle: { margin: '10px auto 22px', maxWidth: 340, color: INSTALL_THEME.textMuted, fontSize: 14, lineHeight: 1.55 },
  primaryButton: {
    width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px 16px', border: 0, borderRadius: 14, background: BRAND, color: '#fff', font: '800 15px inherit', cursor: 'pointer',
  },
  qrPanel: { display: 'grid', justifyItems: 'center', gap: 7, padding: 15, borderRadius: 18, background: INSTALL_THEME.bg },
  qrImage: { width: 220, maxWidth: '100%', borderRadius: 14, background: '#fff' },
  qrTitle: { display: 'flex', alignItems: 'center', gap: 6, color: INSTALL_THEME.text, fontSize: 14 },
  qrCopy: { color: INSTALL_THEME.textMuted, fontSize: 12 },
  unavailable: { padding: 15, borderRadius: 14, background: INSTALL_THEME.bg, color: INSTALL_THEME.textMuted, fontSize: 13, lineHeight: 1.5 },
  secondaryButton: {
    width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, padding: '11px 14px', border: 0, background: 'transparent', color: BRAND, font: '750 13px inherit', cursor: 'pointer',
  },
};

export default InstallPage;
