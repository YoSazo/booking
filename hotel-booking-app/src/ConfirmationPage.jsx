import React from 'react';

// --- Helper to format dates with suffixes (e.g., 1st, 2nd, 3rd) ---
const formatDateWithSuffix = (date) => {
  const d = new Date(date);
  // Using a specific time zone to prevent date shifting issues
  const day = d.getUTCDate(); 
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  const options = { month: 'short', year: 'numeric', timeZone: 'UTC' };
  // Manually construct the string to avoid timezone-related formatting differences
  const monthYear = new Intl.DateTimeFormat('en-US', options).format(d).replace(',', '');
  
  return `${monthYear} ${day}${suffix}`;
};


function ConfirmationPage({ bookingDetails, guestInfo, reservationCode }) {

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        
        <div className="confirmation-header">
          {/* --- UPDATED: Replaced SVG with your logo image --- */}
          <img src="/logo.jpg" alt="Hotel Logo" className="success-icon" />

          <h2>Thank you for booking with us!</h2>
          <p>Your Reservation Code is <strong>#{reservationCode}</strong></p>
          <p>We have sent the Booking Confirmation to your email: <strong>{guestInfo.email}</strong></p>
        </div>

        <div className="stay-details-card">
          {/* --- UPDATED: Wrapped dates in a container for alignment --- */}
          <div className="stay-dates">
            <div className="stay-detail-line">
              Check in: <strong>{formatDateWithSuffix(bookingDetails.checkin)}</strong>
            </div>
            <div className="stay-detail-line">
              Check out: <strong>{formatDateWithSuffix(bookingDetails.checkout)}</strong>
            </div>
          </div>

          <div className="stay-nights">
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M21.5,12.5A9.5,9.5,0,0,1,5.2,20.8a9.5,9.5,0,1,0,11.2-15,9.5,9.5,0,0,1,5.1,6.7Z" fill="currentColor"/>
            </svg>
            <strong>{bookingDetails.nights} Nights</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPage;