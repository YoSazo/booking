import { useEffect, useRef, useState } from 'react';
import { useGuest } from './GuestProvider.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import { stayStorageSnapshot } from './guestStayState.js';

export default function useGuestStayDeepLink(requestedCode) {
  const cleanCode = String(requestedCode || '').trim();
  const {
    guestStay,
    guestStays,
    setGuestStay,
    selectGuestStay,
    apiBaseUrl,
    hotelId,
  } = useGuest();
  const attemptedRef = useRef('');
  const [error, setError] = useState('');
  const ready = !cleanCode || cleanCode === guestStay?.code;

  useEffect(() => {
    setError('');
    if (!cleanCode || cleanCode === guestStay?.code) return undefined;
    if (guestStays.some((stay) => stay.code === cleanCode)) {
      selectGuestStay(cleanCode);
      return undefined;
    }
    if (!hotelId || attemptedRef.current === cleanCode) return undefined;

    attemptedRef.current = cleanCode;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ hotelId, code: cleanCode });
        const response = await fetchWithTimeout(`${apiBaseUrl}/api/booking/lookup?${params}`, {}, 12000);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data.success || !data.booking) {
          setError(data.message || 'This reservation could not be opened.');
          return;
        }
        setGuestStay(stayStorageSnapshot(data.booking));
      } catch (_) {
        if (!cancelled) setError('This reservation could not be opened right now.');
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl, cleanCode, guestStay?.code, guestStays, hotelId, selectGuestStay, setGuestStay]);

  return {
    requestedStayCode: cleanCode,
    resolvingStay: Boolean(cleanCode && !ready && !error),
    requestedStayError: error,
  };
}
