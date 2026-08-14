import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageCircle, ArrowRight, ChevronRight, MapPin, Phone, Search, MessageSquare, FileText, Hotel } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { downloadStayIcs } from './guestMessaging.jsx';
import { isStandalone } from './pwaUtils.js';
import GuestInstallCard from './GuestInstallCard.jsx';
import GuestNotificationPrompt from './GuestNotificationPrompt.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const calcNights = (checkin, checkout) => {
  const a = new Date(checkin);
  const b = new Date(checkout);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

const isCheckinToday = (checkinStr) => {
  if (!checkinStr) return false;
  const d = new Date(checkinStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate();
};

function PropertyMasthead({ hotel }) {
  const name = hotel?.name || 'Your Hotel';
  const iconUrl = hotel?.appIconUrl || '';

  return (
    <header style={styles.propertyMasthead}>
      <div style={styles.propertyIcon}>
        {iconUrl
          ? <img src={iconUrl} alt="" style={styles.propertyIconImage} />
          : <span>{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div style={styles.propertyIdentity}>
        <span style={styles.propertyEyebrow}>Guest app</span>
        <strong style={styles.propertyName}>{name}</strong>
      </div>
      <span style={styles.propertyLiveDot} aria-label="Connected" />
    </header>
  );
}

function PreBookHub({ hotel, onBook, onFindReservation }) {
  const subtitle = hotel?.subtitle || '';
  const address = hotel?.address || '';
  const phone = hotel?.phone || '';

  return (
    <div style={styles.page}>
      <PropertyMasthead hotel={hotel} />
      <div style={styles.greetingSection}>
        <h1 style={styles.greeting}>Your next stay starts here</h1>
        <p style={styles.greetingSubtitle}>
          {isStandalone()
            ? 'Welcome — book a stay or find an existing reservation.'
            : subtitle || 'Book direct and save.'}
        </p>
      </div>

      {(address || phone) && (
        <div style={styles.card}>
          {address && (
            <div style={styles.hubInfoRow}>
              <MapPin size={18} color="#2E7D5B" style={{ flexShrink: 0 }} />
              <span style={styles.hubInfoText}>{address}</span>
            </div>
          )}
          {phone && (
            <a href={`tel:${phone}`} style={{ ...styles.hubInfoRow, textDecoration: 'none', marginTop: address ? 12 : 0 }}>
              <Phone size={18} color="#2E7D5B" style={{ flexShrink: 0 }} />
              <span style={{ ...styles.hubInfoText, color: '#2E7D5B', fontWeight: 600 }}>{phone}</span>
            </a>
          )}
        </div>
      )}

      <button type="button" onClick={onBook} style={{ ...styles.primaryButton, width: '100%', marginBottom: 10 }}>
        Book a room
      </button>
      <button
        type="button"
        onClick={onFindReservation}
        style={styles.secondaryButton}
      >
        <Search size={17} />
        Find my reservation
      </button>
    </div>
  );
}

export default function GuestHomePage({ hotel: hotelProp }) {
  const { guestStay, apiBaseUrl, hotelId } = useGuest();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [lookupHotel, setLookupHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async ({ initial = false } = {}) => {
    if (!guestStay?.code || !hotelId) {
      setBooking(null);
      setLookupHotel(null);
      setLoading(false);
      return;
    }
    if (initial) setLoading(true);
    try {
      const params = new URLSearchParams({
        hotelId,
        code: guestStay.code,
        email: guestStay.email || '',
      });
      const res = await fetchWithTimeout(`${apiBaseUrl}/api/booking/lookup?${params}`, {}, 12000);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.booking) {
        setBooking(data.booking);
        if (data.hotel) setLookupHotel(data.hotel);
        setError('');
      } else if (initial) {
        setBooking(null);
        setError('Could not load your stay details.');
      }
    } catch (e) {
      if (initial) setError('Unable to connect. Please try again.');
    } finally {
      if (initial) setLoading(false);
    }
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  useEffect(() => {
    fetchBooking({ initial: true });
  }, [fetchBooking]);

  useEffect(() => {
    if (!guestStay?.code) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') fetchBooking();
    };
    const interval = window.setInterval(refreshWhenVisible, 15000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    window.addEventListener('marketel:guest-refresh', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      window.removeEventListener('marketel:guest-refresh', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchBooking, guestStay?.code]);

  // No active stay — hotel hub (especially for installed PWA before booking)
  if (!guestStay?.code) {
    return (
      <PreBookHub
        hotel={hotelProp}
        onBook={() => navigate('/')}
        onFindReservation={() => navigate('/booking')}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.page}>
        <PropertyMasthead hotel={hotelProp} />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your stay...</p>
        </div>
      </div>
    );
  }

  // Stay expired or lookup failed
  if (!booking) {
    return (
      <div style={styles.page}>
        <PropertyMasthead hotel={hotelProp} />
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}><Hotel size={30} color="#2E7D5B" /></div>
          <h2 style={styles.emptyTitle}>No upcoming stays</h2>
          <p style={styles.emptySubtitle}>
            {error || 'Book your next getaway and it will appear here.'}
          </p>
          <button type="button" onClick={() => navigate('/')} style={{ ...styles.primaryButton, marginBottom: 10 }}>
            Book a room
          </button>
          <button type="button" onClick={() => navigate('/booking')} style={styles.secondaryButton}>
            <Search size={17} />
            Find my reservation
          </button>
        </div>
      </div>
    );
  }

  const firstName =
    booking.guestFirstName ||
    booking.guestName?.split(' ')[0] ||
    'Guest';
  const checkin = booking.checkin || booking.checkinDate;
  const checkout = booking.checkout || booking.checkoutDate;
  const nights = checkin && checkout ? calcNights(checkin, checkout) : null;
  const roomName = booking.roomName || booking.room?.name || 'Your Room';
  const confirmationCode =
    booking.confirmationCode || booking.reservationCode || guestStay.code;
  const status = booking.status || 'Confirmed';

  const handleAddToCalendar = () => {
    downloadStayIcs({
      hotel: lookupHotel || hotelProp || { name: booking.hotelName || 'Hotel' },
      bookingDetails: { checkin, checkout },
      reservationCode: confirmationCode,
    });
  };

  const checkinDate = checkin ? new Date(checkin) : null;
  const now = new Date();
  const checkinDaysAway = checkinDate
    ? Math.round((checkinDate - now) / (1000 * 60 * 60 * 24))
    : null;
  // D12: 48h arrival window — check-in becomes the top card.
  const isCheckinSoon = checkinDaysAway != null && checkinDaysAway >= 0 && checkinDaysAway <= 2;
  const checkinLabel = isCheckinToday(checkin)
    ? 'Check-in today'
    : checkinDaysAway === 1
      ? 'Check-in tomorrow'
      : `Check-in in ${checkinDaysAway} days`;

  return (
    <div style={styles.page}>
      <PropertyMasthead hotel={lookupHotel || hotelProp} />
      {/* Greeting */}
      <div style={styles.greetingSection}>
        <h1 style={styles.greeting}>Welcome, {firstName}</h1>
        <p style={styles.greetingSubtitle}>Here's your upcoming stay</p>
      </div>

      {/* D12/1D.5: check-in is the TOP card inside the 48h window */}
      {isCheckinSoon && (
        <div style={styles.checkinCard}>
          <div style={styles.checkinPill}>
            <span style={styles.checkinDot} /> {checkinLabel}
          </div>
          <div style={styles.checkinTitle}>Almost here, {firstName} — get ready</div>
          <div style={styles.checkinActions}>
            <button type="button" onClick={() => navigate('/guest/messages')} style={styles.checkinBtn}>
              <MessageSquare size={17} /> Message front desk
            </button>
            <button type="button" onClick={() => navigate('/guest/check-in')} style={styles.checkinBtnGhost}>
              <FileText size={17} /> View my stay
            </button>
          </div>
        </div>
      )}

      <GuestInstallCard
        hotelName={hotelProp?.name || lookupHotel?.name}
        appIconUrl={hotelProp?.appIconUrl || lookupHotel?.appIconUrl}
        hotelId={hotelId}
        reservationCode={confirmationCode}
        apiBaseUrl={apiBaseUrl}
        touchpoint="guest-home"
        variant="card"
      />

      <GuestNotificationPrompt
        apiBaseUrl={apiBaseUrl}
        hotelId={hotelId}
        guestStay={guestStay}
      />

      {/* Stay card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.roomName}>{roomName}</h2>
          <span
            style={{
              ...styles.statusBadge,
              background:
                status.toLowerCase() === 'confirmed'
                  ? '#E8F5EE'
                  : '#FEF3C7',
              color:
                status.toLowerCase() === 'confirmed'
                  ? '#2E7D5B'
                  : '#856404',
            }}
          >
            {status}
          </span>
        </div>

        {/* Dates row */}
        <div style={styles.datesRow}>
          <div style={styles.dateBlock}>
            <span style={styles.dateLabel}>Check-in</span>
            <span style={styles.dateValue}>
              {checkin ? formatDate(checkin) : '—'}
            </span>
          </div>
          <ArrowRight size={18} color="#6B7D72" style={{ flexShrink: 0 }} />
          <div style={styles.dateBlock}>
            <span style={styles.dateLabel}>Check-out</span>
            <span style={styles.dateValue}>
              {checkout ? formatDate(checkout) : '—'}
            </span>
          </div>
          {nights && (
            <span style={styles.nightsPill}>
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Confirmation code */}
        <div style={styles.codeRow}>
          <span style={styles.codeLabel}>Confirmation</span>
          <span style={styles.codeValue}>#{confirmationCode}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div style={styles.actionsRow}>
        <button
          type="button"
          onClick={handleAddToCalendar}
          style={styles.actionButton}
        >
          <CalendarPlus size={17} color="#2E7D5B" />
          <span>Add to Calendar</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/guest/messages')}
          style={styles.actionButton}
        >
          <MessageCircle size={17} color="#2E7D5B" />
          <span>Message</span>
        </button>
      </div>

      {/* Book again link */}
      <button
        type="button"
        onClick={() => navigate('/')}
        style={styles.bookAgainLink}
      >
        <span>Book again or extend your stay</span>
        <ChevronRight size={16} color="#2E7D5B" />
      </button>
    </div>
  );
}

const spinnerKeyframes = `
@keyframes guestHomeSpinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = spinnerKeyframes;
  document.head.appendChild(styleEl);
}

const styles = {
  page: {
    background: 'radial-gradient(circle at 12% -8%, rgba(126,226,184,0.22), transparent 34%), radial-gradient(circle at 96% 18%, rgba(76,175,125,0.10), transparent 30%), #EFF4F0',
    minHeight: 'calc(100dvh - var(--guest-nav-clearance, 0px))',
    boxSizing: 'border-box',
    padding: 'max(12px, env(safe-area-inset-top)) 14px 12px',
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 540,
    margin: '0 auto',
  },

  propertyMasthead: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    minHeight: 58,
    padding: '9px 12px',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 20,
    background: 'linear-gradient(145deg, rgba(255,255,255,0.76), rgba(232,245,238,0.56))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.94), 0 8px 24px rgba(46,125,91,0.10)',
    backdropFilter: 'blur(22px) saturate(170%)',
    WebkitBackdropFilter: 'blur(22px) saturate(170%)',
  },
  propertyIcon: {
    display: 'flex',
    width: 40,
    height: 40,
    flex: '0 0 40px',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.72)',
    borderRadius: 13,
    background: 'linear-gradient(145deg, #4CAF7D, #2E7D5B)',
    boxShadow: '0 4px 12px rgba(46,125,91,0.24)',
    color: '#fff',
    fontSize: 17,
    fontWeight: 800,
  },
  propertyIconImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  propertyIdentity: {
    display: 'flex',
    minWidth: 0,
    flex: 1,
    flexDirection: 'column',
    lineHeight: 1.16,
  },
  propertyEyebrow: {
    color: '#6B7D72',
    fontSize: 10,
    fontWeight: 750,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  propertyName: {
    overflow: 'hidden',
    color: '#1A2B22',
    fontSize: 15,
    fontWeight: 800,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  propertyLiveDot: {
    width: 8,
    height: 8,
    flex: '0 0 8px',
    border: '3px solid rgba(76,175,125,0.17)',
    borderRadius: '50%',
    background: '#4CAF7D',
    boxSizing: 'content-box',
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #D8E4DC',
    borderTopColor: '#2E7D5B',
    borderRadius: '50%',
    animation: 'guestHomeSpinner 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7D72',
    margin: 0,
  },

  // Empty state
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#E8F5EE',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1A2B22',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7D72',
    margin: '0 0 20px',
    lineHeight: 1.5,
    maxWidth: 300,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 28px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF7D 0%, #2E7D5B 60%, #245F46 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(46,125,91,0.3)',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 28px',
    borderRadius: 12,
    border: '1.5px solid #D8E4DC',
    background: '#F4F8F5',
    color: '#2E7D5B',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  },
  hubInfoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  hubInfoText: {
    fontSize: 14,
    color: '#4B5D52',
    lineHeight: 1.5,
  },

  // Check-in top card (D12/1D.5)
  checkinCard: {
    background: 'linear-gradient(135deg,#1a2b22,#2E7D5B)',
    borderRadius: 16,
    padding: '18px',
    marginBottom: 16,
    color: '#fff',
    boxShadow: '0 6px 20px rgba(46,125,91,0.25)',
  },
  checkinPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 8,
  },
  checkinDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#7ee2b8',
    display: 'inline-block',
  },
  checkinTitle: {
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.3,
    marginBottom: 14,
  },
  checkinActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  checkinBtn: {
    flex: '1 1 150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#fff',
    color: '#245F46',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  checkinBtnGhost: {
    flex: '1 1 150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.55)',
    background: 'transparent',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },

  // Greeting
  greetingSection: {
    marginBottom: 18,
    padding: '24px 4px 0',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1A2B22',
    letterSpacing: '-0.02em',
    margin: 0,
    lineHeight: 1.2,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: '#6B7D72',
    margin: '6px 0 0',
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 2px 6px rgba(46,125,91,0.06), 0 8px 20px rgba(46,125,91,0.08)',
    border: '1px solid #D8E4DC',
    padding: '20px',
    marginBottom: 16,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1A2B22',
    margin: 0,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Dates
  datesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7D72',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A2B22',
  },
  nightsPill: {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
    background: '#E8F5EE',
    color: '#2E7D5B',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },

  // Code
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0 0',
    borderTop: '1px solid #E6EEE9',
  },
  codeLabel: {
    fontSize: 13,
    color: '#6B7D72',
    fontWeight: 500,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#245F46',
    fontFamily: "'DM Mono', 'SF Mono', 'Consolas', monospace",
    letterSpacing: '0.5px',
  },

  // Actions
  actionsRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: '1 1 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    border: '1px solid #D8E4DC',
    background: '#F4F8F5',
    color: '#2E7D5B',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    whiteSpace: 'nowrap',
  },

  // Book again
  bookAgainLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    padding: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#2E7D5B',
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
