import React from 'react';

// This component no longer holds its own constants.
// It receives them as props.

function PriceBadge({ nights, rates }) {
  if (!rates || nights < 7) {
    // Show the informational message if rates aren't loaded or stay is short
    return (
      <div style={{ padding: '8px 12px', textAlign: 'center', color: '#555', fontSize: '14px', lineHeight: '1.3' }}>
        <strong style={{ color: 'var(--primary-color)' }}>Select 7+ nights to unlock weekly and monthly discounts!</strong>
      </div>
    );
  }

  // Use the passed-in rates to perform calculations
  const WEEK_N = +(rates.WEEKLY / 7).toFixed(2);
  const MONTHLY_NIGHTS_THRESHOLD = 30;

  let discountedTotal = 0;
  if (nights === 28) {
    discountedTotal = rates.MONTHLY;
  } else {
    let discountedTotalRem = nights;
    discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * rates.MONTHLY;
    discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
    discountedTotal += Math.floor(discountedTotalRem / 7) * rates.WEEKLY;
    discountedTotalRem %= 7;
    discountedTotal += discountedTotalRem * WEEK_N;
  }

  discountedTotal = +discountedTotal.toFixed(2);
  const originalTotal = (nights * rates.NIGHTLY).toFixed(2);
  const half = (discountedTotal / 2).toFixed(2);

  const savings = (originalTotal - discountedTotal).toFixed(2);
  
  return (
    <div className="calendar-pricing-wrapper">
      {/* Price Comparison */}
      <div className="calendar-price-comparison">
        <div className="calendar-original-price">
          <span className="price-label">Original Price (at ${rates.NIGHTLY}/night):</span>
          <span className="strikethrough-price">${originalTotal}</span>
        </div>
        <div className="calendar-savings-badge">
          ⬇️ Save ${savings}!
        </div>
        <div className="calendar-discounted-price">
          <span className="price-label">Weekly Discount Total:</span>
          <span className="discount-price">${discountedTotal}</span>
        </div>
      </div>
      
      {/* Reserve for $0 Box */}
      <div className="calendar-reserve-zero-box">
        <div className="reserve-icon-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <div>
          <div className="reserve-title">Reserve for $0 Today</div>
          <div className="reserve-subtitle">Pay ${discountedTotal} When You Arrive</div>
        </div>
      </div>
    </div>
  );
}

export default PriceBadge;
