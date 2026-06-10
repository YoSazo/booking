import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { downloadStayIcs } from './guestMessaging.jsx';

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

export default function GuestHomePage() {
  const { guestStay, apiBaseUrl, hotelId } = useGuest();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guestStay?.code || !hotelId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchBooking = async () => {
      try {
        const params = new URLSearchParams({
          hotelId,
          code: guestStay.code,
          email: guestStay.email || '',
        });
        const res = await fetch(`${apiBaseUrl}/api/booking/lookup?${params}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.success && data.booking) {
          setBooking(data.booking);
          if (data.hotel) setHotel(data.hotel);
        } else {
          setError('Could not load your stay details.');
        }
      } catch (e) {
        if (!cancelled) setError('Unable to connect. Please try again.');
      }
      if (!cancelled) setLoading(false);
    };

    fetchBooking();
    return () => { cancelled = true; };
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  // Loading state
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your stay...</p>
        </div>
      </div>
    );
  }

  // No stay / expired
  if (!guestStay || !booking) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyContainer}>
          <div style={styles.emptyEmoji}>🏨</div>
          <h2 style={styles.emptyTitle}>No upcoming stays</h2>
          <p style={styles.emptySubtitle}>
            {error || 'Book your next getaway and it will appear here.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={styles.primaryButton}
          >
            Book your next stay
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
      hotel: hotel || { name: booking.hotelName || 'Hotel' },
      bookingDetails: { checkin, checkout },
      reservationCode: confirmationCode,
    });
  };

  return (
    <div style={styles.page}>
      {/* Greeting */}
      <div style={styles.greetingSection}>
        <h1 style={styles.greeting}>Welcome, {firstName}</h1>
        <p style={styles.greetingSubtitle}>Here's your upcoming stay</p>
      </div>

      {/* Stay card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.roomName}>{roomName}</h2>
          <span
            style={{
              ...styles.statusBadge,
              background:
                status.toLowerCase() === 'confirmed'
                  ? '#e8f7ee'
                  : '#fff3cd',
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
          <ArrowRight size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
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
          <span>Message Front Desk</span>
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
    background: '#f4f7f9',
    minHeight: '100vh',
    padding: '24px 16px 40px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 540,
    margin: '0 auto',
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
    border: '3px solid #e5e7eb',
    borderTopColor: '#2E7D5B',
    borderRadius: '50%',
    animation: 'guestHomeSpinner 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
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
  emptyEmoji: {
    fontSize: 48,
    lineHeight: 1,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
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
    background: '#2E7D5B',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  },

  // Greeting
  greetingSection: {
    marginBottom: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1a1a2e',
    margin: 0,
    lineHeight: 1.2,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    margin: '6px 0 0',
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
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
    color: '#1a1a2e',
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
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  nightsPill: {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
    background: '#f0f4f8',
    color: '#475569',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },

  // Code
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0 0',
    borderTop: '1px solid #f0f0f0',
  },
  codeLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: 500,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#475569',
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
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
    border: '1px solid #d7e3dc',
    background: '#f5f9f6',
    color: '#2E7D5B',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
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
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
