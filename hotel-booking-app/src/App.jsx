import React, { useState, useEffect } from 'react';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';

const NIGHTLY = 59;
const WEEKLY = 250;
const MONTHLY = 950;
const WEEK_N = +(WEEKLY / 7).toFixed(2);
const MONTHLY_NIGHTS_THRESHOLD = 30;

const calculateTieredPrice = (nights) => {
  if (nights <= 0) return 0;
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
  { id: 1, name: 'Deluxe Single King', amenities: 'Free WiFi • 55" TV • Mini Fridge • Workstation', description: 'A spacious, modern room featuring a plush king-sized bed, perfect for couples or business travelers.', maxOccupancy: 3, imageUrl: '/KING-BED.jpg' },
  { id: 2, name: 'Deluxe Double Queen', amenities: 'Free WiFi • Soaking Tub • Balcony Access', description: 'Ideal for families or groups, this room offers two comfortable queen beds and extra space to relax.', maxOccupancy: 4, imageUrl: '/QWEEN-BED.jpg' },
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
    setSelectedRoom({ ...room, guests: 1, pets: 0 });
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

  // --- THIS IS THE CORRECTED LOGIC ---
  // The 'nights' calculation now ONLY depends on the dates, not on whether a room has been selected.
  const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
  const subtotal = calculateTieredPrice(nights);
  const taxes = subtotal * 0.10;
  const total = subtotal + taxes;

  const handleConfirmBooking = () => {
    setFinalBooking({
      ...selectedRoom,
      checkin: checkinDate, checkout: checkoutDate, nights: nights,
      subtotal: subtotal, taxes: taxes, total: total
    });
    setCurrentPage('guest-info');
    window.scrollTo(0, 0);
  };
  
  const handleCompleteBooking = (formData) => {
    setGuestInfo(formData);
    setReservationCode(generateReservationCode());
    setCurrentPage('confirmation');
    window.scrollTo(0, 0);
  };

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