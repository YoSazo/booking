import React, { useState } from 'react';

function RoomCard({ room, onOpenLightbox, rates, onSelect, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes, isProcessing }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  console.log('isProcessing in RoomCard:', isProcessing);
  const priceToday = subtotal ? subtotal / 2 : 0;
  const balanceDue = subtotal ? subtotal / 2 : 0;

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
        {/* We now show the FIRST image as the preview */}
        <img 
          src={room.imageUrls[0]} 
          alt={`${room.name} preview`} 
        />
        {/* The new button to open the lightbox */}
        <button className="view-photos-btn" onClick={() => onOpenLightbox(room.imageUrls, 0)}>
          View Photos
        </button>
      </div>


      <div className="room-details">
        <h3>{room.name}</h3>
        <p className="room-amenities">{room.amenities}</p>
        <p>{room.description}</p>

        {nights > 0 ? (
          <div className="dynamic-price-display">
            <div className="price-today">Only Pay ${priceToday.toFixed(2)} Today</div>
            <div className="price-balance">Balance (${balanceDue.toFixed(2)}) When You Arrive</div>
          </div>
        ) : (
          <div className="room-price">${rates?.NIGHTLY || 59} <span>/ night</span></div>
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
            <button className="btn book-now-btn" onClick={onBookNow} disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Book Now'}</button>
          </div>
        ) : (
          <button className="btn btn-select" onClick={() => onSelect(room)}>Select Room</button>
        )}
      </div>
    </div>
  );
}

export default RoomCard;