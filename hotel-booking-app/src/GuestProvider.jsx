import React, { createContext, useContext, useState, useEffect } from 'react';

const GuestContext = createContext(null);

export function GuestProvider({ children, apiBaseUrl = '', hotelId = '' }) {
  const [guestStay, setGuestStayState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('marketel_guest_stay');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only treat as active if checkout is today or later
        const checkout = new Date(parsed.checkout || parsed.checkoutDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (checkout >= today) {
          setGuestStayState(parsed);
        }
      }
    } catch (e) { /* ignore */ }
    setIsLoading(false);
  }, []);

  const setGuestStay = (stay) => {
    setGuestStayState(stay);
    try {
      if (stay) localStorage.setItem('marketel_guest_stay', JSON.stringify(stay));
      else localStorage.removeItem('marketel_guest_stay');
    } catch (e) { /* ignore */ }
  };

  const clearGuest = () => {
    setGuestStayState(null);
    try { localStorage.removeItem('marketel_guest_stay'); } catch (e) { /* ignore */ }
  };

  const isGuest = !!guestStay;

  return (
    <GuestContext.Provider value={{ isGuest, isLoading, guestStay, setGuestStay, clearGuest, apiBaseUrl, hotelId }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used within GuestProvider');
  return ctx;
}
