import React, { useEffect, useState } from 'react';
import RoomCard from './RoomCard.jsx';
import { trackPageView } from './trackingService.js';
import { calculateTieredPrice } from './priceCalculator.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : ''
);

function OwnerPencilButton() {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Detect if we're inside the setup wizard iframe
  const isInSetup = new URLSearchParams(window.location.search).has('setup') || 
    (window !== window.parent);

  const handleVerify = async () => {
    if (!pin.trim()) { setError('Enter your PIN'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/crm/verify`, {
        headers: { 'x-crm-token': pin.trim() }
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        // Store PIN so CRM auto-logs in
        try { localStorage.setItem('crmToken', pin.trim()); } catch(e) {}
        window.location.href = '/frontdesk';
      } else {
        setError(json.message || 'Incorrect PIN');
      }
    } catch (e) {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className="owner-pencil-btn"
        onClick={() => { setShowModal(true); setError(''); setPin(''); }}
        aria-label="Owner access"
        title="Owner access"
      >
        ✏️
      </button>

      {showModal && (
        <div className="owner-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="owner-modal" onClick={e => e.stopPropagation()}>
            <button className="owner-modal-close" onClick={() => setShowModal(false)}>×</button>
            {isInSetup ? (
              <>
                <h3>You're almost there!</h3>
                <p>Your front desk is on the next page of the setup wizard. Hit "Next" to see it.</p>
                <button className="owner-modal-btn" onClick={() => setShowModal(false)}>Got it</button>
              </>
            ) : (
              <>
                <h3>Are you the owner?</h3>
                <p>Enter your Front Desk PIN to manage your property.</p>
                <input
                  type="text"
                  className="owner-modal-input"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  autoFocus
                />
                {error && <p className="owner-modal-error">{error}</p>}
                <button
                  className="owner-modal-btn"
                  onClick={handleVerify}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Go →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

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
        <header className="header" style={{ position: 'relative' }}>
          {/* Owner pencil button - subtle, top right of header */}
          <OwnerPencilButton />
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
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✏️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>
                Set up your hotel
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', maxWidth: '280px', margin: '0 auto' }}>
                Tap the pencil in the top right to manage your rooms, rates, and bookings.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default BookingPage;
