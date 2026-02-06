import React, { useEffect } from 'react';
import RoomCard from './RoomCard.jsx';
import CalendarModal from './CalendarModal.jsx';
// import ReviewCard from './ReviewCard.jsx'; // Removed - blocking calendar visibility
import { trackPageView } from './trackingService.js';
import { calculateTieredPrice } from './priceCalculator.js';


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
    // This will run once when the application sstarts
    trackPageView(); 
  }, []);
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

        {/* Location banner - St. Croix only */}
        {window.location.hostname.includes('stcroix') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#166534'
          }}>
            <span>📍</span>
            <span>50 min away from Minneapolis</span>
          </div>
        )}

        <main className="rooms-list">
          
          {/* Conditional rendering based on loading and availability */}
          {isLoading ? (
            <p style={{textAlign: 'center', fontSize: '1.2em', padding: '40px 0'}}>
              <strong>Checking for available rooms...</strong>
              <span className="spinner"></span>
            </p>
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
      payToday = 0; // Reserve for $0 today
      balanceDue = grandTotal; // Full amount due at arrival
    } else {
      // Fallback to local calculation if API didn't return rates
      const subtotalBeforeTax = calculateTieredPrice(nights, rates);
      const taxAmount = 0;
      grandTotal = subtotalBeforeTax + taxAmount;
      payToday = 0; // Reserve for $0 today
      balanceDue = grandTotal; // Full amount due at arrival
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
        checkinDate={checkinDate}
        checkoutDate={checkoutDate}
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
    </>
  );
}

export default BookingPage;