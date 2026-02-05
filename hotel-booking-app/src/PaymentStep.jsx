import React from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';
import { ShieldCheck } from 'lucide-react';

const PaymentStep = ({
  clientSecret,
  selectedPlan,
  paymentMethod,
  setPaymentMethod,
  walletType,
  formData,
  handleChange,
  hasAttemptedSubmit,
  setHasAttemptedSubmit,
  errorMessage,
  setErrorMessage,
  setIsProcessing,
  setIsProcessingTrial,
  bookingDetails,
  errorMessageRef,
  getWalletLogoInfo,
}) => {
  return (
    <div className="payment-wrapper">
      {/* Stripe Badge & Security - Combined Header */}
      <div style={{
        background: 'linear-gradient(to right, rgb(248, 250, 252), white)',
        borderBottom: '1px solid rgb(226, 232, 240)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#475569',
          flex: '1 1 auto',
          minWidth: '200px'
        }}>
          <svg 
            width="22" 
            height="22" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            Guaranteed safe and secure checkout
          </span>
        </div>
        
        <div style={{
          background: '#334155',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Powered by</span>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            letterSpacing: '-0.5px' 
          }}>
            stripe
          </span>
        </div>
      </div>
      
      {/* Only show money-back guarantee for non-reserve and non-payLater bookings */}
      {selectedPlan !== 'reserve' && selectedPlan !== 'payLater' && (
        <div className="money-back-guarantee">
          <div className="guarantee-content">
            <div className="guarantee-icon">🛡️</div>
            <div className="guarantee-text">
              <div className="guarantee-title">100% Money-Back Guarantee</div>
              <div className="guarantee-description">
                If the room isn't exactly what we promised when you arrive, we'll refund 100% of what you paid on the spot. No questions asked.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!clientSecret ? (
        <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p>
      ) : (
        <>
          {walletType ? (
            // Show tabs only if wallet is available
            <div className="payment-method-tabs">
              <button 
                type="button" 
                className={`tab-button ${paymentMethod === 'card' ? 'active' : ''}`} 
                onClick={() => {
                  setPaymentMethod('card');
                  setHasAttemptedSubmit(false);
                  setErrorMessage('');
                  setIsProcessing(false);
                  setIsProcessingTrial(false);
                }}
              >
                <img src="/credit.svg" alt="Card" className="credit-card-logo" /> Card
              </button>
              <button 
                type="button" 
                className={`tab-button ${paymentMethod === 'wallet' ? 'active' : ''}`} 
                onClick={() => {
                  setPaymentMethod('wallet');
                  setHasAttemptedSubmit(false);
                  setErrorMessage('');
                  setIsProcessing(false);
                  setIsProcessingTrial(false);
                }}
              >
                <img 
                  src={getWalletLogoInfo().src} 
                  alt={getWalletLogoInfo().alt} 
                  style={{ height: '28px', width: 'auto' }} 
                /> 
                {walletType}
              </button>
            </div>
          ) : (
            // No wallet - show card only header
            <div className="payment-method-header">
              <img src="/credit.svg" alt="Card" className="credit-card-logo" />
              <span>Pay with Card</span>
            </div>
          )}
          
          <div className="checkout-payment-section">
            {/* Card details */}
            <div className="card-fields-section">
              <div className="card-field-group">
                <label className="card-field-label">Card Number</label>
                <div className="card-field-wrapper">
                  <CardNumberElement 
                    className="stripe-element card-number-element"
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#1e293b',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontWeight: '500',
                          '::placeholder': { color: '#94a3b8' },
                        },
                        invalid: { color: '#dc2626' },
                      },
                      showIcon: true,
                    }}
                  />
                </div>
              </div>

              <div className="card-field-row">
                <div className="card-field-group">
                  <label className="card-field-label">Expiry</label>
                  <div className="card-field-wrapper">
                    <CardExpiryElement 
                      className="stripe-element"
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#1e293b',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                            fontWeight: '500',
                            '::placeholder': { color: '#94a3b8' },
                          },
                          invalid: { color: '#dc2626' },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="card-field-group">
                  <label className="card-field-label">CVC</label>
                  <div className="card-field-wrapper">
                    <CardCvcElement 
                      className="stripe-element"
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#1e293b',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                            fontWeight: '500',
                            '::placeholder': { color: '#94a3b8' },
                          },
                          invalid: { color: '#dc2626' },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="billing-address-section">
              <h4 className="billing-address-title">Billing Address</h4>
              <div className="billing-address-fields">
                <div className="billing-field-group full-width">
                  <label className="billing-field-label">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="123 Main St"
                    value={formData.address}
                    onChange={handleChange}
                    className="billing-input"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '500',
                      border: '2px solid #e0e0e0',
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      backgroundColor: '#fff',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0070f3';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="billing-field-group full-width">
                  <label className="billing-field-label">City</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                    className="billing-input"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '500',
                      border: '2px solid #e0e0e0',
                      borderRadius: '10px',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      backgroundColor: '#fff',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0070f3';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="billing-field-row">
                  <div className="billing-field-group">
                    <label className="billing-field-label">State</label>
                    <input
                      type="text"
                      name="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleChange}
                      className="billing-input"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        fontWeight: '500',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0070f3';
                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="billing-field-group">
                    <label className="billing-field-label">ZIP Code</label>
                    <input
                      type="text"
                      name="zip"
                      placeholder="ZIP"
                      value={formData.zip}
                      onChange={handleChange}
                      className="billing-input"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        fontWeight: '500',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0070f3';
                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* WHY WE NEED YOUR CARD - Critical explanation banner */}
            {selectedPlan === 'payLater' && (
              <div className="why-card-banner">
                <div className="why-card-banner__row">
                  <ShieldCheck size={24} strokeWidth={2.5} className="why-card-banner__icon" />
                  <div>
                    <div className="why-card-banner__title">
                      Why we need your card
                    </div>
                    <div className="why-card-banner__body">
                      Please enter your card details above.
                      <br />
                      <strong>$1 temporary hold (released immediately).</strong>
                      <br />
                      This confirms a valid card to prevent fake bookings and secure your room.
                      <br /><br />
                      ✅ <strong>$1 hold released immediately</strong><br />
                      ✅ <strong>You won't be charged today</strong><br />
                      ✅ <strong>Pay ${bookingDetails?.total?.toFixed(2)} when you arrive</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet selected indicator - inside card section */}
            {paymentMethod === 'wallet' && walletType && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                marginTop: '16px'
              }}>
                <img 
                  src={getWalletLogoInfo().src} 
                  alt={getWalletLogoInfo().alt} 
                  style={{ height: '32px' }} 
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '600', color: '#333' }}>
                    {walletType} Selected
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    A payment modal will appear after clicking the final button
                  </p>
                </div>
              </div>
            )}
          </div>

          {paymentMethod === 'wallet' && !walletType && (
            <div className="wallet-info-box">
              <p>Select your wallet provider above.</p>
            </div>
          )}
        </>
      )}
      
      {errorMessage && hasAttemptedSubmit && (
        <div 
          ref={errorMessageRef}
          className="error-message payment-error"
          style={{
            padding: '16px',
            marginTop: '20px',
            backgroundColor: '#fee',
            border: '2px solid #dc3545',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
};

export default PaymentStep;
