import React, { useEffect } from 'react';
import RoomCard from './RoomCard.jsx';
import CalendarModal from './CalendarModal.jsx';
// import ReviewCard from './ReviewCard.jsx'; // Removed - blocking calendar visibility
import HelpWidget from './HelpWidget.jsx';


function BookingPage({ 
  hotel,
  onOpenLightbox,
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
  isLoading,
  isProcessingBooking,
  setIsProcessingBooking
}) {
  console.log('isProcessingBooking in BookingPage:', isProcessingBooking);
  useEffect(() => {
    setIsProcessingBooking(false);
  }, []);

  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  // Calculate nights here to pass to the RoomCard for display
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
  return (
    <>
      {/* Marquee banner removed - taking up valuable above-fold space */}

      <div className="container">
        <header className="header">
          <p className="header-address">{hotel.address}</p>
          <h1>{hotel.name}</h1>
          <p>{hotel.subtitle}</p>
        </header>
        
        {/* Reviews section removed - blocking calendar/rooms visibility
            Trust is already established through ad creative and Kenneth video */}

        {/* Calendar widget removed - redundant, calendar opens when user clicks "Book Now" on room */}

        <main className="rooms-list">
          
          {/* Conditional rendering based on loading and availability */}
          {isLoading ? (
            <p style={{textAlign: 'center', fontSize: '1.2em', padding: '40px 0'}}><strong>Checking for available rooms...</strong></p>
          ) : roomData && roomData.length > 0 ? (
  roomData.map(room => {
    const currentRoomData = roomData.find(apiRoom => apiRoom.id === room.id) || room;
    const nights = checkinDate && checkoutDate 
      ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) 
      : 0;

    let grandTotal, payToday, balanceDue;
    
    if (room.totalRate !== undefined && room.totalRate !== null) {
      // Cloudbeds API returned a rate - use it directly
      grandTotal = room.totalRate;
      payToday = grandTotal / 2;
      balanceDue = grandTotal / 2;
    } else {
      // Fallback to local calculation if API didn't return rates
      const subtotalBeforeTax = calculateTieredPrice(nights, rates);
      const taxAmount = 0;
      grandTotal = subtotalBeforeTax + taxAmount;
      payToday = grandTotal / 2;
      balanceDue = grandTotal / 2;
    }

    return (
      <RoomCard
        key={room.id}
        room={room}
        rates={rates}
        onSelect={onRoomSelect}
        onChangeDates={onCalendarOpen}
        isSelected={selectedRoom?.id === room.id}
        bookingDetails={selectedRoom?.id === room.id ? { guests: selectedRoom.guests, pets: selectedRoom.pets } : null}
        onGuestsChange={onGuestsChange}
        onPetsChange={onPetsChange}
        onBookNow={onConfirmBooking}
        nights={nights}
        onOpenLightbox={onOpenLightbox}
        subtotal={grandTotal}
        taxes={0}
        payToday={payToday}
        balanceDue={balanceDue}
        isProcessing={isProcessingBooking}
        roomsAvailable={currentRoomData.roomsAvailable}
      />
    ); // <-- 5. Closed the return statement
  }) // <-- 6. Closed the map function with a curly brace
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

      {!isCalendarOpen && <HelpWidget phone={hotel.phone} />}
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