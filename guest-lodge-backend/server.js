require('dotenv').config();
const path = require('path');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const xml2js = require('xml2js');
const http = require('http');
const https = require('https');
const webpush = require('web-push');

// Web Push configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@example.com';

// Meta Ads / Facebook Marketing API config
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';

// Meta Conversions API (CAPI) config
const META_PIXEL_ID = process.env.META_PIXEL_ID || '';
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || ''; // Set in env for testing only; leave unset in production
const ENABLE_META_CAPI = process.env.ENABLE_META_CAPI !== 'false'; // ON by default; set ENABLE_META_CAPI=false to disable

// Web Push (PWA notifications for new bookings)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('✅ Web push configured with subject:', VAPID_SUBJECT);
}

const app = express();
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1&pool_timeout=20'
        }
    },
    log: ['error'],
});

// Reconnect helper for connection pool drops (e.g. Supabase idle timeout)
async function withRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            const msg = e?.message || '';
            const isConnErr =
                msg.includes("Can't reach database") ||
                msg.includes('P1001') ||
                msg.includes('P1017') ||
                msg.includes('Engine is not yet connected');
            if (isConnErr && i < retries - 1) {
                console.log(`DB connection failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
                await prisma.$disconnect();
                await new Promise(r => setTimeout(r, delay));
                await prisma.$connect();
            } else {
                throw e;
            }
        }
    }
}

// Keepalive ping so connection never goes idle (Supabase drops ~5 min)
setInterval(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        // silent - just keeping connection warm
    }
}, 2 * 60 * 1000); // ping every 2 minutes (well under Supabase's ~5 min timeout)

const allowedOrigins = [
    'https://suitestay.clickinns.com',
    'https://www.suitestay.clickinns.com',
    'https://homeplacesuites.clickinns.com',
    'https://www.homeplacesuites.clickinns.com',
    'https://myhomeplacesuites.com',
    'https://www.myhomeplacesuites.com',
    'https://guestlodgeminot.clickinns.com',
    'https://stcroix.clickinns.com',
    'https://clickinns.com',
    'https://www.clickinns.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
].concat((process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
        if (!origin) return callback(null, true);
        // Explicit allow list
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        // Allow any Render deployment (*.onrender.com)
        if (origin.endsWith('.onrender.com')) return callback(null, true);
        // Allow Vercel preview/production domains used by frontend deployments
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
};



// Webhook needs raw body
app.use('/api/stripe-webhook', express.raw({type: 'application/json'}));
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/stripe-webhook')) {
        next();
    } else {
        express.json()(req, res, next);
    }
});

app.use(express.json());
app.use(express.text());
app.set('trust proxy', true);

const PORT = 3001;
const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY;
const ALLOW_MANUAL_AVAILABILITY_FALLBACK = process.env.ALLOW_MANUAL_AVAILABILITY_FALLBACK === 'true';

// BookingCenter (SOAP/XML) - use BCDEMO creds for test environment
// Jeff: "You can only use BCDEMO in the TEST system"
const BOOKINGCENTER_TEST_SITE_ID = process.env.BOOKINGCENTER_TEST_SITE_ID || 'BCDEMO';
const BOOKINGCENTER_TEST_PASSWORD = process.env.BOOKINGCENTER_TEST_PASSWORD || '';
const BOOKINGCENTER_TEST_CHAIN_CODE = process.env.BOOKINGCENTER_TEST_CHAIN_CODE || 'BC';

const BOOKINGCENTER_ENDPOINTS = {
    // Defaults to test endpoints; override in Render env for production.
    availability: process.env.BOOKINGCENTER_AVAILABILITY_ENDPOINT || 'https://ws-server-test.bookingcenter.com/hotel_availability.php',
    booking: process.env.BOOKINGCENTER_BOOKING_ENDPOINT || 'https://ws-server-test.bookingcenter.com/new_booking.php',
};

// BookingCenter receipt type codes (site_receipt_types.phtml)
// Jeff: use an overlap like WOFF in both BCDEMO and STCROIX for initial integration.
// Default to PF (Phone or Fax) in BCDEMO since it doesn't require real card details.
// You can override via env per site once STCROIX is enabled.
const BOOKINGCENTER_TEST_RECEIPT_TYPE = process.env.BOOKINGCENTER_TEST_RECEIPT_TYPE || 'PF';


// Multi-hotel configuration
const hotelConfig = {
    'suite-stay': {
        pms: 'cloudbeds',
        propertyId: '100080519237760',
        roomIDMapping: {
            'King Room': {
                roomTypeIDs: [
                    '104645995540719',  // smoking
                    '104645995544800'   // non-smoking
                ],
                rates: {
                    nightly: { smoking: '104645995540724', nonSmoking: '104646759809220' },
                    weekly:  { smoking: '163454677930189', nonSmoking: '163454677930190' },
                    monthly: { smoking: '163455843680424', nonSmoking: '163455843680425' }
                }
            },
            'Double Full Bed': {
                roomTypeIDs: [
                    '104634114855119',  // smoking
                    '104644269441156'   // non-smoking
                ],
                rates: {
                    nightly: { smoking: '104634114855121', nonSmoking: '104644269441201' },
                    weekly:  { smoking: '163455410200729', nonSmoking: '163455410200730' },
                    monthly: { smoking: '163456335478921', nonSmoking: '163456335478922' }
                }
            }
        }
    },
    'home-place-suites': {
        pms: 'cloudbeds',
        propertyId: '113548817731712',
        roomIDMapping: {
            'Single King Room': {
                roomTypeID: '117057244229790',
                rates: {
                    nightly: '117057244229790', // Update with actual rate IDs
                    weekly: '117057244229790',
                    monthly: '117057244229790'
                }
            },
            'Double Queen Room': {
                roomTypeID: '116355544711397',
                rates: {
                    nightly: '116355544711397',
                    weekly: '116355544711397',
                    monthly: '116355544711397'
                }
            },
            'Double Queen Suite With Kitchenette': {
                roomTypeID: '117068633694351',
                rates: {
                    nightly: '117068633694351',
                    weekly: '117068633694351',
                    monthly: '117068633694351'
                }
            }
        }
    },
    'guest-lodge-minot': {
        pms: 'manual',
        // Manual front-desk managed availability (simple-crm.html)
        roomIDMapping: {}
    },
    'st-croix-wisconsin': {
        pms: 'bookingcenter',
        siteId: process.env.BOOKINGCENTER_STCROIX_SITE_ID || 'STCROIX',
        sitePassword: process.env.BOOKINGCENTER_STCROIX_SITE_PASSWORD,
        chainCode: process.env.BOOKINGCENTER_STCROIX_CHAIN_CODE || process.env.BOOKINGCENTER_CHAIN_CODE || 'BC',
        // Room mappings will be added once BookingCenter API is set up
        roomIDMapping: {}
    }
};

const HOTEL_CONFIG_CACHE_TTL_MS = 30 * 1000;
const hotelConfigCache = new Map();

function normalizeHotelConfig(input = {}) {
    const normalized = {
        ...input,
        pms: String(input.pms || '').toLowerCase(),
    };
    if (!normalized.roomIDMapping || typeof normalized.roomIDMapping !== 'object' || Array.isArray(normalized.roomIDMapping)) {
        normalized.roomIDMapping = {};
    }
    return normalized;
}

async function getDbHotelConfig(hotelId) {
    if (!prisma.hotelConfig) return null;
    const key = String(hotelId || '').trim();
    if (!key) return null;

    const cached = hotelConfigCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const row = await withRetry(() => prisma.hotelConfig.findUnique({
        where: { id: key },
        include: { domains: true },
    }));

    const config = row && row.active
        ? normalizeHotelConfig({
            id: row.id,
            name: row.name || row.id,
            pms: row.pms,
            propertyId: row.propertyId || undefined,
            siteId: row.siteId || undefined,
            sitePassword: row.sitePassword || undefined,
            chainCode: row.chainCode || undefined,
            roomIDMapping: row.roomIDMapping || {},
            domains: (row.domains || []).map(d => d.domain),
            source: 'db',
        })
        : null;

    hotelConfigCache.set(key, { value: config, expiresAt: Date.now() + HOTEL_CONFIG_CACHE_TTL_MS });
    return config;
}

function getStaticHotelConfig(hotelId) {
    const config = hotelConfig[hotelId];
    if (!config) {
        throw new Error(`Hotel configuration not found for: ${hotelId}`);
    }
    return normalizeHotelConfig({ id: hotelId, ...config, source: 'static' });
}

async function resolveHotelConfig(hotelId) {
    const dbConfig = await getDbHotelConfig(hotelId);
    if (dbConfig) return dbConfig;
    try {
        return getStaticHotelConfig(hotelId);
    } catch (err) {
        if (!ALLOW_MANUAL_AVAILABILITY_FALLBACK) throw err;
        return normalizeHotelConfig({
            id: hotelId || 'unknown',
            pms: 'manual',
            roomIDMapping: {},
            source: 'fallback',
        });
    }
}

// Legacy mapping for backwards compatibility (will be removed)
const roomIDMapping = hotelConfig['suite-stay'].roomIDMapping;
const PROPERTY_ID = hotelConfig['suite-stay'].propertyId;

const getBestRatePlan = (nights) => {
    if (nights >= 28) {
        return 'monthly';
    }
    if (nights >= 7) {
        return 'weekly';
    }
    return 'nightly';
};

function normalizeIsoDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function enumerateDatesInclusive(startIso, endIso, maxDays = 180) {
    const start = normalizeIsoDate(startIso);
    const end = normalizeIsoDate(endIso);
    if (!start || !end) return [];
    if (end < start) return [];

    const out = [];
    let cursor = new Date(`${start}T00:00:00.000Z`);
    const last = new Date(`${end}T00:00:00.000Z`);

    while (cursor <= last && out.length < maxDays) {
        out.push(cursor.toISOString().slice(0, 10));
        cursor = new Date(cursor.getTime() + 86400000);
    }
    return out;
}

function slugifyText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function formatManualAvailabilityPayload(rooms) {
    const overrides = {};
    for (const room of rooms) {
        for (const ov of room.overrides || []) {
            overrides[`${room.name}|${ov.date}`] = {
                availableUnits: ov.availableUnits,
                closed: ov.closed,
                updatedAt: ov.updatedAt,
            };
        }
    }

    return {
        rooms: rooms.map(r => ({ name: r.name, totalUnits: r.totalUnits })),
        overrides,
    };
}

async function getManualRooms(hotelId) {
    if (!prisma.manualRoom || !prisma.manualOverride) {
        throw new Error('Manual availability models are missing in Prisma client. Redeploy with prisma generate + prisma migrate deploy.');
    }
    return withRetry(() => prisma.manualRoom.findMany({
        where: { hotelId },
        include: { overrides: true },
        orderBy: { name: 'asc' },
    }));
}

async function getManualAvailability(hotelId, checkin, checkout) {
    if (!prisma.manualRoom || !prisma.manualOverride) {
        throw new Error('Manual availability models are missing in Prisma client. Redeploy with prisma generate + prisma migrate deploy.');
    }
    const start = normalizeIsoDate(checkin);
    const end = normalizeIsoDate(checkout);
    if (!start || !end || end <= start) return [];

    const checkinDate = new Date(`${start}T00:00:00.000Z`);
    const checkoutDate = new Date(`${end}T00:00:00.000Z`);
    const stayDates = enumerateDatesInclusive(
        start,
        new Date(checkoutDate.getTime() - 86400000).toISOString().slice(0, 10),
        180
    );
    if (!stayDates.length) return [];

    const rooms = await withRetry(() => prisma.manualRoom.findMany({
        where: { hotelId },
        include: {
            overrides: {
                where: { date: { in: stayDates } },
            },
        },
    }));
    if (!rooms.length) return [];

    const overlapping = await withRetry(() => prisma.booking.findMany({
        where: {
            hotelId,
            checkinDate: { lt: checkoutDate },
            checkoutDate: { gt: checkinDate },
        },
        select: {
            roomName: true,
            checkinDate: true,
            checkoutDate: true,
        },
    }));

    const bookedCounts = {};
    for (const b of overlapping) {
        const roomName = String(b.roomName || '').trim();
        if (!roomName) continue;
        const bStart = normalizeIsoDate(b.checkinDate);
        const bEnd = normalizeIsoDate(b.checkoutDate);
        if (!bStart || !bEnd || bEnd <= bStart) continue;
        const bookedDays = enumerateDatesInclusive(
            bStart,
            new Date(new Date(`${bEnd}T00:00:00.000Z`).getTime() - 86400000).toISOString().slice(0, 10),
            180
        );
        for (const day of bookedDays) {
            const key = `${roomName}|${day}`;
            bookedCounts[key] = (bookedCounts[key] || 0) + 1;
        }
    }

    const out = [];
    for (const room of rooms) {
        const roomName = String(room.name || '').trim();
        const totalUnits = Math.max(0, parseInt(room.totalUnits, 10) || 0);
        if (!roomName || totalUnits <= 0) continue;
        const overrideMap = Object.fromEntries((room.overrides || []).map(ov => [ov.date, ov]));

        let minAvailable = Number.POSITIVE_INFINITY;
        for (const day of stayDates) {
            const override = overrideMap[day];
            const booked = bookedCounts[`${roomName}|${day}`] || 0;

            let availableForDay;
            if (override?.closed) {
                availableForDay = 0;
            } else if (override && override.availableUnits !== null) {
                availableForDay = Math.max(0, override.availableUnits);
            } else {
                availableForDay = Math.max(0, totalUnits - booked);
            }
            minAvailable = Math.min(minAvailable, availableForDay);
        }

        const availableRooms = Number.isFinite(minAvailable) ? minAvailable : 0;
        if (availableRooms <= 0) continue;

        const slug = slugifyText(roomName) || 'room';
        out.push({
            roomName,
            available: true,
            roomsAvailable: availableRooms,
            roomTypeID: `manual-${slug}`,
            rateID: `manual-${slug}`,
            source: 'manual',
        });
    }

    return out;
}

async function createManualBooking(hotelId, bookingDetails) {
    const fallbackCode = `MANUAL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
    return {
        success: true,
        reservationID: bookingDetails?.reservationCode || fallbackCode,
        provider: 'manual',
        hotelId,
    };
}


// ── META CONVERSIONS API (CAPI) ──────────────────────────────────────────────

// Helper function to hash and normalize data for Meta CAPI
function hashValue(value) {
    if (!value) return null;
    const normalized = String(value).toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Send event to Meta Conversions API
async function sendToMetaCAPI(eventName, eventData) {
    if (!ENABLE_META_CAPI) {
        console.log('Meta CAPI disabled - skipping');
        return { success: false, reason: 'disabled' };
    }

    if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
        console.warn('Meta CAPI: Missing credentials');
        return { success: false, reason: 'missing_credentials' };
    }

    try {
        const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;
        
        // Build user_data with hashed PII
        const userData = {};
        
        if (eventData.user_data) {
            if (eventData.user_data.em) {
                userData.em = [hashValue(eventData.user_data.em)];
            }
            if (eventData.user_data.ph) {
                const phoneDigits = String(eventData.user_data.ph).replace(/\D/g, '');
                userData.ph = [hashValue(phoneDigits)];
            }
            if (eventData.user_data.fn) {
                userData.fn = [hashValue(eventData.user_data.fn)];
            }
            if (eventData.user_data.ln) {
                userData.ln = [hashValue(eventData.user_data.ln)];
            }
            if (eventData.user_data.ad) {
                userData.ct = eventData.user_data.ad.ct ? [hashValue(eventData.user_data.ad.ct)] : undefined;
                userData.st = eventData.user_data.ad.st ? [hashValue(eventData.user_data.ad.st)] : undefined;
                userData.zp = eventData.user_data.ad.zp ? [hashValue(eventData.user_data.ad.zp)] : undefined;
                userData.country = eventData.user_data.ad.country ? [hashValue(eventData.user_data.ad.country)] : undefined;
            }
            if (eventData.user_data.external_id) {
                userData.external_id = [eventData.user_data.external_id];
            }
        }
        
        // Add client info (not hashed)
        if (eventData.client_ip_address) userData.client_ip_address = eventData.client_ip_address;
        if (eventData.user_agent) userData.client_user_agent = eventData.user_agent;
        if (eventData.fbc) userData.fbc = eventData.fbc;
        if (eventData.fbp) userData.fbp = eventData.fbp;

        // Build custom_data
        const customData = {};
        if (eventData.value) customData.value = parseFloat(eventData.value);
        if (eventData.currency) customData.currency = eventData.currency;
        if (eventData.content_name) customData.content_name = eventData.content_name;
        if (eventData.content_ids) customData.content_ids = eventData.content_ids;
        if (eventData.content_type) customData.content_type = eventData.content_type;
        if (eventData.num_items) customData.num_items = parseInt(eventData.num_items);

        // Build the event payload
        const eventPayload = {
            event_name: eventName,
            event_time: eventData.event_time || Math.floor(Date.now() / 1000),
            event_id: eventData.event_id || `${eventName.toLowerCase()}.${Date.now()}`,
            event_source_url: eventData.event_source_url || 'https://suitestay.com',
            action_source: 'website',
            user_data: userData,
            custom_data: customData
        };

        // Build final payload
        const payload = {
            data: [eventPayload],
            access_token: META_ACCESS_TOKEN
        };

        // Add test event code if provided
        if (META_TEST_EVENT_CODE) {
            payload.test_event_code = META_TEST_EVENT_CODE;
        }

        const response = await axios.post(url, payload);
        
        console.log(`✅ Meta CAPI: ${eventName} sent successfully`, {
            event_id: eventPayload.event_id,
            test_mode: !!META_TEST_EVENT_CODE,
            events_received: response.data?.events_received,
            fbtrace_id: response.data?.fbtrace_id
        });

        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ Meta CAPI: ${eventName} failed`, {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        return { success: false, error: error.message };
    }
}

// In-memory funnel event store (last 500 events, for dashboard)
const FUNNEL_EVENTS = ['PageView', 'Search', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'CardModalAcknowledged', 'ConfirmBookingClick', 'Purchase', 'CallModalDismissed', 'TapToCallFirst', 'CardDeclineModalShown'];
const funnelStore = [];
const FUNNEL_MAX = 500;

function pushFunnelEvent(event_name, eventData) {
    if (!FUNNEL_EVENTS.includes(event_name)) return;
    funnelStore.unshift({
        event_name,
        timestamp: Date.now(),
        event_id: eventData?.event_id,
        value: eventData?.value,
        content_name: eventData?.content_name,
    });
    if (funnelStore.length > FUNNEL_MAX) funnelStore.pop();
}

// In your server.jss

// File: guest-lodge-backend/server.js

app.post('/api/create-payment-intent', async (req, res) => {
    const { amount, bookingDetails, guestInfo, hotelId } = req.body;
    const amountInCents = Math.round(amount * 100);

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ error: { message: "Invalid amount provided." } });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingDetails: JSON.stringify(bookingDetails),
                guestInfo: JSON.stringify(guestInfo),
                hotelId: hotelId
            }
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe API Error creating payment intent:", error.message);
        res.status(400).send({ error: { message: error.message || "Failed to create payment intent due to an API error." } });
    }
});

app.post('/api/update-payment-intent', async (req, res) => {
  const { clientSecret, guestInfo } = req.body;

  // The clientSecret contains the Payment Intent ID
  const paymentIntentId = clientSecret.split('_secret')[0];

  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        // We only need to update the guestInfo, the bookingDetails are already there
        guestInfo: JSON.stringify(guestInfo)
      }
    });
    res.send({ success: true });
  } catch (error) {
    console.error("Failed to update payment intent:", error.message);
    res.status(400).send({ success: false, error: { message: error.message } });
  }
});

// NEW: Create pre-authorization hold for "Reserve Now, Pay Later"
app.post('/api/create-preauth-hold', async (req, res) => {
    const { bookingDetails, guestInfo, hotelId } = req.body;
    
    const noShowFeeInCents = 100; // $1.00

    try {
        // Create a PaymentIntent with manual capture
        // This places a hold on the card without charging
        const paymentIntent = await stripe.paymentIntents.create({
            amount: noShowFeeInCents,
            currency: 'usd',
            capture_method: 'manual', // 🔑 KEY: This creates a hold instead of charging
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingDetails: JSON.stringify(bookingDetails),
                guestInfo: JSON.stringify(guestInfo),
                hotelId: hotelId,
                bookingType: 'payLater',
                noShowFeeAmount: '100',
                holdType: 'pre_authorization'
            },
            description: `Pre-authorization hold for ${bookingDetails.roomName} - ${bookingDetails.nights} nights`
        });
        
        res.send({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error("Stripe API Error creating pre-auth hold:", error.message);
        res.status(400).send({ 
            error: { message: error.message || "Failed to create pre-authorization hold." } 
        });
    }
});

// NEW: Complete pay later booking after pre-auth hold succeeds
app.post('/api/complete-pay-later-booking', async (req, res) => {
    const { paymentIntentId, guestInfo, bookingDetails, hotelId } = req.body;

    try {
        // Verify the payment intent is authorized (not captured)
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'requires_capture') {
            return res.status(400).json({ 
                success: false, 
                message: 'Pre-authorization hold not successful.' 
            });
        }

        // Create booking in PMS with "Pay at Hotel" status
        const config = await resolveHotelConfig(hotelId);

        // BookingCenter pay-later: we still save a booking (guarantee/verification handled by $1 hold on Stripe)
        if (config.pms === 'bookingcenter') {
            const pmsResponse = await createBookingCenterBooking(hotelId, bookingDetails, guestInfo);

            if (!pmsResponse.success) {
                // If booking fails, cancel the hold
                await stripe.paymentIntents.cancel(paymentIntentId);
                return res.status(400).json({
                    success: false,
                    message: pmsResponse.message || 'Failed to create reservation.'
                });
            }

            // Save to DB if possible (but don't fail booking if DB is down)
            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: 'payLater',
                        checkinDate: new Date(bookingDetails.checkin),
                        checkoutDate: new Date(bookingDetails.checkout),
                        nights: bookingDetails.nights,
                        guestFirstName: guestInfo.firstName,
                        guestLastName: guestInfo.lastName,
                        guestEmail: guestInfo.email,
                        guestPhone: guestInfo.phone,
                        subtotal: bookingDetails.subtotal,
                        taxesAndFees: bookingDetails.taxes,
                        grandTotal: bookingDetails.total,
                        amountPaidNow: 0,
                        preAuthHoldAmount: 1.00,
                        holdStatus: 'active'
                    }
                });
                notifyNewBooking([guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName).catch(() => {});
            } catch (dbError) {
                console.error("Failed to save pay-later booking to database:", dbError);
            }

            return res.json({
                success: true,
                message: 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.reservationID
            });
        }

        // Cloudbeds pay-later flow
        if (config.pms !== 'cloudbeds') {
            return res.status(400).json({ 
                success: false, 
                message: 'Pay later booking not yet supported for this hotel.' 
            });
        }

        const reservationData = {
            propertyID: config.propertyId,
            startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
            endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
            guestFirstName: guestInfo.firstName,
            guestLastName: guestInfo.lastName,
            guestCountry: 'US',
            guestZip: guestInfo.zip,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            paymentMethod: "cash", // Marked as pay at hotel
            sendEmailConfirmation: "true",
            rooms: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: 1, 
                roomRateID: bookingDetails.rateID 
            }]),
            adults: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: bookingDetails.guests 
            }]),
            children: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: 0 
            }]),
        };

        const pmsResponse = await axios.post(
            'https://api.cloudbeds.com/api/v1.3/postReservation',
            new URLSearchParams(reservationData),
            {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
                    'content-type': 'application/x-www-form-urlencoded',
                }
            }
        );

        if (pmsResponse.data.success) {
            // Save to database with retry logic for cold starts
            let dbSaveSuccess = false;
            let retries = 2; // Reduced from 3 to 2 for faster booking
            
            while (!dbSaveSuccess && retries > 0) {
                try {
                    await prisma.booking.create({
                        data: {
                            stripePaymentIntentId: paymentIntentId,
                            ourReservationCode: bookingDetails.reservationCode,
                            pmsConfirmationCode: pmsResponse.data.reservationID,
                            hotelId: hotelId,
                            roomName: bookingDetails.name || bookingDetails.roomName,
                            bookingType: 'payLater',
                            checkinDate: new Date(bookingDetails.checkin),
                            checkoutDate: new Date(bookingDetails.checkout),
                            nights: bookingDetails.nights,
                            guestFirstName: guestInfo.firstName,
                            guestLastName: guestInfo.lastName,
                            guestEmail: guestInfo.email,
                            guestPhone: guestInfo.phone,
                            subtotal: bookingDetails.subtotal,
                            taxesAndFees: bookingDetails.taxes,
                            grandTotal: bookingDetails.total,
                            amountPaidNow: 0,
                            preAuthHoldAmount: 1.00,
                            holdStatus: 'active'
                        }
                    });
                    dbSaveSuccess = true;
                    notifyNewBooking([guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName).catch(() => {});
                    console.log('✅ Booking saved to database');
                } catch (dbError) {
                    retries--;
                    if (dbError.code === 'P2002') {
                        // Unique constraint - booking already exists, that's OK
                        console.log('ℹ️ Booking already in database (duplicate prevented)');
                        dbSaveSuccess = true;
                    } else if (retries > 0) {
                        console.log(`⚠️ DB save failed, retrying... (${retries} attempts left)`);
                        await new Promise(r => setTimeout(r, 500)); // Wait 0.5 seconds before retry
                    } else {
                        console.error('❌ Failed to save to database after retries:', dbError.message);
                        // Don't fail the whole booking - Cloudbeds booking succeeded
                        // Webhook will handle saving to DB as backup
                    }
                }
            }

            res.json({
                success: true,
                message: 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.data.reservationID
            });
        } else {
            // If booking fails, cancel the hold
            await stripe.paymentIntents.cancel(paymentIntentId);

            console.error('❌ Cloudbeds reservation failed:', JSON.stringify(pmsResponse.data, null, 2));

            res.status(400).json({
                success: false,
                message: pmsResponse.data.message || 'Failed to create reservation.',
                cloudbedsError: pmsResponse.data // expose full Cloudbeds response for debugging
            });
        }

    } catch (error) {
        console.error("Error completing pay later booking:", error.response?.data || error.message);
        console.error("Full error stack:", error.stack);
        
        // Try to cancel hold if something went wrong
        try {
            await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (cancelError) {
            console.error("Failed to cancel hold:", cancelError.message);
        }
        
        // Return detailed error for debugging
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || error.message || 'Failed to complete reservation.',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// NEW: Release pre-auth hold when guest checks in
app.post('/api/release-hold', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking || booking.bookingType !== 'payLater') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid booking or not a pay-later reservation.' 
            });
        }

        if (booking.holdStatus !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Hold already released or captured.' 
            });
        }

        // Cancel the payment intent to release the hold
        await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);

        // Update booking record
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                holdStatus: 'released',
                holdReleasedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Pre-authorization hold released successfully.'
        });

    } catch (error) {
        console.error("Error releasing hold:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to release hold.' 
        });
    }
});

// NEW: Capture pre-auth hold as no-show fee
app.post('/api/capture-no-show-fee', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking || booking.bookingType !== 'payLater') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid booking or not a pay-later reservation.' 
            });
        }

        if (booking.holdStatus !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Hold already released or captured.' 
            });
        }

        // Capture the held funds
        const paymentIntent = await stripe.paymentIntents.capture(
            booking.stripePaymentIntentId,
            {
                amount_to_capture: 100 // Capture the full $1.00
            }
        );

        // Update booking record
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                holdStatus: 'captured',
                holdCapturedAt: new Date(),
                noShowFeePaid: true
            }
        });

        res.json({
            success: true,
            message: 'No-show fee of $1.00 charged successfully.',
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error("Error capturing no-show fee:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to capture no-show fee.' 
        });
    }
});



// REPLACE your entire webhook with this one:
app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('💰 Payment succeeded via webhook:', paymentIntent.id);

        try {
            // --- THIS IS THE CRUCIAL FIX ---
            // Parse metadata first so we can check by reservation code
            const metadata = paymentIntent.metadata;
            const bookingDetails = JSON.parse(metadata.bookingDetails);
            const guestInfo = JSON.parse(metadata.guestInfo);
            const hotelId = metadata.hotelId;

            // Wait for 5 seconds while keeping the DB connection alive
            console.log('Webhook is pausing for 5 seconds to allow frontend to complete...');
            for (let i = 1; i <= 5; i++) {
                await prisma.$queryRaw`SELECT 1`; // Keep connection alive
                console.log(`Webhook waiting... ${i}/5 seconds`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Now, check if the frontend already created the booking record.
            // Check by BOTH PaymentIntent ID AND reservation code to catch race conditions
            const existingBooking = await prisma.booking.findFirst({
                where: {
                    OR: [
                        { stripePaymentIntentId: paymentIntent.id },
                        { ourReservationCode: bookingDetails.reservationCode }
                    ]
                }
            });

            if (existingBooking) {
                // If the record exists, the frontend was successful. Our job is done.
                console.log('✅ Frontend call was successful. Webhook signing off. No duplicates created.');
                
                // Send push notification for new booking
                const guestName = [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null;
                const roomName = bookingDetails.roomName || bookingDetails.name;
                notifyNewBooking(guestName, roomName).catch(() => {});
                
                return res.json({ received: true });
            }

            // If no record exists, it means the frontend call failed.
            // The webhook must now create the booking as a backup.
            console.log('⚠️ Frontend booking record not found. Creating backup booking...');

            // Get hotel config for this booking
            const config = await resolveHotelConfig(hotelId);
            
            // Only process Cloudbeds hotels in webhook backup (BookingCenter will be added later)
            if (config.pms !== 'cloudbeds') {
                console.log(`⚠️ Webhook backup not yet implemented for ${config.pms}`);
                return res.json({ received: true });
            }

            // 1. Create the booking in Cloudbeds
            const reservationData = {
                propertyID: config.propertyId,
                startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
                endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
                guestFirstName: guestInfo.firstName,
                guestLastName: guestInfo.lastName,
                guestCountry: 'US',
                guestZip: guestInfo.zip,
                guestEmail: guestInfo.email,
                guestPhone: guestInfo.phone,
                paymentMethod: "cash",
                sendEmailConfirmation: "true",
                rooms: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: 1, roomRateID: bookingDetails.rateID }]),
                adults: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: bookingDetails.guests }]),
                children: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: 0 }]),
            };

            const pmsResponse = await axios.post(
                'https://api.cloudbeds.com/api/v1.3/postReservation',
                new URLSearchParams(reservationData),
                { headers: { 'accept': 'application/json', 'authorization': `Bearer ${CLOUDBEDS_API_KEY}`, 'content-type': 'application/x-www-form-urlencoded' } }
            );

            // 2. If Cloudbeds booking is successful, save the record to our database.
            if (pmsResponse.data.success) {
                console.log('✅ Backup booking created in Cloudbeds via webhook:', pmsResponse.data.reservationID);

                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntent.id,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.data.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: bookingDetails.bookingType || 'standard', // 🆕 Save booking type
                        checkinDate: new Date(bookingDetails.checkin),
                        checkoutDate: new Date(bookingDetails.checkout),
                        nights: bookingDetails.nights,
                        guestFirstName: guestInfo.firstName,
                        guestLastName: guestInfo.lastName,
                        guestEmail: guestInfo.email,
                        guestPhone: guestInfo.phone,
                        subtotal: bookingDetails.subtotal,
                        taxesAndFees: bookingDetails.taxes,
                        grandTotal: bookingDetails.total
                    }
                });
                console.log('✅ Backup booking record saved to DB by webhook.');

                // 3. Send push notification
                const guestName = [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null;
                const roomName = bookingDetails.roomName || bookingDetails.name;
                notifyNewBooking(guestName, roomName).catch(() => {});

                // 4. Fire purchase event via Meta CAPI since the webhook did the work.
                sendToMetaCAPI('Purchase', {
                    value: bookingDetails.total,
                    currency: 'USD',
                    content_name: bookingDetails.roomName || bookingDetails.name,
                    event_source_url: 'https://suitestay.clickinns.com',
                    user_data: {
                        em: guestInfo.email,
                        ph: guestInfo.phone,
                        fn: guestInfo.firstName,
                        ln: guestInfo.lastName,
                    },
                }).catch(err => console.error('Meta CAPI Purchase (webhook backup) failed:', err.message));
            }
        } catch (error) {
            // This will catch any unexpected errors during the backup process.
            console.error('❌ A critical error occurred in the webhook backup process:', error);
        }
    }

    // Always respond with 200 to Stripe to prevent retries.
    res.json({ received: true });
});


// --- API ENDPOINTS ---

// Cloudbeds availability handler
async function getCloudbedsAvailability(hotelId, checkin, checkout) {
    const config = await resolveHotelConfig(hotelId);
    const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const ratePlanType = getBestRatePlan(nights);

    const availabilityPromises = Object.entries(config.roomIDMapping).map(async ([roomName, ids]) => {
        // Support both old single roomTypeID and new roomTypeIDs array
        const isNewFormat = !!ids.rates?.nightly?.smoking;

        if (!isNewFormat) {
            // Legacy single-rate fallback (for home-place-suites etc.)
            const currentRateID = ids.rates[ratePlanType];
            const url = `https://hotels.cloudbeds.com/api/v1.2/getRatePlans?property_id=${config.propertyId}&startDate=${checkin}&endDate=${checkout}&detailedRates=true&roomTypeID=${ids.roomTypeID}`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${CLOUDBEDS_API_KEY}` }
            });
            const specificRatePlan = response.data.data.find(rate => rate.rateID === currentRateID);
            return {
                roomName,
                available: specificRatePlan ? specificRatePlan.roomsAvailable > 0 : false,
                roomsAvailable: specificRatePlan ? specificRatePlan.roomsAvailable : 0,
                rateID: currentRateID,
                roomTypeID: ids.roomTypeID
            };
        }

        // New format: fetch both smoking and non-smoking
        const smokingRateID    = ids.rates[ratePlanType].smoking;
        const nonSmokingRateID = ids.rates[ratePlanType].nonSmoking;
        const smokingTypeID    = ids.roomTypeIDs[0];
        const nonSmokingTypeID = ids.roomTypeIDs[1];

        const [smokingResp, nonSmokingResp] = await Promise.all([
            axios.get(`https://hotels.cloudbeds.com/api/v1.2/getRatePlans?property_id=${config.propertyId}&startDate=${checkin}&endDate=${checkout}&detailedRates=true&roomTypeID=${smokingTypeID}`, {
                headers: { 'Authorization': `Bearer ${CLOUDBEDS_API_KEY}` }
            }),
            axios.get(`https://hotels.cloudbeds.com/api/v1.2/getRatePlans?property_id=${config.propertyId}&startDate=${checkin}&endDate=${checkout}&detailedRates=true&roomTypeID=${nonSmokingTypeID}`, {
                headers: { 'Authorization': `Bearer ${CLOUDBEDS_API_KEY}` }
            })
        ]);

        const smokingPlan    = smokingResp.data.data?.find(r => r.rateID === smokingRateID);
        const nonSmokingPlan = nonSmokingResp.data.data?.find(r => r.rateID === nonSmokingRateID);

        const smokingAvail    = smokingPlan?.roomsAvailable ?? 0;
        const nonSmokingAvail = nonSmokingPlan?.roomsAvailable ?? 0;
        const totalAvail      = smokingAvail + nonSmokingAvail;

        // Prefer non-smoking; fall back to smoking if non-smoking is 0
        const preferredRateID     = nonSmokingAvail > 0 ? nonSmokingRateID : smokingRateID;
        const preferredRoomTypeID = nonSmokingAvail > 0 ? nonSmokingTypeID : smokingTypeID;

        return {
            roomName,
            available: totalAvail > 0,
            roomsAvailable: totalAvail,
            rateID: preferredRateID,
            roomTypeID: preferredRoomTypeID
        };
    });

    const availableRooms = await Promise.all(availabilityPromises);
    console.log('🟦 Cloudbeds availability response', { hotelId, checkin, checkout, ratePlanType, availableRooms });
    return availableRooms.filter(room => room.available);
}

// -------------------------
// BookingCenter SOAP helpers
// -------------------------
const bcXmlParser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    attrkey: '$',
    charkey: '_',
    tagNameProcessors: [xml2js.processors.stripPrefix],
});

async function parseBcXml(xml) {
    return bcXmlParser.parseStringPromise(xml);
}

const BOOKINGCENTER_DEBUG_SOAP = (process.env.BOOKINGCENTER_DEBUG_SOAP || '').toLowerCase() === 'true';

function maskBookingCenterSecrets(xml) {
    if (!xml || typeof xml !== 'string') return xml;
    // Mask MessagePassword="..." in RequestorID blocks
    return xml.replace(/MessagePassword=\"[^\"]*\"/g, 'MessagePassword="***"');
}

function bcDebugLog(label, payload) {
    if (!BOOKINGCENTER_DEBUG_SOAP) return;
    console.log(`\n[BOOKINGCENTER_DEBUG] ${label}\n${maskBookingCenterSecrets(payload)}\n`);
}

async function postSoap(url, soapAction, xmlBody, { soap12 = false } = {}) {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const headers = {
            'Accept': 'text/xml, application/xml, text/plain, */*',
            // Avoid compressed/chunked transfer issues behind Cloudflare
            'Accept-Encoding': 'identity',
            'Content-Length': Buffer.byteLength(xmlBody, 'latin1'),
            'User-Agent': 'NuSOAP/0.9.17 (1.123)',
            'Connection': 'close',
        };

        if (soap12) {
            // SOAP 1.2: action is a parameter on Content-Type and SOAPAction is typically omitted
            headers['Content-Type'] = `application/soap+xml; charset=ISO-8859-1; action="${soapAction}"`;
        } else {
            // SOAP 1.1
            headers['Content-Type'] = 'text/xml; charset=ISO-8859-1';
            headers['SOAPAction'] = `"${soapAction}"`;
        }

        const req = lib.request(url, {
            method: 'POST',
            headers,
        }, (res) => {
            let data = '';
            res.setEncoding('latin1');
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data,
                });
            });
        });

        req.on('error', reject);
        req.write(xmlBody, 'latin1');
        req.end();
    });
}

function bcSoapEnvelope(innerXml) {
    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    ${innerXml}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function bcWrapMessagePart(methodName, tns, otaPayloadXml) {
    // NuSOAP often expects the typed payload element directly under the operation element.
    // Using a generic <messagePart> wrapper can cause the server to ignore the nested OTA payload.
    return `<${methodName} xmlns="${tns}">${otaPayloadXml}</${methodName}>`;
}

function bcTimestamp() {
    // BookingCenter examples use offsets like 2026-01-28T13:34:03-0800
    // Using ISO is usually accepted by SOAP servers; if not, we can format later.
    return new Date().toISOString();
}

function buildBcAvailRQ({ checkin, checkout, adults = 1, rooms = 1, siteId = BOOKINGCENTER_TEST_SITE_ID, sitePassword = BOOKINGCENTER_TEST_PASSWORD, chainCode = BOOKINGCENTER_TEST_CHAIN_CODE }) {
    const echoToken = Date.now().toString();

    // NOTE: In your captured example, Count="0" caused "Invalid Number of Guests".
    const safeAdults = Math.max(1, Number(adults) || 1);
    const safeRooms = Math.max(1, Number(rooms) || 1);

    return bcSoapEnvelope(
        `<OTA_HotelAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05">
  <parameters EchoToken="${echoToken}" TimeStamp="${bcTimestamp()}" Target="Production" Version="1.001">
    <POS>
      <Source ISOCurrency="USD"/>
      <RequestorID OTA_CodeType="10" ID="${siteId}" MessagePassword="${sitePassword}"/>
    </POS>
    <AvailRequestSegments>
      <AvailRequestSegment>
        <StayDateRange Start="${checkin}" End="${checkout}"/>
        <RoomStayCandidates>
          <RoomStayCandidate RoomTypeCode="" Quantity="${safeRooms}">
            <GuestCounts IsPerRoom="false">
              <GuestCount AgeQualifyingCode="10" Count="${safeAdults}"/>
            </GuestCounts>
          </RoomStayCandidate>
        </RoomStayCandidates>
        <HotelSearchCriteria>
          <Criterion>
            <HotelRef ChainCode="${chainCode}" HotelCode="${siteId}" AgentCode=""/>
          </Criterion>
        </HotelSearchCriteria>
      </AvailRequestSegment>
    </AvailRequestSegments>
  </parameters>
</OTA_HotelAvailRQ>`
    );
}

function buildBcHotelResRQ({
    checkin,
    checkout,
    roomTypeCode,
    ratePlanCode,
    guestInfo,
    guests = 1,
    // BookingCenter auth
    siteId = BOOKINGCENTER_TEST_SITE_ID,
    sitePassword = BOOKINGCENTER_TEST_PASSWORD,
    chainCode = BOOKINGCENTER_TEST_CHAIN_CODE,
    // Deposit/guarantee metadata (kept for backwards compat but not used in Jason's structure)
    depositAmount = 0,
}) {
    // MATCHING JASON'S SUCCESSFUL PRODUCTION XML
    // No <HotelResIn> wrapper. Direct OTA_HotelResRQ.
    // Key differences from old code:
    // 1. NO wrapper element - OTA_HotelResRQ goes directly in SOAP Body
    // 2. Uses <PaymentTransactionTypeCode>Account</PaymentTransactionTypeCode> (not Capture)
    // 3. No PaymentCard block
    // 4. Added AgentCode="BC" to BasicPropertyInfo
    
    const safeGuests = Math.max(1, Number(guests) || 1);
    const firstName = guestInfo.firstName || 'Guest';
    const lastName = guestInfo.lastName || 'Guest';

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <soap:Body>
        <OTA_HotelResRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.001">
            <parameters Target="Production">
                <POS>
                    <Source ISOCurrency="USD" />
                    <RequestorID OTA_CodeType="10" ID="${siteId}" MessagePassword="${sitePassword}" />
                </POS>
                <HotelReservations>
                    <HotelReservation>
                        <RoomStays>
                            <RoomStay>
                                <RoomTypes>
                                    <RoomType RoomTypeCode="${roomTypeCode}" NumberOfUnits="1" />
                                </RoomTypes>
                                <RatePlans>
                                    <RatePlan RatePlanCode="${ratePlanCode}" />
                                </RatePlans>
                                <GuestCounts>
                                    <GuestCount AgeQualifyingCode="10" Count="${safeGuests}" />
                                </GuestCounts>
                                <TimeSpan Start="${checkin}" End="${checkout}" />
                                <Guarantee>
                                    <GuaranteesAccepted>
                                        <GuaranteeAccepted>
                                            <PaymentTransactionTypeCode>Account</PaymentTransactionTypeCode>
                                        </GuaranteeAccepted>
                                    </GuaranteesAccepted>
                                </Guarantee>
                                <PaymentPolicies>
                                    <GuaranteePayment>
                                        <AmountPercent Amount="${depositAmount}" TaxInclusive="N" BasisType="No Deposit" />
                                    </GuaranteePayment>
                                </PaymentPolicies>
                                <BasicPropertyInfo ChainCode="${chainCode}" HotelCode="${siteId}" AgentCode="BC" />
                                <Comments>
                                    <Comment>
                                        <Text>Booking via Click Inns</Text>
                                    </Comment>
                                </Comments>
                            </RoomStay>
                        </RoomStays>
                        <ResGuests>
                            <ResGuest>
                                <Profiles>
                                    <ProfileInfo>
                                        <Profile ProfileType="1">
                                            <Customer>
                                                <PersonName>
                                                    <GivenName>${firstName}</GivenName>
                                                    <Surname>${lastName}</Surname>
                                                </PersonName>
                                                ${guestInfo.phone ? `<Telephone PhoneNumber="${guestInfo.phone}" PhoneTechType="1" />` : ''}
                                                ${guestInfo.email ? `<Email>${guestInfo.email}</Email>` : ''}
                                            </Customer>
                                        </Profile>
                                    </ProfileInfo>
                                </Profiles>
                            </ResGuest>
                        </ResGuests>
                    </HotelReservation>
                </HotelReservations>
            </parameters>
        </OTA_HotelResRQ>
    </soap:Body>
</soap:Envelope>`;
}

function extractBcErrors(otaResponse) {
    const errors = otaResponse?.parameters?.Errors?.Error;
    if (!errors) return null;
    const list = Array.isArray(errors) ? errors : [errors];
    return list.map(e => ({
        type: e?.$?.Type,
        code: e?.$?.Code,
        shortText: e?.$?.ShortText,
    }));
}

// BookingCenter availability handler (SOAP/XML)
async function getBookingCenterAvailability(hotelId, checkin, checkout) {
    const config = await resolveHotelConfig(hotelId);
    if (!config.siteId || !config.sitePassword) {
        throw new Error(`Missing BookingCenter siteId/sitePassword for hotelId=${hotelId}`);
    }

    if (BOOKINGCENTER_DEBUG_SOAP) {
        const siteIdStr = String(config.siteId ?? '');
        const pwStr = String(config.sitePassword ?? '');
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail creds siteId='[${siteIdStr}]' len=${siteIdStr.length} passwordLen=${pwStr.length} hasIdWhitespace=${/\s/.test(siteIdStr)} hasPwWhitespace=${/\s/.test(pwStr)}`);
    }

    const xml = buildBcAvailRQ({
        checkin,
        checkout,
        adults: 1,
        rooms: 1,
        siteId: config.siteId,
        sitePassword: config.sitePassword,
        chainCode: config.chainCode,
    });

    bcDebugLog('HotelAvailRQ (request)', xml);

    if (BOOKINGCENTER_DEBUG_SOAP) {
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail endpoint=${BOOKINGCENTER_ENDPOINTS.availability} SOAPAction=www.bookingcenter.com/xml:HotelAvailIn`);
    }

    const response = await postSoap(
        BOOKINGCENTER_ENDPOINTS.availability,
        'www.bookingcenter.com/xml:HotelAvailIn',
        xml
    );

    if (BOOKINGCENTER_DEBUG_SOAP) {
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail HTTP status=${response.status} content-type=${response.headers?.['content-type']} content-length=${response.headers?.['content-length']}`);
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail response length=${(response.data && response.data.length) || 0}`);
    }

    bcDebugLog('HotelAvailRS (response)', response.data);

    const parsed = await parseBcXml(response.data);
    const body = parsed?.Envelope?.Body;
    const ota = body?.OTA_HotelAvailRS;

    const errors = extractBcErrors(ota);
    if (errors) {
        console.error('BookingCenter availability errors:', errors);
        return [];
    }

    const roomStays = ota?.parameters?.RoomStays?.RoomStay || ota?.RoomStays?.RoomStay;
    if (!roomStays) return [];

    const stays = Array.isArray(roomStays) ? roomStays : [roomStays];

    return stays.map((stay) => {
        const ratePlan = stay?.RatePlans?.RatePlan;
        const roomType = stay?.RoomTypes?.RoomType;
        const roomRate = stay?.RoomRates?.RoomRate;
        const rate = roomRate?.Rates?.Rate;
        const base = rate?.Base?.$;

        const roomTypeCode = roomType?.$?.RoomTypeCode;
        const availableQty = Number(roomType?.$?.NumberOfUnits ?? 0) || 0;
        const ratePlanCode = ratePlan?.$?.RatePlanCode;

        // Room name comes from RoomTypeName/Text
        const roomName = roomType?.RoomTypeName?.Text?._ || roomType?.RoomTypeName?.Text || roomTypeCode || 'Room';

        // Optional pricing if you ever want it
        const amountBeforeTax = base?.AmountBeforeTax ? Number(base.AmountBeforeTax) : null;
        const amountAfterTax = base?.AmountAfterTax ? Number(base.AmountAfterTax) : null;

        return {
            roomName,
            available: availableQty > 0,
            roomsAvailable: availableQty,
            // For BookingCenter, treat rateID as RatePlanCode and roomTypeID as RoomTypeCode
            rateID: ratePlanCode,
            roomTypeID: roomTypeCode,
            // helpful extra fields (non-breaking)
            _bc: {
                currency: base?.CurrencyCode,
                amountBeforeTax,
                amountAfterTax,
                paymentCode: rate?.PaymentPolicy?.GuaranteePayment?.$?.PaymentCode,
            }
        };
    }).filter(r => r.available && r.rateID && r.roomTypeID);
}

app.post('/api/availability', async (req, res) => {
    const { hotelId, checkin, checkout } = req.body;
    
    try {
        const config = await resolveHotelConfig(hotelId);
        let availableRooms;

        if (config.pms === 'cloudbeds') {
            availableRooms = await getCloudbedsAvailability(hotelId, checkin, checkout);
        } else if (config.pms === 'bookingcenter') {
            availableRooms = await getBookingCenterAvailability(hotelId, checkin, checkout);
        } else if (config.pms === 'manual') {
            availableRooms = await getManualAvailability(hotelId, checkin, checkout);
        } else {
            return res.status(400).json({ success: false, message: `Unknown PMS type: ${config.pms}` });
        }

        res.json({ success: true, data: availableRooms });

    } catch (error) {
        console.error("Error fetching availability:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
    }
});

// Cloudbeds booking handler
async function createCloudbedsBooking(hotelId, bookingDetails, guestInfo) {
    const config = await resolveHotelConfig(hotelId);
    const isTrial = bookingDetails.bookingType === 'trial';
    let rateIDToUse = bookingDetails.rateID;

    if (isTrial && bookingDetails.useNightlyRate) {
        const roomMapping = Object.entries(config.roomIDMapping).find(
            ([name, ids]) => ids.roomTypeID === bookingDetails.roomTypeID
        );
        
        if (roomMapping) {
            rateIDToUse = roomMapping[1].rates.nightly;
            console.log(`✅ Trial booking - switching to nightly rate: ${rateIDToUse}`);
        }
    }

    const reservationData = {
        propertyID: config.propertyId,
        startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
        endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
        guestFirstName: guestInfo.firstName,
        guestLastName: guestInfo.lastName,
        guestCountry: 'US',
        guestZip: guestInfo.zip,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        paymentMethod: "cash",
        sendEmailConfirmation: "true",
        rooms: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: 1, 
            roomRateID: rateIDToUse  
        }]),
        adults: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: bookingDetails.guests 
        }]),
        children: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: 0 
        }]),
    };

    const pmsResponse = await axios.post('https://api.cloudbeds.com/api/v1.3/postReservation', new URLSearchParams(reservationData), {
        headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
            'content-type': 'application/x-www-form-urlencoded',
        }
    });

    return pmsResponse.data;
}

// BookingCenter booking handler (SOAP/XML)
async function createBookingCenterBooking(hotelId, bookingDetails, guestInfo) {
    // bookingDetails.roomTypeID and bookingDetails.rateID come from frontend selection
    // For BookingCenter these should be RoomTypeCode and RatePlanCode respectively.
    const roomTypeCode = bookingDetails.roomTypeID;
    const initialRatePlanCode = bookingDetails.rateID;

    if (!roomTypeCode || !initialRatePlanCode) {
        return { success: false, message: 'Missing BookingCenter roomTypeCode or ratePlanCode.' };
    }

    // BookingCenter (per Jason): include PaymentCard with a receipt type code (e.g. TERM/PP/TRANS)
    // and leave card fields blank for externally handled payments.
    const isReserve = (bookingDetails.bookingType === 'payLater' || bookingDetails.bookingType === 'reserve' || bookingDetails.planType === 'reserve');
    // Jason: don't use CASH.
    const receiptType = isReserve ? 'TERM' : 'PP';

    const config = await resolveHotelConfig(hotelId);
    if (!config.siteId || !config.sitePassword) {
        return { success: false, message: `Missing BookingCenter siteId/sitePassword for hotelId=${hotelId}` };
    }

    const checkin = new Date(bookingDetails.checkin).toISOString().split('T')[0];
    const checkout = new Date(bookingDetails.checkout).toISOString().split('T')[0];

    const attempt = async (ratePlanCode) => {
        if (BOOKINGCENTER_DEBUG_SOAP) {
            const siteIdStr = String(config.siteId ?? '');
            const pwStr = String(config.sitePassword ?? '');
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes creds siteId='[${siteIdStr}]' len=${siteIdStr.length} passwordLen=${pwStr.length} hasIdWhitespace=${/\s/.test(siteIdStr)} hasPwWhitespace=${/\s/.test(pwStr)}`);
        }

        const xml = buildBcHotelResRQ({
            checkin,
            checkout,
            roomTypeCode,
            ratePlanCode,
            guestInfo,
            guests: bookingDetails.guests,
            siteId: config.siteId,
            sitePassword: config.sitePassword,
            chainCode: config.chainCode,
            depositAmount: 0,
            paymentTransactionTypeCode: 'Capture',
            receiptType,
        });

        bcDebugLog('HotelResRQ (request)', xml);

        if (BOOKINGCENTER_DEBUG_SOAP) {
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes endpoint=${BOOKINGCENTER_ENDPOINTS.booking} SOAPAction=www.bookingcenter.com/xml:HotelResIn`);
        }

        const response = await postSoap(
            BOOKINGCENTER_ENDPOINTS.booking,
            'www.bookingcenter.com/xml:HotelResIn',
            xml,
            { soap12: false }
        );

        if (BOOKINGCENTER_DEBUG_SOAP) {
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes HTTP status=${response.status} content-type=${response.headers?.['content-type']} content-length=${response.headers?.['content-length']}`);
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes headers=${JSON.stringify(response.headers || {})}`);
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes response length=${(response.data && response.data.length) || 0}`);
        }

        bcDebugLog('HotelResRS (response)', response.data);

        if (response.status >= 400) {
            return { success: false, errors: [{ shortText: `HTTP ${response.status} from BookingCenter booking endpoint` }], raw: response.data };
        }

        const parsed = await parseBcXml(response.data);
        const body = parsed?.Envelope?.Body;
        const ota = body?.OTA_HotelResRS;

        const errors = extractBcErrors(ota);
        if (errors) {
            return { success: false, errors, raw: ota };
        }

        // Response may have HotelReservations directly under ota OR under ota.parameters
        const hotelReservation = 
            ota?.parameters?.HotelReservations?.HotelReservation ||
            ota?.HotelReservations?.HotelReservation;
        
        const reservationId =
            hotelReservation?.UniqueID?.$?.ID ||
            hotelReservation?.UniqueID?.$?.ID_Context ||
            hotelReservation?.ResGlobalInfo?.HotelReservationIDs?.HotelReservationID?.$?.ResID_Value ||
            hotelReservation?.ResGlobalInfo?.HotelReservationIDs?.HotelReservationID?.$?.ResID_Source ||
            null;

        // IMPORTANT: Don't treat the booking as successful unless BookingCenter returns a real confirmation ID.
        // Otherwise the frontend can show a success page even though nothing was created in the PMS.
        if (!reservationId) {
            return {
                success: false,
                message: 'BookingCenter did not return a reservation ID (confirmation).',
                raw: ota,
            };
        }

        return {
            success: true,
            reservationID: reservationId,
            message: 'Reservation created successfully.',
            raw: ota,
        };
    };

    // Attempt with the requested rate plan first
    let result = await attempt(initialRatePlanCode);
    if (result.success) return result;

    const errorText = (result.errors || []).map(e => e.shortText).join(' | ');
    const isAvailabilityError = /Not enough Availability/i.test(errorText);

    // If rate plan is rejected due to availability, retry with an alternate rate plan for the same room type.
    if (isAvailabilityError) {
        try {
            const available = await getBookingCenterAvailability(hotelId, checkin, checkout);
            const alternatives = available.filter(r => r.roomTypeID === roomTypeCode && r.rateID && r.rateID !== initialRatePlanCode);

            // Prefer a non-weekly rate plan if the weekly one is failing
            const preferred = alternatives.find(r => !(r.rateID || '').includes('WK')) || alternatives[0];

            if (preferred?.rateID) {
                console.log(`BookingCenter retry: ${initialRatePlanCode} failed, retrying with ${preferred.rateID} for RoomType ${roomTypeCode}`);
                const retryResult = await attempt(preferred.rateID);
                if (retryResult.success) return retryResult;

                const retryErrText = (retryResult.errors || []).map(e => e.shortText).join(' | ');
                console.error('BookingCenter booking retry errors:', retryErrText);
                return {
                    success: false,
                    message: retryErrText || errorText || 'BookingCenter booking failed',
                    errors: retryResult.errors || result.errors,
                };
            }
        } catch (e) {
            console.error('BookingCenter retry availability lookup failed:', e.message);
        }
    }

    console.error('BookingCenter booking errors:', result.errors);
    return {
        success: false,
        message: errorText || 'BookingCenter booking failed',
        errors: result.errors,
    };
}

app.post('/api/book', async (req, res) => {
    const { hotelId, bookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (!bookingDetails.rateID) {
        return res.status(400).json({ success: false, message: 'Invalid room name provided.' });
    }

    try {
        const config = await resolveHotelConfig(hotelId);
        let pmsResponse;

        if (config.pms === 'cloudbeds') {
            pmsResponse = await createCloudbedsBooking(hotelId, bookingDetails, guestInfo);
        } else if (config.pms === 'bookingcenter') {
            pmsResponse = await createBookingCenterBooking(hotelId, bookingDetails, guestInfo);
        } else if (config.pms === 'manual') {
            pmsResponse = await createManualBooking(hotelId, bookingDetails);
        } else {
            return res.status(400).json({ success: false, message: `Unknown PMS type: ${config.pms}` });
        }

        if (pmsResponse.success) {
            // Save to database
            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: bookingDetails.bookingType || 'standard',
                        checkinDate: new Date(bookingDetails.checkin),
                        checkoutDate: new Date(bookingDetails.checkout),
                        nights: bookingDetails.nights,
                        guestFirstName: guestInfo.firstName,
                        guestLastName: guestInfo.lastName,
                        guestEmail: guestInfo.email,
                        guestPhone: guestInfo.phone,
                        subtotal: bookingDetails.subtotal,
                        taxesAndFees: bookingDetails.taxes,
                        grandTotal: bookingDetails.total
                    }
                });
                notifyNewBooking([guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName).catch(() => {});
            } catch (dbError) {
                console.error("Failed to save to database:", dbError);
            }
        }
        
        res.json({
            success: pmsResponse.success,
            message: pmsResponse.success ? 'Reservation created successfully.' : pmsResponse.message,
            reservationCode: pmsResponse.reservationID,
            pmsResponse: pmsResponse
        });

    } catch (error) {
        console.error("Error creating reservation:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to create reservation.' });
    }
});


// Browser diagnostics endpoint — logs in-app browser details
app.post('/api/browser-diagnostics', (req, res) => {
    const d = req.body;
    console.log('\n========== BROWSER DIAGNOSTICS ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('--- User Agent ---');
    console.log(d.userAgent);
    console.log('--- Viewport ---');
    console.log(`window.innerWidth: ${d.innerWidth}`);
    console.log(`window.innerHeight: ${d.innerHeight}`);
    console.log(`document.documentElement.clientWidth: ${d.clientWidth}`);
    console.log(`document.documentElement.clientHeight: ${d.clientHeight}`);
    console.log(`screen.width: ${d.screenWidth}`);
    console.log(`screen.height: ${d.screenHeight}`);
    console.log(`screen.availWidth: ${d.screenAvailWidth}`);
    console.log(`screen.availHeight: ${d.screenAvailHeight}`);
    console.log(`devicePixelRatio: ${d.devicePixelRatio}`);
    console.log(`visualViewport.width: ${d.visualViewportWidth}`);
    console.log(`visualViewport.height: ${d.visualViewportHeight}`);
    console.log(`visualViewport.offsetTop: ${d.visualViewportOffsetTop}`);
    console.log('--- Computed Values ---');
    console.log(`--real-vh: ${d.realVh}`);
    console.log(`1vh in px: ${d.oneVhPx}`);
    console.log(`Height diff (screen - innerHeight): ${d.heightDiff}px`);
    console.log('--- Detection ---');
    console.log(`Classes on <html>: ${d.htmlClasses}`);
    console.log(`FBAV version: ${d.fbavVersion}`);
    console.log(`Is FB browser: ${d.isFbBrowser}`);
    console.log(`Is Business Suite: ${d.isBusinessSuite}`);
    console.log('--- Safe Areas ---');
    console.log(`safe-area-inset-top: ${d.safeAreaTop}`);
    console.log(`safe-area-inset-bottom: ${d.safeAreaBottom}`);
    console.log('==========================================\n');
    res.json({ success: true });
});

app.post('/api/track', async (req, res) => {
    let body;
    try {
        body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body;
    } catch (e) {
        console.error("Failed to parse tracking request body:", req.body);
        return res.status(400).json({ success: false, message: "Invalid request format." });
    }

    if (!body || Object.keys(body).length === 0) {
        return res.status(200).send({ success: true, message: "Empty track request ignored." });
    }

    const { event_name, ...eventData } = body;

    if (!FUNNEL_EVENTS.includes(event_name)) {
        const errorMessage = `Received track request for unknown event: '${event_name}'`;
        console.error(errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
    }

    // Add event_time as Unix timestamp (required for accurate Meta tracking)
    const enrichedPayload = {
        ...eventData,
        event_time: Math.floor(Date.now() / 1000),
        client_ip_address: req.ip,
        user_agent: req.headers['user-agent']
    };

    // Persist guests who reach the AddPaymentInfo step so front desk can call them
    if (event_name === 'AddPaymentInfo') {
        try {
            const user = enrichedPayload.user_data || {};
            const hotelId = process.env.HOTEL_ID || 'guest-lodge-minot';
            const checkinDate = enrichedPayload.checkin_date || '';
            const checkoutDate = enrichedPayload.checkout_date || '';
            const nights = parseInt(enrichedPayload.nights, 10) || 0;
            const total = parseFloat(enrichedPayload.value) || 0;

            await withRetry(() => prisma.hitPayment.create({
                data: {
                    hotelId,
                    guestFirstName: user.fn || '-',
                    guestLastName: user.ln || '-',
                    guestEmail: user.em || '-',
                    guestPhone: user.ph || '',
                    roomName: enrichedPayload.content_name || 'Room',
                    checkinDate,
                    checkoutDate,
                    nights,
                    grandTotal: total,
                    eventName: event_name,
                    eventId: enrichedPayload.event_id || null,
                }
            }));
        } catch (e) {
            console.error('Failed to save HitPayment lead:', e.message);
        }
    }

    // Store in funnel dashboard (in-memory)
    pushFunnelEvent(event_name, enrichedPayload);
    if (event_name === 'Purchase') notifyPurchase().catch(() => {});

    // Send directly to Meta CAPI — no middleman needed
    sendToMetaCAPI(event_name, enrichedPayload).catch(err => {
        console.error(`Meta CAPI background send failed for ${event_name}:`, err.message);
    });

    res.status(200).json({ success: true, message: 'Event tracked.' });
});

// --- Payment declined leads (for front desk to call) ---
app.post('/api/payment-declined', async (req, res) => {
    try {
        const { guestInfo, bookingDetails, errorCode, errorDeclineCode, errorMessage, hotelId, paymentMethod } = req.body;
        if (!guestInfo?.firstName || !guestInfo?.lastName || !guestInfo?.email || !guestInfo?.phone) {
            return res.status(400).json({ success: false, message: 'Missing guest info' });
        }
        if (!bookingDetails?.roomName || !bookingDetails?.checkin || !bookingDetails?.checkout || !bookingDetails?.total) {
            return res.status(400).json({ success: false, message: 'Missing booking details' });
        }
        const checkinStr = typeof bookingDetails.checkin === 'string' ? bookingDetails.checkin.split('T')[0] : '';
        const checkoutStr = typeof bookingDetails.checkout === 'string' ? bookingDetails.checkout.split('T')[0] : '';
        await withRetry(() => prisma.paymentDeclinedLead.create({
            data: {
                hotelId: hotelId || 'suite-stay',
                guestFirstName: guestInfo.firstName,
                guestLastName: guestInfo.lastName,
                guestEmail: guestInfo.email,
                guestPhone: guestInfo.phone,
                roomName: bookingDetails.roomName || 'Room',
                checkinDate: checkinStr,
                checkoutDate: checkoutStr,
                nights: parseInt(bookingDetails.nights, 10) || 0,
                grandTotal: parseFloat(bookingDetails.total) || 0,
                errorCode: errorCode || null,
                errorDeclineCode: errorDeclineCode || null,
                errorMessage: errorMessage || null,
                paymentMethod: paymentMethod || 'card',
            },
        }));
        
        // Send urgent push notification for payment decline
        notifyPaymentDeclined(guestInfo, bookingDetails, errorMessage).catch((err) => {
            console.error('Failed to send payment declined notification:', err.message);
        });
        
        res.status(200).json({ success: true });
    } catch (e) {
        console.error('Payment declined lead save error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- Health check (for uptime monitors; keeps Render awake + warms DB) ---
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ ok: true, db: 'connected' });
    } catch (e) {
        res.status(503).json({ ok: false, db: 'error', message: e.message });
    }
});

// --- Front Desk CRM ---
const CRM_PASSWORD = process.env.CRM_PASSWORD || '';
const CRM_PASSWORD_ALT = process.env.CRM_PASSWORD_ALT || '2026';
const DEFAULT_CRM_HOTEL_ID = (process.env.HOTEL_ID || 'guest-lodge-minot').trim();
const CRM_TOKEN_HOTELS_JSON = process.env.CRM_TOKEN_HOTELS || process.env.CRM_PIN_HOTEL_MAP || '';
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || process.env.CRM_ADMIN_TOKEN || '').trim();

function toHotelList(value) {
    if (Array.isArray(value)) {
        return value.map(v => String(v || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        return trimmed.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

function buildCrmTokenHotelMap() {
    const map = {};

    if (CRM_TOKEN_HOTELS_JSON) {
        try {
            const parsed = JSON.parse(CRM_TOKEN_HOTELS_JSON);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                for (const [token, hotels] of Object.entries(parsed)) {
                    const cleanToken = String(token || '').trim();
                    if (!cleanToken) continue;
                    const list = toHotelList(hotels);
                    if (list.length) map[cleanToken] = list;
                }
            }
        } catch (e) {
            console.error('Invalid CRM_TOKEN_HOTELS/CRM_PIN_HOTEL_MAP JSON. Falling back to legacy PIN config.');
        }
    }

    // Backward compatible fallback: existing PINs scoped to one default hotel.
    if (!Object.keys(map).length) {
        const fallbackPins = [CRM_PASSWORD, CRM_PASSWORD_ALT].map(v => String(v || '').trim()).filter(Boolean);
        for (const pin of fallbackPins) {
            map[pin] = [DEFAULT_CRM_HOTEL_ID];
        }
    }

    return map;
}

const CRM_TOKEN_HOTELS_MAP = buildCrmTokenHotelMap();

function hashCrmPin(pin) {
    return crypto.createHash('sha256').update(String(pin || '').trim()).digest('hex');
}

async function getDbAllowedHotelsForToken(token) {
    if (!token || !prisma.crmPin) return [];
    const pinHash = hashCrmPin(token);
    const rows = await withRetry(() => prisma.crmPin.findMany({
        where: { pinHash, active: true, hotel: { active: true } },
        select: { hotelId: true },
    }));
    return [...new Set(rows.map(r => String(r.hotelId || '').trim()).filter(Boolean))];
}

function getRequestedCrmHotelId(req) {
    const queryHotel = String(req.query?.hotelId || '').trim();
    const bodyHotel = String(req.body?.hotelId || '').trim();
    return queryHotel || bodyHotel || req.crmDefaultHotelId || DEFAULT_CRM_HOTEL_ID;
}

function resolveScopedHotelId(req, { allowFallback = true } = {}) {
    const requested = getRequestedCrmHotelId(req);
    const allowed = Array.isArray(req.crmAllowedHotels) ? req.crmAllowedHotels : [];
    if (!allowed.length) return null;
    if (requested && allowed.includes(requested)) return requested;
    return allowFallback ? allowed[0] : null;
}

function requireScopedHotelId(req, res) {
    const requested = getRequestedCrmHotelId(req);
    const hotelId = resolveScopedHotelId(req, { allowFallback: false });
    if (hotelId) return hotelId;
    res.status(403).json({
        success: false,
        message: requested
            ? `Unauthorized hotel context: ${requested}`
            : 'Missing authorized hotel context.',
    });
    return null;
}

function getAllowedHotelFilter(req) {
    const allowed = Array.isArray(req.crmAllowedHotels) ? req.crmAllowedHotels : [];
    return { in: allowed.length ? allowed : [DEFAULT_CRM_HOTEL_ID] };
}

const crmAuth = async (req, res, next) => {
    const token = (req.headers['x-crm-token'] || req.query.token || '').toString().trim();
    const dbAllowedHotels = await getDbAllowedHotelsForToken(token).catch(() => []);
    const allowedHotels = dbAllowedHotels.length ? dbAllowedHotels : (CRM_TOKEN_HOTELS_MAP[token] || []);
    if (!token || !allowedHotels?.length) return res.status(401).json({ error: 'Unauthorized' });
    req.crmToken = token;
    req.crmAllowedHotels = allowedHotels;
    req.crmDefaultHotelId = allowedHotels[0];
    next();
};

const adminAuth = (req, res, next) => {
    if (!ADMIN_TOKEN) {
        return res.status(503).json({ success: false, message: 'Admin API is disabled. Set ADMIN_TOKEN.' });
    }
    const token = String(req.headers['x-admin-token'] || '').trim();
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

function normalizePmsType(value) {
    const pms = String(value || '').trim().toLowerCase();
    if (!['manual', 'cloudbeds', 'bookingcenter'].includes(pms)) {
        throw new Error(`Invalid PMS type: ${value}`);
    }
    return pms;
}

function normalizeDomain(value) {
    return String(value || '').trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
}

function normalizeDomainList(domains = [], primaryDomain = '') {
    const out = new Set();
    for (const d of domains) {
        const clean = normalizeDomain(d);
        if (clean) out.add(clean);
    }
    const primary = normalizeDomain(primaryDomain);
    if (primary) out.add(primary);
    return { list: [...out], primary };
}

function sanitizeConfigForResponse(cfg) {
    if (!cfg) return null;
    return {
        id: cfg.id,
        name: cfg.name || cfg.id,
        pms: cfg.pms,
        propertyId: cfg.propertyId || null,
        siteId: cfg.siteId || null,
        chainCode: cfg.chainCode || null,
        roomIDMapping: cfg.roomIDMapping || {},
        source: cfg.source || 'unknown',
    };
}

async function resolveHotelIdFromDomain(domain) {
    const clean = normalizeDomain(domain);
    if (!clean || !prisma.hotelDomain) return null;
    const row = await withRetry(() => prisma.hotelDomain.findUnique({
        where: { domain: clean },
        select: { hotelId: true, hotel: { select: { active: true } } },
    }));
    if (!row || !row.hotel?.active) return null;
    return row.hotelId;
}

app.get('/api/hotel-context', async (req, res) => {
    try {
        const explicitHotelId = String(req.query.hotelId || '').trim();
        const requestedDomain =
            String(req.query.domain || '').trim() ||
            String((req.headers['x-forwarded-host'] || '').split(',')[0] || '').trim() ||
            String(req.hostname || '').trim();

        let hotelId = explicitHotelId;
        if (!hotelId) {
            hotelId = await resolveHotelIdFromDomain(requestedDomain);
        }
        if (!hotelId) hotelId = DEFAULT_CRM_HOTEL_ID;

        const config = await resolveHotelConfig(hotelId);
        const manualRooms = (config.pms === 'manual' && prisma.manualRoom)
            ? await withRetry(() => prisma.manualRoom.findMany({
                where: { hotelId },
                orderBy: { name: 'asc' },
                select: { name: true, totalUnits: true },
            }))
            : [];

        res.json({
            success: true,
            data: {
                hotelId,
                domain: normalizeDomain(requestedDomain),
                config: sanitizeConfigForResponse(config),
                manualRooms,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/admin/hotels', adminAuth, async (req, res) => {
    try {
        if (!prisma.hotelConfig) {
            return res.status(503).json({ success: false, message: 'HotelConfig model unavailable. Run Prisma migrate/generate.' });
        }

        const hotels = await withRetry(() => prisma.hotelConfig.findMany({
            include: {
                domains: { orderBy: { domain: 'asc' } },
                _count: { select: { crmPins: true } },
            },
            orderBy: { id: 'asc' },
        }));

        res.json({
            success: true,
            data: hotels.map(h => ({
                id: h.id,
                name: h.name || h.id,
                pms: h.pms,
                active: h.active,
                propertyId: h.propertyId,
                siteId: h.siteId,
                chainCode: h.chainCode,
                roomIDMapping: h.roomIDMapping || {},
                domains: (h.domains || []).map(d => d.domain),
                primaryDomain: (h.domains || []).find(d => d.isPrimary)?.domain || null,
                crmPinCount: h._count?.crmPins || 0,
                updatedAt: h.updatedAt,
            })),
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/admin/hotels', adminAuth, async (req, res) => {
    try {
        if (!prisma.hotelConfig) {
            return res.status(503).json({ success: false, message: 'HotelConfig model unavailable. Run Prisma migrate/generate.' });
        }

        const hotelId = String(req.body?.hotelId || req.body?.id || '').trim();
        if (!hotelId) return res.status(400).json({ success: false, message: 'hotelId is required.' });

        const pms = normalizePmsType(req.body?.pms || 'manual');
        const { list: domains, primary: primaryDomain } = normalizeDomainList(req.body?.domains || [], req.body?.primaryDomain || '');
        const roomIDMapping = (req.body?.roomIDMapping && typeof req.body.roomIDMapping === 'object' && !Array.isArray(req.body.roomIDMapping))
            ? req.body.roomIDMapping
            : {};

        const active = req.body?.active !== false;
        const name = String(req.body?.name || hotelId).trim();
        const propertyId = req.body?.propertyId ? String(req.body.propertyId).trim() : null;
        const siteId = req.body?.siteId ? String(req.body.siteId).trim() : null;
        const sitePassword = req.body?.sitePassword ? String(req.body.sitePassword) : null;
        const chainCode = req.body?.chainCode ? String(req.body.chainCode).trim() : null;

        await withRetry(() => prisma.$transaction(async (tx) => {
            await tx.hotelConfig.upsert({
                where: { id: hotelId },
                update: { name, pms, active, propertyId, siteId, sitePassword, chainCode, roomIDMapping },
                create: { id: hotelId, name, pms, active, propertyId, siteId, sitePassword, chainCode, roomIDMapping },
            });

            await tx.hotelDomain.deleteMany({ where: { hotelId } });
            if (domains.length) {
                await tx.hotelDomain.createMany({
                    data: domains.map(domain => ({
                        hotelId,
                        domain,
                        isPrimary: primaryDomain ? domain === primaryDomain : false,
                    })),
                });
            }

            const seedRooms = Array.isArray(req.body?.seedManualRooms) ? req.body.seedManualRooms : [];
            if (pms === 'manual' && seedRooms.length && tx.manualRoom) {
                for (const r of seedRooms) {
                    const roomName = String(r?.name || '').trim();
                    if (!roomName) continue;
                    const totalUnits = Math.max(0, parseInt(r?.totalUnits, 10) || 0);
                    await tx.manualRoom.upsert({
                        where: { hotelId_name: { hotelId, name: roomName } },
                        update: { totalUnits },
                        create: { hotelId, name: roomName, totalUnits },
                    });
                }
            }
        }));

        hotelConfigCache.delete(hotelId);
        const config = await resolveHotelConfig(hotelId);
        res.json({ success: true, data: sanitizeConfigForResponse(config), hotelId, domains });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/admin/hotels/:hotelId/pins', adminAuth, async (req, res) => {
    try {
        if (!prisma.crmPin) {
            return res.status(503).json({ success: false, message: 'CrmPin model unavailable. Run Prisma migrate/generate.' });
        }
        const hotelId = String(req.params.hotelId || '').trim();
        const pins = await withRetry(() => prisma.crmPin.findMany({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, label: true, active: true, createdAt: true, updatedAt: true },
        }));
        res.json({ success: true, data: pins });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/admin/hotels/:hotelId/pins', adminAuth, async (req, res) => {
    try {
        if (!prisma.crmPin) {
            return res.status(503).json({ success: false, message: 'CrmPin model unavailable. Run Prisma migrate/generate.' });
        }
        const hotelId = String(req.params.hotelId || '').trim();
        const pin = String(req.body?.pin || '').trim();
        const label = String(req.body?.label || '').trim() || null;
        if (!hotelId || !pin) {
            return res.status(400).json({ success: false, message: 'hotelId and pin are required.' });
        }

        const pinHash = hashCrmPin(pin);
        await withRetry(() => prisma.crmPin.upsert({
            where: { hotelId_pinHash: { hotelId, pinHash } },
            update: { label, active: req.body?.active !== false },
            create: { hotelId, pinHash, label, active: req.body?.active !== false },
        }));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.patch('/api/admin/hotels/:hotelId/pins/:pinId', adminAuth, async (req, res) => {
    try {
        if (!prisma.crmPin) {
            return res.status(503).json({ success: false, message: 'CrmPin model unavailable. Run Prisma migrate/generate.' });
        }
        const hotelId = String(req.params.hotelId || '').trim();
        const pinId = String(req.params.pinId || '').trim();
        const data = {};
        if (req.body?.label !== undefined) data.label = String(req.body.label || '').trim() || null;
        if (req.body?.active !== undefined) data.active = !!req.body.active;
        const updated = await withRetry(() => prisma.crmPin.updateMany({
            where: { id: pinId, hotelId },
            data,
        }));
        if (!updated.count) return res.status(404).json({ success: false, message: 'PIN not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// PWA push: public VAPID key for subscription
app.get('/api/push/vapid-public', (req, res) => {
    if (!VAPID_PUBLIC) return res.status(503).json({ error: 'Push not configured' });
    res.json({ publicKey: VAPID_PUBLIC });
});

// PWA push: save subscription (CRM auth required). Optional body.source: 'crm' | 'funnel'
app.post('/api/push/subscribe', crmAuth, async (req, res) => {
    try {
        console.log('Push subscribe called, body:', JSON.stringify(req.body));
        const { endpoint, p256dh, auth, source } = req.body || {};
        console.log('endpoint:', endpoint ? 'present' : 'missing');
        console.log('p256dh:', p256dh ? 'present' : 'missing');
        console.log('auth:', auth ? 'present' : 'missing');
        
        if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'endpoint, p256dh, auth required' });
        
        // Keep the source as-is (funnel, simple-crm, or crm)
        const subSource = source || 'crm';
        console.log('Subscription source:', subSource);
        console.log('Checking for existing subscription...');
        const existing = await prisma.pushSubscription.findFirst({ where: { endpoint } });
        console.log('existing:', existing ? 'found' : 'not found');
        
        if (existing) {
            console.log('Updating existing subscription...');
            await prisma.pushSubscription.update({
                where: { id: existing.id },
                data: { p256dh, auth, source: subSource },
            });
        } else {
            console.log('Creating new subscription...');
            await prisma.pushSubscription.create({
                data: { endpoint, p256dh, auth, source: subSource },
            });
        }
        console.log('Subscription saved successfully');
        res.json({ ok: true });
    } catch (e) {
        console.error('Push subscribe error FULL:', e);
        res.status(500).json({ error: e.message });
    }
});

// Notify all subscribed clients (CRM + Funnel) of a new booking (fire-and-forget)
async function notifyNewBooking(guestName, roomName) {
    if (!VAPID_PRIVATE) return;
    try {
        const subs = await prisma.pushSubscription.findMany();
        const payload = JSON.stringify({
            title: 'New booking',
            body: guestName ? `${guestName}${roomName ? ` – ${roomName}` : ''}` : 'A new booking just came in.',
            url: '/crm',
        });
        await Promise.allSettled(subs.map((s) =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 60 }
            )
        ));
    } catch (e) {
        console.error('notifyNewBooking:', e.message);
    }
}

// Notify subscribers when a purchase event is recorded (fire-and-forget)
async function notifyPurchase() {
    if (!VAPID_PRIVATE) return;
    try {
        // Send to both funnel and front desk
        const subs = await prisma.pushSubscription.findMany({ 
            where: { 
                source: { in: ['funnel', 'simple-crm'] } 
            } 
        });
        if (subs.length === 0) return;
        
        console.log(`🔔 Sending purchase notification to ${subs.length} subscriptions`);
        
        const payload = JSON.stringify({
            title: 'New Booking!',
            body: 'A purchase just came in.',
            icon: '/marketellogo.svg',
            badge: '/marketellogo.svg',
            data: {
                url: '/simple-crm'
            }
        });
        
        await Promise.allSettled(subs.map((s) =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 60 }
            )
        ));
    } catch (e) {
        console.error('notifyPurchase:', e.message);
    }
}


// Notify about payment declined leads (URGENT - call within 60 seconds!)
async function notifyPaymentDeclined(guestInfo, bookingDetails, errorMessage) {
    if (!VAPID_PRIVATE) return;
    try {
        const subs = await prisma.pushSubscription.findMany();
        if (subs.length === 0) return;

        const guestName = [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || 'Guest';
        const roomName = bookingDetails.roomName || 'Room';
        const total = bookingDetails.total ? `$${bookingDetails.total}` : '';
        const phone = guestInfo.phone || '';
        
        // Determine decline reason for better context
        let declineReason = 'Payment declined';
        if (errorMessage) {
            if (errorMessage.includes('insufficient')) declineReason = 'Insufficient funds';
            else if (errorMessage.includes('expired')) declineReason = 'Expired card';
            else if (errorMessage.includes('declined')) declineReason = 'Card declined';
        }

        const payload = JSON.stringify({
            title: '🔴 URGENT: Payment Declined',
            body: `${guestName} • ${phone}\n${roomName} • ${total}\n${declineReason} - CALL NOW!`,
            icon: '/marketellogo.svg',
            badge: '/marketellogo.svg',
            tag: 'payment-declined',
            requireInteraction: true, // Keeps notification visible until dismissed
            vibrate: [200, 100, 200, 100, 200], // Longer vibration pattern
            data: {
                url: '/simple-crm',
                type: 'payment_declined',
                urgent: true,
                guestName: guestName,
                guestPhone: phone,
                roomName: roomName,
                total: total,
                errorMessage: errorMessage
            }
        });

        await Promise.allSettled(subs.map((s) =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 300, urgency: 'high' } // 5 min TTL, high urgency
            )
        ));
        
        console.log(`🔴 Urgent payment declined notification sent for ${guestName}`);
    } catch (e) {
        console.error('notifyPaymentDeclined:', e.message);
    }
}

// Serve CRM HTML
app.get('/crm', (req, res) => {
    res.sendFile(path.join(__dirname, 'crm.html'));
});

// Serve Simple CRM HTML (for front desk)
app.get('/frontdesk', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-crm.html'));
});

// Legacy route redirect
app.get('/simple-crm', (req, res) => {
    res.redirect(301, '/frontdesk');
});

// Simple CRM API: Mark booking as confirmed
app.post('/api/crm/bookings/:id/confirm', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId: getAllowedHotelFilter(req) },
            select: { id: true },
        }));
        if (!bookingMatch) return res.status(404).json({ error: 'Booking not found' });

        const booking = await prisma.booking.update({
            where: { id },
            data: { 
                callStatus: 'called',
                crmStage: 'confirmed'
            }
        });
        res.json({ success: true, booking });
    } catch (error) {
        console.error('Confirm booking error:', error);
        res.status(500).json({ error: 'Failed to confirm booking' });
    }
});

// Simple CRM API: Add note to booking
app.post('/api/crm/bookings/:id/note', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        
        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }
        
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId: getAllowedHotelFilter(req) },
            select: { id: true },
        }));
        if (!bookingMatch) return res.status(404).json({ error: 'Booking not found' });

        const booking = await prisma.booking.update({
            where: { id },
            data: { 
                notes: note // Append note (you might want to append to existing notes)
            }
        });
        res.json({ success: true, booking });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// Add dummy bookings (for testing)
app.post('/api/crm/add-dummy-bookings', crmAuth, async (req, res) => {
    try {
        const hotelId = req.crmDefaultHotelId || DEFAULT_CRM_HOTEL_ID;
        const dummyBookings = [
            {
                hotelId,
                guestFirstName: 'John',
                guestLastName: 'Smith',
                guestEmail: 'john.smith@example.com',
                guestPhone: '(555) 123-4567',
                roomName: 'King Room',
                checkinDate: new Date('2026-03-15'),
                checkoutDate: new Date('2026-03-18'),
                nights: 3,
                subtotal: 400.00,
                taxesAndFees: 50.00,
                grandTotal: 450.00,
                stripePaymentIntentId: 'pi_dummy_' + Date.now() + '_1',
                ourReservationCode: 'BOOK-' + Date.now() + '-1',
                status: 'confirmed',
                crmStage: 'new',
                callStatus: 'not-called',
            },
            {
                hotelId,
                guestFirstName: 'Sarah',
                guestLastName: 'Johnson',
                guestEmail: 'sarah.j@example.com',
                guestPhone: '(555) 234-5678',
                roomName: 'Double Queen',
                checkinDate: new Date('2026-03-16'),
                checkoutDate: new Date('2026-03-19'),
                nights: 3,
                subtotal: 340.00,
                taxesAndFees: 40.00,
                grandTotal: 380.00,
                stripePaymentIntentId: 'pi_dummy_' + Date.now() + '_2',
                ourReservationCode: 'BOOK-' + Date.now() + '-2',
                status: 'confirmed',
                crmStage: 'new',
                callStatus: 'not-called',
            },
            {
                hotelId,
                guestFirstName: 'Michael',
                guestLastName: 'Chen',
                guestEmail: 'mchen@example.com',
                guestPhone: '(555) 345-6789',
                roomName: 'Suite Premium',
                checkinDate: new Date('2026-03-20'),
                checkoutDate: new Date('2026-03-25'),
                nights: 5,
                subtotal: 750.00,
                taxesAndFees: 100.00,
                grandTotal: 850.00,
                stripePaymentIntentId: 'pi_dummy_' + Date.now() + '_3',
                ourReservationCode: 'BOOK-' + Date.now() + '-3',
                status: 'confirmed',
                crmStage: 'new',
                callStatus: 'not-called',
            },
            {
                hotelId,
                guestFirstName: 'Emily',
                guestLastName: 'Rodriguez',
                guestEmail: 'emily.r@example.com',
                guestPhone: '(555) 456-7890',
                roomName: 'Standard Double',
                checkinDate: new Date('2026-03-17'),
                checkoutDate: new Date('2026-03-20'),
                nights: 3,
                subtotal: 285.00,
                taxesAndFees: 35.00,
                grandTotal: 320.00,
                stripePaymentIntentId: 'pi_dummy_' + Date.now() + '_4',
                ourReservationCode: 'BOOK-' + Date.now() + '-4',
                status: 'confirmed',
                crmStage: 'new',
                callStatus: 'not-called',
                notes: 'PAYMENT DECLINED - Card issue, verify payment method when calling',
            },
        ];

        const created = await Promise.all(
            dummyBookings.map(booking => prisma.booking.create({ data: booking }))
        );

        res.json({ success: true, count: created.length, bookings: created });
    } catch (error) {
        console.error('Add dummy bookings error:', error);
        res.status(500).json({ error: 'Failed to add dummy bookings' });
    }
});

// Funnel dashboard API (same auth as CRM)
app.get('/api/funnel', crmAuth, (req, res) => {
    const counts = { PageView: 0, Search: 0, AddToCart: 0, InitiateCheckout: 0, AddPaymentInfo: 0, Purchase: 0 };
    funnelStore.forEach(e => { if (counts[e.event_name] !== undefined) counts[e.event_name]++; });
    const recent = funnelStore.slice(0, 50);
    res.json({ counts, recent });
});

// Meta Ads insights for funnel dashboard
app.get('/api/meta-insights', crmAuth, async (req, res) => {
    try {
        if (!META_AD_ACCOUNT_ID || !META_ACCESS_TOKEN) {
            return res.json({
                success: false,
                enabled: false,
                message: 'Meta Ads env vars not configured',
            });
        }

        const { range, from, to } = req.query;
        const today = new Date();
        const fmtDate = d => d.toISOString().split('T')[0];

        let since;
        let until;

        if (range === 'today') {
            since = fmtDate(today);
            until = fmtDate(today);
        } else if (range === 'yesterday') {
            const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            since = fmtDate(y);
            until = fmtDate(y);
        } else if (range === 'max') {
            // "All time": Meta Insights restricts the start date to <= ~37 months back.
            // Use 37 months lookback to avoid OAuthException #3018.
            const maxSince = new Date(today);
            maxSince.setMonth(maxSince.getMonth() - 37);
            since = fmtDate(maxSince);
            until = fmtDate(today);
        } else if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);
            if (isNaN(fromDate) || isNaN(toDate) || fromDate > toDate) {
                return res.status(400).json({ success: false, message: 'Invalid date range' });
            }
            const diffDays = (toDate - fromDate) / (24 * 60 * 60 * 1000);
            if (diffDays > 14) {
                return res.status(400).json({ success: false, message: 'Max 14-day range is 14 days' });
            }
            since = fmtDate(fromDate);
            until = fmtDate(toDate);
        } else {
            // default last 7 days
            const sevenAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            since = fmtDate(sevenAgo);
            until = fmtDate(today);
        }

        const url = `https://graph.facebook.com/${META_API_VERSION}/act_${META_AD_ACCOUNT_ID}/insights`;

        const params = {
            access_token: META_ACCESS_TOKEN,
            level: 'campaign',
            time_range: JSON.stringify({ since, until }),
            time_increment: 'all_days',
            fields: [
                'spend',
                'impressions',
                'clicks',
                'cpm',
                'ctr',
                'actions',
                'action_values',
                'cost_per_action_type',
                'purchase_roas',
            ].join(','),
            filtering: JSON.stringify([
                {
                    field: 'campaign.id',
                    operator: 'IN',
                    value: [
                        '6963942203593',
                        '6964479702393',
                        '6970186008193',
                        '6980975676193',
                        '6951026180393'
                    ],
                },
            ]),
        };

        const resp = await axios.get(url, { params });
        const rows = resp.data?.data || [];
        if (!rows.length) {
            return res.json({
                success: true,
                enabled: true,
                data: {
                    spend: 0,
                    impressions: 0,
                    clicks: 0,
                    ctr: 0,
                    cpm: 0,
                    landing_page_views: 0,
                    cost_per_landing_page_view: 0,
                    purchase_value: 0,
                    roas: 0,
                    events: {
                        landing_page_view: 0,
                        search: 0,
                        add_to_cart: 0,
                        initiate_checkout: 0,
                        add_payment_info: 0,
                        purchase: 0,
                    },
                    since,
                    until,
                },
            });
        }

        // Meta returns multiple rows (often: one per day, possibly multiple campaigns).
        // "All time" being lower than "Today" happens when we only read `rows[0]`.
        // Aggregate across all rows so totals match the full date range.
        let spend = 0;
        let impressions = 0;
        let clicks = 0;

        const metaEvents = {
            landing_page_view: 0,
            search: 0,
            add_to_cart: 0,
            initiate_checkout: 0,
            add_payment_info: 0,
            purchase: 0,
        };

        let purchaseValue = 0;

        rows.forEach(r => {
            spend += parseFloat(r.spend || 0) || 0;
            impressions += parseInt(r.impressions || 0, 10) || 0;
            clicks += parseInt(r.clicks || 0, 10) || 0;

            if (Array.isArray(r.actions)) {
                r.actions.forEach(a => {
                    const type = a.action_type;
                    const v = Number(a.value || 0);
                    if (!v) return;
                    if (type === 'landing_page_view') metaEvents.landing_page_view += v;
                    if (type === 'search') metaEvents.search += v;
                    if (type === 'add_to_cart') metaEvents.add_to_cart += v;
                    if (type === 'initiate_checkout') metaEvents.initiate_checkout += v;
                    if (type === 'add_payment_info') metaEvents.add_payment_info += v;
                    if (type === 'purchase') metaEvents.purchase += v;
                });
            }

            if (Array.isArray(r.action_values)) {
                const pv = r.action_values.find(a => a.action_type === 'purchase');
                purchaseValue += pv ? Number(pv.value || 0) : 0;
            }
        });

        const ctr = impressions > 0 ? (clicks / impressions) : 0;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

        // Landing page views and cost per LP view
        const landingPageViews = metaEvents.landing_page_view;
        const costPerLPV = landingPageViews > 0 && spend > 0 ? (spend / landingPageViews) : 0;

        // ROAS (purchase value / spend)
        const roas = spend > 0 && purchaseValue > 0 ? (purchaseValue / spend) : 0;

        res.json({
            success: true,
            enabled: true,
            data: {
                spend,
                impressions,
                clicks,
                ctr,
                cpm,
                landing_page_views: landingPageViews,
                cost_per_landing_page_view: costPerLPV || 0,
                purchase_value: purchaseValue,
                roas: roas || 0,
                events: metaEvents,
                since,
                until,
            },
        });
    } catch (e) {
        console.error('Meta insights error:', e.response?.data || e.message);
        res.status(500).json({
            success: false,
            enabled: true,
            message: e.message || 'Meta insights error',
        });
    }
});

// Serve funnel dashboard HTML (login handled client-side, API requires crmAuth)
app.get('/funnel', (req, res) => {
    res.sendFile(path.join(__dirname, 'funnel.html'));
});

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics.html'));
});

// Verify PIN only (no DB) - helps debug auth vs DB issues
app.get('/api/crm/verify', crmAuth, (req, res) => {
    res.json({
        success: true,
        hotelId: req.crmDefaultHotelId || DEFAULT_CRM_HOTEL_ID,
        allowedHotels: req.crmAllowedHotels || [],
    });
});

app.get('/api/crm/manual-availability', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:get failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crm/manual-availability/rooms', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const roomName = String(req.body?.roomName || '').trim();
        const totalUnits = Math.max(0, parseInt(req.body?.totalUnits, 10) || 0);

        if (!roomName) {
            return res.status(400).json({ success: false, message: 'roomName is required.' });
        }

        await withRetry(() => prisma.manualRoom.upsert({
            where: { hotelId_name: { hotelId, name: roomName } },
            update: { totalUnits },
            create: { hotelId, name: roomName, totalUnits },
        }));

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:rooms failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crm/manual-availability/range', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const roomName = String(req.body?.roomName || '').trim();
        const startDate = normalizeIsoDate(req.body?.startDate);
        const endDate = normalizeIsoDate(req.body?.endDate);
        const closed = !!req.body?.closed;
        const clear = !!req.body?.clear;
        const hasAvail = req.body?.availableUnits !== undefined && req.body?.availableUnits !== null && req.body?.availableUnits !== '';
        const availableUnits = hasAvail ? Math.max(0, parseInt(req.body.availableUnits, 10) || 0) : null;

        if (!roomName) {
            return res.status(400).json({ success: false, message: 'roomName is required.' });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
        }

        const room = await withRetry(() => prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
        }));
        if (!room) {
            return res.status(400).json({ success: false, message: 'Room type not found. Add room first.' });
        }

        const dates = enumerateDatesInclusive(startDate, endDate, 180);
        if (!dates.length) {
            return res.status(400).json({ success: false, message: 'Invalid date range.' });
        }

        if (clear) {
            await withRetry(() => prisma.manualOverride.deleteMany({
                where: { roomId: room.id, date: { in: dates } },
            }));
        } else if (!closed && !hasAvail) {
            await withRetry(() => prisma.manualOverride.deleteMany({
                where: { roomId: room.id, date: { in: dates } },
            }));
        } else {
            await withRetry(() => prisma.$transaction(
                dates.map(date => prisma.manualOverride.upsert({
                    where: { roomId_date: { roomId: room.id, date } },
                    update: { availableUnits, closed },
                    create: { roomId: room.id, date, availableUnits, closed },
                }))
            ));
        }

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload, affectedDays: dates.length });
    } catch (e) {
        console.error('manual-availability:range failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get bookings for CRM - last 7 days + all future
app.get('/api/crm/bookings', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        // Get regular bookings
        const bookings = await withRetry(() => prisma.booking.findMany({
            orderBy: { checkinDate: 'asc' },
            where: {
                hotelId,
                checkinDate: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        }));
        
        // Get payment declined leads and transform them to look like bookings
        const declinedLeads = await withRetry(() => prisma.paymentDeclinedLead.findMany({
            orderBy: { createdAt: 'desc' },
            where: {
                hotelId,
                called: false // Only show uncalled declined leads
            }
        }));
        
        // Transform declined leads to match booking structure
        const transformedDeclined = declinedLeads.map(lead => ({
            id: lead.id,
            createdAt: lead.createdAt,
            hotelId: lead.hotelId,
            guestFirstName: lead.guestFirstName,
            guestLastName: lead.guestLastName,
            guestEmail: lead.guestEmail,
            guestPhone: lead.guestPhone,
            roomName: lead.roomName,
            checkinDate: new Date(lead.checkinDate),
            checkoutDate: new Date(lead.checkoutDate),
            nights: lead.nights,
            grandTotal: lead.grandTotal,
            subtotal: lead.grandTotal * 0.85, // Approximate
            taxesAndFees: lead.grandTotal * 0.15,
            callStatus: 'not-called',
            crmStage: 'new',
            notes: `PAYMENT DECLINED - ${lead.errorMessage || 'Card issue, verify payment method when calling'}`,
            paymentDeclined: true // Flag for UI
        }));
        
        // Merge both lists
        const allBookings = [...bookings, ...transformedDeclined];
        
        res.json({ success: true, data: allBookings });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create a manual booking (from CRM "Add Booking")
app.post('/api/crm/bookings', crmAuth, async (req, res) => {
    try {
        const body = req.body;
        const name = (body.name || '').trim();
        const [guestFirstName = '', guestLastName = ''] = name ? name.split(/\s+/, 2) : ['', ''];
        const guestPhone = (body.phone || '').trim();
        const guestEmail = (body.email || '').trim();
        const roomName = (body.room || 'King Room').trim();
        const guests = parseInt(body.guests, 10) || 1;
        const checkIn = body.checkIn || body.checkin;
        const checkOut = body.checkOut || body.checkout;
        const total = parseFloat(body.total) || 0;
        const notes = (body.notes || '').trim();

        if (!name || !guestPhone || !checkIn || !checkOut) {
            return res.status(400).json({ success: false, message: 'Name, phone, and dates are required.' });
        }

        const checkinDate = new Date(checkIn);
        const checkoutDate = new Date(checkOut);
        const nights = Math.max(1, Math.round((checkoutDate - checkinDate) / 86400000));
        const grandTotal = total;
        const subtotal = Math.round((grandTotal / 1.1) * 100) / 100;
        const taxesAndFees = Math.round((grandTotal - subtotal) * 100) / 100;

        const crypto = require('crypto');
        const ourReservationCode = `MANUAL-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const booking = await withRetry(() => prisma.booking.create({
            data: {
                ourReservationCode,
                pmsConfirmationCode: ourReservationCode,
                hotelId,
                roomName,
                checkinDate,
                checkoutDate,
                nights,
                guestFirstName: guestFirstName || '-',
                guestLastName: guestLastName || '-',
                guestEmail: guestEmail || '-',
                guestPhone,
                subtotal,
                taxesAndFees,
                grandTotal,
                bookingType: 'manual',
                status: 'confirmed',
                crmStage: 'new',
                callStatus: 'not-called',
                notes: notes || null,
            },
        }));

        notifyNewBooking([guestFirstName, guestLastName].filter(Boolean).join(' ') || null, roomName).catch(() => {});
        res.json({ success: true, data: booking });
    } catch (e) {
        console.error('CRM manual booking create error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update a booking's CRM stage, call status, notes, call log
app.post('/api/crm/update', crmAuth, async (req, res) => {
    try {
        const { id, crmStage, callStatus, notes, callLog } = req.body;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId: getAllowedHotelFilter(req) },
            select: { id: true },
        }));
        if (!bookingMatch) return res.status(404).json({ success: false, message: 'Booking not found' });

        const data = {};
        if (crmStage !== undefined) data.crmStage = crmStage;
        if (callStatus !== undefined) data.callStatus = callStatus;
        if (notes !== undefined) data.notes = notes;
        if (callLog !== undefined) data.callLog = JSON.stringify(callLog);

        const booking = await withRetry(() => prisma.booking.update({ where: { id }, data }));
        res.json({ success: true, booking });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get payment declined leads
app.get('/api/crm/payment-declined', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const leads = await withRetry(() => prisma.paymentDeclinedLead.findMany({
            orderBy: { createdAt: 'desc' },
            where: { hotelId, called: false }
        }));
        res.json({ success: true, data: leads });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Mark payment declined lead as called (or add notes)
app.patch('/api/crm/payment-declined/:id', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { called, notes } = req.body;
        const leadMatch = await withRetry(() => prisma.paymentDeclinedLead.findFirst({
            where: { id, hotelId: getAllowedHotelFilter(req) },
            select: { id: true },
        }));
        if (!leadMatch) return res.status(404).json({ success: false, message: 'Lead not found' });

        const data = {};
        if (called !== undefined) data.called = !!called;
        if (notes !== undefined) data.notes = notes;
        await withRetry(() => prisma.paymentDeclinedLead.update({ where: { id }, data }));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete a booking
app.delete('/api/crm/bookings/:id', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId: getAllowedHotelFilter(req) },
            select: { id: true },
        }));
        if (!bookingMatch) return res.status(404).json({ success: false, message: 'Booking not found or already deleted.' });

        await withRetry(() => prisma.booking.delete({ where: { id } }));
        res.json({ success: true });
    } catch (e) {
        console.error('CRM delete error:', e.message);
        const msg = e.code === 'P2025' ? 'Booking not found or already deleted.' : (e.message || 'Delete failed');
        res.status(e.code === 'P2025' ? 404 : 500).json({ success: false, message: msg });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

