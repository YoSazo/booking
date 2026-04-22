import React, { useEffect } from 'react';
import RoomCard from './RoomCard.jsx';
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
          <div className="location-banner" style={{
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
            <div className={`rooms-grid ${roomData.length === 1 ? 'rooms-grid--single' : ''}`.trim()}>
              {roomData.map(room => {
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
                );
              })}
            </div>
          ) : (
            <div
              style={{
                maxWidth: '560px',
                margin: '20px auto 0',
                padding: '28px 22px',
                borderRadius: '18px',
                border: '1px solid #D8E4DC',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F6FBF8 100%)',
                boxShadow: '0 8px 26px rgba(46,125,91,0.10)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  background: '#E8F5EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}
                aria-hidden="true"
              >
                📅
              </div>
              <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#1A2B22' }}>
                No rooms available for the selected dates.
              </p>
              <p style={{ margin: '8px 0 0', color: '#6B7D72', lineHeight: 1.5 }}>
                Try different dates to see available options.
              </p>
              <button
                type="button"
                onClick={onCalendarOpen}
                style={{
                  marginTop: '16px',
                  background: '#2E7D5B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '11px 20px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 14px rgba(46,125,91,0.22)'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default BookingPage;
