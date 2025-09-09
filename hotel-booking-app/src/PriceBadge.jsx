import React from 'react';

const NIGHTLY = 59;
const WEEKLY = 250;
const MONTHLY = 950;
const WEEK_N = +(WEEKLY / 7).toFixed(2);
const MIN_NIGHTS_FOR_DEAL = 7;
const MONTHLY_NIGHTS_THRESHOLD = 30;

function PriceBadge({ nights }) {
  // If no valid stay is selected, show the prompt to select more nights.
  if (nights < MIN_NIGHTS_FOR_DEAL) {
    return (
      <div style={{ padding: '8px 12px', textAlign: 'center', color: '#555', fontSize: '14px', lineHeight: '1.3' }}>
        <strong style={{ color: 'var(--primary-color)' }}>Select 7+ nights to unlock weekly and monthly discounts!</strong>
      </div>
    );
  }

  // --- Simplified Calculation Logic ---
  let discountedTotal = 0;

  // Special case for our 28-day "monthly" rate
  if (nights === 28) {
    discountedTotal = MONTHLY;
  } else {
    // Standard tiered calculation for all other stays of 7+ nights
    let discountedTotalRem = nights;
    discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * MONTHLY;
    discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
    discountedTotal += Math.floor(discountedTotalRem / 7) * WEEKLY;
    discountedTotalRem %= 7;
    discountedTotal += discountedTotalRem * WEEK_N;
  }

  // Ensure the final number is rounded to two decimal places
  discountedTotal = +discountedTotal.toFixed(2);

  const originalTotal = (nights * NIGHTLY).toFixed(2);
  const half = (discountedTotal / 2).toFixed(2);

  // Return the calculated price badge
  return (
    <div style={{ padding: '12px', background: '#f8f9fa', textAlign: 'center', fontSize: '16px', lineHeight: '1.4', borderRadius: '6px' }}>
      <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>
        Original Price (at $59/night): <del>${originalTotal}</del>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
        Your Discounted Total: ${discountedTotal}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>
        Only Pay ${half} today
      </div>
    </div>
  );
}

export default PriceBadge;