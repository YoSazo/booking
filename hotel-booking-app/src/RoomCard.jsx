import React from 'react';

function RoomCard({ room, onSelect, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes }) {

  const priceToday = subtotal / 2;
  const balanceDue = subtotal / 2;

  const guestOptions = Array.from({ length: room.maxOccupancy }, (_, i) => i + 1);
  const petOptions = [0, 1, 2];

  return (
    <div className="room-card">
      <img src={room.imageUrl} alt={room.name} />
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
          <div className="room-price">$59 <span>/ night</span></div>
        )}

        {/* --- REVISED: Shows either "Select" button or the new Figma design action bar --- */}
        {isSelected ? (
          <div className="card-actions">
            <div className="actions-left">
              {/* Guests Selector */}
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

              {/* Pets Selector */}
              <div className="action-item">
                <span className="action-item-label">Pets</span>
                <select
                  id={`pets-${room.id}`}
                  value={bookingDetails.pets}
                  // --- BUG FIX: Changed e.g.value to e.target.value ---
                  onChange={(e) => onPetsChange(parseInt(e.target.value))}
                >
                  {petOptions.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
              </div>
            </div>
            
            <button className="btn book-now-btn" onClick={onBookNow}>Book Now</button>
          </div>
        ) : (
          <button className="btn btn-select" onClick={() => onSelect(room)}>
            Select Room
          </button>
        )}
      </div>
    </div>
  );
}

export default RoomCard;