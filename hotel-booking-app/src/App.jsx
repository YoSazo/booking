import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]); // This effect runs every time the path changes

  return null;
}


function App() {
  const navigate = useNavigate();
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  // State management
  const location = useLocation(); 
  
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
    today.setHours(0, 0, 0, 0);
    setCheckinDate(today);
    setCheckoutDate(null);
    setAvailableRooms(currentHotel.rooms);
  }, [hotelId]);

  useEffect(() => {
        // If the user is on the booking page, reset the processing state
        if (location.pathname === '/') {
            setIsProcessingBooking(false);
        }
    }, [location]);

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

  const handleConfirmBooking = async (bookingDetails) => {
  if (!selectedRoom) {
    alert("Please select a room first.");
    return;
  }

  setIsProcessingBooking(true);

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

  setFinalBooking(newBooking);

  // ONLY send essential data to Stripe (strip out images, descriptions, etc.)
  const stripeMetadata = {
    roomTypeID: newBooking.roomTypeID,
    rateID: newBooking.rateID,
    roomName: newBooking.name,
    checkin: newBooking.checkin.toISOString(),
    checkout: newBooking.checkout.toISOString(),
    nights: newBooking.nights,
    guests: newBooking.guests,
    subtotal: newBooking.subtotal,
    taxes: newBooking.taxes,
    total: newBooking.total,
    reservationCode: ourReservationCode
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: newBooking.subtotal / 2,
        bookingDetails: stripeMetadata, // ← Use stripped-down version
        guestInfo: { firstName: '', lastName: '', email: '', phone: '', zip: '' },
        hotelId: hotelId
      }),
    });
    
    const data = await response.json();
    
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
      navigate('/guest-info', {
        state: {
          room: {
            name: selectedRoom.name,
            beds: selectedRoom.beds || 'N/A',
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
    } else {
      alert("Failed to load payment form. Please try again.");
      setIsProcessingBooking(false);
    }
  } catch (error) {
    console.error("Failed to pre-fetch client secret:", error);
    alert("Failed to load payment form. Please try again.");
    setIsProcessingBooking(false);
  }
};



  // hotel-booking-app/src/App.jsx

const handleCompleteBooking = async (formData, paymentIntentId) => {
  // The 'async' keyword is restored to prevent rendering issues.
  
  // The webhook handles the booking, so we just navigate the user.
  setGuestInfo(formData);
  setReservationCode(paymentIntentId); // Use paymentIntentId as a temporary code
  
  navigate('/confirmation');
  window.scrollTo(0, 0);
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
    <ScrollToTop />
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
            isProcessingBooking={isProcessingBooking}
            setIsProcessingBooking={setIsProcessingBooking}
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