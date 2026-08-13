require('dotenv').config();

const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// Creates or refreshes the dedicated App Review property. This account is
// intentionally independent of Stripe, contains only synthetic data, and can
// be safely reseeded without touching customer properties.
//
// Usage:
//   node scripts/seed-app-review-property.js <stable-review-pin>

// Do not commit the PIN. Put the resulting Property ID and PIN only in App
// Store Connect's private App Review Information fields.

const prisma = new PrismaClient();
const REVIEW_HOTEL_ID = 'marketel-review-inn';
const REVIEW_DOMAIN = 'marketel-review-inn.mktel.co';
const REVIEW_PREFIX = 'APPREVIEW-';
const REVIEW_PIN = String(process.argv[2] || process.env.APP_REVIEW_FRONTDESK_PIN || '').trim();

function crmPinHash(pin) {
    const secret = String(process.env.CRM_PIN_HASH_SECRET || '').trim();
    if (secret) {
        return 'v2:' + crypto.createHmac('sha256', secret).update(pin).digest('hex');
    }
    return crypto.createHash('sha256').update(pin).digest('hex');
}

function daysFromToday(days, hour = 15) {
    const value = new Date();
    value.setHours(hour, 0, 0, 0);
    value.setDate(value.getDate() + days);
    return value;
}

function dateKey(days) {
    const value = daysFromToday(days, 12);
    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0'),
    ].join('-');
}

function bookingData({
    code,
    roomName,
    checkinInDays,
    nights,
    firstName,
    lastName,
    email,
    phone,
    nightly,
    status = 'confirmed',
    ownerReviewStatus = 'available',
    cancellationReason = null,
    notes = null,
}) {
    const checkinDate = daysFromToday(checkinInDays);
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + nights);
    const subtotal = Number((nightly * nights).toFixed(2));
    const taxesAndFees = Number((subtotal * 0.1).toFixed(2));
    const grandTotal = Number((subtotal + taxesAndFees).toFixed(2));
    const cancelled = status === 'cancelled';

    return {
        ourReservationCode: `${REVIEW_PREFIX}${code}`,
        pmsConfirmationCode: `${REVIEW_PREFIX}${code}`,
        status,
        hotelId: REVIEW_HOTEL_ID,
        roomName,
        checkinDate,
        checkoutDate,
        nights,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        subtotal,
        taxesAndFees,
        grandTotal,
        bookingType: 'payLater',
        amountPaidNow: 0,
        preAuthHoldAmount: cancelled ? 0 : 1,
        holdStatus: cancelled ? 'released' : 'active',
        holdReleasedAt: cancelled ? new Date() : null,
        crmStage: cancelled ? 'lost' : 'new',
        callStatus: 'not-called',
        notes,
        approvalOutcome: cancelled ? 'owner_released' : 'owner_confirmed',
        approvalDecidedAt: new Date(),
        cancelledAt: cancelled ? new Date() : null,
        cancellationReason,
        ownerReviewStatus,
        ownerReviewRequestedAt: ownerReviewStatus === 'unreviewed' ? new Date() : null,
        ownerReviewedAt: ownerReviewStatus === 'unreviewed' ? null : new Date(),
        ownerReviewNextReminderAt: ownerReviewStatus === 'unreviewed' ? daysFromToday(30) : null,
        fulfillmentStatus: 'completed',
        fulfillmentUpdatedAt: new Date(),
    };
}

async function connectWithRetry(attempts = 6) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return;
        } catch (error) {
            if (attempt === attempts) throw error;
            if (attempt === 1) console.log('Database is waking up...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

async function seedProperty() {
    await prisma.hotelConfig.upsert({
        where: { id: REVIEW_HOTEL_ID },
        create: {
            id: REVIEW_HOTEL_ID,
            name: 'Marketel Review Inn',
            pms: 'manual',
            active: true,
            setupComplete: true,
            subscribed: true,
            marketelSubscriptionStatus: 'app_review',
            ownerEmail: 'support@bookmarketel.com',
            phone: '+1 555 010 0174',
            address: '100 Review Lane, Minneapolis, MN 55401',
            subtitle: 'A synthetic demonstration property for App Review',
            theme: 'light',
            appIconUrl: '/app-review/marketel-review-inn-icon.webp',
            checkInTime: '15:00',
            checkOutTime: '11:00',
            cancellationPolicy: 'Free cancellation until 24 hours before arrival. Demonstration reservations have no monetary value.',
            bookingApprovalEnabled: true,
            bookingApprovalWindowMinutes: 5,
            bookingApprovalNoResponseAction: 'confirm',
            bookingApprovalPolicyChosenAt: new Date(),
            bookingReviewReminderMinutes: 15,
            frontdeskInstalledAt: new Date(),
        },
        update: {
            name: 'Marketel Review Inn',
            pms: 'manual',
            active: true,
            setupComplete: true,
            subscribed: true,
            marketelSubscriptionStatus: 'app_review',
            ownerEmail: 'support@bookmarketel.com',
            phone: '+1 555 010 0174',
            address: '100 Review Lane, Minneapolis, MN 55401',
            subtitle: 'A synthetic demonstration property for App Review',
            theme: 'light',
            appIconUrl: '/app-review/marketel-review-inn-icon.webp',
            checkInTime: '15:00',
            checkOutTime: '11:00',
            cancellationPolicy: 'Free cancellation until 24 hours before arrival. Demonstration reservations have no monetary value.',
            bookingApprovalEnabled: true,
            bookingApprovalWindowMinutes: 5,
            bookingApprovalNoResponseAction: 'confirm',
            bookingApprovalPolicyChosenAt: new Date(),
            bookingReviewReminderMinutes: 15,
            frontdeskInstalledAt: new Date(),
            marketelStripeCustomerId: null,
            marketelStripeSubscriptionId: null,
            marketelCurrentPeriodEnd: null,
        },
    });

    await prisma.hotelDomain.deleteMany({ where: { hotelId: REVIEW_HOTEL_ID } });
    await prisma.hotelDomain.create({
        data: { hotelId: REVIEW_HOTEL_ID, domain: REVIEW_DOMAIN, isPrimary: true },
    });

    await prisma.crmPin.updateMany({
        where: { hotelId: REVIEW_HOTEL_ID },
        data: { active: false },
    });
    await prisma.crmPin.upsert({
        where: {
            hotelId_pinHash: {
                hotelId: REVIEW_HOTEL_ID,
                pinHash: crmPinHash(REVIEW_PIN),
            },
        },
        create: {
            hotelId: REVIEW_HOTEL_ID,
            pinHash: crmPinHash(REVIEW_PIN),
            label: 'App Review',
            active: true,
        },
        update: { label: 'App Review', active: true },
    });

    await prisma.hotelRates.upsert({
        where: { hotelId: REVIEW_HOTEL_ID },
        create: {
            hotelId: REVIEW_HOTEL_ID,
            nightly: 149,
            weekly: 899,
            monthly: 2690,
            taxRate: 0.1,
        },
        update: { nightly: 149, weekly: 899, monthly: 2690, taxRate: 0.1 },
    });
}

async function seedRooms() {
    const roomSpecs = [
        {
            id: 'app-review-room-garden-king',
            manualId: 'app-review-manual-garden-king',
            imageId: 'app-review-image-garden-king',
            name: 'Garden King',
            description: 'A bright king room with a work desk, reading chair, and a peaceful garden view.',
            amenities: 'Free WiFi • King bed • Work desk • Mini fridge • Free parking',
            maxOccupancy: 2,
            totalUnits: 3,
            sortOrder: 0,
            imageUrl: '/app-review/garden-king.webp',
        },
        {
            id: 'app-review-room-corner-queen',
            manualId: 'app-review-manual-corner-queen',
            imageId: 'app-review-image-corner-queen',
            name: 'Corner Queen',
            description: 'Two queen beds, a small dining table, and wide windows for an easy family stay.',
            amenities: 'Free WiFi • Two queen beds • Table and chairs • Mini fridge • Free parking',
            maxOccupancy: 4,
            totalUnits: 4,
            sortOrder: 1,
            imageUrl: '/app-review/corner-queen.webp',
        },
        {
            id: 'app-review-room-family-suite',
            manualId: 'app-review-manual-family-suite',
            imageId: 'app-review-image-family-suite',
            name: 'Family Suite',
            description: 'A spacious suite with a king bed, sitting area, sleeper sofa, and kitchenette.',
            amenities: 'Free WiFi • King bed • Sleeper sofa • Kitchenette • Free parking',
            maxOccupancy: 5,
            totalUnits: 2,
            sortOrder: 2,
            imageUrl: '/app-review/family-suite.webp',
        },
    ];

    for (const spec of roomSpecs) {
        await prisma.room.upsert({
            where: { id: spec.id },
            create: {
                id: spec.id,
                hotelId: REVIEW_HOTEL_ID,
                name: spec.name,
                description: spec.description,
                amenities: spec.amenities,
                maxOccupancy: spec.maxOccupancy,
                totalUnits: spec.totalUnits,
                sortOrder: spec.sortOrder,
            },
            update: {
                name: spec.name,
                description: spec.description,
                amenities: spec.amenities,
                maxOccupancy: spec.maxOccupancy,
                totalUnits: spec.totalUnits,
                sortOrder: spec.sortOrder,
            },
        });
        await prisma.roomImage.upsert({
            where: { id: spec.imageId },
            create: {
                id: spec.imageId,
                roomId: spec.id,
                url: spec.imageUrl,
                sortOrder: 0,
            },
            update: { roomId: spec.id, url: spec.imageUrl, sortOrder: 0 },
        });
        await prisma.manualRoom.upsert({
            where: { id: spec.manualId },
            create: {
                id: spec.manualId,
                hotelId: REVIEW_HOTEL_ID,
                name: spec.name,
                totalUnits: spec.totalUnits,
            },
            update: { name: spec.name, totalUnits: spec.totalUnits },
        });
    }

    await prisma.roomImage.upsert({
        where: { id: 'app-review-image-property-exterior' },
        create: {
            id: 'app-review-image-property-exterior',
            roomId: 'app-review-room-garden-king',
            url: '/app-review/property-exterior.webp',
            sortOrder: 1,
        },
        update: {
            roomId: 'app-review-room-garden-king',
            url: '/app-review/property-exterior.webp',
            sortOrder: 1,
        },
    });

    await prisma.manualOverride.upsert({
        where: {
            roomId_date: {
                roomId: 'app-review-manual-family-suite',
                date: dateKey(8),
            },
        },
        create: {
            roomId: 'app-review-manual-family-suite',
            date: dateKey(8),
            closed: true,
        },
        update: { closed: true, availableUnits: null },
    });
    await prisma.manualOverride.upsert({
        where: {
            roomId_date: {
                roomId: 'app-review-manual-corner-queen',
                date: dateKey(5),
            },
        },
        create: {
            roomId: 'app-review-manual-corner-queen',
            date: dateKey(5),
            closed: false,
            availableUnits: 1,
        },
        update: { closed: false, availableUnits: 1 },
    });
}

async function seedBookingsAndMessages() {
    await prisma.booking.deleteMany({
        where: {
            hotelId: REVIEW_HOTEL_ID,
            ourReservationCode: { startsWith: REVIEW_PREFIX },
        },
    });

    const bookings = [
        bookingData({
            code: 'GK-1001',
            roomName: 'Garden King',
            checkinInDays: 1,
            nights: 2,
            firstName: 'Taylor',
            lastName: 'Demo',
            email: 'taylor.demo@example.com',
            phone: '+1 555 010 1101',
            nightly: 149,
            ownerReviewStatus: 'unreviewed',
            notes: 'Late arrival around 8:30 PM.',
        }),
        bookingData({
            code: 'CQ-1002',
            roomName: 'Corner Queen',
            checkinInDays: 4,
            nights: 3,
            firstName: 'Jordan',
            lastName: 'Sample',
            email: 'jordan.sample@example.com',
            phone: '+1 555 010 1102',
            nightly: 169,
            notes: 'Traveling with two children.',
        }),
        bookingData({
            code: 'FS-1003',
            roomName: 'Family Suite',
            checkinInDays: 10,
            nights: 2,
            firstName: 'Morgan',
            lastName: 'Example',
            email: 'morgan.example@example.com',
            phone: '+1 555 010 1103',
            nightly: 199,
        }),
        bookingData({
            code: 'GK-1004',
            roomName: 'Garden King',
            checkinInDays: 7,
            nights: 1,
            firstName: 'Casey',
            lastName: 'Preview',
            email: 'casey.preview@example.com',
            phone: '+1 555 010 1104',
            nightly: 149,
            status: 'cancelled',
            ownerReviewStatus: 'cancelled',
            cancellationReason: 'Guest requested a different date',
        }),
    ];

    for (const data of bookings) {
        await prisma.booking.create({ data });
    }

    const firstBooking = await prisma.booking.findUnique({
        where: { ourReservationCode: `${REVIEW_PREFIX}GK-1001` },
        select: { id: true },
    });

    await prisma.guestMessage.deleteMany({ where: { hotelId: REVIEW_HOTEL_ID } });
    await prisma.guestMessage.createMany({
        data: [
            {
                hotelId: REVIEW_HOTEL_ID,
                bookingId: firstBooking?.id || null,
                reservationCode: `${REVIEW_PREFIX}GK-1001`,
                guestName: 'Taylor Demo',
                guestEmail: 'taylor.demo@example.com',
                guestPhone: '+1 555 010 1101',
                roomName: 'Garden King',
                body: 'Could we arrive around 8:30 PM?',
                sender: 'guest',
                readAt: null,
            },
            {
                hotelId: REVIEW_HOTEL_ID,
                bookingId: firstBooking?.id || null,
                reservationCode: `${REVIEW_PREFIX}GK-1001`,
                guestName: 'Taylor Demo',
                guestEmail: 'taylor.demo@example.com',
                guestPhone: '+1 555 010 1101',
                roomName: 'Garden King',
                body: 'Absolutely. Your room will be ready, and late arrival is noted.',
                sender: 'hotel',
                readAt: new Date(),
                guestReadAt: new Date(),
            },
        ],
    });
}

async function seedAssistantAndSupport() {
    await prisma.frontDeskAssistantConfig.upsert({
        where: { hotelId: REVIEW_HOTEL_ID },
        create: {
            hotelId: REVIEW_HOTEL_ID,
            enabled: true,
            checkFrequency: 'smart',
            dailyCheckTime: '18:00',
            timeZone: 'America/Chicago',
            notifyNewBookings: true,
        },
        update: {
            enabled: true,
            checkFrequency: 'smart',
            dailyCheckTime: '18:00',
            timeZone: 'America/Chicago',
            notifyNewBookings: true,
        },
    });

    await prisma.frontDeskAssistantActivity.deleteMany({ where: { hotelId: REVIEW_HOTEL_ID } });
    await prisma.frontDeskAssistantActivity.createMany({
        data: [
            {
                hotelId: REVIEW_HOTEL_ID,
                direction: 'outbound',
                type: 'booking_alert',
                body: 'New request at Marketel Review Inn: Garden King for Taylor Demo. Is it still free?',
                summary: 'Asked the property to verify the Garden King request.',
                status: 'delivered',
                createdAt: new Date(Date.now() - 12 * 60 * 1000),
            },
            {
                hotelId: REVIEW_HOTEL_ID,
                direction: 'inbound',
                type: 'booking_alert',
                body: 'Yes, it is still free.',
                summary: 'Property confirmed the room is available.',
                status: 'recorded',
                createdAt: new Date(Date.now() - 11 * 60 * 1000),
            },
            {
                hotelId: REVIEW_HOTEL_ID,
                direction: 'system',
                type: 'availability_update',
                body: 'Kept Taylor Demo\'s Garden King request and recorded the decision.',
                summary: 'Booking kept; guest confirmation completed.',
                status: 'recorded',
                createdAt: new Date(Date.now() - 10 * 60 * 1000),
            },
        ],
    });

    const thread = await prisma.supportThread.upsert({
        where: { hotelId: REVIEW_HOTEL_ID },
        create: {
            hotelId: REVIEW_HOTEL_ID,
            status: 'open',
            lastMessageAt: new Date(),
        },
        update: { status: 'open', lastMessageAt: new Date() },
    });
    await prisma.supportMessage.deleteMany({ where: { threadId: thread.id } });
    await prisma.supportMessage.create({
        data: {
            threadId: thread.id,
            sender: 'support',
            body: 'Welcome to the synthetic App Review property. You can use this conversation to test in-app support.',
            context: { synthetic: true, purpose: 'app-review' },
        },
    });
}

async function provisionReviewDomain() {
    const token = String(process.env.VERCEL_TOKEN || '').trim();
    const projectId = String(process.env.VERCEL_PROJECT_ID || '').trim();
    if (!token || !projectId) {
        throw new Error('VERCEL_TOKEN and VERCEL_PROJECT_ID are required to provision the review domain.');
    }

    try {
        await axios.post(
            `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`,
            { name: REVIEW_DOMAIN },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            },
        );
        console.log(`Vercel domain provisioned: ${REVIEW_DOMAIN}`);
    } catch (error) {
        const apiError = error.response?.data?.error;
        const code = String(apiError?.code || '').toLowerCase();
        const message = String(apiError?.message || error.message || 'unknown error');
        if (error.response?.status === 409 || code.includes('already') || /already|exists/i.test(message)) {
            console.log(`Vercel domain already provisioned: ${REVIEW_DOMAIN}`);
            return;
        }
        throw new Error(`Could not provision ${REVIEW_DOMAIN} in Vercel: ${message}`);
    }
}

async function main() {
    if (!REVIEW_PIN || REVIEW_PIN.length < 6) {
        console.error('Usage: node scripts/seed-app-review-property.js <stable-review-pin>');
        console.error('The review PIN must contain at least 6 characters.');
        process.exitCode = 1;
        return;
    }

    await connectWithRetry();
    await seedProperty();
    await seedRooms();
    await seedBookingsAndMessages();
    await seedAssistantAndSupport();
    await provisionReviewDomain();

    console.log('App Review property is ready.');
    console.log(`Property ID: ${REVIEW_HOTEL_ID}`);
    console.log(`Booking page: https://${REVIEW_DOMAIN}`);
    console.log('PIN: supplied argument (not printed)');
    console.log('All guest/property records in this account are synthetic.');
}

main()
    .catch(error => {
        console.error('App Review seed failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
