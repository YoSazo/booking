import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from './GuestProvider.jsx';
import { PhoneCall, CheckCircle2, Smartphone, DollarSign, CalendarPlus, CalendarClock, PartyPopper, Check, Moon } from 'lucide-react';
import { trackCallModalDismissed, trackTapToCallFirst } from './trackingService.js';
import GuestInstallCard from './GuestInstallCard.jsx';
import { downloadStayIcs } from './guestMessaging.jsx';

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
      note: 'Card verified with a $1 hold (released immediately). Pay at the front desk when you check in.', tone: 'info' };
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

  useEffect(() => () => {
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    if (!bookingDetails) return;

    const shouldShow =
      bookingDetails.bookingType === 'payLater' && !callModalDismissed;

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
  }, [bookingDetails, callModalDismissed]);

  useEffect(() => {
    if (reservationCode && bookingDetails?.checkout && guestInfo?.email) {
      setGuestStay({
        code: reservationCode,
        email: guestInfo.email,
        checkout: bookingDetails.checkout,
        name: [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ').trim(),
        phone: guestInfo.phone || '',
      });
    }
  }, [reservationCode, bookingDetails, guestInfo, setGuestStay]);

  const handleDismissCallModal = () => {
    setShowCallModal(false);
    setCallModalDismissed(true);
    document.body.style.overflow = '';
  };

  return (
    <>
      {bookingDetails?.bookingType === 'payLater' && showCallModal && (
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

            <h2 className="confirmation-call-title">We&apos;ll call to confirm</h2>
            <p className="confirmation-call-subtitle">
              A team member will call you <strong>within the next few minutes</strong> to confirm your arrival details and answer any questions.
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
                  <strong>Your room is reserved</strong> — no action needed on your end
                </div>
              </div>
              <div className="confirmation-call-info-row">
                <div className="confirmation-call-info-icon confirmation-call-info-icon--blue">
                  <Smartphone size={16} />
                </div>
                <div className="confirmation-call-info-text">
                  Expect a call to <strong>your phone</strong> from our front desk soon
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
              Got It — I&apos;ll Watch for the Call
            </button>
          </div>
        </div>
      )}

      <div className="confirmation-container">
        {/* 1. Compact success + code (D4: success is a header, not a full-bleed hero) */}
        <div className="confirmation-card confirmation-card--slim">
          <div className="success-checkmark">
            <svg className="checkmark-icon" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <div className="confirmation-header">
            <h2>Booking confirmed</h2>
            <p className="confirmation-code">Confirmation code <strong>#{reservationCode}</strong></p>
          </div>
        </div>

        {/* 2. YOUR STAY — always visible (was hidden in <details>). The money
            line is the trust payoff and must never be a tap away. */}
        <div className="stay-details-card stay-summary-card">
          <div className="stay-summary-card__head">
            <span className="stay-summary-card__title">{bookingDetails.name || 'Your room'}</span>
            <span className="stay-summary-card__badge">Confirmed</span>
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
                  <span className="detail-value" style={{ color: '#6b7280' }}>released immediately</span>
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
          variant="hero"
          headline={`Stay in touch — add ${hotelName} to your home screen`}
          subline="Message the front desk and get check-in updates. No app store, about 3 seconds."
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
              A confirmation email was sent to <strong style={{ color: '#374151' }}>{guestInfo.email}</strong>.
              Questions? Call {hotelPhone} — we&apos;re happy to help.
            </p>
          </div>
        </details>
      </div>
    </>
  );
}

export default ConfirmationPage;
