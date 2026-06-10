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
const nodemailer = require('nodemailer');
const telemetry = require('./marketel-signal-extractor');

// Marketel CAPI (separate pixel for the onboarding funnel)
const MARKETEL_PIXEL_ID = process.env.MARKETEL_META_PIXEL_ID || '';
const MARKETEL_ACCESS_TOKEN = process.env.MARKETEL_META_ACCESS_TOKEN || '';

async function sendMarketelCAPI(eventName, { email, phone, ip, userAgent, sourceUrl, fbp, fbc, value, currency, eventId } = {}) {
    if (!MARKETEL_PIXEL_ID || !MARKETEL_ACCESS_TOKEN) return;
    try {
        const userData = {};
        if (email) userData.em = [crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')];
        if (phone) {
            const digits = String(phone).replace(/\D/g, '');
            if (digits) userData.ph = [crypto.createHash('sha256').update(digits).digest('hex')];
        }
        if (ip) userData.client_ip_address = ip;
        if (userAgent) userData.client_user_agent = userAgent;
        if (fbp) userData.fbp = fbp;
        if (fbc) userData.fbc = fbc;

        const eventPayload = {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId || `${eventName.toLowerCase()}.${Date.now()}`,
            action_source: 'website',
            user_data: userData,
        };
        if (sourceUrl) eventPayload.event_source_url = sourceUrl;
        if (value) eventPayload.custom_data = { value: parseFloat(value), currency: currency || 'USD' };

        await axios.post(
            `https://graph.facebook.com/v18.0/${MARKETEL_PIXEL_ID}/events`,
            { data: [eventPayload], access_token: MARKETEL_ACCESS_TOKEN }
        );
        console.log(`✅ Marketel CAPI: ${eventName} sent`);
    } catch (e) {
        console.error(`❌ Marketel CAPI ${eventName} failed:`, e.response?.data?.error?.message || e.message);
    }
}

// Helper to extract fbp/fbc from request cookies
function getMetaCookies(req) {
    const cookieHeader = req.headers.cookie || '';
    const fbp = (cookieHeader.match(/(?:^|;\s*)_fbp=([^;]+)/) || [])[1] || '';
    const fbc = (cookieHeader.match(/(?:^|;\s*)_fbc=([^;]+)/) || [])[1] || '';
    return { fbp, fbc };
}

// Email transporter (Brevo SMTP)
const emailTransporter = (process.env.BREVO_SMTP_HOST && (process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP))
    ? nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST,
        port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_LOGIN,
            pass: process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP,
        },
    })
    : null;

async function sendWelcomeEmail(toEmail, hotelName, pin, domain) {
    if (!emailTransporter) {
        console.log('⚠️ Email not configured — skipping welcome email');
        return;
    }
    try {
        let html = require('fs').readFileSync(path.join(__dirname, 'email-templates', 'welcome.html'), 'utf8');
        html = html.replace(/\{\{DOMAIN\}\}/g, domain);
        html = html.replace(/\{\{PIN\}\}/g, pin);

        await emailTransporter.sendMail({
            from: '"Marketel" <support@bookmarketel.com>',
            to: toEmail,
            subject: 'Your booking engine is live',
            html,
        });
        console.log(`✅ Welcome email sent to ${toEmail}`);
    } catch (e) {
        console.error('❌ Welcome email failed:', e.message);
    }
}

// Build a durable link back to the guest's reservation page (survives closing
// the app). Prefers the hotel's own domain; falls back to the request origin.
async function buildGuestBookingUrl(hotelId, code, req) {
    if (!code) return '';
    let base = '';
    try {
        const d = await prisma.hotelDomain.findFirst({ where: { hotelId }, orderBy: { isPrimary: 'desc' } });
        if (d?.domain) base = `https://${d.domain}`;
    } catch (_) {}
    if (!base && req) {
        const ref = req.headers?.referer || req.headers?.origin || '';
        try { const u = new URL(ref); base = `${u.protocol}//${u.host}`; } catch (_) {}
    }
    if (!base) return '';
    return `${base}/booking/${encodeURIComponent(code)}`;
}

async function sendGuestConfirmationEmail({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, checkout, nights, total, reservationCode, bookingUrl }) {
    if (!emailTransporter || !guestEmail) return;
    try {
        const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const checkoutStr = new Date(checkout).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const totalStr = total ? `$${Number(total).toFixed(2)}` : '';
        const phoneStr = hotelPhone ? ` — ${hotelPhone}` : '.';

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#2E7D5B;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Reservation Confirmed ✓</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Hi ${guestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5;">Your reservation at <strong>${hotelName}</strong> is confirmed. Here are your details:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:20px;"><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Room</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${roomName}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-in</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkinStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-out</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkoutStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Nights</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${nights}</div></td></tr>${totalStr ? `<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Total</div><div style="font-size:15px;font-weight:600;color:#2E7D5B;">${totalStr}</div></td></tr>` : ''}<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Confirmation #</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${reservationCode}</div></td></tr></table>${bookingUrl ? `<div style="text-align:center;margin:0 0 20px;"><a href="${bookingUrl}" style="display:inline-block;background:#2E7D5B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:10px;">View my reservation</a><div style="font-size:11px;color:#9ca3af;margin-top:8px;">Message the front desk, add to your calendar, or book again anytime.</div></div>` : ''}<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">If you have any questions, contact the hotel directly${phoneStr}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: guestEmail,
            subject: `Reservation confirmed — ${hotelName}`,
            html,
        });
        console.log(`✅ Guest confirmation email sent to ${guestEmail}`);
    } catch (e) {
        console.error('❌ Guest confirmation email failed:', e.message);
    }
}

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
                msg.includes('P2024') ||
                msg.includes('Engine is not yet connected') ||
                msg.includes('timed out') ||
                msg.includes('Connection refused') ||
                msg.includes('ECONNRESET') ||
                msg.includes('socket hang up');
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
    'https://hp.clickinns.com',
    'https://test.clickinns.com',
    'https://myhomeplacesuites.com',
    'https://www.myhomeplacesuites.com',
    'https://guestlodgeminot.clickinns.com',
    'https://stcroix.clickinns.com',
    'https://clickinns.com',
    'https://www.clickinns.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:55031',
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
        // Allow any clickinns.com subdomain (customer booking sites)
        if (origin.endsWith('.clickinns.com')) return callback(null, true);
        // Allow bookmarketel.com and all subdomains
        if (origin === 'https://bookmarketel.com' || origin.endsWith('.bookmarketel.com')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
};



// Webhook needs raw body
app.use('/api/stripe-webhook', express.raw({type: 'application/json'}));
app.use(cors(corsOptions));
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}, express.static(path.join(__dirname, 'public', 'uploads')));
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
const REPORT_TIME_ZONE = process.env.REPORT_TIME_ZONE || 'America/Chicago';

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
        pms: 'manual',
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
const HOTEL_DOMAIN_CACHE_TTL_MS = 30 * 1000;
const hotelConfigCache = new Map();
const hotelDomainCache = new Map();

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

function clearHotelDomainCache() {
    hotelDomainCache.clear();
}

async function getDbHotelConfig(hotelId) {
    if (!prisma.hotelConfig) return null;
    const key = String(hotelId || '').trim();
    if (!key) return null;

    const cached = hotelConfigCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let row = await withRetry(() => prisma.hotelConfig.findUnique({
        where: { id: key },
        include: { domains: true },
    }));

    // Fallback: resolve by domain if direct ID lookup fails
    // e.g. "john-s-inn" → look up "john-s-inn.bookmarketel.com" in HotelDomain
    if (!row && prisma.hotelDomain) {
        const domainGuess = key + '.bookmarketel.com';
        const domainRecord = await withRetry(() => prisma.hotelDomain.findUnique({ where: { domain: domainGuess } }));
        if (domainRecord) {
            row = await withRetry(() => prisma.hotelConfig.findUnique({
                where: { id: domainRecord.hotelId },
                include: { domains: true },
            }));
        }
    }

    const config = row
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
    if (typeof value === 'string' && value.length >= 10) {
        return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    
    // Extract local components to avoid UTC drift
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

function addDaysToIso(value, days) {
    const iso = normalizeIsoDate(value);
    if (!iso) return '';
    const date = new Date(`${iso}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
}

function formatShortDateRange(startIso, endIso) {
    const start = normalizeIsoDate(startIso);
    const end = normalizeIsoDate(endIso);
    if (!start || !end) return '';

    const startDate = new Date(`${start}T12:00:00.000Z`);
    const endDate = new Date(`${end}T12:00:00.000Z`);
    const dateOptions = { month: 'short', day: 'numeric', timeZone: REPORT_TIME_ZONE };
    const startLabel = startDate.toLocaleDateString('en-US', dateOptions);
    const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
    const endLabel = endDate.toLocaleDateString('en-US', {
        ...dateOptions,
        ...(sameYear ? {} : { year: 'numeric' }),
    });
    return `${startLabel} - ${endLabel}`;
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function toMoneyCents(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return Math.round(amount * 100);
}

function parseJsonObject(value) {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
        return {};
    }
}

function normalizeBookingSnapshot(bookingDetails = {}) {
    const nights = parseInt(bookingDetails?.nights, 10);
    return {
        reservationCode: String(bookingDetails?.reservationCode || '').trim(),
        roomTypeID: String(bookingDetails?.roomTypeID || '').trim(),
        rateID: String(bookingDetails?.rateID || '').trim(),
        roomName: String(bookingDetails?.roomName || bookingDetails?.name || '').trim(),
        checkin: normalizeIsoDate(bookingDetails?.checkin),
        checkout: normalizeIsoDate(bookingDetails?.checkout),
        nights: Number.isFinite(nights) ? nights : null,
        totalCents: toMoneyCents(bookingDetails?.total),
        amountPaidNowCents: toMoneyCents(bookingDetails?.amountPaidNow),
        bookingType: String(bookingDetails?.bookingType || 'standard').trim().toLowerCase(),
    };
}

function buildStripeIntentMetadata({ bookingDetails, guestInfo, hotelId, extra = {} }) {
    const snapshot = normalizeBookingSnapshot(bookingDetails);
    const metadata = {
        bookingDetails: JSON.stringify(bookingDetails || {}),
        guestInfo: JSON.stringify(guestInfo || {}),
        hotelId: String(hotelId || '').trim(),
        reservationCode: snapshot.reservationCode,
        roomTypeID: snapshot.roomTypeID,
        rateID: snapshot.rateID,
        roomName: snapshot.roomName,
        checkin: snapshot.checkin || '',
        checkout: snapshot.checkout || '',
        nights: snapshot.nights === null ? '' : String(snapshot.nights),
        bookingTotalCents: snapshot.totalCents === null ? '' : String(snapshot.totalCents),
        bookingType: snapshot.bookingType || '',
        ...extra,
    };
    return Object.fromEntries(
        Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
}

function getStripeIntentSnapshot(paymentIntent) {
    const metadata = paymentIntent?.metadata || {};
    const booking = normalizeBookingSnapshot(parseJsonObject(metadata.bookingDetails));
    if (!booking.reservationCode) booking.reservationCode = String(metadata.reservationCode || '').trim();
    if (!booking.roomTypeID) booking.roomTypeID = String(metadata.roomTypeID || '').trim();
    if (!booking.rateID) booking.rateID = String(metadata.rateID || '').trim();
    if (!booking.roomName) booking.roomName = String(metadata.roomName || '').trim();
    if (!booking.checkin) booking.checkin = normalizeIsoDate(metadata.checkin);
    if (!booking.checkout) booking.checkout = normalizeIsoDate(metadata.checkout);
    if (booking.nights === null && metadata.nights !== undefined) {
        const parsedNights = parseInt(metadata.nights, 10);
        booking.nights = Number.isFinite(parsedNights) ? parsedNights : null;
    }
    if (booking.totalCents === null && metadata.bookingTotalCents !== undefined) {
        const parsedTotalCents = parseInt(metadata.bookingTotalCents, 10);
        booking.totalCents = Number.isFinite(parsedTotalCents) ? parsedTotalCents : null;
    }
    return {
        hotelId: String(metadata.hotelId || '').trim(),
        holdType: String(metadata.holdType || '').trim().toLowerCase(),
        bookingType: String(metadata.bookingType || booking.bookingType || '').trim().toLowerCase(),
        booking,
    };
}

function findBookingSnapshotMismatch(submitted, stored) {
    const fields = [
        ['reservationCode', 'reservation code'],
        ['roomTypeID', 'room type'],
        ['rateID', 'rate'],
        ['checkin', 'check-in date'],
        ['checkout', 'check-out date'],
        ['nights', 'night count'],
        ['totalCents', 'booking total'],
    ];

    for (const [key, label] of fields) {
        const submittedValue = submitted?.[key];
        const storedValue = stored?.[key];
        if (submittedValue === null && storedValue === null) continue;
        if (submittedValue === '' && storedValue === '') continue;
        if (submittedValue === undefined && storedValue === undefined) continue;
        if (String(submittedValue || '') !== String(storedValue || '')) {
            return `Payment authorization does not match the submitted ${label}.`;
        }
    }

    return '';
}

function getExpectedStandardChargeAmountsCents(bookingDetails) {
    const snapshot = normalizeBookingSnapshot(bookingDetails);
    const amounts = new Set();
    if (snapshot.totalCents !== null && snapshot.totalCents > 0) {
        amounts.add(snapshot.totalCents);
        amounts.add(Math.round(snapshot.totalCents / 2));
    }
    if (snapshot.amountPaidNowCents !== null && snapshot.amountPaidNowCents > 0) {
        amounts.add(snapshot.amountPaidNowCents);
    }
    return [...amounts];
}

function validateStripeIntentAgainstBooking(paymentIntent, {
    hotelId,
    bookingDetails,
    allowedStatuses = [],
    allowedAmountsCents = [],
    requireManualCapture = false,
    requireHoldType = '',
}) {
    if (!paymentIntent?.id) {
        return 'Payment authorization could not be found.';
    }

    if (allowedStatuses.length && !allowedStatuses.includes(String(paymentIntent.status || '').trim().toLowerCase())) {
        return 'Payment authorization is not in a valid state for this booking.';
    }

    if (requireManualCapture && String(paymentIntent.capture_method || '').trim().toLowerCase() !== 'manual') {
        return 'Payment authorization is not a valid pre-authorization hold.';
    }

    const snapshot = getStripeIntentSnapshot(paymentIntent);
    const requestedHotelId = String(hotelId || '').trim();
    if (!requestedHotelId) return 'hotelId is required.';
    if (!snapshot.hotelId || snapshot.hotelId !== requestedHotelId) {
        return 'Payment authorization does not belong to this hotel.';
    }

    if (requireHoldType && snapshot.holdType !== String(requireHoldType || '').trim().toLowerCase()) {
        return 'Payment authorization is not valid for pay-later booking.';
    }

    const mismatch = findBookingSnapshotMismatch(normalizeBookingSnapshot(bookingDetails), snapshot.booking);
    if (mismatch) return mismatch;

    if (allowedAmountsCents.length && !allowedAmountsCents.includes(Number(paymentIntent.amount || 0))) {
        return 'Payment authorization amount does not match the booking.';
    }

    return '';
}

async function getActiveHotelValidation(hotelId) {
    const cleanHotelId = String(hotelId || '').trim();
    if (!cleanHotelId) {
        return { ok: false, status: 400, message: 'hotelId is required.' };
    }
    // Try direct lookup first
    const override = await getHotelOverrideStatus(cleanHotelId);
    if (override.status === 'ok') {
        return { ok: true, hotelId: cleanHotelId };
    }
    if (override.status === 'inactive') {
        return { ok: false, status: 403, message: `Hotel is inactive: ${cleanHotelId}` };
    }
    // Fallback: resolve via domain (e.g. "john-hotel" → "john-hotel.bookmarketel.com" → real ID)
    if (prisma.hotelDomain) {
        const domainGuess = cleanHotelId + '.bookmarketel.com';
        const domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } }).catch(() => null);
        if (domainRecord) {
            const row = await prisma.hotelConfig.findUnique({ where: { id: domainRecord.hotelId }, select: { id: true, active: true } }).catch(() => null);
            if (row) {
                return row.active
                    ? { ok: true, hotelId: row.id }
                    : { ok: false, status: 403, message: `Hotel is inactive: ${row.id}` };
            }
        }
    }
    return { ok: false, status: 400, message: `Invalid hotelId: ${cleanHotelId}` };
}

const routeRateLimitStore = new Map();

function getRateLimitClientKey(req) {
    return String(req.ip || req.socket?.remoteAddress || 'unknown')
        .split(',')[0]
        .trim()
        .toLowerCase();
}

function createRouteRateLimiter(name, { windowMs, max }) {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${name}:${getRateLimitClientKey(req)}`;
        const existing = routeRateLimitStore.get(key);
        if (!existing || existing.resetAt <= now) {
            routeRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        existing.count += 1;
        if (existing.count > max) {
            const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please wait a moment and try again.',
            });
        }

        next();
    };
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of routeRateLimitStore.entries()) {
        if (!value || value.resetAt <= now) routeRateLimitStore.delete(key);
    }
}, 5 * 60 * 1000).unref?.();

function normalizeRevenueEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeRevenuePhone(value) {
    return String(value || '').replace(/\D+/g, '');
}

function normalizeRevenueRoom(value) {
    return String(value || '').trim().toLowerCase();
}

function buildRevenueRecoveryKeys(entry = {}) {
    const roomName = normalizeRevenueRoom(entry.roomName);
    const checkin = normalizeIsoDate(entry.checkinDate);
    if (!roomName || !checkin) return [];

    const keys = [];
    const email = normalizeRevenueEmail(entry.guestEmail);
    const phone = normalizeRevenuePhone(entry.guestPhone);

    if (email) keys.push(`email|${email}|${roomName}|${checkin}`);
    if (phone) keys.push(`phone|${phone}|${roomName}|${checkin}`);

    return keys;
}

function getReportingTodayIso() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: REPORT_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
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
    // Auto-sync: ensure ManualRoom matches Room table (source of truth)
    try {
        const realRooms = await prisma.room.findMany({ where: { hotelId }, select: { name: true, totalUnits: true } });
        const manualRooms = await prisma.manualRoom.findMany({ where: { hotelId }, select: { name: true } });
        const realNames = new Set(realRooms.map(r => r.name));
        const manualNames = new Set(manualRooms.map(r => r.name));
        // Delete ManualRooms that don't exist in Room
        const toDelete = manualRooms.filter(m => !realNames.has(m.name));
        if (toDelete.length) {
            await prisma.manualRoom.deleteMany({ where: { hotelId, name: { in: toDelete.map(r => r.name) } } });
        }
        // Create ManualRooms for Rooms that don't have one
        const toCreate = realRooms.filter(r => !manualNames.has(r.name));
        for (const r of toCreate) {
            await prisma.manualRoom.upsert({
                where: { hotelId_name: { hotelId, name: r.name } },
                create: { hotelId, name: r.name, totalUnits: r.totalUnits || 1 },
                update: { totalUnits: r.totalUnits || 1 },
            });
        }
    } catch (e) { /* sync failed silently — continue with what we have */ }

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

    // Look up real Room IDs and details by name for inline editing
    const realRooms = await withRetry(() => prisma.room.findMany({
        where: { hotelId },
        select: { id: true, name: true, description: true, amenities: true, maxOccupancy: true, totalUnits: true },
    }));
    const roomDetailsByName = Object.fromEntries(realRooms.map(r => [r.name, r]));

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
        const details = roomDetailsByName[roomName] || {};
        out.push({
            roomName,
            roomId: details.id || null,
            description: details.description || null,
            amenities: details.amenities || null,
            maxOccupancy: details.maxOccupancy || 4,
            totalUnits: details.totalUnits || room.totalUnits || 1,
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

const MANUAL_REVENUE_PERIODS = new Set(['today', '7d', '30d', '90d', 'all']);

function buildManualRevenueWindow(period, referenceIso, earliestIso = '', latestIso = '') {
    const endIso = normalizeIsoDate(referenceIso) || getReportingTodayIso();

    if (period === 'all') {
        const normalizedEarliest = normalizeIsoDate(earliestIso);
        const normalizedLatest = normalizeIsoDate(latestIso) || endIso;
        
        let startIso = normalizedEarliest || endIso;
        // If earliest is later than latest (edge case), swap or bound
        if (startIso > normalizedLatest) startIso = normalizedLatest;
        
        return {
            startIso,
            endIso: normalizedLatest, // Expand forward
            prevStartIso: '',
            prevEndIso: '',
        };
    }

    const spanDays = {
        'today': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
    }[period];

    if (!spanDays) {
        throw new Error(`Unsupported revenue period: ${period}`);
    }

    const startIso = addDaysToIso(endIso, 1 - spanDays);
    const prevEndIso = addDaysToIso(startIso, -1);
    const prevStartIso = addDaysToIso(prevEndIso, 1 - spanDays);

    return {
        startIso,
        endIso,
        prevStartIso,
        prevEndIso,
    };
}

async function getEarliestManualRevenueStartIso(hotelId) {
    const [firstBooking, firstRoom] = await Promise.all([
        withRetry(() => prisma.booking.findFirst({
            where: { hotelId },
            orderBy: { checkinDate: 'asc' },
            select: { checkinDate: true },
        })),
        prisma.manualRoom
            ? withRetry(() => prisma.manualRoom.findFirst({
                where: { hotelId },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
            }))
            : Promise.resolve(null),
    ]);

    const bookingStartIso = normalizeIsoDate(firstBooking?.checkinDate);
    if (bookingStartIso) return bookingStartIso;

    return normalizeIsoDate(firstRoom?.createdAt) || getReportingTodayIso();
}

async function getLatestManualRevenueEndIso(hotelId) {
    const lastBooking = await withRetry(() => prisma.booking.findFirst({
        where: { hotelId },
        orderBy: { checkoutDate: 'desc' },
        select: { checkoutDate: true },
    }));

    const bookingEndIso = normalizeIsoDate(lastBooking?.checkoutDate);
    if (bookingEndIso) return bookingEndIso;

    return getReportingTodayIso();
}

async function computeManualRevenueMetrics(hotelId, startIso, endIso) {
    const start = normalizeIsoDate(startIso);
    const end = normalizeIsoDate(endIso);
    if (!start || !end || end < start) {
        return {
            rev: 0,
            bookings: 0,
            avg: 0,
            rooms: [],
            stats: {
                nights: 0,
                occupancyRate: 0,
                payLater: 0,
                recoveredDeclines: 0,
                availableRoomNights: 0,
            },
        };
    }

    const periodDays = enumerateDatesInclusive(start, end, 5000);
    const periodStartDate = new Date(`${start}T00:00:00.000Z`);
    const periodEndExclusiveDate = new Date(`${addDaysToIso(end, 1)}T00:00:00.000Z`);

    const [bookings, manualRooms, declinedLeads] = await Promise.all([
        withRetry(() => prisma.booking.findMany({
            where: {
                hotelId,
                checkinDate: { lt: periodEndExclusiveDate },
                checkoutDate: { gt: periodStartDate },
            },
            select: {
                id: true,
                roomName: true,
                checkinDate: true,
                checkoutDate: true,
                nights: true,
                grandTotal: true,
                bookingType: true,
                guestEmail: true,
                guestPhone: true,
            },
            orderBy: { checkinDate: 'asc' },
        })),
        prisma.manualRoom
            ? withRetry(() => prisma.manualRoom.findMany({
                where: { hotelId },
                include: {
                    overrides: {
                        where: {
                            date: {
                                gte: start,
                                lte: end,
                            },
                        },
                    },
                },
                orderBy: { name: 'asc' },
            }))
            : Promise.resolve([]),
        prisma.paymentDeclinedLead
            ? withRetry(() => prisma.paymentDeclinedLead.findMany({
                where: {
                    hotelId,
                    createdAt: { lt: periodEndExclusiveDate },
                },
                select: {
                    guestEmail: true,
                    guestPhone: true,
                    roomName: true,
                    checkinDate: true,
                },
            }))
            : Promise.resolve([]),
    ]);

    const recoveredLeadKeys = new Set();
    for (const lead of declinedLeads) {
        for (const key of buildRevenueRecoveryKeys(lead)) {
            recoveredLeadKeys.add(key);
        }
    }

    const roomRevenue = {};
    const bookedCounts = {};
    let totalRevenue = 0;
    let bookingCount = 0;
    let nightsSold = 0;
    let payLaterCount = 0;
    let recoveredDeclines = 0;

    for (const room of manualRooms) {
        const roomName = String(room.name || '').trim();
        if (roomName) roomRevenue[roomName] = 0;
    }

    for (const booking of bookings) {
        const roomName = String(booking.roomName || '').trim() || 'Room';
        const checkinIso = normalizeIsoDate(booking.checkinDate);
        const checkoutIso = normalizeIsoDate(booking.checkoutDate);
        if (!checkinIso || !checkoutIso || checkoutIso <= checkinIso) continue;

        const stayEndIso = addDaysToIso(checkoutIso, -1);
        if (!stayEndIso || stayEndIso < start || checkinIso > end) continue;

        const overlapStartIso = checkinIso > start ? checkinIso : start;
        const overlapEndIso = stayEndIso < end ? stayEndIso : end;
        const overlapDays = enumerateDatesInclusive(overlapStartIso, overlapEndIso, 5000);
        if (!overlapDays.length) continue;

        // Instead of partial accrual, attribute the full booking value to the window 
        // if the check-in date falls within the start-end window.
        // If check-in is before the window, we've already counted it in a previous window.
        if (checkinIso < start) continue;

        const fullStayNights = Math.max(
            1,
            parseInt(booking.nights, 10)
            || enumerateDatesInclusive(checkinIso, stayEndIso, 5000).length
            || 1
        );
        const recognizedRevenue = Number(booking.grandTotal) || 0;

        bookingCount += 1;
        nightsSold += fullStayNights;
        totalRevenue += recognizedRevenue;
        roomRevenue[roomName] = (roomRevenue[roomName] || 0) + recognizedRevenue;

        const bookingType = String(booking.bookingType || '').trim().toLowerCase();
        if (['paylater', 'reserve', 'manual'].includes(bookingType)) {
            payLaterCount += 1;
        }

        const recoveryKeys = buildRevenueRecoveryKeys({
            guestEmail: booking.guestEmail,
            guestPhone: booking.guestPhone,
            roomName,
            checkinDate: checkinIso,
        });
        if (recoveryKeys.some(key => recoveredLeadKeys.has(key))) {
            recoveredDeclines += 1;
        }

        for (const day of overlapDays) {
            const key = `${roomName}|${day}`;
            bookedCounts[key] = (bookedCounts[key] || 0) + 1;
        }
    }

    let availableRoomNights = 0;

    for (const room of manualRooms) {
        const roomName = String(room.name || '').trim();
        const totalUnits = Math.max(0, parseInt(room.totalUnits, 10) || 0);
        if (!roomName) continue;

        const overrideMap = Object.fromEntries((room.overrides || []).map(ov => [ov.date, ov]));

        for (const day of periodDays) {
            const booked = bookedCounts[`${roomName}|${day}`] || 0;
            const override = overrideMap[day];

            let sellableUnits = totalUnits;
            if (override?.closed) {
                sellableUnits = 0;
            } else if (override && override.availableUnits !== null && override.availableUnits !== undefined) {
                sellableUnits = Math.max(0, booked + (parseInt(override.availableUnits, 10) || 0));
            }

            availableRoomNights += sellableUnits;
        }
    }

    const avgRevenue = bookingCount > 0 ? totalRevenue / bookingCount : 0;
    const occupancyRate = availableRoomNights > 0
        ? Math.min(100, (nightsSold / availableRoomNights) * 100)
        : 0;

    const rooms = Object.entries(roomRevenue)
        .map(([name, rev]) => ({ name, rev: roundMoney(rev) }))
        .sort((a, b) => b.rev - a.rev || a.name.localeCompare(b.name));

    return {
        rev: roundMoney(totalRevenue),
        bookings: bookingCount,
        avg: roundMoney(avgRevenue),
        rooms,
        stats: {
            nights: nightsSold,
            occupancyRate: Math.round(occupancyRate * 10) / 10,
            payLater: payLaterCount,
            recoveredDeclines,
            availableRoomNights,
        },
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
let funnelTrackingEnabled = true;

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

const createPaymentIntentRateLimit = createRouteRateLimiter('create-payment-intent', { windowMs: 60 * 1000, max: 15 });
const createPreauthHoldRateLimit = createRouteRateLimiter('create-preauth-hold', { windowMs: 60 * 1000, max: 12 });
const completePayLaterRateLimit = createRouteRateLimiter('complete-pay-later-booking', { windowMs: 60 * 1000, max: 12 });
const publicBookingRateLimit = createRouteRateLimiter('book', { windowMs: 60 * 1000, max: 12 });
const paymentDeclinedRateLimit = createRouteRateLimiter('payment-declined', { windowMs: 60 * 1000, max: 10 });
const crmVerifyRateLimit = createRouteRateLimiter('crm-verify', { windowMs: 5 * 60 * 1000, max: 25 });

app.post('/api/create-payment-intent', createPaymentIntentRateLimit, async (req, res) => {
    const { amount, bookingDetails, guestInfo, hotelId, preview } = req.body;
    console.log('💳 create-payment-intent called. hotelId:', hotelId, 'preview:', preview);
    const amountInCents = Math.round(amount * 100);

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ error: { message: "Invalid amount provided." } });
    }

    try {
        // Skip hotel active check in preview mode (setup wizard)
        let resolvedHotelId = hotelId;
        if (!preview) {
            const hotelValidation = await getActiveHotelValidation(hotelId);
            if (!hotelValidation.ok) {
                return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
            }
            resolvedHotelId = hotelValidation.hotelId;
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: buildStripeIntentMetadata({
                bookingDetails,
                guestInfo,
                hotelId: resolvedHotelId,
            }),
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
app.post('/api/create-preauth-hold', createPreauthHoldRateLimit, async (req, res) => {
    const { bookingDetails, guestInfo, hotelId } = req.body;
    
    const noShowFeeInCents = 100; // $1.00

    try {
        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }

        // Create a PaymentIntent with manual capture
        // This places a hold on the card without charging
        const paymentIntent = await stripe.paymentIntents.create({
            amount: noShowFeeInCents,
            currency: 'usd',
            capture_method: 'manual', // 🔑 KEY: This creates a hold instead of charging
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: buildStripeIntentMetadata({
                bookingDetails,
                guestInfo,
                hotelId: hotelValidation.hotelId,
                extra: {
                    bookingType: 'payLater',
                    noShowFeeAmount: '100',
                    holdType: 'pre_authorization',
                },
            }),
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
app.post('/api/complete-pay-later-booking', completePayLaterRateLimit, async (req, res) => {
    const { paymentIntentId, guestInfo, bookingDetails, hotelId } = req.body;

    try {
        if (!paymentIntentId) {
            return res.status(400).json({ success: false, message: 'paymentIntentId is required.' });
        }

        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }

        // Verify the payment intent is authorized (not captured)
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        const paymentValidation = validateStripeIntentAgainstBooking(paymentIntent, {
            hotelId: hotelValidation.hotelId,
            bookingDetails,
            allowedStatuses: ['requires_capture', 'succeeded'],
            allowedAmountsCents: [100],
            requireManualCapture: true,
            requireHoldType: 'pre_authorization',
        });
        if (paymentValidation) {
            return res.status(400).json({ 
                success: false, 
                message: paymentValidation,
            });
        }

        // Create booking in PMS with "Pay at Hotel" status
        const holdStatus = String(paymentIntent.status || '').trim().toLowerCase() === 'succeeded' ? 'captured' : 'active';
        const config = await resolveHotelConfig(hotelValidation.hotelId);

        // BookingCenter pay-later: we still save a booking (guarantee/verification handled by $1 hold on Stripe)
        if (config.pms === 'bookingcenter') {
            const pmsResponse = await createBookingCenterBooking(hotelValidation.hotelId, bookingDetails, guestInfo);

            if (!pmsResponse.success) {
                // If booking fails, cancel the hold
                if (paymentIntent.status === 'requires_capture') {
                    await stripe.paymentIntents.cancel(paymentIntentId);
                }
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
                        hotelId: hotelValidation.hotelId,
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
                        holdStatus: holdStatus,
                        noShowFeePaid: holdStatus === 'captured',
                        holdCapturedAt: holdStatus === 'captured' ? new Date() : null
                    }
                });
                triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email);
            } catch (dbError) {
                console.error("Failed to save pay-later booking to database:", dbError);
            }

            return res.json({
                success: true,
                message: 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.reservationID
            });
        }

        // Manual PMS pay-later flow
        if (config.pms === 'manual') {
            const pmsResponse = await createManualBooking(hotelValidation.hotelId, bookingDetails);

            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.reservationID,
                        hotelId: hotelValidation.hotelId,
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
                        holdStatus: holdStatus,
                        noShowFeePaid: holdStatus === 'captured',
                        holdCapturedAt: holdStatus === 'captured' ? new Date() : null
                    }
                });
                triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email);
                // Send guest confirmation email
                const hotelForEmail = await prisma.hotelConfig.findUnique({ where: { id: hotelValidation.hotelId }, select: { name: true, phone: true } }).catch(() => null);
                const emailCode = pmsResponse.reservationID || bookingDetails.reservationCode;
                const bookingUrl = await buildGuestBookingUrl(hotelValidation.hotelId, emailCode, req);
                sendGuestConfirmationEmail({
                    guestEmail: guestInfo.email,
                    guestName: [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' '),
                    hotelName: hotelForEmail?.name || 'Your Hotel',
                    hotelPhone: hotelForEmail?.phone || '',
                    roomName: bookingDetails.name || bookingDetails.roomName,
                    checkin: bookingDetails.checkin,
                    checkout: bookingDetails.checkout,
                    nights: bookingDetails.nights,
                    total: bookingDetails.total,
                    reservationCode: emailCode,
                    bookingUrl,
                });
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
                            hotelId: hotelValidation.hotelId,
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
                            holdStatus: holdStatus,
                            noShowFeePaid: holdStatus === 'captured',
                            holdCapturedAt: holdStatus === 'captured' ? new Date() : null
                        }
                    });
                    dbSaveSuccess = true;
                    triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email);
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
            if (paymentIntent.status === 'requires_capture') {
                await stripe.paymentIntents.cancel(paymentIntentId);
            }

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
            const paymentIntent = paymentIntentId ? await stripe.paymentIntents.retrieve(paymentIntentId) : null;
            if (paymentIntent?.status === 'requires_capture') {
                await stripe.paymentIntents.cancel(paymentIntentId);
            }
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

function requireCrmAuthDeferred(req, res, next) {
    return crmAuth(req, res, next);
}

// NEW: Release pre-auth hold when guest checks in
app.post('/api/release-hold', requireCrmAuthDeferred, async (req, res) => {
    const { bookingId } = req.body;

    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, hotelId }
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

// PUBLIC: guest sends a message / special request from the booking-confirmation
// screen. We verify a matching booking exists (so randoms can't spam a hotel),
// persist it, and ping the owner's Front Desk in real time.
app.post('/api/guest-message', async (req, res) => {
    try {
        const { hotelId, reservationCode, body, requests } = req.body || {};
        const cleanCode = String(reservationCode || '').trim();
        const cleanBody = String(body || '').trim().slice(0, 2000);
        const requestList = Array.isArray(requests)
            ? requests.map((r) => String(r || '').trim()).filter(Boolean).slice(0, 10)
            : [];
        // Client-supplied contact fallback (used only when we can't match a booking).
        const fbName = String(req.body?.guestName || '').trim().slice(0, 120);
        const fbEmail = String(req.body?.guestEmail || '').trim().slice(0, 200);
        const fbPhone = String(req.body?.guestPhone || '').trim().slice(0, 40);

        if (!cleanBody && requestList.length === 0) {
            return res.status(400).json({ success: false, message: 'Message is empty.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            console.log(`💬 [guest-message] hotel invalid: ${hotelId} → ${validation.message}`);
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }
        const resolvedHotelId = validation.hotelId;

        // Try to tie the message to a real booking — but DON'T hard-fail if we can't
        // (preview/test bookings aren't persisted, and PMS codes can differ). The
        // hotel itself is validated, so this is effectively an authenticated contact
        // form; a missing match just means no linked booking.
        let booking = null;
        if (cleanCode) {
            booking = await prisma.booking.findFirst({
                where: {
                    hotelId: resolvedHotelId,
                    OR: [{ ourReservationCode: cleanCode }, { pmsConfirmationCode: cleanCode }],
                },
                select: {
                    id: true, guestFirstName: true, guestLastName: true,
                    guestEmail: true, guestPhone: true, roomName: true,
                },
            });
            if (!booking) {
                console.log(`💬 [guest-message] no booking match for hotel=${resolvedHotelId} code=${cleanCode} — accepting as contact`);
            }
        }

        const guestName = booking
            ? ([booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ').trim() || 'Guest')
            : (fbName || 'Guest');

        await prisma.guestMessage.create({
            data: {
                hotelId: resolvedHotelId,
                bookingId: booking?.id || null,
                reservationCode: cleanCode || null,
                guestName,
                guestEmail: booking?.guestEmail || fbEmail || null,
                guestPhone: booking?.guestPhone || fbPhone || null,
                roomName: booking?.roomName || null,
                body: cleanBody || null,
                requests: requestList.length ? JSON.stringify(requestList) : null,
                sender: 'guest',
            },
        });
        console.log(`💬 [guest-message] saved for hotel=${resolvedHotelId} (booking=${booking?.id || 'none'})`);

        // Notify the owner. Lead with the request chips since they're scannable.
        const preview = [requestList.join(', '), cleanBody].filter(Boolean).join(' — ').slice(0, 140);
        notifyGuestMessage(resolvedHotelId, guestName, preview, cleanCode).catch(() => {});

        res.json({ success: true });
    } catch (e) {
        console.error('guest-message error:', e.message);
        res.status(500).json({ success: false, message: 'Could not send message.' });
    }
});

// PUBLIC: guest fetches their conversation thread for a reservation.
app.get('/api/guest-messages', async (req, res) => {
    try {
        const { hotelId, code, email } = req.query;
        if (!hotelId || !code) return res.status(400).json({ success: false, message: 'Missing hotelId or code.' });

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) return res.status(validation.status || 404).json({ success: false, message: 'Property not found.' });
        const resolvedHotelId = validation.hotelId;

        const booking = await prisma.booking.findFirst({
            where: {
                hotelId: resolvedHotelId,
                OR: [
                    { ourReservationCode: String(code).trim() },
                    { pmsConfirmationCode: String(code).trim() }
                ]
            }
        });
        if (!booking) return res.json({ success: true, messages: [] });
        if (email && String(booking.guestEmail || '').toLowerCase() !== String(email).toLowerCase()) {
            return res.json({ success: true, messages: [] });
        }

        const messages = await prisma.guestMessage.findMany({
            where: { hotelId: resolvedHotelId, reservationCode: booking.ourReservationCode },
            orderBy: { createdAt: 'asc' },
            take: 200
        });

        res.json({
            success: true,
            messages: messages.map(m => ({
                id: m.id,
                body: m.body,
                sender: m.sender || 'guest',
                createdAt: m.createdAt,
                requests: m.requests ? JSON.parse(m.requests) : [],
                readAt: m.readAt
            }))
        });
    } catch (err) {
        console.error('GET /api/guest-messages error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUBLIC: look up a reservation so the guest can return to it after closing the
// app. The confirmation code is the secret (long & random); the optional email
// adds a second factor for the manual "find my reservation" form.
app.get('/api/booking/lookup', async (req, res) => {
    try {
        const hotelId = req.query.hotelId;
        const code = String(req.query.code || '').trim();
        const email = String(req.query.email || '').trim();
        if (!code) return res.status(400).json({ success: false, message: 'Confirmation code required.' });

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }
        const resolvedHotelId = validation.hotelId;

        const booking = await prisma.booking.findFirst({
            where: {
                hotelId: resolvedHotelId,
                OR: [{ ourReservationCode: code }, { pmsConfirmationCode: code }],
            },
        });
        // Same generic response whether the code or the email is wrong, to avoid
        // leaking which reservations exist.
        const notFound = () => res.status(404).json({ success: false, message: 'We couldn’t find that reservation. Check your confirmation code and email.' });
        if (!booking) return notFound();
        if (email && String(booking.guestEmail || '').toLowerCase() !== email.toLowerCase()) return notFound();

        res.json({
            success: true,
            booking: {
                reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
                guestFirstName: booking.guestFirstName,
                guestLastName: booking.guestLastName,
                guestEmail: booking.guestEmail,
                guestPhone: booking.guestPhone,
                roomName: booking.roomName,
                checkin: booking.checkinDate,
                checkout: booking.checkoutDate,
                nights: booking.nights,
                total: booking.grandTotal,
                status: booking.status,
                bookingType: booking.bookingType,
                createdAt: booking.createdAt,
            },
        });
    } catch (e) {
        console.error('booking lookup error:', e.message);
        res.status(500).json({ success: false, message: 'Lookup failed. Please try again.' });
    }
});

// NEW: Capture pre-auth hold as no-show fee
app.post('/api/capture-no-show-fee', requireCrmAuthDeferred, async (req, res) => {
    const { bookingId } = req.body;

    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, hotelId }
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

    // Auto-provision hotel when $997 payment link is completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Only process if this is from our hotel onboarding product (check metadata)
        if (session.metadata?.product === 'hotel-onboarding') {
            try {
                const email = session.customer_details?.email || session.customer_email || '';
                const hotelSlug = 'hotel-' + crypto.randomBytes(4).toString('hex');
                const setupToken = crypto.randomBytes(16).toString('hex');

                await prisma.hotelConfig.create({
                    data: {
                        id: hotelSlug,
                        name: '',
                        pms: 'manual',
                        active: false,
                        setupToken,
                        ownerEmail: email,
                        setupComplete: false,
                    }
                });

                console.log(`✅ New hotel provisioned: ${hotelSlug}, setup token: ${setupToken}, email: ${email}`);
                // TODO: Send email with setup link to customer
                // For now, log it. The customer gets redirected to /setup/:token after payment via Stripe's success_url.
            } catch (e) {
                console.error('Failed to auto-provision hotel from checkout:', e.message);
            }
        }
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
                triggerBookingNotifications(hotelId, guestName, roomName, bookingDetails.total, bookingDetails.checkin);

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
        const resolvedHotelId = config.id || hotelId;
        let availableRooms;

        if (config.pms === 'cloudbeds') {
            availableRooms = await getCloudbedsAvailability(resolvedHotelId, checkin, checkout);
        } else if (config.pms === 'bookingcenter') {
            availableRooms = await getBookingCenterAvailability(resolvedHotelId, checkin, checkout);
        } else if (config.pms === 'manual') {
            availableRooms = await getManualAvailability(resolvedHotelId, checkin, checkout);
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

app.post('/api/book', publicBookingRateLimit, async (req, res) => {
    const { hotelId, bookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (!bookingDetails?.rateID) {
        return res.status(400).json({ success: false, message: 'Invalid room name provided.' });
    }

    try {
        if (!paymentIntentId) {
            return res.status(400).json({ success: false, message: 'paymentIntentId is required.' });
        }

        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentValidation = validateStripeIntentAgainstBooking(paymentIntent, {
            hotelId: hotelValidation.hotelId,
            bookingDetails,
            allowedStatuses: ['succeeded'],
            allowedAmountsCents: getExpectedStandardChargeAmountsCents(bookingDetails),
        });
        if (paymentValidation) {
            return res.status(400).json({ success: false, message: paymentValidation });
        }

        const config = await resolveHotelConfig(hotelValidation.hotelId);
        let pmsResponse;

        if (config.pms === 'cloudbeds') {
            pmsResponse = await createCloudbedsBooking(hotelValidation.hotelId, bookingDetails, guestInfo);
        } else if (config.pms === 'bookingcenter') {
            pmsResponse = await createBookingCenterBooking(hotelValidation.hotelId, bookingDetails, guestInfo);
        } else if (config.pms === 'manual') {
            pmsResponse = await createManualBooking(hotelValidation.hotelId, bookingDetails);
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
                        hotelId: hotelValidation.hotelId,
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
                triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email);
                // Send guest confirmation email
                const hotelForEmail = await prisma.hotelConfig.findUnique({ where: { id: hotelValidation.hotelId }, select: { name: true, phone: true } }).catch(() => null);
                const emailCode = pmsResponse.reservationID || bookingDetails.reservationCode;
                const bookingUrl = await buildGuestBookingUrl(hotelValidation.hotelId, emailCode, req);
                sendGuestConfirmationEmail({
                    guestEmail: guestInfo.email,
                    guestName: [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' '),
                    hotelName: hotelForEmail?.name || 'Your Hotel',
                    hotelPhone: hotelForEmail?.phone || '',
                    roomName: bookingDetails.name || bookingDetails.roomName,
                    checkin: bookingDetails.checkin,
                    checkout: bookingDetails.checkout,
                    nights: bookingDetails.nights,
                    total: bookingDetails.total,
                    reservationCode: emailCode,
                    bookingUrl,
                });
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

    // Skip all logging if tracking is paused
    if (!funnelTrackingEnabled) {
        return res.status(200).json({ success: true, message: 'Tracking paused, event ignored.' });
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

    // Persist to database for permanent funnel analytics
    try {
        const user = enrichedPayload.user_data || {};
        const hotelId = process.env.HOTEL_ID || 'guest-lodge-minot';
        await withRetry(() => prisma.funnelEvent.create({
            data: {
                hotelId,
                eventName: event_name,
                eventId: enrichedPayload.event_id || null,
                value: parseFloat(enrichedPayload.value) || null,
                currency: enrichedPayload.currency || 'USD',
                contentName: enrichedPayload.content_name || null,
                checkinDate: enrichedPayload.checkin_date || null,
                checkoutDate: enrichedPayload.checkout_date || null,
                nights: parseInt(enrichedPayload.nights, 10) || null,
                guestFirstName: user.fn || null,
                guestLastName: user.ln || null,
                guestEmail: user.em || null,
                guestPhone: user.ph || null,
                externalId: user.external_id || null,
                userAgent: enrichedPayload.user_agent || null,
                ipAddress: enrichedPayload.client_ip_address || null,
            }
        }));
    } catch (e) {
        console.error('Failed to persist FunnelEvent:', e.message);
    }
    // double-notification removed: if (event_name === 'Purchase') notifyPurchase().catch(() => {});

    // Send directly to Meta CAPI — no middleman needed
    sendToMetaCAPI(event_name, enrichedPayload).catch(err => {
        console.error(`Meta CAPI background send failed for ${event_name}:`, err.message);
    });

    res.status(200).json({ success: true, message: 'Event tracked.' });
});

// --- Payment declined leads (for front desk to call) ---
app.post('/api/payment-declined', paymentDeclinedRateLimit, async (req, res) => {
    try {
        const { guestInfo, bookingDetails, errorCode, errorDeclineCode, errorMessage, hotelId, paymentMethod } = req.body;
        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }
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
                hotelId: hotelValidation.hotelId,
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
        notifyPaymentDeclined(hotelValidation.hotelId, guestInfo, bookingDetails, errorMessage).catch((err) => {
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
    return queryHotel || bodyHotel || req.crmResolvedHotelId || req.crmDefaultHotelId || DEFAULT_CRM_HOTEL_ID;
}

function resolveScopedHotelId(req, { allowFallback = true } = {}) {
    const queryHotel = String(req.query?.hotelId || '').trim();
    const bodyHotel = String(req.body?.hotelId || '').trim();
    const requested = queryHotel || bodyHotel;
    const allowed = Array.isArray(req.crmAllowedHotels) ? req.crmAllowedHotels : [];
    const resolvedHotelId = String(req.crmResolvedHotelId || '').trim();
    if (!allowed.length) return null;
    if (resolvedHotelId) {
        if (!allowed.includes(resolvedHotelId)) return null;
        if (requested && requested !== resolvedHotelId) return null;
        return resolvedHotelId;
    }
    if (requested && allowed.includes(requested)) return requested;
    return allowFallback ? (req.crmDefaultHotelId || allowed[0]) : null;
}

function requireScopedHotelId(req, res) {
    const requested = String(req.query?.hotelId || req.body?.hotelId || '').trim();
    const resolvedHotelId = String(req.crmResolvedHotelId || '').trim();
    const hotelId = resolveScopedHotelId(req, { allowFallback: false });
    if (hotelId) return hotelId;
    res.status(403).json({
        success: false,
        message: resolvedHotelId && requested && requested !== resolvedHotelId
            ? `Unauthorized hotel context: ${requested}. This domain is locked to ${resolvedHotelId}.`
            : requested
                ? `Unauthorized hotel context: ${requested}`
                : resolvedHotelId
                    ? `PIN is not authorized for hotel: ${resolvedHotelId}`
            : 'Missing authorized hotel context.',
    });
    return null;
}

const crmAuth = async (req, res, next) => {
    const token = (req.headers['x-crm-token'] || req.query.token || '').toString().trim();
    const dbAllowedHotels = await getDbAllowedHotelsForToken(token).catch(() => []);
    const allowedHotels = dbAllowedHotels.length ? dbAllowedHotels : (CRM_TOKEN_HOTELS_MAP[token] || []);
    if (!token || !allowedHotels?.length) return res.status(401).json({ error: 'Unauthorized' });
    const hostContext = await resolveCrmHostHotelContext(req);
    if (!hostContext.ok) {
        return res.status(hostContext.status).json({
            success: false,
            message: hostContext.message,
            domain: hostContext.domain || null,
        });
    }
    if (hostContext.hotelId && !allowedHotels.includes(hostContext.hotelId)) {
        return res.status(403).json({
            success: false,
            message: `PIN is not authorized for hotel: ${hostContext.hotelId}`,
            hotelId: hostContext.hotelId,
        });
    }
    req.crmToken = token;
    req.crmAllowedHotels = allowedHotels;
    req.crmResolvedHotelId = hostContext.hotelId || null;
    req.crmResolvedDomain = hostContext.domain || null;
    req.crmDefaultHotelId = hostContext.hotelId || allowedHotels[0];
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
        .split(',')[0].trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');
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
    const context = await resolveHotelDomainContext(clean);
    return context.status === 'mapped' ? context.hotelId : null;
}

function isLocalDevelopmentHost(domain) {
    const clean = normalizeDomain(domain);
    return !clean
        || clean === 'localhost'
        || clean === '127.0.0.1'
        || clean === '::1'
        || clean === '[::1]'
        || clean.endsWith('.onrender.com')
        || clean.endsWith('.vercel.app');
}

function getRequestContextDomain(req, { preferQueryDomain = true } = {}) {
    if (preferQueryDomain) {
        const requestedDomain = normalizeDomain(req.query?.domain || '');
        if (requestedDomain) return requestedDomain;
    }
    const forwardedHost = normalizeDomain(req.headers['x-forwarded-host'] || '');
    if (forwardedHost) return forwardedHost;
    return normalizeDomain(req.hostname || '');
}

async function getHotelOverrideStatus(hotelId) {
    const cleanHotelId = String(hotelId || '').trim();
    if (!cleanHotelId) return { status: 'invalid' };

    if (prisma.hotelConfig) {
        const row = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: cleanHotelId },
            select: { id: true, active: true },
        }));
        if (row) {
            return row.active
                ? { status: 'ok', hotelId: cleanHotelId, source: 'db' }
                : { status: 'inactive', hotelId: cleanHotelId, source: 'db' };
        }
    }

    try {
        getStaticHotelConfig(cleanHotelId);
        return { status: 'ok', hotelId: cleanHotelId, source: 'static' };
    } catch (err) {
        return { status: 'invalid' };
    }
}

async function resolveHotelDomainContext(domain) {
    const clean = normalizeDomain(domain);
    if (!clean) return { status: 'unmapped', domain: clean };
    if (!prisma.hotelDomain) return { status: 'unmapped', domain: clean };

    const cached = hotelDomainCache.get(clean);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const row = await withRetry(() => prisma.hotelDomain.findUnique({
        where: { domain: clean },
        select: { hotelId: true, hotel: { select: { active: true } } },
    }));

    const value = !row
        ? { status: 'unmapped', domain: clean }
        : row.hotel?.active
            ? { status: 'mapped', domain: clean, hotelId: row.hotelId }
            : { status: 'inactive', domain: clean, hotelId: row.hotelId };

    hotelDomainCache.set(clean, {
        value,
        expiresAt: Date.now() + HOTEL_DOMAIN_CACHE_TTL_MS,
    });
    return value;
}

async function resolveHotelContextRequest(req) {
    const explicitHotelId = String(req.query?.hotelId || '').trim();
    const requestedDomain = getRequestContextDomain(req, { preferQueryDomain: true });

    if (explicitHotelId) {
        if (!isLocalDevelopmentHost(requestedDomain)) {
            return {
                ok: false,
                status: 400,
                message: 'hotelId override is allowed only on localhost/dev requests.',
                domain: requestedDomain,
            };
        }

        const override = await getHotelOverrideStatus(explicitHotelId);
        if (override.status === 'inactive') {
            return {
                ok: false,
                status: 403,
                message: `Hotel override is inactive: ${explicitHotelId}`,
                domain: requestedDomain,
                hotelId: explicitHotelId,
            };
        }
        if (override.status !== 'ok') {
            return {
                ok: false,
                status: 400,
                message: `Invalid hotel override: ${explicitHotelId}`,
                domain: requestedDomain,
            };
        }
        return {
            ok: true,
            hotelId: explicitHotelId,
            domain: requestedDomain,
            source: 'override',
        };
    }

    if (isLocalDevelopmentHost(requestedDomain)) {
        return {
            ok: false,
            status: 400,
            message: 'Local development requires ?hotelId=... to resolve hotel context.',
            domain: requestedDomain,
        };
    }

    const resolved = await resolveHotelDomainContext(requestedDomain);
    if (resolved.status === 'inactive') {
        return {
            ok: false,
            status: 403,
            message: 'This domain is linked to an inactive hotel.',
            domain: requestedDomain,
            hotelId: resolved.hotelId,
        };
    }
    if (resolved.status !== 'mapped') {
        return {
            ok: false,
            status: 404,
            message: 'This domain is not linked to a hotel.',
            domain: requestedDomain,
        };
    }

    return {
        ok: true,
        hotelId: resolved.hotelId,
        domain: requestedDomain,
        source: 'domain',
    };
}

async function resolveCrmHostHotelContext(req) {
    const requestedDomain = getRequestContextDomain(req, { preferQueryDomain: false });
    if (isLocalDevelopmentHost(requestedDomain)) {
        return { ok: true, hotelId: null, domain: requestedDomain, source: 'local' };
    }

    const resolved = await resolveHotelDomainContext(requestedDomain);
    if (resolved.status === 'inactive') {
        return {
            ok: false,
            status: 403,
            message: 'This domain is linked to an inactive hotel.',
            domain: requestedDomain,
            hotelId: resolved.hotelId,
        };
    }
    if (resolved.status !== 'mapped') {
        const explicitHotelId = String(req.query?.hotelId || req.body?.hotelId || '').trim();
        if (explicitHotelId) {
            return {
                ok: true,
                hotelId: null,
                domain: requestedDomain,
                source: 'explicit-fallback',
            };
        }
        return {
            ok: false,
            status: 404,
            message: 'This domain is not linked to a hotel.',
            domain: requestedDomain,
        };
    }

    return {
        ok: true,
        hotelId: resolved.hotelId,
        domain: requestedDomain,
        source: 'domain',
    };
}

app.get('/api/hotel-context', async (req, res) => {
    try {
        const context = await resolveHotelContextRequest(req);
        if (!context.ok) {
            return res.status(context.status).json({
                success: false,
                message: context.message,
                domain: context.domain || null,
                hotelId: context.hotelId || null,
            });
        }

        const hotelId = context.hotelId;

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
                domain: context.domain || null,
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
        clearHotelDomainCache();
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
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
                data: { p256dh, auth, source: subSource, hotelId },
            });
        } else {
            console.log('Creating new subscription...');
            await prisma.pushSubscription.create({
                data: { endpoint, p256dh, auth, source: subSource, hotelId },
            });
        }
        console.log('Subscription saved successfully');
        res.json({ ok: true });
    } catch (e) {
        console.error('Push subscribe error FULL:', e);
        res.status(500).json({ error: e.message });
    }
});

// PWA push: send a test notification to this hotel's subscribed devices
app.post('/api/push/test', crmAuth, async (req, res) => {
    try {
        if (!VAPID_PRIVATE) return res.status(503).json({ success: false, message: 'Push not configured' });
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const subs = await prisma.pushSubscription.findMany({ where: { hotelId } });
        if (!subs.length) return res.json({ success: false, message: 'No subscribed devices yet' });
        const payload = JSON.stringify({
            title: 'Notifications are on ✅',
            body: "This is how you'll be alerted when a guest books.",
            url: '/frontdesk',
            icon: '/icon-192.png',
        });
        const results = await Promise.allSettled(subs.map((s) =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 60 }
            )
        ));
        await cleanupPushResults(subs, results, 'push/test');
        const sent = results.filter((r) => r.status === 'fulfilled').length;
        res.json({ success: sent > 0, sent, failed: results.length - sent });
    } catch (e) {
        console.error('push/test error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

const BIG_BOOKING_USD = Number(process.env.BIG_BOOKING_USD || 250);

function isCancelledStatus(s) {
    const v = String(s || '').toLowerCase();
    return v === 'cancelled' || v === 'canceled';
}

// Generic push sender for one hotel: loads subs, sends, self-heals dead ones,
// and returns how many were delivered. All owner notifications funnel through this.
async function sendPushToHotel(hotelId, payloadObj, opts = {}, label = 'push') {
    if (!VAPID_PRIVATE) { console.log(`🔕 [push] ${label} skipped — VAPID not configured (hotel=${hotelId})`); return 0; }
    if (!hotelId) { console.log(`🔕 [push] ${label} skipped — no hotelId`); return 0; }
    const subs = await prisma.pushSubscription.findMany({ where: { hotelId } });
    if (subs.length === 0) { console.log(`🔔 [push] ${label} hotel=${hotelId}: 0 subscriptions`); return 0; }
    const payload = JSON.stringify(payloadObj);
    const results = await Promise.allSettled(subs.map((s) =>
        webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            Object.assign({ TTL: 600 }, opts)
        )
    ));
    await cleanupPushResults(subs, results, label);
    return results.filter((r) => r.status === 'fulfilled').length;
}

const MONTHLY_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

// Notify the owner of a new booking. The copy adapts to context so the alert is
// genuinely useful at a glance: first sale of the day, a big-ticket booking, a
// returning guest, or a same-day arrival each get their own framing. Also fires a
// separate 🏆 milestone alert when the hotel crosses a monthly bookings threshold.
async function notifyNewBooking(hotelId, guestName, roomName, grandTotal, checkinIso = '', guestEmail = '') {
    if (!VAPID_PRIVATE || !hotelId) { console.log(`🔕 [push] new booking skipped (vapid=${!!VAPID_PRIVATE}, hotel=${hotelId})`); return; }
    try {
        const amount = (grandTotal !== undefined && grandTotal !== null) ? Number(grandTotal) : null;
        const todayIso = getReportingTodayIso();
        const monthPrefix = todayIso.slice(0, 7); // YYYY-MM

        // Pull this month's bookings once and derive both "first today" and the
        // running monthly count (this booking is already saved).
        let isFirstToday = false;
        let monthCount = null;
        try {
            const monthStart = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
            const monthly = await prisma.booking.findMany({
                where: { hotelId, createdAt: { gte: monthStart } },
                select: { createdAt: true, status: true },
            });
            const active = monthly.filter((b) => !isCancelledStatus(b.status));
            isFirstToday = active.filter((b) => normalizeIsoDate(b.createdAt) === todayIso).length <= 1;
            monthCount = active.filter((b) => normalizeIsoDate(b.createdAt).startsWith(monthPrefix)).length;
        } catch (_) {}

        // Returning guest? Match prior bookings for this hotel by email.
        let isReturning = false;
        if (guestEmail) {
            try {
                const priorSame = await prisma.booking.count({
                    where: { hotelId, guestEmail: { equals: guestEmail, mode: 'insensitive' } },
                });
                isReturning = priorSame >= 2; // includes the one just created
            } catch (_) {}
        }

        const arrivesToday = checkinIso && normalizeIsoDate(checkinIso) === todayIso;
        const isBig = amount !== null && amount >= BIG_BOOKING_USD;

        let title = '🛎️ New booking';
        if (isFirstToday) title = '🎉 First booking today!';
        else if (isBig) title = '💰 Big booking!';

        let bodyText = '';
        if (guestName) bodyText += guestName;
        if (roomName) bodyText += (bodyText ? ` · ${roomName}` : roomName);
        if (amount !== null) bodyText += ` · $${amount.toFixed(2)}`;
        if (isReturning) bodyText += ' · returning guest 🔁';
        if (arrivesToday) bodyText += ' · arrives today ⚡';
        if (!bodyText) bodyText = 'A new booking just came in.';

        const sent = await sendPushToHotel(hotelId, {
            title, body: bodyText, url: '/frontdesk', icon: '/icon-192.png',
        }, { TTL: 60 }, 'notifyNewBooking');
        console.log(`🔔 [push] new booking hotel=${hotelId} sent=${sent} "${title}"`);

        // Monthly milestone — fires once, exactly when the count lands on a threshold.
        if (monthCount !== null && MONTHLY_MILESTONES.includes(monthCount)) {
            await sendPushToHotel(hotelId, {
                title: '🏆 Milestone reached!',
                body: `${monthCount} bookings this month — keep it going!`,
                url: '/frontdesk',
                icon: '/icon-192.png',
            }, { TTL: 6 * 60 * 60 }, 'milestone');
        }
    } catch (e) {
        console.error('notifyNewBooking:', e.message);
    }
}

// Inspect the outcome of a batch of webpush sends: log success/failure counts and
// delete subscriptions the push service reports as gone (404/410), so the table
// self-heals after key rotations or when a user uninstalls the app.
async function cleanupPushResults(subs, results, label) {
    let sent = 0;
    const deadIds = [];
    results.forEach((r, i) => {
        if (r.status === 'fulfilled') { sent++; return; }
        const code = r.reason && r.reason.statusCode;
        if (code === 404 || code === 410) {
            deadIds.push(subs[i].id);
        } else {
            console.error(`⚠️ [push] ${label} send failed (status=${code || '?'}):`, r.reason && r.reason.body ? r.reason.body : (r.reason && r.reason.message));
        }
    });
    console.log(`📨 [push] ${label}: ${sent} sent, ${results.length - sent} failed, ${deadIds.length} stale removed`);
    if (deadIds.length) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } }).catch((e) => console.error('push cleanup:', e.message));
    }
}

const soldOutTodayNotificationState = new Map();

function soldOutTodayKey(hotelId, roomName, dateIso) {
    return `${String(hotelId || '').trim()}|${normalizeRevenueRoom(roomName)}|${dateIso}`;
}

async function getManualRoomTodayAvailability(hotelId, roomName, referenceIso = '') {
    const normalizedRequestedRoom = normalizeRevenueRoom(roomName);
    if (!hotelId || !normalizedRequestedRoom) return { tracked: false };
    if (!prisma.manualRoom || !prisma.manualOverride) return { tracked: false };

    const todayIso = normalizeIsoDate(referenceIso) || getReportingTodayIso();
    const rooms = await withRetry(() => prisma.manualRoom.findMany({
        where: { hotelId },
        include: {
            overrides: {
                where: { date: todayIso },
                select: { availableUnits: true, closed: true },
                take: 1,
            },
        },
    }));
    const room = rooms.find((r) => normalizeRevenueRoom(r.name) === normalizedRequestedRoom);
    if (!room) return { tracked: false };

    const override = (room.overrides || [])[0] || null;
    const baseUnits = Math.max(0, parseInt(room.totalUnits, 10) || 0);
    const effectiveCapacity = override?.closed
        ? 0
        : (override && override.availableUnits !== null && override.availableUnits !== undefined
            ? Math.max(0, parseInt(override.availableUnits, 10) || 0)
            : baseUnits);

    const dayStart = new Date(`${todayIso}T00:00:00.000Z`);
    const dayEndExclusive = new Date(`${addDaysToIso(todayIso, 1)}T00:00:00.000Z`);
    const todayBookings = await withRetry(() => prisma.booking.findMany({
        where: {
            hotelId,
            checkinDate: { lt: dayEndExclusive },
            checkoutDate: { gt: dayStart },
        },
        select: { roomName: true, status: true },
    }));

    const bookedCount = todayBookings.filter((b) => {
        const sameRoom = normalizeRevenueRoom(b.roomName) === normalizeRevenueRoom(room.name);
        if (!sameRoom) return false;
        const status = String(b.status || '').trim().toLowerCase();
        return status !== 'cancelled' && status !== 'canceled';
    }).length;

    return {
        tracked: true,
        roomName: room.name,
        todayIso,
        availableUnits: Math.max(0, effectiveCapacity - bookedCount),
    };
}

async function notifyRoomSoldOutToday(hotelId, roomName) {
    if (!VAPID_PRIVATE || !hotelId || !roomName) return;
    try {
        const subs = await prisma.pushSubscription.findMany({ where: { hotelId } });
        if (subs.length === 0) return;

        const payload = JSON.stringify({
            title: 'Sold Out Tonight! 🎉',
            body: `${roomName} is SOLD OUT for tonight on your website. Let’s go!`,
            url: '/frontdesk',
            icon: '/marketellogo.svg',
            tag: `soldout-${slugifyText(roomName)}`,
        });

        await Promise.allSettled(subs.map((s) =>
            webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 120, urgency: 'high' }
            )
        ));
    } catch (e) {
        console.error('notifyRoomSoldOutToday:', e.message);
    }
}

async function maybeNotifyRoomSoldOutToday(hotelId, roomName, referenceIso = '') {
    try {
        const todayIso = getReportingTodayIso();
        const targetIso = normalizeIsoDate(referenceIso) || todayIso;
        if (targetIso !== todayIso) return;

        const snapshot = await getManualRoomTodayAvailability(hotelId, roomName, targetIso);
        if (!snapshot.tracked) return;
        const key = soldOutTodayKey(hotelId, snapshot.roomName, snapshot.todayIso);
        const wasSent = soldOutTodayNotificationState.get(key) === true;
        const isSoldOut = snapshot.availableUnits <= 0;

        if (isSoldOut && !wasSent) {
            await notifyRoomSoldOutToday(hotelId, snapshot.roomName);
            soldOutTodayNotificationState.set(key, true);
            return;
        }
        if (!isSoldOut && wasSent) {
            soldOutTodayNotificationState.delete(key);
        }
    } catch (e) {
        console.error('maybeNotifyRoomSoldOutToday:', e.message);
    }
}

function triggerBookingNotifications(hotelId, guestName, roomName, grandTotal, checkinIso = '', guestEmail = '') {
    notifyNewBooking(hotelId, guestName, roomName, grandTotal, checkinIso, guestEmail).catch(() => {});
    maybeNotifyRoomSoldOutToday(hotelId, roomName, checkinIso).catch(() => {});
}

// Notify the owner that a guest messaged them from the confirmation screen.
async function notifyGuestMessage(hotelId, guestName, preview, reservationCode = '') {
    if (!VAPID_PRIVATE || !hotelId) return;
    try {
        const tag = reservationCode ? ` · #${reservationCode}` : '';
        const sent = await sendPushToHotel(hotelId, {
            title: `💬 Message from ${guestName || 'a guest'}`,
            body: (preview || 'Tap to read').slice(0, 160) + tag,
            url: '/frontdesk?tab=bookings',
            icon: '/icon-192.png',
        }, { TTL: 60 * 60 }, 'guestMessage');
        console.log(`💬 [push] guest message hotel=${hotelId} sent=${sent}`);
    } catch (e) {
        console.error('notifyGuestMessage:', e.message);
    }
}

// ── DAILY MORNING DIGEST ───────────────────────────────────────────────
// Once a day, owners get a "good morning" summary: who's arriving today plus how
// yesterday performed. Gives the app a reason to be useful beyond live alerts.
const DIGEST_HOUR = Number(process.env.DIGEST_HOUR || 8);  // morning digest, local hour
const RECAP_HOUR = Number(process.env.RECAP_HOUR || 20);   // evening recap, local hour
const QUIET_NUDGE_DAYS = Number(process.env.QUIET_NUDGE_DAYS || 4); // streak + cooldown

function getReportingHour() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: REPORT_TIME_ZONE, hour: '2-digit', hour12: false }).formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === 'hour');
    return (parseInt(hourPart && hourPart.value, 10) || 0) % 24;
}

function getReportingIsoOffset(dayOffset) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000));
    const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${m.year}-${m.month}-${m.day}`;
}
function getReportingYesterdayIso() { return getReportingIsoOffset(-1); }
function getReportingTomorrowIso() { return getReportingIsoOffset(1); }

// Per-hotel cooldown so the "quiet" nudge never fires more than once every few days.
const lastQuietNudge = new Map();

async function sendHotelDigest(hotelId) {
    const todayIso = getReportingTodayIso();
    const yesterdayIso = getReportingYesterdayIso();
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const bookings = await prisma.booking.findMany({
        where: { hotelId, OR: [{ checkinDate: { gte: since } }, { createdAt: { gte: since } }] },
        select: { checkinDate: true, createdAt: true, grandTotal: true, status: true, guestFirstName: true, guestLastName: true },
    });
    const active = bookings.filter((b) => !isCancelledStatus(b.status));
    const arrivals = active.filter((b) => normalizeIsoDate(b.checkinDate) === todayIso);
    const yesterdayBookings = active.filter((b) => normalizeIsoDate(b.createdAt) === yesterdayIso);
    // Nothing to report → instead of going silent, consider a gentle re-engagement
    // nudge if it's been a genuinely quiet stretch (with a cooldown so it's rare).
    if (arrivals.length === 0 && yesterdayBookings.length === 0) {
        await maybeSendQuietNudge(hotelId, active);
        return 0;
    }

    const yRevenue = yesterdayBookings.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
    const lines = [];
    if (arrivals.length) {
        const names = arrivals
            .map((a) => [a.guestFirstName, a.guestLastName].filter(Boolean).join(' ').trim() || 'Guest')
            .slice(0, 3);
        lines.push(`🛎️ ${arrivals.length} arriving today: ${names.join(', ')}${arrivals.length > names.length ? '…' : ''}`);
    } else {
        lines.push('🛎️ No check-ins today');
    }
    if (yesterdayBookings.length) {
        lines.push(`📈 Yesterday: ${yesterdayBookings.length} booking${yesterdayBookings.length > 1 ? 's' : ''} · $${yRevenue.toFixed(0)}`);
    }

    return sendPushToHotel(hotelId, {
        title: '☀️ Good morning',
        body: lines.join('\n'),
        url: '/frontdesk',
        icon: '/icon-192.png',
    }, { TTL: 6 * 60 * 60 }, 'dailyDigest');
}

// 😴 Quiet nudge: only when the hotel has had ZERO bookings for QUIET_NUDGE_DAYS,
// and at most once per cooldown window, so it encourages action without nagging.
async function maybeSendQuietNudge(hotelId, recentActiveBookings) {
    const todayIso = getReportingTodayIso();
    const cutoffIso = getReportingIsoOffset(-QUIET_NUDGE_DAYS);
    const hadRecent = (recentActiveBookings || []).some((b) => {
        const created = normalizeIsoDate(b.createdAt);
        return created && created > cutoffIso;
    });
    if (hadRecent) return 0; // not actually quiet
    const last = lastQuietNudge.get(hotelId);
    if (last && last > cutoffIso) return 0; // already nudged recently
    lastQuietNudge.set(hotelId, todayIso);
    return sendPushToHotel(hotelId, {
        title: '😴 Quiet stretch',
        body: 'No bookings in a few days. Share your booking link to fill rooms →',
        url: '/frontdesk?tab=settings',
        icon: '/icon-192.png',
    }, { TTL: 6 * 60 * 60 }, 'quietNudge');
}

// 🌙 Evening recap: end-of-day wrap with today's performance + tomorrow's arrivals.
async function sendHotelRecap(hotelId) {
    const todayIso = getReportingTodayIso();
    const tomorrowIso = getReportingTomorrowIso();
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const bookings = await prisma.booking.findMany({
        where: { hotelId, OR: [{ checkinDate: { gte: since, lte: until } }, { createdAt: { gte: since } }] },
        select: { checkinDate: true, createdAt: true, grandTotal: true, status: true },
    });
    const active = bookings.filter((b) => !isCancelledStatus(b.status));
    const todayBookings = active.filter((b) => normalizeIsoDate(b.createdAt) === todayIso);
    const tomorrowArrivals = active.filter((b) => normalizeIsoDate(b.checkinDate) === tomorrowIso);
    // Only recap days where something actually happened.
    if (todayBookings.length === 0) return 0;

    const revenue = todayBookings.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
    const lines = [`📊 Today: ${todayBookings.length} booking${todayBookings.length > 1 ? 's' : ''} · $${revenue.toFixed(0)}`];
    if (tomorrowArrivals.length) {
        lines.push(`🛎️ ${tomorrowArrivals.length} arriving tomorrow`);
    }
    return sendPushToHotel(hotelId, {
        title: '🌙 Today’s recap',
        body: lines.join('\n'),
        url: '/frontdesk',
        icon: '/icon-192.png',
    }, { TTL: 6 * 60 * 60 }, 'eveningRecap');
}

// Run a per-hotel job across every hotel that has at least one subscriber.
async function forEachSubscribedHotel(label, fn) {
    if (!VAPID_PRIVATE) return;
    const subs = await prisma.pushSubscription.findMany({ select: { hotelId: true } });
    const hotelIds = [...new Set(subs.map((s) => s.hotelId).filter(Boolean))];
    if (!hotelIds.length) return;
    console.log(`⏰ [push] running ${label} for ${hotelIds.length} hotel(s)`);
    for (const hotelId of hotelIds) {
        try { await fn(hotelId); } catch (e) { console.error(`${label}`, hotelId, e.message); }
    }
}

const sendDailyDigests = () => forEachSubscribedHotel('morning digest', sendHotelDigest);
const sendEveningRecaps = () => forEachSubscribedHotel('evening recap', sendHotelRecap);

let lastDigestDate = '';
let lastRecapDate = '';
setInterval(() => {
    try {
        const hour = getReportingHour();
        const today = getReportingTodayIso();
        if (hour === DIGEST_HOUR && lastDigestDate !== today) {
            lastDigestDate = today;
            sendDailyDigests().catch((e) => console.error('morning digest:', e.message));
        }
        if (hour === RECAP_HOUR && lastRecapDate !== today) {
            lastRecapDate = today;
            sendEveningRecaps().catch((e) => console.error('evening recap:', e.message));
        }
    } catch (_) {}
}, 5 * 60 * 1000);

// Support for old notifyPurchase is removed to prevent double notifications


// Notify about payment declined leads (URGENT - call within 60 seconds!)
async function notifyPaymentDeclined(hotelId, guestInfo, bookingDetails, errorMessage) {
    if (!VAPID_PRIVATE || !hotelId) return;
    try {
        const subs = await prisma.pushSubscription.findMany({ where: { hotelId } });
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
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'payment-declined',
            requireInteraction: true, // Keeps notification visible until dismissed
            vibrate: [200, 100, 200, 100, 200], // Longer vibration pattern
            data: {
                url: '/frontdesk',
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

// /crm redirects to /frontdesk (crm.html removed)
app.get('/crm', (req, res) => {
    res.redirect(301, '/frontdesk');
});

// Serve Simple CRM HTML (for front desk)
app.get('/frontdesk', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-crm.html'));
});

// Serve front desk demo (for setup wizard preview)
app.get('/frontdesk-demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontdesk-demo.html'));
});

// Legacy route redirect
app.get('/simple-crm', (req, res) => {
    res.redirect(301, '/frontdesk');
});

// Simple CRM API: Mark booking as confirmed
app.post('/api/crm/bookings/:id/confirm', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId },
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        
        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }
        
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId },
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const now = new Date();
        const dates = [
            new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
            new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // +4 days
            new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 days
            new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // +5 days
            new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // +6 days
            new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000), // +11 days
            new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
            new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // +6 days
        ];
        
        const dummyBookings = [
            {
                hotelId,
                guestFirstName: 'John',
                guestLastName: 'Smith',
                guestEmail: 'john.smith@example.com',
                guestPhone: '(555) 123-4567',
                roomName: 'King Room',
                checkinDate: dates[0],
                checkoutDate: dates[1],
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
                checkinDate: dates[2],
                checkoutDate: dates[3],
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
                checkinDate: dates[4],
                checkoutDate: dates[5],
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
                checkinDate: dates[6],
                checkoutDate: dates[7],
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

// Onboarding funnel tracking (landing page + setup wizard)
app.post('/api/funnel/onboarding', async (req, res) => {
    if (!funnelTrackingEnabled) return res.json({ success: true });
    try {
        const { eventName, email, userAgent, ip, referrer, contentName } = req.body;
        if (!eventName) return res.status(400).json({ success: false });
        await prisma.funnelEvent.create({
            data: {
                hotelId: 'marketel-onboarding',
                eventName,
                guestEmail: email || null,
                userAgent: userAgent || req.headers['user-agent'] || null,
                ipAddress: ip || req.ip || req.socket?.remoteAddress || null,
                contentName: contentName || referrer || null,
            },
        });
        // Fire CAPI for Qualead events
        if (eventName === 'Qualead') {
            const { fbp: qFbp, fbc: qFbc } = getMetaCookies(req);
            sendMarketelCAPI('Qualead', {
                email: email || '',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                sourceUrl: req.headers.referer || '',
                fbp: qFbp,
                fbc: qFbc,
            });
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Onboarding funnel event error:', e.message);
        res.json({ success: true }); // Don't fail silently
    }
});

// Funnel dashboard API (no auth required)
app.get('/api/funnel', async (req, res) => {
    try {
        let since, until;

        if (req.query.from && req.query.to) {
            since = new Date(req.query.from + 'T00:00:00.000Z');
            until = new Date(req.query.to + 'T23:59:59.999Z');
            if (isNaN(since) || isNaN(until)) {
                return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
            }
        } else {
            const daysBack = parseInt(req.query.days) || 7;
            until = new Date();
            since = new Date();
            since.setDate(since.getDate() - daysBack);
            since.setHours(0, 0, 0, 0);
        }

        // Filter by source: 'onboarding' shows marketel funnel, default shows booking engine
        const source = req.query.source || 'all';
        const where = { createdAt: { gte: since, lte: until } };
        if (source === 'onboarding') where.hotelId = 'marketel-onboarding';
        else if (source === 'bookings') where.hotelId = { not: 'marketel-onboarding' };

        const events = await withRetry(() => prisma.funnelEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 500,
        }));

        const counts = {};
        events.forEach(e => { counts[e.eventName] = (counts[e.eventName] || 0) + 1; });

        const recent = events.map(e => ({
            event_name: e.eventName,
            timestamp: e.createdAt.getTime(),
            event_id: e.eventId,
            value: e.value,
            content_name: e.contentName,
            checkin_date: e.checkinDate,
            checkout_date: e.checkoutDate,
            nights: e.nights,
            guest_first_name: e.guestFirstName,
            guest_last_name: e.guestLastName,
            guest_email: e.guestEmail,
            guest_phone: e.guestPhone,
            user_agent: e.userAgent,
            ip_address: e.ipAddress,
            external_id: e.externalId,
        }));

        res.json({ counts, recent });
    } catch (e) {
        console.error('Funnel API error:', e.message);
        res.json({ counts: {}, recent: [] });
    }
});

// Delete a funnel event
app.delete('/api/funnel/events', async (req, res) => {
    try {
        const { eventId, timestamp } = req.body;
        if (!eventId && !timestamp) {
            return res.status(400).json({ success: false, message: 'eventId or timestamp required' });
        }

        // Try to find by eventId first, fall back to timestamp
        let where = {};
        if (eventId) {
            where.eventId = eventId;
        } else {
            // Match by createdAt within 1 second of the timestamp
            const ts = new Date(timestamp);
            const tsEnd = new Date(timestamp + 1000);
            where.createdAt = { gte: ts, lt: tsEnd };
        }

        const deleted = await withRetry(() => prisma.funnelEvent.deleteMany({ where }));
        res.json({ success: true, deleted: deleted.count });
    } catch (e) {
        console.error('Delete funnel event error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
});

// Funnel tracking toggle
app.get('/api/funnel/tracking', (req, res) => {
    res.json({ enabled: funnelTrackingEnabled });
});

app.post('/api/funnel/tracking', (req, res) => {
    funnelTrackingEnabled = req.body.enabled !== false;
    console.log(`Funnel tracking ${funnelTrackingEnabled ? 'enabled' : 'paused'}`);
    res.json({ success: true, enabled: funnelTrackingEnabled });
});

// Meta Ads insights for funnel dashboard (no auth required)
app.get('/api/meta-insights', async (req, res) => {
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

// Serve landing page
app.get('/landing', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// Privacy & Terms
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});
app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

// Root serves landing page too (for bookmarketel.com)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// ── SELF-SERVE SETUP ──────────────────────────────────────────

// Start free setup — create hotel and redirect to wizard (no payment needed)
app.post('/api/setup/start', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        const hotelSlug = 'hotel-' + crypto.randomBytes(4).toString('hex');
        const setupToken = crypto.randomBytes(16).toString('hex');

        await prisma.hotelConfig.create({
            data: {
                id: hotelSlug,
                name: '',
                pms: 'manual',
                active: false,
                setupToken,
                ownerEmail: email.trim().toLowerCase(),
                setupComplete: false,
            }
        });

        console.log(`✅ Free setup started: ${hotelSlug}, token: ${setupToken}, email: ${email}`);
        // Meta CAPI: Lead event
        const { fbp: cookieFbp, fbc: cookieFbc } = getMetaCookies(req);
        sendMarketelCAPI('Lead', {
            email,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.socket?.remoteAddress,
            sourceUrl: req.headers.referer || req.headers.origin || '',
            fbp: req.body.fbp || cookieFbp,
            fbc: req.body.fbc || cookieFbc,
        });
        res.json({ success: true, setupUrl: '/setup/' + setupToken, token: setupToken });
    } catch (e) {
        console.error('Start setup error:', e.message);
        res.status(500).json({ error: 'Failed to start setup' });
    }
});

// Serve setup wizard
app.get('/setup/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'setup.html'));
});

// Post-payment redirect: look up setup token by Stripe session
app.get('/setup-redirect', async (req, res) => {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.redirect('/');
    try {
        // Find the hotel created by the webhook for this session
        // The webhook fires before the redirect, so the hotel should exist
        // Look for the most recently created hotel with the customer's email
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const email = session.customer_details?.email || session.customer_email;
        if (!email) return res.redirect('/');

        const hotel = await prisma.hotelConfig.findFirst({
            where: { ownerEmail: email, setupComplete: false },
            orderBy: { createdAt: 'desc' },
        });
        if (hotel?.setupToken) {
            return res.redirect('/setup/' + hotel.setupToken);
        }
        // Webhook might not have fired yet — wait briefly and retry
        await new Promise(r => setTimeout(r, 2000));
        const retryHotel = await prisma.hotelConfig.findFirst({
            where: { ownerEmail: email, setupComplete: false },
            orderBy: { createdAt: 'desc' },
        });
        if (retryHotel?.setupToken) {
            return res.redirect('/setup/' + retryHotel.setupToken);
        }
        res.redirect('/');
    } catch (e) {
        console.error('Setup redirect error:', e.message);
        res.redirect('/');
    }
});

// Get setup state
app.get('/api/setup/:token', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({
            where: { setupToken: req.params.token },
            include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, rates: true },
        });
        if (!hotel) return res.status(404).json({ error: 'Invalid setup token' });
        res.json({
            hotel: { id: hotel.id, name: hotel.name, address: hotel.address, phone: hotel.phone, subtitle: hotel.subtitle, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime, setupComplete: hotel.setupComplete },
            rooms: hotel.rooms.map(r => ({ id: r.id, name: r.name, description: r.description, amenities: r.amenities, maxOccupancy: r.maxOccupancy, totalUnits: r.totalUnits, images: r.images.map(i => ({ id: i.id, url: i.url, sortOrder: i.sortOrder })) })),
            rates: hotel.rates ? { nightly: hotel.rates.nightly, weekly: hotel.rates.weekly, monthly: hotel.rates.monthly, taxRate: hotel.rates.taxRate } : null,
        });
    } catch (e) {
        console.error('Setup GET error:', e.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Save hotel info
app.post('/api/setup/:token/hotel', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        const { name, address, phone, subtitle, checkInTime, checkOutTime } = req.body;
        await prisma.hotelConfig.update({
            where: { id: hotel.id },
            data: { name: name || hotel.name, address, phone, subtitle, checkInTime, checkOutTime },
        });
        res.json({ success: true });
    } catch (e) {
        console.error('Setup hotel save error:', e.message);
        res.status(500).json({ error: 'Failed to save' });
    }
});

// Create/update room
app.post('/api/setup/:token/rooms', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        const { id, name, description, amenities, maxOccupancy, totalUnits } = req.body;
        if (!name) return res.status(400).json({ error: 'Room name required' });

        let room;
        if (id) {
            room = await prisma.room.update({ where: { id }, data: { name, description, amenities, maxOccupancy: maxOccupancy || 4, totalUnits: totalUnits || 1 } });
        } else {
            const count = await prisma.room.count({ where: { hotelId: hotel.id } });
            room = await prisma.room.upsert({
                where: { hotelId_name: { hotelId: hotel.id, name } },
                create: { hotelId: hotel.id, name, description, amenities, maxOccupancy: maxOccupancy || 4, totalUnits: totalUnits || 1, sortOrder: count },
                update: { description, amenities, maxOccupancy: maxOccupancy || 4, totalUnits: totalUnits || 1 },
            });
        }

        // Also create/update ManualRoom for availability tracking
        await prisma.manualRoom.upsert({
            where: { hotelId_name: { hotelId: hotel.id, name } },
            create: { hotelId: hotel.id, name, totalUnits: totalUnits || 1 },
            update: { totalUnits: totalUnits || 1 },
        });

        res.json({ success: true, room: { id: room.id, name: room.name } });
    } catch (e) {
        console.error('Setup room save error:', e.message);
        res.status(500).json({ error: 'Failed to save room' });
    }
});

// Delete room
app.delete('/api/setup/:token/rooms/:roomId', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        await prisma.room.delete({ where: { id: req.params.roomId } });
        res.json({ success: true });
    } catch (e) {
        console.error('Setup room delete error:', e.message);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Upload room image
const multer = require('multer');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 setup
const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
const R2_BUCKET = process.env.R2_BUCKET || 'marketel-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev or custom domain

// Use memory storage (upload to R2, not disk)
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
});

// Also keep disk storage as fallback if R2 not configured
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads', req.hotelId || 'unknown');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
});
const uploadDisk = multer({ storage: uploadStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
}});

// Choose upload middleware based on R2 config
const upload = R2_PUBLIC_URL ? uploadMemory : uploadDisk;

// Helper: upload buffer to R2
async function uploadToR2(buffer, key, contentType) {
    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    return `${R2_PUBLIC_URL}/${key}`;
}

app.post('/api/setup/:token/rooms/:roomId/images', async (req, res, next) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        req.hotelId = hotel.id;
        next();
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
}, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        let url;
        if (R2_PUBLIC_URL) {
            const ext = path.extname(req.file.originalname) || '.jpg';
            const key = `${req.hotelId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
            url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
        } else {
            url = `/uploads/${req.hotelId}/${req.file.filename}`;
        }
        const count = await prisma.roomImage.count({ where: { roomId: req.params.roomId } });
        const image = await prisma.roomImage.create({ data: { roomId: req.params.roomId, url, sortOrder: count } });
        res.json({ success: true, image: { id: image.id, url: image.url } });
    } catch (e) {
        console.error('Image upload error:', e.message);
        res.status(500).json({ error: 'Failed to upload' });
    }
});

// Delete room image
app.delete('/api/setup/:token/rooms/:roomId/images/:imageId', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        await prisma.roomImage.delete({ where: { id: req.params.imageId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Marketel subscription (CRM go-live + setup checkout) — separate Stripe account from guest bookings
const marketelStripe = process.env.STRIPE_MARKETEL_SECRET_KEY
    ? require('stripe')(process.env.STRIPE_MARKETEL_SECRET_KEY)
    : null;
const MARKETEL_SUBSCRIPTION_PRODUCT_ID = process.env.STRIPE_MARKETEL_PRODUCT_ID || 'prod_UduliUOPjkESCJ';

async function getMarketelSubscriptionPrice() {
    if (!marketelStripe) throw new Error('Payment not configured');
    if (process.env.STRIPE_MARKETEL_PRICE_ID) {
        const price = await marketelStripe.prices.retrieve(process.env.STRIPE_MARKETEL_PRICE_ID);
        return { id: price.id, amountUsd: (price.unit_amount || 0) / 100 };
    }
    const product = await marketelStripe.products.retrieve(MARKETEL_SUBSCRIPTION_PRODUCT_ID, {
        expand: ['default_price'],
    });
    let price = product.default_price;
    if (!price) {
        const prices = await marketelStripe.prices.list({
            product: MARKETEL_SUBSCRIPTION_PRODUCT_ID,
            active: true,
            type: 'recurring',
            limit: 1,
        });
        if (!prices.data.length) throw new Error('No active subscription price for Marketel product');
        price = prices.data[0];
    } else if (typeof price === 'string') {
        price = await marketelStripe.prices.retrieve(price);
    }
    return { id: price.id, amountUsd: (price.unit_amount || 0) / 100 };
}

app.post('/api/setup/:token/checkout', async (req, res) => {
    try {
        if (!marketelStripe) return res.status(503).json({ error: 'Payment not configured' });
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });

        // Meta CAPI: CustomizeProduct (they clicked Go Live)
        const { fbp: cpFbp, fbc: cpFbc } = getMetaCookies(req);
        sendMarketelCAPI('CustomizeProduct', {
            email: hotel.ownerEmail,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.socket?.remoteAddress,
            sourceUrl: req.headers.referer || '',
            fbp: req.body?.fbp || cpFbp,
            fbc: req.body?.fbc || cpFbc,
        });

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const { id: subscriptionPriceId } = await getMarketelSubscriptionPrice();

        const session = await marketelStripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{
                price: subscriptionPriceId,
                quantity: 1,
            }],
            customer_email: hotel.ownerEmail || undefined,
            metadata: {
                product: 'hotel-onboarding',
                hotelId: hotel.id,
                setupToken: req.params.token,
            },
            success_url: `${baseUrl}/setup/${req.params.token}/success`,
            cancel_url: `${baseUrl}/setup/${req.params.token}`,
        });

        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error('Checkout session error:', e.message);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});

// Success page after payment — activate hotel and show confirmation
app.get('/setup/:token/success', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.redirect('/');

        // Mark complete and activate
        await prisma.hotelConfig.update({
            where: { id: hotel.id },
            data: { setupComplete: true, active: true },
        });

        // Meta CAPI: Subscribe (payment confirmed)
        const { fbp: subFbp, fbc: subFbc } = getMetaCookies(req);
        let subscriptionAmountUsd = 99;
        try {
            subscriptionAmountUsd = (await getMarketelSubscriptionPrice()).amountUsd;
        } catch (_) { /* use fallback */ }
        sendMarketelCAPI('Subscribe', {
            email: hotel.ownerEmail,
            phone: hotel.ownerPhone,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.socket?.remoteAddress,
            sourceUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            fbp: subFbp,
            fbc: subFbc,
            value: subscriptionAmountUsd,
            currency: 'USD',
        });

        // Track payment success in funnel DB
        prisma.funnelEvent.create({ data: { hotelId: 'marketel-onboarding', eventName: 'PaymentSucceeded', guestEmail: hotel.ownerEmail || null } }).catch(() => {});

        // Create default CRM PIN
        const defaultPin = String(Math.floor(1000 + Math.random() * 9000));
        const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');
        try {
            await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Default PIN' } });
        } catch (e) { /* ignore */ }

        const hotelName = hotel.name || 'Your Hotel';
        const token = req.params.token;
        const slug = (hotelName).toLowerCase().replace(/['\u2019]s\b/g, 's').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const assignedDomain = slug + '.bookmarketel.com';

        // Auto-add subdomain to Vercel
        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        if (vercelToken && vercelProjectId) {
            try {
                await axios.post(
                    `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
                    { name: assignedDomain },
                    { headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' } }
                );
                console.log(`✅ Vercel domain added: ${assignedDomain}`);
            } catch (vercelErr) {
                console.error(`⚠️ Vercel domain add failed: ${vercelErr.response?.data?.error?.message || vercelErr.message}`);
            }
        }

        // Save domain record
        try {
            await prisma.hotelDomain.create({ data: { hotelId: hotel.id, domain: assignedDomain, isPrimary: true } });
        } catch (e) { /* might exist */ }

        // Don't send welcome email here — wait until they submit their contact info via /finalize

        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You're Live!</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1545780930244672');fbq('track','PageView');fbq('track','Subscribe',{value:${subscriptionAmountUsd},currency:'USD'});</script><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#f8f9fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:white;border-radius:20px;padding:36px;max-width:460px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.1)}h1{font-size:24px;margin-bottom:8px;color:#1a1a2e}.subtitle{color:#6b7280;font-size:14px;margin-bottom:16px;line-height:1.5}.url-box{background:#e8f5ee;border-radius:12px;padding:14px;font-family:monospace;font-size:15px;color:#2E7D5B;font-weight:600;margin-bottom:16px;word-break:break-all}.field{text-align:left;margin-bottom:14px}.field label{display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#1a1a2e}.field input{width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:16px;outline:none}.field input:focus{border-color:#2E7D5B}.btn{display:block;width:100%;padding:14px;background:#2E7D5B;color:white;border:none;border-radius:10px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.15s;text-decoration:none;text-align:center}.btn:hover{background:#1a5c3f}.note{margin-top:12px;font-size:12px;color:#6b7280;line-height:1.5}.pin-box{background:#f0f4ff;border:1.5px solid #c7d2fe;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center}.pin-label{font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.pin-value{font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#1a1a2e;letter-spacing:4px}.pin-hint{font-size:12px;color:#6b7280;margin-top:8px;line-height:1.4}.err{color:#ef4444;font-size:13px;margin-top:6px;display:none}</style></head><body><div class="card"><h1>\u{1F389} You're live!</h1><p class="subtitle">Your booking site is ready at:</p><div class="url-box">${assignedDomain}</div><p class="subtitle" id="contactSubtitle">Enter your email and phone so we can send you your access code.</p><div id="contactForm"><div class="field"><label>Email</label><input type="email" id="ownerEmail" placeholder="you@hotel.com" value="${hotel.ownerEmail || ''}" autocomplete="email"></div><div class="field"><label>Phone</label><input type="tel" id="ownerPhone" placeholder="(555) 123-4567" autocomplete="tel"></div><div class="err" id="formErr"></div><button class="btn" onclick="submitContact()">Send me my code \u2192</button></div><div id="revealSection" style="display:none;"><div class="pin-box"><div class="pin-label">Front Desk PIN</div><div class="pin-value">${defaultPin}</div><div class="pin-hint">Tap the \u270f\ufe0f pencil on your booking site and enter this PIN to manage everything.</div></div><a class="btn" href="https://${assignedDomain}?welcome=1" target="_blank">Visit Your Site \u2192</a><p class="note">We\u2019ve emailed this to you. You can change your PIN later in your front desk settings.</p></div></div><script>function submitContact(){var email=document.getElementById('ownerEmail').value.trim();var phone=document.getElementById('ownerPhone').value.trim();var err=document.getElementById('formErr');err.style.display='none';if(!email||!email.includes('@')){err.textContent='Please enter a valid email';err.style.display='block';return;}if(!phone){err.textContent='Please enter your phone number';err.style.display='block';return;}var btn=document.querySelector('#contactForm .btn');btn.textContent='Sending...';btn.disabled=true;fetch('/api/setup/${token}/finalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,phone:phone,pin:'${defaultPin}',domainPref:'subdomain',customDomain:''})}).then(function(r){return r.json()}).then(function(){document.getElementById('contactForm').style.display='none';document.getElementById('contactSubtitle').style.display='none';document.getElementById('revealSection').style.display='block';}).catch(function(){document.getElementById('contactForm').style.display='none';document.getElementById('contactSubtitle').style.display='none';document.getElementById('revealSection').style.display='block';});}</script></body></html>`);
    } catch (e) {
        console.error('Setup success error:', e.message);
        res.redirect('/');
    }
});

// Finalize — save phone and domain preference after payment
app.post('/api/setup/:token/finalize', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        const { email, phone, domainPref, customDomain } = req.body;

        // Save email and phone
        await prisma.hotelConfig.update({
            where: { id: hotel.id },
            data: {
                ownerEmail: email || hotel.ownerEmail,
                ownerPhone: phone || hotel.ownerPhone,
            },
        });

        // Send welcome email with PIN
        const finalEmail = email || hotel.ownerEmail;
        if (finalEmail) {
            const slug = (hotel.name || 'hotel').toLowerCase().replace(/['\u2019]s\b/g, 's').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const domain = slug + '.bookmarketel.com';
            const pin = String(req.body.pin || '').trim();
            sendWelcomeEmail(finalEmail, hotel.name || 'Your Hotel', pin || 'See your setup page', domain);
        }

        // Auto-create subdomain on Vercel
        let assignedDomain = '';
        if (domainPref === 'subdomain') {
            const slug = (hotel.name || 'hotel').toLowerCase().replace(/['\u2019]s\b/g, 's').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            assignedDomain = slug + '.bookmarketel.com';
            
            // Add to Vercel via API
            const vercelToken = process.env.VERCEL_TOKEN;
            const vercelProjectId = process.env.VERCEL_PROJECT_ID;
            if (vercelToken && vercelProjectId) {
                try {
                    const vercelRes = await axios.post(
                        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
                        { name: assignedDomain },
                        { headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' } }
                    );
                    console.log(`✅ Vercel domain added: ${assignedDomain}`, vercelRes.data?.name || '');
                } catch (vercelErr) {
                    const errMsg = vercelErr.response?.data?.error?.message || vercelErr.message;
                    console.error(`⚠️ Vercel domain add failed for ${assignedDomain}: ${errMsg}`);
                    // Don't fail the whole request — domain can be added manually
                }
            }

            // Save domain record in DB
            try {
                await prisma.hotelDomain.create({ data: { hotelId: hotel.id, domain: assignedDomain, isPrimary: true } });
            } catch (e) { /* might exist */ }
        }

        // Log for you to action manually
        console.log(`\n🔔 NEW CUSTOMER PAID — ACTION NEEDED`);
        console.log(`   Hotel: ${hotel.name} (${hotel.id})`);
        console.log(`   Email: ${hotel.ownerEmail}`);
        console.log(`   Phone: ${phone}`);
        console.log(`   Domain: ${domainPref === 'custom' ? customDomain : assignedDomain}`);
        console.log(`   Setup token: ${req.params.token}\n`);

        res.json({ success: true, domain: assignedDomain });
    } catch (e) {
        console.error('Finalize error:', e.message);
        res.status(500).json({ error: 'Failed' });
    }
});

// Save rates
app.post('/api/setup/:token/rates', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        const { nightly, weekly, monthly, taxRate } = req.body;
        await prisma.hotelRates.upsert({
            where: { hotelId: hotel.id },
            create: { hotelId: hotel.id, nightly: nightly || 69, weekly: weekly || 299, monthly: monthly || 999, taxRate: taxRate || 0.10 },
            update: { nightly: nightly || 69, weekly: weekly || 299, monthly: monthly || 999, taxRate: taxRate || 0.10 },
        });
        res.json({ success: true });
    } catch (e) {
        console.error('Setup rates save error:', e.message);
        res.status(500).json({ error: 'Failed to save rates' });
    }
});

// Complete setup — go live
app.post('/api/setup/:token/complete', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        console.log('Complete called for:', hotel.id, hotel.name);

        // Generate slug from hotel name
        const slug = (hotel.name || 'hotel').toLowerCase().replace(/['\u2019]s\b/g, 's').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const assignedDomain = slug + '.bookmarketel.com';

        // Create domain record (ignore if exists)
        try {
            await prisma.hotelDomain.create({ data: { hotelId: hotel.id, domain: assignedDomain, isPrimary: true } });
        } catch (e) { /* Domain might already exist */ }

        // Add to Vercel
        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        if (vercelToken && vercelProjectId) {
            try {
                await axios.post(`https://api.vercel.com/v10/projects/${vercelProjectId}/domains`, { name: assignedDomain }, { headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' } });
                console.log(`✅ Vercel domain added: ${assignedDomain}`);
            } catch (vercelErr) {
                console.error(`⚠️ Vercel domain add failed: ${vercelErr.response?.data?.error?.message || vercelErr.message}`);
            }
        }

        // Mark setup complete, activate (subscribed defaults to false)
        await prisma.hotelConfig.update({
            where: { id: hotel.id },
            data: { setupComplete: true, active: true },
        });

        // Create a default CRM PIN
        const defaultPin = String(Math.floor(1000 + Math.random() * 9000));
        const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');
        try {
            await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Default PIN' } });
        } catch (e) { /* ignore duplicate */ }

        // Welcome email sent via /finalize call from the client

        // Track funnel event
        prisma.funnelEvent.create({ data: { hotelId: 'marketel-onboarding', eventName: 'SetupCompleted', guestEmail: hotel.ownerEmail || null } }).catch(() => {});

        console.log(`✅ Setup completed (freemium): ${hotel.name} (${hotel.id}) → ${assignedDomain}`);
        res.json({ success: true, bookingUrl: 'https://' + assignedDomain, frontdeskUrl: 'https://' + assignedDomain + '/frontdesk', crmPin: defaultPin });
    } catch (e) {
        console.error('Setup complete error:', e.message, e.stack);
        res.status(500).json({ error: 'Failed to complete setup', detail: e.message });
    }
});

// Dynamic per-hotel PWA manifest — lets each hotel be installed to the home
// screen as "their" app (their name + their icon). Served same-origin via the
// booking engine's /api proxy so install prompts work.
app.get('/api/hotel/:hotelId/manifest.webmanifest', async (req, res) => {
    try {
        let hotel = await prisma.hotelConfig.findUnique({
            where: { id: req.params.hotelId },
            include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!hotel) {
            const domainGuess = req.params.hotelId + '.bookmarketel.com';
            const domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
            if (domainRecord) {
                hotel = await prisma.hotelConfig.findUnique({
                    where: { id: domainRecord.hotelId },
                    include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
                });
            }
        }

        const name = (hotel && hotel.name) || 'Book Now';
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resolveImgUrl = (url) => (url && url.startsWith('http')) ? url : baseUrl + (url || '');

        // Icon priority: custom raster icon → Marketel PNG. Never fall back to
        // SVG: iOS ignores SVG home-screen icons (renders blank), so the default
        // must be a real PNG served at the standard sizes.
        const customExt = (hotel && hotel.appIconUrl ? hotel.appIconUrl.split('?')[0].split('.').pop() : '').toLowerCase();
        const customIsRaster = hotel && hotel.appIconUrl && ['png', 'jpg', 'jpeg', 'webp'].includes(customExt);
        const icons = customIsRaster
            ? [
                { src: hotel.appIconUrl, sizes: '192x192', type: customExt === 'webp' ? 'image/webp' : customExt === 'png' ? 'image/png' : 'image/jpeg', purpose: 'any' },
                { src: hotel.appIconUrl, sizes: '512x512', type: customExt === 'webp' ? 'image/webp' : customExt === 'png' ? 'image/png' : 'image/jpeg', purpose: 'any' },
                { src: hotel.appIconUrl, sizes: '512x512', type: customExt === 'webp' ? 'image/webp' : customExt === 'png' ? 'image/png' : 'image/jpeg', purpose: 'maskable' },
            ]
            : [
                { src: `${baseUrl}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: `${baseUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: `${baseUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ];

        const manifest = {
            name,
            short_name: name.length > 12 ? name.slice(0, 12) : name,
            description: `Book directly with ${name}`,
            start_url: '/?homescreen=1',
            scope: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#2E7D5B',
            orientation: 'portrait',
            icons,
        };

        res.set('Content-Type', 'application/manifest+json');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=300');
        res.json(manifest);
    } catch (e) {
        console.error('Manifest error:', e.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dynamic per-hotel FRONT DESK manifest — lets the owner install their back
// office as its own home-screen app (their name + icon), separate from the
// guest booking engine. Distinct start_url/scope/id so the two installs never
// collide on the same hotel domain. Installing this is also what unlocks web
// push on iOS (requires a standalone PWA).
app.get('/api/hotel/:hotelId/frontdesk-manifest.webmanifest', async (req, res) => {
    try {
        let hotel = await prisma.hotelConfig.findUnique({
            where: { id: req.params.hotelId },
            include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!hotel) {
            const domainGuess = req.params.hotelId + '.bookmarketel.com';
            const domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
            if (domainRecord) {
                hotel = await prisma.hotelConfig.findUnique({
                    where: { id: domainRecord.hotelId },
                    include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
                });
            }
        }

        const hotelId = (hotel && hotel.id) || req.params.hotelId;
        const hotelName = (hotel && hotel.name) || 'Front Desk';
        const name = `${hotelName} Front Desk`;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resolveImgUrl = (url) => (url && url.startsWith('http')) ? url : baseUrl + (url || '');

        // The Front Desk ALWAYS uses the Marketel logo (PNG) — it's the owner's
        // back-office app and must look distinct from the hotel's guest booking
        // engine (which uses the custom uploaded icon). Never SVG: iOS renders
        // SVG home-screen icons blank.
        const icons = [
            { src: `${baseUrl}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: `${baseUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: `${baseUrl}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ];

        // Root scope + simple start_url mirrors the guest booking engine, which
        // reliably installs as a standalone PWA on iOS. A narrow "/frontdesk"
        // scope was causing iOS to open it in Safari instead of standalone.
        const manifest = {
            id: `/frontdesk?hotelId=${encodeURIComponent(hotelId)}`,
            name,
            // Home-screen label = just the hotel name (kept short). The longer
            // "<Hotel> Front Desk" lives in `name`/`description` for the install UI.
            short_name: hotelName.length > 12 ? hotelName.slice(0, 12) : hotelName,
            description: `Manage bookings for ${hotelName}`,
            start_url: '/frontdesk?homescreen=1',
            scope: '/',
            display: 'standalone',
            background_color: '#EEF2EF',
            theme_color: '#2E7D5B',
            orientation: 'portrait',
            icons,
        };

        res.set('Content-Type', 'application/manifest+json');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=300');
        res.json(manifest);
    } catch (e) {
        console.error('Front desk manifest error:', e.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public hotel config API (for dynamic frontend loading)
app.get('/api/hotel/:hotelId/public', async (req, res) => {
    try {
        let hotel = await prisma.hotelConfig.findUnique({
            where: { id: req.params.hotelId },
            include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, rates: true },
        });

        // Fallback: resolve by domain if direct ID lookup fails
        if (!hotel) {
            const domainGuess = req.params.hotelId + '.bookmarketel.com';
            const domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
            if (domainRecord) {
                hotel = await prisma.hotelConfig.findUnique({
                    where: { id: domainRecord.hotelId },
                    include: { rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, rates: true },
                });
            }
        }

        if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

        // Build absolute image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resolveImgUrl = (url) => url.startsWith('http') ? url : baseUrl + url;

        // Allow preview for unpaid hotels (setupComplete=false) — they just can't have a public domain yet
        res.json({
            id: hotel.id,
            name: hotel.name,
            phone: hotel.phone,
            address: hotel.address,
            subtitle: hotel.subtitle,
            pms: hotel.pms,
            theme: hotel.theme || 'light',
            appIconUrl: hotel.appIconUrl || '',
            checkInTime: hotel.checkInTime,
            checkOutTime: hotel.checkOutTime,
            cancellationPolicy: hotel.cancellationPolicy || '',
            subscribed: hotel.subscribed || false,
            rates: hotel.rates ? { NIGHTLY: hotel.rates.nightly, WEEKLY: hotel.rates.weekly, MONTHLY: hotel.rates.monthly, taxRate: hotel.rates.taxRate } : { NIGHTLY: 69, WEEKLY: 299, MONTHLY: 999, taxRate: 0.10 },
            rooms: hotel.rooms.map((r, i) => ({
                id: i + 1,
                roomId: r.id,
                name: r.name,
                description: r.description,
                amenities: r.amenities,
                maxOccupancy: r.maxOccupancy,
                totalUnits: r.totalUnits,
                imageUrl: r.images[0]?.url ? resolveImgUrl(r.images[0].url) : 'https://suitestay.clickinns.com/kingbedsuitestay.webp',
                imageUrls: r.images.length ? r.images.map(img => resolveImgUrl(img.url)) : ['https://suitestay.clickinns.com/kingbedsuitestay.webp'],
            })),
        });
    } catch (e) {
        console.error('Public hotel config error:', e.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── END SELF-SERVE SETUP ──────────────────────────────────────

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics.html'));
});

// Verify PIN only (no DB) - helps debug auth vs DB issues
app.get('/api/crm/verify', crmVerifyRateLimit, crmAuth, async (req, res) => {
    try {
        // Allow fallback to the PIN's first authorized hotel (for pencil-button flow
        // where the domain may not resolve on the backend side)
        const hotelId = resolveScopedHotelId(req, { allowFallback: true });
        if (!hotelId) {
            return res.status(403).json({ success: false, message: 'Missing authorized hotel context.' });
        }
        const config = await resolveHotelConfig(hotelId);
        const dbHotel = await prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { name: true, subtitle: true, address: true, phone: true, cancellationPolicy: true, theme: true, appIconUrl: true, subscribed: true } });
        const primaryDomain = await prisma.hotelDomain.findFirst({ where: { hotelId, isPrimary: true }, select: { domain: true } });
        res.json({
            success: true,
            hotelId,
            domain: primaryDomain?.domain || '',
            allowedHotels: req.crmAllowedHotels || [],
            pms: config.pms,
            isManualPms: config.pms === 'manual',
            hotelName: dbHotel?.name || config.name || '',
            hotelSubtitle: dbHotel?.subtitle || '',
            hotelAddress: dbHotel?.address || '',
            hotelPhone: dbHotel?.phone || '',
            cancellationPolicy: dbHotel?.cancellationPolicy || '',
            theme: dbHotel?.theme || 'light',
            appIconUrl: dbHotel?.appIconUrl || '',
            subscribed: dbHotel?.subscribed || false,
        });
    } catch (e) {
        console.error('crm:verify failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update hotel name/subtitle/address/phone/cancellationPolicy
app.post('/api/crm/hotel-info', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { name, subtitle, address, phone, cancellationPolicy, theme } = req.body;
        const data = {};
        if (name !== undefined) data.name = name || undefined;
        if (subtitle !== undefined) data.subtitle = subtitle;
        if (address !== undefined) data.address = address;
        if (phone !== undefined) data.phone = phone;
        if (cancellationPolicy !== undefined) data.cancellationPolicy = cancellationPolicy;
        if (theme !== undefined) data.theme = theme;
        await prisma.hotelConfig.update({
            where: { id: hotelId },
            data,
        });
        // Invalidate caches so the new name/info shows immediately everywhere
        // (and isn't served stale until the cache TTL expires or a deploy clears it).
        hotelConfigCache.delete(hotelId);
        clearHotelDomainCache();
        res.json({ success: true });
    } catch (e) {
        console.error('crm:hotel-info failed:', e.message);
        res.status(500).json({ success: false, message: 'Failed to save' });
    }
});

// Forgot PIN — email a new PIN to the owner (no auth required)
app.post('/api/forgot-pin', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (email) {
            const hotel = await prisma.hotelConfig.findFirst({ where: { ownerEmail: email } });
            if (hotel) {
                // Generate new 4-digit PIN
                const newPin = String(Math.floor(1000 + Math.random() * 9000));
                const pinHash = hashCrmPin(newPin);
                // Deactivate old PINs
                await prisma.crmPin.updateMany({ where: { hotelId: hotel.id }, data: { active: false } });
                // Create new PIN
                await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Reset PIN', active: true } });
                // Send email
                if (emailTransporter) {
                    await emailTransporter.sendMail({
                        from: '"Marketel" <support@bookmarketel.com>',
                        to: email,
                        subject: 'Your new Front Desk PIN',
                        text: `Hi,\n\nYour Front Desk PIN has been reset.\n\nYour new PIN: ${newPin}\n\nUse this PIN to log in at your Front Desk dashboard.\n\n— Marketel`,
                    });
                }
            }
        }
        // Always return success (don't reveal if email exists)
        res.json({ success: true });
    } catch (e) {
        console.error('forgot-pin error:', e.message);
        res.json({ success: true });
    }
});

// ── MAGIC LINK AUTH ────────────────────────────────────────────
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || process.env.SESSION_SECRET || 'marketel-magic-link-fallback-secret';
const MAGIC_LINK_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes

function generateMagicToken(email, hotelId) {
    const payload = JSON.stringify({ email, hotelId, exp: Date.now() + MAGIC_LINK_EXPIRY_MS });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', MAGIC_LINK_SECRET).update(encoded).digest('base64url');
    return encoded + '.' + sig;
}

function verifyMagicToken(token) {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', MAGIC_LINK_SECRET).update(encoded).digest('base64url');
    if (sig !== expectedSig) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.exp < Date.now()) return null;
        return payload;
    } catch (e) { return null; }
}

// Send magic link email
app.post('/api/auth/magic-link', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) return res.json({ success: true }); // Don't reveal if email missing

        const hotel = await prisma.hotelConfig.findFirst({ where: { ownerEmail: email }, select: { id: true, name: true } });
        if (!hotel) return res.status(404).json({ success: false, message: 'No account found with that email.' });

        // Get the hotel's domain for the link
        const domain = await prisma.hotelDomain.findFirst({ where: { hotelId: hotel.id, isPrimary: true }, select: { domain: true } });
        const baseUrl = domain ? 'https://' + domain.domain : (req.protocol + '://' + req.get('host'));

        const token = generateMagicToken(email, hotel.id);
        const magicUrl = baseUrl + '/frontdesk?magic=' + encodeURIComponent(token);

        if (emailTransporter) {
            await emailTransporter.sendMail({
                from: '"Marketel" <support@bookmarketel.com>',
                to: email,
                subject: 'Your login link — ' + (hotel.name || 'Front Desk'),
                html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:400px;margin:0 auto;padding:40px 20px;">
                    <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Log in to your Front Desk</h2>
                    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 24px;">Tap the button below to access your dashboard. This link expires in 60 minutes.</p>
                    <a href="${magicUrl}" style="display:block;text-align:center;padding:14px 24px;background:#2E7D5B;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Open My Dashboard →</a>
                    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;text-align:center;">If you didn't request this, you can ignore this email.</p>
                </div>`,
                text: `Log in to your Front Desk: ${magicUrl}\n\nThis link expires in 60 minutes.`,
            });
        }

        res.json({ success: true });
    } catch (e) {
        console.error('magic-link error:', e.message);
        res.json({ success: true });
    }
});

// Verify magic link token — returns PIN for auto-login
app.get('/api/auth/verify-magic', async (req, res) => {
    try {
        const token = String(req.query?.token || '').trim();
        const payload = verifyMagicToken(token);
        if (!payload) return res.status(401).json({ success: false, message: 'Link expired or invalid.' });

        // Find an active PIN for this hotel
        const pin = await prisma.crmPin.findFirst({ where: { hotelId: payload.hotelId, active: true }, select: { pinHash: true } });
        if (!pin) return res.status(404).json({ success: false, message: 'No active PIN found.' });

        // We can't reverse the hash, so generate a fresh temporary PIN
        const tempPin = String(Math.floor(1000 + Math.random() * 9000));
        const pinHash = hashCrmPin(tempPin);
        // Deactivate old PINs and create new one
        await prisma.crmPin.updateMany({ where: { hotelId: payload.hotelId }, data: { active: false } });
        await prisma.crmPin.create({ data: { hotelId: payload.hotelId, pinHash, label: 'Magic link login', active: true } });

        res.json({ success: true, pin: tempPin, hotelId: payload.hotelId });
    } catch (e) {
        console.error('verify-magic error:', e.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Change PIN (CRM-authenticated — owner can change their own PIN)
app.post('/api/crm/change-pin', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const newPin = String(req.body?.newPin || '').trim();
        if (!newPin || newPin.length < 4) {
            return res.status(400).json({ success: false, message: 'PIN must be at least 4 characters.' });
        }
        const pinHash = hashCrmPin(newPin);
        // Deactivate all existing PINs for this hotel
        await prisma.crmPin.updateMany({ where: { hotelId }, data: { active: false } });
        // Create the new PIN
        await prisma.crmPin.upsert({
            where: { hotelId_pinHash: { hotelId, pinHash } },
            create: { hotelId, pinHash, label: 'Owner PIN', active: true },
            update: { active: true, label: 'Owner PIN' },
        });
        res.json({ success: true });
    } catch (e) {
        console.error('crm:change-pin failed:', e.message);
        res.status(500).json({ success: false, message: 'Failed to change PIN' });
    }
});

// Go Live — create Stripe checkout for subscription (from front desk)
app.post('/api/crm/go-live', crmAuth, async (req, res) => {
    try {
        if (!marketelStripe) return res.json({ success: false, message: 'Payment not configured' });
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { ownerEmail: true, name: true, setupToken: true } });

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const { id: subscriptionPriceId } = await getMarketelSubscriptionPrice();
        const session = await marketelStripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: subscriptionPriceId, quantity: 1 }],
            customer_email: hotel?.ownerEmail || undefined,
            metadata: { product: 'hotel-go-live', hotelId },
            success_url: `${baseUrl}/api/crm/go-live-success?hotelId=${hotelId}&token=${encodeURIComponent(req.crmToken || '')}`,
            cancel_url: req.headers.referer || baseUrl + '/frontdesk',
        });
        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error('crm:go-live error:', e.message);
        res.json({ success: false, message: 'Failed to create checkout' });
    }
});

// Go Live success — mark hotel as subscribed
app.get('/api/crm/go-live-success', async (req, res) => {
    const hotelId = String(req.query.hotelId || '').trim();
    const pin = String(req.query.token || '').trim();

    // Resolve where to send the owner back to: their own hotel domain, never the
    // backend host (which would default the front desk to Guest Lodge Minot).
    async function buildFrontdeskRedirect() {
        if (!hotelId) return '/frontdesk?activated=1';
        try {
            const primaryDomain = await prisma.hotelDomain.findFirst({
                where: { hotelId, isPrimary: true },
                select: { domain: true },
            });
            const domain = primaryDomain?.domain;
            if (domain) {
                const query = new URLSearchParams({ activated: '1' });
                if (pin) query.set('pin', pin);
                return `https://${domain}/frontdesk?${query.toString()}`;
            }
        } catch (_) { /* fall through to relative redirect */ }
        // Fallback: stay on the backend host but force the correct hotel context
        const params = new URLSearchParams({ hotelId, activated: '1' });
        if (pin) params.set('pin', pin);
        return `/frontdesk?${params.toString()}`;
    }

    try {
        if (hotelId) {
            await prisma.hotelConfig.update({
                where: { id: hotelId },
                data: { setupComplete: true, subscribed: true, active: true },
            });
            console.log(`✅ Hotel subscribed: ${hotelId}`);
            // Track
            prisma.funnelEvent.create({ data: { hotelId: 'marketel-onboarding', eventName: 'PaymentSucceeded', guestEmail: hotelId } }).catch(() => {});
            let subscriptionAmountUsd = 99;
            try {
                subscriptionAmountUsd = (await getMarketelSubscriptionPrice()).amountUsd;
            } catch (_) { /* use fallback */ }
            sendMarketelCAPI('Subscribe', { ip: req.ip, userAgent: req.headers['user-agent'], sourceUrl: req.headers.referer || '', value: subscriptionAmountUsd, currency: 'USD' });
        }
        res.redirect(await buildFrontdeskRedirect());
    } catch (e) {
        console.error('go-live-success error:', e.message);
        res.redirect(await buildFrontdeskRedirect());
    }
});

// Billing portal — redirect to Stripe customer portal
app.get('/api/crm/billing-portal', crmAuth, async (req, res) => {
    try {
        if (!marketelStripe) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { ownerEmail: true } });
        if (!hotel?.ownerEmail) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
        // Find customer by email
        const customers = await marketelStripe.customers.list({ email: hotel.ownerEmail, limit: 1 });
        if (!customers.data.length) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
        const customerId = customers.data[0].id;
        const session = await marketelStripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: req.headers.referer || '/',
        });
        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error('crm:billing-portal error:', e.message);
        res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
    }
});

// Store onboarding questionnaire answers
app.post('/api/crm/onboarding-answers', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { why, currentBooking, roomCount, priority } = req.body;
        console.log(`📋 Onboarding answers for ${hotelId}: why="${why}", booking=${currentBooking}, rooms=${roomCount}, priority=${priority}`);
        // Store as a funnel event for analytics
        await prisma.funnelEvent.create({
            data: { hotelId, eventName: 'OnboardingAnswers', contentName: JSON.stringify({ why, currentBooking, roomCount, priority }) }
        }).catch(() => {});
        res.json({ success: true });
    } catch (e) {
        res.json({ success: true });
    }
});

// Support contact — hotel owner sends a message, we get an email
app.post('/api/crm/support', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const message = String(req.body?.message || '').trim();
        if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });
        const hotel = await prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { name: true, ownerEmail: true, ownerPhone: true } });
        if (emailTransporter) {
            await emailTransporter.sendMail({
                from: '"Marketel Support" <support@bookmarketel.com>',
                to: 'support@bookmarketel.com',
                replyTo: hotel?.ownerEmail || undefined,
                subject: `Support: ${hotel?.name || hotelId}`,
                text: `Hotel: ${hotel?.name || hotelId} (${hotelId})\nEmail: ${hotel?.ownerEmail || 'N/A'}\nPhone: ${hotel?.ownerPhone || 'N/A'}\n\nMessage:\n${message}`,
            });
        }
        console.log(`📩 Support message from ${hotel?.name || hotelId}: ${message}`);
        res.json({ success: true });
    } catch (e) {
        console.error('crm:support error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

app.get('/api/crm/revenue', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const config = await resolveHotelConfig(hotelId);
        if (config.pms !== 'manual') {
            return res.status(403).json({
                success: false,
                message: 'Revenue tab is available only for manual PMS hotels.',
            });
        }

        const period = String(req.query?.period || '30d').trim().toLowerCase();
        if (!MANUAL_REVENUE_PERIODS.has(period)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid revenue period. Use today, 7d, 30d, 90d, or all.',
            });
        }

        const referenceIso = getReportingTodayIso();
        const earliestIso = period === 'all'
            ? await getEarliestManualRevenueStartIso(hotelId)
            : referenceIso;
        const latestIso = period === 'all'
            ? await getLatestManualRevenueEndIso(hotelId)
            : referenceIso;
            
        const window = buildManualRevenueWindow(period, referenceIso, earliestIso, latestIso);
        const current = await computeManualRevenueMetrics(hotelId, window.startIso, window.endIso);
        const previous = (window.prevStartIso && window.prevEndIso)
            ? await computeManualRevenueMetrics(hotelId, window.prevStartIso, window.prevEndIso)
            : null;

        res.json({
            success: true,
            data: {
                period,
                range: {
                    start: window.startIso,
                    end: window.endIso,
                    label: formatShortDateRange(window.startIso, window.endIso),
                },
                rev: current.rev,
                bookings: current.bookings,
                avg: current.avg,
                prevRev: previous ? previous.rev : null,
                prevBookings: previous ? previous.bookings : null,
                prevAvg: previous ? previous.avg : null,
                rooms: current.rooms,
                stats: current.stats,
            },
        });
    } catch (e) {
        console.error('crm:revenue failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
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
        maybeNotifyRoomSoldOutToday(hotelId, roomName).catch(() => {});

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:rooms failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.put('/api/crm/manual-availability/rooms', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const currentRoomName = String(req.body?.currentRoomName || '').trim();
        const newRoomName = String(req.body?.newRoomName || '').trim();
        const totalUnits = Math.max(0, parseInt(req.body?.totalUnits, 10) || 0);

        if (!currentRoomName) {
            return res.status(400).json({ success: false, message: 'currentRoomName is required.' });
        }
        if (!newRoomName) {
            return res.status(400).json({ success: false, message: 'newRoomName is required.' });
        }

        const room = await withRetry(() => prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: currentRoomName } },
            select: { id: true, name: true },
        }));
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room type not found.' });
        }

        if (newRoomName !== currentRoomName) {
            const conflict = await withRetry(() => prisma.manualRoom.findUnique({
                where: { hotelId_name: { hotelId, name: newRoomName } },
                select: { id: true },
            }));
            if (conflict) {
                return res.status(409).json({ success: false, message: 'A room with this name already exists.' });
            }
        }

        await withRetry(() => prisma.manualRoom.update({
            where: { id: room.id },
            data: { name: newRoomName, totalUnits },
        }));
        maybeNotifyRoomSoldOutToday(hotelId, newRoomName).catch(() => {});

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:rooms update failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/crm/manual-availability/rooms', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const roomName = String(req.body?.roomName || '').trim();
        if (!roomName) {
            return res.status(400).json({ success: false, message: 'roomName is required.' });
        }

        const room = await withRetry(() => prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
            select: { id: true, name: true },
        }));
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room type not found.' });
        }

        await withRetry(() => prisma.$transaction([
            prisma.manualOverride.deleteMany({ where: { roomId: room.id } }),
            prisma.manualRoom.delete({ where: { id: room.id } }),
        ]));

        // Also delete the corresponding Room record (engine)
        // Must use individual delete (not deleteMany) to trigger cascade on RoomImage
        let roomDeleteCount = 0;
        try {
            const roomsToDelete = await prisma.room.findMany({ where: { hotelId, name: roomName }, select: { id: true } });
            for (const r of roomsToDelete) {
                await prisma.room.delete({ where: { id: r.id } });
                roomDeleteCount++;
            }
        } catch (roomDelErr) {
            // If cascade fails, manually delete images first then room
            try {
                const roomsToDelete = await prisma.room.findMany({ where: { hotelId, name: roomName }, select: { id: true } });
                for (const r of roomsToDelete) {
                    await prisma.roomImage.deleteMany({ where: { roomId: r.id } });
                    await prisma.room.delete({ where: { id: r.id } });
                    roomDeleteCount++;
                }
            } catch (e2) { /* give up */ }
        }

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload, roomDeleteCount });
    } catch (e) {
        console.error('manual-availability:rooms delete failed:', e.message);
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
        maybeNotifyRoomSoldOutToday(hotelId, room.name).catch(() => {});

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload, affectedDays: dates.length });
    } catch (e) {
        console.error('manual-availability:range failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// ── CRM Room Management (Edit tab) ──────────────────────────────

// Get rooms for this hotel
app.get('/api/crm/rooms', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const rooms = await withRetry(() => prisma.room.findMany({
            where: { hotelId },
            include: { images: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
        }));
        const rates = await withRetry(() => prisma.hotelRates.findUnique({ where: { hotelId } }));
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resolveImgUrl = (url) => url.startsWith('http') ? url : baseUrl + url;
        res.json({
            success: true,
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                amenities: r.amenities,
                maxOccupancy: r.maxOccupancy,
                totalUnits: r.totalUnits,
                imageUrl: r.images[0]?.url ? resolveImgUrl(r.images[0].url) : null,
                images: r.images.map(i => ({ id: i.id, url: resolveImgUrl(i.url) })),
            })),
            rates: rates ? { nightly: rates.nightly, weekly: rates.weekly, monthly: rates.monthly, taxRate: rates.taxRate } : null,
        });
    } catch (e) {
        console.error('CRM rooms GET error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to load rooms' });
    }
});

// Create or update a room
app.post('/api/crm/rooms', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { id, name, description, amenities, maxOccupancy, totalUnits } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Room name required' });

        let room;
        if (id) {
            // Get old name before update (for ManualRoom rename sync)
            const oldRoom = await prisma.room.findUnique({ where: { id }, select: { name: true } });
            const data = { name };
            if (description !== undefined) data.description = description || null;
            if (amenities !== undefined) data.amenities = amenities || null;
            if (maxOccupancy !== undefined) data.maxOccupancy = maxOccupancy || 4;
            if (totalUnits !== undefined) data.totalUnits = totalUnits || 1;
            room = await withRetry(() => prisma.room.update({
                where: { id },
                data,
            }));
            // If name changed, delete old ManualRoom
            if (oldRoom && oldRoom.name !== name) {
                await prisma.manualRoom.deleteMany({ where: { hotelId, name: oldRoom.name } }).catch(() => {});
            }
        } else {
            const count = await prisma.room.count({ where: { hotelId } });
            room = await withRetry(() => prisma.room.create({
                data: { hotelId, name, description: description || null, amenities: amenities || null, maxOccupancy: maxOccupancy || 4, totalUnits: totalUnits || 1, sortOrder: count },
            }));
        }

        // Sync ManualRoom for availability
        const syncUnits = totalUnits !== undefined ? (totalUnits || 1) : (room.totalUnits || 1);
        await prisma.manualRoom.upsert({
            where: { hotelId_name: { hotelId, name } },
            create: { hotelId, name, totalUnits: syncUnits },
            update: { totalUnits: syncUnits },
        });

        res.json({ success: true, room: { id: room.id, name: room.name } });
    } catch (e) {
        console.error('CRM rooms POST error:', e.message);
        const msg = e.message?.includes('Unique constraint') ? 'A room with that name already exists' : 'Failed to save room';
        res.status(500).json({ success: false, message: msg });
    }
});

// Delete a room
app.delete('/api/crm/rooms/:roomId', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        // Get room name before deleting (needed to clean up ManualRoom)
        const room = await prisma.room.findUnique({ where: { id: req.params.roomId }, select: { name: true } });
        await withRetry(() => prisma.room.delete({ where: { id: req.params.roomId } }));
        // Also delete the corresponding ManualRoom (availability)
        if (room?.name) {
            await prisma.manualRoom.deleteMany({ where: { hotelId, name: room.name } }).catch(() => {});
        }
        res.json({ success: true });
    } catch (e) {
        console.error('CRM rooms DELETE error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to delete room' });
    }
});

// Upload room image
app.post('/api/crm/rooms/:roomId/images', crmAuth, (req, res, next) => {
    req.hotelId = req.crmDefaultHotelId || req.crmResolvedHotelId || 'unknown';
    next();
}, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No image' });
        let url;
        if (R2_PUBLIC_URL) {
            const ext = path.extname(req.file.originalname) || '.jpg';
            const key = `${req.hotelId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
            url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
        } else {
            url = `/uploads/${req.hotelId}/${req.file.filename}`;
        }
        const count = await prisma.roomImage.count({ where: { roomId: req.params.roomId } });
        const image = await prisma.roomImage.create({ data: { roomId: req.params.roomId, url, sortOrder: count } });
        // If R2, url is already absolute; if disk, prepend host
        const returnUrl = R2_PUBLIC_URL ? image.url : `${req.protocol}://${req.get('host')}${image.url}`;
        res.json({ success: true, image: { id: image.id, url: returnUrl } });
    } catch (e) {
        console.error('CRM image upload error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to upload' });
    }
});

// Delete room image
app.delete('/api/crm/rooms/:roomId/images/:imageId', crmAuth, async (req, res) => {
    try {
        await withRetry(() => prisma.roomImage.delete({ where: { id: req.params.imageId } }));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to delete image' });
    }
});

// Upload custom PWA app icon for the booking engine (home-screen icon)
app.post('/api/crm/hotel-app-icon', crmAuth, (req, res, next) => {
    req.hotelId = req.crmDefaultHotelId || req.crmResolvedHotelId || 'unknown';
    next();
}, upload.single('icon'), async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (!req.file) return res.status(400).json({ success: false, message: 'No icon' });
        let url;
        if (R2_PUBLIC_URL) {
            const ext = path.extname(req.file.originalname) || '.png';
            const key = `${req.hotelId}/appicon-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
            url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
        } else {
            url = `/uploads/${req.hotelId}/${req.file.filename}`;
        }
        await withRetry(() => prisma.hotelConfig.update({ where: { id: hotelId }, data: { appIconUrl: url } }));
        const returnUrl = R2_PUBLIC_URL ? url : `${req.protocol}://${req.get('host')}${url}`;
        res.json({ success: true, appIconUrl: returnUrl });
    } catch (e) {
        console.error('CRM app icon upload error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to upload icon' });
    }
});

// Update rates
app.post('/api/crm/rates', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { nightly, weekly, monthly, taxRate } = req.body;
        await prisma.hotelRates.upsert({
            where: { hotelId },
            create: { hotelId, nightly: nightly || 69, weekly: weekly || 299, monthly: monthly || 999, taxRate: taxRate || 0.10 },
            update: { nightly: nightly || 69, weekly: weekly || 299, monthly: monthly || 999, taxRate: taxRate || 0.10 },
        });
        res.json({ success: true });
    } catch (e) {
        console.error('CRM rates error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to save rates' });
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

        triggerBookingNotifications(hotelId, [guestFirstName, guestLastName].filter(Boolean).join(' ') || null, roomName, grandTotal, checkIn);
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId },
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const leadMatch = await withRetry(() => prisma.paymentDeclinedLead.findFirst({
            where: { id, hotelId },
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
// List guest messages for the Front Desk (recent first) + unread count.
app.get('/api/crm/messages', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const rows = await withRetry(() => prisma.guestMessage.findMany({
            where: { hotelId, createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }));
        const messages = rows.map((m) => {
            let requests = [];
            try { requests = m.requests ? JSON.parse(m.requests) : []; } catch (_) { requests = []; }
            return {
                id: m.id,
                createdAt: m.createdAt,
                bookingId: m.bookingId,
                reservationCode: m.reservationCode,
                guestName: m.guestName,
                guestEmail: m.guestEmail,
                guestPhone: m.guestPhone,
                roomName: m.roomName,
                body: m.body,
                requests,
                sender: m.sender || 'guest',
                read: !!m.readAt,
            };
        });
        const unread = messages.filter((m) => !m.read).length;
        res.json({ success: true, messages, unread });
    } catch (e) {
        console.error('CRM messages list error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to load messages' });
    }
});

// Mark a single message read (scoped to the authenticated hotel).
app.post('/api/crm/messages/:id/read', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const result = await withRetry(() => prisma.guestMessage.updateMany({
            where: { id: req.params.id, hotelId },
            data: { readAt: new Date() },
        }));
        if (!result.count) return res.status(404).json({ success: false, message: 'Message not found.' });
        res.json({ success: true });
    } catch (e) {
        console.error('CRM message read error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to update message' });
    }
});

// Mark every message read for this hotel.
app.post('/api/crm/messages/read-all', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        await withRetry(() => prisma.guestMessage.updateMany({
            where: { hotelId, readAt: null },
            data: { readAt: new Date() },
        }));
        res.json({ success: true });
    } catch (e) {
        console.error('CRM messages read-all error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to update messages' });
    }
});

app.post('/api/crm/messages/:reservationCode/reply', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { reservationCode } = req.params;
        const { body } = req.body;

        if (!body || !body.trim()) return res.status(400).json({ success: false, message: 'Reply cannot be empty.' });
        if (body.length > 2000) return res.status(400).json({ success: false, message: 'Reply too long.' });

        const latestMsg = await withRetry(() => prisma.guestMessage.findFirst({
            where: { hotelId, reservationCode },
            orderBy: { createdAt: 'desc' }
        }));

        const reply = await withRetry(() => prisma.guestMessage.create({
            data: {
                hotelId,
                reservationCode,
                bookingId: latestMsg?.bookingId || null,
                guestName: latestMsg?.guestName || null,
                guestEmail: latestMsg?.guestEmail || null,
                guestPhone: latestMsg?.guestPhone || null,
                roomName: latestMsg?.roomName || null,
                body: body.trim(),
                sender: 'hotel',
                readAt: new Date(),
            }
        }));

        res.json({ success: true, message: { id: reply.id, body: reply.body, sender: 'hotel', createdAt: reply.createdAt } });
    } catch (e) {
        console.error('POST /api/crm/messages/:reservationCode/reply error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send reply.' });
    }
});

app.delete('/api/crm/bookings/:id', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const bookingMatch = await withRetry(() => prisma.booking.findFirst({
            where: { id, hotelId },
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

// Mount telemetry routes (LLM-optimized session intelligence)
telemetry.setupRoutes(app);

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

