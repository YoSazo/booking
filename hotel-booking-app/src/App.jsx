import React, { useState, useEffect } from 'react';
import BookingPage from './BookingPage.jsx';
import GuestInfoPage from './GuestInfoPage.jsx';
import ConfirmationPage from './ConfirmationPage.jsx';
import HelpWidget from './HelpWidget.jsx';
import { trackAddToCart, trackInitiateCheckout, trackPurchase } from './trackingService.js';
import { hotelData } from './hotelData.js';

const hotelId = import.meta.env.VITE_HOTEL_ID || 'guest-lodge-minot';
const currentHotel = hotelData[hotelId];
const RATES = currentHotel.rates;

function App() {
  const [currentPage, setCurrentPage] = useState('booking');
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [finalBooking, setFinalBooking] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);
  const [reservationCode, setReservationCode] = useState('');
  
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    setCheckinDate(today);
    setCheckoutDate(null);
    // Use static rooms on initial load
    setAvailableRooms(currentHotel.rooms);
  }, [hotelId]); // Rerun if the hotel changes

  const checkAvailability = async (start, end) => {
    if (!start || !end) return;

    // Use static data if the selected hotel is not Cloudbeds-powered
    if (currentHotel.pms.toLowerCase() !== 'cloudbeds') {
      setAvailableRooms(currentHotel.rooms);
      return;
    }

    setIsLoading(true);
    setAvailableRooms([]);
    try {
      const response = await fetch('http://localhost:3001/api/availability', {
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
          return { ...staticRoomData, ...apiRoom }; // Combine API data with our static data
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
  
  const handleCompleteBooking = async (formData) => {
    if (currentHotel.pms !== 'Cloudbeds') {
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
      const response = await fetch('http://localhost:3001/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotelId,
          bookingDetails: finalBooking,
          guestInfo: formData,
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
    const bookingState = { ...room, guests: 1, pets: 0 };
    setSelectedRoom(bookingState);
    trackAddToCart({ ...bookingState, subtotal: room.totalRate });
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
      nights: nights,
      subtotal: subtotal,
      taxes: taxes,
      total: total,
    });
    setCurrentPage('guest-info');
    window.scrollTo(0, 0);
  };


  const generateReservationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const handleGuestCountChange = (newGuestCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, guests: newGuestCount }); };
  const handlePetCountChange = (newPetCount) => { if (selectedRoom) setSelectedRoom({ ...selectedRoom, pets: newPetCount }); };


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
      {(currentPage === 'booking' || currentPage === 'guest-info') && !isCalendarOpen && <HelpWidget phone={currentHotel.phone} />}
    </>
  );
}

export default App;

