import React, { useEffect } from 'react';
import RoomCard from './RoomCard.jsx';
import { trackPageView } from './trackingService.js';
import { calculateTieredPrice } from './priceCalculator.js';

// ── Main BookingPage (Guest-facing only) ───────────────────────
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
  setIsProcessingBooking,
  onHotelUpdate,
  hotelId,
}) {
  useEffect(() => { trackPageView(); }, []);
  useEffect(() => { setIsProcessingBooking(false); }, []);

  const isOwner = !!(localStorage.getItem('crmToken') || localStorage.getItem('isOwner'));

  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="container">
      {/* Owner link to front desk */}
      {isOwner && (
        <div style={{ textAlign: 'right', padding: '8px 0 0' }}>
          <a href="/frontdesk" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Front Desk →</a>
        </div>
      )}

      <header className="header">
        <p className="header-address">{hotel.address}</p>
        <h1>{hotel.name}</h1>
        <p>{hotel.subtitle}</p>
      </header>

      {/* Location banner - St. Croix only */}
      {window.location.hostname.includes('stcroix') && (
        <div className="location-banner" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '10px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '500', color: '#166534'
        }}>
          <span>📍</span><span>50 min away from Minneapolis</span>
        </div>
      )}

      <main className="rooms-list">
        {isLoading ? (
          <p style={{textAlign: 'center', fontSize: '1.2em', padding: '40px 0'}}>
            <strong>Checking for available rooms...</strong>
            <span className="spinner"></span>
          </p>
        ) : roomData && roomData.length > 0 ? (
          <div className={`rooms-grid ${roomData.length === 1 ? 'rooms-grid--single' : ''}`.trim()}>
            {roomData.map(room => {
              const currentRoomData = roomData.find(apiRoom => apiRoom.id === room.id) || room;
              const nightsCalc = checkinDate && checkoutDate
                ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24))
                : 0;

              let grandTotal, payToday, balanceDue;
              if (room.totalRate !== undefined && room.totalRate !== null) {
                grandTotal = room.totalRate;
                payToday = 0;
                balanceDue = grandTotal;
              } else {
                const subtotalBeforeTax = calculateTieredPrice(nightsCalc, rates);
                grandTotal = subtotalBeforeTax;
                payToday = 0;
                balanceDue = grandTotal;
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
                  nights={nightsCalc}
                  onOpenLightbox={onOpenLightbox}
                  subtotal={grandTotal}
                  taxes={0}
                  payToday={payToday}
                  balanceDue={balanceDue}
                  isProcessing={isProcessingBooking}
                  roomsAvailable={currentRoomData.roomsAvailable}
                  checkinDate={checkinDate}
                  checkoutDate={checkoutDate}
                  isEditMode={false}
                  hotelId={hotelId}
                />
              );
            })}
          </div>
        ) : hotel.rooms && hotel.rooms.length > 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <p style={{fontSize: '1.1em', marginBottom: '16px'}}><strong>No rooms available for the selected dates.</strong></p>
            <button onClick={onCalendarOpen} style={{
              padding: '12px 24px', background: '#2E7D5B', color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
            }}>Try different dates</button>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '48px 24px', background: 'white',
            borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏨</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>Coming Soon</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', maxWidth: '280px', margin: '0 auto' }}>
              Rooms are being set up. Check back soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default BookingPage;
