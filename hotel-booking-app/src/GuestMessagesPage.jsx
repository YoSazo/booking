import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Search, MessageSquare } from 'lucide-react';
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
  const pageRef = useRef(null);
  const composerRef = useRef(null);
  const touchStartYRef = useRef(null);
  const fetchInFlightRef = useRef(null);
  const lastFetchAtRef = useRef(0);
  const retryFetchAfterRef = useRef(0);

  // Treat the visible iOS viewport as the chat window. Safari may move the
  // visual viewport when its keyboard opens; anchoring the shell to that
  // viewport keeps the header and thread visually stationary while the
  // composer alone follows the new bottom edge.
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const viewport = window.visualViewport;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    let fullViewportHeight = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      viewport?.height || 0
    );
    let frame = 0;

    const updateViewport = () => {
      frame = 0;
      const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
      const height = Math.max(1, Math.round(viewport?.height || window.innerHeight));
      const inputFocused = document.activeElement === inputRef.current;
      if (!inputFocused) fullViewportHeight = Math.max(fullViewportHeight, height);
      const keyboardVisible = inputFocused || height < fullViewportHeight - 80;
      page.style.setProperty('--guest-message-viewport-top', `${top}px`);
      page.style.setProperty('--guest-message-viewport-height', `${height}px`);
      page.classList.toggle('has-guest-keyboard', keyboardVisible);
    };

    const scheduleViewportUpdate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateViewport);
    };

    const updateComposerHeight = () => {
      const height = Math.ceil(composerRef.current?.getBoundingClientRect().height || 0);
      if (height > 0) page.style.setProperty('--guest-message-composer-height', `${height}px`);
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    updateViewport();
    updateComposerHeight();

    const composerObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateComposerHeight)
      : null;
    if (composerRef.current) composerObserver?.observe(composerRef.current);

    window.addEventListener('resize', scheduleViewportUpdate);
    document.addEventListener('focusin', scheduleViewportUpdate);
    document.addEventListener('focusout', scheduleViewportUpdate);
    viewport?.addEventListener('resize', scheduleViewportUpdate);
    viewport?.addEventListener('scroll', scheduleViewportUpdate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      composerObserver?.disconnect();
      window.removeEventListener('resize', scheduleViewportUpdate);
      document.removeEventListener('focusin', scheduleViewportUpdate);
      document.removeEventListener('focusout', scheduleViewportUpdate);
      viewport?.removeEventListener('resize', scheduleViewportUpdate);
      viewport?.removeEventListener('scroll', scheduleViewportUpdate);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [guestStay?.code]);

  // Scroll only the message list — never scrollIntoView on a position:fixed
  // container, which drags the visual viewport and makes the composer jitter.
  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (isInitial = false, omitTemporaryId = '') => {
    if (!guestStay?.code || !hotelId) return;
    const now = Date.now();
    if (now < retryFetchAfterRef.current) return;
    if (!isInitial && now - lastFetchAtRef.current < 5000) return;
    if (fetchInFlightRef.current) return fetchInFlightRef.current;

    lastFetchAtRef.current = now;
    const request = (async () => {
      try {
        const params = new URLSearchParams({
          hotelId,
          code: guestStay.code,
          email: guestStay.email || '',
        });
        const res = await fetchWithTimeout(`${apiBaseUrl}/api/guest-messages?${params}`, {}, 12000);
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const retrySeconds = Math.max(1, Number(res.headers.get('Retry-After')) || 15);
          retryFetchAfterRef.current = Date.now() + (retrySeconds * 1000);
          if (isInitial) setLoadError('Messages are catching up. Try again in a moment.');
          return;
        }
        if (!res.ok || !data.success) throw new Error(data.message || 'Could not load messages.');
        retryFetchAfterRef.current = 0;
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
      } finally {
        if (isInitial) setLoading(false);
        fetchInFlightRef.current = null;
      }
    })();
    fetchInFlightRef.current = request;
    return request;
  }, [guestStay?.code, guestStay?.email, hotelId, apiBaseUrl]);

  // Initial load
  useEffect(() => {
    if (!guestStay?.code) {
      setLoading(false);
      return;
    }
    fetchMessages(true);
  }, [fetchMessages, guestStay?.code]);

  // Push/service-worker events refresh immediately. A quiet visible-only poll
  // remains as a fallback for replies delivered while Web Push is unavailable.
  useEffect(() => {
    if (!guestStay?.code) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') fetchMessages(false);
    };
    const interval = window.setInterval(refreshWhenVisible, 25000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    window.addEventListener('marketel:guest-refresh', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      window.removeEventListener('marketel:guest-refresh', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchMessages, guestStay?.code]);

  // Messaging-app behavior: stay pinned to the newest message as the thread
  // grows (initial load, incoming replies, and your own sends).
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length, loading, scrollToBottom]);

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

  const messagesHeader = (
    <div style={styles.header}>
      <button
        type="button"
        aria-label="Back to Your Stay"
        onClick={() => navigate('/guest/home')}
        style={styles.headerBack}
      >
        <ChevronLeft size={23} strokeWidth={2.2} />
      </button>
      <div style={styles.headerCopy}>
        <h1 style={styles.headerTitle}>Messages</h1>
        <p style={styles.headerSubtitle}>Front Desk</p>
      </div>
      <span aria-hidden="true" />
    </div>
  );

  if (!guestStay?.code) {
    return (
      <div ref={pageRef} className="guest-messages-page" style={styles.page}>
        {messagesHeader}
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}><MessageSquare size={26} color="#2E7D5B" /></div>
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
    <div ref={pageRef} className="guest-messages-page" style={styles.page}>
      {/* Header */}
      {messagesHeader}

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
            <div style={styles.emptyIcon}><MessageSquare size={26} color="#2E7D5B" /></div>
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
      <div ref={composerRef} className="guest-message-composer" style={styles.composeBar}>
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
                  background: active ? '#2E7D5B' : '#E8F5EE',
                  color: active ? '#fff' : '#2E7D5B',
                  borderColor: active ? '#2E7D5B' : 'rgba(46,125,91,0.28)',
                }}
              >
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
            enterKeyHint="send"
            className="guest-msg-input"
            style={styles.textInput}
          />
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
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
.guest-messages-page {
  --guest-message-composer-offset: var(--guest-nav-clearance, 0px);
}
.guest-messages-page.has-guest-keyboard .guest-message-composer {
  bottom: 0 !important;
  padding-bottom: 2px !important;
  background: #EFF4F0 !important;
}
.guest-messages-page.has-guest-keyboard {
  --guest-message-composer-offset: 0px;
}
.guest-messages-page.has-guest-keyboard .guest-message-quick-chips {
  display: none !important;
}
.guest-message-scroll::-webkit-scrollbar {
  display: none;
}
.guest-msg-input:focus {
  border-color: #2E7D5B !important;
  box-shadow: 0 0 0 4px #E8F5EE !important;
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
    height: 'var(--guest-message-viewport-height, 100dvh)',
    maxHeight: 'var(--guest-message-viewport-height, 100dvh)',
    background: '#EFF4F0',
    color: '#1A2B22',
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 540,
    margin: '0 auto',
    position: 'fixed',
    top: 'var(--guest-message-viewport-top, 0px)',
    bottom: 'auto',
    left: 0,
    right: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingBottom: 0,
    contain: 'layout',
    overscrollBehavior: 'none',
  },

  // Header
  header: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr) 44px',
    alignItems: 'center',
    gap: 8,
    minHeight: 72,
    padding: 'max(10px, env(safe-area-inset-top)) 12px 10px',
    borderBottom: '1px solid #E6EEE9',
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    flexShrink: 0,
  },
  headerBack: {
    display: 'inline-flex',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: '1px solid #D8E4DC',
    borderRadius: '50%',
    background: '#FFFFFF',
    color: '#1A2B22',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  headerCopy: {
    minWidth: 0,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#1A2B22',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7D72',
    margin: '2px 0 0',
    fontWeight: 600,
  },

  // Messages area — tight bottom padding to sit just above compose bar
  messagesArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: '0 16px calc(var(--guest-message-composer-height, 104px) + var(--guest-message-composer-offset, 0px) + 8px)',
    WebkitOverflowScrolling: 'touch',
    overscrollBehaviorY: 'contain',
    scrollbarWidth: 'none',
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
    padding: '10px 15px',
    borderRadius: '20px',
    borderBottomRightRadius: 5,
    background: 'linear-gradient(135deg, #4CAF7D 0%, #2E7D5B 60%, #245F46 100%)',
    color: '#fff',
    fontSize: 15,
    lineHeight: 1.45,
    wordBreak: 'break-word',
    boxShadow: '0 3px 10px rgba(46,125,91,0.22)',
  },
  bubbleHotel: {
    maxWidth: '80%',
    padding: '10px 15px',
    borderRadius: '20px',
    borderBottomLeftRadius: 5,
    background: '#FFFFFF',
    color: '#1A2B22',
    fontSize: 15,
    lineHeight: 1.45,
    wordBreak: 'break-word',
    border: '1px solid #E6EEE9',
    boxShadow: '0 1px 2px rgba(26,43,34,0.05), 0 4px 12px rgba(46,125,91,0.05)',
  },

  // Hotel label
  hotelLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7D72',
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
    border: '1px solid rgba(46,125,91,0.25)',
    color: '#2E7D5B',
    background: '#E8F5EE',
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    color: '#9CA79E',
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
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#E8F5EE',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1A2B22',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7D72',
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
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
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
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  },

  spinner: {
    width: 30,
    height: 30,
    border: '3px solid #D8E4DC',
    borderTopColor: '#2E7D5B',
    borderRadius: '50%',
    animation: 'guestMsgSpinner 0.8s linear infinite',
  },

  // The page itself tracks the visual viewport, so the composer only needs to
  // sit at that page's bottom edge. No keyboard height is added a second time.
  composeBar: {
    position: 'absolute',
    left: '50%',
    bottom: 'var(--guest-message-composer-offset, var(--guest-nav-clearance, 0px))',
    transform: 'translateX(-50%)',
    width: 'min(540px, 100%)',
    boxSizing: 'border-box',
    padding: '8px 12px max(10px, env(safe-area-inset-bottom))',
    zIndex: 99,
    borderTop: '1px solid #E6EEE9',
    background: 'rgba(239,244,240,0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    transition: 'bottom 180ms cubic-bezier(0.22, 1, 0.36, 1)',
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
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
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
    border: '1.5px solid #D8E4DC',
    padding: '12px 16px',
    // iOS zooms/pans focused inputs below 16px, moving the entire chat view.
    fontSize: 16,
    fontFamily: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
    outline: 'none',
    color: '#1A2B22',
    background: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(26,43,34,0.06)',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #4CAF7D 0%, #2E7D5B 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    boxShadow: '0 4px 16px rgba(46,125,91,0.32)',
  },
};
