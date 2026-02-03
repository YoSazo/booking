import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import BookingPage from './BookingPage.jsx';
import GuestInfoPageWrapper from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';
import { hotelData } from './hotelData.js';
import { calculateTieredPrice } from './priceCalculator.js';
import getHotelId from './utils/getHotelId';

// Lazy-load Stripe return page so Stripe does not load on the landing page.
const CheckoutReturnPageWrapper = lazy(() => import('./CheckoutReturnPageWrapper.jsx'));


const hotelId = getHotelId();
const currentHotel = hotelData[hotelId];

// (document title is set inside App() via a useEffect hook)
const RATES = currentHotel.rates;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // ✅ Notify Clarity of SPA route changes so recording continues
    if (typeof window.clarity === 'function') {
      window.clarity('set', 'page', pathname);
      
      // If user reached payment page, mark session as high-value
      if (pathname === '/guest-info') {
        window.clarity('upgrade', 'payment_page_reached');
        console.log('📊 Clarity: UPGRADED session for payment page');
      }
      
      console.log('📊 Clarity: Tracked route change to', pathname);
    } else {
      console.warn('⚠️ Clarity not loaded yet for pathname:', pathname);
    }
  }, [pathname]);

  return null;
}



function App() {
  const navigate = useNavigate();

  // Set page title per hotel (single deployment serving multiple properties)
  useEffect(() => {
    if (currentHotel?.name) {
      document.title = `${currentHotel.name} | Click Inns`;
    } else {
      document.title = 'Click Inns';
    }
  }, [currentHotel?.name]);
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

  // IMPORTANT: Avoid preloading entire room galleries on initial load.
  // Preloading every image can easily add 10–20MB to first load and destroy mobile performance.
  // If you want a small perceived-speed boost, you can preload ONLY the first visible hero image.
  useEffect(() => {
    const firstRoom = availableRooms?.[0];
    const hero = firstRoom?.imageUrls?.[0] || firstRoom?.imageUrl;
    if (!hero) return;

    const img = new Image();
    img.src = hero;
  }, [availableRooms]);


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
    if (!start || !end) {
      setAvailableRooms(currentHotel.rooms);
      return;
    }

    // Only Cloudbeds and BookingCenter support live availability
    const pms = (currentHotel.pms || '').toLowerCase();
    if (pms !== 'cloudbeds' && pms !== 'bookingcenter') {
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
      console.log('🔍 API Response:', result);  // ← ADD THIS
      if (result.success) {
        // Merge PMS availability into your marketing room cards.
        // Cloudbeds: apiRoom.roomName matches currentHotel.rooms[].name
        // BookingCenter: multiple RatePlanCodes can exist per RoomTypeCode, so we select one based on stay length.

        const nights = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));

        const pickBookingCenterRate = (options, tier, preferredCodes) => {
          if (!options?.length) return null;
          if (preferredCodes?.[tier]) {
            const exact = options.find(o => o.rateID === preferredCodes[tier]);
            if (exact) return exact;
          }
          // Some properties expose weekly ('WK') rate plans that are not bookable via API.
          // If a weekly plan is required, specify it explicitly via bookingCenterRatePlanCodes.weekly in hotelData.js.
          // Otherwise, prefer a non-WK plan even for 7+ nights.
          if (tier === 'weekly') {
            const nonWk = options.find(o => !(o.rateID || '').includes('WK'));
            if (nonWk) return nonWk;
          }
          return options[0];
        };

        const mergedRooms = currentHotel.rooms
          .map((staticRoom) => {
            if (pms === 'cloudbeds') {
              const apiRoom = result.data.find(r => r.roomName === staticRoom.name);
              return apiRoom ? { ...staticRoom, ...apiRoom } : null;
            }

            if (pms === 'bookingcenter') {
              const options = result.data.filter(r => r.roomTypeID === staticRoom.bookingCenterRoomTypeCode);
              if (!options.length) return null;

              const tier = nights >= 28 ? 'monthly' : nights >= 7 ? 'weekly' : 'nightly';
              const preferredCodes = staticRoom.bookingCenterRatePlanCodes;
              const picked = pickBookingCenterRate(options, tier, preferredCodes);
              if (!picked) return null;

              return {
                ...staticRoom,
                ...picked,
                roomTypeID: staticRoom.bookingCenterRoomTypeCode,
                rateID: (preferredCodes?.[tier]) || picked.rateID,
              };
            }

            return null;
          })
          .filter(Boolean);

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
    
    // ✅ Reset selection state when dates change
    setSelectedRoom(null);
    setFinalBooking(null); // Also clear any lingering final booking

    checkAvailability(dates.start, dates.end);
  };

  const handleRoomSelect = (room) => {
  if (!checkinDate || !checkoutDate) {
    setIsCalendarOpen(true);
    return;
  }
  
  // ✅ Clear any previous booking data when selecting a new room
  setFinalBooking(null);
  sessionStorage.removeItem('finalBooking');
  
  const bookingState = { 
    ...room, 
    guests: 1, 
    pets: 0,
    apiTotalRate: room.totalRate,
    apiSubtotal: room.subtotal,
    apiTaxes: room.taxes
  };
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

  // In App.jsx, update handleConfirmBooking function:
// In App.jsx, update handleConfirmBooking to go to guest-info first:
const handleConfirmBooking = async (bookingDetails) => {
  if (!selectedRoom) {
    alert("Please select a room first.");
    return;
  }

  setIsProcessingBooking(true);

  const nights = checkinDate && checkoutDate
    ? Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24))
    : 0;

  let subtotal, taxes, total;
  
  subtotal = calculateTieredPrice(nights, RATES);
  taxes = subtotal * 0.10;
  total = subtotal + taxes;

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
        amount: newBooking.total / 2,
        bookingDetails: stripeMetadata,
        guestInfo: { firstName: '', lastName: '', email: '', phone: '', zip: '' },
        hotelId: hotelId
      }),
    });
    
    const data = await response.json();
    
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
      
      // ALWAYS navigate to guest-info first (starts at step 1)
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



  const handleCompleteBooking = async (formData, paymentIntentId) => {
    console.log('🔴 handleCompleteBooking called with:', { formData, paymentIntentId });
    
    // ✅ Get the latest booking details from sessionStorage (in case trial booking modified it)
    const currentBooking = JSON.parse(sessionStorage.getItem('finalBooking')) || finalBooking;
    
    // ✅ If this is a Pay Later booking, it's already been created - just navigate to confirmation
    if (currentBooking.bookingType === 'payLater') {
      console.log('✅ Pay Later booking already created. Skipping /api/book call.');
      setGuestInfo(formData);
      setReservationCode(currentBooking.pmsConfirmationCode || currentBooking.reservationCode);
      setFinalBooking(currentBooking);
      trackPurchase(currentBooking, formData, currentBooking.pmsConfirmationCode || currentBooking.reservationCode);
      navigate('/final-confirmation');
      window.scrollTo(0, 0);
      return;
    }
    
    const pms = (currentHotel.pms || '').toLowerCase();

    // For PMS types we don't support yet, fall back to local confirmation.
    // Cloudbeds and BookingCenter both support /api/book.
    if (pms !== 'cloudbeds' && pms !== 'bookingcenter') {
      const newReservationCode = generateReservationCode();
      setGuestInfo(formData);
      setReservationCode(newReservationCode);
      setFinalBooking(currentBooking); // ✅ Update state with current booking
      trackPurchase(currentBooking, formData, newReservationCode);
      navigate('/final-confirmation');
      window.scrollTo(0, 0);
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Calling /api/book with:', { 
        hotelId, 
        bookingDetails: currentBooking, 
        guestInfo: formData, 
        paymentIntentId 
      });
      
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          bookingDetails: currentBooking,
          guestInfo: formData,
          paymentIntentId,
        }),
      });
      
      const result = await response.json();
      console.log('📥 /api/book response:', result);
      
      if (result.success) {
        setGuestInfo(formData);
        setReservationCode(result.reservationCode); 
        setFinalBooking(prev => ({ ...currentBooking, pmsConfirmationCode: result.reservationCode }));
        trackPurchase(currentBooking, formData, result.reservationCode);
        navigate('/final-confirmation');
        window.scrollTo(0, 0);
      } else {
        console.error('❌ Booking failed:', result.message);
        alert('Booking failed: ' + (result.message || 'An unknown error occurred.'));
      }
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
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
            onBack={() => {
              // Reset booking state when going back to booking page
              setSelectedRoom(null);
              setFinalBooking(null);
              setClientSecret('');
              setCheckinDate(null);
              setCheckoutDate(null);
              setAvailableRooms(currentHotel.rooms);
              sessionStorage.removeItem('finalBooking');
              sessionStorage.removeItem('clientSecret');
              sessionStorage.removeItem('selectedPlan');
              navigate('/');
            }}
            onComplete={handleCompleteBooking}
            apiBaseUrl={API_BASE_URL}
            clientSecret={clientSecret}
          />
        } />
        <Route path="/confirmation" element={
          <Suspense fallback={null}>
            <CheckoutReturnPageWrapper onComplete={handleCompleteBooking} />
          </Suspense>
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