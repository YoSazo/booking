import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const {
  mergeGuestStays,
  readGuestStay,
  readGuestStays,
  selectGuestStay,
  writeGuestStay,
} = await import('../src/guestStayStorage.js');

function dateFromToday(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

test.beforeEach(() => values.clear());

test('repeat guests keep multiple reservations and an explicit selection', () => {
  writeGuestStay({ hotelId: 'hotel-1', code: 'LATER', checkin: dateFromToday(20), checkout: dateFromToday(22) });
  writeGuestStay({ hotelId: 'hotel-1', code: 'SOON', checkin: dateFromToday(2), checkout: dateFromToday(4) });
  assert.deepEqual(readGuestStays('hotel-1').map((stay) => stay.code), ['SOON', 'LATER']);
  assert.equal(readGuestStay('hotel-1').code, 'SOON');
  assert.equal(selectGuestStay('hotel-1', 'LATER').code, 'LATER');
  assert.equal(readGuestStay('hotel-1').code, 'LATER');
});

test('background state refresh does not hijack the selected reservation', () => {
  writeGuestStay({ hotelId: 'hotel-1', code: 'A', checkin: dateFromToday(2), checkout: dateFromToday(4), status: 'pending' });
  writeGuestStay({ hotelId: 'hotel-1', code: 'B', checkin: dateFromToday(8), checkout: dateFromToday(10), status: 'confirmed' });
  selectGuestStay('hotel-1', 'A');
  mergeGuestStays([{ hotelId: 'hotel-1', code: 'B', checkin: dateFromToday(8), checkout: dateFromToday(10), status: 'cancelled' }]);
  assert.equal(readGuestStay('hotel-1').code, 'A');
  assert.equal(readGuestStays('hotel-1').find((stay) => stay.code === 'B').status, 'cancelled');
});

test('recent completed stays remain available for messages but stale history expires', () => {
  writeGuestStay({ hotelId: 'hotel-1', code: 'RECENT', checkin: dateFromToday(-10), checkout: dateFromToday(-8) });
  writeGuestStay({ hotelId: 'hotel-1', code: 'STALE', checkin: dateFromToday(-130), checkout: dateFromToday(-120) });
  assert.deepEqual(readGuestStays('hotel-1').map((stay) => stay.code), ['RECENT']);
});
