require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// End-to-end check of the owner-approval lifecycle against a running server.
// Creates throwaway bookings on a real hotel, exercises confirm / release /
// auto-confirm, asserts inventory behaviour, then deletes everything it made.
//
//   node scripts/verify-booking-approval.js <hotelId> [baseUrl]

const prisma = new PrismaClient();
const HOTEL_ID = (process.argv[2] || '').trim();
const BASE = (process.argv[3] || 'http://localhost:3001').replace(/\/$/, '');

const created = [];
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
    if (condition) {
        passed += 1;
        console.log(`  PASS  ${label}`);
    } else {
        failed += 1;
        console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

function signToken(bookingId, hotelId, expMs = Date.now() + 3600000) {
    const secret = process.env.CRM_RETURN_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.MAGIC_LINK_SECRET;
    if (!secret) return null;
    const payload = JSON.stringify({ purpose: 'booking-approval', bookingId, hotelId, exp: expMs });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    return 'ba_' + encoded + '.' + sig;
}

async function makeBooking({ status, pendingUntil, roomName, checkin, checkout, noResponseAction = 'confirm' }) {
    const code = 'VERIFY-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const booking = await prisma.booking.create({
        data: {
            ourReservationCode: code,
            pmsConfirmationCode: code,
            hotelId: HOTEL_ID,
            roomName,
            bookingType: 'payLater',
            status,
            pendingUntil: pendingUntil || null,
            approvalRequestedAt: status === 'pending' ? new Date() : null,
            approvalNoResponseAction: status === 'pending' ? noResponseAction : null,
            checkinDate: new Date(checkin),
            checkoutDate: new Date(checkout),
            nights: 1,
            guestFirstName: 'Approval',
            guestLastName: 'Verify',
            guestEmail: '',
            guestPhone: '5550000000',
            subtotal: 100,
            taxesAndFees: 10,
            grandTotal: 110,
            amountPaidNow: 0,
            preAuthHoldAmount: 1.0,
            holdStatus: 'active',
        },
    });
    created.push(booking.id);
    return booking;
}

async function act(token, action) {
    const res = await fetch(`${BASE}/api/booking-approval/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
    });
    return { httpStatus: res.status, body: await res.json().catch(() => ({})) };
}

async function availabilityFor(roomName, checkin, checkout) {
    const res = await fetch(`${BASE}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: HOTEL_ID, checkin, checkout, guests: 1 }),
    });
    const body = await res.json().catch(() => ({}));
    const rooms = body.data || body.rooms || (Array.isArray(body) ? body : []);
    const match = (rooms || []).find((r) => r.roomName === roomName);
    return match ? Number(match.roomsAvailable) : 0;
}

async function main() {
    if (!HOTEL_ID) {
        console.error('Usage: node scripts/verify-booking-approval.js <hotelId> [baseUrl]');
        process.exit(1);
    }

    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: { id: true, name: true, pms: true, bookingApprovalEnabled: true, bookingApprovalWindowMinutes: true },
    });
    if (!hotel) {
        console.error(`No hotel ${HOTEL_ID}`);
        process.exit(1);
    }

    const room = await prisma.manualRoom.findFirst({ where: { hotelId: HOTEL_ID } });
    console.log(`\nHotel: ${hotel.name} (${hotel.id})  pms=${hotel.pms}`);
    console.log(`Approval: enabled=${hotel.bookingApprovalEnabled} window=${hotel.bookingApprovalWindowMinutes}m`);
    console.log(`Probe room: ${room ? `${room.name} (${room.totalUnits} unit(s))` : 'none — inventory checks skipped'}\n`);

    // Far-future dates so we never collide with real reservations.
    const checkin = new Date(Date.now() + 320 * 86400000).toISOString().slice(0, 10);
    const checkout = new Date(Date.now() + 321 * 86400000).toISOString().slice(0, 10);
    const roomName = room ? room.name : 'Room';

    console.log('Token verification');
    const dummy = await makeBooking({ status: 'pending', pendingUntil: new Date(Date.now() + 3600000), roomName, checkin, checkout });
    const good = signToken(dummy.id, HOTEL_ID);
    if (!good) {
        console.log('  SKIP  no signing secret in env; token tests need SESSION_SECRET');
    } else {
        check('garbage token rejected', (await act('ba_nope.nope', 'confirm')).httpStatus === 401);
        check('tampered signature rejected', (await act(good.slice(0, -3) + 'aaa', 'confirm')).httpStatus === 401);
        check('expired token rejected', (await act(signToken(dummy.id, HOTEL_ID, Date.now() - 1000), 'confirm')).httpStatus === 401);
        check('bad action rejected', (await act(good, 'destroy')).httpStatus === 400);
    }

    if (room) {
        console.log('\nInventory');
        const withPending = await availabilityFor(roomName, checkin, checkout);
        check('pending booking holds the room', withPending === Math.max(0, room.totalUnits - 1),
            `saw ${withPending}, expected ${Math.max(0, room.totalUnits - 1)}`);
    }

    if (good) {
        console.log('\nConfirm path');
        const r1 = await act(good, 'confirm');
        check('confirm applies', r1.body.success === true && r1.body.applied === true, JSON.stringify(r1.body));
        const after1 = await prisma.booking.findUnique({ where: { id: dummy.id } });
        check('status becomes confirmed', after1.status === 'confirmed', `saw ${after1.status}`);
        check('outcome recorded as owner_confirmed', after1.approvalOutcome === 'owner_confirmed', `saw ${after1.approvalOutcome}`);
        check('decision timestamp set', !!after1.approvalDecidedAt);

        const r2 = await act(good, 'release');
        check('replay is a no-op, not a second decision', r2.body.alreadyDecided === true, JSON.stringify(r2.body));
        const after2 = await prisma.booking.findUnique({ where: { id: dummy.id } });
        check('replay did not overwrite status', after2.status === 'confirmed', `saw ${after2.status}`);

        console.log('\nRelease path');
        const rel = await makeBooking({ status: 'pending', pendingUntil: new Date(Date.now() + 3600000), roomName, checkin, checkout });
        const relToken = signToken(rel.id, HOTEL_ID);
        const r3 = await act(relToken, 'release');
        check('release applies', r3.body.success === true && r3.body.applied === true, JSON.stringify(r3.body));
        const afterRel = await prisma.booking.findUnique({ where: { id: rel.id } });
        check('status becomes released', afterRel.status === 'released', `saw ${afterRel.status}`);
        check('outcome recorded as owner_released', afterRel.approvalOutcome === 'owner_released', `saw ${afterRel.approvalOutcome}`);

        if (room) {
            // The confirmed booking from earlier still holds a unit; the released
            // one must not. This is the regression the status filter guards.
            const freed = await availabilityFor(roomName, checkin, checkout);
            check('released booking frees its room', freed === Math.max(0, room.totalUnits - 1),
                `saw ${freed}, expected ${Math.max(0, room.totalUnits - 1)} (1 confirmed still held)`);
        }

        console.log('\nPeek endpoint');
        const pend = await makeBooking({ status: 'pending', pendingUntil: new Date(Date.now() + 3600000), roomName, checkin, checkout });
        const peekRes = await fetch(`${BASE}/api/booking-approval/peek?token=${encodeURIComponent(signToken(pend.id, HOTEL_ID))}`);
        const peek = await peekRes.json().catch(() => ({}));
        check('peek returns the pending booking', peek.success === true && peek.data && peek.data.status === 'pending', JSON.stringify(peek).slice(0, 200));
        check('peek exposes the countdown', !!(peek.data && peek.data.pendingUntil));
        const peekBad = await fetch(`${BASE}/api/booking-approval/peek?token=ba_bad.bad`);
        check('peek rejects a bad token', peekBad.status === 401);
    }

    console.log('\nNo-answer sweep');
    const overdue = await makeBooking({ status: 'pending', pendingUntil: new Date(Date.now() - 60000), roomName, checkin, checkout });
    const overdueRelease = await makeBooking({
        status: 'pending',
        pendingUntil: new Date(Date.now() - 60000),
        roomName,
        checkin,
        checkout,
        noResponseAction: 'release',
    });
    console.log('  waiting up to 75s for the sweep interval...');
    let swept = null;
    let sweptRelease = null;
    for (let i = 0; i < 25; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        [swept, sweptRelease] = await Promise.all([
            prisma.booking.findUnique({ where: { id: overdue.id } }),
            prisma.booking.findUnique({ where: { id: overdueRelease.id } }),
        ]);
        if (swept.status !== 'pending' && sweptRelease.status !== 'pending') break;
    }
    check('overdue pending booking auto-confirms', swept.status === 'confirmed', `saw ${swept.status}`);
    check('outcome recorded as auto_confirmed', swept.approvalOutcome === 'auto_confirmed', `saw ${swept.approvalOutcome}`);
    check('release fallback auto-releases', sweptRelease.status === 'released', `saw ${sweptRelease.status}`);
    check('release fallback records auto_released', sweptRelease.approvalOutcome === 'auto_released', `saw ${sweptRelease.approvalOutcome}`);

    console.log('\nCleanup');
    const deleted = await prisma.booking.deleteMany({ where: { id: { in: created } } });
    check('test bookings removed', deleted.count === created.length, `deleted ${deleted.count}/${created.length}`);

    console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} passed, ${failed} failed\n`);
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('\nverify crashed:', e.message);
    if (created.length) {
        await prisma.booking.deleteMany({ where: { id: { in: created } } }).catch(() => {});
        console.error(`cleaned up ${created.length} test booking(s)`);
    }
    await prisma.$disconnect();
    process.exit(1);
});
