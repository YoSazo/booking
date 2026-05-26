import React, { useState, useRef } from 'react';
import { Wifi, Tv, Refrigerator, Briefcase, Bath, Car, Sparkles, Users, PawPrint, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : ''
);

function PhotoUploadButton({ roomId, onPhotosAdded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const token = localStorage.getItem('crmToken') || '';
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await fetch(`${API_BASE_URL}/api/crm/rooms/${roomId}/images`, {
          method: 'POST', headers: { 'x-crm-token': token }, body: fd,
        });
        const data = await res.json();
        if (data.success && data.image) uploaded.push(data.image);
      } catch (err) { /* skip */ }
    }
    setUploading(false);
    if (uploaded.length && onPhotosAdded) onPhotosAdded(roomId, uploaded);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <label style={{
      position: 'absolute', bottom: '10px', right: '10px', zIndex: 5,
      background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 14px',
      borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '6px',
      opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto',
    }}>
      {uploading ? '⏳ Uploading...' : '📷 + Photos'}
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
    </label>
  );
}

function RoomCard({ room, onOpenLightbox, rates, onSelect, onChangeDates, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes, payToday, balanceDue, isProcessing, roomsAvailable, checkinDate, checkoutDate, isEditMode, onPhotosAdded  }) {
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
    'kitchen': { icon: Refrigerator, label: 'Kitchenette' },
    'fridge': { icon: Refrigerator, label: 'Fridge' },
    'refrigerator': { icon: Refrigerator, label: 'Fridge' },
    'workspace': { icon: Briefcase, label: 'Workspace' },
    'workstation': { icon: Briefcase, label: 'Workstation' },
    'bath': { icon: Bath, label: 'Bath' },
    'shower': { icon: Bath, label: 'Shower' },
    'parking': { icon: Car, label: 'Free Parking' },
    'cleaning': { icon: Sparkles, label: 'Weekly Cleaning' },
    'housekeeping': { icon: Sparkles, label: 'Housekeeping' },
    'pet': { icon: PawPrint, label: 'Pet Friendly' },
    'dog': { icon: PawPrint, label: 'Pet Friendly' },
  };

  // Extract amenities from room.amenities string
  const getAmenityList = () => {
    const amenitiesText = (room.amenities || '');
    if (!amenitiesText.trim()) {
      // No amenities at all — show defaults
      return [
        { icon: Wifi, label: 'Free WiFi' },
        { icon: Tv, label: 'Smart TV' },
        { icon: Car, label: 'Free Parking' },
        { icon: Sparkles, label: 'Weekly Cleaning' }
      ];
    }

    // Split by bullet separator and map each to an icon
    const items = amenitiesText.split(/\s*[\u2022\u2023\u25E6•]\s*|â€¢/).map(a => a.trim()).filter(Boolean);
    return items.slice(0, 7).map(item => {
      const lower = item.toLowerCase();
      // Find matching icon
      for (const [key, val] of Object.entries(amenityIcons)) {
        if (lower.includes(key)) return { icon: val.icon, label: item };
      }
      // No match — use generic checkmark
      return { icon: Sparkles, label: item };
    });
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
        onError={(e) => { e.target.onerror = null; e.target.src = 'https://suitestay.clickinns.com/kingbedsuitestay.webp'; }}
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

      {/* Edit mode: photo upload button */}
      {isEditMode && <PhotoUploadButton roomId={room.roomId || room.id} onPhotosAdded={onPhotosAdded} />}
    </div>



      <div className="room-details">
        {/* Header */}
        <div className="room-header">
          <div>
            <h3>{room.name}</h3>
            <p className="room-subtitle">{room.description || 'Spacious • Fully Furnished'}</p>
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
              <button className="change-dates-pill" onClick={onChangeDates}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Change Dates
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
                <div className="custom-stepper">
                  <button
                    className="stepper-btn"
                    onClick={() => onGuestsChange(Math.max(1, bookingDetails.guests - 1))}
                    disabled={bookingDetails.guests <= 1}
                  >−</button>
                  <span className="stepper-value">{bookingDetails.guests}</span>
                  <button
                    className="stepper-btn"
                    onClick={() => onGuestsChange(Math.min(room.maxOccupancy, bookingDetails.guests + 1))}
                    disabled={bookingDetails.guests >= room.maxOccupancy}
                  >+</button>
                </div>
              </div>

              <div className="inline-selector-item">
                <div className="selector-label">
                  <PawPrint size={18} />
                  <span>Pets</span>
                </div>
                <div className="custom-stepper">
                  <button
                    className="stepper-btn"
                    onClick={() => onPetsChange(Math.max(0, bookingDetails.pets - 1))}
                    disabled={bookingDetails.pets <= 0}
                  >−</button>
                  <span className="stepper-value">{bookingDetails.pets}</span>
                  <button
                    className="stepper-btn"
                    onClick={() => onPetsChange(Math.min(2, bookingDetails.pets + 1))}
                    disabled={bookingDetails.pets >= 2}
                  >+</button>
                </div>
              </div>
            </div>

            <button className="premium-book-button" onClick={onBookNow} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Reserve for $0'}
            </button>
          </div>
        ) : (
          <div className="booking-controls-section">
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