require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Seeds the states that booking review and conflict detection only reveal when
// something is actually happening, so the flow can be seen and demoed without
// waiting for a real booking to clash with a real walk-in.
//
//   node scripts/seed-booking-demo.js <hotelId>            seed
//   node scripts/seed-booking-demo.js <hotelId> --clear    remove seeded rows
//
// Everything it writes is prefixed DEMO- so --clear can never touch real data.

const prisma = new PrismaClient();
const HOTEL_ID = (process.argv[2] || '').trim();
const CLEAR = process.argv.includes('--clear');
const CODE_PREFIX = 'DEMO-';
const BASE = (process.env.DEMO_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

function isoDaysOut(n) {
    return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

// Neon suspends the database when idle and the first connection after that fails
// rather than blocking, so a cold start looks like an outage. Wait it out.
async function connectWithRetry(attempts = 5) {
    for (let i = 1; i <= attempts; i += 1) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return;
        } catch (e) {
            if (i === attempts) throw e;
            if (i === 1) console.log('Database is waking up…');
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

function mintApprovalToken(bookingId, hotelId) {
    const secret = process.env.CRM_RETURN_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.MAGIC_LINK_SECRET;
    if (!secret) return null;
    const payload = JSON.stringify({
        purpose: 'booking-approval',
        bookingId,
        hotelId,
        exp: Date.now() + 6 * 60 * 60 * 1000,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    return 'ba_' + encoded + '.' + sig;
}

async function clearDemo() {
    const del = await prisma.booking.deleteMany({
        where: { hotelId: HOTEL_ID, ourReservationCode: { startsWith: CODE_PREFIX } },
    });
    const rooms = await prisma.manualRoom.findMany({ where: { hotelId: HOTEL_ID }, select: { id: true } });
    let overrides = { count: 0 };
    if (rooms.length) {
        overrides = await prisma.manualOverride.deleteMany({
            where: { roomId: { in: rooms.map(r => r.id) }, date: { in: [isoDaysOut(2), isoDaysOut(3), isoDaysOut(4)] } },
        });
    }
    console.log(`Removed ${del.count} demo booking(s) and ${overrides.count} override(s).`);
}

async function main() {
    if (!HOTEL_ID) {
        console.error('Usage: node scripts/seed-booking-demo.js <hotelId> [--clear]');
        process.exit(1);
    }
    await connectWithRetry();
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: { id: true, name: true, pms: true, bookingApprovalEnabled: true, bookingApprovalWindowMinutes: true },
    });
    if (!hotel) { console.error(`No hotel ${HOTEL_ID}.`); process.exit(1); }

    if (CLEAR) {
        await clearDemo();
        await prisma.$disconnect();
        return;
    }

    const rooms = await prisma.manualRoom.findMany({
        where: { hotelId: HOTEL_ID },
        select: { id: true, name: true, totalUnits: true },
        orderBy: { name: 'asc' },
    });
    if (!rooms.length) { console.error('Hotel has no rooms — add one in Availability first.'); process.exit(1); }

    // Start clean so re-running doesn't stack duplicates on the same nights.
    await clearDemo();

    const room = rooms[0];
    const windowMins = hotel.bookingApprovalWindowMinutes || 20;
    const pendingNight = isoDaysOut(2);
    const conflictNight = isoDaysOut(3);
    const closedNight = isoDaysOut(4);

    const make = async (label, { night, status, bookingType, first, last, phone, total, pendingUntil }) => {
        const code = CODE_PREFIX + label + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const checkin = new Date(`${night}T00:00:00.000Z`);
        return prisma.booking.create({
            data: {
                ourReservationCode: code,
                pmsConfirmationCode: code,
                hotelId: HOTEL_ID,
                roomName: room.name,
                checkinDate: checkin,
                checkoutDate: new Date(checkin.getTime() + 86400000),
                nights: 1,
                guestFirstName: first,
                guestLastName: last,
                guestEmail: '',
                guestPhone: phone,
                subtotal: Math.round((total / 1.1) * 100) / 100,
                taxesAndFees: Math.round((total - total / 1.1) * 100) / 100,
                grandTotal: total,
                bookingType,
                status,
                crmStage: 'new',
                callStatus: 'not-called',
                amountPaidNow: 0,
                preAuthHoldAmount: bookingType === 'manual' ? null : 1.0,
                holdStatus: bookingType === 'manual' ? null : 'active',
                ...(pendingUntil ? { pendingUntil, approvalRequestedAt: new Date() } : {}),
            },
        });
    };

    const pending = await make('PENDING', {
        night: pendingNight, status: 'pending', bookingType: 'payLater',
        first: 'Demo', last: 'Awaiting Review', phone: '5551110001', total: 110,
        pendingUntil: new Date(Date.now() + windowMins * 60000),
    });

    await make('ONLINE', {
        night: conflictNight, status: 'confirmed', bookingType: 'payLater',
        first: 'Demo', last: 'Booked Online', phone: '5551110002', total: 125,
    });

    await make('WALKIN', {
        night: conflictNight, status: 'confirmed', bookingType: 'manual',
        first: 'Demo', last: 'Walk In', phone: '5551110003', total: 100,
    });

    await make('CLOSEDRM', {
        night: closedNight, status: 'confirmed', bookingType: 'payLater',
        first: 'Demo', last: 'Room Closed', phone: '5551110004', total: 115,
    });
    await prisma.manualOverride.upsert({
        where: { roomId_date: { roomId: room.id, date: closedNight } },
        create: { roomId: room.id, date: closedNight, closed: true },
        update: { closed: true },
    });

    const token = mintApprovalToken(pending.id, HOTEL_ID);

    console.log(`\nSeeded demo data for ${hotel.name} — room "${room.name}" (${room.totalUnits} unit)\n`);
    console.log(`Booking review is currently ${hotel.bookingApprovalEnabled ? 'ON' : 'OFF'}.\n`);
    console.log('What to look at, in the Bookings tab:');
    console.log(`  1. "Review bookings before they lock in" prompt — only shows while review is OFF.`);
    console.log(`  2. "Demo Awaiting Review" (${pendingNight}) — pending, counting down ~${windowMins} min.`);
    console.log(`  3. Red double-booking banner for ${conflictNight} — two bookings, one room.`);
    console.log(`  4. A second banner entry for ${closedNight} — room closed with a guest still on it.`);
    console.log(`  5. "Cancel this booking" at the bottom of any card.\n`);
    if (token) {
        console.log('Confirm / Release prompt (what the push notification opens):');
        console.log(`  ${BASE}/simple-crm.html?hotelId=${HOTEL_ID}&approve=${token}\n`);
    } else {
        console.log('No signing secret in env, so the approval link could not be minted.\n');
    }
    console.log(`Note: the pending booking auto-confirms once its ${windowMins} minutes elapse.`);
    console.log(`Clean up with: node scripts/seed-booking-demo.js ${HOTEL_ID} --clear\n`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('seed failed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
