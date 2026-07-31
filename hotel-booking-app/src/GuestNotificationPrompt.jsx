import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { isStandalone } from './pwaUtils.js';
import { enableGuestPush, guestPushStatus, prepareGuestPush } from './guestPushNotifications.js';

export default function GuestNotificationPrompt({ apiBaseUrl = '', hotelId, guestStay }) {
  const [status, setStatus] = useState(() => guestPushStatus(hotelId, guestStay?.code));
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareAttempt, setPrepareAttempt] = useState(0);

  useEffect(() => {
    const sync = () => setStatus(guestPushStatus(hotelId, guestStay?.code));
    sync();
    window.addEventListener('marketel:guest-push-change', sync);
    return () => window.removeEventListener('marketel:guest-push-change', sync);
  }, [hotelId, guestStay?.code]);

  useEffect(() => {
    if (!isStandalone() || !guestStay?.code || status !== 'available') return undefined;
    let cancelled = false;
    setPreparing(true);
    prepareGuestPush(apiBaseUrl)
      .then(async (result) => {
        // A returning guest may already have a valid browser subscription from
        // the older flow. Refresh its canonical reservation thread silently;
        // no permission prompt or new subscription is needed in that case.
        if (Notification.permission === 'granted' && result.subscription) {
          const refreshed = await enableGuestPush({ apiBaseUrl, hotelId, guestStay, prepared: result });
          if (!cancelled && refreshed.enabled) setStatus('enabled');
          return;
        }
        if (!cancelled) {
          setPrepared(result);
          setError('');
        }
      })
      .catch((prepareError) => {
        if (!cancelled) setError(prepareError.message || 'Reply alerts are temporarily unavailable.');
      })
      .finally(() => {
        if (!cancelled) setPreparing(false);
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl, guestStay, hotelId, status, prepareAttempt]);

  if (!isStandalone() || !guestStay?.code || status === 'enabled' || status === 'unsupported') {
    return null;
  }

  const handleEnable = async () => {
    setStatus('enabling');
    setError('');
    try {
      const result = await enableGuestPush({ apiBaseUrl, hotelId, guestStay, prepared });
      setStatus(result.enabled ? 'enabled' : guestPushStatus(hotelId, guestStay.code));
    } catch (requestError) {
      setStatus(guestPushStatus(hotelId, guestStay.code));
      setError(requestError.message || 'Could not turn on reply alerts. Try again.');
    }
  };

  if (status === 'denied') {
    return (
      <div style={styles.notice} role="status">
        <BellOff size={18} color="#66756c" aria-hidden />
        <span>Reply alerts are off. You can allow them in your phone’s notification settings.</span>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.copy}>
        <Bell size={19} color="#2E7D5B" aria-hidden />
        <div>
          <strong style={styles.title}>Know when Front Desk replies</strong>
          <span style={styles.subtitle}>Turn on alerts for this stay.</span>
        </div>
      </div>
      <button
        type="button"
        style={styles.button}
        onClick={prepared ? handleEnable : () => setPrepareAttempt((attempt) => attempt + 1)}
        disabled={status === 'enabling' || preparing}
      >
        {status === 'enabling' ? 'Turning on…' : preparing ? 'Getting ready…' : prepared ? 'Turn on' : 'Try again'}
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    margin: '0 0 16px',
    border: '1px solid #dfe8e2',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 3px 12px rgba(26, 43, 34, 0.05)',
    flexWrap: 'wrap',
  },
  copy: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 190 },
  title: { display: 'block', color: '#1a2b22', fontSize: 13, lineHeight: 1.3 },
  subtitle: { display: 'block', color: '#748078', fontSize: 12, marginTop: 2 },
  button: {
    minHeight: 36,
    padding: '8px 13px',
    border: 0,
    borderRadius: 10,
    background: '#2E7D5B',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  error: { flexBasis: '100%', margin: 0, color: '#b42318', fontSize: 12, lineHeight: 1.4 },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '10px 12px',
    margin: '0 0 16px',
    color: '#66756c',
    background: '#eef2ef',
    borderRadius: 12,
    fontSize: 12,
    lineHeight: 1.4,
  },
};
