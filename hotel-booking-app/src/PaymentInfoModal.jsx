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
    <div className="lightbox-overlay" onClick={onClose} style={{ overflowY: 'auto', display: 'flex', alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ 
        position: 'relative',
        background: 'white', 
        borderRadius: '16px', 
        overflowY: 'auto', 
        maxHeight: '95vh',
        width: '100%',
        maxWidth: '850px',
        margin: '0 20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <button className="lightbox-close-btn" onClick={onClose} style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
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
        
        <div style={{ padding: '60px 40px 40px 40px' }}>
          {/* Money Back Guarantee - Front and Center */}
          <div style={{ 
            background: '#d4edda',
            border: '2px solid #28a745',
            borderRadius: '12px', 
            padding: '24px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛡️</div>
            <div style={{ 
              fontSize: '18px',
              lineHeight: '1.6',
              color: '#155724',
              fontWeight: '600'
            }}>
              <strong>100% Money-Back Guarantee:</strong> If the room isn't exactly as promised when you arrive, we refund you on the spot. No forms, no waiting.
            </div>
          </div>

          {/* What Happens When You Pay */}
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            marginBottom: '20px',
            color: '#1a1a1a',
            textAlign: 'center'
          }}>
            What Happens After You Pay
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
                  Arrive & Check In (Super Easy!)
                </strong>
                <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  {selectedPlan === 'trial' 
                    ? "Come see your room first. Love it? Great! Come to the front desk and extend your stay — your $69 is fully credited. No credit checks, no lease, no paperwork. Just pay for your extended stay and you're all set."
                    : selectedPlan === 'reserve'
                    ? `See the room first. If it's perfect (and it will be!), come to the front desk and pay ${getRemainingAmount()}. No credit checks, no lease, no forms — just a simple payment and you're checked in. If it's not perfect, instant 100% refund on the spot.`
                    : `See the room first. If it's perfect (and it will be!), come to the front desk and pay ${getRemainingAmount()}. No credit checks, no lease, no forms — just a simple payment and you're checked in. If it's not exactly as promised, instant 100% refund on the spot.`
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
