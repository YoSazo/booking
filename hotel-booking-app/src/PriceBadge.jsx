import React from 'react';

// --- Pricing Settings ---
const NIGHTLY = 59;
const WEEKLY = 250;
const MONTHLY = 950;
const WEEK_N = +(WEEKLY / 7).toFixed(2);
const MIN_NIGHTS_FOR_DEAL = 7;
const MONTHLY_NIGHTS_THRESHOLD = 30;

function PriceBadge({ nights }) {

  // If 7 or more nights are selected, calculate and show the deal.
  if (nights >= MIN_NIGHTS_FOR_DEAL) {
    let discountedTotalRem = nights;
    let discountedTotal = 0;
    discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * MONTHLY;
    discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
    discountedTotal += Math.floor(discountedTotalRem / 7) * WEEKLY;
    discountedTotalRem %= 7;
    discountedTotal += discountedTotalRem * WEEK_N;
    discountedTotal = +discountedTotal.toFixed(2);

    const originalTotal = (nights * NIGHTLY).toFixed(2);
    const half = (discountedTotal / 2).toFixed(2);

    return (
      <div style={{ textAlign: 'center', fontSize: '16px', lineHeight: '1.5' }}>
        <div style={{ fontSize: '15px', color: '#888', marginBottom: '8px' }}>
          Original Price: ${originalTotal}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
          Discount Total: ${discountedTotal.toFixed(2)}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '8px' }}>
          Only Pay ${half} Today
        </div>
      </div>
    );
  }

  // Otherwise, show the informational message.
  return (
    <div style={{ padding: '8px 12px', textAlign: 'center', color: '#555', fontSize: '14px', lineHeight: '1.3' }}>
      <strong style={{ color: 'var(--primary-color)' }}>Select 7+ nights to unlock weekly and monthly discounts!</strong>
    </div>
  );
}

export default PriceBadge;