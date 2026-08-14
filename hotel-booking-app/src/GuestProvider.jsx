import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearGuestStay,
  readGuestStay,
  readGuestStays,
  mergeGuestStays as mergeStoredGuestStays,
  selectGuestStay as selectStoredGuestStay,
  writeGuestStay,
} from './guestStayStorage.js';

const GuestContext = createContext(null);

export function GuestProvider({ children, apiBaseUrl = '', hotelId = '' }) {
  const [guestStay, setGuestStayState] = useState(null);
  const [guestStays, setGuestStaysState] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const syncGuestStay = useCallback(() => {
    const storedStay = readGuestStay(hotelId);
    const storedStays = readGuestStays(hotelId);
    setGuestStayState((currentStay) => {
      if (JSON.stringify(currentStay) === JSON.stringify(storedStay)) return currentStay;
      return storedStay;
    });
    setGuestStaysState((currentStays) => (
      JSON.stringify(currentStays) === JSON.stringify(storedStays) ? currentStays : storedStays
    ));
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
    writeGuestStay(scoped);
    const storedStays = readGuestStays(hotelId);
    setGuestStaysState(storedStays);
    setGuestStayState(storedStays.find((candidate) => candidate.code === scoped?.code) || scoped);
    window.dispatchEvent(new CustomEvent('marketel:guest-stay-changed', {
      detail: { hotelId, connected: !!scoped },
    }));
    try {
      const channel = new BroadcastChannel('marketel-guest-session');
      channel.postMessage({ type: 'stay-updated', hotelId });
      channel.close();
    } catch (_) { /* BroadcastChannel is an optional cross-window accelerator. */ }
  }, [hotelId]);

  const selectGuestStay = useCallback((code) => {
    const selected = selectStoredGuestStay(hotelId, code);
    if (!selected) return false;
    setGuestStayState(selected);
    setGuestStaysState(readGuestStays(hotelId));
    window.dispatchEvent(new CustomEvent('marketel:guest-stay-changed', {
      detail: { hotelId, connected: true, selectedCode: selected.code },
    }));
    return true;
  }, [hotelId]);

  const updateGuestStays = useCallback((updates) => {
    const scopedUpdates = (Array.isArray(updates) ? updates : [updates])
      .filter(Boolean)
      .map((stay) => ({ ...stay, hotelId }));
    if (!hotelId || !scopedUpdates.length) return;
    mergeStoredGuestStays(scopedUpdates);
    syncGuestStay();
  }, [hotelId, syncGuestStay]);

  const clearGuest = useCallback(() => {
    setGuestStayState(null);
    setGuestStaysState([]);
    clearGuestStay(hotelId);
    window.dispatchEvent(new CustomEvent('marketel:guest-stay-changed', {
      detail: { hotelId, connected: false },
    }));
  }, [hotelId]);

  const isGuest = !!guestStay;
  const value = useMemo(() => ({
    isGuest,
    isLoading,
    guestStay,
    guestStays,
    setGuestStay,
    selectGuestStay,
    updateGuestStays,
    clearGuest,
    syncGuestStay,
    apiBaseUrl,
    hotelId,
  }), [isGuest, isLoading, guestStay, guestStays, setGuestStay, selectGuestStay, updateGuestStays, clearGuest, syncGuestStay, apiBaseUrl, hotelId]);

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
