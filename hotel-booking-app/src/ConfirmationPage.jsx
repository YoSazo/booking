import React, { useEffect, useState } from 'react';
import { PhoneCall, CheckCircle2, Smartphone, DollarSign } from 'lucide-react';
import { trackCallModalDismissed, trackTapToCallFirst } from './trackingService.js';

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

function ConfirmationPage({ bookingDetails, guestInfo, reservationCode, hotel }) {
  const [showCallModal, setShowCallModal] = useState(false);
  const [callModalDismissed, setCallModalDismissed] = useState(false);

  const CONFIRMATION_CALL_MODAL_DELAY_MS = 800; // Brief pause so page is visible before modal
  const hotelPhone = hotel?.phone || '(701) 289-5992';

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

  const handleDismissCallModal = () => {
    setShowCallModal(false);
    setCallModalDismissed(true);
    document.body.style.overflow = '';
  };

  return (
    <>
      {/* Confirmation Call Modal - Pay Later bookings */}
      {bookingDetails?.bookingType === 'payLater' && showCallModal && (
        <div className="confirmation-call-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-call-modal-sheet">
            {/* Pulsing phone icon */}
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
              {/* Phone number callout */}
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

      <div className="static-banner" style={{ marginTop: '16px' }}>
        ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotelPhone} — we're happy to help!
      </div>

      <div className="confirmation-container">
        <div className="confirmation-card">
          {/* Success checkmark */}
          <div className="success-checkmark">
            <svg className="checkmark-icon" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>

          <div className="confirmation-header">
            <h2>Booking Confirmed!</h2>
            <p className="confirmation-code">Confirmation Code: <strong>#{reservationCode}</strong></p>
            <p className="confirmation-email">A confirmation email has been sent to <strong>{guestInfo.email}</strong></p>
          </div>

          <div className="stay-details-card">
            <div className="detail-row">
              <span className="detail-label">Check-in</span>
              <span className="detail-value">{formatDateWithSuffix(bookingDetails.checkin)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Check-out</span>
              <span className="detail-value">{formatDateWithSuffix(bookingDetails.checkout)}</span>
            </div>
            <div className="detail-row nights-row">
              <span className="detail-label">
                <img src="/moon.png" alt="Nights" className="moon-icon" />
                Duration
              </span>
              <span className="detail-value">{bookingDetails.nights} Night{bookingDetails.nights > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Payment Summary based on booking type */}
          <div className="stay-details-card" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1a1a1a' }}>
              Payment Summary
            </h3>
            
            {bookingDetails.bookingType === 'trial' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Paid Today</span>
                  <span className="detail-value" style={{ color: '#28a745', fontWeight: '700' }}>$69.00</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Original Stay Total</span>
                  <span className="detail-value">{"$" + bookingDetails.originalTotal?.toFixed(2)}</span>
                </div>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#e7f3ff', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <strong>🎉 Trial Night Booked!</strong>
                  <br />
                  Your $69 is <strong>100% credited</strong> toward any extended stay. Just come to the front desk to extend!
                </div>
              </>
            )}

            {bookingDetails.bookingType === 'reserve' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Paid Today</span>
                  <span className="detail-value" style={{ color: '#28a745', fontWeight: '700' }}>$20.00</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Stay Cost</span>
                  <span className="detail-value">{"$" + bookingDetails.total?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due at Check-in</span>
                  <span className="detail-value" style={{ fontWeight: '700' }}>{"$" + (bookingDetails.total - 20).toFixed(2)}</span>
                </div>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#fff3cd', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <strong>⚠️ Room Reserved!</strong>
                  <br />
                  Your room is guaranteed. Non-refundable $20 reservation fee applied.
                </div>
              </>
            )}

            {bookingDetails.bookingType === 'payLater' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Paid Today</span>
                  <span className="detail-value" style={{ color: '#17a2b8', fontWeight: '700' }}>$0.00</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Stay Cost</span>
                  <span className="detail-value">{"$" + bookingDetails.total?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due at Check-in</span>
                  <span className="detail-value" style={{ fontWeight: '700' }}>{"$" + bookingDetails.total?.toFixed(2)}</span>
                </div>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#fff3cd', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <strong>⚠️ No-Show Policy</strong>
                  <br />
                  Your card has been validated with a $1 temporary hold (released immediately). If you don't show up, only the $1 verification fee applies.
                  <br /><br />
                  ✅ <strong>When you check in:</strong> Pay {"$" + bookingDetails.total?.toFixed(2)} at the front desk
                  <br />
                  ❌ <strong>If you don't show:</strong> $1 verification fee applies
                </div>
              </>
            )}

            {(!bookingDetails.bookingType || bookingDetails.bookingType === 'standard' || bookingDetails.bookingType === 'full') && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Paid Today</span>
                  <span className="detail-value" style={{ color: '#28a745', fontWeight: '700' }}>{"$" + (bookingDetails.total / 2).toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Stay Cost</span>
                  <span className="detail-value">{"$" + bookingDetails.total?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due at Check-in</span>
                  <span className="detail-value" style={{ fontWeight: '700' }}>{"$" + (bookingDetails.total / 2).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmationPage;