import React from 'react';
import RoomCard from './RoomCard.jsx';
import CalendarModal from './CalendarModal.jsx';

function BookingPage({ 
  roomData, selectedRoom, nights, subtotal, taxes,
  checkinDate, checkoutDate, isCalendarOpen,
  onRoomSelect, onGuestsChange, onPetsChange, onConfirmBooking,
  onCalendarOpen, onCalendarClose, onDatesUpdate
}) {
  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <>
      {/* --- NEW: Sticky Marquee Banner --- */}
      <div className="marquee-banner">
        <div className="marquee-content">
          {/* The text is duplicated to create a seamless looping effect */}
          <span>No Fees. No Deposits. No Hidden Costs.</span>
          <span>No Fees. No Deposits. No Hidden Costs.</span>
          <span>No Fees. No Deposits. No Hidden Costs.</span>
          <span>No Fees. No Deposits. No Hidden Costs.</span>
          <span>No Fees. No Deposits. No Hidden Costs.</span>
        </div>
      </div>

      <div className="container">
        <header className="header">
          {/* --- UPDATED: Header Text --- */}
          <h1>Guest Lodge Minot</h1>
          <p>No Leases. No Background Checks. No Credit Checks.</p>
        </header>
        
        <div className="booking-form">
          <div className="form-group">
            <label>Check-in / Check-out</label>
            <div className="date-picker-button" onClick={onCalendarOpen}>
                <span>{ checkinDate && checkoutDate ? `${formatDate(checkinDate)} - ${formatDate(checkoutDate)}` : `${formatDate(checkinDate)} - Select Checkout` }</span>
                <span>&#128197;</span>
            </div>
          </div>
        </div>

        <main className="rooms-list">
          {roomData.map(room => (
            <RoomCard
              key={room.id} room={room} onSelect={onRoomSelect}
              isSelected={selectedRoom?.id === room.id}
              bookingDetails={selectedRoom?.id === room.id ? { guests: selectedRoom.guests, pets: selectedRoom.pets } : null}
              onGuestsChange={onGuestsChange} onPetsChange={onPetsChange} 
              onBookNow={onConfirmBooking} 
              nights={nights} subtotal={subtotal} taxes={taxes}
            />
          ))}
        </main>
      </div>
      
      <CalendarModal 
        isOpen={isCalendarOpen} onClose={onCalendarClose} onDatesChange={onDatesUpdate}
        initialCheckin={checkinDate} initialCheckout={checkoutDate} currentRate={59}
      />
    </>
  );
}

export default BookingPage;