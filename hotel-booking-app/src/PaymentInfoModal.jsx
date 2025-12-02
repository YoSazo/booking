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
    <div className="lightbox-overlay" onClick={onClose} style={{ overflowY: 'auto' }}>
      <div className="lightbox-content payment-info-modal" onClick={(e) => e.stopPropagation()} style={{ overflowY: 'auto', maxHeight: '90vh' }}>
        <button className="lightbox-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div style={{ padding: '40px 30px', maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            marginBottom: '20px',
            color: '#1a1a1a',
            textAlign: 'center'
          }}>
            ✓ What Happens After I Pay?
          </h2>

          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '16px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>📧</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>
                  Instant Confirmation Email
                </strong>
                <span style={{ color: '#495057', fontSize: '14px' }}>
                  You'll receive a confirmation with your reservation code, check-in details, and directions within 60 seconds.
                </span>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '16px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>💳</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>
                  {selectedPlan === 'reserve' ? 'Remaining Balance' : 'When You Pay the Rest'}
                </strong>
                <span style={{ color: '#495057', fontSize: '14px' }}>
                  {selectedPlan === 'reserve' 
                    ? `${getRemainingAmount()} due when you arrive at the property.`
                    : selectedPlan === 'trial'
                    ? 'If you extend your stay, your $69 is 100% credited toward the total.'
                    : `${getRemainingAmount()} due when you check in at the property.`
                  }
                </span>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '16px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>🛡️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>
                  Free Cancellation
                </strong>
                <span style={{ color: '#495057', fontSize: '14px' }}>
                  {selectedPlan === 'reserve'
                    ? 'Room reservations are non-refundable but guarantee your room is held.'
                    : 'Cancel up to 7 days before arrival for a full refund. No questions asked.'
                  }
                </span>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>📞</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>
                  Questions? We're Here to Help
                </strong>
                <span style={{ color: '#495057', fontSize: '14px' }}>
                  Call us anytime at <a href={`tel:${hotel.phone}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600' }}>{hotel.phone}</a> — we're happy to assist!
                </span>
              </div>
            </div>
          </div>

          <div style={{ 
            background: '#d4edda', 
            border: '1px solid #c3e6cb',
            borderRadius: '8px', 
            padding: '16px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <strong style={{ color: '#155724', fontSize: '15px' }}>
              ✅ 100% Money-Back Guarantee
            </strong>
            <div style={{ color: '#155724', fontSize: '13px', marginTop: '4px' }}>
              If the room isn't exactly as promised when you arrive, we'll refund 100% on the spot.
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#0056b3'}
            onMouseLeave={(e) => e.target.style.background = '#007bff'}
          >
            Got It, Thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentInfoModal;
