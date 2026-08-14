import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from './GuestProvider.jsx';
import { PhoneCall, CheckCircle2, Smartphone, DollarSign, CalendarPlus, CalendarClock, PartyPopper, Check, Moon, Clock3, XCircle } from 'lucide-react';
import { trackCallModalDismissed, trackTapToCallFirst } from './trackingService.js';
import GuestInstallCard from './GuestInstallCard.jsx';
import { downloadStayIcs } from './guestMessaging.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import { isStandalone } from './pwaUtils.js';

const formatDateWithSuffix = (date) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  const options = { month: 'short', year: 'numeric', timeZone: 'UTC' };
  const monthYear = new Intl.DateTimeFormat('en-US', options).format(d).replace(',', '');
  return `${monthYear} ${day}${suffix}`;
};

// Single source of truth for the money story (D13). Returns the numbers the
// "Your stay" card and the full breakdown both render, so the promise never
// word-drifts across surfaces.
function getStayMoney(bookingDetails) {
  if (!bookingDetails) return null;
  const { bookingType, total = 0, originalTotal } = bookingDetails;
  if (bookingType === 'trial') {
    return { paidToday: 69, total: originalTotal ?? total, dueAtCheckin: null,
      note: 'Your $69 is 100% credited toward any extended stay — just ask the front desk to extend.', tone: 'good' };
  }
  if (bookingType === 'reserve') {
    return { paidToday: 20, total, dueAtCheckin: total - 20,
      note: 'Your room is guaranteed. The $20 reservation fee is non-refundable.', tone: 'info' };
  }
  if (bookingType === 'payLater') {
    return { paidToday: 0, total, dueAtCheckin: total, holdNote: true,
      note: 'Card verified with a temporary $1 authorization hold. Pay at the front desk when you check in.', tone: 'info' };
  }
  // standard / full / default — split deposit
  return { paidToday: total / 2, total, dueAtCheckin: total / 2, tone: 'good' };
}

const money = (n) => '$' + Number(n || 0).toFixed(2);

function PaymentSummary({ bookingDetails }) {
  const m = getStayMoney(bookingDetails);
  if (!m) return null;
  const { bookingType } = bookingDetails;

  return (
    <div className="stay-details-card" style={{ marginTop: 0 }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1a1a1a' }}>
        Payment Summary
      </h3>

      <div className="detail-row">
        <span className="detail-label">Paid today</span>
        <span className="detail-value" style={{ color: '#2E7D5B', fontWeight: '700' }}>{money(m.paidToday)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">{bookingType === 'trial' ? 'Original stay total' : 'Total stay cost'}</span>
        <span className="detail-value">{money(m.total)}</span>
      </div>
      {m.dueAtCheckin != null && (
        <div className="detail-row">
          <span className="detail-label">Due at check-in</span>
          <span className="detail-value" style={{ fontWeight: '700' }}>{money(m.dueAtCheckin)}</span>
        </div>
      )}

      {m.note && (
        <div style={{
          marginTop: '16px', padding: '12px 14px', borderRadius: '10px',
          background: m.tone === 'good' ? '#eef6f1' : '#f4f7f9',
          border: '1px solid ' + (m.tone === 'good' ? '#cfe6da' : '#e2e8f0'),
          fontSize: '14px', lineHeight: '1.6', color: '#374151',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span style={{ color: '#2E7D5B', flexShrink: 0, marginTop: '1px' }}>
            {m.tone === 'good' ? <PartyPopper size={18} /> : <ShieldCheckLite />}
          </span>
          <span>{m.note}</span>
        </div>
      )}
    </div>
  );
}

// Tiny inline check icon to avoid another import; brand-green.
function ShieldCheckLite() {
  return <Check size={18} />;
}

function ConfirmationPage({ bookingDetails, guestInfo, reservationCode, hotel, apiBaseUrl = '', hotelId }) {
  const navigate = useNavigate();
  const { setGuestStay } = useGuest();
  const [showCallModal, setShowCallModal] = useState(false);
  const [callModalDismissed, setCallModalDismissed] = useState(false);

  const CONFIRMATION_CALL_MODAL_DELAY_MS = 800;
  const hotelPhone = hotel?.phone || '(701) 289-5992';
  const resolvedHotelId = hotelId || hotel?.id;
  const hotelName = hotel?.name || 'us';
  const stayMoney = getStayMoney(bookingDetails);
  const [liveBookingStatus, setLiveBookingStatus] = useState(
    bookingDetails?.confirmationPending === true ? 'pending' : 'confirmed'
  );
  const confirmationPending = liveBookingStatus === 'pending';
  const confirmationReleased = liveBookingStatus === 'released' || liveBookingStatus === 'cancelled';
  const reviewMinutes = Number(bookingDetails?.reviewWindowMinutes || 0);

  useEffect(() => {
    setLiveBookingStatus(bookingDetails?.confirmationPending === true ? 'pending' : 'confirmed');
  }, [bookingDetails?.confirmationPending, reservationCode]);

  useEffect(() => () => {
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    if (!bookingDetails) return;

    const shouldShow =
      bookingDetails.bookingType === 'payLater'
      && !confirmationPending
      && !confirmationReleased
      && !callModalDismissed;

    if (!shouldShow) {
      document.body.style.overflow = '';
      return;
    }

    const timer = setTimeout(() => {
      setShowCallModal(true);
      document.body.style.overflow = 'hidden';
    }, CONFIRMATION_CALL_MODAL_DELAY_MS);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [bookingDetails, callModalDismissed, confirmationPending, confirmationReleased]);

  useEffect(() => {
    if (reservationCode && bookingDetails?.checkout && guestInfo?.email) {
      setGuestStay({
        code: reservationCode,
        email: guestInfo.email,
        checkin: bookingDetails.checkin,
        checkout: bookingDetails.checkout,
        roomName: bookingDetails.roomName || bookingDetails.name || '',
        name: [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ').trim(),
        phone: guestInfo.phone || '',
      });
    }
  }, [reservationCode, bookingDetails, guestInfo, setGuestStay]);

  // Keep the held request live in the installed guest app. Owner decisions,
  // SMS replies, and the no-response rule should update this screen without a
  // Safari refresh or forcing the guest to leave and return.
  useEffect(() => {
    if (!confirmationPending || !reservationCode || !resolvedHotelId || !guestInfo?.email) return undefined;
    let stopped = false;
    let inFlight = false;
    const refreshStatus = async () => {
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const params = new URLSearchParams({
          hotelId: resolvedHotelId,
          code: reservationCode,
          email: guestInfo.email,
        });
        const response = await fetchWithTimeout(`${apiBaseUrl}/api/booking/lookup?${params}`, {}, 10000);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.booking || stopped) return;
        const status = String(data.booking.status || '').toLowerCase();
        if (status === 'released' || status === 'cancelled' || status === 'canceled') {
          setLiveBookingStatus('released');
        } else if (status && status !== 'pending') {
          setLiveBookingStatus('confirmed');
        }
        window.dispatchEvent(new CustomEvent('marketel:guest-refresh', {
          detail: { source: 'booking-status', status },
        }));
      } catch (_) {
        // Email remains the durable fallback; transient polling failures stay quiet.
      } finally {
        inFlight = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') refreshStatus();
    };
    refreshStatus();
    const interval = window.setInterval(refreshStatus, 5000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('marketel:guest-refresh', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('marketel:guest-refresh', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [apiBaseUrl, confirmationPending, guestInfo?.email, reservationCode, resolvedHotelId]);

  const handleDismissCallModal = () => {
    setShowCallModal(false);
    setCallModalDismissed(true);
    document.body.style.overflow = '';
  };

  return (
    <>
      {bookingDetails?.bookingType === 'payLater' && !confirmationPending && !confirmationReleased && showCallModal && (
        <div className="confirmation-call-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-call-modal-sheet">
            <div className="confirmation-call-phone-pulse-wrapper">
              <div className="confirmation-call-phone-pulse">
                <div className="confirmation-call-phone-pulse-ring" />
                <div className="confirmation-call-phone-pulse-ring confirmation-call-phone-pulse-ring--delay" />
                <div className="confirmation-call-phone-inner">
                  <PhoneCall size={22} />
                </div>
              </div>
            </div>

            <h2 className="confirmation-call-title">Your booking is confirmed</h2>
            <p className="confirmation-call-subtitle">
              A team member may call you <strong>within the next few minutes</strong> to go over arrival details and answer any questions.
            </p>

            <div className="confirmation-call-info-rows">
              <a href={`tel:${hotelPhone}`} className="confirmation-call-phone-number-row">
                <div className="confirmation-call-phone-number-top">
                  <div className="confirmation-call-phone-number-icon">
                    <PhoneCall size={18} />
                  </div>
                  <div className="confirmation-call-phone-number-label">We&apos;re calling from</div>
                </div>
                <div
                  className="confirmation-call-phone-number-bottom"
                  onClick={() => trackTapToCallFirst(bookingDetails, hotelPhone)}
                >
                  <div className="confirmation-call-phone-number-digits">{hotelPhone}</div>
                  <div className="confirmation-call-phone-number-tap">Tap to call first →</div>
                </div>
              </a>

              <div className="confirmation-call-info-row">
                <div className="confirmation-call-info-icon confirmation-call-info-icon--green">
                  <CheckCircle2 size={16} />
                </div>
                <div className="confirmation-call-info-text">
                  <strong>Your room is confirmed</strong> — no action needed on your end
                </div>
              </div>
              <div className="confirmation-call-info-row">
                <div className="confirmation-call-info-icon confirmation-call-info-icon--blue">
                  <Smartphone size={16} />
                </div>
                <div className="confirmation-call-info-text">
                  The front desk may call <strong>your phone</strong> if they need any stay details
                </div>
              </div>
              <div className="confirmation-call-info-row">
                <div className="confirmation-call-info-icon confirmation-call-info-icon--amber">
                  <DollarSign size={16} />
                </div>
                <div className="confirmation-call-info-text">
                  <strong>Pay at check-in</strong> — nothing charged today
                </div>
              </div>
            </div>

            <button
              type="button"
              className="confirmation-call-cta-btn"
              onClick={() => {
                trackCallModalDismissed(bookingDetails);
                handleDismissCallModal();
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="confirmation-page-shell">
        <div className="confirmation-container">
          {/* One outcome, one focal point. Pending stays visually distinct from confirmed. */}
          <section
            className={`confirmation-card confirmation-card--outcome ${confirmationPending ? 'is-pending' : confirmationReleased ? 'is-released' : 'is-confirmed'}`}
            aria-live="polite"
          >
          {confirmationPending ? (
            <div className="confirmation-status-icon confirmation-status-icon--pending" aria-hidden="true">
              <Clock3 size={32} strokeWidth={2} />
            </div>
          ) : confirmationReleased ? (
            <div className="confirmation-status-icon confirmation-status-icon--pending confirmation-status-icon--released" aria-hidden="true">
              <XCircle size={32} strokeWidth={2} />
            </div>
          ) : (
            <div className="success-checkmark confirmation-status-icon" aria-hidden="true">
              <svg className="checkmark-icon" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
          )}

          <div className="confirmation-header">
            <h1>{confirmationPending ? 'Your room is being held' : confirmationReleased ? 'This request was released' : 'Your booking is confirmed'}</h1>
            <p className="confirmation-status-copy">
              {confirmationPending
                ? (reviewMinutes
                  ? `We’ll email you with the final status within ${reviewMinutes} minute${reviewMinutes === 1 ? '' : 's'}.`
                  : 'We’ll email you as soon as the property responds.')
                : confirmationReleased
                  ? <>The property couldn’t confirm this room. We sent the details to <strong>{guestInfo.email}</strong>.</>
                : <>A confirmation email was sent to <strong>{guestInfo.email}</strong>.</>}
            </p>
            {reservationCode && (
              <div className="confirmation-reference">
                <span>{confirmationPending || confirmationReleased ? 'Request' : 'Confirmation'}</span>
                <strong>#{reservationCode}</strong>
              </div>
            )}
            {confirmationPending && bookingDetails?.bookingType === 'payLater' && (
              <p className="confirmation-trust-line">
                The $1 authorization is temporary. Nothing has been charged.
              </p>
            )}
          </div>
          </section>

          {isStandalone() && reservationCode && (
            <section style={{
              margin: '0 auto 12px', padding: '14px 15px', borderRadius: 16,
              border: '1px solid rgba(46,125,91,.16)', background: '#f4faf6',
              color: '#173226', textAlign: 'left',
            }}>
              <strong style={{ display: 'block', fontSize: 14 }}>This stay is connected to your app</strong>
              <span style={{ display: 'block', marginTop: 3, color: '#5d6e64', fontSize: 12.5, lineHeight: 1.45 }}>
                Your Stay keeps your booking status, details, and Front Desk messages together.
              </span>
              <div style={{ display: 'flex', marginTop: 11 }}>
                <button type="button" className="stay-summary-card__btn" onClick={() => navigate('/guest/home')}>
                  <Smartphone size={16} /> Open Your Stay
                </button>
              </div>
            </section>
          )}

          {/* 2. YOUR STAY — always visible (was hidden in <details>). The money
              line is the trust payoff and must never be a tap away. */}
          <div className="stay-details-card stay-summary-card">
          <div className="stay-summary-card__head">
            <span className="stay-summary-card__title">{bookingDetails.name || 'Your room'}</span>
            <span className="stay-summary-card__badge">{confirmationPending ? 'Room held' : confirmationReleased ? 'Released' : 'Confirmed'}</span>
          </div>

          <div className="stay-summary-card__dates">
            <div className="stay-summary-card__date">
              <span className="detail-label">Check-in</span>
              <span className="detail-value">{formatDateWithSuffix(bookingDetails.checkin)}</span>
            </div>
            <div className="stay-summary-card__date">
              <span className="detail-label">Check-out</span>
              <span className="detail-value">{formatDateWithSuffix(bookingDetails.checkout)}</span>
            </div>
            <div className="stay-summary-card__nights">
              <Moon size={14} /> {bookingDetails.nights} night{bookingDetails.nights > 1 ? 's' : ''}
            </div>
          </div>

          {stayMoney && (
            <div className="stay-summary-card__money">
              <div className="detail-row">
                <span className="detail-label">Paid today</span>
                <span className="detail-value" style={{ color: '#2E7D5B', fontWeight: 700 }}>{money(stayMoney.paidToday)}</span>
              </div>
              {stayMoney.holdNote && (
                <div className="detail-row">
                  <span className="detail-label">$1 hold</span>
                  <span className="detail-value" style={{ color: '#6b7280' }}>temporary authorization</span>
                </div>
              )}
              {stayMoney.dueAtCheckin != null && (
                <div className="detail-row">
                  <span className="detail-label">Due at check-in</span>
                  <span className="detail-value" style={{ fontWeight: 700 }}>{money(stayMoney.dueAtCheckin)}</span>
                </div>
              )}
            </div>
          )}

          <div className="stay-summary-card__actions">
            <button
              type="button"
              onClick={() => downloadStayIcs({ hotel, bookingDetails, reservationCode })}
              className="stay-summary-card__btn"
            >
              <CalendarPlus size={17} /> Add to calendar
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="stay-summary-card__btn"
            >
              <CalendarClock size={17} /> Extend / rebook
            </button>
          </div>
          </div>

          {/* 3. STAY IN TOUCH — install is secondary, framed as how you reach us */}
          <GuestInstallCard
          hotelName={hotelName}
          appIconUrl={hotel?.appIconUrl}
          hotelId={resolvedHotelId}
          reservationCode={reservationCode}
          apiBaseUrl={apiBaseUrl}
          touchpoint="confirmation-page"
          variant="confirmation"
          headline={`Keep ${hotelName} on your phone`}
          subline="Get stay updates and message the front desk from your home screen."
          />

          {/* 4. Fine print — the only thing that stays collapsed */}
          <details className="confirmation-details">
          <summary>Payment breakdown &amp; policy</summary>
          <div className="confirmation-details__body">
            <PaymentSummary bookingDetails={bookingDetails} />
            {hotel?.cancellationPolicy && (
              <p className="confirmation-details__footnote">{hotel.cancellationPolicy}</p>
            )}
            <p className="confirmation-details__footnote" style={{ marginTop: 12 }}>
              {confirmationPending ? 'Your final status will be sent to ' : confirmationReleased ? 'Your release notice was sent to ' : 'Your confirmation was sent to '}
              <strong style={{ color: '#374151' }}>{guestInfo.email}</strong>.
              Questions? Call {hotelPhone} — we&apos;re happy to help.
            </p>
          </div>
          </details>
        </div>
      </div>
    </>
  );
}

export default ConfirmationPage;
