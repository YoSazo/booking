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
        <h4>You're {nightsToAdd} Night{nightsToAdd > 1 ? 's' : ''} Away From a Deal!</h4>
        <p>
          Add {nightsToAdd} more night{nightsToAdd > 1 ? 's' : ''} to your stay and{' '}
          <span className="highlight-green">SAVE ${savings}</span>.
        </p>
        <p>
          Get a full week for <span className="highlight-green">${rates.WEEKLY.toFixed(2)}</span> instead of paying{' '}
          <span className="highlight-gray">${currentCost.toFixed(2)} for {nights} nights</span>.
        </p>
        <div className="upsell-actions">
          <button className="yes-btn" onClick={onConfirm}>YES!</button>
          <button className="no-btn" onClick={onDecline}>No</button>
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
        <h4>💡 Unlock a Weekly Discount!</h4>
        <p>
          Add {nightsToAdd} more nights for only{' '}
          <span className="highlight-green">${costDifference.toFixed(2)} more</span> and stay a full week.
        </p>
        <p>
          That's like getting your extra nights for{' '}
          <span className="highlight-green">just ${pricePerExtraNight} each!</span>
        </p>
        <div className="upsell-actions">
          <button className="yes-btn" onClick={onConfirm}>YES!</button>
          <button className="no-btn" onClick={onDecline}>No</button>
        </div>
      </div>
    );
  }

  return null;
}

export default UpsellPrompt;
