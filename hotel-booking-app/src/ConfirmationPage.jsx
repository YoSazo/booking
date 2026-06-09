import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, CheckCircle2, Smartphone, DollarSign, MessageSquare, Send, CalendarPlus, CalendarClock } from 'lucide-react';
import { trackCallModalDismissed, trackTapToCallFirst } from './trackingService.js';
import InstallAppBanner from './InstallAppBanner.jsx';

const QUICK_REQUESTS = [
  'Early check-in',
  'Late check-in',
  'Late arrival (after 9pm)',
  'Ground floor room',
  'Quiet room',
  'Extra towels',
];

// Build & download an .ics calendar file for the stay so the guest can add it
// to Apple/Google Calendar in one tap.
function downloadStayIcs({ hotel, bookingDetails, reservationCode }) {
  const toIcsDate = (d) => {
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const name = hotel?.name || 'Your stay';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marketel//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reservationCode || Date.now()}@marketel`,
    `DTSTAMP:${toIcsDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${toIcsDate(bookingDetails.checkin)}`,
    `DTEND;VALUE=DATE:${toIcsDate(bookingDetails.checkout)}`,
    `SUMMARY:${esc(`Stay at ${name}`)}`,
    `DESCRIPTION:${esc(`Confirmation #${reservationCode || ''}${hotel?.phone ? `\nQuestions? Call ${hotel.phone}` : ''}`)}`,
    hotel?.address ? `LOCATION:${esc(hotel.address)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-stay.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

function ConfirmationPage({ bookingDetails, guestInfo, reservationCode, hotel, apiBaseUrl = '', hotelId }) {
  const navigate = useNavigate();
  const [showCallModal, setShowCallModal] = useState(false);
  const [callModalDismissed, setCallModalDismissed] = useState(false);

  // Guest → owner messaging state
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');

  const CONFIRMATION_CALL_MODAL_DELAY_MS = 800; // Brief pause so page is visible before modal
  const hotelPhone = hotel?.phone || '(701) 289-5992';
  const resolvedHotelId = hotelId || hotel?.id;

  const toggleRequest = (label) => {
    setSelectedRequests((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  };

  const handleSendMessage = async () => {
    const body = messageText.trim();
    if (!body && selectedRequests.length === 0) return;
    if (!resolvedHotelId) { setMessageError('Messaging is unavailable for this booking.'); return; }
    setSendingMessage(true);
    setMessageError('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/guest-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: resolvedHotelId,
          reservationCode,
          body,
          requests: selectedRequests,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessageSent(true);
      } else {
        setMessageError(data.message || 'Could not send. Please call us instead.');
      }
    } catch (e) {
      setMessageError('Could not send. Please call us instead.');
    }
    setSendingMessage(false);
  };

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
        {hotel?.cancellationPolicy || <>✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotelPhone} — we're happy to help!</>}
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

          {/* Quick actions: add to calendar + book again / extend */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => downloadStayIcs({ hotel, bookingDetails, reservationCode })}
              style={{
                flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '13px 14px', borderRadius: '12px', cursor: 'pointer',
                border: '1px solid #d7e3dc', background: '#f5f9f6', color: '#2E7D5B',
                fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              <CalendarPlus size={17} /> Add to Calendar
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '13px 14px', borderRadius: '12px', cursor: 'pointer',
                border: '1px solid #d7e3dc', background: '#f5f9f6', color: '#2E7D5B',
                fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              <CalendarClock size={17} /> Extend / Book again
            </button>
          </div>

          {/* Message the front desk */}
          <div className="stay-details-card" style={{ marginTop: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '700', marginBottom: '6px', color: '#1a1a1a' }}>
              <MessageSquare size={18} /> Message the front desk
            </h3>
            {messageSent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 12px', background: '#e8f7ee', borderRadius: '10px', marginTop: '10px' }}>
                <CheckCircle2 size={20} style={{ color: '#28a745', flexShrink: 0 }} />
                <div style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.5 }}>
                  <strong>Sent!</strong> The front desk got your message and will follow up. You can also call {hotelPhone}.
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>
                  Have a request or question? Send it straight to the property — they'll see it instantly.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {QUICK_REQUESTS.map((label) => {
                    const active = selectedRequests.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleRequest(label)}
                        style={{
                          padding: '8px 12px', borderRadius: '999px', cursor: 'pointer',
                          fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                          border: active ? '1px solid #2E7D5B' : '1px solid #d7dde3',
                          background: active ? '#2E7D5B' : '#fff',
                          color: active ? '#fff' : '#374151',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {active ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Add a note (optional) — e.g. arriving around 11pm, traveling with a pet…"
                  rows={3}
                  maxLength={2000}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px',
                    borderRadius: '10px', border: '1px solid #d7dde3', fontSize: '14px',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, color: '#1a1a1a',
                  }}
                />
                {messageError && (
                  <p style={{ fontSize: '13px', color: '#c0392b', margin: '8px 0 0' }}>{messageError}</p>
                )}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || (!messageText.trim() && selectedRequests.length === 0)}
                  style={{
                    width: '100%', marginTop: '12px', padding: '14px', borderRadius: '12px',
                    border: 'none', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: sendingMessage ? 'wait' : 'pointer',
                    background: (!messageText.trim() && selectedRequests.length === 0) ? '#b8c4bd' : '#2E7D5B',
                    color: '#fff',
                    opacity: sendingMessage ? 0.7 : 1,
                  }}
                >
                  <Send size={16} /> {sendingMessage ? 'Sending…' : 'Send to front desk'}
                </button>
              </>
            )}
          </div>

          {/* Save this property to the home screen */}
          <InstallAppBanner
            hotelName={hotel?.name}
            appIconUrl={hotel?.appIconUrl}
            hotelId={resolvedHotelId}
          />
        </div>
      </div>
    </>
  );
}

export default ConfirmationPage;