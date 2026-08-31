import React, { useEffect, useMemo, useState } from 'react';
import { PawPrint, Users } from 'lucide-react';
import RoomCard from './RoomCard.jsx';
import InstallAppBanner from './InstallAppBanner.jsx';
import CalendarModal from './CalendarModal.jsx';
import { isAndroid, resolvePropertyIconUrl } from './guestInstallUi.jsx';
import { trackPageView, trackHotelFunnel } from './trackingService.js';
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
  apiBaseUrl,
}) {
  const ownerPreview = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('preview') || window !== window.parent;
  }, []);
  const initialSavedHighlight = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('preview')) return null;
    const target = params.get('previewHighlight');
    const allowed = new Set(['header', 'header-name', 'header-subtitle', 'header-address', 'header-phone', 'room', 'room-photo']);
    if (!allowed.has(target)) return null;
    return {
      target,
      roomId: params.get('previewHighlightRoom') || '',
    };
  }, []);
  const [savedHighlight, setSavedHighlight] = useState(initialSavedHighlight);
  const [isDesktopBooking, setIsDesktopBooking] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  ));

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktopBooking(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!savedHighlight?.target) return undefined;
    const selector = `[data-preview-highlight="${savedHighlight.target}"]`;
    let attempts = 0;
    const revealChangedElement = () => {
      const element = document.querySelector(selector);
      if (!element) return false;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    };
    const initialTimer = window.setTimeout(revealChangedElement, 260);
    const retryTimer = window.setInterval(() => {
      attempts += 1;
      if (revealChangedElement() || attempts >= 16) window.clearInterval(retryTimer);
    }, 250);
    const clearTimer = window.setTimeout(() => setSavedHighlight(null), 5600);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(retryTimer);
      window.clearTimeout(clearTimer);
    };
  }, [savedHighlight]);

  const savedTargetClass = (target) => savedHighlight?.target === target ? 'preview-saved-target' : '';
  useEffect(() => {
    if (!ownerPreview) trackPageView();
  }, [ownerPreview]);
  useEffect(() => { setIsProcessingBooking(false); }, [setIsProcessingBooking]);
  // Per-hotel funnel: page view (owner's "Get found" metrics). Throttled per session.
  useEffect(() => {
    if (ownerPreview) return;
    const id = hotel?.id || hotelId;
    if (id) trackHotelFunnel('page_view', id);
  }, [ownerPreview, hotel, hotelId]);

  const ownerScrollInstall = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('scroll') === 'install';
  }, []);

  useEffect(() => {
    if (!ownerScrollInstall) return undefined;

    let cancelled = false;
    const scrollToInstall = () => {
      const el = document.getElementById('guest-install');
      if (!el || cancelled) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    };

    if (scrollToInstall()) return undefined;

    const interval = setInterval(() => {
      if (scrollToInstall()) clearInterval(interval);
    }, 250);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ownerScrollInstall, isLoading, roomData]);

  const showInstallBanner = (!isAndroid() || ownerPreview) && (roomData?.length > 0 || ownerScrollInstall);
  const railRoom = selectedRoom || roomData?.[0] || null;
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
  const railPricing = useMemo(() => {
    if (!railRoom || nights <= 0) return null;
    let grandTotal;
    if (railRoom.totalRate !== undefined && railRoom.totalRate !== null) {
      grandTotal = Number(railRoom.totalRate);
    } else {
      const subtotalBeforeTax = calculateTieredPrice(nights, rates);
      grandTotal = subtotalBeforeTax + subtotalBeforeTax * Number(rates?.taxRate ?? 0.10);
    }
    return { payToday: 0, balanceDue: grandTotal };
  }, [railRoom, nights, rates]);

  const handleRailBook = () => {
    if (!railRoom || nights <= 0) return;
    if (selectedRoom?.id === railRoom.id) {
      onConfirmBooking({ guests: selectedRoom.guests, pets: selectedRoom.pets });
      return;
    }
    onRoomSelect(railRoom);
  };

  return (
    <div className={`container booking-page${showInstallBanner ? ' has-mobile-install' : ''}`}>
      <header className={`header ${savedTargetClass('header')}`.trim()} data-preview-highlight="header">
        <div className="header-identity">
          <h1 className={savedTargetClass('header-name')} data-preview-highlight="header-name">
            {hotel.name}
          </h1>
          {hotel.subtitle && (
            <p className={`header-subtitle ${savedTargetClass('header-subtitle')}`.trim()} data-preview-highlight="header-subtitle">
              {hotel.subtitle}
            </p>
          )}
        </div>
        {(hotel.address || hotel.phone) && (
          <div className="header-meta" aria-label="Property contact information">
            {hotel.address && (
              <p className={`header-address ${savedTargetClass('header-address')}`.trim()} data-preview-highlight="header-address">
                {hotel.address}
              </p>
            )}
            {hotel.address && hotel.phone && <span className="header-meta-separator" aria-hidden="true">·</span>}
            {hotel.phone && (
              <a
                className={`header-phone ${savedTargetClass('header-phone')}`.trim()}
                data-preview-highlight="header-phone"
                href={`tel:${hotel.phone}`}
              >
                {hotel.phone}
              </a>
            )}
          </div>
        )}
      </header>

      <div className="booking-page-layout">
      <div className="booking-page-main">
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

              let grandTotal, payToday, balanceDue, taxes;
              if (room.totalRate !== undefined && room.totalRate !== null) {
                grandTotal = room.totalRate;
                taxes = Number(room.taxes ?? room.apiTaxes ?? 0);
                payToday = 0;
                balanceDue = grandTotal;
              } else {
                const subtotalBeforeTax = calculateTieredPrice(nightsCalc, rates);
                taxes = subtotalBeforeTax * Number(rates?.taxRate ?? 0.10);
                grandTotal = subtotalBeforeTax + taxes;
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
                  taxes={taxes}
                  payToday={payToday}
                  balanceDue={balanceDue}
                  isProcessing={isProcessingBooking}
                  roomsAvailable={currentRoomData.roomsAvailable}
                  checkinDate={checkinDate}
                  checkoutDate={checkoutDate}
                  isEditMode={false}
                  hotelId={hotelId}
                  previewSavedPart={(
                    savedHighlight?.target?.startsWith('room')
                    && (!savedHighlight.roomId || String(savedHighlight.roomId) === String(room.id))
                  ) ? savedHighlight.target : null}
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
      {showInstallBanner && isDesktopBooking && (
        <div className="booking-desktop-install">
          <InstallAppBanner
            hotelName={hotel.name}
            appIconUrl={resolvePropertyIconUrl(hotel, roomData)}
            hotelId={hotelId}
            ownerPreview={ownerPreview}
            flush
            touchpoint={ownerPreview ? 'frontdesk-preview' : 'booking-page'}
            apiBaseUrl={apiBaseUrl}
            hotelSubscribed={hotel.subscribed !== false}
          />
        </div>
      )}
      </div>

      <aside className="booking-desktop-rail" aria-label="Choose dates and book">
        <CalendarModal
          inline
          isOpen
          onClose={() => {}}
          onDatesChange={onDatesChange}
          initialCheckin={checkinDate}
          initialCheckout={checkoutDate}
          rates={rates}
        />
        <p className="booking-rail-meta">
          {nights > 0
            ? `${nights} night${nights === 1 ? '' : 's'} · ${railRoom?.name || 'Select a room'}`
            : 'Pick check-in and check-out, then continue.'}
        </p>
        {nights > 0 && railPricing ? (
          <div className="premium-pricing-card">
            <div className="pricing-main">
              <span className="price-today-large">${railPricing.payToday.toFixed(0)}</span>
              <span className="price-today-label">today</span>
            </div>
            <p className="pricing-subtitle">
              Pay <span className="price-balance-highlight">${railPricing.balanceDue.toFixed(2)}</span> when you arrive
            </p>
          </div>
        ) : (
          <div className="premium-pricing-card premium-pricing-card--empty">
            <p className="pricing-empty-title">Choose dates to see rates</p>
            <p className="pricing-subtitle">
              Pick your check-in and check-out to see the price for this room.
            </p>
          </div>
        )}
        {selectedRoom ? (
          <div className="booking-controls-section">
            <div className="inline-selectors">
              <div className="inline-selector-item">
                <div className="selector-label">
                  <Users size={18} />
                  <span>Guests</span>
                </div>
                <div className="custom-stepper">
                  <button type="button" className="stepper-btn" onClick={() => onGuestsChange(Math.max(1, selectedRoom.guests - 1))} disabled={selectedRoom.guests <= 1}>−</button>
                  <span className="stepper-value">{selectedRoom.guests}</span>
                  <button type="button" className="stepper-btn" onClick={() => onGuestsChange(Math.min(selectedRoom.maxOccupancy || 4, selectedRoom.guests + 1))} disabled={selectedRoom.guests >= (selectedRoom.maxOccupancy || 4)}>+</button>
                </div>
              </div>
              <div className="inline-selector-item">
                <div className="selector-label">
                  <PawPrint size={18} />
                  <span>Pets</span>
                </div>
                <div className="custom-stepper">
                  <button type="button" className="stepper-btn" onClick={() => onPetsChange(Math.max(0, selectedRoom.pets - 1))} disabled={selectedRoom.pets <= 0}>−</button>
                  <span className="stepper-value">{selectedRoom.pets}</span>
                  <button type="button" className="stepper-btn" onClick={() => onPetsChange(Math.min(2, selectedRoom.pets + 1))} disabled={selectedRoom.pets >= 2}>+</button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="premium-book-button"
              onClick={handleRailBook}
              disabled={isProcessingBooking}
            >
              {isProcessingBooking ? 'Processing...' : 'Reserve for $0'}
            </button>
          </div>
        ) : (
          <div className="booking-controls-section">
            <button
              type="button"
              className="premium-select-button"
              onClick={handleRailBook}
              disabled={!railRoom || nights <= 0}
            >
              {nights > 0 ? 'Continue Booking' : 'Select Room'}
            </button>
          </div>
        )}
      </aside>
      </div>

      {showInstallBanner && !isCalendarOpen && !isDesktopBooking && (
        <div className="booking-install-mobile-only">
          <InstallAppBanner
            hotelName={hotel.name}
            appIconUrl={resolvePropertyIconUrl(hotel, roomData)}
            hotelId={hotelId}
            ownerPreview={ownerPreview}
            sticky
            bottomOffset={14}
            touchpoint={ownerPreview ? 'frontdesk-preview' : 'booking-page'}
            apiBaseUrl={apiBaseUrl}
            hotelSubscribed={hotel.subscribed !== false}
          />
        </div>
      )}
    </div>
  );
}

export default BookingPage;
