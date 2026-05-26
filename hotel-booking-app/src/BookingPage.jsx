import React, { useEffect, useState, useRef } from 'react';
import RoomCard from './RoomCard.jsx';
import { trackPageView } from './trackingService.js';
import { calculateTieredPrice } from './priceCalculator.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : ''
);

// ── Inline Editable Field ──────────────────────────────────────
function EditableField({ value, onChange, onDirty, tag: Tag = 'p', className, style, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (!editing) {
    return (
      <Tag
        className={className}
        style={{ ...style, cursor: 'pointer', borderBottom: '1.5px dashed #2E7D5B', paddingBottom: '2px' }}
        onClick={() => setEditing(true)}
        title="Tap to edit"
      >
        {value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
      </Tag>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={e => { setDraft(e.target.value); if (onDirty) onDirty(); }}
      onBlur={() => { setEditing(false); if (draft !== value) onChange(draft); }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (draft !== value) onChange(draft); } }}
      placeholder={placeholder}
      style={{
        width: '100%', border: 'none', borderBottom: '2px solid #2E7D5B', outline: 'none',
        background: 'transparent', fontFamily: 'inherit', textAlign: 'center',
        ...(style || {}),
        padding: '4px 0', fontSize: style?.fontSize || 'inherit', fontWeight: style?.fontWeight || 'inherit',
        color: style?.color || 'inherit',
      }}
    />
  );
}

// ── Owner Edit Banner ────────────────────────────────────────
function OwnerEditBanner({ onGoToFrontDesk, dirty, saving, onSave, onExitEditMode }) {
  return (
    <>
      {/* Save bar — fixed above the banner */}
      <div style={{
        position: 'fixed', bottom: 'calc(54px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, zIndex: 9999,
        background: dirty ? '#2E7D5B' : '#22543d', padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        <button onClick={onSave} disabled={!dirty || saving} style={{
          background: dirty ? 'white' : 'rgba(255,255,255,0.3)', color: dirty ? '#2E7D5B' : 'rgba(255,255,255,0.5)',
          border: 'none', padding: '12px 24px', borderRadius: '10px', fontFamily: 'inherit',
          fontSize: '15px', fontWeight: '700', cursor: dirty ? 'pointer' : 'default', whiteSpace: 'nowrap',
          width: '100%', maxWidth: '320px', transition: 'all 0.2s',
        }}>{saving ? 'Saving...' : dirty ? 'Save Changes' : 'All saved ✓'}</button>
      </div>
      {/* Bottom banner */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#1a1a2e', color: 'white', padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>✏️ Tap any field to edit</div>
          <div style={{ fontSize: '10px', opacity: 0.6 }}>Only you see this</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { window.open('/frontdesk', '_blank'); }} style={{
            background: '#2E7D5B', color: 'white',
            border: 'none', padding: '8px 14px', borderRadius: '8px', fontFamily: 'inherit',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>Manage Bookings →</button>
          <button onClick={onExitEditMode} style={{
            background: 'none', color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.3)', padding: '8px 12px', borderRadius: '8px', fontFamily: 'inherit',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>Exit</button>
        </div>
      </div>
    </>
  );
}

// ── Owner Pencil Button (for non-owners / PIN entry) ───────────
function OwnerPencilButton({ isOwner, onReenterEditMode }) {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isInSetup = new URLSearchParams(window.location.search).has('setup') || 
    (window !== window.parent);

  // Auto-store PIN from URL param on first visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      try { localStorage.setItem('crmToken', pinParam); localStorage.setItem('isOwner', '1'); } catch(e) {}
      const url = new URL(window.location);
      url.searchParams.delete('pin');
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url);
    }
    if (params.has('welcome')) {
      try { localStorage.setItem('isOwner', '1'); } catch(e) {}
      const url = new URL(window.location);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url);
    }
  }, []);

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
        try { localStorage.setItem('crmToken', pin.trim()); localStorage.setItem('isOwner', '1'); } catch(e) {}
        window.location.reload();
      } else {
        setError(json.message || 'Incorrect PIN');
      }
    } catch (e) {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  // If owner is in edit mode, don't show pencil (they get the edit banner instead)
  if (isOwner) return null;

  // If owner exited edit mode but still has token, clicking pencil re-enters edit mode
  const hasToken = !!(localStorage.getItem('crmToken') || localStorage.getItem('isOwner'));

  return (
    <>
      <button
        className="owner-pencil-btn"
        onClick={() => {
          if (hasToken && onReenterEditMode) {
            onReenterEditMode();
          } else {
            setShowModal(true); setError(''); setPin('');
          }
        }}
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

// ── Photo Upload Overlay (on room images) ──────────────────────
function PhotoUploadOverlay({ roomId, onPhotosAdded }) {
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
    if (uploaded.length) onPhotosAdded(roomId, uploaded);
    // Reset input
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


// ── Add Room Button ────────────────────────────────────────────
function AddRoomButton({ hotelId }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    const token = localStorage.getItem('crmToken') || '';
    try {
      const res = await fetch(`${API_BASE_URL}/api/crm/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
        body: JSON.stringify({ name: name.trim(), maxOccupancy: 4, totalUnits: 1, hotelId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.message || 'Failed to add room. Name might already exist.');
        setAdding(false);
      }
    } catch (e) { 
      alert('Failed to add room');
      setAdding(false);
    }
  };

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} style={{
        width: '100%', padding: '16px', borderRadius: '14px', border: '2px dashed #D8E4DC',
        background: 'none', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
        color: '#6B7D72', cursor: 'pointer', marginTop: '12px', marginBottom: '24px', boxSizing: 'border-box',
        gridColumn: '1 / -1',
      }}>+ Add room type</button>
    );
  }

  return (
    <div style={{
      width: '100%', padding: '16px', borderRadius: '14px', border: '2px solid #D8E4DC',
      background: 'white', marginTop: '12px', marginBottom: '24px', boxSizing: 'border-box',
      gridColumn: '1 / -1',
    }}>
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Room name (e.g. King Suite)"
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D8E4DC', fontFamily: 'inherit', fontSize: '15px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleAdd} disabled={adding} style={{
          flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#2E7D5B',
          color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
        }}>{adding ? 'Adding...' : 'Add'}</button>
        <button onClick={() => setShowForm(false)} style={{
          padding: '10px 16px', borderRadius: '8px', border: '1.5px solid #D8E4DC', background: 'none',
          fontFamily: 'inherit', fontSize: '14px', color: '#6B7D72', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main BookingPage ───────────────────────────────────────────
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

  // Owner detection — use state so we can toggle edit mode off
  const [isOwner, setIsOwner] = useState(!!(localStorage.getItem('crmToken') || localStorage.getItem('isOwner')));
  const [showPencilTooltip, setShowPencilTooltip] = useState(false);

  // Process ?welcome and ?pin URL params to activate edit mode on first visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    let shouldActivate = false;
    if (pinParam) {
      try { localStorage.setItem('crmToken', pinParam); localStorage.setItem('isOwner', '1'); } catch(e) {}
      shouldActivate = true;
    }
    if (params.has('welcome')) {
      try { localStorage.setItem('isOwner', '1'); } catch(e) {}
      shouldActivate = true;
    }
    if (shouldActivate) {
      setIsOwner(true);
      const url = new URL(window.location);
      url.searchParams.delete('pin');
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url);
    }
  }, []);

  // Owners are always in edit mode — no toggle needed
  const isEditMode = isOwner;
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Exit edit mode: hide owner UI, show pencil tooltip
  const handleExitEditMode = () => {
    setIsOwner(false);
    setShowPencilTooltip(true);
  };

  // Editable hotel fields
  const [editName, setEditName] = useState(hotel.name);
  const [editSubtitle, setEditSubtitle] = useState(hotel.subtitle);
  const [editAddress, setEditAddress] = useState(hotel.address);

  // Sync when hotel prop changes
  useEffect(() => {
    setEditName(hotel.name);
    setEditSubtitle(hotel.subtitle);
    setEditAddress(hotel.address);
  }, [hotel.name, hotel.subtitle, hotel.address]);

  // Auto-save hotel info on field change (marks dirty, actual save on button)
  const saveHotelField = (updates) => {
    setDirty(true);
  };

  // Universal save — saves hotel info + all room data
  const handleUniversalSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('crmToken') || '';
    try {
      // Save hotel info
      await fetch(`${API_BASE_URL}/api/crm/hotel-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
        body: JSON.stringify({ name: editName, subtitle: editSubtitle, address: editAddress, hotelId }),
      });
      if (onHotelUpdate) onHotelUpdate({ name: editName, subtitle: editSubtitle, address: editAddress });
    } catch (e) { /* silent */ }
    // Trigger room saves via event
    window.dispatchEvent(new CustomEvent('saveAllRooms'));
    // Small delay to let room saves complete
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setDirty(false);
  };

  const handlePhotosAdded = (roomId, newImages) => {
    // Force a page reload to pick up new images from the API
    window.location.reload();
  };

  const formatDate = (date) => date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <>
      <div className="container" style={isOwner ? { paddingBottom: '80px' } : undefined}>
        <header className="header" style={{ position: 'relative' }}>
          {/* Pencil for non-owners */}
          <OwnerPencilButton isOwner={isOwner} onReenterEditMode={() => setIsOwner(true)} />

          {isEditMode ? (
            <>
              <EditableField value={editAddress} onChange={(val) => { setEditAddress(val); setDirty(true); }} onDirty={() => setDirty(true)} tag="p" className="header-address" placeholder="Add address" style={{ fontSize: '13px', color: '#6b7280' }} />
              <EditableField value={editName} onChange={(val) => { setEditName(val); setDirty(true); }} onDirty={() => setDirty(true)} tag="h1" placeholder="Hotel name" style={{ fontSize: '24px', fontWeight: '700' }} />
              <EditableField value={editSubtitle} onChange={(val) => { setEditSubtitle(val); setDirty(true); }} onDirty={() => setDirty(true)} tag="p" placeholder="Add a subtitle or slogan" style={{ fontSize: '14px', color: '#555' }} />
            </>
          ) : (
            <>
              <p className="header-address">{editAddress || hotel.address}</p>
              <h1>{editName || hotel.name}</h1>
              <p>{editSubtitle || hotel.subtitle}</p>
            </>
          )}
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
                const nights = checkinDate && checkoutDate
                  ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24))
                  : 0;

                let grandTotal, payToday, balanceDue;
                if (room.totalRate !== undefined && room.totalRate !== null) {
                  grandTotal = room.totalRate;
                  payToday = 0;
                  balanceDue = grandTotal;
                } else {
                  const subtotalBeforeTax = calculateTieredPrice(nights, rates);
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
                    isEditMode={isEditMode}
                    onPhotosAdded={handlePhotosAdded}
                    onRoomUpdate={() => window.location.reload()}
                    onRoomDelete={() => window.location.reload()}
                    hotelId={hotelId}
                    onDirty={() => setDirty(true)}
                  />
                );
              })}
              {/* Add Room button in edit mode */}
              {isEditMode && <AddRoomButton hotelId={hotelId} />}
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
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✏️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>Set up your hotel</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', maxWidth: '280px', margin: '0 auto' }}>
                Tap the pencil in the top right to manage your rooms, rates, and bookings.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Owner bottom banner — hide when calendar is open */}
      {isOwner && !isCalendarOpen && (
        <OwnerEditBanner
          dirty={dirty}
          saving={saving}
          onSave={handleUniversalSave}
          onGoToFrontDesk={() => { window.location.href = '/frontdesk'; }}
          onExitEditMode={handleExitEditMode}
        />
      )}

      {/* Pencil tooltip modal — shown after exiting edit mode */}
      {showPencilTooltip && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowPencilTooltip(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '280px',
            width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✏️</div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '6px' }}>
              Tap the pencil anytime to edit
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px', lineHeight: '1.4' }}>
              It's in the top-right corner of your booking page.
            </p>
            <button onClick={() => setShowPencilTooltip(false)} style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: '#1a1a2e', color: 'white', fontFamily: 'inherit',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

export default BookingPage;
