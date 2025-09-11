import React, { useState, useEffect } from 'react';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import HelpWidget from './HelpWidget.jsx';
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';
import { hotelData } from './hotelData.js';

// --- This is the NEW, DYNAMIC way to get the hotel and room data ---
const hotelId = import.meta.env.VITE_HOTEL_ID || 'guest-lodge-minot';
const currentHotel = hotelData[hotelId];
const roomData = currentHotel.rooms; // This is the only roomData definition we need

const NIGHTLY = 59;
const WEEKLY = 250;
const MONTHLY = 950;
const WEEK_N = +(WEEKLY / 7).toFixed(2);
const MONTHLY_NIGHTS_THRESHOLD = 30;

const calculateTieredPrice = (nights) => {
  if (nights <= 0) return 0;
  if (nights === 28) { return 950; }
  if (nights < 7) { return nights * NIGHTLY; }
  let discountedTotalRem = nights;
  let discountedTotal = 0;
  discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * MONTHLY;
  discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
  discountedTotal += Math.floor(discountedTotalRem / 7) * WEEKLY;
  discountedTotalRem %= 7;
  discountedTotal += discountedTotalRem * WEEK_N;
  return +discountedTotal.toFixed(2);
};

// --- DELETED: The old, hardcoded roomData array that was here is now gone. ---

function App() {
  const [currentPage, setCurrentPage] = useState('booking');
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [finalBooking, setFinalBooking] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);
  const [reservationCode, setReservationCode] = useState('');

  useEffect(() => {
    const today = new Date();
    setCheckinDate(today);
    setCheckoutDate(null);
  }, []);

  const generateReservationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleRoomSelect = (room) => {
    if (!checkinDate || !checkoutDate) {
      alert('Please select your check-in and check-out dates.');
      setIsCalendarOpen(true);
      return;
    }
    const bookingState = { ...room, guests: 1, pets: 0 };
    setSelectedRoom(bookingState);
    
    const currentNights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
    const currentSubtotal = calculateTieredPrice(currentNights);
    trackAddToCart({ ...bookingState, nights: currentNights, subtotal: currentSubtotal });
  };

  const handleGuestCountChange = (newGuestCount) => {
    if (selectedRoom) setSelectedRoom({ ...selectedRoom, guests: newGuestCount });
  };
  const handlePetCountChange = (newPetCount) => {
    if (selectedRoom) setSelectedRoom({ ...selectedRoom, pets: newPetCount });
  };
  const handleDatesUpdate = (dates) => {
    setCheckinDate(dates.start);
    setCheckoutDate(dates.end);
  };
  
  const handleConfirmBooking = () => {
    trackInitiateCheckout({ ...selectedRoom, subtotal });
    setFinalBooking({
      ...selectedRoom,
      checkin: checkinDate, checkout: checkoutDate, nights: nights,
      subtotal: subtotal, taxes: taxes, total: total
    });
    setCurrentPage('guest-info');
    window.scrollTo(0, 0);
  };
  
  const handleCompleteBooking = (formData) => {
    const newReservationCode = generateReservationCode();
    setGuestInfo(formData);
    setReservationCode(newReservationCode);
    trackPurchase(finalBooking, formData, newReservationCode);
    setCurrentPage('confirmation');
    window.scrollTo(0, 0);
  };

  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
  const subtotal = calculateTieredPrice(nights);
  const taxes = subtotal * 0.10;
  const total = subtotal + taxes;

  return (
    <>
      {/* --- FIXED: Cleaned up the rendering logic to prevent duplicates --- */}
      {currentPage === 'booking' && (
        <BookingPage
          hotel={currentHotel}
          roomData={roomData}
          selectedRoom={selectedRoom}
          nights={nights}
          subtotal={subtotal}
          taxes={taxes}
          checkinDate={checkinDate}
          checkoutDate={checkoutDate}
          isCalendarOpen={isCalendarOpen}
          onRoomSelect={handleRoomSelect}
          onGuestsChange={handleGuestCountChange}
          onPetsChange={handlePetCountChange}
          onConfirmBooking={handleConfirmBooking}
          onCalendarOpen={() => setIsCalendarOpen(true)}
          onCalendarClose={() => setIsCalendarOpen(false)}
          onDatesChange={handleDatesUpdate}
        />
      )}
      
      {currentPage === 'guest-info' && (
        <GuestInfoPage 
          hotel={currentHotel}
          bookingDetails={finalBooking} 
          onBack={() => setCurrentPage('booking')} 
          onComplete={handleCompleteBooking} 
        />
      )}
      
      {currentPage === 'confirmation' && (
        <ConfirmationPage 
          bookingDetails={finalBooking} 
          guestInfo={guestInfo} 
          reservationCode={reservationCode} 
        />
      )}
      
      {(currentPage === 'booking' || currentPage === 'guest-info') && !isCalendarOpen && <HelpWidget />}
    </>
  );
}

export default App;