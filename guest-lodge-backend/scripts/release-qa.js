#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Import the exact functions used by the live server. Nothing in this runner
// calls Stripe, Twilio, APNs, email, or a public Marketel URL.
const { prisma, releaseQa } = require('../server');

const {
    ManualInventoryUnavailableError,
    createManualBookingRecordWithInventory,
    deleteRoomCatalogEntry,
    formatApprovalStayRange,
    getManualAvailability,
    manualBookingStayDates,
    saveRoomCatalogEntry,
} = releaseQa;

const suffix = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
const hotelId = `release-qa-${suffix}`;
let sequence = 0;

function addDays(iso, days) {
    const date = new Date(`${iso}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function futureIso(days = 60) {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function shortDate(iso) {
    return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function bookingData({ roomName, checkin, checkout, paymentIntentId, status = 'pending' }) {
    sequence += 1;
    const nights = Math.round(
        (new Date(`${checkout}T00:00:00.000Z`) - new Date(`${checkin}T00:00:00.000Z`)) / 86400000
    );
    const code = `QA-${suffix}-${sequence}`.toUpperCase();
    return {
        ourReservationCode: code,
        pmsConfirmationCode: code,
        stripePaymentIntentId: paymentIntentId || `pi_qa_${suffix}_${sequence}`,
        status,
        hotelId,
        roomName,
        checkinDate: new Date(`${checkin}T00:00:00.000Z`),
        checkoutDate: new Date(`${checkout}T00:00:00.000Z`),
        nights,
        guestFirstName: 'Release',
        guestLastName: `QA${sequence}`,
        guestEmail: `release-qa-${sequence}@example.com`,
        guestPhone: '+15555550199',
        subtotal: nights * 100,
        taxesAndFees: nights * 10,
        grandTotal: nights * 110,
        bookingType: 'payLater',
        amountPaidNow: 0,
        preAuthHoldAmount: 1,
        holdStatus: 'active',
    };
}

async function addRoom(name, totalUnits) {
    return saveRoomCatalogEntry({
        hotelId,
        name,
        description: 'Automated release QA only',
        amenities: 'QA',
        maxOccupancy: 2,
        totalUnits,
    });
}

async function expectUnavailable(promise, label) {
    await assert.rejects(
        promise,
        (error) => error instanceof ManualInventoryUnavailableError
            || error?.code === 'MANUAL_INVENTORY_UNAVAILABLE',
        label
    );
}

async function check(label, work) {
    process.stdout.write(`  ${label} ... `);
    await work();
    process.stdout.write('PASS\n');
}

async function cleanup() {
    // Every delete is scoped to the random release-qa property. The runner
    // never reads, mutates, or cleans up a real customer property.
    await prisma.bookingSideEffectJob.deleteMany({ where: { hotelId } });
    await prisma.booking.deleteMany({ where: { hotelId } });
    await prisma.manualRoom.deleteMany({ where: { hotelId } });
    await prisma.hotelConfig.deleteMany({ where: { id: hotelId } });
}

async function run() {
    const base = futureIso(60);
    await cleanup();
    await prisma.hotelConfig.create({
        data: {
            id: hotelId,
            name: 'Marketel Release QA',
            pms: 'manual',
            active: true,
            subscribed: true,
            setupComplete: true,
            ownerEmail: 'release-qa@example.com',
        },
    });

    console.log(`\nMarketel automated release QA (${hotelId})`);

    await check('#9 simultaneous last-room checkout permits exactly one guest', async () => {
        const roomName = 'QA Race Suite';
        await addRoom(roomName, 1);
        const checkin = base;
        const checkout = addDays(base, 2);
        const outcomes = await Promise.allSettled([
            createManualBookingRecordWithInventory(hotelId, bookingData({ roomName, checkin, checkout })),
            createManualBookingRecordWithInventory(hotelId, bookingData({ roomName, checkin, checkout })),
        ]);
        assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
        assert.equal(outcomes.filter(item => item.status === 'rejected').length, 1);
        assert.equal(outcomes.find(item => item.status === 'rejected').reason.code, 'MANUAL_INVENTORY_UNAVAILABLE');
        assert.equal(await prisma.booking.count({ where: { hotelId, roomName } }), 1);
    });

    await check('#10 two units accept two overlapping bookings and reject the third', async () => {
        const roomName = 'QA Two Unit Suite';
        await addRoom(roomName, 2);
        const checkin = addDays(base, 5);
        const checkout = addDays(base, 8);
        await createManualBookingRecordWithInventory(hotelId, bookingData({ roomName, checkin, checkout }));
        await createManualBookingRecordWithInventory(hotelId, bookingData({ roomName, checkin, checkout }));
        await expectUnavailable(
            createManualBookingRecordWithInventory(hotelId, bookingData({ roomName, checkin, checkout })),
            'A third overlapping booking must be blocked.'
        );
        assert.equal(await prisma.booking.count({ where: { hotelId, roomName } }), 2);
    });

    await check('#12 a single overlapping night blocks the stay while checkout remains exclusive', async () => {
        const roomName = 'QA Overlap Suite';
        await addRoom(roomName, 1);
        const firstStart = addDays(base, 12);
        const firstEnd = addDays(base, 14);
        await createManualBookingRecordWithInventory(hotelId, bookingData({
            roomName,
            checkin: firstStart,
            checkout: firstEnd,
        }));
        await expectUnavailable(
            createManualBookingRecordWithInventory(hotelId, bookingData({
                roomName,
                checkin: addDays(base, 13),
                checkout: addDays(base, 15),
            })),
            'A stay sharing one occupied night must be blocked.'
        );
        await createManualBookingRecordWithInventory(hotelId, bookingData({
            roomName,
            checkin: firstEnd,
            checkout: addDays(base, 15),
        }));
        assert.equal(await prisma.booking.count({ where: { hotelId, roomName } }), 2);
    });

    await check('#13 a closed room-night disappears from public availability and cannot book', async () => {
        const roomName = 'QA Closed Date Suite';
        await addRoom(roomName, 1);
        const closedDate = addDays(base, 20);
        const manualRoom = await prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
        });
        await prisma.manualOverride.create({
            data: { roomId: manualRoom.id, date: closedDate, closed: true },
        });
        const covering = await getManualAvailability(hotelId, addDays(base, 19), addDays(base, 22));
        assert.equal(covering.some(room => room.roomName === roomName), false);
        const before = await getManualAvailability(hotelId, addDays(base, 18), addDays(base, 19));
        assert.equal(before.find(room => room.roomName === roomName)?.roomsAvailable, 1);
        await expectUnavailable(
            createManualBookingRecordWithInventory(hotelId, bookingData({
                roomName,
                checkin: addDays(base, 19),
                checkout: addDays(base, 22),
            })),
            'A direct booking attempt covering a closed date must fail too.'
        );
    });

    await check('#16 double-submit/two-tab completion creates one reservation and one email job', async () => {
        const roomName = 'QA Idempotent Suite';
        await addRoom(roomName, 1);
        const checkin = addDays(base, 25);
        const checkout = addDays(base, 27);
        const paymentIntentId = `pi_qa_shared_${suffix}`;
        const first = bookingData({ roomName, checkin, checkout, paymentIntentId, status: 'confirmed' });
        const second = bookingData({ roomName, checkin, checkout, paymentIntentId, status: 'confirmed' });
        const outcomes = await Promise.all([
            createManualBookingRecordWithInventory(hotelId, first),
            createManualBookingRecordWithInventory(hotelId, second),
        ]);
        assert.deepEqual(outcomes.map(outcome => outcome.created).sort(), [false, true]);
        assert.equal(outcomes[0].booking.id, outcomes[1].booking.id);
        assert.equal(await prisma.booking.count({ where: { hotelId, stripePaymentIntentId: paymentIntentId } }), 1);
        assert.equal(await prisma.bookingSideEffectJob.count({
            where: { hotelId, bookingId: outcomes[0].booking.id, type: 'confirmation_email' },
        }), 1);
    });

    await check('#17 refresh/back retry returns the original booking without another reservation', async () => {
        const paymentIntentId = `pi_qa_shared_${suffix}`;
        const existing = await prisma.booking.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
        assert.ok(existing);
        const retry = await createManualBookingRecordWithInventory(hotelId, bookingData({
            roomName: existing.roomName,
            checkin: existing.checkinDate.toISOString().slice(0, 10),
            checkout: existing.checkoutDate.toISOString().slice(0, 10),
            paymentIntentId,
            status: 'confirmed',
        }));
        assert.equal(retry.created, false);
        assert.equal(retry.booking.id, existing.id);
        assert.equal(await prisma.booking.count({ where: { hotelId, stripePaymentIntentId: paymentIntentId } }), 1);
    });

    await check('#18 inventory nights and every owner-facing range preserve checkout semantics', async () => {
        const checkin = addDays(base, 30);
        const checkout = addDays(base, 37);
        const occupied = manualBookingStayDates(checkin, checkout);
        assert.equal(occupied[0], checkin);
        assert.equal(occupied.at(-1), addDays(checkout, -1));
        assert.equal(occupied.includes(checkout), false);
        assert.equal(
            formatApprovalStayRange(
                new Date(`${checkin}T00:00:00.000Z`),
                new Date(`${checkout}T00:00:00.000Z`)
            ),
            `${shortDate(checkin)} – ${shortDate(checkout)}`
        );
    });

    await check('#32 room creation is immediately present in engine and availability records', async () => {
        const roomName = 'QA Catalog Suite';
        const room = await addRoom(roomName, 3);
        assert.equal(room.name, roomName);
        const [engineRoom, availabilityRoom, publicRooms] = await Promise.all([
            prisma.room.findUnique({ where: { hotelId_name: { hotelId, name: roomName } } }),
            prisma.manualRoom.findUnique({ where: { hotelId_name: { hotelId, name: roomName } } }),
            getManualAvailability(hotelId, addDays(base, 40), addDays(base, 41)),
        ]);
        assert.equal(engineRoom?.totalUnits, 3);
        assert.equal(availabilityRoom?.totalUnits, 3);
        assert.equal(publicRooms.find(item => item.roomName === roomName)?.roomsAvailable, 3);
    });

    await check('#33 room rename follows future bookings and public availability', async () => {
        const oldName = 'QA Rename Me';
        const newName = 'QA Renamed Suite';
        const room = await addRoom(oldName, 2);
        const checkin = addDays(base, 44);
        const checkout = addDays(base, 46);
        const outcome = await createManualBookingRecordWithInventory(hotelId, bookingData({
            roomName: oldName,
            checkin,
            checkout,
        }));
        await saveRoomCatalogEntry({
            hotelId,
            roomId: room.id,
            name: newName,
            description: room.description,
            amenities: room.amenities,
            maxOccupancy: room.maxOccupancy,
            totalUnits: 2,
        });
        assert.equal((await prisma.booking.findUnique({ where: { id: outcome.booking.id } })).roomName, newName);
        assert.equal(await prisma.room.count({ where: { hotelId, name: oldName } }), 0);
        assert.equal(await prisma.manualRoom.count({ where: { hotelId, name: oldName } }), 0);
        const available = await getManualAvailability(hotelId, checkin, checkout);
        assert.equal(available.find(item => item.roomName === newName)?.roomsAvailable, 1);
    });

    await check('#34 deleting a room with a live future booking is blocked', async () => {
        const room = await prisma.room.findUnique({
            where: { hotelId_name: { hotelId, name: 'QA Renamed Suite' } },
        });
        await assert.rejects(
            deleteRoomCatalogEntry({ hotelId, roomId: room.id }),
            error => error?.code === 'ROOM_HAS_BOOKINGS'
        );
        assert.equal(await prisma.room.count({ where: { id: room.id } }), 1);
        assert.equal(await prisma.manualRoom.count({ where: { hotelId, name: room.name } }), 1);
    });

    await check('#35 deleting an unused room removes it from every catalog', async () => {
        const roomName = 'QA Disposable Suite';
        const room = await addRoom(roomName, 1);
        const result = await deleteRoomCatalogEntry({ hotelId, roomId: room.id });
        assert.equal(result.deleted, true);
        assert.equal(await prisma.room.count({ where: { id: room.id } }), 0);
        assert.equal(await prisma.manualRoom.count({ where: { hotelId, name: roomName } }), 0);
        const available = await getManualAvailability(hotelId, addDays(base, 48), addDays(base, 49));
        assert.equal(available.some(item => item.roomName === roomName), false);
    });

    console.log('\nAutomated release checks passed: 11/11');
    console.log('Manual remainder: Safari refresh/Back UI for #17, native instant-render for #32–35, and device cases #19–31 and #36–38.\n');
}

(async () => {
    try {
        await run();
    } catch (error) {
        console.error(`\nRELEASE QA FAILED: ${error?.stack || error}`);
        process.exitCode = 1;
    } finally {
        try {
            await cleanup();
            const [hotels, bookings, rooms, manualRooms] = await Promise.all([
                prisma.hotelConfig.count({ where: { id: hotelId } }),
                prisma.booking.count({ where: { hotelId } }),
                prisma.room.count({ where: { hotelId } }),
                prisma.manualRoom.count({ where: { hotelId } }),
            ]);
            assert.deepEqual({ hotels, bookings, rooms, manualRooms }, {
                hotels: 0,
                bookings: 0,
                rooms: 0,
                manualRooms: 0,
            });
        } catch (cleanupError) {
            console.error(`RELEASE QA CLEANUP FAILED for ${hotelId}: ${cleanupError?.message || cleanupError}`);
            process.exitCode = 1;
        }
        await prisma.$disconnect();
    }
})();
