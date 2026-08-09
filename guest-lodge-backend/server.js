const path = require('path');
require('dotenv').config();
require('dotenv').config({
    path: path.join(__dirname, '.env.local'),
    override: true,
});
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY missing — add it to guest-lodge-backend/.env (payment routes will fail until then)');
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_local_missing_set_STRIPE_SECRET_KEY_in_env');
const xml2js = require('xml2js');
const http = require('http');
const http2 = require('http2');
const https = require('https');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
const telemetry = require('./marketel-signal-extractor');
const { createFrontDeskAssistant } = require('./frontdesk-assistant');

let frontDeskAssistant = null;

// Marketel CAPI (separate pixel for the onboarding funnel)
const MARKETEL_PIXEL_ID = process.env.MARKETEL_META_PIXEL_ID || '';
const MARKETEL_ACCESS_TOKEN = process.env.MARKETEL_META_ACCESS_TOKEN || '';

async function sendMarketelCAPI(eventName, { email, phone, ip, userAgent, sourceUrl, fbp, fbc, value, currency, eventId, contentName } = {}) {
    if (!ENABLE_META_CAPI || !MARKETEL_PIXEL_ID || !MARKETEL_ACCESS_TOKEN) return;
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
        const customData = {};
        if (value) {
            customData.value = parseFloat(value);
            customData.currency = currency || 'USD';
        }
        if (contentName) customData.content_name = String(contentName).slice(0, 500);
        if (Object.keys(customData).length) eventPayload.custom_data = customData;

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
const emailTransporter = (process.env.ENABLE_OUTBOUND_EMAIL !== 'false'
    && process.env.BREVO_SMTP_HOST
    && (process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP))
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

function emailTemplateValue(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendMarketelLifecycleEmail({ toEmail, subject, template, replacements = {}, text = '' }) {
    if (!emailTransporter) {
        console.log(`⚠️ Email not configured — skipping ${template}`);
        return false;
    }
    try {
        let html = fs.readFileSync(path.join(__dirname, 'email-templates', template), 'utf8');
        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), emailTemplateValue(value));
        }

        await emailTransporter.sendMail({
            from: '"Marketel" <support@bookmarketel.com>',
            to: toEmail,
            subject: String(subject || 'Marketel update').replace(/[\r\n]+/g, ' ').slice(0, 180),
            html,
            text,
        });
        console.log(`✅ ${template} sent to ${toEmail}`);
        return true;
    } catch (e) {
        console.error(`❌ ${template} failed:`, e.message);
        return false;
    }
}

async function sendPreviewReadyEmail({ toEmail, hotelName, hotelId, pin, domain, frontdeskUrl }) {
    return sendMarketelLifecycleEmail({
        toEmail,
        subject: `Your ${hotelName || 'Marketel'} preview is ready`,
        template: 'preview-ready.html',
        replacements: {
            HOTEL_NAME: hotelName || 'Your property',
            HOTEL_ID: hotelId,
            DOMAIN: domain,
            PIN: pin,
            FRONTDESK_URL: frontdeskUrl,
        },
        text: `Your Marketel preview is ready.\n\nFront Desk: ${frontdeskUrl}\nProperty ID: ${hotelId}\nPIN: ${pin}\nBooking-page preview: https://${domain}\n\nThe booking page remains in preview mode until you activate Marketel.`,
    });
}

async function sendActivationEmail({ toEmail, hotelName, hotelId, domain, frontdeskUrl }) {
    return sendMarketelLifecycleEmail({
        toEmail,
        subject: `${hotelName || 'Your Marketel property'} is activated`,
        template: 'activation.html',
        replacements: {
            HOTEL_NAME: hotelName || 'Your property',
            HOTEL_ID: hotelId,
            DOMAIN: domain,
            FRONTDESK_URL: frontdeskUrl,
        },
        text: `${hotelName || 'Your property'} is activated.\n\nOpen Front Desk: ${frontdeskUrl}\nProperty ID: ${hotelId}\nBooking page: https://${domain}\n\nNext: turn on Front Desk alerts, review availability, and make one test booking. Questions? Reply to this email.`,
    });
}

// Build a durable link back to the guest's reservation page (survives closing
// the app). Prefers the hotel's own domain; falls back to the request origin.
async function buildGuestSiteBase(hotelId, req) {
    let base = '';
    try {
        const d = await prisma.hotelDomain.findFirst({ where: { hotelId }, orderBy: { isPrimary: 'desc' } });
        if (d?.domain) base = `https://${d.domain}`;
    } catch (_) {}
    if (!base && req) {
        const ref = req.headers?.referer || req.headers?.origin || '';
        try { const u = new URL(ref); base = `${u.protocol}//${u.host}`; } catch (_) {}
    }
    return base;
}

async function buildGuestBookingUrl(hotelId, code, req) {
    if (!code) return '';
    const base = await buildGuestSiteBase(hotelId, req);
    if (!base) return '';
    return `${base}/booking/${encodeURIComponent(code)}`;
}

async function buildGuestInstallUrl(hotelId, code, req, ref = 'email') {
    const base = await buildGuestSiteBase(hotelId, req);
    if (!base) return '';
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (ref) params.set('ref', ref);
    const qs = params.toString();
    return `${base}/install${qs ? `?${qs}` : ''}`;
}

function guestInstallEmailBlockHtml({ hotelName, installUrl }) {
    if (!installUrl) return '';
    const safeName = hotelName || 'your hotel';
    return `<div style="background:linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%);border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:6px;">📱 Add ${safeName} to your phone</div>
        <p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.55;">Message the front desk, get check-in updates, and book direct next time — like a real app, no app store.</p>
        <a href="${installUrl}" style="display:inline-block;background:#ffffff;color:#1a5c3f;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:10px;">Add to Home Screen →</a>
        <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:12px;line-height:1.5;">On iPhone: open the link in Safari → Share → Add to Home Screen</div>
    </div>`;
}

async function notifyGuestBookingConfirmed({ req, hotelId, guestInfo, bookingDetails, reservationCode }) {
    if (!guestInfo?.email) return;
    const hotelForEmail = await prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { name: true, phone: true } }).catch(() => null);
    const emailCode = reservationCode || bookingDetails?.reservationCode;
    const bookingUrl = await buildGuestBookingUrl(hotelId, emailCode, req);
    const installUrl = await buildGuestInstallUrl(hotelId, emailCode, req, 'confirmation-email');
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
        installUrl,
    });
}

async function sendGuestConfirmationEmail({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, checkout, nights, total, reservationCode, bookingUrl, installUrl }) {
    if (!emailTransporter || !guestEmail) return;
    try {
        const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const checkoutStr = new Date(checkout).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const totalStr = total ? `$${Number(total).toFixed(2)}` : '';
        const phoneStr = hotelPhone ? ` — ${hotelPhone}` : '.';

        const installBlock = guestInstallEmailBlockHtml({ hotelName, installUrl });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#2E7D5B;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Reservation Confirmed ✓</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Hi ${guestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5;">Your reservation at <strong>${hotelName}</strong> is confirmed. Here are your details:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:20px;"><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Room</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${roomName}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-in</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkinStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-out</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkoutStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Nights</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${nights}</div></td></tr>${totalStr ? `<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Total</div><div style="font-size:15px;font-weight:600;color:#2E7D5B;">${totalStr}</div></td></tr>` : ''}<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Confirmation #</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${reservationCode}</div></td></tr></table>${installBlock}${bookingUrl ? `<div style="text-align:center;margin:0 0 20px;"><a href="${bookingUrl}" style="display:inline-block;background:#2E7D5B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:10px;">View my reservation</a><div style="font-size:11px;color:#9ca3af;margin-top:8px;">Message the front desk, add to your calendar, or book again anytime.</div></div>` : ''}<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">If you have any questions, contact the hotel directly${phoneStr}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

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

async function sendGuestInstallReminderEmail({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, installUrl, bookingUrl }) {
    if (!emailTransporter || !guestEmail || !installUrl) return false;
    try {
        const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const phoneStr = hotelPhone ? ` — ${hotelPhone}` : '.';
        const installBlock = guestInstallEmailBlockHtml({ hotelName, installUrl });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#1a2b22;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Check-in tomorrow at ${hotelName}</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${guestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">You're checking in <strong>${checkinStr}</strong>${roomName ? ` in <strong>${roomName}</strong>` : ''}. Add <strong>${hotelName}</strong> to your home screen now — message us for WiFi, early check-in, or anything you need.</p>${installBlock}${bookingUrl ? `<div style="text-align:center;margin:0 0 16px;"><a href="${bookingUrl}" style="display:inline-block;background:#f3f4f6;color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;padding:11px 20px;border-radius:10px;">View reservation details</a></div>` : ''}<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Questions? Contact the hotel directly${phoneStr}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;
        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: guestEmail,
            subject: `Add ${hotelName} to your phone before check-in`,
            html,
        });
        console.log(`✅ Guest install reminder sent to ${guestEmail}`);
        return true;
    } catch (e) {
        console.error('❌ Guest install reminder failed:', e.message);
        return false;
    }
}

async function recordGuestInstallEvent({ hotelId, reservationCode, touchpoint, eventType, userAgent }) {
    if (!hotelId || !touchpoint || !eventType) return;
    try {
        await prisma.guestInstallEvent.create({
            data: {
                hotelId,
                reservationCode: reservationCode || null,
                touchpoint: String(touchpoint).slice(0, 64),
                eventType: String(eventType).slice(0, 32),
                userAgent: userAgent ? String(userAgent).slice(0, 512) : null,
            },
        });
    } catch (e) {
        console.error('GuestInstallEvent create failed:', e.message);
    }
}

async function markGuestAppInstalled(hotelId, reservationCode) {
    if (!hotelId || !reservationCode) return;
    try {
        await prisma.booking.updateMany({
            where: {
                hotelId,
                guestAppInstalledAt: null,
                OR: [
                    { ourReservationCode: reservationCode },
                    { pmsConfirmationCode: reservationCode },
                ],
            },
            data: { guestAppInstalledAt: new Date() },
        });
    } catch (e) {
        console.error('markGuestAppInstalled failed:', e.message);
    }
}

/** Send pre-check-in install reminders for bookings checking in within ~36 hours. */
async function runGuestInstallReminders() {
    if (!emailTransporter) return { sent: 0, skipped: 0 };
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() + 12);
    const windowEnd = new Date(now);
    windowEnd.setHours(windowEnd.getHours() + 36);

    const bookings = await prisma.booking.findMany({
        where: {
            guestInstallReminderSentAt: null,
            guestAppInstalledAt: null,
            guestEmail: { not: '' },
            checkinDate: { gte: windowStart, lte: windowEnd },
            status: ACTIVE_BOOKING_STATUS_FILTER,
        },
        take: 50,
    }).catch(() => []);
    const hotelIds = [...new Set(bookings.map((booking) => booking.hotelId).filter(Boolean))];
    const [hotels, domains] = hotelIds.length
        ? await Promise.all([
            prisma.hotelConfig.findMany({
                where: { id: { in: hotelIds } },
                select: { id: true, name: true, phone: true },
            }).catch(() => []),
            prisma.hotelDomain.findMany({
                where: { hotelId: { in: hotelIds } },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                select: { hotelId: true, domain: true },
            }).catch(() => []),
        ])
        : [[], []];
    const hotelsById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
    const domainsByHotelId = new Map();
    for (const domain of domains) {
        if (!domainsByHotelId.has(domain.hotelId)) {
            domainsByHotelId.set(domain.hotelId, domain.domain);
        }
    }

    let sent = 0;
    let skipped = 0;
    for (const b of bookings) {
        const code = b.pmsConfirmationCode || b.ourReservationCode;
        if (b.guestAppInstalledAt) {
            await prisma.booking.update({
                where: { id: b.id },
                data: { guestInstallReminderSentAt: new Date() },
            }).catch(() => {});
            skipped++;
            continue;
        }

        const hotel = hotelsById.get(b.hotelId);
        const domain = domainsByHotelId.get(b.hotelId);
        const base = domain ? `https://${domain}` : '';
        if (!base) { skipped++; continue; }

        const installUrl = `${base}/install?code=${encodeURIComponent(code)}&ref=checkin-reminder`;
        const bookingUrl = `${base}/booking/${encodeURIComponent(code)}`;
        const ok = await sendGuestInstallReminderEmail({
            guestEmail: b.guestEmail,
            guestName: [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ') || 'there',
            hotelName: hotel?.name || 'Your Hotel',
            hotelPhone: hotel?.phone || '',
            roomName: b.roomName,
            checkin: b.checkinDate,
            installUrl,
            bookingUrl,
        });
        if (ok) {
            await prisma.booking.update({
                where: { id: b.id },
                data: { guestInstallReminderSentAt: new Date() },
            }).catch(() => {});
            sent++;
        } else {
            skipped++;
        }
    }
    if (sent > 0) console.log(`📱 Guest install reminders sent: ${sent}`);
    return { sent, skipped };
}

// Web Push configuration
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@bookmarketel.com';

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

// Native iOS push. APNS_PRIVATE_KEY accepts either the literal .p8 contents or
// a one-line environment value containing escaped newlines.
const APNS_TEAM_ID = String(process.env.APNS_TEAM_ID || '').trim();
const APNS_KEY_ID = String(process.env.APNS_KEY_ID || '').trim();
const APNS_PRIVATE_KEY = String(process.env.APNS_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
const APNS_BUNDLE_ID = String(process.env.APNS_BUNDLE_ID || 'com.bookmarketel.frontdesk').trim();
let APNS_PRIVATE_KEY_OBJECT = null;
if (APNS_PRIVATE_KEY) {
    try {
        APNS_PRIVATE_KEY_OBJECT = crypto.createPrivateKey(APNS_PRIVATE_KEY);
    } catch (error) {
        console.error(`❌ APNs private key is invalid: ${error.message}`);
    }
}
const APNS_CONFIGURED = !!(APNS_TEAM_ID && APNS_KEY_ID && APNS_PRIVATE_KEY_OBJECT && APNS_BUNDLE_ID);
if (APNS_CONFIGURED) {
    console.log(`✅ Native iOS push configured for ${APNS_BUNDLE_ID}`);
}

const app = express();
app.use(compression());

const LOCAL_API_PROXY_URL = String(process.env.LOCAL_API_PROXY_URL || '').replace(/\/$/, '');

function proxyLocalApiRequest(req, res, next) {
    if (!LOCAL_API_PROXY_URL || !req.originalUrl.startsWith('/api/')) return next();

    let target;
    try {
        target = new URL(req.originalUrl, `${LOCAL_API_PROXY_URL}/`);
    } catch (_) {
        return res.status(500).json({ success: false, message: 'Invalid local API proxy configuration.' });
    }

    const transport = target.protocol === 'https:' ? https : http;
    const headers = { ...req.headers, host: target.host };
    const proxyRequest = transport.request(target, {
        method: req.method,
        headers,
    }, (proxyResponse) => {
        res.status(proxyResponse.statusCode || 502);
        Object.entries(proxyResponse.headers).forEach(([key, value]) => {
            if (value !== undefined) res.setHeader(key, value);
        });
        proxyResponse.pipe(res);
    });

    proxyRequest.on('error', (error) => {
        if (!res.headersSent) {
            res.status(502).json({ success: false, message: `Local API proxy failed: ${error.message}` });
        } else {
            res.destroy(error);
        }
    });
    req.pipe(proxyRequest);
}

app.use(proxyLocalApiRequest);

function getPrismaDatasourceUrl() {
    const base = process.env.DATABASE_URL || '';
    if (!base) return base;
    const isLocalDb = /localhost|127\.0\.0\.1/i.test(base);
    // The Front Desk hydrates several independent read models together. A
    // single remote connection turns those reads into a queue and makes both
    // localhost and the native app feel several seconds slower than the
    // underlying queries. Neon is accessed through its pooler, so a small
    // bounded pool gives us concurrency without opening an excessive number of
    // database connections.
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || (isLocalDb ? '10' : '5');
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '20';
    const connectTimeout = process.env.PRISMA_CONNECT_TIMEOUT || '15';

    try {
        const url = new URL(base);
        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', connectionLimit);
        }
        if (!url.searchParams.has('pool_timeout')) {
            url.searchParams.set('pool_timeout', poolTimeout);
        }
        if (!isLocalDb && !url.searchParams.has('connect_timeout')) {
            // Neon may need a few seconds to wake an idle compute. Prisma's
            // default timeout can expire first and surface a misleading P1001.
            url.searchParams.set('connect_timeout', connectTimeout);
        }
        if (!isLocalDb && connectionLimit === '1' && !url.searchParams.has('pgbouncer')) {
            url.searchParams.set('pgbouncer', 'true');
        }
        return url.toString();
    } catch (_) {
        const parts = [
            `connection_limit=${connectionLimit}`,
            `pool_timeout=${poolTimeout}`,
            `connect_timeout=${connectTimeout}`,
        ];
        if (!isLocalDb && connectionLimit === '1') parts.unshift('pgbouncer=true');
        return base + (base.includes('?') ? '&' : '?') + parts.join('&');
    }
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: getPrismaDatasourceUrl(),
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
            const isPoolTimeout =
                msg.includes('P2024') ||
                msg.includes('connection pool') ||
                msg.includes('pool timeout');
            const isConnErr =
                !isPoolTimeout && (
                    msg.includes("Can't reach database") ||
                    msg.includes('P1001') ||
                    msg.includes('P1017') ||
                    msg.includes('Engine is not yet connected') ||
                    msg.includes('timed out') ||
                    msg.includes('Connection refused') ||
                    msg.includes('ECONNRESET') ||
                    msg.includes('socket hang up')
                );
            if (isPoolTimeout && i < retries - 1) {
                await new Promise(r => setTimeout(r, delay * (i + 1)));
                continue;
            }
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
    'capacitor://localhost',
    'ionic://localhost',
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
        // Allow mktel.co and all subdomains
        if (origin === 'https://mktel.co' || origin.endsWith('.mktel.co')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
};



// Stripe webhooks need their untouched raw body for signature verification.
app.use('/api/stripe-webhook', express.raw({type: 'application/json'}));
app.use('/api/marketel-stripe-webhook', express.raw({type: 'application/json'}));
app.use(cors(corsOptions));

// Front Desk must be registered BEFORE express.static(public) — otherwise static
// sees public/frontdesk/ as a directory and 301-redirects /frontdesk → /frontdesk/,
// which on Vercel hotel domains falls through to the booking-engine SPA.
const FRONTDESK_BUILT = path.join(__dirname, 'public', 'frontdesk', 'index.html');
const FRONTDESK_LEGACY = path.join(__dirname, 'simple-crm.html');
let cachedFrontdeskHtml = '';

function serveFrontdesk(_req, res) {
    res.setHeader('Cache-Control', 'no-cache');
    try {
        if (process.env.NODE_ENV === 'production' && cachedFrontdeskHtml) {
            return res.type('html').send(cachedFrontdeskHtml);
        }
        const file = fs.existsSync(FRONTDESK_BUILT) ? FRONTDESK_BUILT : FRONTDESK_LEGACY;
        let html = fs.readFileSync(file, 'utf8');
        const stats = fs.statSync(file);
        const version = Math.floor(stats.mtimeMs);
        html = html.replace(/\/frontdesk\/assets\/([^"']+)/g, '/frontdesk/assets/$1?v=' + version);
        if (process.env.NODE_ENV === 'production') cachedFrontdeskHtml = html;
        res.send(html);
    } catch (e) {
        const file = fs.existsSync(FRONTDESK_BUILT) ? FRONTDESK_BUILT : FRONTDESK_LEGACY;
        res.sendFile(file);
    }
}

function marketelFrontdeskOrigin(req, preferredOrigin = '') {
    const candidates = [
        preferredOrigin,
        req?.get?.('origin'),
        process.env.MARKETEL_FRONTDESK_ORIGIN,
        process.env.NODE_ENV === 'production' ? 'https://bookmarketel.com' : '',
        req ? `${req.protocol}://${req.get('host')}` : '',
    ];
    for (const candidate of candidates) {
        if (!candidate) continue;
        try {
            const parsed = new URL(candidate);
            const hostname = parsed.hostname.toLowerCase();
            const requestHostname = String(req?.hostname || '').toLowerCase();
            const isMarketel = hostname === 'bookmarketel.com' || hostname.endsWith('.bookmarketel.com');
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
            const isBackendHost = hostname.endsWith('.onrender.com')
                && requestHostname
                && hostname === requestHostname;
            if (parsed.protocol === 'https:' && (isMarketel || isBackendHost)) return parsed.origin;
            if (parsed.protocol === 'http:' && isLocal) return parsed.origin;
        } catch (_) { /* try the next trusted candidate */ }
    }
    return 'https://bookmarketel.com';
}

function frontdeskReturnHtml({ token = '', activated = false, reveal = '' } = {}) {
    const cleanToken = String(token || '').trim();
    const nextPath = activated
        ? '/frontdesk?activated=1'
        : reveal === 'checkout'
            ? '/frontdesk?welcome=1&reveal=checkout'
            : '/frontdesk';
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening Front Desk...</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f8f5;color:#1a2b22}.box{text-align:center;padding:24px}.mark{width:38px;height:38px;margin:0 auto 14px;border-radius:50%;border:4px solid #d8e4dc;border-top-color:#2E7D5B;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.title{font-size:15px;font-weight:800}.sub{margin-top:6px;font-size:12px;color:#66756c}</style></head><body><div class="box"><div class="mark"></div><div class="title">Opening Front Desk</div><div class="sub">Finishing activation...</div></div><script>!function(){var token=${JSON.stringify(cleanToken)};var next=${JSON.stringify(nextPath)};try{console.info("[FrontDesk return] bridge loaded",{hasToken:!!token,tokenKind:token&&token.indexOf("fd_")===0?"return-token":token?"pin":"none"});}catch(e){}try{if(token){localStorage.setItem("crmToken",token);document.cookie="frontdeskReturnToken="+encodeURIComponent(token)+"; path=/; max-age=86400; SameSite=Lax; Secure";}}catch(e){try{console.warn("[FrontDesk return] token storage failed",e&&e.message?e.message:e);}catch(_){}}location.replace(next);}();</script></body></html>`;
}

function redactFrontdeskAuthUrl(url) {
    return String(url || '').replace(/([?&](?:returnToken|pin)=)[^&]+/g, '$1[redacted]');
}

app.get('/frontdesk-return', (req, res) => {
    const token = String(req.query.pin || req.query.returnToken || '').trim();
    const activated = String(req.query.activated || '') === '1';
    const reveal = String(req.query.reveal || '').trim() === 'checkout' ? 'checkout' : '';
    res.setHeader('Cache-Control', 'no-store');
    console.log('frontdesk-return bridge served:', {
        host: req.get('host'),
        hasToken: !!token,
        tokenKind: token.startsWith('fd_') ? 'return-token' : (token ? 'pin' : 'none'),
        activated,
        reveal,
    });
    res.send(frontdeskReturnHtml({ token, activated, reveal }));
});
app.get(['/frontdesk', '/frontdesk/'], serveFrontdesk);
app.get('/simple-crm.html', (req, res) => {
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    res.redirect(302, '/frontdesk' + query);
});
app.use('/frontdesk/assets', express.static(path.join(__dirname, 'public', 'frontdesk', 'assets'), {
    maxAge: '365d',
    immutable: true,
}));

app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
}, express.static(path.join(__dirname, 'public', 'uploads')));

// Service workers must never be served stale — a pinned copy would keep handling
// pushes with the old notification logic long after a deploy.
app.use((req, res, next) => {
    if (/-sw\.js$|^\/sw\.js$/.test(req.path)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Webhook requests already have a Buffer body from express.raw above. Express
// detects that parsed body and skips JSON parsing, so one global parser is enough.
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

function isPrismaConnectionError(error) {
    const message = String(error?.message || error || '');
    return error?.code === 'P1001'
        || message.includes('Can\'t reach database server')
        || message.includes('Engine is not yet connected')
        || message.includes('Timed out fetching a new connection from the connection pool');
}

function isStaticOnlyHotelId(hotelId) {
    const key = String(hotelId || '').trim();
    return !!hotelConfig[key] && process.env.PREFER_DB_HOTEL_CONFIG !== 'true';
}

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
    if (isStaticOnlyHotelId(key)) return null;

    const cached = hotelConfigCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let row = null;
    try {
        row = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: key },
            include: { domains: true },
        }));

    // Fallback: resolve by domain if direct ID lookup fails
    // e.g. "john-s-inn" → look up "john-s-inn.mktel.co" in HotelDomain
    if (!row && prisma.hotelDomain) {
        const domainGuess = key + '.mktel.co';
        let domainRecord = await withRetry(() => prisma.hotelDomain.findUnique({ where: { domain: domainGuess } }));
        if (!domainRecord) {
            domainRecord = await withRetry(() => prisma.hotelDomain.findUnique({ where: { domain: key + '.bookmarketel.com' } }));
        }
        if (domainRecord) {
            row = await withRetry(() => prisma.hotelConfig.findUnique({
                where: { id: domainRecord.hotelId },
                include: { domains: true },
            }));
        }
    }

    } catch (error) {
        if (!isPrismaConnectionError(error)) throw error;
        console.warn(`DB unavailable while loading hotel config for ${key}; falling back to static config if present.`);
        if (!hotelConfig[key]) {
            const unavailable = new Error('Hotel database is temporarily unavailable. Please retry in a moment.');
            unavailable.code = 'DATABASE_UNAVAILABLE';
            unavailable.status = 503;
            throw unavailable;
        }
        return null;
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
            bookingApprovalEnabled: row.bookingApprovalEnabled === true,
            bookingApprovalWindowMinutes: row.bookingApprovalWindowMinutes,
            bookingApprovalNoResponseAction: row.bookingApprovalNoResponseAction,
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
    if (override.status === 'unsubscribed') {
        return { ok: false, status: 402, message: 'Online bookings are not activated for this property.' };
    }
    // Fallback: resolve via domain (e.g. "john-hotel" → "john-hotel.mktel.co" → real ID)
    if (prisma.hotelDomain) {
        const domainGuess = cleanHotelId + '.mktel.co';
        let domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } }).catch(() => null);
        if (!domainRecord) {
            domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: cleanHotelId + '.bookmarketel.com' } }).catch(() => null);
        }
        if (domainRecord) {
            const row = await prisma.hotelConfig.findUnique({
                where: { id: domainRecord.hotelId },
                select: { id: true, active: true, subscribed: true, setupToken: true },
            }).catch(() => null);
            if (row) {
                if (!row.active) {
                    return { ok: false, status: 403, message: `Hotel is inactive: ${row.id}` };
                }
                if (row.setupToken && !row.subscribed) {
                    return { ok: false, status: 402, message: 'Online bookings are not activated for this property.' };
                }
                return { ok: true, hotelId: row.id };
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

function createRouteRateLimiter(name, { windowMs, max, scope }) {
    return (req, res, next) => {
        const now = Date.now();
        let requestScope = '';
        if (typeof scope === 'function') {
            try { requestScope = String(scope(req) || '').trim().slice(0, 180).toLowerCase(); }
            catch (_) { requestScope = ''; }
        }
        const key = `${name}:${getRateLimitClientKey(req)}:${requestScope}`;
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
        const [realRooms, manualRooms] = await Promise.all([
            prisma.room.findMany({ where: { hotelId }, select: { name: true, totalUnits: true } }),
            prisma.manualRoom.findMany({ where: { hotelId }, select: { name: true } }),
        ]);
        const manualNames = new Set(manualRooms.map(r => r.name));
        // Never delete an unmatched ManualRoom here. It may contain months of
        // overrides from a legacy rename. Mutating routes keep both catalogs in
        // sync transactionally; this read path only repairs missing rows.
        const toCreate = realRooms.filter(r => !manualNames.has(r.name));
        await Promise.all(toCreate.map(r => prisma.manualRoom.upsert({
                where: { hotelId_name: { hotelId, name: r.name } },
                create: { hotelId, name: r.name, totalUnits: r.totalUnits || 1 },
                update: { totalUnits: r.totalUnits || 1 },
            })));
    } catch (e) { /* sync failed silently — continue with what we have */ }

    return withRetry(() => prisma.manualRoom.findMany({
        where: { hotelId },
        include: { overrides: true },
        orderBy: { name: 'asc' },
    }));
}

// Statuses that hand a room back to inventory and drop out of reporting.
// 'pending' is deliberately absent: a booking awaiting owner approval must keep
// holding its room so the same night cannot be sold twice while the owner decides.
const DEAD_BOOKING_STATUSES = ['cancelled', 'canceled', 'released'];

// Reusable Prisma filter for "bookings that still count".
const ACTIVE_BOOKING_STATUS_FILTER = { notIn: DEAD_BOOKING_STATUSES };

function roomCatalogError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function safeRoomUnits(value, fallback = 1) {
    if (value === undefined || value === null || value === '') return Math.max(1, Number(fallback) || 1);
    return Math.max(1, parseInt(value, 10) || 1);
}

async function saveRoomCatalogEntry({
    hotelId,
    roomId = '',
    name,
    description,
    amenities,
    maxOccupancy,
    totalUnits,
}) {
    const roomName = String(name || '').trim();
    if (!hotelId || !roomName) throw roomCatalogError('ROOM_INVALID', 'Room name required.');

    return prisma.$transaction(async (tx) => {
        // One catalog lock per property prevents simultaneous renames from
        // splitting guest-facing rooms and availability into different names.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext('room-catalog'))`;

        const existing = roomId
            ? await tx.room.findFirst({ where: { id: roomId, hotelId } })
            : await tx.room.findUnique({ where: { hotelId_name: { hotelId, name: roomName } } });
        if (roomId && !existing) throw roomCatalogError('ROOM_NOT_FOUND', 'Room type not found.');

        const oldName = existing?.name || '';
        if (oldName && oldName !== roomName) {
            const conflictingRoom = await tx.room.findUnique({
                where: { hotelId_name: { hotelId, name: roomName } },
                select: { id: true },
            });
            if (conflictingRoom && conflictingRoom.id !== existing.id) {
                throw roomCatalogError('ROOM_NAME_CONFLICT', 'A room with this name already exists.');
            }
        }

        const units = safeRoomUnits(totalUnits, existing?.totalUnits || 1);
        const data = { name: roomName, totalUnits: units };
        if (description !== undefined) data.description = description || null;
        if (amenities !== undefined) data.amenities = amenities || null;
        if (maxOccupancy !== undefined) data.maxOccupancy = Math.max(1, parseInt(maxOccupancy, 10) || 4);

        let room;
        if (existing) {
            room = await tx.room.update({ where: { id: existing.id }, data });
        } else {
            const count = await tx.room.count({ where: { hotelId } });
            room = await tx.room.create({
                data: {
                    hotelId,
                    ...data,
                    description: data.description ?? null,
                    amenities: data.amenities ?? null,
                    maxOccupancy: data.maxOccupancy ?? 4,
                    sortOrder: count,
                },
            });
        }

        const oldManual = oldName
            ? await tx.manualRoom.findUnique({ where: { hotelId_name: { hotelId, name: oldName } } })
            : null;
        const newManual = await tx.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
        });

        let syncedManualRoom;
        if (oldName && oldName !== roomName && oldManual) {
            if (newManual && newManual.id !== oldManual.id) {
                throw roomCatalogError(
                    'ROOM_NAME_CONFLICT',
                    'That room name already has availability saved. Choose another name so no dates are overwritten.'
                );
            }
            syncedManualRoom = await tx.manualRoom.update({
                where: { id: oldManual.id },
                data: { name: roomName, totalUnits: units },
            });
        } else {
            syncedManualRoom = await tx.manualRoom.upsert({
                where: { hotelId_name: { hotelId, name: roomName } },
                create: { hotelId, name: roomName, totalUnits: units },
                update: { totalUnits: units },
            });
        }

        // A room-count reduction must not leave a date explicitly selling more
        // units than the property now owns.
        await tx.manualOverride.updateMany({
            where: { roomId: syncedManualRoom.id, availableUnits: { gt: units } },
            data: { availableUnits: units },
        });

        if (oldName && oldName !== roomName) {
            await tx.booking.updateMany({
                where: { hotelId, roomName: oldName },
                data: { roomName },
            });
            await tx.guestMessage.updateMany({
                where: { hotelId, roomName: oldName },
                data: { roomName },
            });
            const assistantActions = await tx.frontDeskAssistantPendingAction.findMany({
                where: {
                    hotelId,
                    status: { in: ['pending', 'applied'] },
                    expiresAt: { gt: new Date() },
                },
            });
            for (const action of assistantActions) {
                const payload = action.payload || {};
                if (String(payload.roomName || '') !== oldName) continue;
                await tx.frontDeskAssistantPendingAction.update({
                    where: { id: action.id },
                    data: { payload: { ...payload, roomName } },
                });
            }
        }
        return room;
    }, { maxWait: 5000, timeout: 15000 });
}

async function deleteRoomCatalogEntry({ hotelId, roomId = '', roomName = '' }) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext('room-catalog'))`;
        const room = roomId
            ? await tx.room.findFirst({ where: { id: roomId, hotelId } })
            : await tx.room.findUnique({ where: { hotelId_name: { hotelId, name: roomName } } });
        if (roomId && !room) throw roomCatalogError('ROOM_NOT_FOUND', 'Room type not found.');
        const resolvedName = room?.name || String(roomName || '').trim();
        const liveBookingCount = resolvedName
            ? await tx.booking.count({
                where: {
                    hotelId,
                    roomName: resolvedName,
                    status: ACTIVE_BOOKING_STATUS_FILTER,
                    checkoutDate: { gt: new Date() },
                },
            })
            : 0;
        if (liveBookingCount > 0) {
            throw roomCatalogError(
                'ROOM_HAS_BOOKINGS',
                `This room has ${liveBookingCount} current or upcoming ${liveBookingCount === 1 ? 'booking' : 'bookings'}. Cancel or move them before deleting it.`
            );
        }
        if (room) await tx.room.delete({ where: { id: room.id } });
        if (resolvedName) {
            await tx.manualRoom.deleteMany({ where: { hotelId, name: resolvedName } });
        }
        return { roomName: resolvedName, deleted: !!room };
    }, { maxWait: 5000, timeout: 15000 });
}

function isDeadBookingStatus(status) {
    return DEAD_BOOKING_STATUSES.includes(String(status || '').trim().toLowerCase());
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
            status: ACTIVE_BOOKING_STATUS_FILTER,
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

class ManualInventoryUnavailableError extends Error {
    constructor(message = 'That room was just booked for one of those nights.') {
        super(message);
        this.name = 'ManualInventoryUnavailableError';
        this.code = 'MANUAL_INVENTORY_UNAVAILABLE';
    }
}

function parseInventoryOverrideDates(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? [...new Set(parsed.map(normalizeIsoDate).filter(Boolean))]
            : [];
    } catch (_) {
        return [];
    }
}

function manualBookingStayDates(checkin, checkout) {
    const start = normalizeIsoDate(checkin);
    const end = normalizeIsoDate(checkout);
    if (!start || !end || end <= start) return [];
    const lastNight = new Date(new Date(`${end}T00:00:00.000Z`).getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
    return enumerateDatesInclusive(start, lastNight, 180);
}

// The public availability lookup is only a snapshot. Re-check and reserve the
// final unit in one database transaction immediately before confirming. The
// advisory lock works across Node processes, so two simultaneous checkouts for
// the same room cannot both pass the last-unit check.
async function createManualBookingRecordWithInventory(hotelId, bookingData) {
    const roomName = String(bookingData?.roomName || '').trim();
    const stayDates = manualBookingStayDates(bookingData?.checkinDate, bookingData?.checkoutDate);
    if (!hotelId || !roomName || !stayDates.length) {
        throw new ManualInventoryUnavailableError('Those stay dates are no longer available.');
    }

    return prisma.$transaction(async (tx) => {
        // This function returns PostgreSQL `void`, which Prisma cannot deserialize
        // through $queryRaw. Execute it for its locking side effect instead.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext(${roomName}))`;

        // A browser retry after a slow response must return the booking it
        // already created instead of consuming a second room.
        if (bookingData.stripePaymentIntentId) {
            const existing = await tx.booking.findUnique({
                where: { stripePaymentIntentId: bookingData.stripePaymentIntentId },
            });
            if (existing) return { booking: existing, created: false };
        }

        const room = await tx.manualRoom.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
            include: {
                overrides: {
                    where: { date: { in: stayDates } },
                },
            },
        });
        if (!room || room.totalUnits < 1) {
            throw new ManualInventoryUnavailableError();
        }

        const checkinDate = new Date(`${stayDates[0]}T00:00:00.000Z`);
        const checkoutDate = new Date(
            new Date(`${stayDates[stayDates.length - 1]}T00:00:00.000Z`).getTime() + 86400000
        );
        const overlapping = await tx.booking.findMany({
            where: {
                hotelId,
                roomName,
                checkinDate: { lt: checkoutDate },
                checkoutDate: { gt: checkinDate },
                status: ACTIVE_BOOKING_STATUS_FILTER,
            },
            select: { checkinDate: true, checkoutDate: true },
        });

        const bookedByDate = {};
        for (const booking of overlapping) {
            for (const day of manualBookingStayDates(booking.checkinDate, booking.checkoutDate)) {
                bookedByDate[day] = (bookedByDate[day] || 0) + 1;
            }
        }

        const overrideByDate = Object.fromEntries((room.overrides || []).map((override) => [override.date, override]));
        const consumedOverrideDates = [];
        for (const day of stayDates) {
            const override = overrideByDate[day];
            if (override?.closed) throw new ManualInventoryUnavailableError();
            if (override && override.availableUnits !== null) {
                if (override.availableUnits < 1) throw new ManualInventoryUnavailableError();
                consumedOverrideDates.push(day);
            } else if ((bookedByDate[day] || 0) >= room.totalUnits) {
                throw new ManualInventoryUnavailableError();
            }
        }

        // Explicit overrides represent remaining sellable units. Decrement only
        // after every night has passed validation, while the room lock is held.
        for (const day of consumedOverrideDates) {
            const override = overrideByDate[day];
            const updated = await tx.manualOverride.updateMany({
                where: {
                    id: override.id,
                    closed: false,
                    availableUnits: { gt: 0 },
                },
                data: { availableUnits: { decrement: 1 } },
            });
            if (updated.count !== 1) throw new ManualInventoryUnavailableError();
        }

        const booking = await tx.booking.create({
            data: {
                ...bookingData,
                status: bookingData.status || 'confirmed',
                inventoryOverrideDates: consumedOverrideDates.length
                    ? JSON.stringify(consumedOverrideDates)
                    : null,
            },
        });
        return { booking, created: true };
    }, { maxWait: 5000, timeout: 15000 });
}

const MANUAL_REVENUE_PERIODS = new Set(['today', '7d', '30d', '90d', 'all', 'custom']);

function buildManualRevenueWindow(period, referenceIso, earliestIso = '', latestIso = '') {
    const endIso = normalizeIsoDate(referenceIso) || getReportingTodayIso();

    if (period === 'custom') {
        const customStart = normalizeIsoDate(earliestIso);
        const customEnd = normalizeIsoDate(latestIso);
        if (!customStart || !customEnd || customEnd < customStart) {
            throw new Error('Choose a valid custom revenue date range.');
        }
        const spanDays = Math.floor(
            (new Date(`${customEnd}T00:00:00.000Z`).getTime()
                - new Date(`${customStart}T00:00:00.000Z`).getTime()) / 86400000
        ) + 1;
        if (spanDays > 5000) throw new Error('Custom revenue ranges cannot exceed 5,000 days.');
        const prevEndIso = addDaysToIso(customStart, -1);
        return {
            startIso: customStart,
            endIso: customEnd,
            prevStartIso: addDaysToIso(prevEndIso, 1 - spanDays),
            prevEndIso,
        };
    }

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
                status: ACTIVE_BOOKING_STATUS_FILTER,
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
let funnelTrackingEnabled = process.env.ENABLE_FUNNEL_TRACKING !== 'false';

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
const crmVerifyRateLimit = createRouteRateLimiter('crm-verify', { windowMs: 5 * 60 * 1000, max: 10 });
const funnelOnboardingRateLimit = createRouteRateLimiter('marketel-onboarding', { windowMs: 60 * 1000, max: 40 });
const journeyEventRateLimit = createRouteRateLimiter('marketel-journey', { windowMs: 60 * 1000, max: 180 });
const setupStartRateLimit = createRouteRateLimiter('marketel-setup-start', { windowMs: 15 * 60 * 1000, max: 8 });
const nativeCodeRequestRateLimit = createRouteRateLimiter('native-code-request', { windowMs: 15 * 60 * 1000, max: 6 });
const nativeCodeVerifyRateLimit = createRouteRateLimiter('native-code-verify', { windowMs: 15 * 60 * 1000, max: 12 });
const supportMessageRateLimit = createRouteRateLimiter('marketel-support-message', {
    windowMs: 5 * 60 * 1000,
    max: 10,
    scope: (req) => req.body?.hotelId || req.query?.hotelId,
});
const guestMessageRateLimit = createRouteRateLimiter('guest-message', {
    windowMs: 60 * 1000,
    max: 10,
    scope: (req) => req.body?.reservationCode,
});
const guestMessageGlobalRateLimit = createRouteRateLimiter('guest-message-global', { windowMs: 60 * 1000, max: 60 });
const guestMessagesReadRateLimit = createRouteRateLimiter('guest-messages-read', {
    windowMs: 5 * 60 * 1000,
    max: 30,
    scope: (req) => req.body?.code,
});
const guestMessagesReadGlobalRateLimit = createRouteRateLimiter('guest-messages-read-global', { windowMs: 5 * 60 * 1000, max: 120 });
const guestMessagesFetchRateLimit = createRouteRateLimiter('guest-messages-fetch', {
    windowMs: 60 * 1000,
    max: 12,
    scope: (req) => req.query?.code,
});
const guestMessagesFetchGlobalRateLimit = createRouteRateLimiter('guest-messages-fetch-global', { windowMs: 60 * 1000, max: 240 });
const guestPushSubscribeRateLimit = createRouteRateLimiter('guest-push-subscribe', {
    windowMs: 5 * 60 * 1000,
    max: 8,
    scope: (req) => req.body?.reservationCode,
});
const guestPushSubscribeGlobalRateLimit = createRouteRateLimiter('guest-push-subscribe-global', { windowMs: 5 * 60 * 1000, max: 60 });
const guestBookingLookupRateLimit = createRouteRateLimiter('guest-booking-lookup', { windowMs: 5 * 60 * 1000, max: 60 });

function guestBookingThreadCode(booking, fallback = '') {
    return String(booking?.ourReservationCode || booking?.pmsConfirmationCode || fallback || '').trim();
}

function guestBookingThreadCodes(booking, suppliedCode = '') {
    return [...new Set([
        booking?.ourReservationCode,
        booking?.pmsConfirmationCode,
        suppliedCode,
    ].map((value) => String(value || '').trim()).filter(Boolean))];
}

function guestEmailMatches(booking, suppliedEmail = '') {
    const email = String(suppliedEmail || '').trim().toLowerCase();
    if (!email) return true;
    return String(booking?.guestEmail || '').trim().toLowerCase() === email;
}

async function findGuestBooking(hotelId, reservationCode, select) {
    const code = String(reservationCode || '').trim();
    if (!hotelId || !code) return null;
    return prisma.booking.findFirst({
        where: {
            hotelId,
            OR: [{ ourReservationCode: code }, { pmsConfirmationCode: code }],
        },
        ...(select ? { select } : {}),
    });
}

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

  if (!clientSecret || !String(clientSecret).includes('_secret')) {
    return res.status(400).send({
      success: false,
      error: { message: 'Valid clientSecret is required' }
    });
  }

  // The clientSecret contains the Payment Intent ID
  const paymentIntentId = String(clientSecret).split('_secret')[0];

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
                const savedBooking = await prisma.booking.create({
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
                triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, savedBooking.id);
                notifyGuestBookingConfirmed({
                    req,
                    hotelId: hotelValidation.hotelId,
                    guestInfo,
                    bookingDetails,
                    reservationCode: pmsResponse.reservationID,
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

        // Manual PMS pay-later flow
        if (config.pms === 'manual') {
            const pmsResponse = await createManualBooking(hotelValidation.hotelId, bookingDetails);
            const approvalPlan = await resolveBookingApprovalPlan(config);

            try {
                const outcome = await createManualBookingRecordWithInventory(hotelValidation.hotelId, {
                    stripePaymentIntentId: paymentIntentId,
                    ourReservationCode: bookingDetails.reservationCode || pmsResponse.reservationID,
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
                    holdCapturedAt: holdStatus === 'captured' ? new Date() : null,
                    ...bookingApprovalCreateFields(approvalPlan),
                });

                if (outcome.created) {
                    if (approvalPlan.hold) {
                        notifyBookingNeedsApproval(outcome.booking).catch(() => {});
                    } else {
                        triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, outcome.booking.id);
                        notifyGuestBookingConfirmed({
                            req,
                            hotelId: hotelValidation.hotelId,
                            guestInfo,
                            bookingDetails,
                            reservationCode: outcome.booking.pmsConfirmationCode || pmsResponse.reservationID,
                        });
                        handleBookingCreatedWithoutHold(outcome.booking, approvalPlan);
                    }
                }

                const isPending = String(outcome.booking.status || '').toLowerCase() === 'pending';
                const pendingPolicy = resolveApprovalNoResponseAction(
                    outcome.booking.approvalNoResponseAction || approvalPlan.noResponseAction
                );
                return res.json({
                    success: true,
                    pending: isPending,
                    reviewWindowMinutes: isPending ? approvalPlan.windowMinutes : 0,
                    noResponseAction: pendingPolicy,
                    message: isPending
                        ? 'Your room request is being reviewed. The $1 authorization is only a temporary hold.'
                        : 'Reservation confirmed. $1.00 hold placed on card.',
                    reservationCode: outcome.booking.pmsConfirmationCode || pmsResponse.reservationID,
                });
            } catch (dbError) {
                console.error("Failed to confirm manual pay-later booking:", dbError);
                if (paymentIntent.status === 'requires_capture') {
                    await stripe.paymentIntents.cancel(paymentIntentId).catch((cancelError) => {
                        console.error('Failed to release hold after booking failure:', cancelError.message);
                    });
                }
                const unavailable = dbError?.code === 'MANUAL_INVENTORY_UNAVAILABLE';
                return res.status(unavailable ? 409 : 503).json({
                    success: false,
                    message: unavailable
                        ? 'That room was just booked for one of those nights. Your $1 hold was released—please choose another room or dates.'
                        : 'We could not confirm the reservation. Your $1 hold was released—please try again.',
                    code: unavailable ? 'ROOM_JUST_BOOKED' : 'BOOKING_CONFIRMATION_FAILED',
                });
            }
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
                    const savedBooking = await prisma.booking.create({
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
                    triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, savedBooking.id);
                    notifyGuestBookingConfirmed({
                        req,
                        hotelId: hotelValidation.hotelId,
                        guestInfo,
                        bookingDetails,
                        reservationCode: pmsResponse.data.reservationID,
                    });
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
app.post('/api/guest-message', guestMessageGlobalRateLimit, guestMessageRateLimit, async (req, res) => {
    try {
        const { hotelId, reservationCode, body, requests } = req.body || {};
        const cleanCode = String(reservationCode || '').trim();
        const cleanBody = String(body || '').trim().slice(0, 2000);
        const requestList = Array.isArray(requests)
            ? requests.map((r) => String(r || '').trim().slice(0, 100)).filter(Boolean).slice(0, 10)
            : [];
        const fbEmail = String(req.body?.guestEmail || '').trim().slice(0, 200);

        if (!cleanBody && requestList.length === 0) {
            return res.status(400).json({ success: false, message: 'Message is empty.' });
        }
        if (!cleanCode || cleanCode.length > 160) {
            return res.status(400).json({ success: false, message: 'A valid reservation is required.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            console.log(`💬 [guest-message] hotel invalid: ${hotelId} → ${validation.message}`);
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }
        const resolvedHotelId = validation.hotelId;

        const booking = await findGuestBooking(resolvedHotelId, cleanCode, {
            id: true,
            ourReservationCode: true,
            pmsConfirmationCode: true,
            guestFirstName: true,
            guestLastName: true,
            guestEmail: true,
            guestPhone: true,
            roomName: true,
        });
        // Use the same generic failure for a wrong code and a wrong email so the
        // public endpoint does not reveal whether a reservation exists.
        if (!booking || !guestEmailMatches(booking, fbEmail)) {
            return res.status(404).json({ success: false, message: 'We couldn’t verify this reservation.' });
        }

        const canonicalCode = guestBookingThreadCode(booking, cleanCode);
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ').trim() || 'Guest';

        await prisma.guestMessage.create({
            data: {
                hotelId: resolvedHotelId,
                bookingId: booking.id,
                reservationCode: canonicalCode,
                guestName,
                guestEmail: booking.guestEmail || null,
                guestPhone: booking.guestPhone || null,
                roomName: booking.roomName || null,
                body: cleanBody || null,
                requests: requestList.length ? JSON.stringify(requestList) : null,
                sender: 'guest',
            },
        });
        console.log(`💬 [guest-message] saved for hotel=${resolvedHotelId} (booking=${booking.id})`);

        // Notify the owner. Lead with the request chips since they're scannable.
        const preview = [requestList.join(', '), cleanBody].filter(Boolean).join(' — ').slice(0, 140);
        notifyGuestMessage(resolvedHotelId, guestName, preview, canonicalCode).catch(() => {});

        res.json({ success: true });
    } catch (e) {
        console.error('guest-message error:', e.message);
        res.status(500).json({ success: false, message: 'Could not send message.' });
    }
});

// PUBLIC: guest fetches their conversation thread for a reservation.
app.get('/api/guest-messages', guestMessagesFetchGlobalRateLimit, guestMessagesFetchRateLimit, async (req, res) => {
    try {
        const { hotelId, code, email } = req.query;
        if (!hotelId || !code) return res.status(400).json({ success: false, message: 'Missing hotelId or code.' });

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) return res.status(validation.status || 404).json({ success: false, message: 'Property not found.' });
        const resolvedHotelId = validation.hotelId;

        const cleanCode = String(code).trim();
        const cleanEmail = String(email || '').trim();
        if (!cleanCode || cleanCode.length > 160 || cleanEmail.length > 200) {
            return res.status(400).json({ success: false, message: 'Invalid reservation details.' });
        }
        const booking = await findGuestBooking(resolvedHotelId, cleanCode);
        if (!booking) return res.json({ success: true, messages: [] });
        if (!guestEmailMatches(booking, cleanEmail)) {
            return res.json({ success: true, messages: [] });
        }

        const messages = await prisma.guestMessage.findMany({
            where: {
                hotelId: resolvedHotelId,
                reservationCode: { in: guestBookingThreadCodes(booking, cleanCode) },
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });
        messages.reverse();

        res.json({
            success: true,
            messages: messages.map(m => ({
                id: m.id,
                body: m.body,
                sender: m.sender || 'guest',
                createdAt: m.createdAt,
                requests: (() => {
                    try { return m.requests ? JSON.parse(m.requests) : []; }
                    catch (_) { return []; }
                })(),
                readAt: m.readAt,
                guestReadAt: m.guestReadAt,
            }))
        });
    } catch (err) {
        console.error('GET /api/guest-messages error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUBLIC: a guest opening the conversation marks only Front Desk replies read.
// Owner unread state remains independent in GuestMessage.readAt.
app.post('/api/guest-messages/read', guestMessagesReadGlobalRateLimit, guestMessagesReadRateLimit, async (req, res) => {
    try {
        const hotelId = req.body?.hotelId;
        const code = String(req.body?.code || '').trim();
        const email = String(req.body?.email || '').trim();
        if (!hotelId || !code || code.length > 160 || email.length > 200) {
            return res.status(400).json({ success: false, message: 'Missing reservation details.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) return res.status(validation.status || 404).json({ success: false, message: 'Property not found.' });
        const booking = await findGuestBooking(validation.hotelId, code);
        if (!booking || !guestEmailMatches(booking, email)) {
            return res.status(404).json({ success: false, message: 'We couldn’t verify this reservation.' });
        }

        const result = await prisma.guestMessage.updateMany({
            where: {
                hotelId: validation.hotelId,
                reservationCode: { in: guestBookingThreadCodes(booking, code) },
                sender: 'hotel',
                guestReadAt: null,
            },
            data: { guestReadAt: new Date() },
        });
        res.json({ success: true, updated: result.count });
    } catch (error) {
        console.error('POST /api/guest-messages/read error:', error.message);
        res.status(500).json({ success: false, message: 'Could not update message status.' });
    }
});

// PUBLIC: look up a reservation so the guest can return to it after closing the
// app. The confirmation code is the secret (long & random); the optional email
// adds a second factor for the manual "find my reservation" form.
app.get('/api/booking/lookup', guestBookingLookupRateLimit, async (req, res) => {
    try {
        const hotelId = req.query.hotelId;
        const code = String(req.query.code || '').trim();
        const email = String(req.query.email || '').trim();
        if (!code || code.length > 160 || email.length > 200) {
            return res.status(400).json({ success: false, message: 'Valid reservation details are required.' });
        }

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
                reservationCode: guestBookingThreadCode(booking, code),
                confirmationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
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

                const savedBooking = await prisma.booking.create({
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
                triggerBookingNotifications(hotelId, guestName, roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, savedBooking.id);

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
                const bookingData = {
                    stripePaymentIntentId: paymentIntentId,
                    ourReservationCode: bookingDetails.reservationCode || pmsResponse.reservationID,
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
                    grandTotal: bookingDetails.total,
                };
                const outcome = config.pms === 'manual'
                    ? await createManualBookingRecordWithInventory(hotelValidation.hotelId, bookingData)
                    : { booking: await prisma.booking.create({ data: bookingData }), created: true };

                if (outcome.created) {
                    triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, outcome.booking.id);
                    notifyGuestBookingConfirmed({
                        req,
                        hotelId: hotelValidation.hotelId,
                        guestInfo,
                        bookingDetails,
                        reservationCode: outcome.booking.pmsConfirmationCode || pmsResponse.reservationID,
                    });
                }
            } catch (dbError) {
                console.error("Failed to save to database:", dbError);
                if (config.pms === 'manual') {
                    await stripe.refunds.create(
                        { payment_intent: paymentIntentId },
                        { idempotencyKey: `manual-inventory-failure-${paymentIntentId}` }
                    ).catch((refundError) => {
                        console.error('Failed to refund payment after booking failure:', refundError.message);
                    });
                    const unavailable = dbError?.code === 'MANUAL_INVENTORY_UNAVAILABLE';
                    return res.status(unavailable ? 409 : 503).json({
                        success: false,
                        message: unavailable
                            ? 'That room was just booked for one of those nights. Your payment was refunded—please choose another room or dates.'
                            : 'We could not confirm the reservation. Your payment was refunded—please try again.',
                        code: unavailable ? 'ROOM_JUST_BOOKED' : 'BOOKING_CONFIRMATION_FAILED',
                    });
                }
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
const CRM_PASSWORD_ALT = process.env.CRM_PASSWORD_ALT || '';
const DEFAULT_CRM_HOTEL_ID = (process.env.HOTEL_ID || 'guest-lodge-minot').trim();
const CRM_TOKEN_HOTELS_JSON = process.env.CRM_TOKEN_HOTELS || process.env.CRM_PIN_HOTEL_MAP || '';
const CRM_MASTER_PINS_RAW = process.env.CRM_MASTER_PINS || '';
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || process.env.CRM_ADMIN_TOKEN || '').trim();
const CRM_PIN_HASH_SECRET = String(
    process.env.CRM_PIN_HASH_SECRET
    || process.env.SESSION_SECRET
    || process.env.MAGIC_LINK_SECRET
    || ''
).trim();

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

// Universal Front Desk PINs are intentionally disabled in production. Admin
// APIs use ADMIN_TOKEN and normal Front Desk credentials stay property-scoped.
const CRM_MASTER_PINS = new Set(
    (process.env.NODE_ENV === 'production' ? [] : toHotelList(CRM_MASTER_PINS_RAW))
        .map(v => String(v || '').trim())
        .filter(Boolean)
);
// Legacy dogfood codes are retained for testing the native app, but they are
// not production master credentials. They may open only an explicitly listed
// dogfood property or a property the credential was already scoped to. They
// can never expand access to an unrelated customer hotel.
const CRM_DOGFOOD_PINS = new Set(['2026', '4040']);
const CRM_DOGFOOD_HOTELS = new Set([
    'hotel-a39be0df', // Jack's Inn native dogfood property
    ...toHotelList(process.env.CRM_DOGFOOD_HOTELS || ''),
]);
if (process.env.NODE_ENV === 'production' && CRM_MASTER_PINS_RAW) {
    console.warn('CRM_MASTER_PINS is ignored in production; use scoped CRM_TOKEN_HOTELS credentials.');
}

function isCrmMasterPin(value) {
    return CRM_MASTER_PINS.has(String(value || '').trim());
}

function generateCrmOwnerPin() {
    let pin = '';
    do {
        pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (isCrmMasterPin(pin));
    return pin;
}

function generateCrmActivationReturnPin() {
    return 'activate_' + crypto.randomBytes(12).toString('hex');
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

    // Backward-compatible environment credentials are limited to the configured
    // default property. They must never become universal credentials.
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
    const cleanPin = String(pin || '').trim();
    if (!CRM_PIN_HASH_SECRET) {
        return crypto.createHash('sha256').update(cleanPin).digest('hex');
    }
    return 'v2:' + crypto.createHmac('sha256', CRM_PIN_HASH_SECRET).update(cleanPin).digest('hex');
}

function legacyHashCrmPin(pin) {
    return crypto.createHash('sha256').update(String(pin || '').trim()).digest('hex');
}

function crmPinHashCandidates(pin) {
    return [...new Set([hashCrmPin(pin), legacyHashCrmPin(pin)])];
}

const configuredCrmReturnTokenSecret = process.env.CRM_RETURN_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.MAGIC_LINK_SECRET;
const CRM_RETURN_TOKEN_SECRET = configuredCrmReturnTokenSecret || crypto.randomBytes(32).toString('hex');
const CRM_RETURN_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // Aligns with Stripe Checkout's default session lifetime.
const NATIVE_SESSION_TOKEN_SECRET = process.env.NATIVE_SESSION_TOKEN_SECRET || CRM_RETURN_TOKEN_SECRET;
const NATIVE_SESSION_TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

if (!configuredCrmReturnTokenSecret) {
    console.warn('CRM_RETURN_TOKEN_SECRET, SESSION_SECRET, or MAGIC_LINK_SECRET is not set; using an ephemeral Front Desk return-token secret for this process.');
}
if (process.env.NODE_ENV === 'production' && !CRM_PIN_HASH_SECRET) {
    console.warn('CRM_PIN_HASH_SECRET/SESSION_SECRET is not set; legacy unkeyed PIN hashes remain in use.');
}

function generateNativeSessionToken(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const payload = JSON.stringify({
        purpose: 'frontdesk-native-session',
        email: normalizedEmail,
        exp: Date.now() + NATIVE_SESSION_TOKEN_EXPIRY_MS,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', NATIVE_SESSION_TOKEN_SECRET).update(encoded).digest('base64url');
    return `fdn_${encoded}.${sig}`;
}

function verifyNativeSessionToken(token) {
    const raw = String(token || '').trim();
    if (!raw.startsWith('fdn_')) return null;
    const parts = raw.slice(4).split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', NATIVE_SESSION_TOKEN_SECRET).update(encoded).digest('base64url');
    if (!timingSafeTextEqual(sig, expected)) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.purpose !== 'frontdesk-native-session' || !payload.email || payload.exp < Date.now()) return null;
        return { email: String(payload.email).trim().toLowerCase() };
    } catch (_) {
        return null;
    }
}

const nativeOwnerHotelsCache = new Map();

async function getDbAllowedHotelsForOwnerEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !prisma.hotelConfig) return [];
    const cached = nativeOwnerHotelsCache.get(normalizedEmail);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const rows = await withRetry(() => prisma.hotelConfig.findMany({
        where: {
            active: true,
            subscribed: true,
            ownerEmail: { equals: normalizedEmail, mode: 'insensitive' },
        },
        select: { id: true },
    }));
    const value = [...new Set(rows.map(row => String(row.id || '').trim()).filter(Boolean))];
    const cacheEntry = {
        value,
        // Short-lived on purpose: follow-up startup requests reuse the result,
        // while subscription changes still take effect promptly.
        expiresAt: Date.now() + 15 * 1000,
    };
    nativeOwnerHotelsCache.set(normalizedEmail, cacheEntry);
    setTimeout(() => {
        if (nativeOwnerHotelsCache.get(normalizedEmail) === cacheEntry) {
            nativeOwnerHotelsCache.delete(normalizedEmail);
        }
    }, 15 * 1000).unref?.();
    return value;
}

function getCrmReturnSigningSecret(hotelSecret = '') {
    const scopedHotelSecret = String(hotelSecret || '').trim();
    if (scopedHotelSecret) {
        return configuredCrmReturnTokenSecret
            ? `${configuredCrmReturnTokenSecret}:${scopedHotelSecret}`
            : scopedHotelSecret;
    }
    return CRM_RETURN_TOKEN_SECRET;
}

function signCrmReturnPayload(encoded, hotelSecret = '') {
    return crypto.createHmac('sha256', getCrmReturnSigningSecret(hotelSecret)).update(encoded).digest('base64url');
}

async function ensureCrmReturnHotelSecret(hotelId, currentSetupToken = '') {
    const existing = String(currentSetupToken || '').trim();
    if (existing) return existing;
    if (!hotelId || !prisma.hotelConfig) return '';

    const newSetupToken = crypto.randomBytes(16).toString('hex');
    try {
        const updated = await withRetry(() => prisma.hotelConfig.update({
            where: { id: hotelId },
            data: { setupToken: newSetupToken },
            select: { setupToken: true },
        }));
        return updated?.setupToken || newSetupToken;
    } catch (_) {
        const fresh = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { setupToken: true },
        })).catch(() => null);
        return String(fresh?.setupToken || '').trim();
    }
}

function generateCrmReturnToken(hotelId, hotelSecret = '') {
    const payload = JSON.stringify({
        purpose: 'frontdesk-return',
        hotelId: String(hotelId || '').trim(),
        exp: Date.now() + CRM_RETURN_TOKEN_EXPIRY_MS,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = signCrmReturnPayload(encoded, hotelSecret);
    return 'fd_' + encoded + '.' + sig;
}

async function generateCrmReturnTokenForHotel(hotelId, currentSetupToken = '') {
    const hotelSecret = await ensureCrmReturnHotelSecret(hotelId, currentSetupToken);
    return generateCrmReturnToken(hotelId, hotelSecret);
}

async function createCrmActivationReturnPin(hotelId) {
    const cleanHotelId = String(hotelId || '').trim();
    if (!cleanHotelId || !prisma.crmPin) return '';

    const activationPin = generateCrmActivationReturnPin();
    const pinHash = hashCrmPin(activationPin);
    await withRetry(() => prisma.crmPin.updateMany({
        where: { hotelId: cleanHotelId, label: 'Activation return' },
        data: { active: false },
    })).catch(() => {});
    await withRetry(() => prisma.crmPin.create({
        data: {
            hotelId: cleanHotelId,
            pinHash,
            label: 'Activation return',
            active: true,
        },
    }));
    return activationPin;
}

async function verifyCrmReturnToken(token) {
    const raw = String(token || '').trim();
    if (!raw.startsWith('fd_')) return null;
    const parts = raw.slice(3).split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    let payload;
    try {
        payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.purpose !== 'frontdesk-return') return null;
        if (!payload.hotelId || payload.exp < Date.now()) return null;
    } catch (e) { return null; }

    const hotelId = String(payload.hotelId || '').trim();
    const candidateHotelSecrets = [];
    if (prisma.hotelConfig) {
        const hotel = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { setupToken: true },
        })).catch(() => null);
        if (hotel?.setupToken) candidateHotelSecrets.push(hotel.setupToken);
    }
    candidateHotelSecrets.push('');

    for (const hotelSecret of candidateHotelSecrets) {
        const expectedSig = signCrmReturnPayload(encoded, hotelSecret);
        if (!timingSafeTextEqual(sig, expectedSig)) continue;
        return { hotelId: String(payload.hotelId).trim() };
    }
    return null;
}

async function getDbAllowedHotelsForToken(token) {
    if (!token || !prisma.crmPin) return [];
    const pinHashes = crmPinHashCandidates(token);
    const rows = await withRetry(() => prisma.crmPin.findMany({
        where: { pinHash: { in: pinHashes }, active: true, hotel: { active: true } },
        select: { id: true, hotelId: true, pinHash: true },
    }));
    const secureHash = hashCrmPin(token);
    const legacyIds = rows.filter(row => row.pinHash !== secureHash).map(row => row.id);
    if (CRM_PIN_HASH_SECRET && legacyIds.length) {
        await Promise.allSettled(legacyIds.map(id =>
            prisma.crmPin.update({ where: { id }, data: { pinHash: secureHash } })
        ));
    }
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
    const isMaster = allowed.includes('*');
    if (resolvedHotelId) {
        if (!isMaster && !allowed.includes(resolvedHotelId)) return null;
        if (requested && requested !== resolvedHotelId) return null;
        return resolvedHotelId;
    }
    if (requested) {
        return (isMaster || allowed.includes(requested)) ? requested : null;
    }
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
    const marketelClient = String(req.headers['x-marketel-client'] || '').trim().toLowerCase();
    const isNativeClient = marketelClient === 'ios' || marketelClient === 'android';
    const returnAuth = await verifyCrmReturnToken(token);
    const nativeAuth = returnAuth ? null : verifyNativeSessionToken(token);
    const dbAllowedHotels = returnAuth || nativeAuth
        ? []
        : await getDbAllowedHotelsForToken(token).catch(() => []);
    const nativeAllowedHotels = nativeAuth
        ? await getDbAllowedHotelsForOwnerEmail(nativeAuth.email).catch(() => [])
        : [];
    let allowedHotels = returnAuth
        ? [returnAuth.hotelId]
        : nativeAuth
            ? nativeAllowedHotels
            : (dbAllowedHotels.length ? dbAllowedHotels : (CRM_TOKEN_HOTELS_MAP[token] || []));

    const requestedHotelId = String(req.query?.hotelId || req.body?.hotelId || '').trim();
    let isDogfoodPreviewAccess = false;
    if (
        !returnAuth
        && !nativeAuth
        && requestedHotelId
        && CRM_DOGFOOD_PINS.has(token)
    ) {
        const wasAlreadyScoped = allowedHotels.includes(requestedHotelId) || allowedHotels.includes('*');
        const override = await getHotelOverrideStatus(requestedHotelId).catch(() => ({ status: 'invalid' }));
        const isListedDogfoodHotel = CRM_DOGFOOD_HOTELS.has(requestedHotelId);
        isDogfoodPreviewAccess = (
            (isListedDogfoodHotel || wasAlreadyScoped)
            && (override.status === 'ok' || override.status === 'unsubscribed')
        );
        if (isDogfoodPreviewAccess && !wasAlreadyScoped) {
            allowedHotels = [...allowedHotels, requestedHotelId];
        }
    }
    
    // Local-only developer convenience. Production never has master PINs.
    const isMasterPin = !returnAuth && isCrmMasterPin(token);
    if (isMasterPin) {
        if (!allowedHotels.includes('*')) allowedHotels = [...allowedHotels, '*'];
    }

    if (!token || !allowedHotels?.length) return res.status(401).json({ error: 'Unauthorized' });
    const hostContext = await resolveCrmHostHotelContext(req);
    if (!hostContext.ok) {
        return res.status(hostContext.status).json({
            success: false,
            message: hostContext.message,
            domain: hostContext.domain || null,
        });
    }
    if (hostContext.hotelId && !allowedHotels.includes(hostContext.hotelId) && !allowedHotels.includes('*')) {
        return res.status(403).json({
            success: false,
            message: `PIN is not authorized for hotel: ${hostContext.hotelId}`,
            hotelId: hostContext.hotelId,
        });
    }
    req.crmToken = token;
    req.crmAllowedHotels = allowedHotels;
    req.crmIsMasterPin = isMasterPin;
    req.crmIsReturnToken = !!returnAuth;
    req.crmIsNativeSession = !!nativeAuth;
    req.crmIsNativeClient = isNativeClient;
    req.crmIsDogfoodPreview = isDogfoodPreviewAccess;
    req.crmClient = marketelClient;
    req.crmNativeEmail = nativeAuth?.email || '';
    req.crmResolvedHotelId = hostContext.hotelId || null;
    req.crmResolvedDomain = hostContext.domain || null;
    req.crmDefaultHotelId = hostContext.hotelId || (allowedHotels[0] === '*' ? DEFAULT_CRM_HOTEL_ID : allowedHotels[0]);

    // The App Store build is a companion for active Marketel customers. This
    // server-side gate is defense in depth behind the native login UI and also
    // guarantees that no native request can reach Stripe activation routes.
    if (isNativeClient) {
        const nativeHotelId = resolveScopedHotelId(req, { allowFallback: true });
        if (!nativeHotelId || nativeHotelId === '*') {
            return res.status(403).json({
                success: false,
                message: 'Choose an active Marketel property to continue.',
                code: 'native_property_required',
            });
        }
        // A signed native owner session was resolved above from a query that
        // already filters to active, subscribed properties. Re-querying the
        // same row on every API call doubled the authentication cost during
        // startup. PIN-based native access still needs the explicit check.
        if (!nativeAuth && !isDogfoodPreviewAccess) {
            const nativeHotel = await withRetry(() => prisma.hotelConfig.findUnique({
                where: { id: nativeHotelId },
                select: { active: true, subscribed: true },
            })).catch(() => null);
            if (!nativeHotel?.active || !nativeHotel?.subscribed) {
                return res.status(403).json({
                    success: false,
                    message: 'This property does not currently have Front Desk app access.',
                    code: 'native_subscription_required',
                });
            }
        }
    }
    next();
};

function suppliedAdminToken(req) {
    const direct = String(req.headers['x-admin-token'] || '').trim();
    if (direct) return direct;
    const authorization = String(req.headers.authorization || '').trim();
    if (/^Bearer\s+/i.test(authorization)) {
        return authorization.replace(/^Bearer\s+/i, '').trim();
    }
    return '';
}

const adminAuth = (req, res, next) => {
    if (!ADMIN_TOKEN) {
        return res.status(503).json({ success: false, message: 'Admin API is disabled. Set ADMIN_TOKEN.' });
    }
    const token = suppliedAdminToken(req);
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
    if (isStaticOnlyHotelId(cleanHotelId)) {
        return { status: 'ok', hotelId: cleanHotelId, source: 'static' };
    }

    let databaseUnavailable = false;
    if (prisma.hotelConfig) {
        try {
            const row = await withRetry(() => prisma.hotelConfig.findUnique({
                where: { id: cleanHotelId },
                select: { id: true, active: true, subscribed: true, setupToken: true },
            }));
            if (row) {
                if (!row.active) {
                    return { status: 'inactive', hotelId: cleanHotelId, source: 'db' };
                }
                // Self-serve properties may be previewed before payment, but
                // their public booking/payment APIs remain subscription-gated.
                if (row.setupToken && !row.subscribed) {
                    return { status: 'unsubscribed', hotelId: cleanHotelId, source: 'db' };
                }
                return { status: 'ok', hotelId: cleanHotelId, source: 'db' };
            }
        } catch (error) {
            if (!isPrismaConnectionError(error)) throw error;
            databaseUnavailable = true;
            console.warn(`DB unavailable while checking hotel override ${cleanHotelId}; falling back to static config if present.`);
        }
    }

    try {
        getStaticHotelConfig(cleanHotelId);
        return { status: 'ok', hotelId: cleanHotelId, source: 'static' };
    } catch (err) {
        return databaseUnavailable
            ? { status: 'unavailable', hotelId: cleanHotelId, source: 'db' }
            : { status: 'invalid' };
    }
}

async function resolveHotelDomainContext(domain) {
    const clean = normalizeDomain(domain);
    if (!clean) return { status: 'unmapped', domain: clean };
    if (!prisma.hotelDomain) return { status: 'unmapped', domain: clean };

    const cached = hotelDomainCache.get(clean);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let row = await withRetry(() => prisma.hotelDomain.findUnique({
        where: { domain: clean },
        select: { hotelId: true, hotel: { select: { active: true } } },
    }));

    if (!row && clean.endsWith('.mktel.co')) {
        const fallbackDomain = clean.replace('.mktel.co', '.bookmarketel.com');
        row = await withRetry(() => prisma.hotelDomain.findUnique({
            where: { domain: fallbackDomain },
            select: { hotelId: true, hotel: { select: { active: true } } },
        }));
    }

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
        if (override.status === 'unavailable') {
            return {
                ok: false,
                status: 503,
                message: 'Hotel database is temporarily unavailable. Please retry in a moment.',
                domain: requestedDomain,
                hotelId: explicitHotelId,
            };
        }
        if (override.status !== 'ok' && override.status !== 'unsubscribed') {
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
                hotelId: explicitHotelId,
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
        const shouldUseStaticConfigOnly = config.source === 'static' && process.env.PREFER_DB_HOTEL_CONFIG !== 'true';
        const manualRooms = (!shouldUseStaticConfigOnly && config.pms === 'manual' && prisma.manualRoom)
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
        res.status(e.status || 500).json({ success: false, message: e.message });
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
        if (isCrmMasterPin(pin)) {
            return res.status(400).json({
                success: false,
                message: 'Universal admin PINs cannot be saved as hotel owner PINs.'
            });
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

function normalizeApnsDeviceToken(value) {
    const token = String(value || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    return token.length >= 64 && token.length <= 200 ? token : '';
}

app.post('/api/push/native/register', crmAuth, async (req, res) => {
    try {
        if (!req.crmIsNativeClient) {
            return res.status(400).json({ success: false, message: 'Native client header required.' });
        }
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const deviceToken = normalizeApnsDeviceToken(req.body?.deviceToken);
        const environment = String(req.body?.environment || '').toLowerCase() === 'sandbox'
            ? 'sandbox'
            : 'production';
        if (!deviceToken) {
            return res.status(400).json({ success: false, message: 'A valid APNs device token is required.' });
        }
        await prisma.nativePushDevice.upsert({
            where: { deviceToken_hotelId: { deviceToken, hotelId } },
            create: {
                deviceToken,
                hotelId,
                environment,
                platform: 'ios',
                active: true,
                lastSeenAt: new Date(),
            },
            update: {
                environment,
                platform: 'ios',
                active: true,
                lastSeenAt: new Date(),
            },
        });
        res.json({ success: true, pushConfigured: APNS_CONFIGURED });
    } catch (error) {
        console.error('push/native/register:', error.message);
        res.status(500).json({ success: false, message: 'Could not register this device for notifications.' });
    }
});

app.post('/api/push/native/unregister', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const deviceToken = normalizeApnsDeviceToken(req.body?.deviceToken);
        if (!deviceToken) {
            return res.status(400).json({ success: false, message: 'A valid APNs device token is required.' });
        }
        const unregisterAllForDevice = req.crmIsNativeClient && req.body?.all === true;
        await prisma.nativePushDevice.deleteMany({
            where: unregisterAllForDevice ? { deviceToken } : { deviceToken, hotelId },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('push/native/unregister:', error.message);
        res.status(500).json({ success: false, message: 'Could not unregister this device.' });
    }
});

app.get('/api/push/native/status', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const registeredDevices = await prisma.nativePushDevice.count({
            where: { hotelId, active: true },
        });
        res.json({ success: true, configured: APNS_CONFIGURED, registeredDevices });
    } catch (error) {
        console.error('push/native/status:', error.message);
        res.status(500).json({ success: false, message: 'Could not load notification status.' });
    }
});

// Guest PWA: register for message notifications (public, no auth).
app.post('/api/guest-push-subscribe', guestPushSubscribeGlobalRateLimit, guestPushSubscribeRateLimit, async (req, res) => {
    try {
        const { hotelId, reservationCode, email, subscription } = req.body || {};
        const sub = subscription || req.body || {};
        const endpoint = sub.endpoint || req.body?.endpoint;
        const p256dh = sub.keys?.p256dh || req.body?.p256dh;
        const auth = sub.keys?.auth || req.body?.auth;

        const cleanEndpoint = String(endpoint || '').trim();
        const cleanP256dh = String(p256dh || '').trim();
        const cleanAuth = String(auth || '').trim();
        let validEndpoint = false;
        try { validEndpoint = new URL(cleanEndpoint).protocol === 'https:'; }
        catch (_) { validEndpoint = false; }
        if (
            !validEndpoint
            || cleanEndpoint.length > 4096
            || !cleanP256dh
            || cleanP256dh.length > 512
            || !cleanAuth
            || cleanAuth.length > 512
        ) {
            return res.status(400).json({ success: false, message: 'Missing subscription data' });
        }
        const cleanCode = String(reservationCode || '').trim();
        if (!cleanCode || cleanCode.length > 160) {
            return res.status(400).json({ success: false, message: 'A valid reservation is required.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }

        const booking = await findGuestBooking(validation.hotelId, cleanCode);
        if (!booking || !guestEmailMatches(booking, email)) {
            return res.status(404).json({ success: false, message: 'We couldn’t verify this reservation.' });
        }

        await saveGuestPushSubscription({
            endpoint: cleanEndpoint,
            p256dh: cleanP256dh,
            auth: cleanAuth,
            hotelId: validation.hotelId,
            reservationCode: guestBookingThreadCode(booking, cleanCode),
        });
        res.json({ success: true });
    } catch (e) {
        console.error('guest-push-subscribe error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to save subscription' });
    }
});

// Guest PWA install funnel — view, CTA click, installed (public).
app.post('/api/guest-install-event', async (req, res) => {
    try {
        const { hotelId, reservationCode, touchpoint, eventType } = req.body || {};
        if (!hotelId || !touchpoint || !eventType) {
            return res.status(400).json({ success: false, message: 'hotelId, touchpoint, and eventType are required.' });
        }
        const allowed = ['view', 'cta_click', 'installed'];
        if (!allowed.includes(eventType)) {
            return res.status(400).json({ success: false, message: 'Invalid eventType.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }

        const code = reservationCode ? String(reservationCode).trim() : null;
        await recordGuestInstallEvent({
            hotelId: validation.hotelId,
            reservationCode: code,
            touchpoint: String(touchpoint).trim(),
            eventType,
            userAgent: req.headers['user-agent'],
        });

        if (eventType === 'installed') {
            await markGuestAppInstalled(validation.hotelId, code);
        }

        res.json({ success: true });
    } catch (e) {
        console.error('guest-install-event error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to record event' });
    }
});

// D19: blocked-demand capture (public). A guest reached payment on a hotel that
// hasn't activated online booking. Record it so the owner sees proof of demand
// ("N guests tried to book"). Works on UNsubscribed hotels by design, so it
// resolves the hotel directly rather than requiring an active subscription.
app.post('/api/hotel/:hotelId/booking-intent', async (req, res) => {
    try {
        const hotel = await resolveHotelForManifest(req.params.hotelId);
        if (!hotel) return res.json({ success: true }); // unknown hotel — no-op, never error the guest
        const { roomName, checkin, checkout, nights } = req.body || {};
        await prisma.funnelEvent.create({
            data: {
                hotelId: hotel.id,
                eventName: 'BlockedBookingAttempt',
                contentName: roomName ? String(roomName).slice(0, 120) : null,
                checkinDate: checkin ? String(checkin).slice(0, 40) : null,
                checkoutDate: checkout ? String(checkout).slice(0, 40) : null,
                nights: Number.isFinite(Number(nights)) ? Number(nights) : null,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.socket?.remoteAddress || null,
            },
        }).catch(() => {});
        res.json({ success: true });
    } catch (e) {
        res.json({ success: true }); // never block the guest UI on analytics
    }
});

// Growth funnel capture (public). Lightweight guest-side events so the owner can
// see "page views → tried to book → booked." Best-effort; never errors the guest.
// Reuses FunnelEvent; the guest app throttles to ~1 per session per event.
const GROWTH_EVENT_NAMES = { page_view: 'PageView', checkout_started: 'CheckoutStarted' };
app.post('/api/hotel/:hotelId/track', async (req, res) => {
    try {
        const eventName = GROWTH_EVENT_NAMES[String(req.body?.event || '').trim()];
        if (!eventName) return res.json({ success: true }); // unknown event — no-op
        const hotel = await resolveHotelForManifest(req.params.hotelId);
        if (!hotel) return res.json({ success: true });
        const { roomName, checkin, checkout, nights, externalId } = req.body || {};
        await prisma.funnelEvent.create({
            data: {
                hotelId: hotel.id,
                eventName,
                contentName: roomName ? String(roomName).slice(0, 120) : null,
                checkinDate: checkin ? String(checkin).slice(0, 40) : null,
                checkoutDate: checkout ? String(checkout).slice(0, 40) : null,
                nights: Number.isFinite(Number(nights)) ? Number(nights) : null,
                externalId: externalId ? String(externalId).slice(0, 64) : null,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.socket?.remoteAddress || null,
            },
        }).catch(() => {});
        res.json({ success: true });
    } catch (e) {
        res.json({ success: true }); // never block the guest UI on analytics
    }
});

// CRM: blocked-demand count (last 30 days) — powers the owner's "N guests tried
// to book — activate to accept reservations like these" proof-of-demand nudge.
app.get('/api/crm/blocked-demand', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, periodDays: 30, total: 0, today: 0, recent: [] });
        }
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sinceToday = new Date(); sinceToday.setHours(0, 0, 0, 0);
        const [total, today, recent] = await Promise.all([
            prisma.funnelEvent.count({ where: { hotelId, eventName: 'BlockedBookingAttempt', createdAt: { gte: since } } }).catch(() => 0),
            prisma.funnelEvent.count({ where: { hotelId, eventName: 'BlockedBookingAttempt', createdAt: { gte: sinceToday } } }).catch(() => 0),
            prisma.funnelEvent.findMany({
                where: { hotelId, eventName: 'BlockedBookingAttempt', createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { contentName: true, checkinDate: true, checkoutDate: true, nights: true, createdAt: true },
            }).catch(() => []),
        ]);
        res.json({ success: true, periodDays: 30, total, today, recent });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// CRM: the owner's guest funnel — page views → tried to book → booked.
// Available to every hotel (esp. pre-activation, where it matters most).
app.get('/api/crm/growth-funnel', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const PERIODS = { today: null, '7d': 7, '30d': 30 };
        const periodKey = PERIODS.hasOwnProperty(req.query.period) ? String(req.query.period) : '30d';
        let since;
        if (periodKey === 'today') { since = new Date(); since.setHours(0, 0, 0, 0); }
        else { since = new Date(Date.now() - PERIODS[periodKey] * 24 * 60 * 60 * 1000); }

        const fe = (eventName) => prisma.funnelEvent.count({ where: { hotelId, eventName, createdAt: { gte: since } } }).catch(() => 0);
        const [pageViews, checkoutStarted, blockedAttempts, completedBookings] = await Promise.all([
            fe('PageView'),
            fe('CheckoutStarted'),
            fe('BlockedBookingAttempt'),
            prisma.booking.count({ where: { hotelId, createdAt: { gte: since }, status: ACTIVE_BOOKING_STATUS_FILTER } }).catch(() => 0),
        ]);
        res.json({ success: true, period: periodKey, pageViews, checkoutStarted, blockedAttempts, completedBookings });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// CRM: owner self-reported "Get found" checklist (Google Business Profile, QR, text-the-link).
// frontdeskAlerts is the exception: it's derived from a real push subscription so
// the owner can't tick it without actually being reachable.
app.get('/api/crm/growth-checklist', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { growthChecklist: true, frontdeskInstalledAt: true },
        }));
        const checklist = (hotel && hotel.growthChecklist && typeof hotel.growthChecklist === 'object')
            ? { ...hotel.growthChecklist }
            : {};
        const devices = await countOwnerPushDevices(hotelId);
        checklist.frontdeskAlerts = {
            done: devices > 0,
            derived: true,
            devices,
            installedAt: hotel?.frontdeskInstalledAt || null,
        };
        res.json({ success: true, checklist });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

const GROWTH_CHECKLIST_KEYS = new Set(['gbp', 'qr', 'textLink']);
app.post('/api/crm/growth-checklist', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const key = String(req.body?.key || '').trim();
        if (!GROWTH_CHECKLIST_KEYS.has(key)) return res.status(400).json({ success: false, message: 'Unknown checklist key' });
        const done = req.body?.done !== false;
        const current = await withRetry(() => prisma.hotelConfig.findUnique({ where: { id: hotelId }, select: { growthChecklist: true } }));
        const checklist = (current && current.growthChecklist && typeof current.growthChecklist === 'object') ? { ...current.growthChecklist } : {};
        checklist[key] = done ? { done: true, ts: new Date().toISOString() } : { done: false };
        await withRetry(() => prisma.hotelConfig.update({ where: { id: hotelId }, data: { growthChecklist: checklist } }));
        res.json({ success: true, checklist });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// CRM: staff-side install signal. Mirrors the guest /api/guest-install-event
// precedent so "is the owner reachable?" is answerable from the server instead of
// only from a session flag in their browser.
app.post('/api/crm/frontdesk-install-event', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const installed = req.body?.installed !== false;
        if (!installed) return res.json({ success: true });

        await withRetry(() => prisma.hotelConfig.updateMany({
            // Keep the first install date: it's the adoption milestone, and every
            // later launch of the installed app would otherwise overwrite it.
            where: { id: hotelId, frontdeskInstalledAt: null },
            data: { frontdeskInstalledAt: new Date() },
        }));
        hotelConfigCache.delete(hotelId);
        res.json({ success: true });
    } catch (e) {
        console.error('frontdesk-install-event:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Detailed first-party owner journey events. These complement the durable
// conversion milestones below: a conversion is still counted once, while
// journey rows preserve ordering, timing, attribution and interaction context.
const MARKETEL_JOURNEY_EVENT_NAMES = new Set([
    'JourneyPageViewed',
    'JourneyPagePerformance',
    'JourneyPageExited',
    'JourneyEngagementMilestone',
    'JourneyScrollDepth',
    'JourneyVisibilityChanged',
    'JourneyConnectivityChanged',
    'JourneyControlActivated',
    'JourneyFieldFocused',
    'JourneyFieldCompleted',
    'JourneyValidationFailed',
    'JourneyClientError',
    'JourneyRequestStarted',
    'JourneyRequestCompleted',
    'JourneyRequestFailed',
    'JourneyDemoSelected',
    'JourneyDemoLoaded',
    'JourneySetupStepViewed',
    'JourneySetupNavigation',
    'JourneySetupStepCompleted',
    'JourneyPhotoSelected',
    'JourneyQualitySelected',
    'JourneyPreviewReady',
    'JourneyHandoffStarted',
    'JourneyHandoffCompleted',
    'JourneyFrontDeskReady',
    'JourneyRevealStarted',
    'JourneyRevealStageViewed',
    'JourneyRevealStageCompleted',
    'JourneyRevealNavigation',
    'JourneyBookingPreviewOpened',
    'JourneyBookingPreviewModeChanged',
    'JourneyBookingPreviewCheckoutReached',
    'JourneyBookingChallengeShown',
    'JourneyBookingChallengeStarted',
    'JourneyBookingChallengeDismissed',
    'JourneyBookingChallengeAbandoned',
    'JourneyBookingChallengeCompleted',
    'JourneyGuestAppDemo',
    'JourneyBookingPageStatus',
    'JourneyCheckoutRequested',
    'JourneyCheckoutRedirected',
    'JourneyCheckoutFailed',
]);

function redactJourneyString(value, maxLength = 300) {
    return String(value == null ? '' : value)
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]')
        .slice(0, maxLength);
}

function sanitizeJourneyMetadataValue(value, depth = 0) {
    if (depth > 3 || value == null) return value == null ? null : undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') return redactJourneyString(value);
    if (Array.isArray(value)) {
        return value.slice(0, 20)
            .map((item) => sanitizeJourneyMetadataValue(item, depth + 1))
            .filter((item) => item !== undefined);
    }
    if (typeof value !== 'object') return undefined;
    const result = {};
    Object.entries(value).slice(0, 40).forEach(([rawKey, rawValue]) => {
        if (/password|passcode|pin|token|secret|authorization|cookie|card|email|phone|message|filename|image(data|url)/i.test(rawKey)) return;
        const key = String(rawKey).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60);
        if (!key) return;
        const cleanValue = sanitizeJourneyMetadataValue(rawValue, depth + 1);
        if (cleanValue !== undefined) result[key] = cleanValue;
    });
    return result;
}

function sanitizeJourneyMetadata(value) {
    const clean = sanitizeJourneyMetadataValue(value && typeof value === 'object' ? value : {}, 0) || {};
    try {
        if (JSON.stringify(clean).length <= 12000) return clean;
    } catch (_) {}
    return {
        truncated: true,
        retainedKeys: Object.keys(clean).slice(0, 30),
    };
}

function sanitizeJourneyIdentifier(value, prefix) {
    const clean = String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100);
    if (!clean || (prefix && !clean.startsWith(prefix))) return null;
    return clean;
}

function sanitizeJourneyPath(value) {
    const clean = String(value || '/')
        .split('?')[0]
        .replace(/\/setup\/[^/]+/i, '/setup/:token')
        .replace(/[^a-zA-Z0-9/_:.-]/g, '')
        .slice(0, 240);
    return clean.startsWith('/') ? clean : `/${clean}`;
}

function journeyOccurredAt(value) {
    const parsed = new Date(value || '');
    const now = Date.now();
    if (Number.isNaN(parsed.getTime())) return new Date();
    if (parsed.getTime() > now + 10 * 60 * 1000 || parsed.getTime() < now - 30 * 24 * 60 * 60 * 1000) return new Date();
    return parsed;
}

function journeyContentName(metadata) {
    const candidate = metadata.control
        || metadata.request
        || metadata.stepName
        || metadata.answer
        || metadata.stageName
        || metadata.demo
        || metadata.kind;
    return candidate == null ? null : redactJourneyString(candidate, 120);
}

async function persistMarketelJourneyEvents({ req, hotelId, ownerEmail = null, events }) {
    const incoming = Array.isArray(events) ? events.slice(0, 25) : [];
    const rows = incoming.map((event) => {
        const eventName = String(event?.eventName || '').trim();
        if (!MARKETEL_JOURNEY_EVENT_NAMES.has(eventName)) return null;
        const sessionId = sanitizeJourneyIdentifier(event?.sessionId, 'mjs_');
        const externalId = sanitizeJourneyIdentifier(event?.visitorId, 'mjv_');
        const eventId = sanitizeJourneyIdentifier(event?.eventId, 'journey.');
        if (!sessionId || !externalId || !eventId) return null;
        const sequence = Math.max(1, Math.min(1000000, parseInt(event?.sequence, 10) || 1));
        const durationValue = Number(event?.durationMs);
        const durationMs = Number.isFinite(durationValue)
            ? Math.max(0, Math.min(24 * 60 * 60 * 1000, Math.round(durationValue)))
            : null;
        const metadata = sanitizeJourneyMetadata(event?.metadata);
        return {
            hotelId,
            eventName,
            eventId,
            occurredAt: journeyOccurredAt(event?.occurredAt),
            sessionId,
            sequence,
            surface: redactJourneyString(event?.surface || 'unknown', 40),
            pagePath: sanitizeJourneyPath(event?.pagePath),
            durationMs,
            metadata,
            contentName: journeyContentName(metadata),
            guestEmail: ownerEmail || null,
            externalId,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.socket?.remoteAddress || null,
        };
    }).filter(Boolean);
    if (!rows.length) return { accepted: 0, duplicates: 0 };

    const ids = rows.map((row) => row.eventId);
    const existing = await prisma.funnelEvent.findMany({
        where: { eventId: { in: ids } },
        select: { eventId: true },
    });
    const existingIds = new Set(existing.map((row) => row.eventId));
    const uniqueRows = rows.filter((row) => !existingIds.has(row.eventId));
    const created = uniqueRows.length
        ? await prisma.funnelEvent.createMany({ data: uniqueRows, skipDuplicates: true })
        : { count: 0 };
    return { accepted: created.count, duplicates: rows.length - created.count };
}

// Landing and setup must work before CRM authentication exists. Setup events
// are scoped by the unguessable setup token; unauthenticated rows are accepted
// only from the public landing surface.
app.post('/api/funnel/journey', journeyEventRateLimit, async (req, res) => {
    if (!funnelTrackingEnabled) return res.json({ success: true, accepted: 0, disabled: true });
    try {
        const setupToken = String(req.body?.setupToken || '').trim();
        const events = Array.isArray(req.body?.events) ? req.body.events : [];
        let hotelId = 'marketel-onboarding';
        let ownerEmail = null;
        if (setupToken) {
            const hotel = await prisma.hotelConfig.findUnique({
                where: { setupToken },
                select: { id: true, ownerEmail: true },
            });
            if (!hotel) return res.status(404).json({ success: false, message: 'Invalid setup context.' });
            hotelId = hotel.id;
            ownerEmail = hotel.ownerEmail || null;
        } else {
            const onlyLanding = events.length > 0 && events.every((event) => event?.surface === 'landing');
            if (!onlyLanding) return res.status(400).json({ success: false, message: 'Setup context required.' });
        }
        const result = await persistMarketelJourneyEvents({ req, hotelId, ownerEmail, events });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Public journey tracking failed:', error.message);
        res.json({ success: true, accepted: 0 });
    }
});

app.post('/api/crm/journey-events', journeyEventRateLimit, crmAuth, async (req, res) => {
    if (!funnelTrackingEnabled) return res.json({ success: true, accepted: 0, disabled: true });
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { ownerEmail: true },
        }).catch(() => null);
        const result = await persistMarketelJourneyEvents({
            req,
            hotelId,
            ownerEmail: hotel?.ownerEmail || null,
            events: req.body?.events,
        });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('CRM journey tracking failed:', error.message);
        res.json({ success: true, accepted: 0 });
    }
});

// CRM: the short pre-activation value reveal. These milestones make it
// possible to tell whether owners understand each core value before checkout
// without treating ordinary clicks as Meta Leads.
const MARKETEL_VALUE_REVEAL_EVENTS = new Set([
    'ValueRevealStarted',
    'BookingEngineRevealViewed',
    'BookingEngineEditPreviewViewed',
    'BookingEngineFullPreviewOpened',
    'GuestAppRevealViewed',
    'AssistantRevealViewed',
    'ActivationOfferViewed',
    'ActivationCtaClicked',
    'GuestAppPreviewRequestedFromBookingEngine',
    'GuestAppValueSlideViewed',
    'GuestAppInstallSlideReplayed',
    'GuestAppInstallDemoClicked',
    'BookingChallengeShown',
    'BookingChallengeStarted',
    'BookingChallengeDismissed',
    'BookingChallengeAbandoned',
    'BookingChallengeCheckoutReached',
]);
app.post('/api/crm/value-reveal-event', crmAuth, async (req, res) => {
    if (!funnelTrackingEnabled) return res.json({ success: true, local: true });
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const eventName = String(req.body?.eventName || '').trim();
        const contentName = String(req.body?.contentName || '').trim().slice(0, 120);
        if (!MARKETEL_VALUE_REVEAL_EVENTS.has(eventName)) {
            return res.status(400).json({ success: false, message: 'Unknown reveal event.' });
        }
        const existing = await prisma.funnelEvent.findFirst({
            where: { hotelId, eventName },
            select: { id: true },
        });
        if (!existing) {
            const linkedExternalId = sanitizeJourneyIdentifier(req.body?.journeyVisitorId, 'mjv_');
            const linkedSessionId = sanitizeJourneyIdentifier(req.body?.journeySessionId, 'mjs_');
            await prisma.funnelEvent.create({
                data: {
                    hotelId,
                    eventName,
                    eventId: `marketel-reveal.${hotelId}.${eventName}`,
                    occurredAt: linkedSessionId ? journeyOccurredAt(req.body?.journeyOccurredAt) : null,
                    sessionId: linkedSessionId,
                    sequence: linkedSessionId ? Math.max(1, Math.min(1000000, parseInt(req.body?.journeySequence, 10) || 1)) : null,
                    surface: linkedSessionId ? redactJourneyString(req.body?.journeySurface || 'frontdesk', 40) : null,
                    pagePath: linkedSessionId ? sanitizeJourneyPath(req.body?.journeyPagePath) : null,
                    metadata: linkedSessionId ? { linkedJourney: true } : undefined,
                    contentName: contentName || null,
                    externalId: linkedExternalId,
                    userAgent: req.headers['user-agent'] || null,
                    ipAddress: req.ip || req.socket?.remoteAddress || null,
                },
            });
        }
        res.json({ success: true });
    } catch (e) {
        console.error('value-reveal-event:', e.message);
        res.status(500).json({ success: false, message: 'Could not record reveal event.' });
    }
});

// The reveal uses the real guest page only after the edge confirms it is
// available. Until then it renders a personalized local preview, avoiding a
// DNS/TLS/Vercel error page inside the owner's first impression.
app.get('/api/crm/booking-page-status', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const domainRow = await prisma.hotelDomain.findFirst({
            where: { hotelId },
            orderBy: { isPrimary: 'desc' },
            select: { domain: true },
        });
        const domain = String(domainRow?.domain || '').trim();
        if (!domain) {
            res.set('Cache-Control', 'no-store');
            return res.json({ success: true, ready: false, domain: '', status: 0, reason: 'no-domain' });
        }

        let status = 0;
        let reason = '';
        let ready = false;
        try {
            const probe = await axios.get(`https://${domain}/`, {
                timeout: 7000,
                maxRedirects: 0,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Marketel-BookingPageCheck/1.0' },
            });
            status = Number(probe.status) || 0;
            const edgeError = String(probe.headers?.['x-vercel-error'] || '').toUpperCase();
            const deploymentDisabled = status === 402 || edgeError.includes('DEPLOYMENT_DISABLED');
            ready = status >= 200 && status < 400 && !deploymentDisabled;
            reason = deploymentDisabled ? 'deployment-disabled' : (ready ? '' : `http-${status}`);
        } catch (_) {
            reason = 'unreachable';
        }
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, ready, domain, status, reason });
    } catch (e) {
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, ready: false, domain: '', status: 0, reason: 'unreachable' });
    }
});

// CRM: approval settings plus the loss-aversion number — bookings that locked in
// with nobody to alert.
app.get('/api/crm/booking-approval', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({
                success: true,
                data: {
                    enabled: false,
                    windowMinutes: resolveApprovalWindowMinutes(null),
                    noResponseAction: resolveApprovalNoResponseAction(null),
                    supported: true,
                    pushConfigured: ownerPushConfigured(),
                    devices: 0,
                    assistantRecipients: 0,
                    reachableChannels: 0,
                    installedAt: null,
                    missedReviews: 0,
                    pendingNow: 0,
                },
            });
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [hotel, channels, missedReviews, pendingNow] = await Promise.all([
            withRetry(() => prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: {
                    pms: true,
                    bookingApprovalEnabled: true,
                    bookingApprovalWindowMinutes: true,
                    bookingApprovalNoResponseAction: true,
                    frontdeskInstalledAt: true,
                },
            })).catch(() => null),
            countBookingApprovalChannels(hotelId),
            prisma.booking.count({
                where: { hotelId, approvalOutcome: 'auto_no_alerts', approvalDecidedAt: { gte: since } },
            }).catch(() => 0),
            prisma.booking.count({ where: { hotelId, status: 'pending' } }).catch(() => 0),
        ]);

        res.json({
            success: true,
            data: {
                enabled: hotel?.bookingApprovalEnabled === true,
                windowMinutes: resolveApprovalWindowMinutes(hotel),
                noResponseAction: resolveApprovalNoResponseAction(hotel),
                // Only manual-PMS hotels hold bookings locally.
                supported: String(hotel?.pms || '').toLowerCase() === 'manual',
                pushConfigured: ownerPushConfigured(),
                devices: channels.pushDevices,
                assistantRecipients: channels.assistantRecipients,
                reachableChannels: channels.total,
                installedAt: hotel?.frontdeskInstalledAt || null,
                missedReviews,
                pendingNow,
            },
        });
    } catch (e) {
        console.error('crm/booking-approval GET:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crm/booking-approval', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const data = {};
        if (req.body?.enabled !== undefined) {
            const enabled = req.body.enabled === true;
            // Turning this on without a reachable device would hold every booking
            // for a prompt nobody sees, so refuse rather than silently degrade.
            if (enabled && (await countBookingApprovalChannels(hotelId)).total < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Connect at least one phone for app alerts or Assistant texts first — otherwise there is nobody to ask.',
                });
            }
            data.bookingApprovalEnabled = enabled;
        }
        if (req.body?.windowMinutes !== undefined) {
            data.bookingApprovalWindowMinutes = resolveApprovalWindowMinutes({
                bookingApprovalWindowMinutes: req.body.windowMinutes,
            });
        }
        if (req.body?.noResponseAction !== undefined) {
            const requested = String(req.body.noResponseAction || '').trim().toLowerCase();
            if (!['confirm', 'release'].includes(requested)) {
                return res.status(400).json({ success: false, message: 'Choose keep booking or release request.' });
            }
            data.bookingApprovalNoResponseAction = requested;
        }
        if (!Object.keys(data).length) {
            return res.status(400).json({ success: false, message: 'Nothing to update.' });
        }

        await withRetry(() => prisma.hotelConfig.update({ where: { id: hotelId }, data }));
        hotelConfigCache.delete(hotelId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('crm/booking-approval POST:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/crm/booking-review-settings', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({
                success: true,
                data: { reminderMinutes: 15, maxReminders: BOOKING_REVIEW_MAX_REMINDERS },
            });
        }
        const hotel = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { bookingReviewReminderMinutes: true },
        }));
        res.json({
            success: true,
            data: {
                reminderMinutes: resolveBookingReviewReminderMinutes(hotel?.bookingReviewReminderMinutes),
                maxReminders: BOOKING_REVIEW_MAX_REMINDERS,
            },
        });
    } catch (e) {
        console.error('crm/booking-review-settings GET:', e.message);
        res.status(500).json({ success: false, message: 'Could not load reminder settings.' });
    }
});

app.post('/api/crm/booking-review-settings', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const requested = parseInt(req.body?.reminderMinutes, 10);
        if (!BOOKING_REVIEW_ALLOWED_INTERVALS.has(requested)) {
            return res.status(400).json({ success: false, message: 'Choose once, 15 minutes, 30 minutes, or 1 hour.' });
        }
        await withRetry(() => prisma.hotelConfig.update({
            where: { id: hotelId },
            data: { bookingReviewReminderMinutes: requested },
        }));
        hotelConfigCache.delete(hotelId);

        // Apply the new cadence to outstanding reviews immediately.
        const now = new Date();
        await prisma.booking.updateMany({
            where: { hotelId, ownerReviewStatus: 'unreviewed', status: ACTIVE_BOOKING_STATUS_FILTER },
            data: {
                ownerReviewReminderCount: 0,
                ownerReviewNextReminderAt: requested > 0
                    ? new Date(now.getTime() + requested * 60 * 1000)
                    : null,
            },
        });
        res.json({
            success: true,
            data: { reminderMinutes: requested, maxReminders: BOOKING_REVIEW_MAX_REMINDERS },
        });
    } catch (e) {
        console.error('crm/booking-review-settings POST:', e.message);
        res.status(500).json({ success: false, message: 'Could not save reminder settings.' });
    }
});

// CRM: guest install funnel stats (last 30 days).
app.get('/api/crm/guest-install-stats', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [events, installedBookings, recentBookings, guestPushSubscribers] = await Promise.all([
            prisma.guestInstallEvent.findMany({
                where: { hotelId, createdAt: { gte: since } },
                select: { touchpoint: true, eventType: true, reservationCode: true },
            }).catch(() => []),
            prisma.booking.count({
                where: { hotelId, guestAppInstalledAt: { gte: since } },
            }).catch(() => 0),
            prisma.booking.count({
                where: { hotelId, createdAt: { gte: since }, status: ACTIVE_BOOKING_STATUS_FILTER },
            }).catch(() => 0),
            prisma.pushSubscription.count({
                where: { hotelId, source: 'guest' },
            }).catch(() => 0),
        ]);

        const byTouchpoint = {};
        for (const ev of events) {
            const tp = ev.touchpoint || 'unknown';
            if (!byTouchpoint[tp]) byTouchpoint[tp] = { views: 0, cta_clicks: 0, installed: 0 };
            if (ev.eventType === 'view') byTouchpoint[tp].views++;
            else if (ev.eventType === 'cta_click') byTouchpoint[tp].cta_clicks++;
            else if (ev.eventType === 'installed') byTouchpoint[tp].installed++;
        }

        const totals = events.reduce((acc, ev) => {
            if (ev.eventType === 'view') acc.views++;
            else if (ev.eventType === 'cta_click') acc.cta_clicks++;
            else if (ev.eventType === 'installed') acc.installed++;
            return acc;
        }, { views: 0, cta_clicks: 0, installed: 0 });

        const installRate = recentBookings > 0
            ? Math.round((installedBookings / recentBookings) * 100)
            : 0;

        res.json({
            success: true,
            periodDays: 30,
            totals,
            installedBookings,
            recentBookings,
            installRatePercent: installRate,
            guestPushSubscribers,
            byTouchpoint,
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// CRM: broadcast a push notification to all subscribed guests for this hotel.
app.post('/api/crm/guest-broadcast', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const title = String(req.body?.title || '').trim();
        const body = String(req.body?.body || '').trim();
        if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
        if (!body) return res.status(400).json({ success: false, message: 'Message body is required.' });
        if (title.length > 120) return res.status(400).json({ success: false, message: 'Title too long.' });
        if (body.length > 500) return res.status(400).json({ success: false, message: 'Message too long.' });

        const result = await sendPushToGuests(hotelId, {
            title,
            body,
            url: '/guest/messages',
            icon: '/apple-touch-icon.png',
        }, { TTL: 60 * 60 }, 'guestBroadcast');

        res.json({ success: true, sent: result.sent, failed: result.failed, cleaned: result.cleaned });
    } catch (e) {
        console.error('guest-broadcast error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send broadcast' });
    }
});

// PWA push: send a test notification to this hotel's subscribed devices
app.post('/api/push/test', crmAuth, async (req, res) => {
    try {
        if (!ownerPushConfigured()) return res.status(503).json({ success: false, message: 'Push not configured' });
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const sent = await sendPushToHotel(hotelId, {
            title: 'Notifications are on ✅',
            body: "This is how you'll be alerted when a guest books.",
            url: '/frontdesk',
            icon: '/apple-touch-icon.png',
            data: { type: 'test' },
        }, { TTL: 60, urgency: 'high' }, 'push/test');
        res.json({
            success: sent > 0,
            sent,
            message: sent > 0 ? undefined : 'No registered devices could be reached.',
        });
    } catch (e) {
        console.error('push/test error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

const BIG_BOOKING_USD = Number(process.env.BIG_BOOKING_USD || 250);

// Owner-facing alerts only — guest PWA subscriptions use source='guest'.
function ownerPushWhere(hotelId) {
    return { hotelId, NOT: { source: 'guest' } };
}

let cachedApnsProviderToken = null;

function ownerPushConfigured() {
    return !!VAPID_PRIVATE || APNS_CONFIGURED;
}

function createApnsProviderToken() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (cachedApnsProviderToken && cachedApnsProviderToken.expiresAt > nowSeconds + 60) {
        return cachedApnsProviderToken.value;
    }
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: nowSeconds })).toString('base64url');
    const signingInput = `${header}.${claims}`;
    const signature = crypto.sign('sha256', Buffer.from(signingInput), {
        key: APNS_PRIVATE_KEY_OBJECT,
        dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    const value = `${signingInput}.${signature}`;
    cachedApnsProviderToken = { value, expiresAt: nowSeconds + 50 * 60 };
    return value;
}

function buildApnsPayload(payloadObj = {}, hotelId = '') {
    const data = payloadObj.data && typeof payloadObj.data === 'object' ? payloadObj.data : {};
    const type = String(data.type || '').trim();
    const category = type === 'booking_approval'
        ? 'MARKETEL_BOOKING_APPROVAL'
        : type === 'booking_review'
            ? 'MARKETEL_BOOKING_REVIEW'
            : 'MARKETEL_GENERAL';
    return {
        aps: {
            alert: {
                title: String(payloadObj.title || 'Marketel Front Desk').slice(0, 100),
                body: String(payloadObj.body || '').slice(0, 240),
            },
            sound: 'default',
            badge: 1,
            category,
            ...(payloadObj.tag ? { 'thread-id': String(payloadObj.tag).slice(0, 64) } : {}),
        },
        url: String(payloadObj.url || '/frontdesk').slice(0, 1000),
        hotelId: String(hotelId || '').slice(0, 160),
        data,
        tag: String(payloadObj.tag || '').slice(0, 64),
    };
}

function sendApnsRequest(device, payloadObj, opts = {}) {
    const host = device.environment === 'sandbox'
        ? 'https://api.sandbox.push.apple.com'
        : 'https://api.push.apple.com';
    const ttl = Math.max(0, Number(opts.TTL || 600));
    const collapseId = String(payloadObj.tag || '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64);
    const body = JSON.stringify(buildApnsPayload(payloadObj, device.hotelId));

    return new Promise((resolve, reject) => {
        let settled = false;
        let timer = null;
        const client = http2.connect(host);
        const finish = (error, result) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            try { client.close(); } catch (_) {}
            if (error) reject(error);
            else resolve(result);
        };
        timer = setTimeout(() => finish(new Error('APNs request timed out')), 12000);
        client.once('error', error => finish(error));

        let request;
        try {
            request = client.request({
                ':method': 'POST',
                ':path': `/3/device/${device.deviceToken}`,
                authorization: `bearer ${createApnsProviderToken()}`,
                'apns-topic': APNS_BUNDLE_ID,
                'apns-push-type': 'alert',
                'apns-priority': '10',
                'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
                ...(collapseId ? { 'apns-collapse-id': collapseId } : {}),
            });
        } catch (error) {
            finish(error);
            return;
        }

        let status = 0;
        let responseBody = '';
        request.setEncoding('utf8');
        request.on('response', headers => {
            status = Number(headers[':status'] || 0);
        });
        request.on('data', chunk => { responseBody += chunk; });
        request.on('error', error => finish(error));
        request.on('end', () => {
            let reason = '';
            try { reason = JSON.parse(responseBody || '{}').reason || ''; } catch (_) {}
            if (status === 200) {
                finish(null, { ok: true, status });
                return;
            }
            const error = new Error(`APNs ${status || 'error'}${reason ? `: ${reason}` : ''}`);
            error.statusCode = status;
            error.reason = reason;
            finish(error);
        });
        request.end(body);
    });
}

async function sendNativePushToHotel(hotelId, payloadObj, opts = {}, label = 'nativePush') {
    if (!APNS_CONFIGURED || !hotelId || !prisma.nativePushDevice) return 0;
    const devices = await prisma.nativePushDevice.findMany({
        where: { hotelId, active: true, platform: 'ios' },
    });
    if (!devices.length) return 0;
    const results = await Promise.allSettled(devices.map(device =>
        sendApnsRequest(device, payloadObj, opts)
    ));
    const deadReasons = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered']);
    const deadIds = [];
    results.forEach((result, index) => {
        if (result.status === 'rejected' && deadReasons.has(result.reason?.reason)) {
            deadIds.push(devices[index].id);
        } else if (result.status === 'rejected') {
            console.error(`❌ [apns] ${label} device=${devices[index].id}: ${result.reason?.message || result.reason}`);
        }
    });
    if (deadIds.length) {
        await prisma.nativePushDevice.updateMany({
            where: { id: { in: deadIds } },
            data: { active: false },
        }).catch(() => {});
    }
    const sent = results.filter(result => result.status === 'fulfilled').length;
    console.log(`📲 [apns] ${label} hotel=${hotelId}: ${sent}/${devices.length} sent`);
    return sent;
}

async function saveGuestPushSubscription({ endpoint, p256dh, auth, hotelId, reservationCode }) {
    const cleanEndpoint = String(endpoint || '').trim();
    const cleanHotelId = String(hotelId || '').trim();
    const cleanCode = String(reservationCode || '').trim() || null;
    if (!cleanEndpoint || !p256dh || !auth || !cleanHotelId) {
        throw new Error('Missing subscription data');
    }
    const data = {
        endpoint: cleanEndpoint,
        p256dh,
        auth,
        source: 'guest',
        hotelId: cleanHotelId,
        reservationCode: cleanCode,
    };
    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint: cleanEndpoint } });
    if (existing) {
        await prisma.pushSubscription.update({ where: { id: existing.id }, data });
    } else {
        await prisma.pushSubscription.create({ data });
    }
}

// Send push to guest subscriptions (optionally scoped to one reservation thread).
async function sendPushToGuests(hotelId, payloadObj, opts = {}, label = 'guestPush', reservationCode = '') {
    if (!VAPID_PRIVATE) { console.log(`🔕 [push] ${label} skipped — VAPID not configured (hotel=${hotelId})`); return { sent: 0, failed: 0, cleaned: 0 }; }
    if (!hotelId) { console.log(`🔕 [push] ${label} skipped — no hotelId`); return { sent: 0, failed: 0, cleaned: 0 }; }
    const where = { hotelId, source: 'guest' };
    const reservationCodes = (Array.isArray(reservationCode) ? reservationCode : [reservationCode])
        .map((code) => String(code || '').trim())
        .filter(Boolean);
    if (reservationCodes.length === 1) where.reservationCode = reservationCodes[0];
    else if (reservationCodes.length > 1) where.reservationCode = { in: [...new Set(reservationCodes)] };
    const subs = await prisma.pushSubscription.findMany({ where });
    if (subs.length === 0) { console.log(`🔔 [push] ${label} hotel=${hotelId}: 0 guest subscriptions`); return { sent: 0, failed: 0, cleaned: 0 }; }
    const payload = JSON.stringify(payloadObj);
    const results = await Promise.allSettled(subs.map((s) =>
        webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            Object.assign({ TTL: 600 }, opts)
        )
    ));
    const cleaned = await cleanupPushResults(subs, results, label);
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return { sent, failed: results.length - sent, cleaned };
}

// Generic push sender for one hotel: loads subs, sends, self-heals dead ones,
// and returns how many were delivered. All owner notifications funnel through this.
async function sendPushToHotel(hotelId, payloadObj, opts = {}, label = 'push') {
    if (!hotelId) { console.log(`🔕 [push] ${label} skipped — no hotelId`); return 0; }
    if (!ownerPushConfigured()) {
        console.log(`🔕 [push] ${label} skipped — neither Web Push nor APNs is configured (hotel=${hotelId})`);
        return 0;
    }

    let webSent = 0;
    if (VAPID_PRIVATE) {
        const subs = await prisma.pushSubscription.findMany({ where: ownerPushWhere(hotelId) });
        if (subs.length) {
            const payload = JSON.stringify(payloadObj);
            const results = await Promise.allSettled(subs.map((s) =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                    Object.assign({ TTL: 600 }, opts)
                )
            ));
            await cleanupPushResults(subs, results, label);
            webSent = results.filter((r) => r.status === 'fulfilled').length;
        }
    }
    const nativeSent = await sendNativePushToHotel(hotelId, payloadObj, opts, label);
    if (webSent + nativeSent === 0) {
        console.log(`🔔 [push] ${label} hotel=${hotelId}: 0 reachable devices`);
    }
    return webSent + nativeSent;
}

const MONTHLY_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
const BOOKING_REVIEW_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const BOOKING_REVIEW_SWEEP_INTERVAL_MS = 60 * 1000;
const BOOKING_REVIEW_MAX_REMINDERS = 3;
const BOOKING_REVIEW_ALLOWED_INTERVALS = new Set([0, 15, 30, 60]);

function resolveBookingReviewReminderMinutes(value) {
    const parsed = parseInt(value, 10);
    return BOOKING_REVIEW_ALLOWED_INTERVALS.has(parsed) ? parsed : 15;
}

function signBookingReviewToken({ bookingId, hotelId }) {
    const payload = JSON.stringify({
        purpose: 'booking-review',
        bookingId: String(bookingId || '').trim(),
        hotelId: String(hotelId || '').trim(),
        exp: Date.now() + BOOKING_REVIEW_TOKEN_EXPIRY_MS,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    return 'br_' + encoded + '.' + signBookingActionPayload(encoded);
}

function verifyBookingReviewToken(token) {
    const raw = String(token || '').trim();
    if (!raw.startsWith('br_')) return null;
    const parts = raw.slice(3).split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    if (!timingSafeTextEqual(sig, signBookingActionPayload(encoded))) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.purpose !== 'booking-review') return null;
        if (!payload.bookingId || !payload.hotelId) return null;
        if (!(Number(payload.exp) > Date.now())) return null;
        return { bookingId: String(payload.bookingId), hotelId: String(payload.hotelId) };
    } catch (_) {
        return null;
    }
}

function formatBookingReviewStay(checkin, checkout) {
    try {
        const options = { month: 'short', day: 'numeric', timeZone: 'UTC' };
        const start = new Date(checkin).toLocaleDateString('en-US', options);
        const end = new Date(checkout).toLocaleDateString('en-US', options);
        return `${start}–${end}`;
    } catch (_) {
        return '';
    }
}

async function bookingReviewPublicData(booking) {
    if (!booking) return null;
    let totalUnits = 1;
    try {
        const room = await prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId: booking.hotelId, name: booking.roomName } },
            select: { totalUnits: true },
        });
        if (room?.totalUnits) totalUnits = Math.max(1, parseInt(room.totalUnits, 10) || 1);
    } catch (_) {}
    return {
        id: booking.id,
        status: booking.status,
        reviewStatus: booking.ownerReviewStatus || null,
        reviewedAt: booking.ownerReviewedAt || null,
        roomName: booking.roomName,
        checkinDate: booking.checkinDate,
        checkoutDate: booking.checkoutDate,
        nights: booking.nights,
        guestName: [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'Guest',
        guestPhone: booking.guestPhone || '',
        guestEmail: booking.guestEmail || '',
        grandTotal: booking.grandTotal,
        amountPaidNow: booking.amountPaidNow || 0,
        totalUnits,
    };
}

async function armConfirmedBookingReview(bookingId, hotelId) {
    if (!bookingId || !hotelId) return null;
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: hotelId },
        select: { bookingReviewReminderMinutes: true },
    }).catch(() => null);
    const reminderMinutes = resolveBookingReviewReminderMinutes(hotel?.bookingReviewReminderMinutes);
    const now = new Date();
    const nextReminder = reminderMinutes > 0
        ? new Date(now.getTime() + reminderMinutes * 60 * 1000)
        : null;

    await prisma.booking.updateMany({
        where: {
            id: bookingId,
            hotelId,
            status: ACTIVE_BOOKING_STATUS_FILTER,
            bookingType: { not: 'manual' },
        },
        data: {
            ownerReviewStatus: 'unreviewed',
            ownerReviewRequestedAt: now,
            ownerReviewedAt: null,
            ownerReviewReminderCount: 0,
            ownerReviewNextReminderAt: nextReminder,
        },
    });
    return prisma.booking.findFirst({ where: { id: bookingId, hotelId } });
}

async function sendBookingReviewPush(booking, { reminderNumber = 0 } = {}) {
    if (!booking?.hotelId || !booking?.id) return 0;
    const token = signBookingReviewToken({ bookingId: booking.id, hotelId: booking.hotelId });
    const stay = formatBookingReviewStay(booking.checkinDate, booking.checkoutDate);
    const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'Guest';
    const amount = Number(booking.grandTotal || 0).toFixed(2);
    const paid = Number(booking.amountPaidNow || 0);
    const priceLine = paid > 0 ? `$${amount} total` : `$${amount} due at check-in`;
    const reminderPrefix = reminderNumber > 0 ? `Reminder ${reminderNumber}/${BOOKING_REVIEW_MAX_REMINDERS}: ` : '';
    const title = reminderNumber > 0
        ? `${reminderPrefix}verify this booking`
        : 'New confirmed booking';

    return sendPushToHotel(booking.hotelId, {
        title,
        body: `${booking.roomName} · ${stay}\n${guestName} · ${priceLine}`,
        url: `/frontdesk?review=${encodeURIComponent(token)}`,
        icon: '/apple-touch-icon.png',
        tag: `booking-review-${booking.id}`,
        requireInteraction: true,
        renotify: true,
        actions: [{ action: 'view', title: 'Review room' }],
        data: { type: 'booking_review', bookingId: booking.id, token },
    }, {
        TTL: reminderNumber > 0 ? 60 * 60 : 10 * 60,
        urgency: 'high',
    }, reminderNumber > 0 ? 'bookingReviewReminder' : 'notifyNewBooking');
}

// Notify the owner of a new booking. The copy adapts to context so the alert is
// genuinely useful at a glance: first sale of the day, a big-ticket booking, a
// returning guest, or a same-day arrival each get their own framing. Also fires a
// separate 🏆 milestone alert when the hotel crosses a monthly bookings threshold.
async function notifyNewBooking(hotelId, guestName, roomName, grandTotal, checkinIso = '', guestEmail = '', bookingId = '') {
    if (!ownerPushConfigured() || !hotelId) { console.log(`🔕 [push] new booking skipped (configured=${ownerPushConfigured()}, hotel=${hotelId})`); return; }
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
            const active = monthly.filter((b) => !isDeadBookingStatus(b.status));
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

        const reviewBooking = bookingId
            ? await prisma.booking.findFirst({ where: { id: bookingId, hotelId } }).catch(() => null)
            : null;
        const sent = reviewBooking
            ? await sendBookingReviewPush(reviewBooking)
            : await sendPushToHotel(hotelId, {
                title,
                body: bodyText,
                url: '/frontdesk?tab=bookings',
                icon: '/apple-touch-icon.png',
                tag: bookingId ? `booking-review-${bookingId}` : undefined,
            }, { TTL: 60 }, 'notifyNewBooking');
        console.log(`🔔 [push] new booking hotel=${hotelId} sent=${sent} "${title}"`);

        // Monthly milestone — fires once, exactly when the count lands on a threshold.
        if (monthCount !== null && MONTHLY_MILESTONES.includes(monthCount)) {
            await sendPushToHotel(hotelId, {
                title: '🏆 Milestone reached!',
                body: `${monthCount} bookings this month — keep it going!`,
                url: '/frontdesk',
                icon: '/apple-touch-icon.png',
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
    return deadIds.length;
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
    const explicitlyAvailable = override && override.availableUnits !== null && override.availableUnits !== undefined
        ? Math.max(0, parseInt(override.availableUnits, 10) || 0)
        : null;

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
        return !isDeadBookingStatus(b.status);
    }).length;

    return {
        tracked: true,
        roomName: room.name,
        todayIso,
        // Explicit overrides are remaining sellable units and are already
        // decremented by the booking path. Only base capacity needs bookings
        // subtracted here.
        availableUnits: override?.closed
            ? 0
            : explicitlyAvailable !== null
                ? explicitlyAvailable
                : Math.max(0, baseUnits - bookedCount),
    };
}

async function notifyRoomSoldOutToday(hotelId, roomName) {
    if (!ownerPushConfigured() || !hotelId || !roomName) return;
    try {
        await sendPushToHotel(hotelId, {
            title: 'Sold Out Tonight! 🎉',
            body: `${roomName} is SOLD OUT for tonight on your website. Let’s go!`,
            url: '/frontdesk',
            icon: '/marketellogo.svg',
            tag: `soldout-${slugifyText(roomName)}`,
            data: { type: 'sold_out' },
        }, { TTL: 120, urgency: 'high' }, 'soldOutToday');
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

function triggerBookingNotifications(hotelId, guestName, roomName, grandTotal, checkinIso = '', guestEmail = '', bookingId = '') {
    const run = async () => {
        let armedBookingId = '';
        if (bookingId) {
            const armed = await armConfirmedBookingReview(bookingId, hotelId).catch((e) => {
                console.error('armConfirmedBookingReview:', e.message);
                return null;
            });
            armedBookingId = armed?.id || bookingId;
        }
        await notifyNewBooking(hotelId, guestName, roomName, grandTotal, checkinIso, guestEmail, armedBookingId);
        if (frontDeskAssistant && armedBookingId) {
            await frontDeskAssistant.notifyNewBooking(armedBookingId).catch((error) => {
                console.error('frontdesk-assistant booking alert:', error.message);
            });
        }
    };
    run().catch(() => {});
    maybeNotifyRoomSoldOutToday(hotelId, roomName, checkinIso).catch(() => {});
}

// Notify the owner that a guest messaged them from the confirmation screen.
async function notifyGuestMessage(hotelId, guestName, preview, reservationCode = '') {
    if (!ownerPushConfigured() || !hotelId) return;
    try {
        const tag = reservationCode ? ` · #${reservationCode}` : '';
        const sent = await sendPushToHotel(hotelId, {
            title: `💬 Message from ${guestName || 'a guest'}`,
            body: (preview || 'Tap to read').slice(0, 160) + tag,
            url: '/frontdesk?tab=apps',
            icon: '/apple-touch-icon.png',
        }, { TTL: 60 * 60 }, 'guestMessage');
        console.log(`💬 [push] guest message hotel=${hotelId} sent=${sent}`);
    } catch (e) {
        console.error('notifyGuestMessage:', e.message);
    }
}

// ── OWNER-APPROVED BOOKINGS ────────────────────────────────────────────
// A direct booking lands as 'pending' and holds its room while Front Desk asks
// the owner by app alert and/or Assistant text. Each property decides what
// silence means: keep the booking or release the request. The rule is copied to
// the booking so it cannot change halfway through a countdown. Holding is
// pointless if no phone can receive the alert, so unreachable properties keep
// the existing safe behavior: instant confirmation plus an install nudge.

const BOOKING_APPROVAL_TOKEN_EXPIRY_MS = 6 * 60 * 60 * 1000;
const BOOKING_APPROVAL_SWEEP_INTERVAL_MS = 60 * 1000;
const BOOKING_APPROVAL_DEFAULT_WINDOW_MINUTES = 20;
const BOOKING_APPROVAL_MIN_WINDOW_MINUTES = 1;
const BOOKING_APPROVAL_MAX_WINDOW_MINUTES = 180;
const BOOKING_APPROVAL_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function signBookingActionPayload(encoded) {
    return crypto.createHmac('sha256', CRM_RETURN_TOKEN_SECRET).update(encoded).digest('base64url');
}

// Self-authenticating token. A service worker can't read the CRM PIN out of
// localStorage, so the action link carries its own proof instead.
function signBookingActionToken({ bookingId, hotelId }) {
    const payload = JSON.stringify({
        purpose: 'booking-approval',
        bookingId: String(bookingId || '').trim(),
        hotelId: String(hotelId || '').trim(),
        exp: Date.now() + BOOKING_APPROVAL_TOKEN_EXPIRY_MS,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    return 'ba_' + encoded + '.' + signBookingActionPayload(encoded);
}

function verifyBookingActionToken(token) {
    const raw = String(token || '').trim();
    if (!raw.startsWith('ba_')) return null;
    const parts = raw.slice(3).split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    if (!timingSafeTextEqual(sig, signBookingActionPayload(encoded))) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.purpose !== 'booking-approval') return null;
        if (!payload.bookingId || !payload.hotelId) return null;
        if (!(Number(payload.exp) > Date.now())) return null;
        return { bookingId: String(payload.bookingId), hotelId: String(payload.hotelId) };
    } catch (_) {
        return null;
    }
}

function resolveApprovalWindowMinutes(config) {
    const raw = parseInt(config?.bookingApprovalWindowMinutes, 10);
    if (!Number.isFinite(raw)) return BOOKING_APPROVAL_DEFAULT_WINDOW_MINUTES;
    return Math.min(BOOKING_APPROVAL_MAX_WINDOW_MINUTES, Math.max(BOOKING_APPROVAL_MIN_WINDOW_MINUTES, raw));
}

function resolveApprovalNoResponseAction(configOrValue) {
    const raw = typeof configOrValue === 'string'
        ? configOrValue
        : configOrValue?.bookingApprovalNoResponseAction;
    return String(raw || '').trim().toLowerCase() === 'release' ? 'release' : 'confirm';
}

async function countOwnerPushDevices(hotelId) {
    if (!hotelId) return 0;
    try {
        const [webCount, nativeCount] = await Promise.all([
            prisma.pushSubscription
                ? withRetry(() => prisma.pushSubscription.count({ where: ownerPushWhere(hotelId) }))
                : Promise.resolve(0),
            prisma.nativePushDevice
                ? withRetry(() => prisma.nativePushDevice.count({ where: { hotelId, active: true } }))
                : Promise.resolve(0),
        ]);
        return webCount + nativeCount;
    } catch (_) {
        return 0;
    }
}

async function countBookingApprovalChannels(hotelId) {
    const [pushDevices, assistantRecipients] = await Promise.all([
        ownerPushConfigured() ? countOwnerPushDevices(hotelId) : Promise.resolve(0),
        frontDeskAssistant?.countReachableBookingRecipients
            ? frontDeskAssistant.countReachableBookingRecipients(hotelId).catch(() => 0)
            : Promise.resolve(0),
    ]);
    return { pushDevices, assistantRecipients, total: pushDevices + assistantRecipients };
}

async function resolveBookingApprovalPlan(config) {
    const noResponseAction = resolveApprovalNoResponseAction(config);
    const off = { hold: false, outcome: null, windowMinutes: 0, pendingUntil: null, noResponseAction };
    if (!config?.bookingApprovalEnabled) return off;
    // Manual PMS only: the local Booking table is the inventory, so pending and
    // released rows are meaningful without an external reservation round-trip.
    if (String(config.pms || '').toLowerCase() !== 'manual') return off;
    if ((await countBookingApprovalChannels(config.id)).total < 1) {
        return { ...off, outcome: 'auto_no_alerts' };
    }

    const windowMinutes = resolveApprovalWindowMinutes(config);
    return {
        hold: true,
        outcome: null,
        windowMinutes,
        pendingUntil: new Date(Date.now() + windowMinutes * 60 * 1000),
        noResponseAction,
    };
}

// Extra columns to merge into prisma.booking.create for a given plan.
function bookingApprovalCreateFields(plan) {
    if (plan?.hold) {
        return {
            status: 'pending',
            approvalRequestedAt: new Date(),
            pendingUntil: plan.pendingUntil,
            approvalNoResponseAction: plan.noResponseAction,
        };
    }
    if (plan?.outcome) {
        return {
            status: 'confirmed',
            approvalOutcome: plan.outcome,
            approvalDecidedAt: new Date(),
        };
    }
    return {};
}

function guestInfoFromBookingRow(booking) {
    return {
        firstName: booking.guestFirstName,
        lastName: booking.guestLastName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
    };
}

function bookingDetailsFromBookingRow(booking) {
    return {
        name: booking.roomName,
        roomName: booking.roomName,
        checkin: booking.checkinDate,
        checkout: booking.checkoutDate,
        nights: booking.nights,
        total: booking.grandTotal,
        reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
    };
}

function formatApprovalStayRange(checkin, checkout) {
    try {
        const opts = { month: 'short', day: 'numeric' };
        const a = new Date(checkin).toLocaleDateString('en-US', opts);
        const b = new Date(checkout).toLocaleDateString('en-US', opts);
        return `${a} – ${b}`;
    } catch (_) {
        return '';
    }
}

async function notifyBookingNeedsApproval(booking) {
    if (!booking?.hotelId || !booking?.id) return 0;
    try {
        const token = signBookingActionToken({ bookingId: booking.id, hotelId: booking.hotelId });
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'A guest';
        const dueMs = new Date(booking.pendingUntil || Date.now()).getTime() - Date.now();
        const minutes = Math.max(1, Math.round(dueMs / 60000));
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);

        const noResponseAction = resolveApprovalNoResponseAction(booking.approvalNoResponseAction);
        const fallback = noResponseAction === 'release'
            ? `releases in ${minutes} min if nobody answers`
            : `confirms in ${minutes} min if nobody answers`;
        const [pushSent, smsResult] = await Promise.all([
            ownerPushConfigured()
                ? sendPushToHotel(booking.hotelId, {
                    title: 'New room request — still free?',
                    body: `${stay} · ${booking.roomName}\n${guestName} · ${fallback}`,
                    url: `/frontdesk?approve=${encodeURIComponent(token)}`,
                    icon: '/apple-touch-icon.png',
                    tag: `approval-${booking.id}`,
                    requireInteraction: true,
                    actions: [
                        { action: 'confirm', title: '✅ Keep booking' },
                        { action: 'release', title: '🚫 Release request' },
                    ],
                    data: { type: 'booking_approval', bookingId: booking.id, token },
                }, { TTL: Math.max(60, minutes * 60), urgency: 'high' }, 'notifyBookingNeedsApproval')
                : Promise.resolve(0),
            frontDeskAssistant?.notifyNewBooking
                ? frontDeskAssistant.notifyNewBooking(booking).catch((error) => {
                    console.error('frontdesk-assistant approval alert:', error.message);
                    return { sent: 0 };
                })
                : Promise.resolve({ sent: 0 }),
        ]);
        const smsSent = Number(smsResult?.sent || 0);
        const sent = Number(pushSent || 0) + smsSent;
        console.log(`🕒 [approval] request hotel=${booking.hotelId} booking=${booking.id} push=${pushSent || 0} sms=${smsSent} fallback=${noResponseAction}`);
        return sent;
    } catch (e) {
        console.error('notifyBookingNeedsApproval:', e.message);
        return 0;
    }
}

// Re-send on the same tag so a decided booking stops prompting on the owner's
// other devices instead of leaving a stale "confirm or release" card behind.
async function notifyBookingApprovalResolved(booking, outcome, source = 'owner') {
    if (!booking?.hotelId) return;
    try {
        const released = outcome === 'owner_released' || outcome === 'auto_released';
        const autoConfirmed = outcome === 'auto_confirmed';
        const autoReleased = outcome === 'auto_released';
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'A guest';
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
        const title = autoReleased
            ? 'Booking auto-released 🚫'
            : (released
                ? 'Booking released 🚫'
                : (autoConfirmed ? 'Booking auto-confirmed ✓' : 'Booking confirmed ✓'));
        const suffix = autoReleased
            ? 'No response in time. The hold was voided and the guest was notified.'
            : (released
                ? 'Room is back on sale and the hold was voided.'
                : (autoConfirmed ? 'No response in time, so it went through.' : 'Guest has been emailed.'));

        await Promise.all([
            ownerPushConfigured()
                ? sendPushToHotel(booking.hotelId, {
                    title,
                    body: `${stay} · ${booking.roomName}\n${guestName} — ${suffix}`,
                    url: '/frontdesk?tab=bookings',
                    icon: '/apple-touch-icon.png',
                    tag: `approval-${booking.id}`,
                    requireInteraction: false,
                    actions: [],
                }, { TTL: 6 * 60 * 60 }, 'notifyBookingApprovalResolved')
                : Promise.resolve(0),
            source === 'sweep' && frontDeskAssistant?.notifyBookingDecision
                ? frontDeskAssistant.notifyBookingDecision(booking, outcome)
                : Promise.resolve({ sent: 0 }),
        ]);
    } catch (e) {
        console.error('notifyBookingApprovalResolved:', e.message);
    }
}

// Release an uncaptured authorization or refund a captured payment when the
// owner turns a confirmed booking away. Idempotency protects repeat taps.
async function voidBookingHold(booking) {
    if (!booking?.stripePaymentIntentId) return;
    try {
        const intent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
        const cancellable = ['requires_capture', 'requires_confirmation', 'requires_payment_method', 'requires_action'];
        if (cancellable.includes(String(intent.status || ''))) {
            await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);
        } else if (String(intent.status || '') === 'succeeded' && Number(intent.amount_received || 0) > 0) {
            await stripe.refunds.create(
                { payment_intent: booking.stripePaymentIntentId, reason: 'requested_by_customer' },
                { idempotencyKey: `owner-cancel-refund-${booking.id}` }
            );
        }
        await withRetry(() => prisma.booking.update({
            where: { id: booking.id },
            data: { holdStatus: 'released', holdReleasedAt: new Date() },
        }));
    } catch (e) {
        console.error('voidBookingHold:', e.message);
    }
}

async function sendBookingReleasedEmail(booking, outcome = 'owner_released') {
    if (!emailTransporter || !booking?.guestEmail) return;
    try {
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            select: { name: true, phone: true },
        }).catch(() => null);
        const hotelName = hotel?.name || 'the hotel';
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'there';
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
        const automatic = outcome === 'auto_released';
        const reasonCopy = automatic
            ? `The property did not confirm availability for <strong>${booking.roomName}</strong>${stay ? ` (${stay})` : ''} before its review window ended, so your request was released automatically.`
            : `Unfortunately <strong>${hotelName}</strong> can't honour your request for <strong>${booking.roomName}</strong>${stay ? ` (${stay})` : ''} — the room was taken just before your booking came through.`;
        const phoneLine = hotel?.phone
            ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Call ${hotelName} at ${hotel.phone} and they'll help you find another option.</p>`
            : `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Reply to this email and ${hotelName} will help you find another option.</p>`;

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#1a2b22;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">We couldn't confirm your room</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${guestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">${reasonCopy}</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>You have not been charged.</strong> The temporary $1 authorisation on your card has been voided and will disappear from your statement.</p>${phoneLine}</td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: booking.guestEmail,
            subject: `Unable to confirm your reservation — ${hotelName}`,
            html,
        });
        console.log(`📧 released-booking email sent to ${booking.guestEmail}`);
    } catch (e) {
        console.error('sendBookingReleasedEmail:', e.message);
    }
}

// The install lever: every auto_no_alerts booking is a review the owner silently
// lost. Tell them once a week, tied to a real booking they can picture.
async function maybeNudgeOwnerNoAlerts(booking) {
    if (!emailTransporter || !booking?.hotelId) return;
    try {
        const since = new Date(Date.now() - BOOKING_APPROVAL_NUDGE_COOLDOWN_MS);
        const priorNudges = await prisma.booking.count({
            where: {
                hotelId: booking.hotelId,
                approvalOutcome: 'auto_no_alerts',
                approvalDecidedAt: { gte: since },
                id: { not: booking.id },
            },
        }).catch(() => 1);
        if (priorNudges > 0) return;

        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            select: { name: true, ownerEmail: true, bookingApprovalWindowMinutes: true },
        }).catch(() => null);
        if (!hotel?.ownerEmail) return;

        const hotelName = hotel.name || 'your hotel';
        const minutes = resolveApprovalWindowMinutes(hotel);
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
        const base = await buildGuestSiteBase(booking.hotelId, null);
        const frontdeskUrl = `${base || ''}/frontdesk`;

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#2E7D5B;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">This booking confirmed without you</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>${booking.roomName}</strong>${stay ? ` · ${stay}` : ''} was just booked at ${hotelName} and went straight to confirmed.</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">With Front Desk installed on your phone, you'd get <strong>${minutes} minutes</strong> to release a room you'd already sold somewhere else — one tap, straight from the notification. Right now there's no device we can alert, so every booking locks in automatically.</p><div style="text-align:center;margin:0 0 20px;"><a href="${frontdeskUrl}" style="display:inline-block;background:#2E7D5B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:10px;">Install Front Desk →</a></div><div style="background:#f8f9fa;border-radius:10px;padding:14px 16px;"><p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">On iPhone this only works once Front Desk is on your Home Screen — open the link in Safari, tap Share, then <strong>Add to Home Screen</strong>. Alerts can't reach a browser tab.</p></div></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: '"Marketel" <support@bookmarketel.com>',
            to: hotel.ownerEmail,
            subject: `A booking just confirmed without your review — ${hotelName}`,
            html,
        });
        console.log(`📧 no-alerts nudge sent for hotel=${booking.hotelId}`);
    } catch (e) {
        console.error('maybeNudgeOwnerNoAlerts:', e.message);
    }
}

// Fire-and-forget follow-up for a booking created outside the approval hold.
function handleBookingCreatedWithoutHold(booking, plan) {
    if (plan?.outcome === 'auto_no_alerts' && booking?.id) {
        maybeNudgeOwnerNoAlerts(booking).catch(() => {});
    }
}

// Single transition point for every approval decision — notification action,
// in-app card, and the sweep all land here. The status guard inside updateMany
// makes it a compare-and-swap, so a double tap or an overlapping sweep run can
// never apply the same decision twice.
async function applyBookingApprovalDecision(bookingId, action, source = 'owner') {
    const wantRelease = String(action || '').toLowerCase() === 'release';
    const booking = await withRetry(() => prisma.booking.findUnique({ where: { id: String(bookingId || '') } }))
        .catch(() => null);
    if (!booking) return { ok: false, code: 'not_found' };

    if (String(booking.status || '').toLowerCase() !== 'pending') {
        return {
            ok: true,
            code: 'already_decided',
            status: booking.status,
            outcome: booking.approvalOutcome || null,
            booking,
        };
    }

    const outcome = wantRelease
        ? (source === 'sweep' ? 'auto_released' : 'owner_released')
        : (source === 'sweep' ? 'auto_confirmed' : 'owner_confirmed');

    const result = await withRetry(() => prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.hotelId}), hashtext(${booking.roomName}))`;
        const updated = await tx.booking.updateMany({
            where: { id: booking.id, status: 'pending' },
            data: {
                status: wantRelease ? 'released' : 'confirmed',
                approvalOutcome: outcome,
                approvalDecidedAt: new Date(),
            },
        });
        // Explicit availability overrides are remaining-unit counters. The
        // booking creation path decremented them, so the one winning release
        // must restore them in the same transaction that changes the status.
        const overrideDates = parseInventoryOverrideDates(booking.inventoryOverrideDates);
        if (wantRelease && updated.count === 1 && overrideDates.length) {
            const room = await tx.manualRoom.findUnique({
                where: { hotelId_name: { hotelId: booking.hotelId, name: booking.roomName } },
                select: { id: true },
            });
            if (room) {
                await tx.manualOverride.updateMany({
                    where: {
                        roomId: room.id,
                        date: { in: overrideDates },
                        availableUnits: { not: null },
                    },
                    data: { availableUnits: { increment: 1 } },
                });
            }
        }
        return updated;
    }, { maxWait: 5000, timeout: 15000 }));

    if (result.count !== 1) {
        const fresh = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null);
        return {
            ok: true,
            code: 'already_decided',
            status: fresh?.status || booking.status,
            outcome: fresh?.approvalOutcome || null,
            booking: fresh || booking,
        };
    }

    const decided = {
        ...booking,
        status: wantRelease ? 'released' : 'confirmed',
        approvalOutcome: outcome,
        approvalDecidedAt: new Date(),
    };

    if (wantRelease) {
        await voidBookingHold(decided);
        sendBookingReleasedEmail(decided, outcome).catch(() => {});
    } else {
        // The confirmation email was deliberately withheld until now.
        notifyGuestBookingConfirmed({
            req: null,
            hotelId: decided.hotelId,
            guestInfo: guestInfoFromBookingRow(decided),
            bookingDetails: bookingDetailsFromBookingRow(decided),
            reservationCode: decided.pmsConfirmationCode || decided.ourReservationCode,
        }).catch(() => {});
        // Only the sold-out signal is genuinely new here — the owner already got
        // the approval push, so notifyNewBooking would just be noise.
        maybeNotifyRoomSoldOutToday(
            decided.hotelId,
            decided.roomName,
            normalizeIsoDate(decided.checkinDate)
        ).catch(() => {});
    }

    notifyBookingApprovalResolved(decided, outcome, source).catch(() => {});
    console.log(`✅ [approval] ${outcome} booking=${decided.id} hotel=${decided.hotelId} via=${source}`);

    return { ok: true, code: 'applied', status: decided.status, outcome, booking: decided };
}

// DB-backed sweep rather than a per-booking setTimeout: Render restarts wipe
// in-memory timers, and this self-heals by picking up everything overdue.
async function runBookingApprovalSweep() {
    if (!prisma.booking) return { confirmed: 0, released: 0 };
    let due = [];
    try {
        due = await prisma.booking.findMany({
            where: { status: 'pending', pendingUntil: { lte: new Date() } },
            select: { id: true, approvalNoResponseAction: true },
            orderBy: { pendingUntil: 'asc' },
            take: 100,
        });
    } catch (e) {
        console.error('booking approval sweep query:', e.message);
        return { confirmed: 0, released: 0 };
    }
    if (!due.length) return { confirmed: 0, released: 0 };

    let confirmed = 0;
    let released = 0;
    for (const row of due) {
        const action = resolveApprovalNoResponseAction(row.approvalNoResponseAction);
        const outcome = await applyBookingApprovalDecision(row.id, action, 'sweep')
            .catch((e) => {
                console.error('booking approval sweep:', e.message);
                return null;
            });
        if (outcome?.code === 'applied') {
            if (action === 'release') released += 1;
            else confirmed += 1;
        }
    }
    if (confirmed) console.log(`⏰ [approval] auto-confirmed ${confirmed} booking(s)`);
    if (released) console.log(`⏰ [approval] auto-released ${released} booking(s)`);
    return { confirmed, released };
}

// Notification actions and the in-app card both post here. Authenticated by the
// signed token alone so it works from a service worker with no session.
app.post('/api/booking-approval/act', async (req, res) => {
    try {
        const token = String(req.body?.token || req.query?.token || '').trim();
        const action = String(req.body?.action || '').trim().toLowerCase();
        if (!['confirm', 'release'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action must be confirm or release.' });
        }

        const claim = verifyBookingActionToken(token);
        if (!claim) {
            return res.status(401).json({ success: false, message: 'This approval link has expired.' });
        }

        const outcome = await applyBookingApprovalDecision(claim.bookingId, action, 'owner');
        if (!outcome.ok) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (claim.hotelId && outcome.booking?.hotelId && claim.hotelId !== outcome.booking.hotelId) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        res.json({
            success: true,
            applied: outcome.code === 'applied',
            alreadyDecided: outcome.code === 'already_decided',
            status: outcome.status,
            outcome: outcome.outcome,
            roomName: outcome.booking?.roomName || '',
            guestName: [outcome.booking?.guestFirstName, outcome.booking?.guestLastName].filter(Boolean).join(' '),
        });
    } catch (e) {
        console.error('booking-approval/act:', e.message);
        res.status(500).json({ success: false, message: 'Could not apply that decision.' });
    }
});

// Same decision from an authenticated booking card. The public notification
// route uses a signed one-booking token; this one stays inside the scoped CRM.
app.post('/api/crm/bookings/:id/approval', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const action = String(req.body?.action || '').trim().toLowerCase();
        if (!['confirm', 'release'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Choose keep booking or release request.' });
        }
        const booking = await prisma.booking.findFirst({
            where: { id: String(req.params.id || ''), hotelId },
            select: { id: true },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        const outcome = await applyBookingApprovalDecision(booking.id, action, 'owner');
        res.json({
            success: outcome.ok,
            alreadyDecided: outcome.code === 'already_decided',
            status: outcome.status,
            outcome: outcome.outcome,
        });
    } catch (e) {
        console.error('crm booking approval:', e.message);
        res.status(500).json({ success: false, message: 'Could not apply that decision.' });
    }
});

// Lets the in-app card render booking details before the owner commits.
app.get('/api/booking-approval/peek', async (req, res) => {
    try {
        const claim = verifyBookingActionToken(String(req.query?.token || '').trim());
        if (!claim) return res.status(401).json({ success: false, message: 'This approval link has expired.' });

        const booking = await prisma.booking.findUnique({ where: { id: claim.bookingId } }).catch(() => null);
        if (!booking || booking.hotelId !== claim.hotelId) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        res.json({
            success: true,
            data: {
                id: booking.id,
                status: booking.status,
                approvalOutcome: booking.approvalOutcome || null,
                approvalNoResponseAction: resolveApprovalNoResponseAction(booking.approvalNoResponseAction),
                pendingUntil: booking.pendingUntil,
                roomName: booking.roomName,
                checkinDate: booking.checkinDate,
                checkoutDate: booking.checkoutDate,
                nights: booking.nights,
                grandTotal: booking.grandTotal,
                guestName: [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' '),
                guestPhone: booking.guestPhone,
                reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
            },
        });
    } catch (e) {
        console.error('booking-approval/peek:', e.message);
        res.status(500).json({ success: false, message: 'Could not load that booking.' });
    }
});

// ── CANCELLING A CONFIRMED BOOKING ─────────────────────────────────────
// The approval window only catches a clash that happens within minutes of the
// booking arriving. The common case is slower: a booking confirms at 2pm, and at
// 5pm a walk-in is given that same room. By then the approval buttons are inert,
// so the owner needs a plain way to turn the booking away afterwards — freeing
// the room, voiding the hold, and telling the guest.

async function sendBookingCancelledEmail(booking, reason) {
    if (!emailTransporter || !booking?.guestEmail || booking.guestEmail === '-') return;
    try {
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            select: { name: true, phone: true },
        }).catch(() => null);
        const hotelName = hotel?.name || 'the hotel';
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'there';
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
        const code = booking.pmsConfirmationCode || booking.ourReservationCode;
        const reasonLine = reason
            ? `<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">Reason given: <strong>${escapeXml(reason)}</strong></p>`
            : '';
        const contactLine = hotel?.phone
            ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Please call ${hotelName} on ${escapeXml(hotel.phone)} and they'll help you sort out somewhere to stay.</p>`
            : `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Reply to this email and ${hotelName} will help you sort out somewhere to stay.</p>`;

        // This guest already received a "Reservation confirmed" email, so the copy
        // has to acknowledge that directly rather than pretend it never happened.
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#7f1d1d;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Your reservation was cancelled</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${escapeXml(guestName)},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">We're sorry — ${hotelName} has had to cancel your reservation for <strong>${escapeXml(booking.roomName)}</strong>${stay ? ` (${stay})` : ''}, confirmation <strong>${escapeXml(code)}</strong>. We know you'd already had a confirmation from us, and we're sorry for the trouble this causes.</p>${reasonLine}<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>Your payment has been handled automatically.</strong> Any temporary card authorisation has been released, and any captured online payment has been submitted for refund.</p>${contactLine}</td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: booking.guestEmail,
            subject: `Your reservation was cancelled — ${hotelName}`,
            html,
        });
        console.log(`📧 cancellation email sent to ${booking.guestEmail}`);
    } catch (e) {
        console.error('sendBookingCancelledEmail:', e.message);
    }
}

// Guarded on "not already dead" rather than on a specific status, so this works
// on a confirmed booking and is idempotent if the owner taps twice.
async function cancelBookingByOwner(bookingId, hotelId, reason = '') {
    const booking = await withRetry(() => prisma.booking.findFirst({
        where: { id: String(bookingId || ''), hotelId },
    })).catch(() => null);
    if (!booking) return { ok: false, code: 'not_found' };

    if (isDeadBookingStatus(booking.status)) {
        return { ok: true, code: 'already_cancelled', status: booking.status, booking };
    }

    const result = await withRetry(() => prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext(${booking.roomName}))`;
        const updated = await tx.booking.updateMany({
            where: { id: booking.id, status: { notIn: DEAD_BOOKING_STATUSES } },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: String(reason || '').trim().slice(0, 500) || null,
                ownerReviewStatus: 'cancelled',
                ownerReviewedAt: new Date(),
                ownerReviewNextReminderAt: null,
                // Legacy pending rows can still be cancelled safely while the old
                // approval links age out.
                ...(String(booking.status).toLowerCase() === 'pending'
                    ? { approvalOutcome: 'owner_released', approvalDecidedAt: new Date() }
                    : {}),
            },
        });

        // Only the winning cancellation restores inventory. Legacy bookings have
        // no marker, so their manually maintained overrides are left untouched.
        const overrideDates = parseInventoryOverrideDates(booking.inventoryOverrideDates);
        if (updated.count === 1 && overrideDates.length) {
            const room = await tx.manualRoom.findUnique({
                where: { hotelId_name: { hotelId, name: booking.roomName } },
                select: { id: true },
            });
            if (room) {
                await tx.manualOverride.updateMany({
                    where: {
                        roomId: room.id,
                        date: { in: overrideDates },
                        availableUnits: { not: null },
                    },
                    data: { availableUnits: { increment: 1 } },
                });
            }
        }
        return updated;
    }, { maxWait: 5000, timeout: 15000 }));
    if (result.count !== 1) {
        const fresh = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null);
        return { ok: true, code: 'already_cancelled', status: fresh?.status || booking.status, booking: fresh || booking };
    }

    const cancelled = {
        ...booking,
        status: 'cancelled',
        ownerReviewStatus: 'cancelled',
        ownerReviewedAt: new Date(),
        ownerReviewNextReminderAt: null,
    };
    await voidBookingHold(cancelled);
    sendBookingCancelledEmail(cancelled, reason).catch(() => {});
    console.log(`🚫 [cancel] booking=${booking.id} hotel=${hotelId} was=${booking.status} reason=${reason || 'none'}`);

    return { ok: true, code: 'cancelled', status: 'cancelled', booking: cancelled };
}

async function buildBookingAvailabilityCorrection(booking) {
    if (!booking?.hotelId || !booking?.roomName) return null;
    const room = await prisma.manualRoom.findUnique({
        where: { hotelId_name: { hotelId: booking.hotelId, name: booking.roomName } },
        select: { totalUnits: true },
    }).catch(() => null);
    if (!room) return null;
    return {
        roomName: booking.roomName,
        checkinDate: booking.checkinDate,
        checkoutDate: booking.checkoutDate,
        totalUnits: Math.max(1, parseInt(room.totalUnits, 10) || 1),
    };
}

async function runBookingReviewReminderSweep() {
    if (!prisma.booking) return { sent: 0 };
    const now = new Date();
    const due = await prisma.booking.findMany({
        where: {
            ownerReviewStatus: 'unreviewed',
            ownerReviewNextReminderAt: { lte: now },
            ownerReviewReminderCount: { lt: BOOKING_REVIEW_MAX_REMINDERS },
            status: ACTIVE_BOOKING_STATUS_FILTER,
        },
        orderBy: { ownerReviewNextReminderAt: 'asc' },
        take: 100,
    }).catch((e) => {
        console.error('booking review reminder query:', e.message);
        return [];
    });
    const hotelIds = [...new Set(due.map((booking) => booking.hotelId).filter(Boolean))];
    const hotelReminderSettings = hotelIds.length
        ? await prisma.hotelConfig.findMany({
            where: { id: { in: hotelIds } },
            select: { id: true, bookingReviewReminderMinutes: true },
        }).catch(() => [])
        : [];
    const reminderMinutesByHotelId = new Map(hotelReminderSettings.map((hotel) => [
        hotel.id,
        hotel.bookingReviewReminderMinutes,
    ]));

    let sent = 0;
    for (const booking of due) {
        const intervalMinutes = resolveBookingReviewReminderMinutes(
            reminderMinutesByHotelId.get(booking.hotelId)
        );
        if (intervalMinutes <= 0) {
            await prisma.booking.updateMany({
                where: { id: booking.id, ownerReviewStatus: 'unreviewed' },
                data: { ownerReviewNextReminderAt: null },
            }).catch(() => {});
            continue;
        }

        const reminderNumber = Math.min(
            BOOKING_REVIEW_MAX_REMINDERS,
            Math.max(0, booking.ownerReviewReminderCount || 0) + 1
        );
        const nextReminder = reminderNumber >= BOOKING_REVIEW_MAX_REMINDERS
            ? null
            : new Date(now.getTime() + intervalMinutes * 60 * 1000);
        const claimed = await prisma.booking.updateMany({
            where: {
                id: booking.id,
                ownerReviewStatus: 'unreviewed',
                ownerReviewNextReminderAt: { lte: now },
                ownerReviewReminderCount: booking.ownerReviewReminderCount || 0,
            },
            data: {
                ownerReviewReminderCount: reminderNumber,
                ownerReviewNextReminderAt: nextReminder,
            },
        }).catch(() => ({ count: 0 }));
        if (claimed.count !== 1) continue;

        const delivered = await sendBookingReviewPush(booking, { reminderNumber }).catch(() => 0);
        if (delivered > 0) sent += 1;
    }
    if (sent) console.log(`🔔 [booking-review] sent ${sent} reminder(s)`);
    return { sent };
}

app.get('/api/booking-review/peek', async (req, res) => {
    try {
        const claim = verifyBookingReviewToken(String(req.query?.token || '').trim());
        if (!claim) return res.status(401).json({ success: false, message: 'This booking link has expired.' });
        const booking = await prisma.booking.findUnique({ where: { id: claim.bookingId } }).catch(() => null);
        if (!booking || booking.hotelId !== claim.hotelId) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        res.json({ success: true, data: await bookingReviewPublicData(booking) });
    } catch (e) {
        console.error('booking-review/peek:', e.message);
        res.status(500).json({ success: false, message: 'Could not load that booking.' });
    }
});

app.post('/api/booking-review/act', async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        const action = String(req.body?.action || '').trim().toLowerCase();
        if (!['available', 'cancel'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action must be available or cancel.' });
        }
        const claim = verifyBookingReviewToken(token);
        if (!claim) return res.status(401).json({ success: false, message: 'This booking link has expired.' });
        const booking = await prisma.booking.findUnique({ where: { id: claim.bookingId } }).catch(() => null);
        if (!booking || booking.hotelId !== claim.hotelId) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (action === 'available') {
            if (!isDeadBookingStatus(booking.status)) {
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: {
                        ownerReviewStatus: 'available',
                        ownerReviewedAt: new Date(),
                        ownerReviewNextReminderAt: null,
                    },
                });
            }
            return res.json({
                success: true,
                status: isDeadBookingStatus(booking.status) ? booking.status : 'confirmed',
                reviewStatus: isDeadBookingStatus(booking.status) ? 'cancelled' : 'available',
            });
        }

        const outcome = await cancelBookingByOwner(
            booking.id,
            booking.hotelId,
            String(req.body?.reason || 'Room was already taken')
        );
        if (!outcome.ok) return res.status(404).json({ success: false, message: 'Booking not found.' });
        res.json({
            success: true,
            status: outcome.status,
            alreadyCancelled: outcome.code === 'already_cancelled',
            calendarCorrection: await buildBookingAvailabilityCorrection(outcome.booking),
        });
    } catch (e) {
        console.error('booking-review/act:', e.message);
        res.status(500).json({ success: false, message: 'Could not apply that decision.' });
    }
});

app.post('/api/booking-review/block-dates', async (req, res) => {
    try {
        const claim = verifyBookingReviewToken(String(req.body?.token || '').trim());
        if (!claim) return res.status(401).json({ success: false, message: 'This booking link has expired.' });
        const booking = await prisma.booking.findUnique({ where: { id: claim.bookingId } }).catch(() => null);
        if (!booking || booking.hotelId !== claim.hotelId) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (!isDeadBookingStatus(booking.status)) {
            return res.status(409).json({ success: false, message: 'Cancel the booking before changing these dates.' });
        }
        const room = await prisma.manualRoom.findUnique({
            where: { hotelId_name: { hotelId: booking.hotelId, name: booking.roomName } },
        }).catch(() => null);
        if (!room) return res.status(400).json({ success: false, message: 'Room type not found.' });

        const availableUnits = Math.min(
            Math.max(0, parseInt(req.body?.availableUnits, 10) || 0),
            Math.max(0, room.totalUnits)
        );
        const dates = manualBookingStayDates(booking.checkinDate, booking.checkoutDate);
        await prisma.$transaction(dates.map((date) => prisma.manualOverride.upsert({
            where: { roomId_date: { roomId: room.id, date } },
            update: { availableUnits, closed: availableUnits === 0 },
            create: { roomId: room.id, date, availableUnits, closed: availableUnits === 0 },
        })));
        maybeNotifyRoomSoldOutToday(booking.hotelId, booking.roomName).catch(() => {});
        res.json({ success: true, affectedDays: dates.length, availableUnits });
    } catch (e) {
        console.error('booking-review/block-dates:', e.message);
        res.status(500).json({ success: false, message: 'Could not update those dates.' });
    }
});

app.get('/api/crm/bookings/:id/review-token', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const booking = await prisma.booking.findFirst({
            where: { id: String(req.params.id || ''), hotelId },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
        const token = signBookingReviewToken({ bookingId: booking.id, hotelId });
        res.json({ success: true, token, data: await bookingReviewPublicData(booking) });
    } catch (e) {
        console.error('booking review token:', e.message);
        res.status(500).json({ success: false, message: 'Could not open that booking.' });
    }
});

app.post('/api/crm/bookings/cancel', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const id = String(req.body?.id || '').trim();
        if (!id) return res.status(400).json({ success: false, message: 'Booking id is required.' });

        const outcome = await cancelBookingByOwner(id, hotelId, req.body?.reason);
        if (!outcome.ok) return res.status(404).json({ success: false, message: 'Booking not found.' });

        res.json({
            success: true,
            cancelled: outcome.code === 'cancelled',
            alreadyCancelled: outcome.code === 'already_cancelled',
            status: outcome.status,
            calendarCorrection: await buildBookingAvailabilityCorrection(outcome.booking),
        });
    } catch (e) {
        console.error('crm/bookings/cancel:', e.message);
        res.status(500).json({ success: false, message: 'Could not cancel that booking.' });
    }
});

frontDeskAssistant = createFrontDeskAssistant({
    prisma,
    withRetry,
    normalizeIsoDate,
    enumerateDatesInclusive,
    manualBookingStayDates,
    cancelBookingByOwner,
    applyBookingApprovalDecision,
    maybeNotifyRoomSoldOutToday,
    reportTimeZone: REPORT_TIME_ZONE,
});
frontDeskAssistant.registerRoutes(app, { crmAuth, requireScopedHotelId });

// ── OVERSELL CONFLICTS ─────────────────────────────────────────────────
// A double-booking shows up in the data as a room-night with more live bookings
// than it has units. That happens when a walk-in is recorded after an online
// booking already confirmed, and it's the signal worth putting in front of the
// owner — far more actionable than a reminder about a booking that looks fine.

async function findOversellConflicts(hotelId, { days = 180 } = {}) {
    if (!prisma.manualRoom) return [];

    const todayIso = getReportingTodayIso();
    const horizonIso = addDaysToIso(todayIso, days);
    const windowStart = new Date(`${todayIso}T00:00:00.000Z`);
    const windowEnd = new Date(`${horizonIso}T00:00:00.000Z`);

    // Deliberately not swallowing query errors here: an empty result reads as
    // "no double-bookings", so a silent failure would hide the exact problem
    // this scan exists to surface.
    const [rooms, bookings] = await Promise.all([
        withRetry(() => prisma.manualRoom.findMany({
            where: { hotelId },
            select: {
                name: true,
                totalUnits: true,
                // A room closed for a night it still has bookings on is the other
                // way a clash shows up: owners often mark a room closed when a
                // walk-in takes it instead of writing a booking for them.
                overrides: {
                    where: { date: { gte: todayIso, lt: horizonIso }, closed: true },
                    select: { date: true },
                },
            },
        })),
        withRetry(() => prisma.booking.findMany({
            where: {
                hotelId,
                status: ACTIVE_BOOKING_STATUS_FILTER,
                checkinDate: { lt: windowEnd },
                checkoutDate: { gt: windowStart },
            },
            select: {
                id: true, roomName: true, status: true, bookingType: true,
                checkinDate: true, checkoutDate: true, createdAt: true,
                guestFirstName: true, guestLastName: true, guestPhone: true,
                grandTotal: true, ourReservationCode: true, pmsConfirmationCode: true,
            },
        })),
    ]);
    if (!rooms.length || !bookings.length) return [];

    const unitsByRoom = new Map(rooms.map(r => [
        String(r.name || '').trim(),
        Math.max(0, parseInt(r.totalUnits, 10) || 0),
    ]));
    const closedByRoom = new Map(rooms.map(r => [
        String(r.name || '').trim(),
        new Set((r.overrides || []).map(o => o.date)),
    ]));

    // roomName|date -> booking list
    const occupancy = new Map();
    for (const b of bookings) {
        const roomName = String(b.roomName || '').trim();
        if (!unitsByRoom.has(roomName)) continue;
        const startIso = normalizeIsoDate(b.checkinDate);
        const endIso = normalizeIsoDate(b.checkoutDate);
        if (!startIso || !endIso || endIso <= startIso) continue;
        for (const day of enumerateDatesInclusive(startIso, addDaysToIso(endIso, -1), 400)) {
            if (day < todayIso || day >= horizonIso) continue;
            const key = `${roomName}|${day}`;
            if (!occupancy.has(key)) occupancy.set(key, []);
            occupancy.get(key).push(b);
        }
    }

    const conflicts = [];
    for (const [key, involved] of occupancy) {
        const [roomName, date] = key.split('|');
        const isClosed = closedByRoom.get(roomName)?.has(date) === true;
        // A closed room has no capacity that night, so any live booking on it
        // conflicts. Otherwise it's a straight count against the unit total.
        const capacity = isClosed ? 0 : (unitsByRoom.get(roomName) || 0);
        if (involved.length <= capacity) continue;
        conflicts.push({
            roomName,
            date,
            units: capacity,
            closed: isClosed,
            booked: involved.length,
            oversoldBy: involved.length - capacity,
            bookings: involved
                // Newest first: the most recently created booking is usually the
                // walk-in that caused the clash, and the online one is the guest
                // who still needs a room.
                .slice()
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(b => ({
                    id: b.id,
                    status: b.status,
                    bookingType: b.bookingType,
                    guestName: [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ') || 'Guest',
                    guestPhone: b.guestPhone,
                    checkinDate: b.checkinDate,
                    checkoutDate: b.checkoutDate,
                    grandTotal: b.grandTotal,
                    createdAt: b.createdAt,
                    reservationCode: b.pmsConfirmationCode || b.ourReservationCode,
                })),
        });
    }

    conflicts.sort((a, b) => a.date.localeCompare(b.date) || a.roomName.localeCompare(b.roomName));
    return conflicts;
}

app.get('/api/crm/conflicts', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const conflicts = await findOversellConflicts(hotelId);
        res.json({ success: true, conflicts });
    } catch (e) {
        console.error('crm/conflicts:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

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
    const active = bookings.filter((b) => !isDeadBookingStatus(b.status));
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
        icon: '/apple-touch-icon.png',
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
        icon: '/apple-touch-icon.png',
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
    const active = bookings.filter((b) => !isDeadBookingStatus(b.status));
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
        icon: '/apple-touch-icon.png',
    }, { TTL: 6 * 60 * 60 }, 'eveningRecap');
}

// Run a per-hotel job across every hotel that has at least one subscriber.
async function forEachSubscribedHotel(label, fn) {
    if (!ownerPushConfigured()) return;
    const [webSubs, nativeDevices] = await Promise.all([
        VAPID_PRIVATE
            ? prisma.pushSubscription.findMany({
                where: { NOT: { source: 'guest' } },
                select: { hotelId: true },
            })
            : Promise.resolve([]),
        APNS_CONFIGURED
            ? prisma.nativePushDevice.findMany({
                where: { active: true },
                select: { hotelId: true },
            })
            : Promise.resolve([]),
    ]);
    const hotelIds = [...new Set(
        [...webSubs, ...nativeDevices].map((subscription) => subscription.hotelId).filter(Boolean)
    )];
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
if (process.env.ENABLE_SCHEDULED_PUSH_DIGESTS !== 'false') {
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
}

// Support for old notifyPurchase is removed to prevent double notifications


// Notify about payment declined leads (URGENT - call within 60 seconds!)
async function notifyPaymentDeclined(hotelId, guestInfo, bookingDetails, errorMessage) {
    if (!ownerPushConfigured() || !hotelId) return;
    try {
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

        await sendPushToHotel(hotelId, {
            title: '🔴 URGENT: Payment Declined',
            body: `${guestName} • ${phone}\n${roomName} • ${total}\n${declineReason} - CALL NOW!`,
            icon: '/apple-touch-icon.png',
            tag: 'payment-declined',
            requireInteraction: true,
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
        }, { TTL: 300, urgency: 'high' }, 'paymentDeclined');
        
        console.log(`🔴 Urgent payment declined notification sent for ${guestName}`);
    } catch (e) {
        console.error('notifyPaymentDeclined:', e.message);
    }
}

// /crm redirects to /frontdesk (crm.html removed)
app.get('/crm', (req, res) => {
    res.redirect(301, '/frontdesk');
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

const MARKETEL_ONBOARDING_EVENT_NAMES = [
    'LandingPageView',
    'AcquisitionAngle',
    'SetupStarted',
    'Step1Reached',
    'Step2Reached',
    'Step3Reached',
    'Step4Reached',
    'Step5Reached',
    'QualityAnswer',
    'Lead',
    'SetupCompleted',
    'FrontDeskOpened',
    'GoLiveClicked',
    'CheckoutStarted',
    'PaymentSucceeded',
    'PreviewReadyEmailSent',
    'ActivationEmailSending',
    'ActivationEmailSent',
    'SubscriptionStatusChanged',
    ...MARKETEL_VALUE_REVEAL_EVENTS,
    ...MARKETEL_JOURNEY_EVENT_NAMES,
];
const MARKETEL_PUBLIC_ONBOARDING_EVENTS = new Set([
    'LandingPageView',
    'SetupStarted',
    'Step1Reached',
    'Step2Reached',
    'Step3Reached',
    'Step4Reached',
    'Step5Reached',
    'QualityAnswer',
    'Lead',
]);

// Onboarding funnel tracking (landing page + setup wizard)
app.post('/api/funnel/onboarding', funnelOnboardingRateLimit, async (req, res) => {
    if (!funnelTrackingEnabled) return res.json({ success: true });
    try {
        const {
            eventName,
            referrer,
            contentName,
            eventId,
            setupToken,
            journeyVisitorId,
            journeySessionId,
            journeySequence,
            journeyEventId,
            journeyOccurredAt: clientOccurredAt,
            journeySurface,
            journeyPagePath,
        } = req.body || {};
        if (!MARKETEL_PUBLIC_ONBOARDING_EVENTS.has(eventName)) {
            return res.status(400).json({ success: false, message: 'Invalid onboarding event' });
        }

        let trackedEmail = null;
        let trackedHotelId = 'marketel-onboarding';
        let setupHotel = null;
        if (eventName !== 'LandingPageView' && !setupToken) {
            return res.status(400).json({ success: false, message: 'Setup token required' });
        }
        if (setupToken) {
            setupHotel = await prisma.hotelConfig.findUnique({
                where: { setupToken },
                select: { id: true, ownerEmail: true },
            });
            if (!setupHotel) {
                return res.status(404).json({ success: false, message: 'Invalid setup token' });
            }
            trackedHotelId = setupHotel.id;
            trackedEmail = setupHotel.ownerEmail || null;
        }

        if (eventName === 'QualityAnswer') {
            const allowedAnswers = new Set(['google_website', 'social_ads', 'ota_marketplaces', 'referrals_offline']);
            if (!setupHotel || !allowedAnswers.has(contentName)) {
                return res.status(400).json({ success: false, message: 'Invalid quality answer' });
            }
        }

        if (eventName === 'Lead') {
            const angleEvent = await prisma.funnelEvent.findFirst({
                where: { hotelId: trackedHotelId, eventName: 'AcquisitionAngle' },
                select: { contentName: true },
                orderBy: { createdAt: 'desc' },
            });
            const acquisitionAngle = String(angleEvent?.contentName || 'direct').trim();
            const qualifiedAnswers = new Set(['google_website', 'social_ads']);
            // Marketplace traffic is qualified only for the guest-app angle:
            // the product can turn those stays into future direct relationships.
            if (acquisitionAngle === 'guest_app') qualifiedAnswers.add('ota_marketplaces');
            if (!setupHotel || !qualifiedAnswers.has(contentName)) {
                return res.status(400).json({ success: false, message: 'Invalid qualified lead' });
            }

            // A setup can qualify only once. The browser also uses a stable
            // event_id, while this protects the database and CAPI from replays.
            const existingLead = await prisma.funnelEvent.findFirst({
                where: {
                    eventName: 'Lead',
                    OR: [
                        { hotelId: trackedHotelId },
                        ...(trackedEmail ? [{
                            guestEmail: trackedEmail,
                            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                        }] : []),
                    ],
                },
                select: { id: true },
            });
            if (existingLead) {
                return res.json({ success: true, duplicate: true });
            }
        }

        const linkedExternalId = sanitizeJourneyIdentifier(journeyVisitorId, 'mjv_');
        const linkedSessionId = sanitizeJourneyIdentifier(journeySessionId, 'mjs_');
        const linkedSequence = linkedSessionId
            ? Math.max(1, Math.min(1000000, parseInt(journeySequence, 10) || 1))
            : null;
        const cleanEventId = String(eventId || sanitizeJourneyIdentifier(journeyEventId, 'journey-link.') || '').trim().slice(0, 160) || null;
        const cleanContentName = String(contentName || referrer || '').trim().slice(0, 500) || null;
        await prisma.funnelEvent.create({
            data: {
                hotelId: trackedHotelId,
                eventName,
                eventId: cleanEventId,
                occurredAt: linkedSessionId ? journeyOccurredAt(clientOccurredAt) : null,
                sessionId: linkedSessionId,
                sequence: linkedSequence,
                surface: linkedSessionId ? redactJourneyString(journeySurface || 'unknown', 40) : null,
                pagePath: linkedSessionId ? sanitizeJourneyPath(journeyPagePath) : null,
                metadata: linkedSessionId ? { linkedJourney: true } : undefined,
                guestEmail: trackedEmail,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.socket?.remoteAddress || null,
                contentName: cleanContentName,
                externalId: linkedExternalId,
            },
        });

        // Match the browser's standard Lead event and event_id. Meta uses the
        // pair to deduplicate Pixel and Conversions API copies of the same lead.
        if (eventName === 'Lead') {
            const { fbp: leadFbp, fbc: leadFbc } = getMetaCookies(req);
            sendMarketelCAPI('Lead', {
                email: trackedEmail || '',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                sourceUrl: req.headers.referer || '',
                fbp: leadFbp,
                fbc: leadFbc,
                eventId: cleanEventId || undefined,
                contentName: cleanContentName || undefined,
            });
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Onboarding funnel event error:', e.message);
        res.json({ success: true }); // Don't fail silently
    }
});

// Funnel dashboard API (admin only; contains contact and device data)
app.get('/api/funnel', adminAuth, async (req, res) => {
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
        if (source === 'onboarding') {
            where.eventName = { in: MARKETEL_ONBOARDING_EVENT_NAMES };
        } else if (source === 'bookings') {
            where.eventName = { notIn: MARKETEL_ONBOARDING_EVENT_NAMES };
        }

        const requestedLimit = parseInt(req.query.limit, 10);
        const eventLimit = Number.isFinite(requestedLimit)
            ? Math.max(100, Math.min(5000, requestedLimit))
            : (source === 'onboarding' ? 2000 : 500);
        const events = await withRetry(() => prisma.funnelEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: eventLimit,
        }));

        const counts = {};
        events.forEach(e => { counts[e.eventName] = (counts[e.eventName] || 0) + 1; });

        const recent = events.map(e => ({
            event_name: e.eventName,
            timestamp: (e.occurredAt || e.createdAt).getTime(),
            received_at: e.createdAt.getTime(),
            event_id: e.eventId,
            hotel_id: e.hotelId,
            session_id: e.sessionId,
            sequence: e.sequence,
            surface: e.surface,
            page_path: e.pagePath,
            duration_ms: e.durationMs,
            metadata: e.metadata,
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

// Analysis-ready, privacy-conscious export. It preserves exact event ordering
// and the owner journey context an LLM needs, while omitting emails, phone
// numbers, IP addresses and form contents from the downloadable file.
app.get('/api/funnel/journey-export', adminAuth, async (req, res) => {
    try {
        let since, until;
        if (req.query.from && req.query.to) {
            since = new Date(req.query.from + 'T00:00:00.000Z');
            until = new Date(req.query.to + 'T23:59:59.999Z');
            if (isNaN(since) || isNaN(until)) {
                return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
            }
        } else {
            const daysBack = Math.max(1, Math.min(180, parseInt(req.query.days, 10) || 30));
            until = new Date();
            since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        }

        const where = {
            createdAt: { gte: since, lte: until },
            eventName: { in: MARKETEL_ONBOARDING_EVENT_NAMES },
        };
        const [totalRows, rows] = await Promise.all([
            prisma.funnelEvent.count({ where }),
            prisma.funnelEvent.findMany({
                where,
                orderBy: [{ createdAt: 'asc' }, { sequence: 'asc' }],
                take: 10000,
            }),
        ]);

        const counts = {};
        const propertyMap = new Map();
        const visitorMap = new Map();
        const unlinkedEvents = [];
        const normalized = rows.map((row) => {
            counts[row.eventName] = (counts[row.eventName] || 0) + 1;
            const timestamp = (row.occurredAt || row.createdAt).toISOString();
            const event = {
                event: row.eventName,
                timestamp,
                receivedAt: row.createdAt.toISOString(),
                eventId: row.eventId,
                hotelId: row.hotelId,
                visitorId: row.externalId,
                sessionId: row.sessionId,
                sequence: row.sequence,
                surface: row.surface,
                pagePath: row.pagePath,
                durationMs: row.durationMs,
                context: row.metadata || {},
                content: row.contentName,
                value: row.value,
                currency: row.currency,
            };

            const property = propertyMap.get(row.hotelId) || {
                hotelId: row.hotelId,
                firstSeenAt: timestamp,
                lastSeenAt: timestamp,
                eventCount: 0,
                sessions: new Set(),
                milestones: {},
            };
            property.lastSeenAt = timestamp;
            property.eventCount += 1;
            if (row.sessionId) property.sessions.add(row.sessionId);
            if (['Lead', 'SetupCompleted', 'ActivationOfferViewed', 'ActivationCtaClicked', 'GoLiveClicked', 'CheckoutStarted', 'PaymentSucceeded'].includes(row.eventName)) {
                property.milestones[row.eventName] = timestamp;
            }
            propertyMap.set(row.hotelId, property);
            return event;
        });

        normalized.forEach((event) => {
            if (!event.visitorId || !event.sessionId) {
                unlinkedEvents.push(event);
                return;
            }
            const visitor = visitorMap.get(event.visitorId) || { visitorId: event.visitorId, sessions: new Map() };
            const session = visitor.sessions.get(event.sessionId) || {
                sessionId: event.sessionId,
                startedAt: event.timestamp,
                endedAt: event.timestamp,
                durationMs: 0,
                hotelIds: new Set(),
                surfaces: new Set(),
                attribution: null,
                device: null,
                outcome: 'browsed',
                events: [],
            };
            session.startedAt = session.events.length ? session.startedAt : event.timestamp;
            session.endedAt = event.timestamp;
            if (event.hotelId) session.hotelIds.add(event.hotelId);
            if (event.surface) session.surfaces.add(event.surface);
            const context = event.context || {};
            if (!session.attribution && (context.firstTouch || context.latestTouch)) {
                session.attribution = { firstTouch: context.firstTouch || {}, latestTouch: context.latestTouch || {} };
            }
            if (!session.device && (context.viewport || context.displayMode || context.connection)) {
                session.device = {
                    viewport: context.viewport || null,
                    screen: context.screen || null,
                    displayMode: context.displayMode || null,
                    language: context.language || null,
                    timezone: context.timezone || null,
                    connection: context.connection || null,
                };
            }
            const outcomeRank = {
                browsed: 0,
                'qualified-lead': 1,
                'setup-completed': 2,
                'offer-viewed': 3,
                'checkout-requested': 4,
                'checkout-started': 5,
                paid: 6,
            };
            let nextOutcome = session.outcome;
            if (event.event === 'Lead' || (event.event === 'JourneyQualitySelected' && context.qualified)) nextOutcome = 'qualified-lead';
            if (event.event === 'SetupCompleted' || event.event === 'JourneyPreviewReady') nextOutcome = 'setup-completed';
            if (event.event === 'ActivationOfferViewed' || (event.event === 'JourneyRevealStageViewed' && context.stageName === 'activation')) nextOutcome = 'offer-viewed';
            if (event.event === 'JourneyCheckoutRequested' || event.event === 'ActivationCtaClicked' || event.event === 'GoLiveClicked') nextOutcome = 'checkout-requested';
            if (event.event === 'CheckoutStarted' || event.event === 'JourneyCheckoutRedirected') nextOutcome = 'checkout-started';
            if (event.event === 'PaymentSucceeded') nextOutcome = 'paid';
            if ((outcomeRank[nextOutcome] || 0) > (outcomeRank[session.outcome] || 0)) session.outcome = nextOutcome;
            session.events.push(event);
            visitor.sessions.set(event.sessionId, session);
            visitorMap.set(event.visitorId, visitor);
        });

        const journeys = Array.from(visitorMap.values()).map((visitor) => ({
            visitorId: visitor.visitorId,
            sessions: Array.from(visitor.sessions.values()).map((session) => {
                session.events.sort((a, b) => {
                    const aSequence = Number(a.sequence) || Number.MAX_SAFE_INTEGER;
                    const bSequence = Number(b.sequence) || Number.MAX_SAFE_INTEGER;
                    return aSequence - bSequence || new Date(a.timestamp) - new Date(b.timestamp);
                });
                const startedAt = session.events[0]?.timestamp || session.startedAt;
                const endedAt = session.events[session.events.length - 1]?.timestamp || session.endedAt;
                const started = new Date(startedAt).getTime();
                const ended = new Date(endedAt).getTime();
                return {
                    ...session,
                    startedAt,
                    endedAt,
                    durationMs: Math.max(0, ended - started),
                    hotelIds: Array.from(session.hotelIds),
                    surfaces: Array.from(session.surfaces),
                };
            }),
        }));

        const properties = Array.from(propertyMap.values()).map((property) => ({
            ...property,
            sessionCount: property.sessions.size,
            sessions: undefined,
        }));
        const output = {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            range: { from: since.toISOString(), to: until.toISOString() },
            privacy: {
                excluded: ['passwords and PINs', 'card data', 'raw form values', 'emails', 'phone numbers', 'IP addresses', 'message contents', 'uploaded image contents'],
                identity: 'Anonymous visitor and per-tab session IDs are used to join events.',
            },
            interpretation: {
                conversionEvents: ['Lead', 'SetupCompleted', 'ActivationOfferViewed', 'ActivationCtaClicked', 'GoLiveClicked', 'CheckoutStarted', 'PaymentSucceeded'],
                journeyEvents: 'Journey* rows are high-resolution behavior. Conversion rows remain the authoritative business milestones.',
                duration: 'JourneyRevealStageCompleted.durationMs is time spent on a reveal stage. JourneyPageExited.durationMs is page residence time.',
                ordering: 'Within a session, sort by sequence first and timestamp second.',
                caution: 'Do not infer intent from a single click. Compare repeated drop-off patterns across qualified sessions.',
            },
            totals: {
                events: rows.length,
                availableEvents: totalRows,
                truncated: totalRows > rows.length,
                visitors: journeys.length,
                sessions: journeys.reduce((sum, journey) => sum + journey.sessions.length, 0),
                properties: properties.filter((property) => property.hotelId !== 'marketel-onboarding').length,
            },
            eventCounts: counts,
            properties,
            journeys,
            unlinkedMilestones: unlinkedEvents,
        };
        if (req.query.download === '1') {
            const date = new Date().toISOString().slice(0, 10);
            res.set('Content-Disposition', `attachment; filename="marketel-journeys-${date}.json"`);
        }
        res.json(output);
    } catch (error) {
        console.error('Journey export failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not build journey export.' });
    }
});

// Delete a funnel event
app.delete('/api/funnel/events', adminAuth, async (req, res) => {
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
app.get('/api/funnel/tracking', adminAuth, (req, res) => {
    res.json({ enabled: funnelTrackingEnabled });
});

app.post('/api/funnel/tracking', adminAuth, (req, res) => {
    funnelTrackingEnabled = req.body.enabled !== false;
    console.log(`Funnel tracking ${funnelTrackingEnabled ? 'enabled' : 'paused'}`);
    res.json({ success: true, enabled: funnelTrackingEnabled });
});

// Meta Ads insights for funnel dashboard (admin only)
app.get('/api/meta-insights', adminAuth, async (req, res) => {
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

// Serve the dashboard shell; its data/control APIs require ADMIN_TOKEN.
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
app.get('/app-support', (req, res) => {
    res.sendFile(path.join(__dirname, 'app-support.html'));
});

// Root serves landing page too (for mktel.co)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// ── SELF-SERVE SETUP ──────────────────────────────────────────

// Start free setup — create hotel and redirect to wizard (no payment needed)
app.post('/api/setup/start', setupStartRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        const requestedAngle = String(req.body?.acquisitionAngle || 'direct').trim();
        const acquisitionAngle = new Set(['direct', 'guest_app', 'assistant']).has(requestedAngle)
            ? requestedAngle
            : 'direct';
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

        if (funnelTrackingEnabled) {
            await prisma.funnelEvent.create({
                data: {
                    hotelId: hotelSlug,
                    eventName: 'AcquisitionAngle',
                    eventId: `marketel-angle.${hotelSlug}`,
                    guestEmail: email.trim().toLowerCase(),
                    contentName: acquisitionAngle,
                    userAgent: req.headers['user-agent'] || null,
                    ipAddress: req.ip || req.socket?.remoteAddress || null,
                },
            }).catch(() => {});
        }

        console.log('✅ Free setup started:', { hotelId: hotelSlug, acquisitionAngle });
        res.json({
            success: true,
            setupUrl: `/setup/${setupToken}?angle=${encodeURIComponent(acquisitionAngle)}`,
            token: setupToken,
        });
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

        const room = await saveRoomCatalogEntry({
            hotelId: hotel.id,
            roomId: id,
            name,
            description,
            amenities,
            maxOccupancy,
            totalUnits,
        });

        res.json({ success: true, room: { id: room.id, name: room.name } });
    } catch (e) {
        console.error('Setup room save error:', e.message);
        const status = e.code === 'ROOM_NOT_FOUND' ? 404 : e.code === 'ROOM_NAME_CONFLICT' ? 409 : 500;
        res.status(status).json({ error: e.code?.startsWith('ROOM_') ? e.message : 'Failed to save room' });
    }
});

// Delete room
app.delete('/api/setup/:token/rooms/:roomId', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        await deleteRoomCatalogEntry({ hotelId: hotel.id, roomId: req.params.roomId });
        res.json({ success: true });
    } catch (e) {
        console.error('Setup room delete error:', e.message);
        const status = e.code === 'ROOM_HAS_BOOKINGS' ? 409 : 500;
        res.status(status).json({ error: e.code?.startsWith('ROOM_') ? e.message : 'Failed to delete' });
    }
});

// Upload room image
const multer = require('multer');
const { optimizeRoomImageBuffer } = require('./lib/optimizeRoomImage');
const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

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
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        const ext = (file.originalname || '').toLowerCase();
        const ok = allowed.includes(file.mimetype) || /\.(jpe?g|png|webp)$/i.test(ext);
        cb(null, ok);
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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const ext = (file.originalname || '').toLowerCase();
    const ok = allowed.includes(file.mimetype) || /\.(jpe?g|png|webp)$/i.test(ext);
    cb(null, ok);
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

async function saveOptimizedRoomImage(req, roomId) {
    if (!req.file) return null;
    let inputBuffer = req.file.buffer;
    if (!inputBuffer && req.file.path) {
        inputBuffer = fs.readFileSync(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    }
    if (!inputBuffer) return null;
    const optimized = await optimizeRoomImageBuffer(inputBuffer, req.file.mimetype);
    let url;
    if (R2_PUBLIC_URL) {
        const key = `${req.hotelId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}${optimized.ext}`;
        url = await uploadToR2(optimized.buffer, key, optimized.contentType);
    } else {
        const dir = path.join(__dirname, 'public', 'uploads', req.hotelId || 'unknown');
        fs.mkdirSync(dir, { recursive: true });
        const fname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${optimized.ext}`;
        fs.writeFileSync(path.join(dir, fname), optimized.buffer);
        url = `/uploads/${req.hotelId}/${fname}`;
    }
    const count = await prisma.roomImage.count({ where: { roomId } });
    const image = await prisma.roomImage.create({
        data: { roomId, url, sortOrder: count },
    });
    return image;
}

app.post('/api/setup/:token/rooms/:roomId/images', async (req, res, next) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        const room = await prisma.room.findFirst({
            where: { id: req.params.roomId, hotelId: hotel.id },
            select: { id: true },
        });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        req.hotelId = hotel.id;
        next();
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
}, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        const image = await saveOptimizedRoomImage(req, req.params.roomId);
        if (!image) return res.status(400).json({ error: 'No image uploaded' });
        const returnUrl = R2_PUBLIC_URL ? image.url : `${req.protocol}://${req.get('host')}${image.url}`;
        res.json({ success: true, image: { id: image.id, url: returnUrl } });
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
        const image = await prisma.roomImage.findFirst({
            where: { id: req.params.imageId, roomId: req.params.roomId, room: { hotelId: hotel.id } },
            select: { id: true },
        });
        if (!image) return res.status(404).json({ error: 'Image not found' });
        await prisma.roomImage.delete({ where: { id: image.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Marketel subscription (CRM go-live + setup checkout) — separate Stripe account from guest bookings
const marketelStripe = process.env.STRIPE_MARKETEL_SECRET_KEY
    ? require('stripe')(process.env.STRIPE_MARKETEL_SECRET_KEY)
    : null;
const MARKETEL_SUBSCRIPTION_PRODUCT_ID = process.env.STRIPE_MARKETEL_PRODUCT_ID || 'prod_Uls6PKBuIH3dFL';
const MARKETEL_MONTHLY_PRICE_USD = 199;
const MARKETEL_YEARLY_PRICE_USD = 1990;
const MARKETEL_BILLING_PLANS = Object.freeze({
    month: Object.freeze({
        interval: 'month',
        amountUsd: MARKETEL_MONTHLY_PRICE_USD,
        contentName: 'marketel-monthly',
        configuredPriceId: () => process.env.STRIPE_MARKETEL_PRICE_ID || '',
    }),
    year: Object.freeze({
        interval: 'year',
        amountUsd: MARKETEL_YEARLY_PRICE_USD,
        contentName: 'marketel-yearly',
        configuredPriceId: () => process.env.STRIPE_MARKETEL_YEARLY_PRICE_ID || '',
    }),
});
const MARKETEL_STRIPE_KEY_MODE = process.env.STRIPE_MARKETEL_SECRET_KEY?.startsWith('sk_live_')
    ? 'live'
    : process.env.STRIPE_MARKETEL_SECRET_KEY?.startsWith('sk_test_')
        ? 'test'
        : 'unknown';
const MARKETEL_ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
if (process.env.NODE_ENV === 'production' && MARKETEL_STRIPE_KEY_MODE !== 'live') {
    console.error('❌ Marketel checkout disabled: production requires STRIPE_MARKETEL_SECRET_KEY in live mode.');
}

function marketelSubscriptionHasAccess(status) {
    return MARKETEL_ACTIVE_SUBSCRIPTION_STATUSES.has(String(status || '').trim().toLowerCase());
}

function stripeObjectId(value) {
    if (!value) return '';
    return typeof value === 'string' ? value : String(value.id || '');
}

function stripePeriodEnd(subscription) {
    const raw = Number(subscription?.current_period_end || 0);
    return raw > 0 ? new Date(raw * 1000) : null;
}

function normalizeMarketelBillingInterval(value) {
    return String(value || '').trim().toLowerCase() === 'year' ? 'year' : 'month';
}

function marketelBillingPlan(value) {
    return MARKETEL_BILLING_PLANS[normalizeMarketelBillingInterval(value)];
}

function validateMarketelStripePrice(price, plan) {
    const amountUsd = (price?.unit_amount || 0) / 100;
    if (!price?.active) throw new Error(`Marketel ${plan.interval}ly subscription price is inactive`);
    if (price.currency !== 'usd') throw new Error(`Marketel ${plan.interval}ly subscription price must use USD`);
    if (price.recurring?.interval !== plan.interval || price.recurring?.interval_count !== 1) {
        throw new Error(`Marketel subscription price must recur ${plan.interval}ly`);
    }
    if (amountUsd !== plan.amountUsd) {
        throw new Error(`Marketel ${plan.interval}ly subscription price must be $${plan.amountUsd}/${plan.interval}`);
    }
    if (process.env.NODE_ENV === 'production' && (!price.livemode || MARKETEL_STRIPE_KEY_MODE !== 'live')) {
        throw new Error('Live Marketel Stripe billing is not configured');
    }
    return {
        id: price.id,
        productId: stripeObjectId(price.product),
        amountUsd,
        livemode: !!price.livemode,
        interval: plan.interval,
        contentName: plan.contentName,
        lineItem: { price: price.id, quantity: 1 },
        source: 'stripe-price',
    };
}

async function getMarketelSubscriptionPrice(billingInterval = 'month') {
    if (!marketelStripe) throw new Error('Payment not configured');
    const plan = marketelBillingPlan(billingInterval);
    if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_MARKETEL_WEBHOOK_SECRET) {
        throw new Error('Marketel Stripe webhook is not configured');
    }
    if (
        process.env.NODE_ENV === 'production'
        && !process.env.STRIPE_MARKETEL_PRICE_ID
        && !process.env.STRIPE_MARKETEL_PRODUCT_ID
    ) {
        throw new Error('Live Marketel Stripe price or product is not configured');
    }
    const configuredPriceId = plan.configuredPriceId();
    let price = null;
    if (configuredPriceId) {
        price = await marketelStripe.prices.retrieve(configuredPriceId);
    } else {
        let productId = MARKETEL_SUBSCRIPTION_PRODUCT_ID;
        if (plan.interval === 'month') {
            const product = await marketelStripe.products.retrieve(productId, {
                expand: ['default_price'],
            });
            const defaultPrice = product.default_price;
            if (defaultPrice && typeof defaultPrice !== 'string') {
                const defaultAmountUsd = (defaultPrice.unit_amount || 0) / 100;
                if (
                    defaultPrice.active
                    && defaultPrice.currency === 'usd'
                    && defaultPrice.recurring?.interval === plan.interval
                    && defaultPrice.recurring?.interval_count === 1
                    && defaultAmountUsd === plan.amountUsd
                ) {
                    price = defaultPrice;
                }
            }
        } else {
            // The configured monthly Price is the safest way to resolve the
            // correct test/live Product when an annual Price has not yet been
            // created in Stripe.
            const monthlyPrice = await getMarketelSubscriptionPrice('month');
            productId = monthlyPrice.productId || productId;
        }

        if (!price) {
            const prices = await marketelStripe.prices.list({
                product: productId,
                active: true,
                type: 'recurring',
                limit: 100,
            });
            price = prices.data.find((candidate) => (
                candidate.currency === 'usd'
                && candidate.recurring?.interval === plan.interval
                && candidate.recurring?.interval_count === 1
                && (candidate.unit_amount || 0) / 100 === plan.amountUsd
            )) || null;
        }

        // Stripe supports recurring price_data in Checkout. This keeps the
        // annual option deployable before a reusable annual Price ID is added;
        // once STRIPE_MARKETEL_YEARLY_PRICE_ID exists it is used automatically.
        if (!price && plan.interval === 'year') {
            if (!productId) throw new Error('Marketel Stripe product is not configured');
            if (process.env.NODE_ENV === 'production' && MARKETEL_STRIPE_KEY_MODE !== 'live') {
                throw new Error('Live Marketel Stripe billing is not configured');
            }
            return {
                id: null,
                productId,
                amountUsd: plan.amountUsd,
                livemode: MARKETEL_STRIPE_KEY_MODE === 'live',
                interval: plan.interval,
                contentName: plan.contentName,
                lineItem: {
                    price_data: {
                        currency: 'usd',
                        product: productId,
                        unit_amount: plan.amountUsd * 100,
                        recurring: { interval: plan.interval, interval_count: 1 },
                    },
                    quantity: 1,
                },
                source: 'inline-price',
            };
        }
    }

    if (!price) throw new Error(`No active ${plan.interval}ly subscription price for Marketel product`);
    return validateMarketelStripePrice(price, plan);
}

app.get('/api/admin/marketel-billing-status', adminAuth, async (_req, res) => {
    if (!marketelStripe) {
        return res.status(503).json({
            success: false,
            configured: false,
            keyMode: MARKETEL_STRIPE_KEY_MODE,
            message: 'STRIPE_MARKETEL_SECRET_KEY is not configured',
        });
    }
    try {
        const [monthlyPrice, yearlyPrice] = await Promise.all([
            getMarketelSubscriptionPrice('month'),
            getMarketelSubscriptionPrice('year'),
        ]);
        res.json({
            success: true,
            configured: true,
            keyMode: MARKETEL_STRIPE_KEY_MODE,
            webhookConfigured: !!process.env.STRIPE_MARKETEL_WEBHOOK_SECRET,
            price: monthlyPrice,
            prices: { month: monthlyPrice, year: yearlyPrice },
        });
    } catch (e) {
        res.status(503).json({
            success: false,
            configured: true,
            keyMode: MARKETEL_STRIPE_KEY_MODE,
            webhookConfigured: !!process.env.STRIPE_MARKETEL_WEBHOOK_SECRET,
            message: e.message,
        });
    }
});

app.post('/api/setup/:token/checkout', async (req, res) => {
    try {
        if (!marketelStripe) return res.status(503).json({ error: 'Payment not configured' });
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        if (hotel.subscribed) return res.status(409).json({ error: 'This property is already activated' });

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
        const billingInterval = normalizeMarketelBillingInterval(req.body?.billingInterval);
        const billing = await getMarketelSubscriptionPrice(billingInterval);

        const session = await marketelStripe.checkout.sessions.create({
            mode: 'subscription',
            client_reference_id: hotel.id,
            line_items: [billing.lineItem],
            ...(hotel.marketelStripeCustomerId
                ? { customer: hotel.marketelStripeCustomerId }
                : { customer_email: hotel.ownerEmail || undefined }),
            metadata: {
                product: 'hotel-onboarding',
                hotelId: hotel.id,
                setupToken: req.params.token,
                billingInterval,
                billingAmountUsd: String(billing.amountUsd),
            },
            subscription_data: {
                metadata: {
                    product: 'hotel-onboarding',
                    hotelId: hotel.id,
                    setupToken: req.params.token,
                    billingInterval,
                    billingAmountUsd: String(billing.amountUsd),
                },
            },
            success_url: `${baseUrl}/setup/${req.params.token}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/setup/${req.params.token}`,
        });

        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error('Checkout session error:', e.message);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});

async function assignUniqueDomainForHotel(hotel) {
    const existing = await prisma.hotelDomain.findFirst({
        where: { hotelId: hotel.id, isPrimary: true },
        orderBy: { createdAt: 'desc' }
    });
    if (existing) return existing.domain;

    const baseSlug = (hotel.name || 'hotel').toLowerCase().replace(/['\u2019]s\b/g, 's').replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '');
    let slug = baseSlug;
    let assignedDomain = slug + '.mktel.co';
    let counter = 1;

    while (true) {
        const taken = await prisma.hotelDomain.findUnique({ where: { domain: assignedDomain } });
        if (!taken) break;
        slug = baseSlug + counter;
        assignedDomain = slug + '.mktel.co';
        counter++;
    }

    try {
        await prisma.hotelDomain.create({ data: { hotelId: hotel.id, domain: assignedDomain, isPrimary: true } });
    } catch (e) { }
    return assignedDomain;
}

// Success page after payment — activate hotel and show confirmation
app.get('/setup/:token/success', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.redirect('/');
        const checkoutSessionId = String(req.query.session_id || '').trim();
        if (!checkoutSessionId || !marketelStripe) {
            return res.redirect(`/setup/${encodeURIComponent(req.params.token)}?payment=unverified`);
        }

        const checkoutSession = await marketelStripe.checkout.sessions.retrieve(checkoutSessionId, {
            expand: ['subscription'],
        });
        const subscription = typeof checkoutSession.subscription === 'object'
            ? checkoutSession.subscription
            : null;
        const metadataMatches = checkoutSession.metadata?.product === 'hotel-onboarding'
            && checkoutSession.metadata?.hotelId === hotel.id
            && checkoutSession.metadata?.setupToken === req.params.token;
        const paymentVerified = checkoutSession.mode === 'subscription'
            && checkoutSession.status === 'complete'
            && checkoutSession.payment_status === 'paid'
            && subscription
            && marketelSubscriptionHasAccess(subscription.status);
        if (!metadataMatches || !paymentVerified) {
            return res.redirect(`/setup/${encodeURIComponent(req.params.token)}?payment=unverified`);
        }

        // Mark complete and activate
        await prisma.hotelConfig.update({
            where: { id: hotel.id },
            data: {
                setupComplete: true,
                subscribed: true,
                active: true,
                marketelStripeCustomerId: stripeObjectId(checkoutSession.customer) || null,
                marketelStripeSubscriptionId: stripeObjectId(subscription) || null,
                marketelSubscriptionStatus: subscription.status || null,
                marketelCurrentPeriodEnd: stripePeriodEnd(subscription),
            },
        });

        await recordMarketelPaymentSuccess({
            hotelId: hotel.id,
            checkoutSession,
            req,
        });
        const paidPlan = marketelBillingPlan(checkoutSession.metadata?.billingInterval);
        const paidAmountUsd = Number(checkoutSession.amount_total) / 100;
        const subscriptionAmountUsd = Number.isFinite(paidAmountUsd) && paidAmountUsd > 0
            ? paidAmountUsd
            : paidPlan.amountUsd;
        const subscriptionEventId = `marketel-subscribe.${checkoutSession.id}`;

        // Create default CRM PIN
        const defaultPin = generateCrmOwnerPin();
        const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');
        try {
            await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Default PIN' } });
        } catch (e) { /* ignore */ }

        const hotelName = hotel.name || 'Your Hotel';
        const token = req.params.token;
        const assignedDomain = await assignUniqueDomainForHotel(hotel);

        // Auto-add subdomain to Vercel
        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        if (process.env.ENABLE_VERCEL_PROVISIONING !== 'false' && vercelToken && vercelProjectId) {
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

        // Domain record is saved in assignUniqueDomainForHotel

        // Don't send welcome email here — wait until they submit their contact info via /finalize

        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You're Live!</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1545780930244672');fbq('track','PageView');fbq('track','Subscribe',{value:${subscriptionAmountUsd},currency:'USD'},{eventID:'${subscriptionEventId}'});</script><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#f8f9fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:white;border-radius:20px;padding:36px;max-width:460px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.1)}h1{font-size:24px;margin-bottom:8px;color:#1a1a2e}.subtitle{color:#6b7280;font-size:14px;margin-bottom:16px;line-height:1.5}.url-box{background:#e8f5ee;border-radius:12px;padding:14px;font-family:monospace;font-size:15px;color:#2E7D5B;font-weight:600;margin-bottom:16px;word-break:break-all}.field{text-align:left;margin-bottom:14px}.field label{display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#1a1a2e}.field input{width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:16px;outline:none}.field input:focus{border-color:#2E7D5B}.btn{display:block;width:100%;padding:14px;background:#2E7D5B;color:white;border:none;border-radius:10px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.15s;text-decoration:none;text-align:center}.btn:hover{background:#1a5c3f}.note{margin-top:12px;font-size:12px;color:#6b7280;line-height:1.5}.pin-box{background:#f0f4ff;border:1.5px solid #c7d2fe;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center}.pin-label{font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.pin-value{font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#1a1a2e;letter-spacing:4px}.pin-hint{font-size:12px;color:#6b7280;margin-top:8px;line-height:1.4}.err{color:#ef4444;font-size:13px;margin-top:6px;display:none}</style></head><body><div class="card"><h1>\u{1F389} You're live!</h1><p class="subtitle">Your booking site is ready at:</p><div class="url-box">${assignedDomain}</div><p class="subtitle" id="contactSubtitle">Enter your email and phone so we can send you your access code.</p><div id="contactForm"><div class="field"><label>Email</label><input type="email" id="ownerEmail" placeholder="you@hotel.com" value="${hotel.ownerEmail || ''}" autocomplete="email"></div><div class="field"><label>Phone</label><input type="tel" id="ownerPhone" placeholder="(555) 123-4567" autocomplete="tel"></div><div class="err" id="formErr"></div><button class="btn" onclick="submitContact()">Send me my code \u2192</button></div><div id="revealSection" style="display:none;"><div class="pin-box"><div class="pin-label">Front Desk PIN</div><div class="pin-value">${defaultPin}</div><div class="pin-hint">Tap the \u270f\ufe0f pencil on your booking site and enter this PIN to manage everything.</div></div><a class="btn" href="https://${assignedDomain}?welcome=1" target="_blank">Visit Your Site \u2192</a><p class="note">We\u2019ve emailed this to you. You can change your PIN later in your front desk settings.</p></div></div><script>function submitContact(){var email=document.getElementById('ownerEmail').value.trim();var phone=document.getElementById('ownerPhone').value.trim();var err=document.getElementById('formErr');err.style.display='none';if(!email||!email.includes('@')){err.textContent='Please enter a valid email';err.style.display='block';return;}if(!phone){err.textContent='Please enter your phone number';err.style.display='block';return;}var btn=document.querySelector('#contactForm .btn');btn.textContent='Sending...';btn.disabled=true;fetch('/api/setup/${token}/finalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,phone:phone,pin:'${defaultPin}',domainPref:'subdomain',customDomain:''})}).then(function(r){return r.json()}).then(function(){document.getElementById('contactForm').style.display='none';document.getElementById('contactSubtitle').style.display='none';document.getElementById('revealSection').style.display='block';}).catch(function(){document.getElementById('contactForm').style.display='none';document.getElementById('contactSubtitle').style.display='none';document.getElementById('revealSection').style.display='block';});}</script></body></html>`);
    } catch (e) {
        console.error('Setup success error:', e.message);
        res.redirect('/');
    }
});

// Finalize the preview handoff. This happens before payment, so every message
// must describe preview access rather than implying that activation occurred.
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

        // Auto-create subdomain on Vercel
        let assignedDomain = '';
        if (domainPref === 'subdomain') {
            assignedDomain = await assignUniqueDomainForHotel(hotel);
            
            // Add to Vercel via API
            const vercelToken = process.env.VERCEL_TOKEN;
            const vercelProjectId = process.env.VERCEL_PROJECT_ID;
            if (process.env.ENABLE_VERCEL_PROVISIONING !== 'false' && vercelToken && vercelProjectId) {
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
        }

        // Send a clearly labelled preview/resume email once.
        const finalEmail = email || hotel.ownerEmail;
        let previewEmailSent = false;
        let activationEmailSent = false;
        if (finalEmail && hotel.subscribed) {
            // The legacy setup checkout collects contact details on its paid
            // success page. Once that email is saved, retry the paid handoff
            // instead of sending pre-activation language.
            activationEmailSent = await sendMarketelActivationEmailOnce(hotel.id, req);
        } else if (finalEmail) {
            const domain = String(domainPref === 'custom' ? customDomain : assignedDomain)
                .trim()
                .replace(/^https?:\/\//i, '')
                .replace(/\/.*$/, '');
            const pin = String(req.body.pin || '').trim();
            const existingEmail = await prisma.funnelEvent.findFirst({
                where: { hotelId: hotel.id, eventName: 'PreviewReadyEmailSent' },
                select: { id: true },
            });
            if (!existingEmail) {
                const frontdeskUrl = `${marketelFrontdeskOrigin(req)}/frontdesk?hotelId=${encodeURIComponent(hotel.id)}`;
                previewEmailSent = await sendPreviewReadyEmail({
                    toEmail: finalEmail,
                    hotelName: hotel.name || 'Your property',
                    hotelId: hotel.id,
                    pin: pin || 'Use email login',
                    domain,
                    frontdeskUrl,
                });
                if (previewEmailSent) {
                    await prisma.funnelEvent.create({
                        data: {
                            hotelId: hotel.id,
                            eventName: 'PreviewReadyEmailSent',
                            eventId: `marketel-preview-email.${hotel.id}`,
                            guestEmail: finalEmail,
                        },
                    }).catch(() => {});
                }
            }
        }

        console.log('✅ Preview handoff completed:', {
            hotelId: hotel.id,
            domain: domainPref === 'custom' ? customDomain : assignedDomain,
            previewEmailSent,
            activationEmailSent,
        });

        res.json({ success: true, domain: assignedDomain, previewEmailSent, activationEmailSent });
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

        // Generate unique domain
        const assignedDomain = await assignUniqueDomainForHotel(hotel);

        // Add to Vercel
        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        if (process.env.ENABLE_VERCEL_PROVISIONING !== 'false' && vercelToken && vercelProjectId) {
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
        const defaultPin = generateCrmOwnerPin();
        const pinHash = crypto.createHash('sha256').update(defaultPin).digest('hex');
        try {
            await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Default PIN' } });
        } catch (e) { /* ignore duplicate */ }

        // The preview/resume email is sent via /finalize. A separate activation
        // email is sent only after Stripe verifies payment.

        // Keep local development runs out of production funnel reporting.
        if (funnelTrackingEnabled) {
            const linkedExternalId = sanitizeJourneyIdentifier(req.body?.journeyVisitorId, 'mjv_');
            const linkedSessionId = sanitizeJourneyIdentifier(req.body?.journeySessionId, 'mjs_');
            prisma.funnelEvent.findFirst({
                where: { hotelId: hotel.id, eventName: 'SetupCompleted' },
                select: { id: true },
            }).then((existing) => existing || prisma.funnelEvent.create({
                data: {
                    hotelId: hotel.id,
                    eventName: 'SetupCompleted',
                    eventId: `marketel-setup.${hotel.id}`,
                    occurredAt: linkedSessionId ? journeyOccurredAt(req.body?.journeyOccurredAt) : null,
                    sessionId: linkedSessionId,
                    sequence: linkedSessionId ? Math.max(1, Math.min(1000000, parseInt(req.body?.journeySequence, 10) || 1)) : null,
                    surface: linkedSessionId ? redactJourneyString(req.body?.journeySurface || 'setup', 40) : null,
                    pagePath: linkedSessionId ? sanitizeJourneyPath(req.body?.journeyPagePath) : null,
                    metadata: linkedSessionId ? { linkedJourney: true } : undefined,
                    guestEmail: hotel.ownerEmail || null,
                    externalId: linkedExternalId,
                },
            })).catch(() => {});
        }

        console.log(`✅ Setup completed (freemium): ${hotel.name} (${hotel.id}) → ${assignedDomain}`);
        res.json({ success: true, bookingUrl: 'https://' + assignedDomain, frontdeskUrl: 'https://' + assignedDomain + '/frontdesk', crmPin: defaultPin });
    } catch (e) {
        console.error('Setup complete error:', e.message, e.stack);
        res.status(500).json({ error: 'Failed to complete setup', detail: e.message });
    }
});

// Polled by setup.html so a brand-new owner is never sent to their domain
// before Vercel/Cloudflare finish provisioning the TLS cert — otherwise they
// hit a Cloudflare "SSL handshake failed" page instead of their Front Desk.
// We probe server-side because the browser can't reliably distinguish a TLS
// handshake failure from any other network error.
app.get('/api/setup/:token/site-status', async (req, res) => {
    try {
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ ready: false, error: 'Invalid token' });
        const domainRow = await prisma.hotelDomain.findFirst({
            where: { hotelId: hotel.id },
            orderBy: { isPrimary: 'desc' },
        });
        const domain = domainRow?.domain;
        if (!domain) return res.json({ ready: false, reason: 'no-domain' });

        let ready = false;
        let status = 0;
        try {
            const probe = await axios.get(`https://${domain}/frontdesk`, {
                timeout: 7000,
                maxRedirects: 0,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Marketel-SiteCheck/1.0' },
            });
            status = probe.status;
            const edgeError = String(probe.headers?.['x-vercel-error'] || '').toUpperCase();
            // A Vercel 402 means the deployment is disabled, not that the
            // owner's guest page is ready to show.
            ready = status >= 200
                && status < 400
                && status !== 402
                && !edgeError.includes('DEPLOYMENT_DISABLED');
        } catch (e) {
            ready = false; // TLS handshake / DNS not propagated yet
        }
        res.set('Cache-Control', 'no-store');
        res.json({ ready, status, domain });
    } catch (e) {
        res.json({ ready: false, error: e.message });
    }
});

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function hotelLetterInitial(name) {
    const match = String(name || 'H').trim().match(/[A-Za-z0-9]/);
    return match ? match[0].toUpperCase() : 'H';
}

function isRasterAppIconUrl(url) {
    if (!url) return false;
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
}

async function resolveHotelForManifest(hotelId) {
    let hotel = await prisma.hotelConfig.findUnique({ where: { id: hotelId } });
    if (!hotel) {
        const domainGuess = hotelId + '.mktel.co';
        let domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
        if (!domainRecord) {
            domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: hotelId + '.bookmarketel.com' } });
        }
        if (domainRecord) {
            hotel = await prisma.hotelConfig.findUnique({ where: { id: domainRecord.hotelId } });
        }
    }
    return hotel;
}

async function renderHotelLetterIconPng(letter, size) {
    const safeSize = Math.min(512, Math.max(64, Number(size) || 192));
    const fontSize = Math.round(safeSize * 0.46);
    const radius = Math.round(safeSize * 0.22);
    const svg = `<svg width="${safeSize}" height="${safeSize}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${radius}" fill="#2E7D5B"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(letter)}</text>
</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

function buildGuestManifestIcons(hotel, hotelId, baseUrl) {
    const id = (hotel && hotel.id) || hotelId;
    const iconBase = `${baseUrl}/api/hotel/${encodeURIComponent(id)}/guest-app-icon.png`;
    return [
        { src: `${iconBase}?s=192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${iconBase}?s=512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${iconBase}?s=512`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];
}

// Per-hotel home-screen icon: uploaded logo, or a generated letter tile (e.g. "M" for Mo's Hotel).
app.get('/api/hotel/:hotelId/guest-app-icon.png', async (req, res) => {
    try {
        const allowedSizes = [96, 128, 152, 180, 192, 256, 512];
        let size = parseInt(req.query.s, 10) || 192;
        if (!allowedSizes.includes(size)) size = 192;

        const hotel = await resolveHotelForManifest(req.params.hotelId);
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        let png;
        if (hotel && isRasterAppIconUrl(hotel.appIconUrl)) {
            const iconUrl = hotel.appIconUrl.startsWith('http') ? hotel.appIconUrl : baseUrl + hotel.appIconUrl;
            const response = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
            png = await sharp(Buffer.from(response.data))
                .resize(size, size, { fit: 'cover' })
                .png()
                .toBuffer();
        } else {
            png = await renderHotelLetterIconPng(hotelLetterInitial(hotel?.name), size);
        }

        res.set('Content-Type', 'image/png');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', hotel?.appIconUrl ? 'public, max-age=300' : 'public, max-age=86400');
        res.send(png);
    } catch (e) {
        console.error('Guest app icon error:', e.message);
        try {
            const png = await renderHotelLetterIconPng('H', 192);
            res.set('Content-Type', 'image/png');
            res.send(png);
        } catch {
            res.status(500).end();
        }
    }
});

// Dynamic per-hotel PWA manifest — lets each hotel be installed to the home
// screen as "their" app (their name + their icon). Served same-origin via the
// booking engine's /api proxy so install prompts work.
app.get('/api/hotel/:hotelId/manifest.webmanifest', async (req, res) => {
    try {
        const hotel = await resolveHotelForManifest(req.params.hotelId);

        const name = (hotel && hotel.name) || 'Book Now';
        const hotelId = (hotel && hotel.id) || req.params.hotelId;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const icons = buildGuestManifestIcons(hotel, hotelId, baseUrl);

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
            const domainGuess = req.params.hotelId + '.mktel.co';
            let domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
            if (!domainRecord) {
                domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: req.params.hotelId + '.bookmarketel.com' } });
            }
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
            { src: `${baseUrl}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png', purpose: 'any' }
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
            const domainGuess = req.params.hotelId + '.mktel.co';
            let domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: domainGuess } });
            if (!domainRecord) {
                domainRecord = await prisma.hotelDomain.findFirst({ where: { domain: req.params.hotelId + '.bookmarketel.com' } });
            }
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
                imageUrl: r.images[0]?.url ? resolveImgUrl(r.images[0].url) : `${baseUrl}/room-placeholder.svg`,
                imageUrls: r.images.length ? r.images.map(img => resolveImgUrl(img.url)) : [`${baseUrl}/room-placeholder.svg`],
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
        const shouldUseStaticConfigOnly = config.source === 'static' && process.env.PREFER_DB_HOTEL_CONFIG !== 'true';
        const dbHotel = shouldUseStaticConfigOnly ? null : await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: {
                name: true,
                subtitle: true,
                address: true,
                phone: true,
                cancellationPolicy: true,
                theme: true,
                appIconUrl: true,
                subscribed: true,
                setupToken: true,
                ownerEmail: true,
            },
        })
            .catch(error => {
                if (!isPrismaConnectionError(error)) throw error;
                return null;
            });
        const primaryDomain = shouldUseStaticConfigOnly ? null : await prisma.hotelDomain.findFirst({ where: { hotelId, isPrimary: true }, select: { domain: true } })
            .catch(error => {
                if (!isPrismaConnectionError(error)) throw error;
                return null;
            });
        if (dbHotel?.setupToken) {
            const opened = await prisma.funnelEvent.findFirst({
                where: { hotelId, eventName: 'FrontDeskOpened' },
                select: { id: true },
            }).catch(() => null);
            if (!opened) {
                await prisma.funnelEvent.create({
                    data: {
                        hotelId,
                        eventName: 'FrontDeskOpened',
                        eventId: `marketel-frontdesk.${hotelId}`,
                        guestEmail: dbHotel.ownerEmail || null,
                    },
                }).catch(() => {});
            }
        }
        res.json({
            success: true,
            hotelId,
            domain: primaryDomain?.domain || '',
            allowedHotels: req.crmAllowedHotels || [],
            isMasterPin: !!req.crmIsMasterPin,
            nativePreviewAccess: !!req.crmIsDogfoodPreview,
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

// List the properties available to the current Front Desk credential. Native
// clients use this to provide a real property switcher instead of relying on a
// property-specific hostname.
app.get('/api/crm/properties', crmAuth, async (req, res) => {
    try {
        const allowed = Array.isArray(req.crmAllowedHotels) ? req.crmAllowedHotels : [];
        const isMaster = allowed.includes('*');
        const activeCustomerOnly = !!(
            (req.crmIsNativeClient || req.crmIsNativeSession)
            && !req.crmIsDogfoodPreview
        );
        const where = isMaster
            ? { active: true, ...(activeCustomerOnly ? { subscribed: true } : {}) }
            : { active: true, id: { in: allowed }, ...(activeCustomerOnly ? { subscribed: true } : {}) };
        const rows = await prisma.hotelConfig.findMany({
            where,
            select: {
                id: true,
                name: true,
                appIconUrl: true,
                domains: {
                    where: { isPrimary: true },
                    select: { domain: true },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json({
            success: true,
            properties: rows.map(row => ({
                id: row.id,
                name: row.name || row.id,
                appIconUrl: row.appIconUrl || '',
                domain: row.domains?.[0]?.domain || '',
            })),
        });
    } catch (e) {
        console.error('crm:properties failed:', e.message);
        res.status(500).json({ success: false, message: 'Could not load properties.' });
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
                // Generate a fresh 6-digit PIN.
                const newPin = generateCrmOwnerPin();
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
const configuredMagicLinkSecret = process.env.MAGIC_LINK_SECRET || process.env.SESSION_SECRET;
const MAGIC_LINK_SECRET = configuredMagicLinkSecret || crypto.randomBytes(32).toString('hex');
const MAGIC_LINK_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const NATIVE_LOGIN_CODE_EXPIRY_MS = 10 * 60 * 1000;

if (!configuredMagicLinkSecret) {
    console.warn('MAGIC_LINK_SECRET or SESSION_SECRET is not set; using an ephemeral magic-link secret for this process.');
}

function hashNativeLoginCode(email, code) {
    return crypto.createHmac('sha256', NATIVE_SESSION_TOKEN_SECRET)
        .update(`${String(email || '').trim().toLowerCase()}:${String(code || '').trim()}`)
        .digest('hex');
}

async function getNativeOwnerProperties(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return [];
    const rows = await prisma.hotelConfig.findMany({
        where: {
            active: true,
            subscribed: true,
            ownerEmail: { equals: normalizedEmail, mode: 'insensitive' },
        },
        select: {
            id: true,
            name: true,
            appIconUrl: true,
            domains: {
                where: { isPrimary: true },
                select: { domain: true },
                take: 1,
            },
        },
        orderBy: { createdAt: 'asc' },
    });
    return rows.map(row => ({
        id: row.id,
        name: row.name || row.id,
        appIconUrl: row.appIconUrl || '',
        domain: row.domains?.[0]?.domain || '',
    }));
}

app.post('/api/auth/native-code/request', nativeCodeRequestRateLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
        }
        const properties = await getNativeOwnerProperties(email);
        // Do not reveal whether an email owns a property.
        if (!properties.length) return res.json({ success: true });
        if (!emailTransporter) {
            console.error('native-code request failed: email transporter is unavailable');
            return res.status(503).json({ success: false, message: 'Email is temporarily unavailable. Try again shortly.' });
        }

        const code = String(crypto.randomInt(100000, 1000000));
        await prisma.nativeLoginChallenge.upsert({
            where: { email },
            create: {
                email,
                codeHash: hashNativeLoginCode(email, code),
                expiresAt: new Date(Date.now() + NATIVE_LOGIN_CODE_EXPIRY_MS),
                attempts: 0,
            },
            update: {
                codeHash: hashNativeLoginCode(email, code),
                expiresAt: new Date(Date.now() + NATIVE_LOGIN_CODE_EXPIRY_MS),
                attempts: 0,
            },
        });
        await prisma.nativeLoginChallenge.deleteMany({
            where: { expiresAt: { lt: new Date(Date.now() - NATIVE_LOGIN_CODE_EXPIRY_MS) } },
        }).catch(() => {});
        await emailTransporter.sendMail({
            from: '"Marketel" <support@bookmarketel.com>',
            to: email,
            subject: `${code} is your Marketel code`,
            html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:40px 20px;text-align:center;">
                <img src="https://bookmarketel.com/marketellogo.svg" alt="" width="48" height="48" style="margin-bottom:18px;">
                <h2 style="font-size:20px;font-weight:800;color:#1a2b22;margin:0 0 12px;">Open Marketel Front Desk</h2>
                <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 22px;">Enter this code in the Marketel app. It expires in 10 minutes.</p>
                <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#2E7D5B;margin-left:8px;">${code}</div>
                <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">If you did not request this, you can ignore this email.</p>
            </div>`,
            text: `${code} is your Marketel Front Desk verification code. It expires in 10 minutes.`,
        });
        res.json({ success: true });
    } catch (e) {
        console.error('native-code request error:', e.message);
        res.status(500).json({ success: false, message: 'Could not send the code. Try again.' });
    }
});

app.post('/api/auth/native-code/verify', nativeCodeVerifyRateLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
        const challenge = await prisma.nativeLoginChallenge.findUnique({ where: { email } });
        if (!challenge || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= 5) {
            if (email) {
                await prisma.nativeLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
            }
            return res.status(401).json({ success: false, message: 'That code is invalid or expired. Request a new one.' });
        }
        await prisma.nativeLoginChallenge.update({
            where: { email },
            data: { attempts: { increment: 1 } },
        });
        const suppliedHash = hashNativeLoginCode(email, code);
        if (!timingSafeTextEqual(challenge.codeHash, suppliedHash)) {
            return res.status(401).json({ success: false, message: 'That code is invalid or expired.' });
        }
        const properties = await getNativeOwnerProperties(email);
        if (!properties.length) {
            await prisma.nativeLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
            return res.status(401).json({ success: false, message: 'No active properties were found for this account.' });
        }
        await prisma.nativeLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
        res.json({
            success: true,
            sessionToken: generateNativeSessionToken(email),
            expiresInDays: 90,
            properties,
        });
    } catch (e) {
        console.error('native-code verify error:', e.message);
        res.status(500).json({ success: false, message: 'Could not verify the code. Try again.' });
    }
});

function generateMagicToken(email, hotelId) {
    const payload = JSON.stringify({ email, hotelId, exp: Date.now() + MAGIC_LINK_EXPIRY_MS });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', MAGIC_LINK_SECRET).update(encoded).digest('base64url');
    return encoded + '.' + sig;
}

function timingSafeTextEqual(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyMagicToken(token) {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', MAGIC_LINK_SECRET).update(encoded).digest('base64url');
    if (!timingSafeTextEqual(sig, expectedSig)) return null;
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
        const tempPin = generateCrmOwnerPin();
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
        if (!newPin || newPin.length < 6) {
            return res.status(400).json({ success: false, message: 'PIN must be at least 6 characters.' });
        }
        if (isCrmMasterPin(newPin)) {
            return res.status(400).json({
                success: false,
                message: 'Universal admin PINs cannot be saved as a hotel PIN. Choose a unique owner PIN.'
            });
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

async function resolveMarketelSubscriptionHotelId({ hotelId, subscriptionId, customerId } = {}) {
    const metadataHotelId = String(hotelId || '').trim();
    if (metadataHotelId) {
        const exists = await prisma.hotelConfig.findUnique({
            where: { id: metadataHotelId },
            select: { id: true },
        }).catch(() => null);
        if (exists) return exists.id;
    }

    const lookup = [];
    if (subscriptionId) lookup.push({ marketelStripeSubscriptionId: subscriptionId });
    if (customerId) lookup.push({ marketelStripeCustomerId: customerId });
    if (!lookup.length) return '';
    const hotel = await prisma.hotelConfig.findFirst({
        where: { OR: lookup },
        select: { id: true },
    }).catch(() => null);
    return hotel?.id || '';
}

async function syncMarketelSubscription(subscription, { forcedStatus = '' } = {}) {
    if (!subscription) return { hotelId: '', subscribed: false, status: '' };
    const subscriptionId = stripeObjectId(subscription);
    const customerId = stripeObjectId(subscription.customer);
    const status = String(forcedStatus || subscription.status || '').trim().toLowerCase();
    const hotelId = await resolveMarketelSubscriptionHotelId({
        hotelId: subscription.metadata?.hotelId,
        subscriptionId,
        customerId,
    });
    if (!hotelId) {
        console.warn('Marketel subscription event could not be matched to a property:', {
            subscriptionId,
            customerId,
            status,
        });
        return { hotelId: '', subscribed: false, status };
    }

    const subscribed = marketelSubscriptionHasAccess(status);
    const previous = await prisma.hotelConfig.findUnique({
        where: { id: hotelId },
        select: { marketelSubscriptionStatus: true, ownerEmail: true },
    });
    await prisma.hotelConfig.update({
        where: { id: hotelId },
        data: {
            subscribed,
            marketelStripeCustomerId: customerId || undefined,
            marketelStripeSubscriptionId: subscriptionId || undefined,
            marketelSubscriptionStatus: status || null,
            marketelCurrentPeriodEnd: stripePeriodEnd(subscription),
            ...(subscribed ? { setupComplete: true, active: true } : {}),
        },
    });
    if (previous?.marketelSubscriptionStatus !== status) {
        await prisma.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'SubscriptionStatusChanged',
                eventId: `marketel-subscription-status.${subscriptionId}.${status}.${Date.now()}`,
                guestEmail: previous?.ownerEmail || null,
                contentName: status,
            },
        }).catch(() => {});
    }
    console.log(`Marketel subscription synchronized: ${hotelId} status=${status} access=${subscribed}`);
    return { hotelId, subscribed, status };
}

async function sendMarketelActivationEmailOnce(hotelId, req = null) {
    if (!hotelId || !emailTransporter) return false;
    let claim = null;
    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext('activation-email'))`;
        const existing = await tx.funnelEvent.findFirst({
            where: {
                hotelId,
                eventName: { in: ['ActivationEmailSending', 'ActivationEmailSent'] },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existing?.eventName === 'ActivationEmailSent') return;
        if (existing && existing.createdAt > new Date(Date.now() - 5 * 60 * 1000)) return;
        if (existing) await tx.funnelEvent.delete({ where: { id: existing.id } });
        claim = await tx.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'ActivationEmailSending',
                eventId: `marketel-activation-email.${hotelId}.${Date.now()}`,
            },
        });
    });
    if (!claim) return false;

    try {
        const [hotel, domainRow] = await Promise.all([
            prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: { id: true, name: true, ownerEmail: true },
            }),
            prisma.hotelDomain.findFirst({
                where: { hotelId },
                orderBy: { isPrimary: 'desc' },
                select: { domain: true },
            }),
        ]);
        if (!hotel?.ownerEmail) throw new Error('Property has no owner email');
        const domain = domainRow?.domain || await assignUniqueDomainForHotel(hotel);
        const frontdeskUrl = `${marketelFrontdeskOrigin(req)}/frontdesk?hotelId=${encodeURIComponent(hotelId)}`;
        const sent = await sendActivationEmail({
            toEmail: hotel.ownerEmail,
            hotelName: hotel.name || 'Your property',
            hotelId,
            domain,
            frontdeskUrl,
        });
        if (!sent) throw new Error('Activation email was not sent');
        await prisma.funnelEvent.update({
            where: { id: claim.id },
            data: {
                eventName: 'ActivationEmailSent',
                eventId: `marketel-activation-email.${hotelId}`,
                guestEmail: hotel.ownerEmail,
            },
        });
        return true;
    } catch (error) {
        await prisma.funnelEvent.deleteMany({ where: { id: claim.id, eventName: 'ActivationEmailSending' } }).catch(() => {});
        console.error('Activation email failed:', error.message);
        return false;
    }
}

async function recordMarketelPaymentSuccess({ hotelId, checkoutSession, req = null }) {
    if (!hotelId || !checkoutSession?.id) return;
    const eventId = `marketel-subscribe.${checkoutSession.id}`;
    const journeyExternalId = sanitizeJourneyIdentifier(checkoutSession?.metadata?.journeyVisitorId, 'mjv_');
    const journeySessionId = sanitizeJourneyIdentifier(checkoutSession?.metadata?.journeySessionId, 'mjs_');
    const billingInterval = normalizeMarketelBillingInterval(checkoutSession?.metadata?.billingInterval);
    const billingPlan = marketelBillingPlan(billingInterval);
    const checkoutAmountUsd = Number(checkoutSession.amount_total) / 100;
    const metadataAmountUsd = Number(checkoutSession?.metadata?.billingAmountUsd);
    const amountUsd = Number.isFinite(checkoutAmountUsd) && checkoutAmountUsd > 0
        ? checkoutAmountUsd
        : Number.isFinite(metadataAmountUsd) && metadataAmountUsd > 0
            ? metadataAmountUsd
            : billingPlan.amountUsd;

    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: hotelId },
        select: { ownerEmail: true, ownerPhone: true },
    }).catch(() => null);
    const existing = await prisma.funnelEvent.findFirst({
        where: { eventName: 'PaymentSucceeded', eventId },
        select: { id: true },
    }).catch(() => null);
    if (!existing) {
        await prisma.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'PaymentSucceeded',
                eventId,
                guestEmail: hotel?.ownerEmail || null,
                guestPhone: hotel?.ownerPhone || null,
                value: amountUsd,
                currency: 'USD',
                contentName: billingPlan.contentName,
                externalId: journeyExternalId,
                sessionId: journeySessionId,
                surface: 'stripe',
                pagePath: '/checkout/success',
                metadata: {
                    provider: 'stripe',
                    product: billingPlan.contentName,
                    billingInterval,
                    attributionLinked: !!(journeyExternalId && journeySessionId),
                },
            },
        }).catch((e) => console.error('Payment funnel tracking failed:', e.message));
    }

    // The webhook guarantees delivery if the owner closes Stripe. The browser
    // redirect sends the same event ID again with browser identifiers; Meta
    // deduplicates the pair.
    if (!existing || req) {
        const { fbp, fbc } = req ? getMetaCookies(req) : { fbp: '', fbc: '' };
        sendMarketelCAPI('Subscribe', {
            email: hotel?.ownerEmail || '',
            phone: hotel?.ownerPhone || '',
            ip: req?.ip || '',
            userAgent: req?.headers?.['user-agent'] || '',
            sourceUrl: req
                ? `${req.protocol}://${req.get('host')}${req.originalUrl}`
                : process.env.BACKEND_URL || 'https://mktel.co',
            fbp,
            fbc,
            value: amountUsd,
            currency: 'USD',
            eventId,
        });
    }
    await sendMarketelActivationEmailOnce(hotelId, req);
}

function invoiceSubscriptionId(invoice) {
    return stripeObjectId(
        invoice?.subscription
        || invoice?.parent?.subscription_details?.subscription
    );
}

// Subscription billing is a separate Stripe account from guest card holds.
app.post('/api/marketel-stripe-webhook', async (req, res) => {
    if (!marketelStripe || !process.env.STRIPE_MARKETEL_WEBHOOK_SECRET) {
        return res.status(503).send('Marketel Stripe webhook is not configured');
    }

    let event;
    try {
        event = marketelStripe.webhooks.constructEvent(
            req.body,
            req.headers['stripe-signature'],
            process.env.STRIPE_MARKETEL_WEBHOOK_SECRET
        );
    } catch (e) {
        console.error('Marketel Stripe webhook signature failed:', e.message);
        return res.status(400).send(`Webhook Error: ${e.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const supportedProduct = ['hotel-go-live', 'hotel-onboarding'].includes(session.metadata?.product);
            if (supportedProduct && session.mode === 'subscription' && session.payment_status === 'paid') {
                const subscriptionId = stripeObjectId(session.subscription);
                if (subscriptionId) {
                    const subscription = await marketelStripe.subscriptions.retrieve(subscriptionId);
                    const synced = await syncMarketelSubscription(subscription);
                    if (synced.subscribed) {
                        await recordMarketelPaymentSuccess({
                            hotelId: synced.hotelId,
                            checkoutSession: session,
                        });
                    }
                }
            }
        } else if (
            event.type === 'customer.subscription.created'
            || event.type === 'customer.subscription.updated'
            || event.type === 'customer.subscription.deleted'
        ) {
            await syncMarketelSubscription(event.data.object);
        } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
            const subscriptionId = invoiceSubscriptionId(event.data.object);
            if (subscriptionId) {
                const subscription = await marketelStripe.subscriptions.retrieve(subscriptionId);
                await syncMarketelSubscription(subscription, {
                    forcedStatus: event.type === 'invoice.payment_failed' ? 'past_due' : '',
                });
            }
        }
        res.json({ received: true });
    } catch (e) {
        console.error(`Marketel Stripe webhook ${event.type} failed:`, e.message);
        res.status(500).send('Webhook processing failed');
    }
});

// Go Live — create Stripe checkout for subscription (from front desk)
app.post('/api/crm/go-live', crmAuth, async (req, res) => {
    try {
        if (req.crmIsNativeClient) {
            return res.status(403).json({
                success: false,
                message: 'Subscription purchases are not available in the iOS app.',
            });
        }
        if (!marketelStripe) return res.status(503).json({ success: false, message: 'Payment not configured' });
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: {
                ownerEmail: true,
                ownerPhone: true,
                name: true,
                setupToken: true,
                subscribed: true,
                marketelStripeCustomerId: true,
            },
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found' });
        if (hotel.subscribed) {
            return res.status(409).json({ success: false, message: 'This property is already activated.' });
        }

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const journeyExternalId = sanitizeJourneyIdentifier(req.body?.journeyVisitorId, 'mjv_');
        const journeySessionId = sanitizeJourneyIdentifier(req.body?.journeySessionId, 'mjs_');
        const journeySequence = Math.max(1, Math.min(1000000, parseInt(req.body?.journeySequence, 10) || 1));
        const billingInterval = normalizeMarketelBillingInterval(req.body?.billingInterval);
        const frontdeskOrigin = marketelFrontdeskOrigin(req);
        const billing = await getMarketelSubscriptionPrice(billingInterval);
        const { amountUsd } = billing;
        const returnToken = await generateCrmReturnTokenForHotel(hotelId, hotel?.setupToken);
        const cancelParams = new URLSearchParams({
            returnToken,
            reveal: 'checkout',
        });
        const cancelUrl = `${frontdeskOrigin}/frontdesk-return?${cancelParams.toString()}`;
        const clickEventId = `marketel-go-live.${hotelId}.${Date.now()}`;
        await prisma.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'GoLiveClicked',
                eventId: clickEventId,
                guestEmail: hotel.ownerEmail || null,
                guestPhone: hotel.ownerPhone || null,
                value: amountUsd,
                currency: 'USD',
                externalId: journeyExternalId,
                sessionId: journeySessionId,
                sequence: journeySequence,
                surface: 'frontdesk',
                pagePath: '/frontdesk',
                contentName: billing.contentName,
                metadata: { source: 'activation-cta', provider: 'stripe', billingInterval },
            },
        }).catch(() => {});
        console.log('crm:go-live checkout session creating:', {
            hotelId,
            host: req.get('host'),
            baseUrl,
            hasReturnToken: !!returnToken,
            returnTokenKind: returnToken.startsWith('fd_') ? 'return-token' : (returnToken ? 'other' : 'none'),
        });
        const session = await marketelStripe.checkout.sessions.create({
            mode: 'subscription',
            client_reference_id: hotelId,
            line_items: [billing.lineItem],
            ...(hotel.marketelStripeCustomerId
                ? { customer: hotel.marketelStripeCustomerId }
                : { customer_email: hotel.ownerEmail || undefined }),
            metadata: {
                product: 'hotel-go-live',
                hotelId,
                billingInterval,
                billingAmountUsd: String(amountUsd),
                ...(journeyExternalId ? { journeyVisitorId: journeyExternalId } : {}),
                ...(journeySessionId ? { journeySessionId } : {}),
            },
            subscription_data: {
                metadata: {
                    product: 'hotel-go-live',
                    hotelId,
                    billingInterval,
                    billingAmountUsd: String(amountUsd),
                    ...(journeyExternalId ? { journeyVisitorId: journeyExternalId } : {}),
                    ...(journeySessionId ? { journeySessionId } : {}),
                },
            },
            success_url: `${baseUrl}/api/crm/go-live-success?session_id={CHECKOUT_SESSION_ID}&returnToken=${encodeURIComponent(returnToken)}&frontdeskOrigin=${encodeURIComponent(frontdeskOrigin)}`,
            cancel_url: cancelUrl,
        });
        const checkoutEventId = `marketel-checkout.${session.id}`;
        await prisma.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'CheckoutStarted',
                eventId: checkoutEventId,
                guestEmail: hotel.ownerEmail || null,
                guestPhone: hotel.ownerPhone || null,
                value: amountUsd,
                currency: 'USD',
                externalId: journeyExternalId,
                sessionId: journeySessionId,
                sequence: journeySequence + 1,
                surface: 'stripe',
                pagePath: '/checkout',
                contentName: billing.contentName,
                metadata: { source: 'activation-cta', provider: 'stripe', billingInterval },
            },
        }).catch(() => {});
        const { fbp, fbc } = getMetaCookies(req);
        sendMarketelCAPI('InitiateCheckout', {
            email: hotel.ownerEmail || '',
            phone: hotel.ownerPhone || '',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            sourceUrl: req.headers.referer || '',
            fbp,
            fbc,
            value: amountUsd,
            currency: 'USD',
            eventId: checkoutEventId,
        });
        console.log('crm:go-live checkout session created:', {
            hotelId,
            sessionId: session?.id || '',
            successUrlHasSessionPlaceholder: true,
            successUrlHasReturnToken: true,
        });
        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error('crm:go-live error:', e.message);
        const configError = /not configured|must be|inactive/i.test(e.message);
        res.status(configError ? 503 : 500).json({
            success: false,
            message: configError ? e.message : 'Failed to create checkout',
        });
    }
});

// Go Live success — mark hotel as subscribed
app.get('/api/crm/go-live-success', async (req, res) => {
    const checkoutSessionId = String(req.query.session_id || '').trim();
    const returnToken = String(req.query.returnToken || '').trim();
    const frontdeskOrigin = marketelFrontdeskOrigin(req, String(req.query.frontdeskOrigin || '').trim());
    const verifiedReturnToken = await verifyCrmReturnToken(returnToken);
    let stripeVerifiedHotelId = '';
    let verifiedCheckoutSession = null;
    let verifiedSubscription = null;

    if (checkoutSessionId && marketelStripe) {
        try {
            const checkoutSession = await marketelStripe.checkout.sessions.retrieve(checkoutSessionId, {
                expand: ['subscription'],
            });
            const subscription = typeof checkoutSession.subscription === 'object'
                ? checkoutSession.subscription
                : null;
            const metadataHotelId = String(checkoutSession?.metadata?.hotelId || '').trim();
            const paymentComplete = checkoutSession?.metadata?.product === 'hotel-go-live'
                && checkoutSession?.mode === 'subscription'
                && checkoutSession?.payment_status === 'paid'
                && checkoutSession?.status === 'complete'
                && subscription
                && marketelSubscriptionHasAccess(subscription.status)
                && subscription.metadata?.hotelId === metadataHotelId;
            if (metadataHotelId && paymentComplete) {
                stripeVerifiedHotelId = metadataHotelId;
                verifiedCheckoutSession = checkoutSession;
                verifiedSubscription = subscription;
            }
        } catch (e) {
            console.warn('go-live-success checkout verification failed:', e.message);
        }
    }

    // A signed return token may identify where to send the owner, but only the
    // paid Stripe Checkout session is allowed to grant subscription access.
    const hotelId = stripeVerifiedHotelId || verifiedReturnToken?.hotelId || '';
    let frontdeskReturnToken = verifiedReturnToken?.hotelId === hotelId ? returnToken : '';
    if (!frontdeskReturnToken && stripeVerifiedHotelId && stripeVerifiedHotelId === hotelId) {
        frontdeskReturnToken = await generateCrmReturnTokenForHotel(hotelId).catch(() => '');
    }
    const returnAuthVerified = !!stripeVerifiedHotelId || !!verifiedReturnToken;
    const frontdeskActivationPin = (hotelId && returnAuthVerified)
        ? await createCrmActivationReturnPin(hotelId).catch((e) => {
            console.log('go-live-success activation pin create failed:', { hotelId, message: e.message });
            return '';
        })
        : '';
    console.log('go-live-success auth resolution:', {
        hotelId,
        hasCheckoutSessionId: !!checkoutSessionId,
        stripeVerifiedHotelId: stripeVerifiedHotelId || '',
        hasIncomingReturnToken: !!returnToken,
        incomingReturnTokenVerified: !!verifiedReturnToken,
        generatedFrontdeskReturnToken: !!frontdeskReturnToken && frontdeskReturnToken !== returnToken,
        hasFrontdeskReturnToken: !!frontdeskReturnToken,
        hasFrontdeskActivationPin: !!frontdeskActivationPin,
        returnAuthVerified,
    });
    if (hotelId && !frontdeskReturnToken && !frontdeskActivationPin) {
        console.warn('go-live-success redirect missing Front Desk return auth:', {
            hotelId,
            hasCheckoutSessionId: !!checkoutSessionId,
            stripeVerified: !!stripeVerifiedHotelId,
            hasReturnToken: !!returnToken,
            returnTokenVerified: !!verifiedReturnToken,
        });
    }

    // Return to Marketel's stable owner-facing origin. Property domains are for
    // guests and can still be provisioning when the owner completes payment.
    async function buildFrontdeskRedirect() {
        const activationParams = stripeVerifiedHotelId
            ? { activated: '1' }
            : { activation_error: '1' };
        if (!hotelId) return `${frontdeskOrigin}/frontdesk?activation_error=1`;
        const params = new URLSearchParams({ hotelId, ...activationParams });
        if (frontdeskReturnToken) {
            params.set('returnToken', frontdeskReturnToken);
            params.set('pin', frontdeskActivationPin || frontdeskReturnToken);
            const target = `${frontdeskOrigin}/frontdesk-return?${params.toString()}`;
            console.log('go-live-success redirect target:', {
                hotelId,
                target: redactFrontdeskAuthUrl(target),
                usesBridge: true,
                hasFrontdeskReturnToken: true,
                hasFrontdeskActivationPin: !!frontdeskActivationPin,
            });
            return target;
        }
        else if (frontdeskActivationPin) {
            params.set('pin', frontdeskActivationPin);
            const target = `${frontdeskOrigin}/frontdesk-return?${params.toString()}`;
            console.log('go-live-success redirect target:', {
                hotelId,
                target: redactFrontdeskAuthUrl(target),
                usesBridge: true,
                hasFrontdeskReturnToken: false,
                hasFrontdeskActivationPin: true,
            });
            return target;
        }
        const target = `${frontdeskOrigin}/frontdesk?${params.toString()}`;
        console.log('go-live-success redirect target:', {
            hotelId,
            target: redactFrontdeskAuthUrl(target),
            usesBridge: false,
            hasFrontdeskReturnToken: false,
            hasFrontdeskActivationPin: false,
        });
        return target;
    }

    try {
        if (stripeVerifiedHotelId && verifiedCheckoutSession && verifiedSubscription) {
            const synced = await syncMarketelSubscription(verifiedSubscription);
            if (!synced.subscribed || synced.hotelId !== stripeVerifiedHotelId) {
                throw new Error('Paid subscription could not be matched to this property');
            }
            await recordMarketelPaymentSuccess({
                hotelId: stripeVerifiedHotelId,
                checkoutSession: verifiedCheckoutSession,
                req,
            });
            console.log(`✅ Hotel subscribed: ${stripeVerifiedHotelId}`);
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
        if (req.crmIsNativeClient) {
            return res.status(403).json({
                success: false,
                message: 'Manage your Marketel subscription on the web or contact support@bookmarketel.com.',
            });
        }
        if (!marketelStripe) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { ownerEmail: true, marketelStripeCustomerId: true },
        });
        if (!hotel?.ownerEmail && !hotel?.marketelStripeCustomerId) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
        let customerId = hotel.marketelStripeCustomerId || '';
        if (!customerId && hotel.ownerEmail) {
            const customers = await marketelStripe.customers.list({ email: hotel.ownerEmail, limit: 1 });
            customerId = customers.data[0]?.id || '';
            if (customerId) {
                await prisma.hotelConfig.update({
                    where: { id: hotelId },
                    data: { marketelStripeCustomerId: customerId },
                }).catch(() => {});
            }
        }
        if (!customerId) {
            return res.json({ success: false, message: 'Contact support@bookmarketel.com to manage your subscription.' });
        }
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

// Durable owner ↔ Marketel support conversation. This stays intentionally
// separate from GuestMessage: one is product support, the other is a hotel's
// operational conversation with its guests.
const SUPPORT_MESSAGE_MAX = 4000;

function normalizeSupportMessage(value) {
    return String(value || '')
        .replace(/\0/g, '')
        .replace(/\r\n?/g, '\n')
        .trim()
        .slice(0, SUPPORT_MESSAGE_MAX);
}

function supportMessageContext(req) {
    const clean = (value, max) => String(value || '').trim().slice(0, max) || undefined;
    const context = {
        surface: clean(req.body?.surface, 60) || 'frontdesk',
        pagePath: clean(req.body?.pagePath, 240),
        client: clean(req.crmClient, 24) || (req.crmIsNativeClient ? 'ios' : 'web'),
        appVersion: clean(req.get('x-marketel-app-version'), 80),
        userAgent: clean(req.get('user-agent'), 500),
    };
    return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

function supportUnreadCount(messages, sender, lastReadAt) {
    const readTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    return (messages || []).filter((message) => (
        message.sender === sender && new Date(message.createdAt).getTime() > readTime
    )).length;
}

function serializeSupportThread(thread, viewer = 'owner') {
    if (!thread) return null;
    const messages = (thread.messages || [])
        .slice()
        .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
        .map((message) => ({
            id: message.id,
            sender: message.sender,
            body: message.body,
            context: viewer === 'support' ? (message.context || null) : undefined,
            createdAt: message.createdAt,
        }));
    return {
        id: thread.id,
        hotelId: thread.hotelId,
        hotel: thread.hotel ? {
            id: thread.hotel.id,
            name: thread.hotel.name || thread.hotel.id,
            ownerEmail: thread.hotel.ownerEmail || '',
            ownerPhone: thread.hotel.ownerPhone || '',
            subscribed: !!thread.hotel.subscribed,
        } : undefined,
        status: thread.status,
        lastMessageAt: thread.lastMessageAt,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        unread: viewer === 'support'
            ? supportUnreadCount(messages, 'owner', thread.supportLastReadAt)
            : supportUnreadCount(messages, 'support', thread.ownerLastReadAt),
        messages,
    };
}

function supportAdminLink(req, threadId) {
    return `${marketelFrontdeskOrigin(req)}/funnel?view=support&thread=${encodeURIComponent(threadId)}`;
}

function supportOwnerLink(req, hotelId) {
    return `${marketelFrontdeskOrigin(req)}/frontdesk?hotelId=${encodeURIComponent(hotelId)}&openSupport=1`;
}

async function loadOwnerSupportThread(hotelId) {
    return withRetry(() => prisma.supportThread.findUnique({
        where: { hotelId },
        include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 200 },
        },
    }));
}

app.get('/api/crm/support', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const thread = await loadOwnerSupportThread(hotelId);
        res.json({ success: true, thread: serializeSupportThread(thread, 'owner') });
    } catch (e) {
        console.error('crm:support:get error:', e.message);
        res.status(500).json({ success: false, message: 'Could not load your support conversation.' });
    }
});

app.post('/api/crm/support/read', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        await withRetry(() => prisma.supportThread.updateMany({
            where: { hotelId },
            data: { ownerLastReadAt: new Date() },
        }));
        res.json({ success: true });
    } catch (e) {
        console.error('crm:support:read error:', e.message);
        res.status(500).json({ success: false, message: 'Could not mark replies as read.' });
    }
});

app.post('/api/crm/support', crmAuth, supportMessageRateLimit, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const message = normalizeSupportMessage(req.body?.message);
        if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });
        const hotel = await withRetry(() => prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { id: true, name: true, ownerEmail: true, ownerPhone: true },
        }));
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });

        const now = new Date();
        const thread = await withRetry(() => prisma.$transaction(async (tx) => {
            const current = await tx.supportThread.upsert({
                where: { hotelId },
                update: {
                    status: 'open',
                    lastMessageAt: now,
                    ownerLastReadAt: now,
                },
                create: {
                    hotelId,
                    status: 'open',
                    lastMessageAt: now,
                    ownerLastReadAt: now,
                },
            });
            await tx.supportMessage.create({
                data: {
                    threadId: current.id,
                    sender: 'owner',
                    body: message,
                    context: supportMessageContext(req),
                },
            });
            return tx.supportThread.findUnique({
                where: { id: current.id },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 200 } },
            });
        }));

        if (emailTransporter) {
            emailTransporter.sendMail({
                from: '"Marketel Support" <support@bookmarketel.com>',
                to: 'support@bookmarketel.com',
                replyTo: hotel.ownerEmail || undefined,
                subject: `Support: ${hotel.name || hotelId}`,
                text: [
                    `Property: ${hotel.name || hotelId} (${hotelId})`,
                    `Email: ${hotel.ownerEmail || 'N/A'}`,
                    `Phone: ${hotel.ownerPhone || 'N/A'}`,
                    '',
                    message,
                    '',
                    `Reply in Marketel: ${supportAdminLink(req, thread.id)}`,
                ].join('\n'),
            }).catch((error) => console.error('crm:support notification email:', error.message));
        }
        console.log(`📩 Support message from ${hotel.name || hotelId}`);
        res.json({ success: true, thread: serializeSupportThread(thread, 'owner') });
    } catch (e) {
        console.error('crm:support error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

app.get('/api/admin/support', adminAuth, async (req, res) => {
    try {
        const requestedStatus = String(req.query?.status || '').trim().toLowerCase();
        const where = ['open', 'resolved'].includes(requestedStatus) ? { status: requestedStatus } : {};
        const threads = await withRetry(() => prisma.supportThread.findMany({
            where,
            include: {
                hotel: {
                    select: {
                        id: true,
                        name: true,
                        ownerEmail: true,
                        ownerPhone: true,
                        subscribed: true,
                    },
                },
                messages: { orderBy: { createdAt: 'desc' }, take: 200 },
            },
            orderBy: { lastMessageAt: 'desc' },
            take: 200,
        }));
        const data = threads.map((thread) => serializeSupportThread(thread, 'support'));
        res.json({
            success: true,
            threads: data,
            unread: data.reduce((total, thread) => total + Number(thread.unread || 0), 0),
        });
    } catch (e) {
        console.error('admin:support:list error:', e.message);
        res.status(500).json({ success: false, message: 'Could not load support conversations.' });
    }
});

app.post('/api/admin/support/:threadId/read', adminAuth, async (req, res) => {
    try {
        const threadId = String(req.params.threadId || '').trim();
        const result = await withRetry(() => prisma.supportThread.updateMany({
            where: { id: threadId },
            data: { supportLastReadAt: new Date() },
        }));
        if (!result.count) return res.status(404).json({ success: false, message: 'Conversation not found.' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not mark the conversation as read.' });
    }
});

app.post('/api/admin/support/:threadId/reply', adminAuth, async (req, res) => {
    try {
        const threadId = String(req.params.threadId || '').trim();
        const message = normalizeSupportMessage(req.body?.message);
        if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });
        const existing = await withRetry(() => prisma.supportThread.findUnique({
            where: { id: threadId },
            include: {
                hotel: {
                    select: { id: true, name: true, ownerEmail: true, ownerPhone: true, subscribed: true },
                },
            },
        }));
        if (!existing) return res.status(404).json({ success: false, message: 'Conversation not found.' });

        const now = new Date();
        const thread = await withRetry(() => prisma.$transaction(async (tx) => {
            await tx.supportMessage.create({
                data: { threadId, sender: 'support', body: message },
            });
            return tx.supportThread.update({
                where: { id: threadId },
                data: {
                    status: 'open',
                    lastMessageAt: now,
                    supportLastReadAt: now,
                },
                include: {
                    hotel: {
                        select: { id: true, name: true, ownerEmail: true, ownerPhone: true, subscribed: true },
                    },
                    messages: { orderBy: { createdAt: 'desc' }, take: 200 },
                },
            });
        }));

        if (emailTransporter && existing.hotel?.ownerEmail) {
            emailTransporter.sendMail({
                from: '"Marketel Support" <support@bookmarketel.com>',
                to: existing.hotel.ownerEmail,
                replyTo: 'support@bookmarketel.com',
                subject: `Marketel replied to ${existing.hotel.name || 'your property'}`,
                text: [
                    `Hi — Marketel replied to your support conversation:`,
                    '',
                    message,
                    '',
                    `Continue the conversation in Front Desk: ${supportOwnerLink(req, existing.hotel.id)}`,
                ].join('\n'),
            }).catch((error) => console.error('admin:support reply email:', error.message));
        }
        res.json({ success: true, thread: serializeSupportThread(thread, 'support') });
    } catch (e) {
        console.error('admin:support:reply error:', e.message);
        res.status(500).json({ success: false, message: 'Could not send that reply.' });
    }
});

app.patch('/api/admin/support/:threadId', adminAuth, async (req, res) => {
    try {
        const threadId = String(req.params.threadId || '').trim();
        const status = String(req.body?.status || '').trim().toLowerCase();
        if (!['open', 'resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be open or resolved.' });
        }
        const thread = await withRetry(() => prisma.supportThread.update({
            where: { id: threadId },
            data: {
                status,
                ...(status === 'resolved' ? { supportLastReadAt: new Date() } : {}),
            },
            include: {
                hotel: {
                    select: { id: true, name: true, ownerEmail: true, ownerPhone: true, subscribed: true },
                },
                messages: { orderBy: { createdAt: 'desc' }, take: 200 },
            },
        }));
        res.json({ success: true, thread: serializeSupportThread(thread, 'support') });
    } catch (e) {
        if (String(e.code || '') === 'P2025') {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        res.status(500).json({ success: false, message: 'Could not update that conversation.' });
    }
});

const ACCOUNT_DELETION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const ACCOUNT_DELETION_SWEEP_MS = 60 * 60 * 1000;

function requireNativeOwnerSession(req, res, hotel) {
    const sessionEmail = String(req.crmNativeEmail || '').trim().toLowerCase();
    const ownerEmail = String(hotel?.ownerEmail || '').trim().toLowerCase();
    if (!req.crmIsNativeSession || !sessionEmail || !ownerEmail || sessionEmail !== ownerEmail) {
        res.status(403).json({
            success: false,
            message: 'For your security, sign out and sign in with the owner email before deleting this account.',
        });
        return false;
    }
    return true;
}

async function cancelStripeSubscriptionForDeletion(subscriptionId) {
    if (!subscriptionId) return;
    if (!marketelStripe) {
        throw new Error('Stripe is unavailable; subscription cancellation could not be verified.');
    }
    try {
        const subscription = await marketelStripe.subscriptions.retrieve(subscriptionId);
        if (subscription?.status !== 'canceled') {
            await marketelStripe.subscriptions.cancel(subscriptionId);
        }
    } catch (error) {
        // A previously deleted Stripe object is already incapable of renewing,
        // so retries may safely continue with Marketel data deletion.
        if (error?.code === 'resource_missing' || error?.statusCode === 404) return;
        throw error;
    }
}

async function cancelStripeSubscriptionsForDeletion(hotel) {
    if (!hotel?.subscribed && !hotel?.marketelStripeSubscriptionId && !hotel?.marketelStripeCustomerId) {
        return;
    }
    if (!marketelStripe) {
        throw new Error('Stripe is unavailable; subscription cancellation could not be verified.');
    }

    const subscriptionIds = new Set();
    const customerIds = new Set();
    if (hotel.marketelStripeSubscriptionId) subscriptionIds.add(hotel.marketelStripeSubscriptionId);
    if (hotel.marketelStripeCustomerId) customerIds.add(hotel.marketelStripeCustomerId);

    if (!customerIds.size && hotel.ownerEmail) {
        const customers = await marketelStripe.customers.list({
            email: hotel.ownerEmail,
            limit: 10,
        });
        customers.data.forEach(customer => customerIds.add(customer.id));
    }

    for (const customerId of customerIds) {
        const subscriptions = await marketelStripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 100,
        });
        subscriptions.data
            .filter(subscription => subscription.status !== 'canceled')
            .forEach(subscription => subscriptionIds.add(subscription.id));
    }

    for (const subscriptionId of subscriptionIds) {
        await cancelStripeSubscriptionForDeletion(subscriptionId);
    }
}

function r2ObjectKeyFromPublicUrl(url) {
    const base = String(R2_PUBLIC_URL || '').replace(/\/+$/, '');
    const value = String(url || '');
    if (!base || !value.startsWith(`${base}/`)) return '';
    try {
        return decodeURIComponent(value.slice(base.length + 1));
    } catch (_) {
        return value.slice(base.length + 1);
    }
}

async function deleteHotelUploadedMedia(hotelId, urls = []) {
    const cleanHotelId = String(hotelId || '').trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanHotelId)) {
        throw new Error('Unsafe property identifier while deleting uploaded media.');
    }

    if (R2_PUBLIC_URL) {
        const keys = new Set(urls.map(r2ObjectKeyFromPublicUrl).filter(Boolean));
        let continuationToken;
        do {
            const page = await r2.send(new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: `${cleanHotelId}/`,
                ContinuationToken: continuationToken,
            }));
            (page.Contents || []).forEach(object => {
                if (object.Key) keys.add(object.Key);
            });
            continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (continuationToken);

        const allKeys = [...keys];
        for (let index = 0; index < allKeys.length; index += 1000) {
            const batch = allKeys.slice(index, index + 1000);
            if (!batch.length) continue;
            const result = await r2.send(new DeleteObjectsCommand({
                Bucket: R2_BUCKET,
                Delete: {
                    Objects: batch.map(Key => ({ Key })),
                    Quiet: true,
                },
            }));
            if (result.Errors?.length) {
                throw new Error(`Uploaded-media deletion failed: ${result.Errors[0].Message || result.Errors[0].Code}`);
            }
        }
    }

    const uploadsRoot = path.resolve(__dirname, 'public', 'uploads');
    const propertyUploads = path.resolve(uploadsRoot, cleanHotelId);
    if (propertyUploads.startsWith(`${uploadsRoot}${path.sep}`)) {
        fs.rmSync(propertyUploads, { recursive: true, force: true });
    }
}

async function completeAccountDeletion(request) {
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: request.hotelId },
        select: {
            id: true,
            name: true,
            ownerEmail: true,
            appIconUrl: true,
            subscribed: true,
            marketelStripeCustomerId: true,
            marketelStripeSubscriptionId: true,
            rooms: { select: { images: { select: { url: true } } } },
        },
    });
    if (!hotel) {
        await prisma.accountDeletionRequest.deleteMany({ where: { id: request.id } }).catch(() => {});
        return;
    }

    const claimed = await prisma.accountDeletionRequest.updateMany({
        where: {
            id: request.id,
            status: { in: ['pending', 'failed'] },
        },
        data: { status: 'processing', lastError: null },
    });
    if (!claimed.count) return;

    try {
        await cancelStripeSubscriptionsForDeletion(hotel);

        const mediaUrls = [
            hotel.appIconUrl,
            ...hotel.rooms.flatMap(room => room.images.map(image => image.url)),
        ].filter(Boolean);
        await deleteHotelUploadedMedia(hotel.id, mediaUrls);

        // Models with HotelConfig relations cascade. The older analytics and
        // booking tables predate those relations, so delete them explicitly.
        await prisma.$transaction([
            prisma.booking.deleteMany({ where: { hotelId: hotel.id } }),
            prisma.guestInstallEvent.deleteMany({ where: { hotelId: hotel.id } }),
            prisma.paymentDeclinedLead.deleteMany({ where: { hotelId: hotel.id } }),
            prisma.hitPayment.deleteMany({ where: { hotelId: hotel.id } }),
            prisma.funnelEvent.deleteMany({ where: { hotelId: hotel.id } }),
            // ManualRoom predates HotelConfig relations. Its overrides cascade
            // when the room rows are removed.
            prisma.manualRoom.deleteMany({ where: { hotelId: hotel.id } }),
            prisma.hotelConfig.delete({ where: { id: hotel.id } }),
        ]);

        clearHotelDomainCache();
        hotelConfigCache.delete(hotel.id);
        if (emailTransporter && hotel.ownerEmail) {
            await emailTransporter.sendMail({
                from: '"Marketel Support" <support@bookmarketel.com>',
                to: hotel.ownerEmail,
                subject: 'Your Marketel account was deleted',
                text: `The Marketel account for ${hotel.name || hotel.id} has been deleted. Its property, guest, booking, uploaded-media, login, and notification data were removed.`,
            }).catch(() => {});
        }
        console.log(`🗑️ Account deletion completed for ${hotel.id}`);
    } catch (error) {
        await prisma.accountDeletionRequest.update({
            where: { id: request.id },
            data: {
                status: 'failed',
                lastError: String(error?.message || 'Deletion failed').slice(0, 500),
            },
        }).catch(() => {});
        if (emailTransporter) {
            await emailTransporter.sendMail({
                from: '"Marketel Account Safety" <support@bookmarketel.com>',
                to: 'support@bookmarketel.com',
                subject: `Account deletion needs attention: ${hotel.id}`,
                text: `Automatic deletion failed for ${hotel.id}.\n\n${error?.stack || error?.message || error}`,
            }).catch(() => {});
        }
        throw error;
    }
}

async function runAccountDeletionSweep() {
    const due = await prisma.accountDeletionRequest.findMany({
        where: {
            status: { in: ['pending', 'failed'] },
            scheduledFor: { lte: new Date() },
        },
        orderBy: { scheduledFor: 'asc' },
        take: 20,
    });
    for (const request of due) {
        await completeAccountDeletion(request).catch(error => {
            console.error(`Account deletion sweep ${request.hotelId}:`, error.message);
        });
    }
}

app.get('/api/crm/account-deletion/status', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { ownerEmail: true },
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });
        const request = await prisma.accountDeletionRequest.findUnique({ where: { hotelId } });
        res.json({
            success: true,
            ownerSession: !!(
                req.crmIsNativeSession
                && String(req.crmNativeEmail || '').toLowerCase() === String(hotel.ownerEmail || '').toLowerCase()
            ),
            request: request ? {
                status: request.status,
                requestedAt: request.requestedAt,
                scheduledFor: request.scheduledFor,
            } : null,
        });
    } catch (error) {
        console.error('account-deletion/status:', error.message);
        res.status(500).json({ success: false, message: 'Could not load account status.' });
    }
});

app.post('/api/crm/account-deletion/request', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: {
                name: true,
                ownerEmail: true,
            },
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });
        if (!requireNativeOwnerSession(req, res, hotel)) return;
        if (String(req.body?.confirmation || '').trim().toUpperCase() !== 'DELETE') {
            return res.status(400).json({ success: false, message: 'Type DELETE to confirm.' });
        }
        const existingDeletion = await prisma.accountDeletionRequest.findUnique({ where: { hotelId } });
        if (existingDeletion?.status === 'processing') {
            return res.status(409).json({
                success: false,
                message: 'Account deletion is already being processed.',
            });
        }

        const scheduledFor = new Date(Date.now() + ACCOUNT_DELETION_GRACE_MS);
        const deletion = await prisma.accountDeletionRequest.upsert({
            where: { hotelId },
            create: {
                hotelId,
                requestedByEmail: req.crmNativeEmail,
                scheduledFor,
                status: 'pending',
            },
            update: {
                requestedByEmail: req.crmNativeEmail,
                requestedAt: new Date(),
                scheduledFor,
                status: 'pending',
                lastError: null,
            },
        });

        if (emailTransporter) {
            await Promise.allSettled([
                emailTransporter.sendMail({
                    from: '"Marketel Support" <support@bookmarketel.com>',
                    to: hotel.ownerEmail,
                    subject: 'Marketel account deletion scheduled',
                    text: `Deletion for ${hotel.name || hotelId} is scheduled for ${scheduledFor.toISOString()}. Sign back into Front Desk and cancel the request before then if you change your mind. The subscription will be canceled when deletion completes.`,
                }),
                emailTransporter.sendMail({
                    from: '"Marketel Account Safety" <support@bookmarketel.com>',
                    to: 'support@bookmarketel.com',
                    subject: `Account deletion scheduled: ${hotel.name || hotelId}`,
                    text: `${req.crmNativeEmail} scheduled deletion of ${hotelId} for ${scheduledFor.toISOString()}.`,
                }),
            ]);
        }
        res.json({ success: true, scheduledFor: deletion.scheduledFor });
    } catch (error) {
        console.error('account-deletion/request:', error.message);
        res.status(500).json({ success: false, message: 'Could not schedule account deletion.' });
    }
});

app.post('/api/crm/account-deletion/cancel', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { ownerEmail: true },
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });
        if (!requireNativeOwnerSession(req, res, hotel)) return;
        const deleted = await prisma.accountDeletionRequest.deleteMany({
            where: { hotelId, status: { not: 'processing' } },
        });
        if (!deleted.count) {
            const existingDeletion = await prisma.accountDeletionRequest.findUnique({ where: { hotelId } });
            if (existingDeletion?.status === 'processing') {
                return res.status(409).json({
                    success: false,
                    message: 'Account deletion is already being processed.',
                });
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('account-deletion/cancel:', error.message);
        res.status(500).json({ success: false, message: 'Could not cancel account deletion.' });
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
                message: 'Invalid revenue period. Use today, 7d, 30d, 90d, all, or custom.',
            });
        }

        let customStart = '';
        let customEnd = '';
        if (period === 'custom') {
            const first = normalizeIsoDate(req.query?.startDate);
            const second = normalizeIsoDate(req.query?.endDate);
            if (!first || !second) {
                return res.status(400).json({ success: false, message: 'Choose both custom revenue dates.' });
            }
            customStart = first <= second ? first : second;
            customEnd = first <= second ? second : first;
            const spanDays = Math.floor(
                (new Date(`${customEnd}T00:00:00.000Z`).getTime()
                    - new Date(`${customStart}T00:00:00.000Z`).getTime()) / 86400000
            ) + 1;
            if (spanDays > 5000) {
                return res.status(400).json({
                    success: false,
                    message: 'Custom revenue ranges cannot exceed 5,000 days.',
                });
            }
        }

        const referenceIso = getReportingTodayIso();
        const earliestIso = period === 'all'
            ? await getEarliestManualRevenueStartIso(hotelId)
            : period === 'custom' ? customStart : referenceIso;
        const latestIso = period === 'all'
            ? await getLatestManualRevenueEndIso(hotelId)
            : period === 'custom' ? customEnd : referenceIso;
            
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
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, data: { rooms: [], availability: {} } });
        }
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

        const existingRoom = await prisma.room.findUnique({
            where: { hotelId_name: { hotelId, name: roomName } },
            select: { id: true },
        });
        await saveRoomCatalogEntry({
            hotelId,
            roomId: existingRoom?.id || '',
            name: roomName,
            totalUnits: safeRoomUnits(totalUnits),
        });
        maybeNotifyRoomSoldOutToday(hotelId, roomName).catch(() => {});

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:rooms failed:', e.message);
        const status = e.code === 'ROOM_NAME_CONFLICT' ? 409 : 500;
        res.status(status).json({ success: false, message: e.message });
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

        const engineRoom = await prisma.room.findUnique({
            where: { hotelId_name: { hotelId, name: currentRoomName } },
            select: { id: true },
        });
        if (engineRoom) {
            await saveRoomCatalogEntry({
                hotelId,
                roomId: engineRoom.id,
                name: newRoomName,
                totalUnits: safeRoomUnits(totalUnits),
            });
        } else {
            // Preserve legacy inventory-only rooms and their overrides while
            // repairing the missing guest-facing Room row.
            await prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext('room-catalog'))`;
                const roomConflict = await tx.room.findUnique({
                    where: { hotelId_name: { hotelId, name: newRoomName } },
                    select: { id: true },
                });
                const manualConflict = await tx.manualRoom.findUnique({
                    where: { hotelId_name: { hotelId, name: newRoomName } },
                    select: { id: true },
                });
                if (roomConflict || (manualConflict && manualConflict.id !== room.id)) {
                    throw roomCatalogError('ROOM_NAME_CONFLICT', 'A room with this name already exists.');
                }
                const units = safeRoomUnits(totalUnits);
                await tx.manualRoom.update({ where: { id: room.id }, data: { name: newRoomName, totalUnits: units } });
                await tx.manualOverride.updateMany({
                    where: { roomId: room.id, availableUnits: { gt: units } },
                    data: { availableUnits: units },
                });
                const count = await tx.room.count({ where: { hotelId } });
                await tx.room.create({
                    data: { hotelId, name: newRoomName, totalUnits: units, maxOccupancy: 4, sortOrder: count },
                });
                await tx.booking.updateMany({
                    where: { hotelId, roomName: currentRoomName },
                    data: { roomName: newRoomName },
                });
                await tx.guestMessage.updateMany({
                    where: { hotelId, roomName: currentRoomName },
                    data: { roomName: newRoomName },
                });
            }, { maxWait: 5000, timeout: 15000 });
        }
        maybeNotifyRoomSoldOutToday(hotelId, newRoomName).catch(() => {});

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload });
    } catch (e) {
        console.error('manual-availability:rooms update failed:', e.message);
        const status = e.code === 'ROOM_NAME_CONFLICT' ? 409 : 500;
        res.status(status).json({ success: false, message: e.message });
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

        const deletion = await deleteRoomCatalogEntry({ hotelId, roomName: room.name });

        const rooms = await getManualRooms(hotelId);
        const payload = formatManualAvailabilityPayload(rooms);
        res.json({ success: true, data: payload, roomDeleteCount: deletion.deleted ? 1 : 0 });
    } catch (e) {
        console.error('manual-availability:rooms delete failed:', e.message);
        const status = e.code === 'ROOM_HAS_BOOKINGS' ? 409 : 500;
        res.status(status).json({ success: false, message: e.message });
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
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, rooms: [], rates: null });
        }
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

        const room = await saveRoomCatalogEntry({
            hotelId,
            roomId: id,
            name,
            description,
            amenities,
            maxOccupancy,
            totalUnits,
        });

        res.json({ success: true, room: { id: room.id, name: room.name } });
    } catch (e) {
        console.error('CRM rooms POST error:', e.message);
        const status = e.code === 'ROOM_NOT_FOUND' ? 404 : e.code === 'ROOM_NAME_CONFLICT' ? 409 : 500;
        const msg = e.code?.startsWith('ROOM_')
            ? e.message
            : e.message?.includes('Unique constraint') ? 'A room with that name already exists' : 'Failed to save room';
        res.status(status).json({ success: false, message: msg });
    }
});

// Delete a room
app.delete('/api/crm/rooms/:roomId', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        await deleteRoomCatalogEntry({ hotelId, roomId: req.params.roomId });
        res.json({ success: true });
    } catch (e) {
        console.error('CRM rooms DELETE error:', e.message);
        const status = e.code === 'ROOM_HAS_BOOKINGS' ? 409 : e.code === 'ROOM_NOT_FOUND' ? 404 : 500;
        res.status(status).json({
            success: false,
            message: e.code?.startsWith('ROOM_') ? e.message : 'Failed to delete room',
        });
    }
});

// Upload room image
app.post('/api/crm/rooms/:roomId/images', crmAuth, upload.single('image'), async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        req.hotelId = hotelId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No image file received' });
        const room = await withRetry(() => prisma.room.findFirst({
            where: { id: req.params.roomId, hotelId },
        }));
        if (!room) return res.status(404).json({ success: false, message: 'Room not found for this hotel' });
        const image = await saveOptimizedRoomImage(req, req.params.roomId);
        if (!image) return res.status(400).json({ success: false, message: 'Could not process image' });
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
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const image = await prisma.roomImage.findFirst({
            where: {
                id: req.params.imageId,
                roomId: req.params.roomId,
                room: { hotelId },
            },
            select: { id: true },
        });
        if (!image) return res.status(404).json({ success: false, message: 'Image not found' });
        await withRetry(() => prisma.roomImage.delete({ where: { id: image.id } }));
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

// Get bookings for CRM - last 7 days + all future (slim payload for list cards)
const CRM_BOOKING_LIST_SELECT = {
    id: true,
    createdAt: true,
    guestFirstName: true,
    guestLastName: true,
    guestEmail: true,
    guestPhone: true,
    roomName: true,
    checkinDate: true,
    checkoutDate: true,
    nights: true,
    grandTotal: true,
    bookingType: true,
    callStatus: true,
    notes: true,
    status: true,
    pendingUntil: true,
    approvalNoResponseAction: true,
    approvalOutcome: true,
    ownerReviewStatus: true,
    ownerReviewedAt: true,
    ownerReviewReminderCount: true,
    ownerReviewNextReminderAt: true,
};

const CRM_DECLINED_LEAD_LIST_SELECT = {
    id: true,
    createdAt: true,
    hotelId: true,
    guestFirstName: true,
    guestLastName: true,
    guestEmail: true,
    guestPhone: true,
    roomName: true,
    checkinDate: true,
    checkoutDate: true,
    nights: true,
    grandTotal: true,
    errorMessage: true,
};

function crmDeclinedLeadAsBooking(lead) {
    return {
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
        subtotal: lead.grandTotal * 0.85,
        taxesAndFees: lead.grandTotal * 0.15,
        callStatus: 'not-called',
        crmStage: 'new',
        notes: `PAYMENT DECLINED - ${lead.errorMessage || 'Card issue, verify payment method when calling'}`,
        paymentDeclined: true,
    };
}

async function getCrmBookingList(hotelId) {
    if (isStaticOnlyHotelId(hotelId)) return [];
    const [bookings, declinedLeads] = await Promise.all([
        withRetry(() => prisma.booking.findMany({
            select: CRM_BOOKING_LIST_SELECT,
            orderBy: { checkinDate: 'asc' },
            where: {
                hotelId,
                // Released/cancelled rows no longer hold a room, so they'd only
                // skew the call counts and calendar.
                status: ACTIVE_BOOKING_STATUS_FILTER,
                checkinDate: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        })),
        withRetry(() => prisma.paymentDeclinedLead.findMany({
            select: CRM_DECLINED_LEAD_LIST_SELECT,
            orderBy: { createdAt: 'desc' },
            where: {
                hotelId,
                called: false
            }
        })),
    ]);
    return [...bookings, ...declinedLeads.map(crmDeclinedLeadAsBooking)];
}

// One startup request replaces the sequential context → verification →
// bookings/availability chain. Secondary surfaces (messages, analytics,
// conflicts and push maintenance) intentionally load after first paint.
app.get('/api/crm/bootstrap', crmVerifyRateLimit, crmAuth, async (req, res) => {
    const startedAt = Date.now();
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const staticOnly = isStaticOnlyHotelId(hotelId);

        const [config, dbHotel, primaryDomain, manualRoomRows, bookings] = await Promise.all([
            resolveHotelConfig(hotelId),
            staticOnly ? Promise.resolve(null) : prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: {
                    name: true,
                    subtitle: true,
                    address: true,
                    phone: true,
                    cancellationPolicy: true,
                    theme: true,
                    appIconUrl: true,
                    subscribed: true,
                    setupToken: true,
                    ownerEmail: true,
                },
            }),
            staticOnly ? Promise.resolve(null) : prisma.hotelDomain.findFirst({
                where: { hotelId, isPrimary: true },
                select: { domain: true },
            }),
            staticOnly ? Promise.resolve([]) : getManualRooms(hotelId),
            getCrmBookingList(hotelId),
        ]);

        if (dbHotel?.setupToken) {
            // Analytics must never hold the owner on the splash screen.
            void (async () => {
                const opened = await prisma.funnelEvent.findFirst({
                    where: { hotelId, eventName: 'FrontDeskOpened' },
                    select: { id: true },
                }).catch(() => null);
                if (!opened) {
                    await prisma.funnelEvent.create({
                        data: {
                            hotelId,
                            eventName: 'FrontDeskOpened',
                            eventId: `marketel-frontdesk.${hotelId}`,
                            guestEmail: dbHotel.ownerEmail || null,
                        },
                    }).catch(() => {});
                }
            })();
        }

        const domain = primaryDomain?.domain || req.crmResolvedDomain || '';
        const responseConfig = {
            ...sanitizeConfigForResponse(config),
            name: dbHotel?.name || config.name || hotelId,
            appIconUrl: dbHotel?.appIconUrl || '',
        };
        const manualAvailability = formatManualAvailabilityPayload(manualRoomRows);
        res.set('Server-Timing', `bootstrap;dur=${Date.now() - startedAt}`);
        res.json({
            success: true,
            data: {
                context: {
                    hotelId,
                    domain,
                    config: responseConfig,
                    manualRooms: manualAvailability.rooms,
                },
                verification: {
                    success: true,
                    hotelId,
                    domain,
                    allowedHotels: req.crmAllowedHotels || [],
                    isMasterPin: !!req.crmIsMasterPin,
                    nativePreviewAccess: !!req.crmIsDogfoodPreview,
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
                },
                bookings,
                manualAvailability,
            },
        });
    } catch (e) {
        console.error('crm:bootstrap failed:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/crm/bookings', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const bookings = await getCrmBookingList(hotelId);
        res.json({ success: true, data: bookings });
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

        // Writing a walk-in over a room an online guest already holds is exactly
        // how a double-booking is born, so surface it now while the owner is still
        // looking at the screen rather than leaving them to find out at check-in.
        const conflicts = await findOversellConflicts(hotelId)
            .then(all => all.filter(c => c.roomName === roomName))
            .catch(() => []);

        res.json({ success: true, data: booking, conflicts });
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
// Lightweight unread count for message badges (no message bodies).
app.get('/api/crm/messages/unread-count', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, unread: 0 });
        }
        const unread = await withRetry(() => prisma.guestMessage.count({
            where: {
                hotelId,
                readAt: null,
                sender: { not: 'hotel' },
                createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
            },
        }));
        res.json({ success: true, unread });
    } catch (e) {
        console.error('CRM messages unread-count error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to load unread count' });
    }
});

// List guest messages for the Front Desk (recent first) + unread count.
app.get('/api/crm/messages', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, messages: [], unread: 0 });
        }
        const rows = await withRetry(() => prisma.guestMessage.findMany({
            where: { hotelId, createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }));
        const bookingIds = [...new Set(rows.map((message) => message.bookingId).filter(Boolean))];
        const threadBookings = bookingIds.length
            ? await withRetry(() => prisma.booking.findMany({
                where: { hotelId, id: { in: bookingIds } },
                select: { id: true, ourReservationCode: true, pmsConfirmationCode: true },
            }))
            : [];
        const bookingById = new Map(threadBookings.map((booking) => [booking.id, booking]));
        const messages = rows.map((m) => {
            let requests = [];
            try { requests = m.requests ? JSON.parse(m.requests) : []; } catch (_) { requests = []; }
            return {
                id: m.id,
                createdAt: m.createdAt,
                bookingId: m.bookingId,
                reservationCode: guestBookingThreadCode(bookingById.get(m.bookingId), m.reservationCode),
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

        const booking = await findGuestBooking(hotelId, reservationCode);
        const threadCodes = booking ? guestBookingThreadCodes(booking, reservationCode) : [reservationCode];
        const canonicalCode = booking ? guestBookingThreadCode(booking, reservationCode) : reservationCode;
        const latestMsg = await withRetry(() => prisma.guestMessage.findFirst({
            where: { hotelId, reservationCode: { in: threadCodes } },
            orderBy: { createdAt: 'desc' }
        }));

        const reply = await withRetry(() => prisma.guestMessage.create({
            data: {
                hotelId,
                reservationCode: canonicalCode,
                bookingId: latestMsg?.bookingId || null,
                guestName: latestMsg?.guestName || null,
                guestEmail: latestMsg?.guestEmail || null,
                guestPhone: latestMsg?.guestPhone || null,
                roomName: latestMsg?.roomName || null,
                body: body.trim(),
                sender: 'hotel',
                readAt: new Date(),
                guestReadAt: null,
            }
        }));

        // Notify the guest on their device if they subscribed for this thread.
        sendPushToGuests(hotelId, {
            title: 'New message from Front Desk',
            body: body.trim().slice(0, 160),
            url: '/guest/messages',
            icon: '/icon-192.png',
        }, { TTL: 60 * 60 }, 'guestReply', threadCodes).catch((e) => {
            console.error('guest reply push error:', e.message);
        });

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
    // Pre-check-in guest install reminders (12–36h before check-in)
    if (process.env.ENABLE_GUEST_INSTALL_REMINDERS !== 'false') {
        const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
        setTimeout(() => runGuestInstallReminders().catch((e) => console.error('Guest install reminders:', e.message)), 90_000);
        setInterval(() => runGuestInstallReminders().catch((e) => console.error('Guest install reminders:', e.message)), REMINDER_INTERVAL_MS);
    }

    // Auto-confirm bookings whose approval window elapsed. Runs on a short
    // interval because the window is minutes; a restart mid-window is harmless
    // since the query re-derives what's overdue from the database.
    if (process.env.ENABLE_BOOKING_APPROVAL_SWEEP !== 'false') {
        const sweep = () => runBookingApprovalSweep().catch((e) => console.error('Booking approval sweep:', e.message));
        setTimeout(sweep, 15_000);
        setInterval(sweep, BOOKING_APPROVAL_SWEEP_INTERVAL_MS);
    }

    if (process.env.ENABLE_BOOKING_REVIEW_REMINDERS !== 'false') {
        const reviewSweep = () => runBookingReviewReminderSweep()
            .catch((e) => console.error('Booking review reminder sweep:', e.message));
        setTimeout(reviewSweep, 20_000);
        setInterval(reviewSweep, BOOKING_REVIEW_SWEEP_INTERVAL_MS);
    }

    if (process.env.ENABLE_FRONTDESK_ASSISTANT !== 'false' && frontDeskAssistant) {
        const assistantSweep = () => frontDeskAssistant.runScheduledChecks()
            .catch((e) => console.error('Front Desk Assistant sweep:', e.message));
        setTimeout(assistantSweep, 30_000);
        setInterval(assistantSweep, 5 * 60 * 1000);
    }

    if (process.env.ENABLE_ACCOUNT_DELETION_SWEEP !== 'false') {
        const deletionSweep = () => runAccountDeletionSweep()
            .catch((e) => console.error('Account deletion sweep:', e.message));
        setTimeout(deletionSweep, 45_000);
        setInterval(deletionSweep, ACCOUNT_DELETION_SWEEP_MS);
    }
});
