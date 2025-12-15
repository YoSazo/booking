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

  return (
    <div style={{ padding: '12px', background: '#f8f9fa', textAlign: 'center', fontSize: '16px', lineHeight: '1.4', borderRadius: '6px' }}>
      <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>
        Original Price (at ${rates.NIGHTLY}/night): <del>${originalTotal}</del>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
        Your Discounted Total: ${discountedTotal}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>
        Reserve for $0 Today
      </div>
      <div style={{ fontSize: '16px', color: '#666', marginTop: '8px' }}>
        Pay ${discountedTotal} When You Arrive
      </div>
    </div>
  );
}

export default PriceBadge;
