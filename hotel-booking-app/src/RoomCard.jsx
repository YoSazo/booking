import React, { useState, useRef, useEffect } from 'react';
import { Wifi, Tv, Refrigerator, Briefcase, Bath, Car, Sparkles, Users, PawPrint, ChevronLeft, ChevronRight, Waves, Wind, Shirt, CookingPot, Laptop } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : ''
);

function PhotoUploadButton({ roomId, onPhotosAdded, hotelId }) {
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
        const url = hotelId 
          ? `${API_BASE_URL}/api/crm/rooms/${roomId}/images?hotelId=${encodeURIComponent(hotelId)}`
          : `${API_BASE_URL}/api/crm/rooms/${roomId}/images`;
        const res = await fetch(url, {
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
      {uploading ? '⏳ Uploading...' : '📷 Change photos'}
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
    </label>
  );
}

function AmenityPickerModal({ room, hotelId, onDone }) {
  const currentAmenities = (room.amenities || '').split(/\s*[\u2022\u2023\u25E6•]\s*/).map(a => a.trim()).filter(Boolean);
  const [selected, setSelected] = useState(currentAmenities);
  const [customAmenity, setCustomAmenity] = useState('');
  const [saving, setSaving] = useState(false);

  const PRESETS = [
    { key: 'wifi', label: 'Free WiFi', icon: Wifi },
    { key: 'tv', label: 'Smart TV', icon: Tv },
    { key: 'fridge', label: 'Fridge', icon: Refrigerator },
    { key: 'parking', label: 'Free Parking', icon: Car },
    { key: 'housekeeping', label: 'Weekly Housekeeping', icon: Sparkles },
    { key: 'bath', label: 'Bath', icon: Bath },
    { key: 'workstation', label: 'Workstation', icon: Laptop },
    { key: 'pet', label: 'Pet Friendly', icon: PawPrint },
    { key: 'pool', label: 'Pool', icon: Waves },
    { key: 'kitchen', label: 'Kitchenette', icon: CookingPot },
    { key: 'ac', label: 'Air Conditioning', icon: Wind },
    { key: 'laundry', label: 'Laundry', icon: Shirt },
  ];

  const isActive = (key) => selected.some(a => a.toLowerCase().includes(key));

  const toggle = (label) => {
    if (selected.some(a => a.toLowerCase() === label.toLowerCase())) {
      setSelected(selected.filter(a => a.toLowerCase() !== label.toLowerCase()));
    } else {
      setSelected([...selected, label]);
    }
  };

  const addCustom = () => {
    if (!customAmenity.trim()) return;
    setSelected([...selected, customAmenity.trim()]);
    setCustomAmenity('');
  };

  const handleDone = async () => {
    setSaving(true);
    const token = localStorage.getItem('crmToken') || '';
    const roomId = room.roomId || room.id;
    const newAmenities = selected.join(' • ');
    try {
      await fetch(`${API_BASE_URL}/api/crm/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
        body: JSON.stringify({ id: roomId, name: room.name, amenities: newAmenities, hotelId }),
      });
    } catch (e) { /* silent */ }
    setSaving(false);
    onDone(newAmenities);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={handleDone}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '360px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Add Amenities</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {PRESETS.map(p => (
            <button key={p.key} type="button" onClick={() => toggle(p.label)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${isActive(p.key) ? '#2E7D5B' : '#e5e7eb'}`,
              background: isActive(p.key) ? '#E8F5EE' : 'white',
              color: isActive(p.key) ? '#2E7D5B' : '#1a1a2e',
            }}><p.icon size={14} /> {p.label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <input type="text" value={customAmenity} onChange={e => setCustomAmenity(e.target.value)} placeholder="Type your own..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            style={{ width: '100%', padding: '10px 60px 10px 12px', borderRadius: '8px', border: '1.5px solid #D8E4DC', fontFamily: 'inherit', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          <button type="button" onClick={addCustom} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#2E7D5B', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
        </div>
        {/* Show current selected as pills */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {selected.map((a, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#E8F5EE', color: '#2E7D5B', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                {a}
                <button type="button" onClick={() => setSelected(selected.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#2E7D5B', cursor: 'pointer', fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <button type="button" onClick={handleDone} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving...' : 'Done'}</button>
      </div>
    </div>
  );
}

function RoomEditFields({ room, onRoomUpdate, onRoomDelete, hotelId, onDirty }) {
  const [name, setName] = useState(room.name || '');
  const [description, setDescription] = useState(room.description || '');
  const [maxOccupancy, setMaxOccupancy] = useState(room.maxOccupancy || 4);
  const [totalUnits, setTotalUnits] = useState(room.totalUnits || 1);

  // Listen for universal save event
  useEffect(() => {
    const handleSaveAll = async () => {
      const token = localStorage.getItem('crmToken') || '';
      const roomId = room.roomId || room.id;
      try {
        await fetch(`${API_BASE_URL}/api/crm/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
          body: JSON.stringify({ id: roomId, name, description, maxOccupancy: Number(maxOccupancy), totalUnits: Number(totalUnits), hotelId }),
        });
      } catch (e) { /* silent */ }
    };
    window.addEventListener('saveAllRooms', handleSaveAll);
    return () => window.removeEventListener('saveAllRooms', handleSaveAll);
  });

  const markDirty = (setter) => (e) => { setter(e.target.value); if (onDirty) onDirty(); };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    const token = localStorage.getItem('crmToken') || '';
    const roomId = room.roomId || room.id;
    try {
      await fetch(`${API_BASE_URL}/api/crm/rooms/${roomId}?hotelId=${encodeURIComponent(hotelId || '')}`, {
        method: 'DELETE',
        headers: { 'x-crm-token': token },
      });
      if (onRoomDelete) onRoomDelete();
    } catch (e) { /* silent */ }
  };

  const fieldStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #D8E4DC',
    fontFamily: 'inherit', fontSize: '14px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box',
  };

  return (
    <div style={{ width: '100%' }}>
      <input type="text" value={name} onChange={markDirty(setName)} placeholder="Room name" style={{ ...fieldStyle, fontSize: '16px', fontWeight: '700' }} />
      <input type="text" value={description} onChange={markDirty(setDescription)} placeholder="Description (e.g. Spacious room with king bed)" style={fieldStyle} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7D72', marginBottom: '3px' }}>Max Guests</div>
          <input type="number" value={maxOccupancy} onChange={markDirty(setMaxOccupancy)} min="1" max="20" style={{ ...fieldStyle, marginBottom: 0 }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7D72', marginBottom: '3px' }}>Total Units</div>
          <input type="number" value={totalUnits} onChange={markDirty(setTotalUnits)} min="1" max="200" style={{ ...fieldStyle, marginBottom: 0 }} />
        </div>
      </div>
      <button onClick={() => setShowDeleteConfirm(true)} style={{
        width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #E05252', background: 'none',
        color: '#E05252', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
      }}>Delete Room</button>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '300px', padding: '24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Delete {name}?</div>
            <div style={{ fontSize: '13px', color: '#6B7D72', marginBottom: '16px' }}>This removes the room and its photos. Can't be undone.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #D8E4DC', background: 'none', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#6B7D72' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#E05252', color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onOpenLightbox, rates, onSelect, onChangeDates, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, taxes, payToday, balanceDue, isProcessing, roomsAvailable, checkinDate, checkoutDate, isEditMode, onPhotosAdded, onRoomUpdate, onRoomDelete, hotelId, onDirty  }) {
  console.log(`Room: "${room.name}", roomsAvailable:`, roomsAvailable, `Type:`, typeof roomsAvailable)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAmenityPicker, setShowAmenityPicker] = useState(false);
  const [localAmenities, setLocalAmenities] = useState(room.amenities || '');
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
    const amenitiesText = (localAmenities || '');
    if (!amenitiesText.trim()) {
      // In edit mode, show nothing so owner can add their own
      if (isEditMode) return [];
      // For guests, show defaults
      return [
        { icon: Wifi, label: 'Free WiFi' },
        { icon: Tv, label: 'Smart TV' },
        { icon: Car, label: 'Free Parking' },
        { icon: Sparkles, label: 'Weekly Cleaning' }
      ];
    }

    // Split by bullet separator and map each to an icon
    const items = amenitiesText.split(/\s*[\u2022\u2023\u25E6•]\s*/).map(a => a.trim()).filter(Boolean);
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
      {isEditMode && <PhotoUploadButton roomId={room.roomId || room.id} onPhotosAdded={onPhotosAdded} hotelId={hotelId} />}
    </div>



      <div className="room-details">
        {/* Header */}
        <div className="room-header">
          <div style={{ width: '100%' }}>
            {isEditMode ? (
              <RoomEditFields room={room} onRoomUpdate={onRoomUpdate} onRoomDelete={onRoomDelete} hotelId={hotelId} onDirty={onDirty} />
            ) : (
              <>
                <h3>{room.name}</h3>
                <p className="room-subtitle">{room.description || 'Spacious • Fully Furnished'}</p>
              </>
            )}
          </div>
        </div>

        {/* Amenities Grid */}
        <div className="amenities-grid">
          {amenityList.map((amenity, idx) => (
            <div key={idx} className="amenity-item" style={{ position: 'relative' }}>
              <div className="amenity-icon-box">
                <amenity.icon size={18} className="amenity-icon" />
              </div>
              <span className="amenity-label">{amenity.label}</span>
              {isEditMode && (
                <button type="button" onClick={() => {
                  const current = localAmenities.split(/\s*[\u2022\u2023\u25E6•]\s*/).map(a => a.trim()).filter(Boolean);
                  const updated = current.filter(a => a !== amenity.label);
                  const newAmenities = updated.join(' • ');
                  setLocalAmenities(newAmenities);
                  const token = localStorage.getItem('crmToken') || '';
                  const roomId = room.roomId || room.id;
                  fetch(`${API_BASE_URL}/api/crm/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
                    body: JSON.stringify({ id: roomId, name: room.name, amenities: newAmenities, hotelId }),
                  });
                }} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#E05252', color: 'white', border: 'none', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
          {isEditMode && (
            <div className="amenity-item" style={{ cursor: 'pointer' }} onClick={() => setShowAmenityPicker(true)}>
              <div className="amenity-icon-box" style={{ border: '1.5px dashed #D8E4DC' }}>
                <span style={{ fontSize: '16px', color: '#6B7D72' }}>+</span>
              </div>
              <span className="amenity-label" style={{ color: '#6B7D72' }}>Add</span>
            </div>
          )}
        </div>

        {/* Amenity Picker Modal (edit mode) */}
        {isEditMode && showAmenityPicker && <AmenityPickerModal room={{ ...room, amenities: localAmenities }} hotelId={hotelId} onDone={(newAmenities) => { setShowAmenityPicker(false); if (newAmenities !== undefined) setLocalAmenities(newAmenities); }} />}

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