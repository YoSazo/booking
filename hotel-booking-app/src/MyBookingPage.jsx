import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarClock, Search } from 'lucide-react';
import { GuestMessageCard, downloadStayIcs } from './guestMessaging.jsx';

const fmtDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(dt);
};

function MyBookingPage({ hotel, apiBaseUrl = '', hotelId }) {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const resolvedHotelId = hotelId || hotel?.id;

  const [codeInput, setCodeInput] = useState(codeParam || '');
  const [emailInput, setEmailInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hotelPhone = hotel?.phone || '';

  const lookup = useCallback(async (code, email) => {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) { setError('Enter your confirmation code.'); return; }
    if (!resolvedHotelId) { setError('This property is unavailable right now.'); return; }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ hotelId: resolvedHotelId, code: cleanCode });
      if (email) params.set('email', email.trim());
      const res = await fetch(`${apiBaseUrl}/api/booking/lookup?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBooking(data.booking);
      } else {
        setBooking(null);
        setError(data.message || 'We couldn’t find that reservation.');
      }
    } catch (e) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }, [apiBaseUrl, resolvedHotelId]);

  // Magic-link path: code in the URL → fetch immediately (code is the secret).
  useEffect(() => {
    if (codeParam) lookup(codeParam, '');
  }, [codeParam, lookup]);

  const guestInfo = booking ? {
    firstName: booking.guestFirstName,
    lastName: booking.guestLastName,
    email: booking.guestEmail,
    phone: booking.guestPhone,
  } : null;

  return (
    <div className="confirmation-container" style={{ minHeight: '60vh' }}>
      <div className="confirmation-card">
        {!booking ? (
          <>
            <div className="confirmation-header" style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 6 }}>Find your reservation</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                Enter your confirmation code{`${' '}`}and email to view your stay, message the front desk, or book again.
              </p>
            </div>

            <div className="stay-details-card" style={{ marginTop: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>Confirmation code</label>
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="e.g. A1B2C3D4E"
                autoCapitalize="characters"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, border: '1px solid #d7dde3', fontSize: 15, fontFamily: 'inherit', marginBottom: 14, letterSpacing: '0.05em' }}
              />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>Email on the booking</label>
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@email.com"
                type="email"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, border: '1px solid #d7dde3', fontSize: 15, fontFamily: 'inherit' }}
              />
              {error && <p style={{ fontSize: 13, color: '#c0392b', margin: '12px 0 0' }}>{error}</p>}
              <button
                type="button"
                onClick={() => lookup(codeInput, emailInput)}
                disabled={loading}
                style={{
                  width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none',
                  background: '#2E7D5B', color: '#fff', fontSize: 15, fontWeight: 700,
                  fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Search size={16} /> {loading ? 'Looking…' : 'Find my reservation'}
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 18 }}>
              Need a new stay?{' '}
              <button type="button" onClick={() => {
                localStorage.removeItem('marketel_guest_stay');
                navigate('/');
              }} style={{ background: 'none', border: 'none', color: '#2E7D5B', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
                Book now →
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="success-checkmark">
              <svg className="checkmark-icon" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <div className="confirmation-header">
              <h2>Your reservation</h2>
              <p className="confirmation-code">Confirmation Code: <strong>#{booking.reservationCode}</strong></p>
              {booking.guestFirstName && (
                <p className="confirmation-email">Booked for <strong>{[booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ')}</strong></p>
              )}
            </div>

            <div className="stay-details-card">
              {booking.roomName && (
                <div className="detail-row"><span className="detail-label">Room</span><span className="detail-value">{booking.roomName}</span></div>
              )}
              <div className="detail-row"><span className="detail-label">Check-in</span><span className="detail-value">{fmtDate(booking.checkin)}</span></div>
              <div className="detail-row"><span className="detail-label">Check-out</span><span className="detail-value">{fmtDate(booking.checkout)}</span></div>
              <div className="detail-row"><span className="detail-label">Nights</span><span className="detail-value">{booking.nights}</span></div>
              {booking.total != null && (
                <div className="detail-row"><span className="detail-label">Total</span><span className="detail-value" style={{ color: '#2E7D5B', fontWeight: 700 }}>${Number(booking.total).toFixed(2)}</span></div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => downloadStayIcs({ hotel, bookingDetails: { checkin: booking.checkin, checkout: booking.checkout }, reservationCode: booking.reservationCode })}
                style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', borderRadius: 12, cursor: 'pointer', border: '1px solid #d7e3dc', background: '#f5f9f6', color: '#2E7D5B', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
              >
                <CalendarPlus size={17} /> Add to Calendar
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('marketel_guest_stay');
                  navigate('/');
                }}
                style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', borderRadius: 12, cursor: 'pointer', border: '1px solid #d7e3dc', background: '#f5f9f6', color: '#2E7D5B', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
              >
                <CalendarClock size={17} /> Extend / Book again
              </button>
            </div>

            <GuestMessageCard
              apiBaseUrl={apiBaseUrl}
              hotelId={resolvedHotelId}
              reservationCode={booking.reservationCode}
              guestInfo={guestInfo}
              hotelPhone={hotelPhone}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default MyBookingPage;
