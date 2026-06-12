import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Home, Wifi } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { isStandalone } from './pwaUtils.js';
import GuestInstallCard from './GuestInstallCard.jsx';
import { BRAND } from './guestInstallUi.jsx';

function isCheckinToday(checkinStr) {
  if (!checkinStr) return false;
  const d = new Date(checkinStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate();
}

function isCheckinTomorrow(checkinStr) {
  if (!checkinStr) return false;
  const d = new Date(checkinStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getUTCFullYear() === tomorrow.getUTCFullYear()
    && d.getUTCMonth() === tomorrow.getUTCMonth()
    && d.getUTCDate() === tomorrow.getUTCDate();
}

function GuestCheckInPage({ hotel, apiBaseUrl = '', hotelId }) {
  const { guestStay, hotelId: ctxHotelId } = useGuest();
  const navigate = useNavigate();
  const resolvedHotelId = hotelId || hotel?.id || ctxHotelId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guestStay?.code || !resolvedHotelId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          hotelId: resolvedHotelId,
          code: guestStay.code,
          email: guestStay.email || '',
        });
        const res = await fetch(`${apiBaseUrl}/api/booking/lookup?${params}`);
        const data = await res.json();
        if (!cancelled && data.success) setBooking(data.booking);
      } catch (e) { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [guestStay, resolvedHotelId, apiBaseUrl]);

  if (!guestStay?.code) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Find your reservation first</h1>
          <p style={styles.sub}>We need your booking to show check-in details.</p>
          <button type="button" onClick={() => navigate('/booking')} style={styles.primaryBtn}>
            Find my reservation
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.page}><div style={styles.loading}>Loading your stay…</div></div>;
  }

  const checkin = booking?.checkin || booking?.checkinDate;
  const firstName = booking?.guestFirstName || guestStay.name?.split(' ')[0] || 'Guest';
  const hotelName = hotel?.name || booking?.hotelName || 'the hotel';
  const today = isCheckinToday(checkin);
  const tomorrow = isCheckinTomorrow(checkin);
  const standalone = isStandalone();

  const headline = today
    ? `Welcome, ${firstName}! Check-in is today`
    : tomorrow
      ? `Almost here, ${firstName} — check-in tomorrow`
      : `Hi ${firstName}, get ready for your stay`;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>{today ? '✓ Check-in day' : tomorrow ? 'Check-in tomorrow' : 'Before you arrive'}</div>
        <h1 style={styles.title}>{headline}</h1>
        <p style={styles.sub}>
          {standalone
            ? `You're all set with ${hotelName} on your phone. Message us for WiFi, parking, or early check-in.`
            : `Add ${hotelName} to your home screen — then you can message us like texting the front desk.`}
        </p>

        {!standalone && (
          <GuestInstallCard
            hotelName={hotelName}
            appIconUrl={hotel?.appIconUrl}
            hotelId={resolvedHotelId}
            reservationCode={guestStay.code}
            apiBaseUrl={apiBaseUrl}
            touchpoint="check-in-page"
            variant="hero"
            headline={`Add ${hotelName} before you arrive`}
            subline="Get WiFi, message us, and check-in updates on your phone."
          />
        )}

        <div style={styles.actionList}>
          <button type="button" onClick={() => navigate('/guest/messages')} style={styles.actionRow}>
            <MessageCircle size={20} color={BRAND} />
            <span>
              <strong>Message the front desk</strong>
              <small>WiFi password, early check-in, questions</small>
            </span>
          </button>
          <button type="button" onClick={() => navigate('/guest/home')} style={styles.actionRow}>
            <Home size={20} color={BRAND} />
            <span>
              <strong>View my stay</strong>
              <small>Dates, confirmation, calendar</small>
            </span>
          </button>
          {standalone && (
            <div style={{ ...styles.actionRow, cursor: 'default', background: '#f0fdf4' }}>
              <Wifi size={20} color={BRAND} />
              <span>
                <strong>Tip</strong>
                <small>Open Messages and ask for the WiFi password</small>
              </span>
            </div>
          )}
        </div>

        <button type="button" onClick={() => navigate('/guest/home')} style={styles.secondaryBtn}>
          Done — go to my stay
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '60vh',
    padding: '24px 16px 40px',
    background: '#f4f7f9',
    maxWidth: 480,
    margin: '0 auto',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: '24px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  badge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: BRAND,
    background: '#f0fdf4',
    padding: '6px 10px',
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 800,
    color: '#1a1a2e',
    lineHeight: 1.25,
  },
  sub: {
    margin: '0 0 16px',
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
  },
  secondaryBtn: {
    width: '100%',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: 'white',
    color: '#374151',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    padding: '14px 14px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#fafafa',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  loading: {
    textAlign: 'center',
    padding: 48,
    color: '#6b7280',
  },
};

export default GuestCheckInPage;
