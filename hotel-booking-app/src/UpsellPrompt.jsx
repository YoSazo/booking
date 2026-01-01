import React from 'react';

// This component no longer holds its own constants.
// It receives them as props.

function UpsellPrompt({ nights, onConfirm, onDecline, rates }) {
  if (!rates) return null; // Don't render if rates aren't available

  // Scenario 1: 5 or 6 nights (SAVE Money)
  if (nights >= 5) {
    const nightsToAdd = 7 - nights;
    const currentCost = nights * rates.NIGHTLY;
    const savings = (currentCost - rates.WEEKLY).toFixed(2);

    return (
      <div className="upsell-prompt">
        <div className="upsell-message">
          <strong>💰 Save ${savings}!</strong> Add {nightsToAdd} night{nightsToAdd > 1 ? 's' : ''} → Get 7 nights for ${rates.WEEKLY.toFixed(2)}
        </div>
        <div className="upsell-actions">
          <button className="yes-btn" onClick={onConfirm}>Book 7 Nights</button>
          <button className="no-btn" onClick={onDecline}>No Thanks</button>
        </div>
      </div>
    );
  }

  // Scenario 2: 1 to 4 nights (GREAT VALUE)
  if (nights > 0) {
    const nightsToAdd = 7 - nights;
    const currentCost = nights * rates.NIGHTLY;
    const costDifference = rates.WEEKLY - currentCost;
    const pricePerExtraNight = (costDifference / nightsToAdd).toFixed(2);

    return (
      <div className="upsell-prompt">
        <div className="upsell-message">
          <strong>💡 Weekly Deal!</strong> Add {nightsToAdd} nights for ${costDifference.toFixed(2)} more (${pricePerExtraNight}/night)
        </div>
        <div className="upsell-actions">
          <button className="yes-btn" onClick={onConfirm}>Book 7 Nights</button>
          <button className="no-btn" onClick={onDecline}>No Thanks</button>
        </div>
      </div>
    );
  }

  return null;
}

export default UpsellPrompt;
