import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStayPhase,
  getStayStatusMeta,
  normalizeBookingStatus,
  stayStorageSnapshot,
} from '../src/guestStayState.js';

const NOW = new Date('2026-08-14T18:00:00.000Z');

test('a cancelled booking can never become an arrival prompt', () => {
  const booking = {
    status: 'cancelled',
    checkin: '2026-08-14T00:00:00.000Z',
    checkout: '2026-08-16T00:00:00.000Z',
  };
  assert.equal(getStayPhase(booking, NOW), 'cancelled');
  assert.deepEqual(getStayStatusMeta(booking), {
    phase: 'cancelled',
    label: 'Cancelled',
    tone: 'dead',
    active: false,
  });
});

test('legacy canceled spelling normalizes to the canonical status', () => {
  assert.equal(normalizeBookingStatus('canceled'), 'cancelled');
  assert.equal(getStayPhase({ status: 'released' }, NOW), 'released');
});

test('confirmed stays progress through arrival, in-stay and completion', () => {
  assert.equal(getStayPhase({
    status: 'confirmed',
    checkin: '2026-08-14T00:00:00.000Z',
    checkout: '2026-08-16T00:00:00.000Z',
  }, NOW), 'checkin_today');
  assert.equal(getStayPhase({
    status: 'confirmed',
    checkin: '2026-08-13T00:00:00.000Z',
    checkout: '2026-08-16T00:00:00.000Z',
  }, NOW), 'in_stay');
  assert.equal(getStayPhase({
    status: 'confirmed',
    checkin: '2026-08-10T00:00:00.000Z',
    checkout: '2026-08-13T00:00:00.000Z',
  }, NOW), 'completed');
});

test('the local snapshot carries every Front Desk decision field', () => {
  const snapshot = stayStorageSnapshot({
    reservationCode: 'ABC-123',
    guestEmail: 'guest@example.com',
    checkin: '2026-08-20T00:00:00.000Z',
    checkout: '2026-08-22T00:00:00.000Z',
    status: 'canceled',
    pendingUntil: '2026-08-14T18:05:00.000Z',
    approvalNoResponseAction: 'release',
    approvalOutcome: 'owner_released',
    cancellationReason: 'A walk-in took the last room.',
    holdStatus: 'released',
    updatedAt: '2026-08-14T18:01:00.000Z',
  });
  assert.equal(snapshot.code, 'ABC-123');
  assert.equal(snapshot.status, 'cancelled');
  assert.equal(snapshot.approvalNoResponseAction, 'release');
  assert.equal(snapshot.cancellationReason, 'A walk-in took the last room.');
  assert.equal(snapshot.holdStatus, 'released');
});
