import React, { useState } from 'react';
import { Wifi, Tv, Refrigerator, Briefcase, Bath, Car, Sparkles, Users, PawPrint, ChevronLeft, ChevronRight } from 'lucide-react';

function RoomCard({ room, onOpenLightbox, rates, onSelect, onChangeDates, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes, payToday, balanceDue, isProcessing, roomsAvailable, checkinDate, checkoutDate  }) {
  console.log(`Room: "${room.name}", roomsAvailable:`, roomsAvailable, `Type:`, typeof roomsAvailable)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  console.log('isProcessing in RoomCard:', isProcessing);

  const displayPayToday = payToday || 0;
  const displayBalanceDue = balanceDue || 0;

  const guestOptions = Array.from({ length: room.maxOccupancy }, (_, i) => i + 1);
  const petOptions = [0, 1, 2];

  const handlePrevImage = (e) => {
    e.stopPropagation();
    const newIndex = (currentImageIndex - 1 + room.imageUrls.length) % room.imageUrls.length;
    setCurrentImageIndex(newIndex);
  };
  const handleNextImage = (e) => {
    e.stopPropagation();
    const newIndex = (currentImageIndex + 1) % room.imageUrls.length;
    setCurrentImageIndex(newIndex);
  };

  // Parse amenities from text into icons
  const amenityIcons = {
    'wifi': { icon: Wifi, label: 'Free WiFi' },
    'tv': { icon: Tv, label: 'Smart TV' },
    'kitchen': { icon: Refrigerator, label: 'Kitchen' },
    'workspace': { icon: Briefcase, label: 'Workspace' },
    'workstation': { icon: Briefcase, label: 'Workstation' },
    'bath': { icon: Bath, label: 'Private Bath' },
    'parking': { icon: Car, label: 'Free Parking' },
    'cleaning': { icon: Sparkles, label: 'Weekly Cleaning' }
  };

  // Extract amenities from room.amenities string
  const getAmenityList = () => {
    const amenitiesText = room.amenities.toLowerCase();
    const foundAmenities = [];
    
    Object.keys(amenityIcons).forEach(key => {
      if (amenitiesText.includes(key)) {
        foundAmenities.push(amenityIcons[key]);
      }
    });
    
    // If we don't find enough, add default ones
    if (foundAmenities.length < 4) {
      const defaults = [
        { icon: Wifi, label: 'Free WiFi' },
        { icon: Tv, label: 'Smart TV' },
        { icon: Car, label: 'Free Parking' },
        { icon: Sparkles, label: 'Weekly Cleaning' }
      ];
      return defaults.slice(0, 4);
    }
    
    return foundAmenities.slice(0, 7);
  };

  const amenityList = getAmenityList();

  return (
  <div className="room-card">
    {/* Image Gallery */}
    <div className="room-image-container">
      <img 
        src={room.imageUrls[currentImageIndex]} 
        alt={`${room.name} preview`} 
        className="room-gallery-image"
        loading="lazy"
        decoding="async"
      />
      
      {/* Navigation Arrows - Only show if multiple images */}
      {room.imageUrls.length > 1 && (
        <>
          <button 
            onClick={handlePrevImage}
            className="image-nav-arrow image-nav-left"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={handleNextImage}
            className="image-nav-arrow image-nav-right"
          >
            <ChevronRight size={20} />
          </button>

          {/* Image Dots */}
          <div className="image-dots">
            {room.imageUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Availability Badge */}
      {(typeof roomsAvailable === 'number' && roomsAvailable > 0 && roomsAvailable <= 5) && (
        <div className="availability-badge-gradient">
          {roomsAvailable} room{roomsAvailable > 1 ? 's' : ''} left!
        </div>
      )}
    </div>



      <div className="room-details">
        {/* Header */}
        <div className="room-header">
          <div>
            <h3>{room.name}</h3>
            <p className="room-subtitle">Spacious • Fully Furnished</p>
          </div>
        </div>

        {/* Amenities Grid */}
        <div className="amenities-grid">
          {amenityList.map((amenity, idx) => (
            <div key={idx} className="amenity-item">
              <div className="amenity-icon-box">
                <amenity.icon size={18} className="amenity-icon" />
              </div>
              <span className="amenity-label">{amenity.label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="room-description">{room.description}</p>

        {/* Selected Dates Display */}
        {nights > 0 && checkinDate && checkoutDate && (
          <div className="selected-dates-display">
            <div className="dates-row">
              <div className="date-item">
                <span className="date-label">Check-in</span>
                <span className="date-value">{new Date(checkinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="date-separator">→</div>
              <div className="date-item">
                <span className="date-label">Check-out</span>
                <span className="date-value">{new Date(checkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="dates-footer">
              <div className="nights-display">{nights} night{nights !== 1 ? 's' : ''}</div>
              <button className="change-dates-inline-button" onClick={onChangeDates}>
                📅 Change Dates
              </button>
            </div>
          </div>
        )}

        {/* Premium Pricing Card */}
        {nights > 0 ? (
          <div className="premium-pricing-card">
            <div className="pricing-main">
              <span className="price-today-large">${displayPayToday.toFixed(0)}</span>
              <span className="price-today-label">today</span>
            </div>
            <p className="pricing-subtitle">
              Pay <span className="price-balance-highlight">${displayBalanceDue.toFixed(2)}</span> when you arrive
            </p>
          </div>
        ) : (
          <div className="premium-pricing-card">
            <div className="pricing-main">
              <span className="price-today-large">$0</span>
              <span className="price-today-label">today</span>
            </div>
            <p className="pricing-subtitle">
            Tap Select Room to see pricing
            </p>
          </div>
        )}

        {/* Booking Controls */}
        {isSelected ? (
          <div className="booking-controls-section">
            <div className="inline-selectors">
              <div className="inline-selector-item">
                <div className="selector-label">
                  <Users size={18} />
                  <span>Guests</span>
                </div>
                <select
                  id={`guests-${room.id}`}
                  value={bookingDetails.guests}
                  onChange={(e) => onGuestsChange(parseInt(e.target.value))}
                  className="premium-select"
                >
                  {guestOptions.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
              </div>

              <div className="inline-selector-item">
                <div className="selector-label">
                  <PawPrint size={18} />
                  <span>Pets</span>
                </div>
                <select
                  id={`pets-${room.id}`}
                  value={bookingDetails.pets}
                  onChange={(e) => onPetsChange(parseInt(e.target.value))}
                  className="premium-select"
                >
                  {petOptions.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
              </div>
            </div>

            <button className="premium-book-button" onClick={onBookNow} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Reserve for $0'}
            </button>
          </div>
        ) : (
          <div className="booking-controls-section">
            {nights > 0 && (
              <button 
                className="change-dates-button" 
                onClick={onChangeDates}
              >
                📅 Change Dates
              </button>
            )}
            <button className="premium-select-button" onClick={() => onSelect(room)}>
              {nights > 0 ? 'Continue Booking' : 'Select Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomCard;