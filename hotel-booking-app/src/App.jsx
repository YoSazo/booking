// Triggering a fresh deployment
import React, { useState, useEffect } from 'react';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import HelpWidget from './HelpWidget.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';
import { hotelData } from './hotelData.js';

const hotelId = import.meta.env.VITE_HOTEL_ID || 'guest-lodge-minot';
const currentHotel = hotelData[hotelId];
const RATES = currentHotel.rates;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const calculateTieredPrice = (nights, rates) => {
  if (nights <= 0 || !rates) return 0;
  if (nights === 28) { return rates.MONTHLY; }
  if (nights < 7) { return nights * rates.NIGHTLY; }
  const WEEK_N = +(rates.WEEKLY / 7).toFixed(2);
  const MONTHLY_NIGHTS_THRESHOLD = 30;
  let discountedTotalRem = nights;
  let discountedTotal = 0;
  discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * rates.MONTHLY;
  discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;
  discountedTotal += Math.floor(discountedTotalRem / 7) * rates.WEEKLY;
  discountedTotalRem %= 7;
  discountedTotal += discountedTotalRem * WEEK_N;
  return +discountedTotal.toFixed(2);
};

function App() {
  const [currentPage, setCurrentPage] = useState('booking');
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [finalBooking, setFinalBooking] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);
  const [reservationCode, setReservationCode] = useState('');
  const [lightboxData, setLightboxData] = useState(null); 
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    setCheckinDate(today);
    setCheckoutDate(null);
    setAvailableRooms(currentHotel.rooms);
  }, [hotelId]);

  const checkAvailability = async (start, end) => {
    if (!start || !end || currentHotel.pms.toLowerCase() !== 'cloudbeds') {
      setAvailableRooms(currentHotel.rooms);
      return;
    }
    setIsLoading(true);
    setAvailableRooms([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotelId,
          checkin: start.toISOString().split('T')[0],
          checkout: end.toISOString().split('T')[0],
        }),
      });
      const result = await response.json();
      if (result.success) {
        const mergedRooms = result.data.map(apiRoom => {
          const staticRoomData = currentHotel.rooms.find(r => r.name === apiRoom.roomName);
          return { ...staticRoomData, ...apiRoom };
        });
        setAvailableRooms(mergedRooms);
      } else {
        alert('Error checking availability: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      alert('Could not connect to the booking server. Please try again later.');
    }
    setIsLoading(false);
  };

  const handleDatesUpdate = (dates) => {
    setCheckinDate(dates.start);
    setCheckoutDate(dates.end);
    checkAvailability(dates.start, dates.end);
  };
  
  const handleCompleteBooking = async (formData, paymentIntentId) => {
    if (currentHotel.pms.toLowerCase() !== 'cloudbeds') {
      const newReservationCode = generateReservationCode();
      setGuestInfo(formData);
      setReservationCode(newReservationCode);
      trackPurchase(finalBooking, formData, newReservationCode);
      setCurrentPage('confirmation');
      window.scrollTo(0, 0);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotelId,
          bookingDetails: finalBooking,
          guestInfo: formData,
          paymentIntentId: paymentIntentId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setGuestInfo(formData);
        setReservationCode(result.reservationID);
        trackPurchase(finalBooking, formData, result.reservationID);
        setCurrentPage('confirmation');
        window.scrollTo(0, 0);
      } else {
        alert('Booking failed: ' + (result.message || 'An unknown error occurred.'));
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Could not connect to the booking server to finalize your reservation.');
    }
    setIsLoading(false);
  };

  const handleRoomSelect = (room) => {
    if (!checkinDate || !checkoutDate) {
      alert('Please select your check-in and check-out dates first.');
      setIsCalendarOpen(true);
      return;
    }
    const bookingState = { ...room, guests: 1, pets: 0 };
    setSelectedRoom(bookingState);
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    const subtotal = room.subtotal || calculateTieredPrice(nights, RATES);
    trackAddToCart({ ...bookingState, subtotal });
  };
  
  const handleConfirmBooking = () => {
    if (!selectedRoom) {
      alert("Please select a room first.");
      return;
    }
    const nights = checkinDate && checkoutDate ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) : 0;
    const subtotal = selectedRoom.subtotal || calculateTieredPrice(nights, RATES);
    const taxes = selectedRoom.taxesAndFees || subtotal * 0.10;
    const total = selectedRoom.grandTotal || subtotal + taxes;
    trackInitiateCheckout({ ...selectedRoom, subtotal });
    const ourReservationCode = generateReservationCode();
    setFinalBooking({
      ...selectedRoom,
      checkin: checkinDate,
      checkout: checkoutDate,
      nights: nights,
      subtotal: subtotal,
      taxes: taxes,
      total: total,
      reservationCode: ourReservationCode
    });
    setCurrentPage('guest-info');
    window.scrollTo(0, 0);
  };

  const generateReservationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return result;
  };

  const handleGuestCountChange = (newGuestCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, guests: newGuestCount }); };
  const handlePetCountChange = (newPetCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, pets: newPetCount }); };
  const handleOpenLightbox = (images, startIndex = 0) => { setLightboxData({ images, startIndex }); };
  const handleCloseLightbox = () => { setLightboxData(null); };

  return (
    <>
      {currentPage === 'booking' && (
        <BookingPage
          hotel={currentHotel}
          roomData={availableRooms}
          rates={RATES}
          selectedRoom={selectedRoom}
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
          isLoading={isLoading}
          onOpenLightbox={handleOpenLightbox}
        />
      )}
      {currentPage === 'guest-info' && (
        <GuestInfoPage 
          hotel={currentHotel}
          bookingDetails={finalBooking} 
          onBack={() => setCurrentPage('booking')} 
          onComplete={handleCompleteBooking} 
          apiBaseUrl={API_BASE_URL}
        />
      )}
      {currentPage === 'confirmation' && (
        <ConfirmationPage 
          bookingDetails={finalBooking} 
          guestInfo={guestInfo} 
          reservationCode={reservationCode} 
        />
      )}
      {lightboxData && (
        <ImageLightbox 
          images={lightboxData.images}
          startIndex={lightboxData.startIndex}
          onClose={handleCloseLightbox}
        />
      )}
      {(currentPage === 'booking' || currentPage === 'guest-info') && !isCalendarOpen && <HelpWidget phone={currentHotel.phone} />}
    </>
  );
}

export default App;