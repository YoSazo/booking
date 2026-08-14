import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readGuestStay, writeGuestStay, clearGuestStay } from './guestStayStorage.js';

const GuestContext = createContext(null);

export function GuestProvider({ children, apiBaseUrl = '', hotelId = '' }) {
  const [guestStay, setGuestStayState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncGuestStay = useCallback(() => {
    const storedStay = readGuestStay(hotelId);
    setGuestStayState((currentStay) => {
      if (JSON.stringify(currentStay) === JSON.stringify(storedStay)) return currentStay;
      return storedStay;
    });
    return storedStay;
  }, [hotelId]);

  useEffect(() => {
    syncGuestStay();
    setIsLoading(false);
  }, [syncGuestStay]);

  // Safari, an installed PWA, and a returning magic-link window can all update
  // the same guest session. Re-read it whenever this surface becomes active
  // instead of requiring the guest to kill and reopen the app.
  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'hidden') syncGuestStay();
    };
    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('marketel-guest-session')
      : null;
    const onBroadcast = (event) => {
      if (event?.data?.type !== 'stay-updated') return;
      if (event.data.hotelId && event.data.hotelId !== hotelId) return;
      syncGuestStay();
    };

    window.addEventListener('focus', syncWhenVisible);
    window.addEventListener('pageshow', syncWhenVisible);
    window.addEventListener('storage', syncWhenVisible);
    window.addEventListener('marketel:guest-stay-changed', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);
    channel?.addEventListener('message', onBroadcast);
    return () => {
      window.removeEventListener('focus', syncWhenVisible);
      window.removeEventListener('pageshow', syncWhenVisible);
      window.removeEventListener('storage', syncWhenVisible);
      window.removeEventListener('marketel:guest-stay-changed', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      channel?.removeEventListener('message', onBroadcast);
      channel?.close();
    };
  }, [hotelId, syncGuestStay]);

  const setGuestStay = useCallback((stay) => {
    const scoped = stay && hotelId ? { ...stay, hotelId } : stay;
    setGuestStayState(scoped);
    writeGuestStay(scoped);
    window.dispatchEvent(new CustomEvent('marketel:guest-stay-changed', {
      detail: { hotelId, connected: !!scoped },
    }));
    try {
      const channel = new BroadcastChannel('marketel-guest-session');
      channel.postMessage({ type: 'stay-updated', hotelId });
      channel.close();
    } catch (_) { /* BroadcastChannel is an optional cross-window accelerator. */ }
  }, [hotelId]);

  const clearGuest = useCallback(() => {
    setGuestStayState(null);
    clearGuestStay();
    window.dispatchEvent(new CustomEvent('marketel:guest-stay-changed', {
      detail: { hotelId, connected: false },
    }));
  }, [hotelId]);

  const isGuest = !!guestStay;
  const value = useMemo(() => ({
    isGuest,
    isLoading,
    guestStay,
    setGuestStay,
    clearGuest,
    syncGuestStay,
    apiBaseUrl,
    hotelId,
  }), [isGuest, isLoading, guestStay, setGuestStay, clearGuest, syncGuestStay, apiBaseUrl, hotelId]);

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used within GuestProvider');
  return ctx;
}
