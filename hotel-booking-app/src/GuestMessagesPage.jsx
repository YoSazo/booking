import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';

const QUICK_CHIPS = ['Early check-in', 'Late check-out', 'Extra towels', 'Quiet room'];

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function formatRelativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  // Older
  if (diffDays < 7) {
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GuestMessagesPage() {
  const { guestStay, apiBaseUrl, hotelId } = useGuest();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [selectedChips, setSelectedChips] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!guestStay?.code || !hotelId) return;
    try {
      const params = new URLSearchParams({
        hotelId,
        code: guestStay.code,
        email: guestStay.email || '',
      });
      const res = await fetch(`${apiBaseUrl}/api/guest-messages?${params}`);
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => {
          const newMessages = data.messages || [];
          // Only update if message count or content changed
          if (JSON.stringify(prev) !== JSON.stringify(newMessages)) {
            return newMessages;
          }
          return prev;
        });
      }
    } catch (e) { /* ignore */ }
    if (isInitial) setLoading(false);
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  // Register for push notifications (once per stay, when permission allows).
  useEffect(() => {
    if (!guestStay?.code || !hotelId || !apiBaseUrl) return;
    const flagKey = `guest_push_${hotelId}_${guestStay.code}`;
    if (localStorage.getItem(flagKey)) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm !== 'granted') return;

        const keyRes = await fetch(`${apiBaseUrl}/api/push/vapid-public`);
        const keyData = await keyRes.json().catch(() => ({}));
        if (!keyData.publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
          });
        }

        const bufToB64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
        await fetch(`${apiBaseUrl}/api/guest-push-subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId,
            reservationCode: guestStay.code,
            subscription: {
              endpoint: sub.endpoint,
              keys: {
                p256dh: bufToB64(sub.getKey('p256dh')),
                auth: bufToB64(sub.getKey('auth')),
              },
            },
          }),
        });
        localStorage.setItem(flagKey, '1');
      } catch (e) { /* ignore — messaging still works without push */ }
    })();
  }, [guestStay?.code, hotelId, apiBaseUrl]);

  // Initial load
  useEffect(() => {
    if (!guestStay?.code) {
      setLoading(false);
      return;
    }
    fetchMessages(true);
  }, [fetchMessages, guestStay?.code]);

  // Poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(false), 15000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // No auto-scroll — user lands at top of conversation

  // Mark hotel messages as read (fire-and-forget)
  useEffect(() => {
    if (!guestStay?.code || !hotelId) return;
    const unread = messages.filter((m) => m.sender === 'hotel' && !m.readAt);
    if (unread.length === 0) return;

    const markRead = async () => {
      try {
        await fetch(`${apiBaseUrl}/api/guest-messages/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId,
            code: guestStay.code,
            email: guestStay.email || '',
          }),
        });
      } catch (e) { /* ignore */ }
    };
    markRead();
  }, [messages, guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  const toggleChip = (chip) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSend = async () => {
    const body = messageText.trim();
    if (!body && selectedChips.length === 0) return;
    if (!hotelId || !guestStay?.code) return;

    setSending(true);

    // Optimistic add
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender: 'guest',
      body: body || selectedChips.join(', '),
      requests: selectedChips.length > 0 ? [...selectedChips] : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');
    setSelectedChips([]);

    try {
      await fetch(`${apiBaseUrl}/api/guest-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          reservationCode: guestStay.code,
          body,
          requests: optimisticMsg.requests || [],
          guestName: guestStay.name || '',
          guestEmail: guestStay.email || '',
          guestPhone: guestStay.phone || '',
        }),
      });
      // Refresh to get the server version
      setTimeout(() => fetchMessages(false), 1000);
    } catch (e) { /* ignore — message already shown optimistically */ }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!guestStay?.code) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Messages</h1>
          <p style={styles.headerSubtitle}>Front Desk</p>
        </div>
        <div style={styles.emptyContainer}>
          <div style={styles.emptyEmoji}>💬</div>
          <p style={styles.emptyTitle}>Connect your reservation</p>
          <p style={styles.emptySubtitle}>
            Find your booking to message the front desk — or book a room first.
          </p>
          <button
            type="button"
            onClick={() => navigate('/booking')}
            style={styles.lookupButton}
          >
            <Search size={17} />
            Find my reservation
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={styles.lookupLink}
          >
            Book a room →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Messages</h1>
        <p style={styles.headerSubtitle}>Front Desk</p>
      </div>

      {/* Message area */}
      <div ref={scrollContainerRef} style={styles.messagesArea}>
        {loading ? (
          <div style={styles.emptyContainer}>
            <div style={styles.spinner} />
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyEmoji}>💬</div>
            <p style={styles.emptyTitle}>No messages yet</p>
            <p style={styles.emptySubtitle}>
              Send a message to the front desk — they'll respond here.
            </p>
          </div>
        ) : (
          <div style={styles.messagesList}>
            {messages.map((msg, idx) => {
              const isGuest = msg.sender === 'guest';
              const showHotelLabel =
                !isGuest &&
                (idx === 0 || messages[idx - 1]?.sender !== 'hotel');

              return (
                <div key={msg.id || idx} style={isGuest ? styles.bubbleRowGuest : styles.bubbleRowHotel}>
                  {/* Hotel label */}
                  {showHotelLabel && (
                    <span style={styles.hotelLabel}>Front Desk</span>
                  )}

                  {/* Quick-request chips displayed above message */}
                  {msg.requests && msg.requests.length > 0 && (
                    <div style={styles.requestChipsRow}>
                      {msg.requests.map((req, ri) => (
                        <span key={ri} style={styles.requestChip}>
                          {req}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    style={{
                      ...(isGuest ? styles.bubbleGuest : styles.bubbleHotel),
                    }}
                  >
                    {msg.body}
                  </div>

                  {/* Timestamp */}
                  <span
                    style={{
                      ...styles.timestamp,
                      alignSelf: isGuest ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {formatRelativeTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating compose bar */}
      <div style={styles.composeBar}>
        {/* Quick chips */}
        <div style={styles.chipsScroll}>
          {QUICK_CHIPS.map((chip) => {
            const active = selectedChips.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                style={{
                  ...styles.chip,
                  background: active ? '#2E7D5B' : 'rgba(255,255,255,0.85)',
                  color: active ? '#fff' : '#2E7D5B',
                  borderColor: active ? '#2E7D5B' : 'rgba(46,125,91,0.3)',
                }}
              >
                {active ? '✓ ' : ''}
                {chip}
              </button>
            );
          })}
        </div>

        {/* Input row */}
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={styles.textInput}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!messageText.trim() && selectedChips.length === 0)}
            style={{
              ...styles.sendButton,
              opacity:
                sending || (!messageText.trim() && selectedChips.length === 0)
                  ? 0.5
                  : 1,
            }}
          >
            <Send size={18} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

const spinnerKeyframes = `
@keyframes guestMsgSpinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const id = 'guest-msg-spinner-style';
  if (!document.getElementById(id)) {
    const styleEl = document.createElement('style');
    styleEl.id = id;
    styleEl.textContent = spinnerKeyframes;
    document.head.appendChild(styleEl);
  }
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxHeight: '100vh',
    background: '#f4f7f9',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 540,
    margin: '0 auto',
    position: 'relative',
  },

  // Header
  header: {
    padding: '20px 16px 12px',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1a1a2e',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    margin: '2px 0 0',
    fontWeight: 500,
  },

  // Messages area — tight bottom padding to sit just above compose bar
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 140px',
    WebkitOverflowScrolling: 'touch',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingTop: 8,
  },

  // Bubble rows
  bubbleRowGuest: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  bubbleRowHotel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 8,
  },

  // Bubbles
  bubbleGuest: {
    maxWidth: '80%',
    padding: '10px 16px',
    borderRadius: '18px',
    borderBottomRightRadius: 4,
    background: '#2E7D5B',
    color: '#fff',
    fontSize: 15,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  bubbleHotel: {
    maxWidth: '80%',
    padding: '10px 16px',
    borderRadius: '18px',
    borderBottomLeftRadius: 4,
    background: '#f3f4f6',
    color: '#1a1a2e',
    fontSize: 15,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },

  // Hotel label
  hotelLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    marginBottom: 4,
    marginLeft: 4,
  },

  // Request chips above message
  requestChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  requestChip: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 999,
    border: '1px solid #2E7D5B',
    color: '#2E7D5B',
    background: '#f0faf5',
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },

  // Empty state
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    textAlign: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 40,
    lineHeight: 1,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    maxWidth: 260,
    lineHeight: 1.5,
  },
  lookupButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    background: '#2E7D5B',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  },
  lookupLink: {
    marginTop: 12,
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    color: '#2E7D5B',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  },

  spinner: {
    width: 30,
    height: 30,
    border: '3px solid #e5e7eb',
    borderTopColor: '#2E7D5B',
    borderRadius: '50%',
    animation: 'guestMsgSpinner 0.8s linear infinite',
  },

  // Floating compose bar — no background box, transparent & floating
  composeBar: {
    position: 'fixed',
    bottom: 140,
    left: 0,
    right: 0,
    padding: '0 12px',
    zIndex: 99,
    maxWidth: 540,
    margin: '0 auto',
  },
  chipsScroll: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    marginBottom: 8,
    paddingBottom: 2,
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  chip: {
    flexShrink: 0,
    padding: '6px 12px',
    borderRadius: 999,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 24,
    border: '1.5px solid rgba(0,0,0,0.08)',
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    outline: 'none',
    color: '#1a1a2e',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#2E7D5B',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s ease',
    boxShadow: '0 4px 16px rgba(46,125,91,0.3)',
  },
};
