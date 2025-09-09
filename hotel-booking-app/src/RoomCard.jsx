import React from 'react';

function RoomCard({ room, onSelect, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes }) {

  const priceToday = subtotal / 2;
  const balanceDue = (subtotal / 2) + taxes;

  const guestOptions = Array.from({ length: room.maxOccupancy }, (_, i) => i + 1);
  const petOptions = [0, 1, 2]; // Max 2 pets for all rooms

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
            <div className="price-balance">Balance (${balanceDue.toFixed(2)} USD) When You Arrive</div>
          </div>
        ) : (
          <div className="room-price">$59 <span>/ night</span></div>
        )}

        {/* --- REVISED: Shows either "Select" button or the full action bar --- */}
        {isSelected ? (
          <div className="card-actions">
            <div className="action-group">
              <label htmlFor={`guests-${room.id}`}>Guests</label>
              <select
                id={`guests-${room.id}`}
                value={bookingDetails.guests}
                onChange={(e) => onGuestsChange(parseInt(e.target.value))}
              >
                {guestOptions.map(number => <option key={number} value={number}>{number}</option>)}
              </select>
            </div>

            <div className="action-group">
              <label htmlFor={`pets-${room.id}`}>Pets</label>
              <select
                id={`pets-${room.id}`}
                value={bookingDetails.pets}
                onChange={(e) => onPetsChange(parseInt(e.target.value))}
              >
                {petOptions.map(number => <option key={number} value={number}>{number}</option>)}
              </select>
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