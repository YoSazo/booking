import React, { createContext, useContext, useState, useEffect } from 'react';

const GuestContext = createContext(null);

export function GuestProvider({ children }) {
  const [guestStay, setGuestStay] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedStay = localStorage.getItem('marketel_guest_stay');
    if (storedStay) {
      try {
        const stay = JSON.parse(storedStay);
        if (stay.code && stay.checkout) {
          // Check if checkout is in the future or today
          const checkoutDate = new Date(stay.checkout);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (checkoutDate >= today) {
            setGuestStay(stay);
            setIsGuest(true);
          } else {
            // Stay has passed, clear memory
            localStorage.removeItem('marketel_guest_stay');
          }
        }
      } catch (e) {
        localStorage.removeItem('marketel_guest_stay');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (stayData) => {
    localStorage.setItem('marketel_guest_stay', JSON.stringify(stayData));
    setGuestStay(stayData);
    setIsGuest(true);
  };

  const logout = () => {
    localStorage.removeItem('marketel_guest_stay');
    setGuestStay(null);
    setIsGuest(false);
  };

  return (
    <GuestContext.Provider value={{ isGuest, guestStay, login, logout, isLoading }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
