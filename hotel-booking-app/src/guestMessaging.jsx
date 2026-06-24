import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const QUICK_REQUESTS = [
  'Early check-in',
  'Late check-in',
  'Late arrival (after 9pm)',
  'Ground floor room',
  'Quiet room',
  'Extra towels',
];

// Build & download an .ics calendar file for the stay so the guest can add it
// to Apple/Google Calendar in one tap.
export function downloadStayIcs({ hotel, bookingDetails, reservationCode }) {
  const toIcsDate = (d) => {
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const name = hotel?.name || 'Your stay';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marketel//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reservationCode || Date.now()}@marketel`,
    `DTSTAMP:${toIcsDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${toIcsDate(bookingDetails.checkin)}`,
    `DTEND;VALUE=DATE:${toIcsDate(bookingDetails.checkout)}`,
    `SUMMARY:${esc(`Stay at ${name}`)}`,
    `DESCRIPTION:${esc(`Confirmation #${reservationCode || ''}${hotel?.phone ? `\nQuestions? Call ${hotel.phone}` : ''}`)}`,
    hotel?.address ? `LOCATION:${esc(hotel.address)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-stay.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Self-contained "message the front desk" card. Used on the confirmation screen
// and the persistent "my reservation" page.
export function GuestMessageCard({ apiBaseUrl = '', hotelId, reservationCode, guestInfo, hotelPhone }) {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const toggleRequest = (label) => {
    setSelectedRequests((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  };

  const handleSend = async () => {
    const body = messageText.trim();
    if (!body && selectedRequests.length === 0) return;
    if (!hotelId) { setError('Messaging is unavailable for this booking.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/guest-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          reservationCode,
          body,
          requests: selectedRequests,
          guestName: [guestInfo?.firstName, guestInfo?.lastName].filter(Boolean).join(' ').trim() || undefined,
          guestEmail: guestInfo?.email || undefined,
          guestPhone: guestInfo?.phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setSent(true);
      else setError(data.message || 'Could not send. Please call us instead.');
    } catch (e) {
      setError('Could not send. Please call us instead.');
    }
    setSending(false);
  };

  return (
    <div className="stay-details-card" style={{ marginTop: '20px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '700', marginBottom: '6px', color: '#1a1a1a' }}>
        <MessageSquare size={18} /> Message the front desk
      </h3>
      {sent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 12px', background: '#e8f7ee', borderRadius: '10px', marginTop: '10px' }}>
          <CheckCircle2 size={20} style={{ color: '#2E7D5B', flexShrink: 0 }} />
          <div style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.5 }}>
            <strong>Sent!</strong> The front desk got your message and will follow up.{hotelPhone ? ` You can also call ${hotelPhone}.` : ''}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>
            Have a request or question? Send it straight to the property — they'll see it instantly.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {QUICK_REQUESTS.map((label) => {
              const active = selectedRequests.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleRequest(label)}
                  style={{
                    padding: '8px 12px', borderRadius: '999px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                    border: active ? '1px solid #2E7D5B' : '1px solid #d7dde3',
                    background: active ? '#2E7D5B' : '#fff',
                    color: active ? '#fff' : '#374151',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {active ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Add a note (optional) — e.g. arriving around 11pm, traveling with a pet…"
            rows={3}
            maxLength={2000}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px',
              borderRadius: '10px', border: '1px solid #d7dde3', fontSize: '14px',
              fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, color: '#1a1a1a',
            }}
          />
          {error && <p style={{ fontSize: '13px', color: '#c0392b', margin: '8px 0 0' }}>{error}</p>}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!messageText.trim() && selectedRequests.length === 0)}
            style={{
              width: '100%', marginTop: '12px', padding: '14px', borderRadius: '12px',
              border: 'none', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: sending ? 'wait' : 'pointer',
              background: (!messageText.trim() && selectedRequests.length === 0) ? '#b8c4bd' : '#2E7D5B',
              color: '#fff',
              opacity: sending ? 0.7 : 1,
            }}
          >
            <Send size={16} /> {sending ? 'Sending…' : 'Send to front desk'}
          </button>
        </>
      )}
    </div>
  );
}
