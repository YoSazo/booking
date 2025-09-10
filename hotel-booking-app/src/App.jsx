import React, { useState, useEffect } from 'react';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
// --- UPDATED: Import the remapped tracking functions ---
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';

// ... (Constants and calculator function remain the same) ...
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
const roomData = [
  { id: 1, name: 'Deluxe Single King', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 3, imageUrl: '/KING-BED.jpg' },
  { id: 2, name: 'Deluxe Double Queen', amenities: 'Free WiFi • 30" TV • Workstation • Fridge • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 4, imageUrl: '/QWEEN-BED.jpg' },
];

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

    // --- UPDATED: This now triggers the AddToCart event ---
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
    // --- UPDATED: This now triggers the InitiateCheckout event ---
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
    
    // --- UPDATED: Pass the full formData to trackPurchase ---
    trackPurchase(finalBooking, formData, newReservationCode);

    setCurrentPage('confirmation');
    window.scrollTo(0, 0);
  };

  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
  const subtotal = calculateTieredPrice(nights);
  const taxes = subtotal * 0.10;
  const total = subtotal + taxes;

  if (currentPage === 'confirmation') {
    return <ConfirmationPage bookingDetails={finalBooking} guestInfo={guestInfo} reservationCode={reservationCode} />;
  }
  
  if (currentPage === 'guest-info') {
    return <GuestInfoPage bookingDetails={finalBooking} onBack={() => setCurrentPage('booking')} onComplete={handleCompleteBooking} />;
  }

  return (
    <BookingPage
      roomData={roomData} selectedRoom={selectedRoom} nights={nights}
      subtotal={subtotal} taxes={taxes}
      checkinDate={checkinDate} checkoutDate={checkoutDate} isCalendarOpen={isCalendarOpen}
      onRoomSelect={handleRoomSelect} onGuestsChange={handleGuestCountChange}
      onPetsChange={handlePetCountChange}
      onConfirmBooking={handleConfirmBooking}
      onCalendarOpen={() => setIsCalendarOpen(true)} onCalendarClose={() => setIsCalendarOpen(false)}
      onDatesUpdate={handleDatesUpdate}
    />
  );
}

export default App;