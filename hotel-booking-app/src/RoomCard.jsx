import React, { useState } from 'react';

function RoomCard({ room, onOpenLightbox, rates, onSelect, onChangeDates, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes, payToday, balanceDue, isProcessing, roomsAvailable  }) {
  console.log(`Room: "${room.name}", roomsAvailable:`, roomsAvailable, `Type:`, typeof roomsAvailable)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  console.log('isProcessing in RoomCard:', isProcessing);

  const displayPayToday = payToday || 0;
  const displayBalanceDue = balanceDue || 0;

  const guestOptions = Array.from({ length: room.maxOccupancy }, (_, i) => i + 1);
  const petOptions = [0, 1, 2];

  const handlePrevImage = (e) => {
    e.stopPropagation();
    const newIndex = (currentImageIndex - 1 + room.imageUrls.length) % room.imageUrls.length;
    setCurrentImageIndex(newIndex);
  };
  const handleNextImage = (e) => {
    e.stopPropagation();
    const newIndex = (currentImageIndex + 1) % room.imageUrls.length;
    setCurrentImageIndex(newIndex);
  };

  return (
  <div className="room-card">
    <div className="room-image-container">

      {/* 1. The overlay container is now the FIRST child */}
      <div className="image-overlay-container">
        <a onClick={(e) => { e.stopPropagation(); onOpenLightbox(room.imageUrls, 0); }} className="view-photos-pill">
          View Photos
        </a>
        
        {(typeof roomsAvailable === 'number' && roomsAvailable > 0 && roomsAvailable <= 5) && (
          <div className="availability-pill">{roomsAvailable} room{roomsAvailable > 1 ? 's' : ''} left!</div>
        )}
      </div>

      {/* The image is now the only other element here */}
      <img 
        src={room.imageUrls[0]} 
        alt={`${room.name} preview`} 
      />
      
      {/* 2. The old <button> that was here has been REMOVED */}

    </div>



      <div className="room-details">
        <h3>{room.name}</h3>
        <p className="room-amenities">{room.amenities}</p>
        <p>{room.description}</p>

        {nights > 0 ? (
          <div className="dynamic-price-display">
            <div className="price-today">Reserve for $0 Today</div>
            <div className="price-balance">Pay ${displayBalanceDue.toFixed(2)} When You Arrive</div>
          </div>
        ) : (
          <div className="room-price-placeholder" style={{ 
            fontSize: '15px', 
            color: '#666', 
            fontStyle: 'italic',
            padding: '10px 0'
          }}>
            Reserve for $0 Today - Select dates to see total
          </div>
        )}

        {isSelected ? (
          <div className="card-actions">
            <div className="actions-left">
              <div className="action-item">
                <span className="action-item-label">Guests</span>
                <select
                  id={`guests-${room.id}`}
                  value={bookingDetails.guests}
                  onChange={(e) => onGuestsChange(parseInt(e.target.value))}
                >
                  {guestOptions.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
              </div>
              <div className="action-item">
                <span className="action-item-label">Pets</span>
                <select
                  id={`pets-${room.id}`}
                  value={bookingDetails.pets}
                  onChange={(e) => onPetsChange(parseInt(e.target.value))}
                >
                  {petOptions.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
              </div>
            </div>
            <button className="btn book-now-btn" onClick={onBookNow} disabled={isProcessing}>{isProcessing ? 'Processing' : 'Book Now'}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nights > 0 && (
              <button 
                className="btn-change-dates" 
                onClick={onChangeDates}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📅 Change Dates
              </button>
            )}
            <button className="btn btn-select" onClick={() => onSelect(room)}>
              {nights > 0 ? 'Continue Booking' : 'Select Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomCard;