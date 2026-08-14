import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import { stayStorageSnapshot } from './guestStayState.js';

function MyBookingPage({ hotel, apiBaseUrl = '', hotelId }) {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const { setGuestStay } = useGuest();
  const resolvedHotelId = hotelId || hotel?.id;
  const [codeInput, setCodeInput] = useState(codeParam || '');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(Boolean(codeParam));
  const [error, setError] = useState('');

  const lookup = useCallback(async (code, email) => {
    const cleanCode = String(code || '').trim();
    const cleanEmail = String(email || '').trim();
    if (!cleanCode) {
      setError('Enter your confirmation code.');
      return;
    }
    if (!resolvedHotelId) {
      setError('This property is unavailable right now.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ hotelId: resolvedHotelId, code: cleanCode });
      if (cleanEmail) params.set('email', cleanEmail);
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/booking/lookup?${params}`, {
        cache: 'no-store',
      }, 12000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.booking) {
        throw new Error(data.message || 'We couldn’t find that reservation.');
      }
      const stay = stayStorageSnapshot(data.booking, { email: cleanEmail });
      setGuestStay(stay);
      navigate(`/guest/home?stay=${encodeURIComponent(stay.code)}`, { replace: true });
    } catch (lookupError) {
      setError(lookupError.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [apiBaseUrl, navigate, resolvedHotelId, setGuestStay]);

  // Confirmation-email links contain the long random reservation code, so the
  // guest can reconnect without typing. Manual lookup keeps email as an
  // optional second check and uses the same generic failure response.
  useEffect(() => {
    if (codeParam) lookup(codeParam, '');
  }, [codeParam, lookup]);

  return (
    <main style={styles.page}>
      <style>{'@keyframes guestLookupSpin{to{transform:rotate(360deg)}}'}</style>
      <section style={styles.card}>
        <div style={styles.icon}><Search size={24} /></div>
        <h1 style={styles.title}>{loading && codeParam ? 'Opening your stay…' : 'Find your reservation'}</h1>
        <p style={styles.subtitle}>
          {loading && codeParam
            ? `Connecting this reservation to ${hotel?.name || 'the property'}.`
            : 'Enter the confirmation code from your email to connect it to Your Stay.'}
        </p>

        {!(loading && codeParam) && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              lookup(codeInput, emailInput);
            }}
            style={styles.form}
          >
            <label style={styles.label} htmlFor="reservation-code">Confirmation code</label>
            <input
              id="reservation-code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="e.g. A1B2C3D4E"
              autoCapitalize="characters"
              autoComplete="off"
              style={styles.input}
            />
            <label style={styles.label} htmlFor="reservation-email">Email on the booking</label>
            <input
              id="reservation-email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="you@email.com"
              type="email"
              autoComplete="email"
              style={styles.input}
            />
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Connecting…' : 'Open Your Stay'} <ArrowRight size={17} />
            </button>
          </form>
        )}

        {loading && codeParam && <div style={styles.spinner} aria-label="Loading reservation" />}
        <button type="button" onClick={() => navigate('/')} style={styles.bookLink}>Need a new stay? Book direct →</button>
      </section>
    </main>
  );
}

const font = 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif';
const styles = {
  page: { display: 'grid', minHeight: 'calc(100dvh - var(--guest-top-tabs-height, 0px))', placeItems: 'center', boxSizing: 'border-box', padding: 18, background: '#EFF4F0', color: '#1A2B22', fontFamily: font },
  card: { width: '100%', maxWidth: 420, boxSizing: 'border-box', padding: '28px 22px', border: '1px solid #D8E4DC', borderRadius: 22, background: 'rgba(255,255,255,.94)', boxShadow: '0 12px 34px rgba(46,125,91,.10)', textAlign: 'center' },
  icon: { display: 'inline-flex', width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderRadius: 16, background: '#E8F5EE', color: '#2E7D5B' },
  title: { margin: 0, fontSize: 23, lineHeight: 1.2, letterSpacing: '-.02em' },
  subtitle: { margin: '8px auto 20px', maxWidth: 330, color: '#6B7D72', fontSize: 13.5, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  label: { margin: '0 0 6px', color: '#52645A', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' },
  input: { width: '100%', boxSizing: 'border-box', marginBottom: 14, padding: '13px 14px', border: '1.5px solid #D8E4DC', borderRadius: 12, background: '#F9FBFA', color: '#1A2B22', fontFamily: font, fontSize: 16, outlineColor: '#2E7D5B' },
  error: { margin: '-2px 0 12px', color: '#A63F3F', fontSize: 12.5, lineHeight: 1.4 },
  primaryButton: { display: 'inline-flex', minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2, padding: '13px 18px', border: 0, borderRadius: 13, background: 'linear-gradient(135deg,#4CAF7D,#2E7D5B 65%,#245F46)', color: '#fff', fontFamily: font, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' },
  bookLink: { marginTop: 17, padding: 8, border: 0, background: 'transparent', color: '#2E7D5B', fontFamily: font, fontSize: 12.5, fontWeight: 750, cursor: 'pointer' },
  spinner: { width: 32, height: 32, margin: '20px auto', border: '3px solid #D8E4DC', borderTopColor: '#2E7D5B', borderRadius: '50%', animation: 'guestLookupSpin .8s linear infinite' },
};

export default MyBookingPage;
