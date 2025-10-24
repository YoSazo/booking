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
        </div>
      </div>
    </>
  );
}

export default ConfirmationPage;