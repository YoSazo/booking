import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStayIcs } from '../src/guestCalendar.js';

test('stay calendar uses all-day hotel dates and escapes guest-visible text', () => {
  const calendar = buildStayIcs({
    hotel: {
      name: 'North, Inn\\Suites',
      address: '1 Main St; Duluth',
      phone: '+1 218 555 0100',
    },
    bookingDetails: {
      checkin: '2026-09-10',
      checkout: '2026-09-12',
    },
    reservationCode: 'ABC-123',
  });

  assert.match(calendar, /DTSTART;VALUE=DATE:20260910/);
  assert.match(calendar, /DTEND;VALUE=DATE:20260912/);
  assert.match(calendar, /SUMMARY:Stay at North\\, Inn\\\\Suites/);
  assert.match(calendar, /LOCATION:1 Main St\\; Duluth/);
  assert.match(calendar, /UID:ABC-123@marketel/);
});

test('stay calendar rejects missing or malformed dates', () => {
  assert.throws(
    () => buildStayIcs({ bookingDetails: { checkin: 'not-a-date', checkout: '2026-09-12' } }),
    /valid stay date/
  );
  assert.throws(
    () => buildStayIcs({ bookingDetails: { checkin: '2026-09-10' } }),
    /Check-in and checkout/
  );
});
