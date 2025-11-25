// hotel-booking-app/src/PlanPage.jsx
import React, { useState } from 'react';

function PlanPage({ bookingDetails, onBack, onContinue, showTrialOption }) {
  const [selectedPlan, setSelectedPlan] = useState('full'); // 'full' or 'trial'

  const handleContinue = () => {
    onContinue(selectedPlan);
  };

  const priceToday = bookingDetails.total / 2;
  const balanceDue = bookingDetails.total / 2;

  // Calculate trial dates
  const checkinDate = bookingDetails.checkin instanceof Date 
    ? bookingDetails.checkin 
    : new Date(bookingDetails.checkin);
  
  const trialCheckoutDate = new Date(checkinDate);
  trialCheckoutDate.setDate(trialCheckoutDate.getDate() + 1);

  return (
    <>
      <div className="static-banner">
        ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call (701) 289-5992 — we're happy to help!
      </div>
      
      <div className="guest-info-container">
        <div className="guest-info-header">
          <button onClick={onBack} className="back-button">{'< Back to Info'}</button>
          <h1>Choose Your Plan</h1>
        </div>

        <div className="checkout-progress-bar">
          <div className="progress-step completed">
            <div className="step-circle"></div><span className="step-name">Review Cart</span>
          </div>
          <div className="progress-step completed">
            <div className="step-circle"></div><span className="step-name">Info</span>
          </div>
          <div className="progress-step completed active">
            <div className="step-circle"></div><span className="step-name">Plan</span>
          </div>
          <div className="progress-step">
            <div className="step-circle"></div><span className="step-name">Payment</span>
          </div>
        </div>

        <div className="payment-options-container">
          {/* Full Booking Option */}
          <label 
            className={`payment-option-radio ${selectedPlan === 'full' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('full')}
          >
            <input 
              type="radio" 
              name="plan" 
              value="full" 
              checked={selectedPlan === 'full'}
              onChange={() => setSelectedPlan('full')}
            />
            <div className="payment-option primary">
              <div className="option-header">
                <span className="option-title">Complete Your Booking</span>
                <span className="option-badge">Most Popular</span>
              </div>
              <div className="option-price">
                Pay ${priceToday.toFixed(2)} Today
              </div>
              <div className="option-details">
                {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <br />
                <strong>{bookingDetails.nights} nights</strong>
                <br />
                Balance ${balanceDue.toFixed(2)} due at check-in
              </div>
            </div>
          </label>

          {/* Trial Night Option - only show if 7+ nights */}
          {showTrialOption && bookingDetails.nights >= 7 && (
            <label 
              className={`payment-option-radio ${selectedPlan === 'trial' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('trial')}
            >
              <input 
                type="radio" 
                name="plan" 
                value="trial" 
                checked={selectedPlan === 'trial'}
                onChange={() => setSelectedPlan('trial')}
              />
              <div className="payment-option secondary">
                <div className="option-header">
                  <span className="option-title">🔍 Try 1 Night First</span>
                </div>
                <div className="option-price trial">
                  Only $69
                </div>
                <div className="option-details">
                  {checkinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {trialCheckoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <br />
                  <strong>1 night trial</strong>
                  <br />
                  See the room, then extend to your full stay
                  <br />
                  <strong style={{ color: '#28a745' }}>💰 Your $69 is fully credited if you extend</strong>
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="checkout-cta-container">
        <button 
          type="button" 
          className="btn btn-confirm" 
          onClick={handleContinue}
        >
          Proceed to Payment
        </button>
      </div>
    </>
  );
}

export default PlanPage;