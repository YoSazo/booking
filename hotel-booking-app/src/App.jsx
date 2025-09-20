import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import CheckoutReturnPage from './CheckoutReturnPage.jsx';
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
  if (nights === 28) return rates.MONTHLY;
  if (nights < 7) return nights * rates.NIGHTLY;
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
  const navigate = useNavigate();

  // State management
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  // State to persist booking data across the Stripe redirect
  const [finalBooking, setFinalBooking] = useState(() => {
    const saved = sessionStorage.getItem('finalBooking');
    return saved ? JSON.parse(saved) : null;
  });
  const [guestInfo, setGuestInfo] = useState(() => {
      const saved = sessionStorage.getItem('guestInfo');
      return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const today = new Date();
    setCheckinDate(today);
    setCheckoutDate(null);
    setAvailableRooms(currentHotel.rooms);
  }, [hotelId]);

  // Save booking data to sessionStorage whenever it changes
  useEffect(() => {
    if (finalBooking) sessionStorage.setItem('finalBooking', JSON.stringify(finalBooking));
    if (guestInfo) sessionStorage.setItem('guestInfo', JSON.stringify(guestInfo));
  }, [finalBooking, guestInfo]);

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
          hotelId,
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
    
    setFinalBooking({
      ...selectedRoom,
      checkin: checkinDate,
      checkout: checkoutDate,
      nights,
      subtotal,
      taxes,
      total,
    });

    navigate('/guest-info');
    window.scrollTo(0, 0);
  };

  const handleCompleteBooking = async (formData, paymentIntentId) => {
    // This is now the final step for both regular card and express payments
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          bookingDetails: finalBooking,
          guestInfo: formData,
          paymentIntentId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setGuestInfo(formData);
        // Important: Update the finalBooking with the real PMS code for the confirmation page
        setFinalBooking(prev => ({...prev, pmsConfirmationCode: result.reservationID}));
        trackPurchase(finalBooking, formData, result.reservationID);
        navigate('/confirmation');
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

  const handleGuestCountChange = (newGuestCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, guests: newGuestCount }); };
  const handlePetCountChange = (newPetCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, pets: newPetCount }); };
  const handleOpenLightbox = (images, startIndex = 0) => { setLightboxData({ images, startIndex }); };
  const handleCloseLightbox = () => { setLightboxData(null); };

  return (
    <>
      <Routes>
        <Route path="/" element={
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
        } />
        <Route path="/guest-info" element={
          <GuestInfoPage
            hotel={currentHotel}
            bookingDetails={finalBooking}
            onBack={() => navigate('/')}
            onComplete={handleCompleteBooking}
            apiBaseUrl={API_BASE_URL}
          />
        } />
        <Route path="/confirmation" element={
          <CheckoutReturnPage />
        } />
      </Routes>
      
      {lightboxData && (
        <ImageLightbox
          images={lightboxData.images}
          startIndex={lightboxData.startIndex}
          onClose={handleCloseLightbox}
        />
      )}
      
      {!isCalendarOpen && <HelpWidget phone={currentHotel.phone} />}
    </>
  );
}

export default App;