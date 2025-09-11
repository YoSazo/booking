import React from 'react';
import RoomCard from './RoomCard.jsx';
import CalendarModal from './CalendarModal.jsx';
import ReviewCard from './ReviewCard.jsx';

// This component just receives data and functions as "props" and displays them.
function BookingPage({ 
  hotel,
  roomData,
  selectedRoom,
  nights,
  subtotal,
  taxes,
  checkinDate,
  checkoutDate,
  isCalendarOpen,
  onRoomSelect,
  onGuestsChange,
  onPetsChange,
  onConfirmBooking,
  onCalendarOpen,
  onCalendarClose,
  onDatesChange
}) {
  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <>
      <div className="marquee-banner">
        <div className="marquee-content">
          <span>Only Pay 50% Today. 50% When You Arrive</span>
          <span>Only Pay 50% Today. 50% When You Arrive</span>
          <span>Only Pay 50% Today. 50% When You Arrive</span>
          <span>Only Pay 50% Today. 50% When You Arrive</span>
        </div>
      </div>

      <div className="container">
        <header className="header">
          <h1>{hotel.name}</h1>
          <p>{hotel.subtitle}</p>
        </header>
        
        <div className="reviews-section">
          <ReviewCard 
            text="Best place to stay at in MINOT! They are renovating everything! I mean everything, Literally so clean and nice! Keep it up management and crew."
            author="Chico"
            location="ND"
            rating={5}
          />
          <ReviewCard 
            text="Front desk was helpful and the room was nice. The remodel looks awesome. Zuber was extremely friendly and accommodating. 10/10 would stay here again."
            author="Harbor Clooten"
            location="ND"
            rating={5}
          />
          <img src="/google.png" alt="Google Reviews" className="reviews-google-logo" />
        </div>

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
              key={room.id}
              room={room}
              onSelect={onRoomSelect}
              isSelected={selectedRoom?.id === room.id}
              bookingDetails={selectedRoom?.id === room.id ? { guests: selectedRoom.guests, pets: selectedRoom.pets } : null}
              onGuestsChange={onGuestsChange}
              onPetsChange={onPetsChange}
              onBookNow={onConfirmBooking}
              nights={nights}
              subtotal={subtotal}
              taxes={taxes}
            />
          ))}
        </main>
      </div>
      
      <CalendarModal 
        isOpen={isCalendarOpen}
        onClose={onCalendarClose}
        onDatesChange={onDatesChange}
        initialCheckin={checkinDate}
        checkoutDate={checkoutDate}
        currentRate={59}
      />
    </>
  );
}

export default BookingPage;