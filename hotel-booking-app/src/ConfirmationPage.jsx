import React from 'react';

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

function ConfirmationPage({ bookingDetails, guestInfo, reservationCode }) {
  return (
    <>
      <div className="static-banner">
        ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call (701) 289-5992 — we're happy to help!
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
                  Your card has been validated. If you don't show up for your reservation, a $75.90 no-show fee will be charged.
                  <br /><br />
                  ✅ <strong>When you check in:</strong> Pay {"$" + bookingDetails.total?.toFixed(2)} at the front desk
                  <br />
                  ❌ <strong>If you don't show:</strong> $75.90 no-show fee applies
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