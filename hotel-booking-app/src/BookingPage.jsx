import React from 'react';
import RoomCard from './RoomCard.jsx';
import CalendarModal from './CalendarModal.jsx';
import ReviewCard from './ReviewCard.jsx';

function BookingPage({ 
  hotel,
  roomData,
  rates,
  selectedRoom,
  checkinDate,
  checkoutDate,
  isCalendarOpen,
  onRoomSelect,
  onGuestsChange,
  onPetsChange,
  onConfirmBooking,
  onCalendarOpen,
  onCalendarClose,
  onDatesChange,
  isLoading
}) {
  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  // Calculate nights here to pass to the RoomCard for display
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <>
      <div className="marquee-banner">
        <div className="marquee-content">
          <span>Only Pay 50% Today!</span>
          <span>Only Pay 50% Today!</span>
          <span>Only Pay 50% Today!</span>
          <span>Only Pay 50% Today!</span>
        </div>
      </div>

      <div className="container">
        <header className="header">
          <p className="header-address">{hotel.address}</p>
          <h1>{hotel.name}</h1>
          <p>{hotel.subtitle}</p>
        </header>
        
        <div className="reviews-section">
          {hotel.reviews.map((review, index) => (
            <ReviewCard 
              key={index}
              text={review.text}
              author={review.author}
              location={review.location}
              rating={review.rating}
            />
          ))}
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
          {/* Conditional rendering based on loading and availability */}
          {isLoading ? (
            <p style={{textAlign: 'center', fontSize: '1.2em', padding: '40px 0'}}><strong>Checking for available rooms...</strong></p>
          ) : roomData && roomData.length > 0 ? (
            roomData.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                rates={rates}
                onSelect={onRoomSelect}
                isSelected={selectedRoom?.id === room.id}
                bookingDetails={selectedRoom?.id === room.id ? { guests: selectedRoom.guests, pets: selectedRoom.pets } : null}
                onGuestsChange={onGuestsChange}
                onPetsChange={onPetsChange}
                onBookNow={onConfirmBooking}
                nights={nights}
                // Use the real-time rate from the API, or fallback to our tiered calculator
                subtotal={room.subtotal}
                taxes={room.taxesAndFees}
              />
            ))
          ) : (
            <p style={{textAlign: 'center', fontSize: '1.2em', padding: '40px 0'}}><strong>No rooms available for the selected dates.</strong><br/>Please try another search.</p>
          )}
        </main>
      </div>
      
      <CalendarModal 
        isOpen={isCalendarOpen}
        onClose={onCalendarClose}
        onDatesChange={onDatesChange}
        initialCheckin={checkinDate}
        checkoutDate={checkoutDate}
        rates={rates}
      />
    </>
  );
}

// A local copy of the calculator is needed here for the RoomCard's fallback display
const calculateTieredPrice = (nights, rates) => {
  if (nights <= 0 || !rates) return 0;
  if (nights === 28) { return rates.MONTHLY; }
  if (nights < 7) { return nights * rates.NIGHTLY; }
  const WEEK_N = +(rates.WEEKLY / 7).toFixed(2);
  const MONTHLY_NIGHTS_THRESHOLD = 30;
  let discountedTotalRem = nights;
  let discountedTotal = 0;
  discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * rates.MONTHLY;
  discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
  discountedTotal += Math.floor(discountedTotalRem / 7) * rates.WEEKLY;
  discountedTotalRem %= 7;
  discountedTotal += discountedTotalRem * WEEK_N;
  return +discountedTotal.toFixed(2);
};

export default BookingPage;