import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search } from 'lucide-react';
import { useGuest } from './GuestProvider.jsx';
import GuestInstallCard from './GuestInstallCard.jsx';
import { isStandalone } from './pwaUtils.js';
import GuestNotificationPrompt from './GuestNotificationPrompt.jsx';
import { fetchWithTimeout } from './fetchWithTimeout.js';

const QUICK_CHIPS = ['Early check-in', 'Late check-out', 'Extra towels', 'Quiet room'];

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

export default function GuestMessagesPage({ hotel }) {
  const { guestStay, apiBaseUrl, hotelId } = useGuest();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [selectedChips, setSelectedChips] = useState([]);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const touchStartYRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (isInitial = false, omitTemporaryId = '') => {
    if (!guestStay?.code || !hotelId) return;
    try {
      const params = new URLSearchParams({
        hotelId,
        code: guestStay.code,
        email: guestStay.email || '',
      });
      const res = await fetchWithTimeout(`${apiBaseUrl}/api/guest-messages?${params}`, {}, 12000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not load messages.');
      setLoadError('');
      if (data.success) {
        setMessages((prev) => {
          const newMessages = data.messages || [];
          const pendingMessages = prev.filter((message) => (
            String(message.id || '').startsWith('temp-') && message.id !== omitTemporaryId
          ));
          const mergedMessages = [...newMessages, ...pendingMessages];
          // Only update if message count or content changed
          if (JSON.stringify(prev) !== JSON.stringify(mergedMessages)) {
            return mergedMessages;
          }
          return prev;
        });
      }
    } catch (error) {
      if (isInitial) setLoadError(error.message || 'Could not load messages.');
    }
    if (isInitial) setLoading(false);
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

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
    const unread = messages.filter((m) => m.sender === 'hotel' && !m.guestReadAt);
    if (unread.length === 0) return;

    const markRead = async () => {
      try {
        const response = await fetchWithTimeout(`${apiBaseUrl}/api/guest-messages/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId,
            code: guestStay.code,
            email: guestStay.email || '',
          }),
        }, 12000);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) return;
        const readAt = new Date().toISOString();
        setMessages((previous) => previous.map((message) => (
          message.sender === 'hotel' ? { ...message, guestReadAt: message.guestReadAt || readAt } : message
        )));
        if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
        window.dispatchEvent(new CustomEvent('marketel:guest-messages-read'));
      } catch (e) { /* ignore */ }
    };
    markRead();
  }, [messages, guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  const toggleChip = (chip) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const submitMessage = async (optimisticMessage) => {
    try {
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/guest-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          reservationCode: guestStay.code,
          body: optimisticMessage.draftBody || '',
          requests: optimisticMessage.requests || [],
          guestName: guestStay.name || '',
          guestEmail: guestStay.email || '',
          guestPhone: guestStay.phone || '',
        }),
      }, 15000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Message not sent.');
      }
      setMessages((previous) => previous.filter((message) => message.id !== optimisticMessage.id));
      await fetchMessages(false, optimisticMessage.id);
    } catch (error) {
      setMessages((previous) => previous.map((message) => (
        message.id === optimisticMessage.id
          ? { ...message, status: 'failed', error: error.message || 'Message not sent.' }
          : message
      )));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
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
      draftBody: body,
      requests: selectedChips.length > 0 ? [...selectedChips] : undefined,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');
    setSelectedChips([]);

    await submitMessage(optimisticMsg);
  };

  const handleRetry = async (message) => {
    if (sending) return;
    setSending(true);
    const retrying = { ...message, status: 'sending', error: '' };
    setMessages((previous) => previous.map((item) => (item.id === message.id ? retrying : item)));
    await submitMessage(retrying);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputFocus = () => {
    window.setTimeout(() => scrollToBottom('auto'), 120);
    window.setTimeout(() => scrollToBottom('auto'), 320);
  };

  const handleMessagesTouchStart = (event) => {
    if (!document.documentElement.classList.contains('marketel-keyboard-open')) return;
    touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleMessagesTouchMove = (event) => {
    if (touchStartYRef.current == null) return;
    const currentY = event.touches?.[0]?.clientY;
    if (currentY == null) return;
    if (currentY - touchStartYRef.current > 52) {
      inputRef.current?.blur();
      touchStartYRef.current = null;
    }
  };

  if (!guestStay?.code) {
    return (
      <div className="guest-messages-page" style={styles.page}>
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
    <div className="guest-messages-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Messages</h1>
        <p style={styles.headerSubtitle}>Front Desk</p>
      </div>

      {/* Message area */}
      <div
        ref={scrollContainerRef}
        className="guest-message-scroll"
        style={styles.messagesArea}
        onTouchStart={handleMessagesTouchStart}
        onTouchMove={handleMessagesTouchMove}
        onTouchEnd={() => { touchStartYRef.current = null; }}
      >
        {!isStandalone() && (
          <div style={{ marginBottom: 8 }}>
            <GuestInstallCard
              hotelName={hotel?.name}
              appIconUrl={hotel?.appIconUrl}
              hotelId={hotelId}
              reservationCode={guestStay?.code}
              apiBaseUrl={apiBaseUrl}
              touchpoint="messages-card"
              variant="card"
              subline="Save this property to your Home Screen to receive reply notifications on your phone."
            />
          </div>
        )}

        <GuestNotificationPrompt
          apiBaseUrl={apiBaseUrl}
          hotelId={hotelId}
          guestStay={guestStay}
        />

        {loading ? (
          <div style={styles.emptyContainer}>
            <div style={styles.spinner} />
          </div>
        ) : loadError ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyTitle}>Messages couldn’t load</p>
            <p style={styles.emptySubtitle}>{loadError}</p>
            <button type="button" onClick={() => { setLoading(true); fetchMessages(true); }} style={styles.lookupButton}>
              Try again
            </button>
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
                  {msg.body && (
                    <div
                      style={{
                        ...(isGuest ? styles.bubbleGuest : styles.bubbleHotel),
                      }}
                    >
                      {msg.body}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{ ...styles.deliveryRow, alignSelf: isGuest ? 'flex-end' : 'flex-start' }}>
                    <span style={styles.timestamp}>{formatRelativeTime(msg.createdAt)}</span>
                    {msg.status === 'sending' && <span style={styles.sendingStatus}>Sending…</span>}
                    {msg.status === 'failed' && (
                      <>
                        <span style={styles.failedStatus}>Not sent</span>
                        <button type="button" style={styles.retryButton} onClick={() => handleRetry(msg)} disabled={sending}>
                          Retry
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating compose bar */}
      <div className="guest-message-composer" style={styles.composeBar}>
        {/* Quick chips */}
        <div className="guest-message-quick-chips" style={styles.chipsScroll}>
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
            onFocus={handleInputFocus}
            placeholder="Type a message..."
            enterKeyHint="send"
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
html.marketel-keyboard-open .guest-messages-page {
  padding-bottom: 0 !important;
}
html.marketel-keyboard-open .guest-message-composer {
  padding-bottom: calc(var(--marketel-keyboard-inset, 0px) + 8px) !important;
  background: #f4f7f9 !important;
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
    height: 'auto',
    maxHeight: 'none',
    background: '#f4f7f9',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 540,
    margin: '0 auto',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingBottom: 'var(--guest-nav-clearance, 0px)',
    transition: 'padding-bottom 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    contain: 'layout',
    boxShadow: '0 0 0 200vmax #f4f7f9',
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
    minHeight: 0,
    overflowY: 'auto',
    padding: '0 16px 10px',
    WebkitOverflowScrolling: 'touch',
    overscrollBehaviorY: 'contain',
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
  },
  deliveryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 20,
    marginTop: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  sendingStatus: {
    color: '#7b8780',
    fontSize: 11,
    fontWeight: 600,
  },
  failedStatus: {
    color: '#b42318',
    fontSize: 11,
    fontWeight: 700,
  },
  retryButton: {
    padding: 0,
    border: 0,
    background: 'transparent',
    color: '#2E7D5B',
    fontFamily: 'inherit',
    fontSize: 11,
    fontWeight: 800,
    textDecoration: 'underline',
    cursor: 'pointer',
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

  // The composer grows an opaque bottom inset equal to the keyboard height.
  // Its input row stays above the keyboard without moving the route itself.
  composeBar: {
    position: 'relative',
    flexShrink: 0,
    padding: '8px 12px max(10px, env(safe-area-inset-bottom))',
    zIndex: 99,
    borderTop: '1px solid rgba(0,0,0,0.06)',
    background: 'rgba(244,247,249,0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
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
