import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import BookingPage from './BookingPage.jsx';
import GuestInfoPageWrapper from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import CheckoutReturnPage from './CheckoutReturnPage.jsx';
import HelpWidget from './HelpWidget.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';
import { hotelData } from './hotelData.js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';



const hotelId = import.meta.env.VITE_HOTEL_ID || 'guest-lodge-minot';
const currentHotel = hotelData[hotelId];
const RATES = currentHotel.rates;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  // State management
  
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  const [finalBooking, setFinalBooking] = useState(() => JSON.parse(sessionStorage.getItem('finalBooking')) || null);
  const [guestInfo, setGuestInfo] = useState(() => JSON.parse(sessionStorage.getItem('guestInfo')) || null);
  const [reservationCode, setReservationCode] = useState(() => sessionStorage.getItem('reservationCode') || '');
  const [clientSecret, setClientSecret] = useState(() => sessionStorage.getItem('clientSecret') || '');

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
    if (reservationCode) sessionStorage.setItem('reservationCode', reservationCode);
    if (clientSecret) sessionStorage.setItem('clientSecret', clientSecret);
  }, [finalBooking, guestInfo, reservationCode, clientSecret]);

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

  const generateReservationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleConfirmBooking = async () => {
  if (!selectedRoom) {
    alert("Please select a room first.");
    return;

    setIsProcessingBooking(true);
    try {
    // --- THIS IS WHERE YOU CALL YOUR BACKEND TO CREATE THE PAYMENT INTENT ---
    // For demonstration, we'll simulate a 1.5-second delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // After the delay, you would navigate to the next page
    // For example:
    // setBookingDetails(bookingDetails); 
    // navigate('/guest-info');

  } catch (error) {
    console.error("Error confirming booking:", error);
    // Handle any errors here, maybe show an error message to the user
  } finally {
    setIsProcessingBooking(false); // This will run whether the request succeeds or fails
  }
  }

  

  const nights = checkinDate && checkoutDate
    ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24))
    : 0;

  const subtotal = selectedRoom.subtotal || calculateTieredPrice(nights, RATES);
  const taxes = selectedRoom.taxesAndFees || subtotal * 0.10;
  const total = selectedRoom.grandTotal || subtotal + taxes;
  const ourReservationCode = generateReservationCode();


  const newBooking = {
    ...selectedRoom,
    checkin: checkinDate,
    checkout: checkoutDate,
    nights,
    subtotal,
    taxes,
    total,
    reservationCode: ourReservationCode,
  };

  // Optional: Keep setFinalBooking for sessionStorage persistence
  setFinalBooking(newBooking);

  // Wait for client secret before navigating
  try {
    const response = await fetch(`${API_BASE_URL}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newBooking.subtotal / 2 }),
    });
    const data = await response.json();
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
      // Pass booking data directly in navigate
      navigate('/guest-info', {
        state: {
          room: {
            name: selectedRoom.name,
            beds: selectedRoom.beds || 'N/A', // Ensure beds is defined
          },
          totalPrice: total,
          searchParams: {
            checkIn: checkinDate,
            checkOut: checkoutDate,
            nights,
            guests: selectedRoom.guests,
          },
        },
      });
      window.scrollTo(0, 0);
    } else {
      alert("Failed to load payment form. Please try again.");
    }
  } catch (error) {
    console.error("Failed to pre-fetch client secret:", error);
    alert("Failed to load payment form. Please try again.");
  }
};



  const handleCompleteBooking = async (formData, paymentIntentId) => {
    if (currentHotel.pms.toLowerCase() !== 'cloudbeds') {
      const newReservationCode = generateReservationCode();
      setGuestInfo(formData);
      setReservationCode(newReservationCode);
      trackPurchase(finalBooking, formData, newReservationCode);
      navigate('/confirmation');
      window.scrollTo(0, 0);
      return;
    }

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
        // --- START FIX 2C ---
        // Capture the final reservation code from the server's response
        setReservationCode(result.reservationCode); 
        // Update the finalBooking object with the PMS code for storage/session
        setFinalBooking(prev => ({ ...prev, pmsConfirmationCode: result.reservationCode }));
        trackPurchase(finalBooking, formData, result.reservationCode);
        // --- END FIX 2C ---
        navigate('/final-confirmation');
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

  const handleGuestCountChange = (newGuestCount) => {
    if (selectedRoom) setSelectedRoom({ ...selectedRoom, guests: newGuestCount });
  };
  const handlePetCountChange = (newPetCount) => {
    if (selectedRoom) setSelectedRoom({ ...selectedRoom, pets: newPetCount });
  };
  const handleOpenLightbox = (images, startIndex = 0) => {
    setLightboxData({ images, startIndex });
  };
  const handleCloseLightbox = () => {
    setLightboxData(null);
  };

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
            isProcessingBooking={isProcessingBooking}
            onCalendarOpen={() => setIsCalendarOpen(true)}
            onCalendarClose={() => setIsCalendarOpen(false)}
            onDatesChange={handleDatesUpdate}
            isLoading={isLoading}
            onOpenLightbox={handleOpenLightbox}
          />
        } />
        <Route path="/guest-info" element={
          <GuestInfoPageWrapper
            hotel={currentHotel}
            bookingDetails={finalBooking}
            onBack={() => navigate('/')}
            onComplete={handleCompleteBooking}
            apiBaseUrl={API_BASE_URL}
            clientSecret={clientSecret}
          />
        } />
        <Route path="/confirmation" element={
          <Elements stripe={stripePromise}>
            <CheckoutReturnPage onComplete={handleCompleteBooking} />
          </Elements>
        } />

        {/* This is the final, styled page the user will see */}
        <Route path="/final-confirmation" element={
          <ConfirmationPage 
            bookingDetails={finalBooking}
            guestInfo={guestInfo}
            reservationCode={reservationCode}
          />
        } />
      </Routes>
      
      {lightboxData && (
        <ImageLightbox
          images={lightboxData.images}
          startIndex={lightboxData.startIndex}
          onClose={handleCloseLightbox}
        />
      )}
      
      {/* {(currentPage === 'booking' || currentPage === 'guest-info') && !isCalendarOpen && <HelpWidget phone={currentHotel.phone} />} */}
    </>
  );
}

export default App;