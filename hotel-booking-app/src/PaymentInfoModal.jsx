import React, { useEffect } from 'react';

function PaymentInfoModal({ onClose, hotel, selectedPlan, priceToday, balanceDue }) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const getPaymentAmount = () => {
    if (selectedPlan === 'trial') return '$69';
    if (selectedPlan === 'reserve') return '$20';
    return `$${priceToday.toFixed(2)}`;
  };

  const getRemainingAmount = () => {
    if (selectedPlan === 'trial') return 'the remaining balance if you extend your stay';
    if (selectedPlan === 'reserve') return `$${(balanceDue + priceToday - 20).toFixed(2)}`;
    return `$${balanceDue.toFixed(2)}`;
  };

  return (
    <div className="lightbox-overlay" onClick={onClose} style={{ overflowY: 'auto', display: 'flex', alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ 
        position: 'relative',
        background: 'white', 
        borderRadius: '16px', 
        overflowY: 'auto', 
        maxHeight: '90vh',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <button className="lightbox-close-btn" onClick={onClose} style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div style={{ padding: '50px 30px 30px 30px' }}>
          {/* Hero - Why This Payment Makes Sense */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px', 
            padding: '28px',
            textAlign: 'center',
            marginBottom: '24px',
            color: 'white'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: 'white'
            }}>
              You're Making a Smart Decision
            </h2>
            <div style={{ fontSize: '16px', lineHeight: '1.6', opacity: '0.95' }}>
              {selectedPlan === 'trial' 
                ? "Try it for just $69. If you love it, your payment goes toward your stay."
                : selectedPlan === 'reserve'
                ? "Secure your room for $20. Pay the rest when you arrive and see it in person."
                : `You're paying ${getPaymentAmount()} today to secure your room. The rest (${getRemainingAmount()}) is due when you check in — after you've seen the room and know it's perfect.`
              }
            </div>
          </div>

          {/* Your Money is Protected */}
          <div style={{ 
            background: '#f0f9ff', 
            border: '2px solid #0ea5e9',
            borderRadius: '12px', 
            padding: '24px',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              marginBottom: '16px',
              color: '#0c4a6e',
              textAlign: 'center'
            }}>
              🛡️ Your Money is Protected
            </h3>
            <div style={{ 
              fontSize: '15px',
              lineHeight: '1.7',
              color: '#0c4a6e',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <strong>When you arrive and check in:</strong> If the room isn't <em>exactly</em> as promised — we refund you 100% on the spot. No forms, no waiting.
            </div>
            <div style={{ 
              background: 'white',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              color: '#0c4a6e',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              💳 Your payment is secure via Stripe<br/>
              <span style={{ fontSize: '13px', fontWeight: '400', opacity: '0.8' }}>
                (We never see or store your card details)
              </span>
            </div>
          </div>

          {/* Timeline - What Happens Next */}
          <h3 style={{ 
            fontSize: '19px', 
            fontWeight: '700', 
            marginBottom: '16px',
            color: '#1a1a1a',
            textAlign: 'center',
            background: 'white',
            padding: '0'
          }}>
            Here's Exactly What Happens Next
          </h3>

          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e5e7eb',
            borderRadius: '12px', 
            padding: '24px',
            marginBottom: '24px'
          }}>
            {/* Step 1 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '24px',
              gap: '16px'
            }}>
              <div style={{ 
                background: '#10b981',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '16px' }}>
                  Click "Pay Now" Below
                </strong>
                <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  {selectedPlan === 'trial' 
                    ? "You'll be charged $69 today to try the room for one night."
                    : selectedPlan === 'reserve'
                    ? "You'll be charged $20 to reserve your room. This guarantees your booking."
                    : `You'll be charged ${getPaymentAmount()} today. The remaining ${getRemainingAmount()} is due when you arrive.`
                  }
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '24px',
              gap: '16px'
            }}>
              <div style={{ 
                background: '#10b981',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '16px' }}>
                  Get Instant Confirmation (60 Seconds)
                </strong>
                <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  You'll receive an email with your reservation code, check-in instructions, and directions.
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '16px'
            }}>
              <div style={{ 
                background: '#10b981',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '16px' }}>
                  Arrive & Check In
                </strong>
                <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  {selectedPlan === 'trial' 
                    ? "Come see your room. If you love it and want to extend, your $69 is fully credited toward your total stay."
                    : selectedPlan === 'reserve'
                    ? `Bring ${getRemainingAmount()} when you arrive. See the room first — if it's not perfect, instant 100% refund on the spot.`
                    : `Bring ${getRemainingAmount()} when you arrive. See the room first — if it's not exactly as promised, instant 100% refund on the spot.`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Quick Questions */}
          <div style={{ 
            background: '#f9fafb',
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '15px' }}>
                ❓ What if I need to cancel?
              </strong>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                {selectedPlan === 'reserve'
                  ? 'Room reservations are non-refundable, but they guarantee your room is held for you.'
                  : 'Cancel up to 7 days before arrival for a full refund. No questions asked.'
                }
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '15px' }}>
                💬 What if I have questions before I arrive?
              </strong>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                Call us 24/7 at <a href={`tel:${hotel.phone}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600' }}>{hotel.phone}</a>. We're here to help with anything you need.
              </div>
            </div>

            <div>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontSize: '15px' }}>
                🔒 Is my payment information secure?
              </strong>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                Yes. We use Stripe, the same payment processor used by Amazon and Google. Your card details are encrypted and we never see or store them.
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              width: '100%',
              padding: '18px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '17px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#059669';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#10b981';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
          >
            Got It — Let's Complete My Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentInfoModal;
