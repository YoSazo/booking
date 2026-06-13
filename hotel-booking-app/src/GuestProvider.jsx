import React, { createContext, useContext, useState, useEffect } from 'react';
import { readGuestStay, writeGuestStay, clearGuestStay } from './guestStayStorage.js';

const GuestContext = createContext(null);

export function GuestProvider({ children, apiBaseUrl = '', hotelId = '' }) {
  const [guestStay, setGuestStayState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setGuestStayState(readGuestStay(hotelId));
    setIsLoading(false);
  }, [hotelId]);

  const setGuestStay = (stay) => {
    const scoped = stay && hotelId ? { ...stay, hotelId } : stay;
    setGuestStayState(scoped);
    writeGuestStay(scoped);
  };

  const clearGuest = () => {
    setGuestStayState(null);
    clearGuestStay();
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
