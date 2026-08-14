import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import { downloadStayIcs } from './guestMessaging.jsx';
import { isStandalone } from './pwaUtils.js';
import GuestInstallCard from './GuestInstallCard.jsx';
import GuestNotificationPrompt from './GuestNotificationPrompt.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import {
  daysUntilStayDate,
  formatStayDate,
  getStayStatusMeta,
  isDeadBookingStatus,
  stayStorageSnapshot,
} from './guestStayState.js';
import useGuestStayDeepLink from './useGuestStayDeepLink.js';

function calcNights(checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  const value = Math.round((end - start) / 86400000);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function propertyIconUrl(hotel) {
  return hotel?.appIconUrl
    || hotel?.rooms?.[0]?.imageUrls?.[0]
    || hotel?.rooms?.[0]?.imageUrl
    || '';
}

function formatPropertyTime(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return clean;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return clean;
  return new Date(Date.UTC(2020, 0, 1, hours, minutes)).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: minutes ? '2-digit' : undefined,
    timeZone: 'UTC',
  });
}

function directionsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function PropertyMasthead({ hotel, connectionState = 'live' }) {
  const name = hotel?.name || 'Your Property';
  const iconUrl = propertyIconUrl(hotel);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => setIconFailed(false), [iconUrl]);

  const connectionLabel = connectionState === 'offline'
    ? 'Offline'
    : connectionState === 'connecting'
      ? 'Connecting'
      : 'Live';

  return (
    <header style={styles.propertyMasthead}>
      <div style={styles.propertyIcon}>
        {iconUrl && !iconFailed
          ? <img src={iconUrl} alt="" style={styles.propertyIconImage} onError={() => setIconFailed(true)} />
          : <span>{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div style={styles.propertyIdentity}>
        <span style={styles.propertyEyebrow}>Guest app</span>
        <strong style={styles.propertyName}>{name}</strong>
      </div>
      <span style={styles.connectionStatus} aria-label={`Front Desk connection: ${connectionLabel}`}>
        <span
          className={connectionState === 'live' ? 'guest-property-live-dot' : ''}
          style={{
            ...styles.propertyLiveDot,
            background: connectionState === 'offline' ? '#9CA79E' : connectionState === 'connecting' ? '#D19A32' : '#36A269',
          }}
        />
        <span>{connectionLabel}</span>
      </span>
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
      <div style={styles.introSection}>
        <h1 style={styles.pageTitle}>Your next stay starts here</h1>
        <p style={styles.pageSubtitle}>
          {isStandalone() ? 'Book direct or connect an existing reservation.' : subtitle || 'Book direct and save.'}
        </p>
      </div>
      {(address || phone) && <PropertyDetails hotel={hotel} compact />}
      <button type="button" onClick={onBook} style={{ ...styles.primaryButton, width: '100%', marginBottom: 10 }}>
        Book a room
      </button>
      <button type="button" onClick={onFindReservation} style={styles.secondaryButton}>
        <Search size={17} /> Find my reservation
      </button>
    </div>
  );
}

function StaySwitcher({ stays, activeCode, onSelect }) {
  if (stays.length < 2) return null;
  return (
    <section style={styles.staySwitcher} aria-label="Connected reservations">
      <div style={styles.staySwitcherHeading}>
        <strong style={styles.staySwitcherTitle}>Your reservations</strong>
        <span style={styles.staySwitcherCount}>{stays.length} connected</span>
      </div>
      <div style={styles.staySwitcherList}>
        {stays.map((stay, index) => {
          const selected = stay.code === activeCode;
          const meta = getStayStatusMeta(stay);
          const stayDate = stay.checkin || stay.checkinDate;
          return (
            <button
              type="button"
              key={stay.code}
              onClick={() => onSelect(stay.code)}
              aria-pressed={selected}
              style={{
                ...styles.staySwitcherButton,
                ...(selected ? styles.staySwitcherButtonActive : {}),
              }}
            >
              <span style={styles.staySwitcherTopline}>
                <span
                  aria-hidden="true"
                  style={{
                    ...styles.staySwitcherDot,
                    background: meta.tone === 'dead' ? '#C45A5A' : meta.tone === 'pending' ? '#D19A32' : '#36A269',
                  }}
                />
                {stayDate ? formatStayDate(stayDate, { includeYear: false }) : `Stay ${index + 1}`}
              </span>
              <span style={styles.staySwitcherRoom}>{meta.tone === 'dead' ? meta.label : stay.roomName || `#${String(stay.code).slice(-5)}`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function pendingFallbackCopy(booking, nowMs = Date.now()) {
  const deadline = booking?.pendingUntil ? new Date(booking.pendingUntil) : null;
  const remainingMinutes = deadline && !Number.isNaN(deadline.getTime())
    ? Math.max(0, Math.ceil((deadline.getTime() - nowMs) / 60000))
    : null;
  const action = String(booking?.approvalNoResponseAction || '').toLowerCase() === 'release' ? 'released' : 'confirmed';
  if (remainingMinutes == null) return `If Front Desk does not respond, the request will be ${action} automatically.`;
  if (remainingMinutes <= 0) return 'Front Desk is finalizing the decision now.';
  return `If Front Desk does not respond, the request will be ${action} in about ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`;
}

function StatusHero({ booking, hotelName, firstName, nowMs }) {
  const meta = getStayStatusMeta(booking);
  const checkin = booking?.checkin || booking?.checkinDate;
  const checkout = booking?.checkout || booking?.checkoutDate;
  const checkinTime = formatPropertyTime(booking?.hotel?.checkInTime);
  const daysUntil = daysUntilStayDate(checkin);
  let eyebrow = meta.label;
  let title = 'Your booking is confirmed';
  let body = `${booking?.roomName || 'Your room'} is reserved at ${hotelName}.`;
  let icon = <CheckCircle2 size={22} />;

  if (meta.phase === 'pending') {
    title = 'Front Desk is checking your room';
    body = `Your room is held while ${hotelName} confirms availability. ${pendingFallbackCopy(booking, nowMs)}`;
    icon = <Clock3 size={21} />;
  } else if (meta.phase === 'released') {
    eyebrow = 'Request not confirmed';
    title = 'This room request was released';
    body = `Unfortunately, ${hotelName} could not confirm ${booking?.roomName || 'this room'} for those dates.`;
    icon = <XCircle size={22} />;
  } else if (meta.phase === 'cancelled') {
    title = 'This reservation was cancelled';
    body = booking?.cancellationReason
      ? `Reason from Front Desk: ${booking.cancellationReason}`
      : `${hotelName} cancelled this reservation. Contact Front Desk if you need help.`;
    icon = <XCircle size={22} />;
  } else if (meta.phase === 'checkin_today') {
    title = `Check-in is today${firstName ? `, ${firstName}` : ''}`;
    body = checkinTime ? `You can arrive from ${checkinTime}. Your property details are below.` : 'Your property details are below.';
  } else if (meta.phase === 'checkin_tomorrow') {
    title = `Check-in is tomorrow${firstName ? `, ${firstName}` : ''}`;
    body = checkinTime ? `Check-in begins at ${checkinTime}.` : 'Everything you need for arrival is below.';
  } else if (meta.phase === 'in_stay') {
    title = 'Your stay is underway';
    body = `You are staying through ${formatStayDate(checkout)}. Front Desk is one tap away.`;
  } else if (meta.phase === 'checkout_today') {
    title = 'Check-out is today';
    body = 'Check the property details below for the check-out time or message Front Desk if you need anything.';
  } else if (meta.phase === 'completed') {
    title = 'Thanks for staying with us';
    body = 'This stay is complete. You can still contact Front Desk or book another stay.';
  } else if (daysUntil != null && daysUntil > 1) {
    body = `${booking?.roomName || 'Your room'} is reserved for ${formatStayDate(checkin)}.`;
  }

  const dead = meta.tone === 'dead';
  return (
    <section style={{ ...styles.statusHero, ...(dead ? styles.statusHeroDead : meta.tone === 'pending' ? styles.statusHeroPending : {}) }}>
      <div style={{ ...styles.statusIcon, ...(dead ? styles.statusIconDead : meta.tone === 'pending' ? styles.statusIconPending : {}) }} aria-hidden="true">
        {icon}
      </div>
      <div style={styles.statusCopy}>
        <span style={{ ...styles.statusEyebrow, color: dead ? '#A63F3F' : meta.tone === 'pending' ? '#8A641C' : '#2E7D5B' }}>{eyebrow}</span>
        <h1 style={styles.statusTitle}>{title}</h1>
        <p style={styles.statusBody}>{body}</p>
        {dead && (
          <div style={styles.deadAssurance}>
            <ShieldCheck size={15} />
            <span>
              {booking?.holdStatus === 'released'
                ? 'The temporary card authorization has been released.'
                : 'Any card authorization or payment is being handled automatically.'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function ReservationCard({ booking }) {
  const meta = getStayStatusMeta(booking);
  const checkin = booking?.checkin || booking?.checkinDate;
  const checkout = booking?.checkout || booking?.checkoutDate;
  const nights = booking?.nights || calcNights(checkin, checkout);
  const code = booking?.confirmationCode || booking?.reservationCode;
  const total = Number(booking?.total);
  const payLater = String(booking?.bookingType || '').toLowerCase() === 'paylater';
  const toneStyles = meta.tone === 'dead'
    ? styles.statusBadgeDead
    : meta.tone === 'pending'
      ? styles.statusBadgePending
      : styles.statusBadgeConfirmed;

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.roomName}>{booking?.roomName || 'Your room'}</h2>
        <span style={{ ...styles.statusBadge, ...toneStyles }}>{meta.label}</span>
      </div>
      <div style={styles.datesRow}>
        <div style={styles.dateBlock}>
          <span style={styles.dateLabel}>Check-in</span>
          <span style={styles.dateValue}>{formatStayDate(checkin)}</span>
        </div>
        <ArrowRight size={18} color="#6B7D72" style={{ flexShrink: 0 }} />
        <div style={styles.dateBlock}>
          <span style={styles.dateLabel}>Check-out</span>
          <span style={styles.dateValue}>{formatStayDate(checkout)}</span>
        </div>
        {nights && <span style={styles.nightsPill}>{nights} night{nights === 1 ? '' : 's'}</span>}
      </div>
      {Number.isFinite(total) && (
        <div style={styles.detailRow}>
          <span>{meta.tone === 'dead' ? 'Original stay total' : payLater ? 'Due at property' : 'Stay total'}</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      )}
      <div style={styles.codeRow}>
        <span style={styles.codeLabel}>Confirmation</span>
        <span style={styles.codeValue}>#{code || '—'}</span>
      </div>
    </section>
  );
}

function PropertyDetails({ hotel, compact = false }) {
  const address = String(hotel?.address || '').trim();
  const phone = String(hotel?.phone || '').trim();
  const checkInTime = formatPropertyTime(hotel?.checkInTime);
  const checkOutTime = formatPropertyTime(hotel?.checkOutTime);
  if (!address && !phone && !checkInTime && !checkOutTime) return null;

  return (
    <section style={{ ...styles.card, ...(compact ? { marginTop: 0 } : {}) }}>
      {!compact && <h2 style={styles.sectionTitle}>At the property</h2>}
      {address && (
        <a href={directionsUrl(address)} target="_blank" rel="noreferrer" style={styles.propertyRow}>
          <span style={styles.propertyRowIcon}><MapPin size={18} /></span>
          <span style={styles.propertyRowCopy}>
            <strong>{address}</strong>
            <small>Get directions</small>
          </span>
          <Navigation size={16} color="#2E7D5B" />
        </a>
      )}
      {(checkInTime || checkOutTime) && (
        <div style={styles.timeGrid}>
          {checkInTime && (
            <div style={styles.timeCell}>
              <span>Check-in</span>
              <strong>{checkInTime}</strong>
            </div>
          )}
          {checkOutTime && (
            <div style={styles.timeCell}>
              <span>Check-out</span>
              <strong>{checkOutTime}</strong>
            </div>
          )}
        </div>
      )}
      {phone && (
        <a href={`tel:${phone}`} style={{ ...styles.propertyRow, marginTop: address || checkInTime || checkOutTime ? 10 : 0 }}>
          <span style={styles.propertyRowIcon}><Phone size={18} /></span>
          <span style={styles.propertyRowCopy}>
            <strong>{phone}</strong>
            <small>Call the property</small>
          </span>
          <ChevronRight size={17} color="#6B7D72" />
        </a>
      )}
    </section>
  );
}

export default function GuestHomePage({ hotel: hotelProp }) {
  const {
    guestStay,
    guestStays,
    selectGuestStay,
    updateGuestStays,
    apiBaseUrl,
    hotelId,
  } = useGuest();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCode = searchParams.get('stay') || '';
  const { resolvingStay, requestedStayError } = useGuestStayDeepLink(requestedCode);
  const [bookingsByCode, setBookingsByCode] = useState({});
  const [liveHotel, setLiveHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState('connecting');
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const syncInFlightRef = useRef(null);
  const retrySyncAfterRef = useRef(0);

  const hotel = useMemo(() => ({ ...(hotelProp || {}), ...(liveHotel || {}) }), [hotelProp, liveHotel]);
  const stayRequests = guestStays.length ? guestStays : guestStay ? [guestStay] : [];
  const stayRequestKey = stayRequests.map((stay) => `${stay.code}:${stay.email || ''}`).join('|');

  const syncStays = useCallback(async ({ initial = false } = {}) => {
    if (!hotelId || !stayRequests.length) {
      setLoading(false);
      return null;
    }
    if (syncInFlightRef.current) return syncInFlightRef.current;
    // Honour a 429 window instead of re-polling every 15s, which would keep the
    // bucket saturated and pin the guest on stale reservation state.
    if (Date.now() < retrySyncAfterRef.current) {
      if (initial) setLoading(false);
      return null;
    }
    if (initial) setLoading(true);
    setConnectionState((current) => (current === 'live' ? current : 'connecting'));

    const request = (async () => {
      try {
        const response = await fetchWithTimeout(`${apiBaseUrl}/api/booking/stays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId,
            stays: stayRequests.map((stay) => ({ code: stay.code, email: stay.email || '' })),
          }),
        }, 12000);
        if (response.status === 429) {
          const retrySeconds = Math.max(1, Number(response.headers.get('Retry-After')) || 30);
          retrySyncAfterRef.current = Date.now() + (retrySeconds * 1000);
          throw new Error('Your stays could not refresh.');
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || 'Your stays could not refresh.');
        retrySyncAfterRef.current = 0;

        const nextBookings = {};
        const updates = [];
        (data.bookings || []).forEach((booking) => {
          const localCode = booking.requestedCode || booking.reservationCode;
          nextBookings[localCode] = booking;
          if (booking.reservationCode) nextBookings[booking.reservationCode] = booking;
          const current = stayRequests.find((stay) => stay.code === localCode) || {};
          updates.push({ ...stayStorageSnapshot(booking, current), code: localCode });
        });
        setBookingsByCode(nextBookings);
        if (updates.length) updateGuestStays(updates);
        if (data.hotel) setLiveHotel(data.hotel);
        if (data.serverTime) {
          const serverTime = new Date(data.serverTime).getTime();
          if (Number.isFinite(serverTime)) setServerClockOffset(serverTime - Date.now());
        }
        setError('');
        setConnectionState('live');
        return data;
      } catch (syncError) {
        setError(syncError.message || 'Unable to refresh your stay.');
        setConnectionState('offline');
        return null;
      } finally {
        if (initial) setLoading(false);
        syncInFlightRef.current = null;
      }
    })();
    syncInFlightRef.current = request;
    return request;
  }, [apiBaseUrl, hotelId, stayRequestKey, updateGuestStays]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncStays({ initial: true });
  }, [syncStays]);

  useEffect(() => {
    if (!stayRequests.length) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') syncStays();
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
  }, [stayRequestKey, stayRequests.length, syncStays]);

  // Pending fallback copy is minute-sensitive even when no network event fires.
  useEffect(() => {
    if (!guestStay?.pendingUntil) return undefined;
    const interval = window.setInterval(() => setBookingsByCode((current) => ({ ...current })), 30000);
    return () => window.clearInterval(interval);
  }, [guestStay?.pendingUntil]);

  const selectStay = (code) => {
    selectGuestStay(code);
    if (searchParams.has('stay')) {
      const next = new URLSearchParams(searchParams);
      next.delete('stay');
      setSearchParams(next, { replace: true });
    }
  };

  if (!guestStay?.code) {
    return <PreBookHub hotel={hotel} onBook={() => navigate('/')} onFindReservation={() => navigate('/booking')} />;
  }

  if (resolvingStay || (loading && !bookingsByCode[guestStay.code])) {
    return (
      <div style={styles.page}>
        <PropertyMasthead hotel={hotel} connectionState="connecting" />
        <div style={styles.loadingContainer}><div style={styles.spinner} /><p style={styles.loadingText}>Connecting your stay…</p></div>
      </div>
    );
  }

  if (requestedStayError) {
    return (
      <div style={styles.page}>
        <PropertyMasthead hotel={hotel} connectionState="offline" />
        <div style={styles.emptyContainer}>
          <div style={{ ...styles.emptyIcon, background: '#FCEEEE' }}><CircleAlert size={28} color="#A63F3F" /></div>
          <h1 style={styles.emptyTitle}>This reservation could not open</h1>
          <p style={styles.emptySubtitle}>{requestedStayError}</p>
          <button type="button" style={styles.primaryButton} onClick={() => navigate('/guest/home', { replace: true })}>Open Your Stay</button>
        </div>
      </div>
    );
  }

  const booking = bookingsByCode[guestStay.code] || {
    ...guestStay,
    reservationCode: guestStay.code,
    confirmationCode: guestStay.code,
  };
  const meta = getStayStatusMeta(booking);
  const dead = isDeadBookingStatus(booking.status);
  const firstName = booking.guestFirstName || guestStay.name?.split(' ')[0] || '';
  const confirmationCode = booking.confirmationCode || booking.reservationCode || guestStay.code;

  const addToCalendar = () => downloadStayIcs({
    hotel,
    bookingDetails: { checkin: booking.checkin, checkout: booking.checkout },
    reservationCode: confirmationCode,
  });

  return (
    <div style={styles.page}>
      <PropertyMasthead hotel={hotel} connectionState={connectionState} />
      <StaySwitcher stays={guestStays} activeCode={guestStay.code} onSelect={selectStay} />

      {connectionState === 'offline' && (
        <div style={styles.offlineNotice} role="status">
          <CircleAlert size={16} />
          <span>Showing the last saved details.</span>
          <button type="button" onClick={() => syncStays()}><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      <StatusHero
        booking={{ ...booking, hotel }}
        hotelName={hotel?.name || 'the property'}
        firstName={firstName}
        nowMs={Date.now() + serverClockOffset}
      />

      {!dead && (
        <GuestInstallCard
          hotelName={hotel?.name}
          appIconUrl={propertyIconUrl(hotel)}
          hotelId={hotelId}
          reservationCode={confirmationCode}
          apiBaseUrl={apiBaseUrl}
          touchpoint="guest-home"
          variant="card"
        />
      )}

      {!dead && meta.phase !== 'completed' && (
        <GuestNotificationPrompt apiBaseUrl={apiBaseUrl} hotelId={hotelId} guestStay={guestStay} />
      )}

      <ReservationCard booking={booking} />
      <PropertyDetails hotel={hotel} />

      <div style={styles.actionsRow}>
        {!dead && meta.phase !== 'pending' && meta.phase !== 'completed' && (
          <button type="button" onClick={addToCalendar} style={styles.actionButton}>
            <CalendarPlus size={17} /> <span>Add to Calendar</span>
          </button>
        )}
        <button type="button" onClick={() => navigate(`/guest/messages?stay=${encodeURIComponent(confirmationCode)}`)} style={styles.actionButton}>
          <MessageCircle size={17} /> <span>Front Desk</span>
        </button>
        {dead && hotel?.phone && (
          <a href={`tel:${hotel.phone}`} style={{ ...styles.actionButton, textDecoration: 'none' }}>
            <Phone size={17} /> <span>Call property</span>
          </a>
        )}
      </div>

      <button type="button" onClick={() => navigate('/')} style={styles.bookAgainLink}>
        <span>Book another stay</span><ChevronRight size={16} />
      </button>
      {error && connectionState !== 'offline' && <span style={styles.srOnly}>{error}</span>}
    </div>
  );
}

const keyframes = `
@keyframes guestHomeSpinner { to { transform: rotate(360deg); } }
@keyframes guestLivePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(54,162,105,0); opacity:.82; }
  50% { box-shadow: 0 0 0 4px rgba(54,162,105,.13); opacity:1; }
}
.guest-stay-switcher-list::-webkit-scrollbar { display:none; }
@media (prefers-reduced-motion: reduce) { .guest-property-live-dot { animation:none !important; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('guest-home-fortification-styles')) {
  const style = document.createElement('style');
  style.id = 'guest-home-fortification-styles';
  style.textContent = keyframes;
  document.head.appendChild(style);
}

const font = 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif';
const styles = {
  page: { minHeight: 'calc(100dvh - var(--guest-top-tabs-height, 0px))', boxSizing: 'border-box', padding: '12px 14px 28px', maxWidth: 540, margin: '0 auto', background: 'radial-gradient(circle at 12% -8%,rgba(126,226,184,.22),transparent 34%),radial-gradient(circle at 96% 18%,rgba(76,175,125,.10),transparent 30%),#EFF4F0', color: '#1A2B22', fontFamily: font },
  propertyMasthead: { display: 'flex', alignItems: 'center', gap: 11, minHeight: 58, padding: '9px 12px', border: '1px solid rgba(255,255,255,.8)', borderRadius: 20, background: 'linear-gradient(145deg,rgba(255,255,255,.76),rgba(232,245,238,.56))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.94),0 8px 24px rgba(46,125,91,.10)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)' },
  propertyIcon: { display: 'flex', width: 40, height: 40, flex: '0 0 40px', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,.72)', borderRadius: 13, background: 'linear-gradient(145deg,#4CAF7D,#2E7D5B)', boxShadow: '0 4px 12px rgba(46,125,91,.24)', color: '#fff', fontSize: 17, fontWeight: 800 },
  propertyIconImage: { width: '100%', height: '100%', objectFit: 'cover' },
  propertyIdentity: { display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', lineHeight: 1.16 },
  propertyEyebrow: { color: '#6B7D72', fontSize: 10, fontWeight: 750, letterSpacing: '.06em', textTransform: 'uppercase' },
  propertyName: { overflow: 'hidden', fontSize: 15, fontWeight: 800, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  connectionStatus: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7D72', fontSize: 10.5, fontWeight: 700 },
  propertyLiveDot: { width: 5, height: 5, flex: '0 0 5px', borderRadius: '50%', animation: 'guestLivePulse 2.4s ease-in-out infinite' },
  introSection: { padding: '28px 4px 18px' },
  pageTitle: { margin: 0, fontSize: 28, lineHeight: 1.18, letterSpacing: '-.025em' },
  pageSubtitle: { margin: '7px 0 0', color: '#6B7D72', fontSize: 15, lineHeight: 1.5 },
  staySwitcher: { marginTop: 12, padding: 12, border: '1px solid rgba(216,228,220,.9)', borderRadius: 17, background: 'rgba(255,255,255,.68)', boxShadow: '0 5px 18px rgba(46,125,91,.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
  staySwitcherHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, padding: '0 2px' },
  staySwitcherTitle: { fontSize: 13, fontWeight: 800 },
  staySwitcherCount: { color: '#6B7D72', fontSize: 11, fontWeight: 650 },
  staySwitcherList: { display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  staySwitcherButton: { display: 'flex', minWidth: 112, flex: '0 0 auto', flexDirection: 'column', gap: 3, padding: '9px 12px', border: '1px solid #D8E4DC', borderRadius: 12, background: '#F5F8F6', color: '#52645A', fontFamily: font, textAlign: 'left', cursor: 'pointer' },
  staySwitcherButtonActive: { borderColor: 'rgba(46,125,91,.38)', background: '#E8F5EE', color: '#245F46', boxShadow: 'inset 0 0 0 1px rgba(46,125,91,.08)' },
  staySwitcherTopline: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800 },
  staySwitcherDot: { width: 5, height: 5, borderRadius: '50%' },
  staySwitcherRoom: { maxWidth: 136, overflow: 'hidden', fontSize: 10.5, fontWeight: 650, opacity: .82, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  offlineNotice: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', border: '1px solid #E5D8BD', borderRadius: 13, background: '#FFF8E8', color: '#76591F', fontSize: 12, fontWeight: 650 },
  statusHero: { display: 'flex', alignItems: 'flex-start', gap: 13, margin: '16px 0', padding: 18, border: '1px solid rgba(76,175,125,.22)', borderRadius: 20, background: 'linear-gradient(145deg,rgba(255,255,255,.94),rgba(232,245,238,.82))', boxShadow: '0 8px 24px rgba(46,125,91,.10)' },
  statusHeroPending: { borderColor: '#E7D6AD', background: 'linear-gradient(145deg,#FFFCF3,#FFF6DF)' },
  statusHeroDead: { borderColor: '#EBCACA', background: 'linear-gradient(145deg,#FFF9F9,#FCEEEE)' },
  statusIcon: { display: 'flex', width: 40, height: 40, flex: '0 0 40px', alignItems: 'center', justifyContent: 'center', borderRadius: 13, background: '#DDF1E5', color: '#2E7D5B' },
  statusIconPending: { background: '#F5E8C8', color: '#8A641C' },
  statusIconDead: { background: '#F5DADA', color: '#A63F3F' },
  statusCopy: { minWidth: 0, flex: 1 },
  statusEyebrow: { display: 'block', marginBottom: 4, fontSize: 10.5, fontWeight: 800, letterSpacing: '.055em', textTransform: 'uppercase' },
  // Property names and owner-typed cancellation reasons are free text; an
  // unbroken token (a URL in a reason, a long single-word name) would otherwise
  // push the hero wider than a compact iPhone.
  statusTitle: { margin: 0, fontSize: 20, lineHeight: 1.22, letterSpacing: '-.02em', overflowWrap: 'anywhere' },
  statusBody: { margin: '7px 0 0', color: '#596B61', fontSize: 13.5, lineHeight: 1.52, overflowWrap: 'anywhere' },
  deadAssurance: { display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 11, paddingTop: 10, borderTop: '1px solid rgba(166,63,63,.12)', color: '#795151', fontSize: 11.5, lineHeight: 1.4 },
  card: { marginBottom: 14, padding: 18, border: '1px solid #D8E4DC', borderRadius: 19, background: 'rgba(255,255,255,.92)', boxShadow: '0 3px 14px rgba(46,125,91,.07)' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  roomName: { minWidth: 0, margin: 0, overflow: 'hidden', fontSize: 18, fontWeight: 750, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusBadge: { flexShrink: 0, padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 },
  statusBadgeConfirmed: { background: '#E8F5EE', color: '#2E7D5B' },
  statusBadgePending: { background: '#FFF1C9', color: '#7B5A18' },
  statusBadgeDead: { background: '#FCE4E4', color: '#A13D3D' },
  datesRow: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14, flexWrap: 'wrap' },
  dateBlock: { display: 'flex', flexDirection: 'column', gap: 2 },
  dateLabel: { color: '#6B7D72', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, fontWeight: 700 },
  nightsPill: { marginLeft: 'auto', padding: '4px 9px', borderRadius: 999, background: '#EDF5F0', color: '#2E7D5B', fontSize: 11, fontWeight: 750 },
  detailRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #E6EEE9', color: '#6B7D72', fontSize: 12.5 },
  codeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 11, borderTop: '1px solid #E6EEE9' },
  codeLabel: { color: '#6B7D72', fontSize: 12.5 },
  codeValue: { color: '#245F46', fontFamily: "'DM Mono','SF Mono',Consolas,monospace", fontSize: 13.5, fontWeight: 750, letterSpacing: '.04em' },
  sectionTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 800 },
  propertyRow: { display: 'flex', alignItems: 'center', gap: 10, color: '#1A2B22', textDecoration: 'none' },
  propertyRowIcon: { display: 'flex', width: 36, height: 36, flex: '0 0 36px', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: '#E8F5EE', color: '#2E7D5B' },
  propertyRowCopy: { display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', gap: 2 },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 12 },
  timeCell: { display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px', borderRadius: 12, background: '#F4F8F5' },
  actionsRow: { display: 'flex', gap: 9, marginBottom: 12, flexWrap: 'wrap' },
  actionButton: { display: 'inline-flex', minHeight: 46, flex: '1 1 135px', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box', padding: '12px 13px', border: '1px solid #CFE1D6', borderRadius: 13, background: '#F7FAF8', color: '#2E7D5B', fontFamily: font, fontSize: 13.5, fontWeight: 750, cursor: 'pointer' },
  bookAgainLink: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '13px 4px', border: 0, background: 'transparent', color: '#2E7D5B', fontFamily: font, fontSize: 13.5, fontWeight: 750, cursor: 'pointer' },
  primaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 26px', border: 0, borderRadius: 13, background: 'linear-gradient(135deg,#4CAF7D,#2E7D5B 65%,#245F46)', color: '#fff', fontFamily: font, fontSize: 15, fontWeight: 750, boxShadow: '0 6px 18px rgba(46,125,91,.24)', cursor: 'pointer' },
  secondaryButton: { display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 26px', border: '1px solid #D8E4DC', borderRadius: 13, background: '#F7FAF8', color: '#2E7D5B', fontFamily: font, fontSize: 15, fontWeight: 750, cursor: 'pointer' },
  loadingContainer: { display: 'flex', minHeight: '62vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
  spinner: { width: 34, height: 34, border: '3px solid #D8E4DC', borderTopColor: '#2E7D5B', borderRadius: '50%', animation: 'guestHomeSpinner .8s linear infinite' },
  loadingText: { margin: 0, color: '#6B7D72', fontSize: 14 },
  emptyContainer: { display: 'flex', minHeight: '62vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' },
  emptyIcon: { display: 'flex', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderRadius: '50%', background: '#E8F5EE' },
  emptyTitle: { margin: 0, fontSize: 21 },
  emptySubtitle: { maxWidth: 310, margin: '0 0 15px', color: '#6B7D72', fontSize: 14, lineHeight: 1.5 },
  srOnly: { position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' },
};
