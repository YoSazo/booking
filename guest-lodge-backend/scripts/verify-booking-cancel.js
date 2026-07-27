require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Verifies cancelling a confirmed booking and the oversell conflict scan, which
// together cover the walk-in double-booking case: a booking confirms, hours later
// the room is given away at the desk, and the owner needs to turn the booking
// away after the approval window has closed.
//
//   node scripts/verify-booking-cancel.js <hotelId> [baseUrl]

const prisma = new PrismaClient();
const HOTEL_ID = (process.argv[2] || '').trim();
const BASE = (process.argv[3] || 'http://localhost:3001').replace(/\/$/, '');

const createdBookings = [];
const createdOverrides = [];
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
    if (condition) { passed += 1; console.log(`  PASS  ${label}`); }
    else { failed += 1; console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}

function mintReturnToken(hotelId, setupToken) {
    const base = process.env.CRM_RETURN_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.MAGIC_LINK_SECRET;
    const secret = setupToken ? `${base}:${setupToken}` : base;
    const payload = JSON.stringify({ purpose: 'frontdesk-return', hotelId, exp: Date.now() + 3600000 });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    return 'fd_' + encoded + '.' + sig;
}

async function makeBooking({ status, roomName, checkin, checkout, bookingType = 'payLater', holdStatus = 'active' }) {
    const code = 'CANCELV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const b = await prisma.booking.create({
        data: {
            ourReservationCode: code, pmsConfirmationCode: code, hotelId: HOTEL_ID,
            roomName, bookingType, status,
            checkinDate: new Date(checkin), checkoutDate: new Date(checkout), nights: 1,
            guestFirstName: 'Cancel', guestLastName: 'Verify', guestEmail: '', guestPhone: '5550000001',
            subtotal: 100, taxesAndFees: 10, grandTotal: 110,
            amountPaidNow: 0, preAuthHoldAmount: 1.0, holdStatus,
        },
    });
    createdBookings.push(b.id);
    return b;
}

async function main() {
    if (!HOTEL_ID) {
        console.error('Usage: node scripts/verify-booking-cancel.js <hotelId> [baseUrl]');
        process.exit(1);
    }
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: { id: true, name: true, pms: true, setupToken: true },
    });
    if (!hotel?.setupToken) { console.error('Hotel missing or has no setupToken.'); process.exit(1); }

    const room = await prisma.manualRoom.findFirst({ where: { hotelId: HOTEL_ID } });
    if (!room) { console.error('Hotel has no manual rooms.'); process.exit(1); }

    const token = mintReturnToken(HOTEL_ID, hotel.setupToken);
    const call = async (method, path, body) => {
        const sep = path.includes('?') ? '&' : '?';
        const res = await fetch(`${BASE}${path}${sep}hotelId=${encodeURIComponent(HOTEL_ID)}`, {
            method,
            headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
            body: method === 'GET' ? undefined : JSON.stringify({ hotelId: HOTEL_ID, ...(body || {}) }),
        });
        return { httpStatus: res.status, body: await res.json().catch(() => ({})) };
    };
    const availabilityFor = async (checkin, checkout) => {
        const res = await fetch(`${BASE}/api/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotelId: HOTEL_ID, checkin, checkout, guests: 1 }),
        });
        const body = await res.json().catch(() => ({}));
        const match = (body.data || []).find(r => r.roomName === room.name);
        return match ? Number(match.roomsAvailable) : 0;
    };

    // Far out so real reservations are never touched, but inside the conflict
    // scan's forward horizon or the oversell checks silently see nothing.
    const checkin = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10);
    const checkout = new Date(Date.now() + 151 * 86400000).toISOString().slice(0, 10);

    console.log(`\nHotel: ${hotel.name} (${hotel.id})  pms=${hotel.pms}`);
    console.log(`Probe room: ${room.name} (${room.totalUnits} unit(s))`);
    console.log(`Probe night: ${checkin}\n`);

    // Availability and conflict counts are only meaningful if this room-night
    // starts empty, so bail out loudly rather than reporting a bogus failure.
    const preexisting = await prisma.booking.count({
        where: {
            hotelId: HOTEL_ID, roomName: room.name,
            status: { notIn: ['cancelled', 'canceled', 'declined', 'released', 'no_show', 'noshow'] },
            checkinDate: { lt: new Date(`${checkout}T00:00:00.000Z`) },
            checkoutDate: { gt: new Date(`${checkin}T00:00:00.000Z`) },
        },
    });
    if (preexisting > 0) {
        console.error(`Probe night already has ${preexisting} live booking(s) on ${room.name}. Pick another date.`);
        process.exit(1);
    }

    console.log('Cancelling a confirmed booking');
    const confirmed = await makeBooking({ status: 'confirmed', roomName: room.name, checkin, checkout });
    check('room is held before cancelling', (await availabilityFor(checkin, checkout)) === Math.max(0, room.totalUnits - 1));

    const bad = await call('POST', '/api/crm/bookings/cancel', { id: 'nope-not-a-real-id' });
    check('unknown booking id is rejected', bad.httpStatus === 404, `saw ${bad.httpStatus}`);

    const res1 = await call('POST', '/api/crm/bookings/cancel', { id: confirmed.id, reason: 'The room was already taken' });
    check('cancel succeeds on a confirmed booking', res1.body?.success === true && res1.body?.cancelled === true,
        JSON.stringify(res1.body));
    const after = await prisma.booking.findUnique({ where: { id: confirmed.id } });
    check('status becomes cancelled', after.status === 'cancelled', `saw ${after.status}`);
    check('cancelledAt is stamped', !!after.cancelledAt);
    check('reason is stored', after.cancellationReason === 'The room was already taken', `saw ${after.cancellationReason}`);
    check('record is kept, not deleted', !!after.id);
    check('room is freed after cancelling', (await availabilityFor(checkin, checkout)) === room.totalUnits,
        `saw ${await availabilityFor(checkin, checkout)}, expected ${room.totalUnits}`);

    const res2 = await call('POST', '/api/crm/bookings/cancel', { id: confirmed.id, reason: 'again' });
    check('repeat cancel is a no-op', res2.body?.alreadyCancelled === true, JSON.stringify(res2.body));
    const after2 = await prisma.booking.findUnique({ where: { id: confirmed.id } });
    check('repeat cancel did not overwrite the reason', after2.cancellationReason === 'The room was already taken');

    console.log('\nCancelling a still-pending booking');
    const pending = await makeBooking({ status: 'pending', roomName: room.name, checkin, checkout });
    await prisma.booking.update({ where: { id: pending.id }, data: { pendingUntil: new Date(Date.now() + 3600000) } });
    const res3 = await call('POST', '/api/crm/bookings/cancel', { id: pending.id, reason: 'Double booking on our side' });
    check('cancel works on a pending booking too', res3.body?.cancelled === true, JSON.stringify(res3.body));
    const after3 = await prisma.booking.findUnique({ where: { id: pending.id } });
    check('pending cancel records the approval outcome', after3.approvalOutcome === 'owner_released',
        `saw ${after3.approvalOutcome}`);

    console.log('\nOversell conflict: two bookings, one room');
    const online = await makeBooking({ status: 'confirmed', roomName: room.name, checkin, checkout });
    const walkIn = await makeBooking({ status: 'confirmed', roomName: room.name, checkin, checkout, bookingType: 'manual', holdStatus: null });
    const conf1 = await call('GET', '/api/crm/conflicts');
    const hit = (conf1.body.conflicts || []).find(c => c.roomName === room.name && c.date === checkin);
    check('conflict is detected', !!hit, JSON.stringify(conf1.body.conflicts || []).slice(0, 300));
    check('reports the right counts', hit && hit.booked === 2 && hit.units === room.totalUnits,
        hit ? `booked=${hit.booked} units=${hit.units}` : 'no hit');
    check('lists both bookings involved', hit && hit.bookings.length === 2);
    check('distinguishes the desk-added booking', hit && hit.bookings.some(b => b.bookingType === 'manual'));

    await call('POST', '/api/crm/bookings/cancel', { id: online.id, reason: 'The room was already taken' });
    const conf2 = await call('GET', '/api/crm/conflicts');
    check('conflict clears once the online booking is cancelled',
        !(conf2.body.conflicts || []).some(c => c.roomName === room.name && c.date === checkin),
        JSON.stringify(conf2.body.conflicts || []).slice(0, 200));

    console.log('\nOversell conflict: room closed with a booking on it');
    await call('POST', '/api/crm/bookings/cancel', { id: walkIn.id });
    const stillBooked = await makeBooking({ status: 'confirmed', roomName: room.name, checkin, checkout });
    const conf3 = await call('GET', '/api/crm/conflicts');
    check('no conflict while the room is open', !(conf3.body.conflicts || []).some(c => c.roomName === room.name && c.date === checkin));

    const ov = await prisma.manualOverride.create({
        data: { roomId: room.id, date: checkin, closed: true },
    });
    createdOverrides.push(ov.id);
    const conf4 = await call('GET', '/api/crm/conflicts');
    const closedHit = (conf4.body.conflicts || []).find(c => c.roomName === room.name && c.date === checkin);
    check('closing a room that still has a booking is flagged', !!closedHit,
        JSON.stringify(conf4.body.conflicts || []).slice(0, 300));
    check('closed conflict is labelled as such', closedHit && closedHit.closed === true && closedHit.units === 0,
        closedHit ? `closed=${closedHit.closed} units=${closedHit.units}` : 'no hit');

    console.log('\nCleanup');
    if (createdOverrides.length) {
        await prisma.manualOverride.deleteMany({ where: { id: { in: createdOverrides } } });
    }
    const del = await prisma.booking.deleteMany({ where: { id: { in: createdBookings } } });
    check('test data removed', del.count === createdBookings.length, `deleted ${del.count}/${createdBookings.length}`);
    const conf5 = await call('GET', '/api/crm/conflicts');
    check('no conflicts left behind', !(conf5.body.conflicts || []).some(c => c.date === checkin));

    console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} passed, ${failed} failed\n`);
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('\nverify crashed:', e.message);
    if (createdOverrides.length) {
        await prisma.manualOverride.deleteMany({ where: { id: { in: createdOverrides } } }).catch(() => {});
    }
    if (createdBookings.length) {
        await prisma.booking.deleteMany({ where: { id: { in: createdBookings } } }).catch(() => {});
        console.error(`cleaned up ${createdBookings.length} test booking(s)`);
    }
    await prisma.$disconnect();
    process.exit(1);
});
