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
// Publishable keys are public client configuration. Keep the current Guestel
// test account as a backend-owned fallback so a missing Render env value cannot
// take every test payment offline. Any env value overrides it, and the config
// endpoint below refuses to serve this fallback if the secret key belongs to a
// different account or switches to live mode.
const DEFAULT_GUESTEL_TEST_PUBLISHABLE_KEY = 'pk_test_51SPnS1E0TbujaKoz0PGmi1L3tcKmCkW56UCSuoM434SKYcvwSjejoaTkPEOYBfwS4Q2aTtvGvrIjuwOBtancDF0Q00iCBUbyNL';
const xml2js = require('xml2js');
const http = require('http');
const http2 = require('http2');
const https = require('https');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
const telemetry = require('./marketel-signal-extractor');
const { createFrontDeskAssistant } = require('./frontdesk-assistant');
const { buildFrontdeskReturnPath } = require('./frontdesk-return');
const { buildBookingQuote } = require('./booking-pricing');
const { buildPreauthIdempotencyKey } = require('./booking-idempotency');
const {
    bearerToken,
    createGuestPaymentToken,
    readGuestPaymentToken,
} = require('./guest-payment-access');
const {
    ensurePaymentMethodDomain,
    syncPaymentMethodDomains,
} = require('./stripe-payment-domains');
const {
    buildMarketelCapiEvent,
    marketelCapiRetryDelayMs,
    marketelMetaRequestContext,
} = require('./marketel-meta-capi');
const {
    createGuestIdentityToken,
    createReservationToken,
    readGuestIdentityToken,
    readReservationToken,
} = require('./guest-access');
const {
    buildStartPayload,
    buildUpdatePayload,
    buildEndPayload,
    liveActivityActionForBooking,
    liveActivityApnsHeaders,
} = require('./live-activities');

function safeReservationToken(booking) {
    if (booking?.guestAccessRevokedAt) return '';
    try { return createReservationToken(booking); }
    catch (error) {
        console.error('Guest reservation token unavailable:', error.message);
        return '';
    }
}

async function issueGuestAppHandoff(booking) {
    if (!booking?.id || !booking?.hotelId || !prisma.guestAppHandoff) return '';
    try {
        const token = crypto.randomBytes(24).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.guestAppHandoff.create({
            data: {
                tokenHash,
                bookingId: booking.id,
                hotelId: booking.hotelId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        // Opportunistic cleanup keeps this intentionally tiny table bounded.
        prisma.guestAppHandoff.deleteMany({
            where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }).catch(() => {});
        return token;
    } catch (error) {
        console.error('Guestel handoff creation failed:', error.message);
        return '';
    }
}

let frontDeskAssistant = null;

// Marketel CAPI (separate pixel for the onboarding funnel)
const MARKETEL_PIXEL_ID = process.env.MARKETEL_META_PIXEL_ID || '';
const MARKETEL_ACCESS_TOKEN = process.env.MARKETEL_META_ACCESS_TOKEN || '';
const MARKETEL_META_TEST_EVENT_CODE = String(process.env.MARKETEL_META_TEST_EVENT_CODE || '').trim();
const ENABLE_META_CAPI = process.env.ENABLE_META_CAPI !== 'false';
// Meta versions the Conversions API endpoint. Keep the version deploy-time
// configurable so an API sunset never requires a code change, while validating
// the value before it is interpolated into an outbound URL. v26.0 is the
// current Graph API release as of this implementation.
const MARKETEL_META_GRAPH_API_VERSION = (() => {
    const configured = String(process.env.MARKETEL_META_GRAPH_API_VERSION || 'v26.0').trim();
    const normalized = configured.startsWith('v') ? configured : `v${configured}`;
    return /^v\d{1,2}\.\d{1,2}$/.test(normalized) ? normalized : 'v26.0';
})();

async function sendMarketelCAPI(eventName, input = {}) {
    if (!ENABLE_META_CAPI || !MARKETEL_PIXEL_ID || !MARKETEL_ACCESS_TOKEN) {
        return { success: false, configured: false, error: 'Marketel Meta CAPI is not configured' };
    }
    try {
        const eventPayload = buildMarketelCapiEvent(eventName, input);
        const testEventCode = String(
            Object.prototype.hasOwnProperty.call(input, 'testEventCode')
                ? input.testEventCode
                : MARKETEL_META_TEST_EVENT_CODE
        ).trim();
        const response = await axios.post(
            `https://graph.facebook.com/${MARKETEL_META_GRAPH_API_VERSION}/${MARKETEL_PIXEL_ID}/events`,
            {
                data: [eventPayload],
                access_token: MARKETEL_ACCESS_TOKEN,
                ...(testEventCode ? { test_event_code: testEventCode } : {}),
            },
            { timeout: 12_000 }
        );
        const accepted = Number(response.data?.events_received) > 0;
        const result = {
            success: accepted,
            configured: true,
            testMode: !!testEventCode,
            eventsReceived: Number(response.data?.events_received) || 0,
            fbtraceId: String(response.data?.fbtrace_id || ''),
            eventId: eventPayload.event_id,
            ...(accepted ? {} : { error: 'Meta accepted zero events' }),
        };
        console.log(`✅ Marketel CAPI: ${eventName} ${accepted ? 'accepted' : 'returned zero events'}`, {
            eventId: eventPayload.event_id,
            testMode: !!testEventCode,
            eventsReceived: result.eventsReceived,
            fbtraceId: result.fbtraceId,
        });
        return result;
    } catch (e) {
        const error = String(e.response?.data?.error?.message || e.message || 'Meta request failed').slice(0, 500);
        console.error(`❌ Marketel CAPI ${eventName} failed:`, error);
        return {
            success: false,
            configured: true,
            testMode: !!String(
                Object.prototype.hasOwnProperty.call(input, 'testEventCode')
                    ? input.testEventCode
                    : MARKETEL_META_TEST_EVENT_CODE
            ).trim(),
            status: Number(e.response?.status) || null,
            error,
        };
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

async function sendSetupResumeEmail({ toEmail, hotelName, setupUrl }) {
    return sendMarketelLifecycleEmail({
        toEmail,
        subject: `Continue building ${hotelName || 'your Marketel'}`,
        template: 'setup-resume.html',
        replacements: {
            HOTEL_NAME: hotelName || 'your property',
            SETUP_URL: setupUrl,
        },
        text: `Your Marketel setup is saved.\n\nContinue where you left off: ${setupUrl}\n\nNo payment has been taken. Questions? Reply to this email.`,
    });
}

async function sendPreviewReadyEmail({ toEmail, hotelName, hotelId, domain, frontdeskUrl }) {
    return sendMarketelLifecycleEmail({
        toEmail,
        subject: `Your ${hotelName || 'Marketel'} preview is ready`,
        template: 'preview-ready.html',
        replacements: {
            HOTEL_NAME: hotelName || 'Your property',
            HOTEL_ID: hotelId,
            DOMAIN: domain,
            FRONTDESK_URL: frontdeskUrl,
        },
        text: `Your Marketel preview is ready.\n\nContinue your personalized walkthrough: ${frontdeskUrl}\nProperty ID: ${hotelId}\nBooking-page preview: https://${domain}\n\nThe booking page remains in preview mode until you activate Marketel.`,
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

function buildGuestelInvocationUrl({ hotelId, domain, intent = 'add', handoffToken, ref = 'email' }) {
    const params = new URLSearchParams({ p: 'com.bookmarketel.guestel.Clip' });
    if (domain) params.set('domain', domain);
    if (hotelId) params.set('hotelId', hotelId);
    if (intent) params.set('intent', intent);
    if (handoffToken) params.set('handoff', handoffToken);
    if (ref) params.set('ref', ref);
    return `https://appclip.apple.com/id?${params.toString()}`;
}

async function buildGuestInstallUrl(hotelId, code, req, ref = 'email') {
    const base = await buildGuestSiteBase(hotelId, req);
    let domain = '';
    try { domain = base ? new URL(base).hostname : ''; } catch (_) {}
    let handoffToken = '';
    if (code) {
        const booking = await prisma.booking.findFirst({
            where: {
                hotelId,
                OR: [{ ourReservationCode: code }, { pmsConfirmationCode: code }],
            },
        }).catch(() => null);
        if (booking) handoffToken = await issueGuestAppHandoff(booking);
    }
    return buildGuestelInvocationUrl({
        hotelId,
        domain,
        intent: handoffToken ? 'stay' : 'add',
        handoffToken,
        ref,
    });
}

function guestInstallEmailBlockHtml({ hotelName, installUrl }) {
    if (!installUrl) return '';
    const safeName = escapeXml(hotelName || 'your hotel');
    const safeInstallUrl = escapeXml(installUrl);
    return `<div style="background:linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%);border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:6px;">Keep ${safeName} in Guestel</div>
        <p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.55;">See stay updates, message the Front Desk, and book direct next time without searching again.</p>
        <a href="${safeInstallUrl}" style="display:inline-block;background:#ffffff;color:#1a5c3f;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:10px;">Open in Guestel →</a>
        <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:12px;line-height:1.5;">On iPhone, this opens the property through Apple’s Guestel App Clip.</div>
    </div>`;
}

async function notifyGuestBookingConfirmed({ req, hotelId, guestInfo, bookingDetails, reservationCode, messageId }) {
    if (!guestInfo?.email || guestInfo.email === '-') return true;
    const hotelForEmail = await prisma.hotelConfig.findUnique({
        where: { id: hotelId },
        select: { name: true, phone: true, ownerEmail: true },
    }).catch(() => null);
    const emailCode = reservationCode || bookingDetails?.reservationCode;
    const bookingUrl = await buildGuestBookingUrl(hotelId, emailCode, req);
    const installUrl = await buildGuestInstallUrl(hotelId, emailCode, req, 'confirmation-email');
    return sendGuestConfirmationEmail({
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
        replyTo: hotelForEmail?.ownerEmail || undefined,
        messageId,
    });
}

async function sendGuestConfirmationEmail({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, checkout, nights, total, reservationCode, bookingUrl, installUrl, replyTo, messageId }) {
    if (!emailTransporter || !guestEmail) return false;
    try {
        const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const checkoutStr = new Date(checkout).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const totalStr = total ? `$${Number(total).toFixed(2)}` : '';
        const safeGuestName = escapeXml(guestName || 'there');
        const safeHotelName = escapeXml(hotelName || 'Your Hotel');
        const safeRoomName = escapeXml(roomName || 'Room');
        const safeReservationCode = escapeXml(reservationCode || '');
        const safeBookingUrl = bookingUrl ? escapeXml(bookingUrl) : '';
        const phoneStr = hotelPhone ? ` — ${escapeXml(hotelPhone)}` : '.';

        const installBlock = guestInstallEmailBlockHtml({ hotelName, installUrl });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#2E7D5B;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Reservation Confirmed ✓</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Hi ${safeGuestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5;">Your reservation at <strong>${safeHotelName}</strong> is confirmed. Here are your details:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:20px;"><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Room</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${safeRoomName}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-in</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkinStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Check-out</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${checkoutStr}</div></td></tr><tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Nights</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${Number(nights) || 1}</div></td></tr>${totalStr ? `<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Total</div><div style="font-size:15px;font-weight:600;color:#2E7D5B;">${totalStr}</div></td></tr>` : ''}<tr><td style="padding:8px 16px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;">Confirmation #</div><div style="font-size:15px;font-weight:600;color:#1a1a2e;">${safeReservationCode}</div></td></tr></table>${installBlock}${safeBookingUrl ? `<div style="text-align:center;margin:0 0 20px;"><a href="${safeBookingUrl}" style="display:inline-block;background:#2E7D5B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:10px;">View my reservation</a><div style="font-size:11px;color:#9ca3af;margin-top:8px;">Message the front desk, add to your calendar, or book again anytime.</div></div>` : ''}<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">If you have any questions, contact the hotel directly${phoneStr}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: guestEmail,
            ...(replyTo ? { replyTo } : {}),
            ...(messageId ? { messageId } : {}),
            subject: `Reservation confirmed — ${hotelName}`,
            html,
        });
        console.log(`✅ Guest confirmation email sent to ${guestEmail}`);
        return true;
    } catch (e) {
        console.error('❌ Guest confirmation email failed:', e.message);
        return false;
    }
}

async function sendGuestInstallReminderEmail({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, installUrl, bookingUrl }) {
    if (!emailTransporter || !guestEmail || !installUrl) return false;
    try {
        const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const phoneStr = hotelPhone ? ` — ${hotelPhone}` : '.';
        const installBlock = guestInstallEmailBlockHtml({ hotelName, installUrl });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#1a2b22;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Check-in tomorrow at ${hotelName}</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${guestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">You're checking in <strong>${checkinStr}</strong>${roomName ? ` in <strong>${roomName}</strong>` : ''}. Keep <strong>${hotelName}</strong> in Guestel so stay updates, direct booking, and Front Desk messages stay together.</p>${installBlock}${bookingUrl ? `<div style="text-align:center;margin:0 0 16px;"><a href="${bookingUrl}" style="display:inline-block;background:#f3f4f6;color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;padding:11px 20px;border-radius:10px;">View reservation details</a></div>` : ''}<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Questions? Contact the hotel directly${phoneStr}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;
        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: guestEmail,
            subject: `Keep ${hotelName} in Guestel before check-in`,
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

/** Send pre-check-in Guestel reminders for bookings checking in within ~36 hours. */
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

        const installUrl = buildGuestelInvocationUrl({
            hotelId: b.hotelId,
            domain,
            intent: 'stay',
            handoffToken: await issueGuestAppHandoff(b),
            ref: 'checkin-reminder',
        });
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

// Web Push remains for the browser-based owner Front Desk and previously
// connected guest browsers. New guest installs use Guestel/APNs.
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
const GUESTEL_APNS_BUNDLE_ID = String(process.env.GUESTEL_APNS_BUNDLE_ID || 'com.bookmarketel.guestel').trim();
let APNS_PRIVATE_KEY_OBJECT = null;
if (APNS_PRIVATE_KEY) {
    try {
        APNS_PRIVATE_KEY_OBJECT = crypto.createPrivateKey(APNS_PRIVATE_KEY);
    } catch (error) {
        console.error(`❌ APNs private key is invalid: ${error.message}`);
    }
}
const APNS_AUTH_CONFIGURED = !!(APNS_TEAM_ID && APNS_KEY_ID && APNS_PRIVATE_KEY_OBJECT);
const APNS_CONFIGURED = !!(APNS_AUTH_CONFIGURED && APNS_BUNDLE_ID);
const GUESTEL_APNS_CONFIGURED = !!(APNS_AUTH_CONFIGURED && GUESTEL_APNS_BUNDLE_ID);
if (APNS_CONFIGURED) {
    console.log(`✅ Native iOS push configured for ${APNS_BUNDLE_ID}`);
}
if (GUESTEL_APNS_CONFIGURED) {
    console.log(`✅ Guestel iOS push configured for ${GUESTEL_APNS_BUNDLE_ID}`);
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

// Meta is an external delivery target, not the source of truth. Persist every
// Marketel server event before attempting delivery so a provider timeout or a
// Render restart cannot silently erase the conversion. FunnelEvent is already
// durable and carries the exact first-party matching context we need, so these
// three rows form a small outbox without another production migration.
const MARKETEL_CAPI_PENDING = 'MetaCapiPending';
const MARKETEL_CAPI_SENT = 'MetaCapiSent';
const MARKETEL_CAPI_FAILED = 'MetaCapiFailed';
const MARKETEL_CAPI_STATUS_NAMES = [MARKETEL_CAPI_PENDING, MARKETEL_CAPI_SENT, MARKETEL_CAPI_FAILED];
const MARKETEL_CAPI_MAX_ATTEMPTS = 8;
const marketelCapiDelivering = new Set();

function marketelMetaContext(req) {
    return marketelMetaRequestContext(req, getMetaCookies(req));
}

function marketelCapiMetadata(row) {
    return row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? row.metadata
        : {};
}

async function queueMarketelCAPI(eventName, input = {}) {
    const providerEventId = String(input.eventId || '').trim().slice(0, 160);
    if (!providerEventId) throw new Error(`A stable eventId is required for Marketel CAPI ${eventName}`);
    const testEventCode = String(input.testEventCode ?? MARKETEL_META_TEST_EVENT_CODE ?? '').trim().slice(0, 120);
    const now = new Date();
    const metadata = {
        provider: 'meta',
        metaEventName: String(eventName || '').trim().slice(0, 80),
        sourceUrl: String(input.sourceUrl || '').trim().slice(0, 500),
        fbp: String(input.fbp || '').trim().slice(0, 220),
        fbc: String(input.fbc || '').trim().slice(0, 220),
        attempts: 0,
        nextAttemptAt: now.toISOString(),
        eventTime: Math.max(1, Math.floor(Number(input.eventTime) || Date.now() / 1000)),
        testMode: !!testEventCode,
        ...(testEventCode ? { testEventCode } : {}),
    };

    const row = await prisma.$transaction(async (tx) => {
        // FunnelEvent.eventId predates the outbox and is not unique. A scoped
        // Postgres advisory lock gives this provider event exactly-once queueing
        // across concurrent Stripe webhook and browser-return requests.
        await tx.$queryRaw`SELECT 1 AS "locked" FROM pg_advisory_xact_lock(hashtext(${providerEventId}))`;
        const existing = await tx.funnelEvent.findFirst({
            where: { eventId: providerEventId, eventName: { in: MARKETEL_CAPI_STATUS_NAMES } },
            orderBy: { createdAt: 'desc' },
        });
        if (existing) return existing;
        return tx.funnelEvent.create({
            data: {
                hotelId: String(input.hotelId || input.externalId || 'marketel-capi-system').trim().slice(0, 180),
                eventName: MARKETEL_CAPI_PENDING,
                eventId: providerEventId,
                occurredAt: now,
                surface: 'server',
                pagePath: '/meta/capi',
                metadata,
                value: Number.isFinite(Number(input.value)) ? Number(input.value) : null,
                currency: String(input.currency || 'USD').trim().slice(0, 3).toUpperCase(),
                contentName: String(input.contentName || '').trim().slice(0, 500) || null,
                guestEmail: String(input.email || '').trim().slice(0, 320) || null,
                guestPhone: String(input.phone || '').trim().slice(0, 80) || null,
                externalId: String(input.externalId || '').trim().slice(0, 180) || null,
                userAgent: String(input.userAgent || '').trim().slice(0, 500) || null,
                ipAddress: String(input.ip || '').trim().slice(0, 100) || null,
            },
        });
    });

    if (row.eventName === MARKETEL_CAPI_PENDING) {
        setImmediate(() => deliverMarketelCapiRow(row.id).catch((error) => {
            console.error('Marketel CAPI immediate delivery failed:', error.message);
        }));
    }
    return { queued: true, id: row.id, status: row.eventName, eventId: providerEventId };
}

async function deliverMarketelCapiRow(id) {
    if (!id || marketelCapiDelivering.has(id)) return;
    marketelCapiDelivering.add(id);
    try {
        const row = await prisma.funnelEvent.findUnique({ where: { id } });
        if (!row || row.eventName !== MARKETEL_CAPI_PENDING) return;
        const metadata = marketelCapiMetadata(row);
        const nextAttemptAt = new Date(metadata.nextAttemptAt || 0);
        if (Number.isFinite(nextAttemptAt.getTime()) && nextAttemptAt > new Date()) return;
        const attempts = Math.max(0, Number(metadata.attempts) || 0) + 1;
        const result = await sendMarketelCAPI(metadata.metaEventName, {
            hotelId: row.hotelId,
            email: row.guestEmail || '',
            phone: row.guestPhone || '',
            externalId: row.externalId || row.hotelId,
            ip: row.ipAddress || '',
            userAgent: row.userAgent || '',
            sourceUrl: metadata.sourceUrl || '',
            fbp: metadata.fbp || '',
            fbc: metadata.fbc || '',
            value: row.value,
            currency: row.currency || 'USD',
            contentName: row.contentName || '',
            eventId: row.eventId,
            eventTime: metadata.eventTime,
            // Preserve the routing decision made when the event was queued. A
            // test event must never become production merely because an env
            // variable was removed before its retry.
            testEventCode: metadata.testMode ? metadata.testEventCode || '' : '',
        });
        const deliveredAt = new Date();
        if (result.success) {
            await prisma.funnelEvent.update({
                where: { id },
                data: {
                    eventName: MARKETEL_CAPI_SENT,
                    metadata: {
                        ...metadata,
                        attempts,
                        nextAttemptAt: null,
                        deliveredAt: deliveredAt.toISOString(),
                        eventsReceived: result.eventsReceived,
                        fbtraceId: result.fbtraceId || '',
                        lastError: null,
                    },
                },
            });
            return;
        }

        const permanentlyFailed = attempts >= MARKETEL_CAPI_MAX_ATTEMPTS;
        const nextAttempt = new Date(Date.now() + marketelCapiRetryDelayMs(attempts));
        await prisma.funnelEvent.update({
            where: { id },
            data: {
                eventName: permanentlyFailed ? MARKETEL_CAPI_FAILED : MARKETEL_CAPI_PENDING,
                metadata: {
                    ...metadata,
                    attempts,
                    nextAttemptAt: permanentlyFailed ? null : nextAttempt.toISOString(),
                    lastAttemptAt: deliveredAt.toISOString(),
                    lastError: String(result.error || 'Meta delivery failed').slice(0, 500),
                    httpStatus: result.status || null,
                },
            },
        });
    } finally {
        marketelCapiDelivering.delete(id);
    }
}

async function runMarketelCapiDeliverySweep() {
    const pending = await prisma.funnelEvent.findMany({
        where: { eventName: MARKETEL_CAPI_PENDING },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, metadata: true },
    });
    const now = Date.now();
    const due = pending.filter((row) => {
        const timestamp = new Date(marketelCapiMetadata(row).nextAttemptAt || 0).getTime();
        return !Number.isFinite(timestamp) || timestamp <= now;
    });
    for (let offset = 0; offset < due.length; offset += 4) {
        await Promise.all(due.slice(offset, offset + 4).map((row) => deliverMarketelCapiRow(row.id)));
    }
    return { pending: pending.length, attempted: due.length };
}

// Keepalive ping so connection never goes idle (Supabase drops ~5 min).
// Unref keeps one-off maintenance/test scripts that import this module from
// hanging after their actual work is complete.
const prismaKeepaliveTimer = setInterval(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        // silent - just keeping connection warm
    }
}, 2 * 60 * 1000); // ping every 2 minutes (well under Supabase's ~5 min timeout)
prismaKeepaliveTimer.unref?.();

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

// Apple App Site Association — served explicitly because express.static ignores
// dotfile dirs (.well-known) by default. Required for the Guestel App Clip to be
// invocable from bookmarketel.com (appclips) and for Universal Links.
const APPLE_APP_SITE_ASSOCIATION = {
    appclips: { apps: ['YAS2Z7ZY3M.com.bookmarketel.guestel.Clip'] },
    applinks: {
        details: [{
            appIDs: ['YAS2Z7ZY3M.com.bookmarketel.guestel'],
            components: [{ '/': '/clip/*', comment: 'Open a hotel directly in Guestel' }],
        }],
    },
};
function serveAppSiteAssociation(_req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(JSON.stringify(APPLE_APP_SITE_ASSOCIATION));
}
app.get('/.well-known/apple-app-site-association', serveAppSiteAssociation);
app.get('/apple-app-site-association', serveAppSiteAssociation);

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

function frontdeskReturnHtml({ token = '', hotelId = '', activated = false, reveal = '', checkoutCancelled = false } = {}) {
    const cleanToken = String(token || '').trim();
    const nextPath = buildFrontdeskReturnPath({ hotelId, activated, reveal, checkoutCancelled });
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening Front Desk...</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f8f5;color:#1a2b22}.box{text-align:center;padding:24px}.mark{width:38px;height:38px;margin:0 auto 14px;border-radius:50%;border:4px solid #d8e4dc;border-top-color:#2E7D5B;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.title{font-size:15px;font-weight:800}.sub{margin-top:6px;font-size:12px;color:#66756c}</style></head><body><div class="box"><div class="mark"></div><div class="title">Opening Front Desk</div><div class="sub">Finishing activation...</div></div><script>!function(){var embedded=${JSON.stringify(cleanToken)};var fragment=new URLSearchParams(location.hash.slice(1));var token=embedded||fragment.get("pin")||fragment.get("returnToken")||"";var next=${JSON.stringify(nextPath)};try{console.info("[FrontDesk return] bridge loaded",{hasToken:!!token,tokenKind:token&&token.indexOf("fd_")===0?"return-token":token?"pin":"none"});}catch(e){}try{if(token){localStorage.setItem("crmToken",token);document.cookie="frontdeskReturnToken="+encodeURIComponent(token)+"; path=/; max-age=86400; SameSite=Lax; Secure";}}catch(e){try{console.warn("[FrontDesk return] token storage failed",e&&e.message?e.message:e);}catch(_){}}location.replace(next);}();</script></body></html>`;
}

function redactFrontdeskAuthUrl(url) {
    return String(url || '').replace(/([?&#](?:returnToken|pin)=)[^&#]+/g, '$1[redacted]');
}

app.get('/frontdesk-return', (req, res) => {
    // Query-token support remains for old emailed links. New activation and
    // cancellation redirects put credentials in the URL fragment, which is
    // never sent to servers, logs, Stripe, analytics or Referer headers.
    const token = String(req.query.pin || req.query.returnToken || '').trim();
    const hotelId = String(req.query.hotelId || '').trim();
    const activated = String(req.query.activated || '') === '1';
    const checkoutCancelled = String(req.query.checkoutCancelled || '') === '1';
    const requestedReveal = String(req.query.reveal || '').trim();
    const reveal = requestedReveal === 'checkout'
        || requestedReveal === '1'
        || /^step-[0-2]$/.test(requestedReveal)
        ? requestedReveal
        : '';
    res.setHeader('Cache-Control', 'no-store');
    console.log('frontdesk-return bridge served:', {
        host: req.get('host'),
        hasToken: !!token,
        tokenKind: token.startsWith('fd_') ? 'return-token' : (token ? 'pin' : 'none'),
        hotelId,
        activated,
        reveal,
        checkoutCancelled,
    });
    res.send(frontdeskReturnHtml({ token, hotelId, activated, reveal, checkoutCancelled }));
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
        bookingRates: { nightly: 69, weekly: 299, monthly: 999, taxRate: 0.10 },
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
        bookingRates: { nightly: 69, weekly: 299, monthly: 1099, taxRate: 0.10 },
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
        bookingRates: { nightly: 69, weekly: 299, monthly: 999, taxRate: 0.10 },
        // Manual front-desk managed availability (simple-crm.html)
        roomIDMapping: {}
    },
    'st-croix-wisconsin': {
        pms: 'bookingcenter',
        bookingRates: { nightly: 72, weekly: 301, monthly: 999, taxRate: 0.10 },
        bookingRoomNames: ['Queen Suite', '2 Queen Suite'],
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
    
    // Prisma returns date-only hotel fields as UTC-midnight Date objects.
    // Reading local components in a western timezone silently moves them to
    // the previous day; preserve the stored calendar date instead.
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
    return snapshot.totalCents !== null && snapshot.totalCents > 0
        ? [snapshot.totalCents]
        : [];
}

async function getServerBookingQuote(hotelId, bookingDetails = {}) {
    const cleanHotelId = String(hotelId || '').trim();
    const roomName = String(bookingDetails.roomName || bookingDetails.name || '').trim();
    if (!cleanHotelId || !roomName) {
        const error = new Error('A valid property and room are required.');
        error.status = 400;
        throw error;
    }

    let [rates, room] = await Promise.all([
        withRetry(() => prisma.hotelRates.findUnique({ where: { hotelId: cleanHotelId } })),
        withRetry(() => prisma.room.findFirst({
            where: { hotelId: cleanHotelId, name: roomName },
            select: { id: true, name: true },
        })),
    ]);
    if ((!rates || !room) && isStaticOnlyHotelId(cleanHotelId)) {
        const staticConfig = hotelConfig[cleanHotelId] || {};
        rates ||= staticConfig.bookingRates || null;
        const allowedRoomNames = new Set([
            ...Object.keys(staticConfig.roomIDMapping || {}),
            ...(staticConfig.bookingRoomNames || []),
        ]);
        if (!room && allowedRoomNames.has(roomName)) room = { name: roomName };
    }
    if (!room) {
        const error = new Error('That room is not part of this property.');
        error.status = 400;
        throw error;
    }
    if (!rates) {
        const error = new Error('Online payment pricing is not configured for this property.');
        error.status = 409;
        throw error;
    }

    const quote = buildBookingQuote({
        checkin: bookingDetails.checkin,
        checkout: bookingDetails.checkout,
        rates,
    });
    if (!quote) {
        const error = new Error('Choose a valid stay between 1 and 180 nights.');
        error.status = 400;
        throw error;
    }

    return {
        ...quote,
        bookingDetails: {
            ...bookingDetails,
            name: room.name,
            roomName: room.name,
            // Manual properties do not have external PMS rate identifiers, but
            // an authorized booking still needs a stable server-owned snapshot.
            roomTypeID: bookingDetails.roomTypeID || `manual-${room.id || slugifyText(room.name)}`,
            rateID: bookingDetails.rateID || `manual-${room.id || slugifyText(room.name)}`,
            nights: quote.nights,
            subtotal: quote.subtotal,
            taxes: quote.taxes,
            total: quote.total,
            amountPaidNow: quote.total,
            amountDueAtArrival: 0,
            bookingType: 'standard',
        },
    };
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
                source: 'source' in bookingData ? normalizeBookingSource(bookingData.source) : undefined,
                returnOfferApplied: bookingData.returnOfferApplied === true,
                inventoryOverrideDates: consumedOverrideDates.length
                    ? JSON.stringify(consumedOverrideDates)
                    : null,
            },
        });
        if (String(booking.status || '').toLowerCase() === 'confirmed') {
            await enqueueBookingSideEffectsTx(tx, booking, ['confirmation_email']);
        }
        return { booking, created: true };
    }, { maxWait: 5000, timeout: 15000 });
}

// Attribution for the Guestel rebooking loop. Only a known set is stored; any
// other/absent value becomes null (untagged) so a client can't invent sources.
const BOOKING_SOURCES = new Set(['guestel_native', 'app_clip', 'rebook', 'web']);
function normalizeBookingSource(value) {
    const v = String(value || '').trim().toLowerCase();
    return BOOKING_SOURCES.has(v) ? v : null;
}

async function createBookingRecordWithConfirmation(bookingData) {
    const data = { ...bookingData };
    // Sanitize loop-attribution fields at the single create chokepoint, so every
    // path records a trustworthy source and offer-redemption flag.
    if ('source' in data) data.source = normalizeBookingSource(data.source);
    if ('returnOfferApplied' in data) data.returnOfferApplied = data.returnOfferApplied === true;
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({ data });
        await enqueueBookingSideEffectsTx(tx, booking, ['confirmation_email']);
        return booking;
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

    const [bookings, manualRooms, declinedLeads, guestHistory] = await Promise.all([
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
                source: true,
                returnOfferApplied: true,
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
        // Full guest history for this property, so a booking in the window can
        // be recognized as a *returning* guest (an earlier stay exists).
        withRetry(() => prisma.booking.findMany({
            where: { hotelId, status: ACTIVE_BOOKING_STATUS_FILTER },
            select: { guestEmail: true, guestPhone: true, checkinDate: true },
        })),
    ]);

    const recoveredLeadKeys = new Set();
    for (const lead of declinedLeads) {
        for (const key of buildRevenueRecoveryKeys(lead)) {
            recoveredLeadKeys.add(key);
        }
    }

    // Earliest check-in per guest (by email, else phone). A window booking whose
    // guest first stayed before it is a returning guest — the Guestel loop working.
    const guestFirstStayIso = new Map();
    const guestKeyOf = (b) => {
        const email = String(b.guestEmail || '').trim().toLowerCase();
        if (email) return `e:${email}`;
        const phone = String(b.guestPhone || '').replace(/\D/g, '');
        return phone ? `p:${phone}` : '';
    };
    for (const b of guestHistory) {
        const key = guestKeyOf(b);
        const iso = normalizeIsoDate(b.checkinDate);
        if (!key || !iso) continue;
        const prev = guestFirstStayIso.get(key);
        if (!prev || iso < prev) guestFirstStayIso.set(key, iso);
    }
    const GUESTEL_SOURCES = new Set(['guestel_native', 'app_clip', 'rebook']);
    const repeatGuestKeys = new Set();
    let guestelBookings = 0;
    let offerRedemptions = 0;

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

        // Guestel-loop cuts: attributed source, returning guest, offer redemption.
        if (GUESTEL_SOURCES.has(String(booking.source || '').trim().toLowerCase())) {
            guestelBookings += 1;
        }
        if (booking.returnOfferApplied) {
            offerRedemptions += 1;
        }
        const guestKey = guestKeyOf(booking);
        const firstStay = guestKey ? guestFirstStayIso.get(guestKey) : null;
        if (guestKey && firstStay && firstStay < checkinIso) {
            repeatGuestKeys.add(guestKey);
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
            repeatGuests: repeatGuestKeys.size,
            guestelBookings,
            offerRedemptions,
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

function guestNativeDeviceScope(req) {
    const material = [
        bearerToken(req),
        ...(Array.isArray(req.body?.reservationTokens) ? req.body.reservationTokens.slice(0, 100) : []),
        String(req.body?.handoffToken || ''),
    ].filter(Boolean).sort().join('|');
    return material ? crypto.createHash('sha256').update(material).digest('hex').slice(0, 32) : 'anonymous';
}

const createPaymentIntentRateLimit = createRouteRateLimiter('create-payment-intent', { windowMs: 60 * 1000, max: 15 });
const createPreauthHoldRateLimit = createRouteRateLimiter('create-preauth-hold', { windowMs: 60 * 1000, max: 12 });
const guestPaymentSetupRateLimit = createRouteRateLimiter('guest-payment-setup', { windowMs: 5 * 60 * 1000, max: 8 });
const guestPaymentReadRateLimit = createRouteRateLimiter('guest-payment-read', { windowMs: 60 * 1000, max: 20 });
const guestPaymentSessionRateLimit = createRouteRateLimiter('guest-payment-session', { windowMs: 60 * 1000, max: 12 });
const guestPaymentDetachRateLimit = createRouteRateLimiter('guest-payment-detach', { windowMs: 5 * 60 * 1000, max: 10 });
const completePayLaterRateLimit = createRouteRateLimiter('complete-pay-later-booking', { windowMs: 60 * 1000, max: 12 });
const publicBookingRateLimit = createRouteRateLimiter('book', { windowMs: 60 * 1000, max: 12 });
const availabilityRateLimit = createRouteRateLimiter('availability', {
    windowMs: 5 * 60 * 1000,
    max: 80,
    scope: req => req.body?.hotelId,
});
const paymentDeclinedRateLimit = createRouteRateLimiter('payment-declined', { windowMs: 60 * 1000, max: 10 });
const crmVerifyRateLimit = createRouteRateLimiter('crm-verify', { windowMs: 5 * 60 * 1000, max: 10 });
// Bootstrap runs on every Front Desk load, so it cannot share the PIN check's
// anti-brute-force budget — walking the funnel and reloading the reveal a few
// times exhausted all ten and locked the owner out of their own property. It is
// already behind crmAuth, which authorises the token against the hotel being
// requested, so the ceiling here is only about runaway clients.
const crmBootstrapRateLimit = createRouteRateLimiter('crm-bootstrap', {
    windowMs: 5 * 60 * 1000,
    max: 60,
    scope: (req) => String(req.query?.hotelId || '').trim().toLowerCase(),
});
const funnelOnboardingRateLimit = createRouteRateLimiter('marketel-onboarding', { windowMs: 60 * 1000, max: 40 });
const journeyEventRateLimit = createRouteRateLimiter('marketel-journey', { windowMs: 60 * 1000, max: 180 });
const setupStartRateLimit = createRouteRateLimiter('marketel-setup-start', { windowMs: 15 * 60 * 1000, max: 8 });
const magicLinkRateLimit = createRouteRateLimiter('marketel-magic-link', {
    windowMs: 15 * 60 * 1000,
    max: 5,
    scope: req => String(req.body?.email || '').trim().toLowerCase(),
});
const nativeCodeRequestRateLimit = createRouteRateLimiter('native-code-request', { windowMs: 15 * 60 * 1000, max: 6 });
const nativeCodeVerifyRateLimit = createRouteRateLimiter('native-code-verify', { windowMs: 15 * 60 * 1000, max: 12 });
const guestCodeRequestRateLimit = createRouteRateLimiter('guest-code-request', { windowMs: 15 * 60 * 1000, max: 6 });
const guestCodeVerifyRateLimit = createRouteRateLimiter('guest-code-verify', { windowMs: 15 * 60 * 1000, max: 12 });
const guestWalletRateLimit = createRouteRateLimiter('guest-wallet', { windowMs: 60 * 1000, max: 30 });
const guestHandoffRateLimit = createRouteRateLimiter('guest-handoff', { windowMs: 5 * 60 * 1000, max: 12, scope: guestNativeDeviceScope });
const guestHandoffGlobalRateLimit = createRouteRateLimiter('guest-handoff-global', { windowMs: 5 * 60 * 1000, max: 600 });
const guestConversationsRateLimit = createRouteRateLimiter('guest-conversations', { windowMs: 5 * 60 * 1000, max: 30, scope: guestNativeDeviceScope });
const guestConversationsGlobalRateLimit = createRouteRateLimiter('guest-conversations-global', { windowMs: 5 * 60 * 1000, max: 1200 });
const guestNativePushRateLimit = createRouteRateLimiter('guest-native-push', { windowMs: 5 * 60 * 1000, max: 30 });
const forgotPinRateLimit = createRouteRateLimiter('forgot-pin', {
    windowMs: 15 * 60 * 1000,
    max: 3,
    scope: req => String(req.body?.email || '').trim().toLowerCase(),
});
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
// Guest polling buckets must isolate one *device*, not one property. Scoping on
// hotelId alone collides behind NAT: every guest on the property's wifi shares
// one egress IP, so two in-stay guests would exhaust a hotel-wide bucket and the
// rest would sit on stale reservation state. The connected reservation codes are
// the stable per-guest discriminator the request already carries.
function guestStaySyncScope(req) {
    const hotelId = String(req.body?.hotelId || '').trim().toLowerCase();
    const codes = Array.isArray(req.body?.stays)
        ? req.body.stays
            .map((stay) => String(stay?.code || '').trim().toLowerCase())
            .filter(Boolean)
            .sort()
        : [];
    return `${hotelId}:${codes.join(',')}`;
}

const guestUnreadSyncRateLimit = createRouteRateLimiter('guest-unread-sync', {
    windowMs: 5 * 60 * 1000,
    max: 30,
    scope: guestStaySyncScope,
});
const guestUnreadSyncGlobalRateLimit = createRouteRateLimiter('guest-unread-sync-global', { windowMs: 5 * 60 * 1000, max: 300 });
const guestPushSubscribeRateLimit = createRouteRateLimiter('guest-push-subscribe', {
    windowMs: 5 * 60 * 1000,
    max: 8,
    scope: (req) => req.body?.reservationCode,
});
const guestPushSubscribeGlobalRateLimit = createRouteRateLimiter('guest-push-subscribe-global', { windowMs: 5 * 60 * 1000, max: 60 });
const guestBookingLookupRateLimit = createRouteRateLimiter('guest-booking-lookup', { windowMs: 5 * 60 * 1000, max: 60 });
const guestBookingSyncRateLimit = createRouteRateLimiter('guest-booking-sync', {
    windowMs: 5 * 60 * 1000,
    max: 40,
    scope: guestStaySyncScope,
});
const guestBookingSyncGlobalRateLimit = createRouteRateLimiter('guest-booking-sync-global', { windowMs: 5 * 60 * 1000, max: 300 });

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

function guestBookingPayload(booking, suppliedCode = '') {
    return {
        reservationCode: guestBookingThreadCode(booking, suppliedCode),
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
        amountPaidNow: booking.amountPaidNow,
        status: booking.status,
        bookingType: booking.bookingType,
        holdStatus: booking.holdStatus,
        pendingUntil: booking.pendingUntil,
        approvalNoResponseAction: booking.approvalNoResponseAction,
        approvalOutcome: booking.approvalOutcome,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
        fulfillmentStatus: booking.fulfillmentStatus,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
    };
}

function absolutePublicAssetUrl(req, value) {
    const clean = String(value || '').trim();
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${req.protocol}://${req.get('host')}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

async function guestHotelPayload(hotelId, req) {
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: hotelId },
        select: {
            name: true,
            subtitle: true,
            address: true,
            phone: true,
            appIconUrl: true,
            checkInTime: true,
            checkOutTime: true,
            cancellationPolicy: true,
        },
    }).catch(() => null);
    if (!hotel) return null;
    return {
        name: hotel.name || '',
        subtitle: hotel.subtitle || '',
        address: hotel.address || '',
        phone: hotel.phone || '',
        appIconUrl: absolutePublicAssetUrl(req, hotel.appIconUrl),
        checkInTime: hotel.checkInTime || '',
        checkOutTime: hotel.checkOutTime || '',
        cancellationPolicy: hotel.cancellationPolicy || '',
    };
}

const EXTERNAL_PMS_RECONCILIATION_LOOKBACK_SECONDS = 3 * 24 * 60 * 60;

function externalPmsReceipt(paymentIntent, expectedProvider = '') {
    const metadata = paymentIntent?.metadata || {};
    const provider = String(metadata.externalPmsProvider || '').trim().toLowerCase();
    const reservationId = String(metadata.externalPmsReservationId || '').trim();
    if (!provider || !reservationId) return null;
    if (expectedProvider && provider !== String(expectedProvider).trim().toLowerCase()) return null;
    return { provider, reservationId, state: String(metadata.externalPmsState || '').trim().toLowerCase() };
}

async function updateExternalPmsReceipt(paymentIntentId, data) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            return await stripe.paymentIntents.update(paymentIntentId, {
                metadata: {
                    externalPmsProvider: String(data.provider || '').trim().toLowerCase(),
                    externalPmsReservationId: String(data.reservationId || '').trim(),
                    externalPmsState: String(data.state || 'pms_created').trim().toLowerCase(),
                },
            });
        } catch (error) {
            lastError = error;
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 350));
        }
    }
    throw lastError || new Error('Could not persist external PMS receipt.');
}

async function persistExternalPayLaterBooking({
    paymentIntent,
    provider,
    reservationId,
    hotelId,
    bookingDetails,
    guestInfo,
}) {
    const existing = await withRetry(() => prisma.booking.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
    }));
    if (existing) {
        await updateExternalPmsReceipt(paymentIntent.id, {
            provider,
            reservationId,
            state: 'recorded',
        }).catch(error => console.error('Could not mark external PMS receipt recorded:', error.message));
        return { booking: existing, created: false };
    }

    const holdStatus = String(paymentIntent.status || '').trim().toLowerCase() === 'succeeded'
        ? 'captured'
        : 'active';
    let savedBooking;
    try {
        savedBooking = await withRetry(() => createBookingRecordWithConfirmation({
            stripePaymentIntentId: paymentIntent.id,
            ourReservationCode: bookingDetails.reservationCode,
            pmsConfirmationCode: reservationId,
            hotelId,
            roomName: bookingDetails.name || bookingDetails.roomName,
            bookingType: 'payLater',
            source: bookingDetails.source,
            returnOfferApplied: bookingDetails.returnOfferApplied,
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
            holdStatus,
            noShowFeePaid: holdStatus === 'captured',
            holdCapturedAt: holdStatus === 'captured' ? new Date() : null,
        }));
    } catch (error) {
        if (error?.code !== 'P2002') throw error;
        savedBooking = await withRetry(() => prisma.booking.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    { ourReservationCode: bookingDetails.reservationCode },
                ],
            },
        }));
        if (!savedBooking) throw error;
        await updateExternalPmsReceipt(paymentIntent.id, {
            provider,
            reservationId,
            state: 'recorded',
        }).catch(markError => console.error('Could not mark duplicate external PMS receipt recorded:', markError.message));
        return { booking: savedBooking, created: false };
    }

    await updateExternalPmsReceipt(paymentIntent.id, {
        provider,
        reservationId,
        state: 'recorded',
    }).catch(error => console.error('Could not mark external PMS receipt recorded:', error.message));
    triggerBookingNotifications(
        hotelId,
        [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null,
        bookingDetails.name || bookingDetails.roomName,
        bookingDetails.total,
        bookingDetails.checkin,
        guestInfo.email,
        savedBooking.id
    );
    runBookingSideEffectSweep({ bookingId: savedBooking.id, limit: 5 }).catch(() => {});
    return { booking: savedBooking, created: true };
}

async function reconcileExternalPmsPaymentIntent(paymentIntent) {
    const receipt = externalPmsReceipt(paymentIntent);
    if (!receipt || receipt.state !== 'pms_created') return { skipped: true };

    const snapshot = getStripeIntentSnapshot(paymentIntent);
    const bookingDetails = parseJsonObject(paymentIntent.metadata?.bookingDetails);
    const guestInfo = parseJsonObject(paymentIntent.metadata?.guestInfo);
    if (
        snapshot.holdType !== 'pre_authorization'
        || !snapshot.hotelId
        || !bookingDetails?.reservationCode
        || !bookingDetails?.roomName
        || !guestInfo?.email
    ) {
        throw new Error(`External PMS receipt ${paymentIntent.id} is missing booking metadata.`);
    }
    const config = await resolveHotelConfig(snapshot.hotelId);
    if (config.pms !== receipt.provider) {
        throw new Error(`External PMS receipt ${paymentIntent.id} does not match the property provider.`);
    }

    return persistExternalPayLaterBooking({
        paymentIntent,
        provider: receipt.provider,
        reservationId: receipt.reservationId,
        hotelId: snapshot.hotelId,
        bookingDetails,
        guestInfo,
    });
}

async function runExternalPmsReconciliation() {
    const createdAfter = Math.floor(Date.now() / 1000) - EXTERNAL_PMS_RECONCILIATION_LOOKBACK_SECONDS;
    const pending = [];
    let startingAfter = '';
    for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
        const page = await stripe.paymentIntents.list({
            created: { gte: createdAfter },
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        pending.push(...page.data.filter(intent => externalPmsReceipt(intent)?.state === 'pms_created'));
        if (!page.has_more || !page.data.length) break;
        startingAfter = page.data[page.data.length - 1].id;
    }
    let recovered = 0;
    for (const paymentIntent of pending) {
        try {
            const outcome = await reconcileExternalPmsPaymentIntent(paymentIntent);
            if (outcome?.booking) recovered += 1;
        } catch (error) {
            console.error(`External PMS reconciliation failed for ${paymentIntent.id}:`, error.message);
        }
    }
    if (recovered) console.log(`✅ External PMS reconciliation recorded ${recovered} booking(s).`);
    return { checked: pending.length, recovered };
}

async function persistManualPayLaterBooking({ paymentIntent, hotelId, bookingDetails, guestInfo, config }) {
    const pmsResponse = await createManualBooking(hotelId, bookingDetails);
    const approvalPlan = await resolveBookingApprovalPlan(config);
    const holdStatus = String(paymentIntent.status || '').trim().toLowerCase() === 'succeeded'
        ? 'captured'
        : 'active';
    const outcome = await createManualBookingRecordWithInventory(hotelId, {
        stripePaymentIntentId: paymentIntent.id,
        ourReservationCode: bookingDetails.reservationCode || pmsResponse.reservationID,
        pmsConfirmationCode: pmsResponse.reservationID,
        hotelId,
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
        holdStatus,
        noShowFeePaid: holdStatus === 'captured',
        holdCapturedAt: holdStatus === 'captured' ? new Date() : null,
        ...bookingApprovalCreateFields(approvalPlan),
    });

    if (outcome.created) {
        if (approvalPlan.hold) {
            notifyBookingNeedsApproval(outcome.booking).catch(() => {});
            // Raise the Lock Screen countdown alongside the alert, not instead
            // of it: the push is the fallback for anyone the activity misses.
            syncBookingLiveActivity(outcome.booking).catch(() => {});
        } else {
            triggerBookingNotifications(
                hotelId,
                [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null,
                bookingDetails.name || bookingDetails.roomName,
                bookingDetails.total,
                bookingDetails.checkin,
                guestInfo.email,
                outcome.booking.id
            );
            runBookingSideEffectSweep({ bookingId: outcome.booking.id, limit: 5 }).catch(() => {});
            handleBookingCreatedWithoutHold(outcome.booking, approvalPlan);
        }
    }

    return { outcome, approvalPlan, pmsResponse };
}

app.post('/api/create-payment-intent', createPaymentIntentRateLimit, async (req, res) => {
    const { bookingDetails, guestInfo, hotelId, preview } = req.body;
    console.log('💳 create-payment-intent called. hotelId:', hotelId, 'preview:', preview);
    try {
        // Owner previews never need a real PaymentIntent. Keeping this route
        // transaction-only prevents a preview URL from becoming a money API.
        if (preview) {
            return res.status(400).send({ error: { message: 'Preview checkout does not create a payment.' } });
        }
        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }
        const config = await resolveHotelConfig(hotelValidation.hotelId);
        // Standard full-charge checkout is not exposed by the current guest UI.
        // If it is restored later, keep it on the transactional manual inventory
        // path until external PMS recovery has an idempotency guarantee.
        if (config.pms !== 'manual') {
            return res.status(409).send({
                error: { message: 'Full online payment is not enabled for this property. Reserve with the $1 verification instead.' },
            });
        }
        const quote = await getServerBookingQuote(hotelValidation.hotelId, bookingDetails);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: quote.totalCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: buildStripeIntentMetadata({
                bookingDetails: quote.bookingDetails,
                guestInfo,
                hotelId: hotelValidation.hotelId,
                extra: { pricingSource: 'server-hotel-rates' },
            }),
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
            quote: {
                subtotal: quote.subtotal,
                taxes: quote.taxes,
                total: quote.total,
                nights: quote.nights,
            },
        });
    } catch (error) {
        console.error("Stripe API Error creating payment intent:", error.message);
        res.status(error.status || 400).send({ error: { message: error.message || "Failed to create payment intent due to an API error." } });
    }
});

// NEW: Create pre-authorization hold for "Reserve Now, Pay Later"
app.post('/api/create-preauth-hold', createPreauthHoldRateLimit, async (req, res) => {
    const { bookingDetails, guestInfo, hotelId, stripeApiVersion } = req.body;
    
    const noShowFeeInCents = 100; // $1.00

    try {
        const hotelValidation = await getActiveHotelValidation(hotelId);
        if (!hotelValidation.ok) {
            return res.status(hotelValidation.status).json({ success: false, message: hotelValidation.message });
        }
        const quote = await getServerBookingQuote(hotelValidation.hotelId, bookingDetails);

        // Create a PaymentIntent with manual capture
        // This places a hold on the card without charging
        const paymentIntentParams = {
            amount: noShowFeeInCents,
            currency: 'usd',
            capture_method: 'manual', // 🔑 KEY: This creates a hold instead of charging
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: buildStripeIntentMetadata({
                bookingDetails: {
                    ...quote.bookingDetails,
                    bookingType: 'payLater',
                    amountPaidNow: 0,
                    amountDueAtArrival: quote.total,
                    preAuthHoldAmount: 1,
                },
                guestInfo,
                hotelId: hotelValidation.hotelId,
                extra: {
                    bookingType: 'payLater',
                    noShowFeeAmount: '100',
                    holdType: 'pre_authorization',
                },
            }),
            description: `Pre-authorization hold for ${quote.bookingDetails.roomName} - ${quote.nights} nights`
        };

        // PaymentSheet may only expose a customer's saved cards when the
        // PaymentIntent belongs to that same customer. Previously Guestel sent
        // an ephemeral customer key to PaymentSheet while this intent had no
        // customer at all, which Stripe surfaced as the generic "unexpected
        // error". The signed customer capability is optional, so the public web
        // booking path remains unchanged.
        let paymentCustomer = null;
        const savedCustomerId = guestPaymentCustomerId(req);
        if (savedCustomerId) {
            try {
                const customer = await stripe.customers.retrieve(savedCustomerId);
                if (customer && !customer.deleted) {
                    const requestedApiVersion = String(stripeApiVersion || '').trim();
                    const ephemeralKey = await stripe.ephemeralKeys.create(
                        { customer: savedCustomerId },
                        {
                            apiVersion: /^\d{4}-\d{2}-\d{2}$/.test(requestedApiVersion)
                                ? requestedApiVersion
                                : '2020-08-27',
                        }
                    );
                    paymentIntentParams.customer = savedCustomerId;
                    paymentCustomer = {
                        customerId: savedCustomerId,
                        ephemeralKeySecret: ephemeralKey.secret,
                    };
                }
            } catch (error) {
                // A deleted Stripe customer should behave like no saved card,
                // not permanently block a guest from entering another card.
                if (error?.code !== 'resource_missing') throw error;
            }
        }
        // The booking engine generates one reservation code before entering
        // checkout and keeps it through refresh/Back. Stripe therefore returns
        // the original PaymentIntent if the browser repeats this request rather
        // than placing a second $1 authorization for the same attempt.
        const idempotencyKey = buildPreauthIdempotencyKey(
            hotelValidation.hotelId,
            quote.bookingDetails.reservationCode
        );
        const paymentIntent = await stripe.paymentIntents.create(
            paymentIntentParams,
            idempotencyKey ? { idempotencyKey } : undefined
        );
        
        res.send({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            paymentCustomer,
        });
    } catch (error) {
        console.error("Stripe API Error creating pre-auth hold:", error.message);
        res.status(400).send({
            error: { message: error.message || "Failed to create pre-authorization hold." }
        });
    }
});

// ── Guestel native app: Stripe support ───────────────────────────────────────
// The native app must use a publishable key from the SAME Stripe account as this
// backend's STRIPE_SECRET_KEY, or PaymentSheet fails with "unexpected error".
// Serving it here means the app can never drift onto the wrong account, and
// switching test→live is a backend env change, not an app rebuild.
app.get('/api/stripe-config', (req, res) => {
    const configuredKey = String(process.env.STRIPE_PUBLISHABLE_KEY || DEFAULT_GUESTEL_TEST_PUBLISHABLE_KEY).trim();
    const secretMatch = String(process.env.STRIPE_SECRET_KEY || '').match(/^sk_(test|live)_(51[A-Za-z0-9]{15})/);
    const publishableMatch = configuredKey.match(/^pk_(test|live)_(51[A-Za-z0-9]{15})/);
    const publishableKey = secretMatch && publishableMatch
        && secretMatch[1] === publishableMatch[1]
        && secretMatch[2] === publishableMatch[2]
        ? configuredKey
        : '';
    if (!publishableKey) {
        console.error('❌ STRIPE_PUBLISHABLE_KEY does not match STRIPE_SECRET_KEY; refusing to serve it.');
    }
    res.json({
        publishableKey,
        mode: publishableKey ? (publishableKey.startsWith('pk_live_') ? 'live' : 'test') : 'unavailable',
    });
});

function guestPaymentCustomerId(req) {
    return readGuestPaymentToken(bearerToken(req))?.customerId || '';
}

async function guestPaymentCustomer(req, email, name) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
        throw new Error('A valid email is required to save a card.');
    }
    const customerId = guestPaymentCustomerId(req);
    if (customerId) {
        const existing = await stripe.customers.retrieve(customerId);
        if (!existing || existing.deleted) throw new Error('Your saved-card session has expired.');
        if (existing.email !== normalized || existing.name !== (name || null)) {
            return stripe.customers.update(customerId, { email: normalized, name: name || '' });
        }
        return existing;
    }
    // Never look customers up by an unverified email. Without guest auth, doing
    // so would let anyone claim another guest's Stripe customer and cards.
    return stripe.customers.create({ email: normalized, name: name || undefined });
}

// Add-a-card flow. The app opens PaymentSheet in setup mode with these three
// values so the card is saved to the customer for one-tap rebooking. The client
// passes its Stripe SDK api version so the ephemeral key matches the SDK.
app.post('/api/guest/setup-intent', guestPaymentSetupRateLimit, async (req, res) => {
    try {
        const { email, name, apiVersion } = req.body || {};
        const customer = await guestPaymentCustomer(req, email, name);
        const requestedApiVersion = String(apiVersion || '').trim();
        const stripeApiVersion = /^\d{4}-\d{2}-\d{2}$/.test(requestedApiVersion)
            ? requestedApiVersion
            : '2020-08-27';
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: stripeApiVersion }
        );
        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            usage: 'off_session',
            automatic_payment_methods: { enabled: true },
        });
        res.json({
            setupIntentClientSecret: setupIntent.client_secret,
            ephemeralKeySecret: ephemeralKey.secret,
            customerId: customer.id,
            customerToken: createGuestPaymentToken(customer.id),
        });
    } catch (error) {
        console.error('Stripe setup-intent error:', error.message);
        res.status(400).json({ message: error.message || 'Could not start card setup.' });
    }
});

// Returns a short-lived Stripe customer session for PaymentSheet. Possession of
// the signed customer capability is required; an email address is never enough
// to expose somebody else's saved cards.
app.post('/api/guest/payment-session', guestPaymentSessionRateLimit, async (req, res) => {
    try {
        const customerId = guestPaymentCustomerId(req);
        if (!customerId) {
            return res.status(401).json({ message: 'Saved-card access is required.' });
        }
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) {
            return res.status(401).json({ message: 'Your saved-card session has expired.' });
        }
        const requestedApiVersion = String(req.body?.apiVersion || '').trim();
        const stripeApiVersion = /^\d{4}-\d{2}-\d{2}$/.test(requestedApiVersion)
            ? requestedApiVersion
            : '2020-08-27';
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: stripeApiVersion }
        );
        res.json({ customerId, ephemeralKeySecret: ephemeralKey.secret });
    } catch (error) {
        console.error('Stripe payment-session error:', error.message);
        res.status(400).json({ message: error.message || 'Could not load saved cards.' });
    }
});

// Lists a guest's saved cards for the Payment methods screen.
app.get('/api/guest/payment-methods', guestPaymentReadRateLimit, async (req, res) => {
    try {
        const customerId = guestPaymentCustomerId(req);
        if (!customerId) return res.status(401).json({ cards: [], message: 'Saved-card access is required.' });
        const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
        const cards = methods.data.map(pm => ({
            id: pm.id,
            brand: pm.card?.brand || 'card',
            last4: pm.card?.last4 || '••••',
            expMonth: pm.card?.exp_month || null,
            expYear: pm.card?.exp_year || null,
        }));
        res.json({ cards });
    } catch (error) {
        console.error('Stripe payment-methods list error:', error.message);
        res.status(400).json({ cards: [], message: error.message });
    }
});

// Removes a saved card.
app.post('/api/guest/detach-payment-method', guestPaymentDetachRateLimit, async (req, res) => {
    try {
        const { paymentMethodId } = req.body || {};
        if (!paymentMethodId) return res.status(400).json({ message: 'Missing paymentMethodId.' });
        const customerId = guestPaymentCustomerId(req);
        if (!customerId) return res.status(401).json({ message: 'Saved-card access is required.' });
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (paymentMethod.customer !== customerId) {
            return res.status(404).json({ message: 'Payment method not found.' });
        }
        await stripe.paymentMethods.detach(paymentMethodId);
        res.json({ ok: true });
    } catch (error) {
        console.error('Stripe detach error:', error.message);
        res.status(400).json({ message: error.message });
    }
});

// NEW: Complete pay later booking after pre-auth hold succeeds
app.post('/api/complete-pay-later-booking', completePayLaterRateLimit, async (req, res) => {
    const { paymentIntentId, hotelId } = req.body;

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

        // The intent metadata contains the server-owned room/rate identifiers,
        // quote and guest snapshot created before Stripe was presented. Native
        // Guestel deliberately never calculates a trusted total. Comparing its
        // earlier, total-less request with this server quote falsely rejected a
        // valid $1 authorization after the card had already been held.
        const bookingDetails = parseJsonObject(paymentIntent.metadata?.bookingDetails);
        const guestInfo = parseJsonObject(paymentIntent.metadata?.guestInfo);
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
        if (!bookingDetails?.rateID || !bookingDetails?.roomName) {
            return res.status(400).json({
                success: false,
                message: 'Payment authorization is missing its server booking quote.',
            });
        }
        if (!guestInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Payment authorization is missing its guest details.',
            });
        }

        // Stripe can deliver amount_capturable_updated before this request
        // returns. If that webhook already persisted the exact booking, return
        // it instead of attempting a second inventory commit or telling the
        // guest that confirmation failed after it actually succeeded.
        const existingBooking = await withRetry(() => prisma.booking.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
        }));
        if (existingBooking) {
            if (existingBooking.hotelId !== hotelValidation.hotelId) {
                return res.status(403).json({ success: false, message: 'Payment authorization does not belong to this hotel.' });
            }
            const existingStatus = String(existingBooking.status || '').trim().toLowerCase();
            if (DEAD_BOOKING_STATUSES.includes(existingStatus)) {
                return res.status(409).json({ success: false, message: 'This booking is no longer active.' });
            }
            const pendingUntilMs = existingBooking.pendingUntil
                ? new Date(existingBooking.pendingUntil).getTime()
                : 0;
            const isPending = existingStatus === 'pending';
            return res.json({
                success: true,
                pending: isPending,
                reviewWindowMinutes: isPending && pendingUntilMs > Date.now()
                    ? Math.max(1, Math.ceil((pendingUntilMs - Date.now()) / 60000))
                    : 0,
                noResponseAction: resolveApprovalNoResponseAction(existingBooking.approvalNoResponseAction),
                message: isPending
                    ? 'Your room request is being reviewed. The $1 authorization is only a temporary hold.'
                    : 'Reservation confirmed. $1.00 hold placed on card.',
                reservationCode: existingBooking.pmsConfirmationCode || existingBooking.ourReservationCode,
                reservationToken: safeReservationToken(existingBooking),
                handoffToken: await issueGuestAppHandoff(existingBooking),
                recovered: true,
            });
        }

        // Create booking in PMS with "Pay at Hotel" status
        const holdStatus = String(paymentIntent.status || '').trim().toLowerCase() === 'succeeded' ? 'captured' : 'active';
        const config = await resolveHotelConfig(hotelValidation.hotelId);

        // BookingCenter pay-later: we still save a booking (guarantee/verification handled by $1 hold on Stripe)
        if (config.pms === 'bookingcenter') {
            const existingReceipt = externalPmsReceipt(paymentIntent, 'bookingcenter');
            const pmsResponse = existingReceipt
                ? { success: true, reservationID: existingReceipt.reservationId, recovered: true }
                : await createBookingCenterBooking(hotelValidation.hotelId, bookingDetails, guestInfo);

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

            let receiptRecorded = !!existingReceipt;
            if (!receiptRecorded) {
                try {
                    await updateExternalPmsReceipt(paymentIntentId, {
                        provider: 'bookingcenter',
                        reservationId: pmsResponse.reservationID,
                        state: 'pms_created',
                    });
                    receiptRecorded = true;
                } catch (receiptError) {
                    console.error('CRITICAL: BookingCenter reservation exists but its Stripe receipt could not be stored:', receiptError.message);
                }
            }

            let syncPending = false;
            let persistedBooking = null;
            try {
                const persisted = await persistExternalPayLaterBooking({
                    paymentIntent,
                    provider: 'bookingcenter',
                    reservationId: pmsResponse.reservationID,
                    hotelId: hotelValidation.hotelId,
                    bookingDetails,
                    guestInfo,
                });
                persistedBooking = persisted?.booking || null;
            } catch (dbError) {
                console.error("Failed to save pay-later booking to database:", dbError);
                syncPending = true;
                if (receiptRecorded) {
                    setTimeout(() => runExternalPmsReconciliation().catch(error => {
                        console.error('Immediate external PMS reconciliation failed:', error.message);
                    }), 5000).unref?.();
                }
            }

            return res.json({
                success: true,
                syncPending,
                message: syncPending
                    ? 'Reservation received. Front Desk is finishing its sync.'
                    : 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.reservationID,
                reservationToken: persistedBooking ? safeReservationToken(persistedBooking) : '',
                handoffToken: persistedBooking ? await issueGuestAppHandoff(persistedBooking) : '',
            });
        }

        // Manual PMS pay-later flow
        if (config.pms === 'manual') {
            try {
                const { outcome, approvalPlan, pmsResponse } = await persistManualPayLaterBooking({
                    paymentIntent,
                    hotelId: hotelValidation.hotelId,
                    bookingDetails,
                    guestInfo,
                    config,
                });

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
                    reservationToken: safeReservationToken(outcome.booking),
                    handoffToken: await issueGuestAppHandoff(outcome.booking),
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

        const existingReceipt = externalPmsReceipt(paymentIntent, 'cloudbeds');
        const pmsResponse = existingReceipt
            ? { data: { success: true, reservationID: existingReceipt.reservationId }, recovered: true }
            : await axios.post(
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
            let receiptRecorded = !!existingReceipt;
            if (!receiptRecorded) {
                try {
                    await updateExternalPmsReceipt(paymentIntentId, {
                        provider: 'cloudbeds',
                        reservationId: pmsResponse.data.reservationID,
                        state: 'pms_created',
                    });
                    receiptRecorded = true;
                } catch (receiptError) {
                    console.error('CRITICAL: Cloudbeds reservation exists but its Stripe receipt could not be stored:', receiptError.message);
                }
            }

            let syncPending = false;
            let persistedBooking = null;
            try {
                const persisted = await persistExternalPayLaterBooking({
                    paymentIntent,
                    provider: 'cloudbeds',
                    reservationId: pmsResponse.data.reservationID,
                    hotelId: hotelValidation.hotelId,
                    bookingDetails,
                    guestInfo,
                });
                persistedBooking = persisted?.booking || null;
            } catch (dbError) {
                console.error('❌ Failed to save Cloudbeds booking to database:', dbError.message);
                syncPending = true;
                if (receiptRecorded) {
                    setTimeout(() => runExternalPmsReconciliation().catch(error => {
                        console.error('Immediate external PMS reconciliation failed:', error.message);
                    }), 5000).unref?.();
                }
            }

            res.json({
                success: true,
                syncPending,
                message: syncPending
                    ? 'Reservation received. Front Desk is finishing its sync.'
                    : 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.data.reservationID,
                reservationToken: persistedBooking ? safeReservationToken(persistedBooking) : '',
                handoffToken: persistedBooking ? await issueGuestAppHandoff(persistedBooking) : '',
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
        res.set('Cache-Control', 'no-store');
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

// PUBLIC: one lightweight unread query for every stay in an installed guest
// app. Returning counts only avoids downloading every conversation every 15s,
// which previously became noisy and rate-limit-prone for repeat guests.
app.post('/api/guest-messages/unread', guestUnreadSyncGlobalRateLimit, guestUnreadSyncRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hotelId = String(req.body?.hotelId || '').trim();
        const requested = (Array.isArray(req.body?.stays) ? req.body.stays : [])
            .slice(0, 12)
            .map((stay) => ({
                code: String(stay?.code || '').trim().slice(0, 160),
                email: String(stay?.email || '').trim().slice(0, 200),
            }))
            .filter((stay) => stay.code);
        if (!hotelId || !requested.length) {
            return res.status(400).json({ success: false, message: 'Reservation details are required.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status || 404).json({ success: false, message: 'Property not found.' });
        }
        const codes = [...new Set(requested.map((stay) => stay.code))];
        const bookings = await prisma.booking.findMany({
            where: {
                hotelId: validation.hotelId,
                OR: [
                    { ourReservationCode: { in: codes } },
                    { pmsConfirmationCode: { in: codes } },
                ],
            },
        });
        const verified = requested.map((request) => {
            const booking = bookings.find((row) => (
                row.ourReservationCode === request.code || row.pmsConfirmationCode === request.code
            ));
            if (!booking || !guestEmailMatches(booking, request.email)) return null;
            return { request, threadCodes: guestBookingThreadCodes(booking, request.code) };
        }).filter(Boolean);
        const allThreadCodes = [...new Set(verified.flatMap((entry) => entry.threadCodes))];
        const unreadRows = allThreadCodes.length
            ? await prisma.guestMessage.findMany({
                where: {
                    hotelId: validation.hotelId,
                    reservationCode: { in: allThreadCodes },
                    sender: 'hotel',
                    guestReadAt: null,
                },
                select: { reservationCode: true },
            })
            : [];
        const counts = verified.map((entry) => ({
            code: entry.request.code,
            unread: unreadRows.filter((row) => entry.threadCodes.includes(row.reservationCode)).length,
        }));
        return res.json({
            success: true,
            total: counts.reduce((sum, entry) => sum + entry.unread, 0),
            counts,
        });
    } catch (error) {
        console.error('POST /api/guest-messages/unread error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not refresh unread messages.' });
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
        res.set('Cache-Control', 'no-store');
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

        const hotel = await guestHotelPayload(resolvedHotelId, req);
        res.json({
            success: true,
            // `requestedCode` mirrors /api/booking/stays so a PMS alias resolves
            // back to the local record the guest actually asked for.
            booking: { ...guestBookingPayload(booking, code), requestedCode: code },
            hotel,
            serverTime: new Date().toISOString(),
        });
    } catch (e) {
        console.error('booking lookup error:', e.message);
        res.status(500).json({ success: false, message: 'Lookup failed. Please try again.' });
    }
});

// PUBLIC: refresh every reservation connected to one guest browser in a single
// request. This keeps Front Desk decisions, cancellation reasons and property
// details coherent without multiplying polling traffic for repeat guests.
app.post('/api/booking/stays', guestBookingSyncGlobalRateLimit, guestBookingSyncRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hotelId = String(req.body?.hotelId || '').trim();
        const requested = (Array.isArray(req.body?.stays) ? req.body.stays : [])
            .slice(0, 12)
            .map((stay) => ({
                code: String(stay?.code || '').trim().slice(0, 160),
                email: String(stay?.email || '').trim().slice(0, 200),
            }))
            .filter((stay) => stay.code);
        if (!hotelId || !requested.length) {
            return res.status(400).json({ success: false, message: 'Property and reservation details are required.' });
        }

        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status || 400).json({ success: false, message: validation.message });
        }
        const resolvedHotelId = validation.hotelId;
        const codes = [...new Set(requested.map((stay) => stay.code))];
        const rows = await prisma.booking.findMany({
            where: {
                hotelId: resolvedHotelId,
                OR: [
                    { ourReservationCode: { in: codes } },
                    { pmsConfirmationCode: { in: codes } },
                ],
            },
        });

        const bookings = [];
        requested.forEach((request) => {
            const booking = rows.find((row) => (
                row.ourReservationCode === request.code || row.pmsConfirmationCode === request.code
            ));
            if (!booking || !guestEmailMatches(booking, request.email)) return;
            bookings.push({
                ...guestBookingPayload(booking, request.code),
                requestedCode: request.code,
            });
        });

        const hotel = await guestHotelPayload(resolvedHotelId, req);
        return res.json({
            success: true,
            bookings,
            hotel,
            serverTime: new Date().toISOString(),
        });
    } catch (error) {
        console.error('booking stays sync error:', error.message);
        return res.status(500).json({ success: false, message: 'Your stays could not refresh. Please try again.' });
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

async function recoverGuestPaymentIntent(paymentIntent) {
    const snapshot = getStripeIntentSnapshot(paymentIntent);
    const metadata = paymentIntent.metadata || {};
    const submittedBooking = parseJsonObject(metadata.bookingDetails);
    const guestInfo = parseJsonObject(metadata.guestInfo);
    const hotelId = String(metadata.hotelId || '').trim();
    if (!hotelId) throw new Error('Payment metadata is missing hotelId.');

    const existingBooking = await prisma.booking.findFirst({
        where: {
            OR: [
                { stripePaymentIntentId: paymentIntent.id },
                ...(snapshot.booking.reservationCode
                    ? [{ ourReservationCode: snapshot.booking.reservationCode }]
                    : []),
            ],
        },
    });
    if (existingBooking) return { booking: existingBooking, created: false };

    // A failed inventory commit refunds the charge before returning the guest
    // to the room picker. Stripe can deliver the original succeeded event
    // again later; never turn that refunded payment into a reservation.
    const latestChargeId = stripeObjectId(paymentIntent.latest_charge);
    if (latestChargeId) {
        const latestCharge = typeof paymentIntent.latest_charge === 'object'
            ? paymentIntent.latest_charge
            : await stripe.charges.retrieve(latestChargeId);
        const amountReceived = Number(paymentIntent.amount_received || paymentIntent.amount || 0);
        const amountRefunded = Number(latestCharge?.amount_refunded || 0);
        if (latestCharge?.refunded || (amountReceived > 0 && amountRefunded >= amountReceived)) {
            return { booking: null, created: false, ignored: 'refunded' };
        }
    }

    // A captured $1 hold is a no-show action on a booking that must already
    // exist. Never reinterpret it as payment for a new room.
    if (snapshot.holdType === 'pre_authorization') {
        throw new Error(`Captured $1 hold ${paymentIntent.id} has no matching booking.`);
    }

    const hotelValidation = await getActiveHotelValidation(hotelId);
    if (!hotelValidation.ok) throw new Error(hotelValidation.message);
    const config = await resolveHotelConfig(hotelValidation.hotelId);
    if (config.pms !== 'manual') {
        throw new Error(
            `Automatic recovery for standard payments is disabled for ${config.pms}; `
            + 'the payment requires operator review before creating an external PMS reservation.'
        );
    }

    // New intents carry a quote stamped by this server. Preserve that quoted
    // price even if the owner edits rates between payment and webhook retry.
    // Legacy intents lack the stamp, so they must still match today's stored
    // catalog or fail closed for operator review.
    const serverStampedQuote = metadata.pricingSource === 'server-hotel-rates';
    const quote = serverStampedQuote
        ? {
            bookingDetails: submittedBooking,
            totalCents: normalizeBookingSnapshot(submittedBooking).totalCents,
        }
        : await getServerBookingQuote(hotelValidation.hotelId, submittedBooking);
    if (!quote.totalCents || Number(paymentIntent.amount || 0) !== quote.totalCents) {
        throw new Error(
            `Payment ${paymentIntent.id} amount does not match the server booking quote; operator review required.`
        );
    }
    const bookingDetails = quote.bookingDetails;
    const reservationCode = String(bookingDetails.reservationCode || '').trim();
    if (!reservationCode) throw new Error('Payment metadata is missing a reservation code.');

    const pmsResponse = await createManualBooking(hotelValidation.hotelId, bookingDetails);
    const outcome = await createManualBookingRecordWithInventory(hotelValidation.hotelId, {
        stripePaymentIntentId: paymentIntent.id,
        ourReservationCode: reservationCode,
        pmsConfirmationCode: pmsResponse.reservationID,
        hotelId: hotelValidation.hotelId,
        roomName: bookingDetails.roomName || bookingDetails.name,
        bookingType: 'standard',
        checkinDate: new Date(bookingDetails.checkin),
        checkoutDate: new Date(bookingDetails.checkout),
        nights: bookingDetails.nights,
        guestFirstName: String(guestInfo.firstName || '').trim(),
        guestLastName: String(guestInfo.lastName || '').trim(),
        guestEmail: String(guestInfo.email || '').trim(),
        guestPhone: String(guestInfo.phone || '').trim(),
        subtotal: bookingDetails.subtotal,
        taxesAndFees: bookingDetails.taxes,
        grandTotal: bookingDetails.total,
        amountPaidNow: bookingDetails.total,
        holdStatus: 'captured',
    });

    if (outcome.created) {
        const guestName = [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null;
        triggerBookingNotifications(
            hotelValidation.hotelId,
            guestName,
            bookingDetails.roomName || bookingDetails.name,
            bookingDetails.total,
            bookingDetails.checkin,
            guestInfo.email,
            outcome.booking.id
        );
        runBookingSideEffectSweep({ bookingId: outcome.booking.id, limit: 5 }).catch(() => {});
        sendToMetaCAPI('Purchase', {
            value: bookingDetails.total,
            currency: 'USD',
            content_name: bookingDetails.roomName || bookingDetails.name,
            event_source_url: 'https://bookmarketel.com',
            user_data: {
                em: guestInfo.email,
                ph: guestInfo.phone,
                fn: guestInfo.firstName,
                ln: guestInfo.lastName,
            },
        }).catch(error => console.error('Meta CAPI Purchase (webhook recovery) failed:', error.message));
    }
    return outcome;
}

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

    if (event.type === 'payment_intent.amount_capturable_updated') {
        const eventIntent = event.data.object;
        if (!eventIntent.metadata?.hotelId || !eventIntent.metadata?.bookingDetails) {
            return res.json({ received: true, ignored: true });
        }
        try {
            // Retrieve the current object so metadata written just after the
            // original event (for an external PMS receipt) is visible here.
            const paymentIntent = await stripe.paymentIntents.retrieve(eventIntent.id);
            const snapshot = getStripeIntentSnapshot(paymentIntent);
            if (snapshot.holdType !== 'pre_authorization' || paymentIntent.status !== 'requires_capture') {
                return res.json({ received: true, ignored: true });
            }
            const hotelValidation = await getActiveHotelValidation(snapshot.hotelId);
            if (!hotelValidation.ok) throw new Error(hotelValidation.message);
            const config = await resolveHotelConfig(hotelValidation.hotelId);
            if (config.pms !== 'manual') {
                // External PMS creation stays in the synchronous route. Once
                // it succeeds, its Stripe receipt is reconciled separately;
                // calling the provider from this early event could duplicate it.
                return res.json({ received: true, deferred: 'external-pms' });
            }
            const bookingDetails = parseJsonObject(paymentIntent.metadata?.bookingDetails);
            const guestInfo = parseJsonObject(paymentIntent.metadata?.guestInfo);
            if (!bookingDetails?.reservationCode || !bookingDetails?.roomName || !guestInfo?.email) {
                throw new Error(`Pay-later authorization ${paymentIntent.id} is missing booking metadata.`);
            }
            const { outcome } = await persistManualPayLaterBooking({
                paymentIntent,
                hotelId: hotelValidation.hotelId,
                bookingDetails,
                guestInfo,
                config,
            });
            console.log(`✅ Pay-later authorization webhook settled (${outcome.created ? 'recovered' : 'already recorded'}).`);
        } catch (error) {
            console.error('❌ Pay-later authorization webhook recovery failed:', error);
            if (error?.code === 'MANUAL_INVENTORY_UNAVAILABLE') {
                await stripe.paymentIntents.cancel(eventIntent.id).catch(cancelError => {
                    console.error('Could not release unavailable-room authorization:', cancelError.message);
                });
                return res.json({ received: true, released: 'room-unavailable' });
            }
            return res.status(500).json({ received: false });
        }
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        if (!paymentIntent.metadata?.hotelId || !paymentIntent.metadata?.bookingDetails) {
            console.warn(`Ignoring unrelated Stripe PaymentIntent ${paymentIntent.id} on the guest-booking webhook.`);
            return res.json({ received: true, ignored: true });
        }
        console.log('💰 Payment succeeded via webhook:', paymentIntent.id);
        try {
            const outcome = await recoverGuestPaymentIntent(paymentIntent);
            console.log(`✅ Guest payment webhook settled (${outcome.ignored || (outcome.created ? 'recovered' : 'already recorded')}).`);
        } catch (error) {
            console.error('❌ A critical error occurred in the webhook backup process:', error);
            // A 5xx tells Stripe the event was not safely handled. Stripe can
            // retry instead of losing a paid guest behind a misleading 200.
            return res.status(500).json({ received: false });
        }
    }

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

app.post('/api/availability', availabilityRateLimit, async (req, res) => {
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

// Public, server-owned quote used by Guestel's native repeat-booking flow.
// Availability answers "can this room be sold?" while this endpoint answers
// "what will this exact stay cost?" from the same stored rates Stripe stamps
// into the authorization metadata. Native clients can display the number, but
// create-preauth-hold still recalculates it and remains authoritative.
app.post('/api/booking-quote', availabilityRateLimit, async (req, res) => {
    try {
        const hotelId = String(req.body?.hotelId || '').trim();
        const bookingDetails = req.body?.bookingDetails || {};
        const validation = await getActiveHotelValidation(hotelId);
        if (!validation.ok) {
            return res.status(validation.status).json({ success: false, message: validation.message });
        }
        const quote = await getServerBookingQuote(validation.hotelId, bookingDetails);
        return res.json({
            success: true,
            quote: {
                nights: quote.nights,
                subtotal: quote.subtotal,
                taxes: quote.taxes,
                total: quote.total,
                totalCents: quote.totalCents,
            },
            room: {
                name: quote.bookingDetails.roomName,
                roomTypeID: quote.bookingDetails.roomTypeID,
                rateID: quote.bookingDetails.rateID,
            },
        });
    } catch (error) {
        console.error('Booking quote error:', error.message);
        return res.status(error.status || 400).json({
            success: false,
            message: error.message || 'That stay could not be quoted.',
        });
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
    const { hotelId, bookingDetails: submittedBookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (!submittedBookingDetails?.rateID) {
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
            bookingDetails: submittedBookingDetails,
            allowedStatuses: ['succeeded'],
            allowedAmountsCents: getExpectedStandardChargeAmountsCents(
                parseJsonObject(paymentIntent.metadata?.bookingDetails)
            ),
        });
        if (paymentValidation) {
            return res.status(400).json({ success: false, message: paymentValidation });
        }

        // Price, dates, room and stay length come back from the signed Stripe
        // metadata written by the server. Guest contact fields remain editable
        // through checkout, but the browser never gets to rewrite money here.
        const bookingDetails = parseJsonObject(paymentIntent.metadata?.bookingDetails);
        if (!bookingDetails?.rateID) {
            return res.status(400).json({ success: false, message: 'Payment is missing its server booking quote.' });
        }

        const config = await resolveHotelConfig(hotelValidation.hotelId);
        if (config.pms !== 'manual') {
            return res.status(409).json({
                success: false,
                message: 'Full online payment is not enabled for this property. Reserve with the $1 verification instead.',
            });
        }
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
                    source: bookingDetails.source,
                    returnOfferApplied: bookingDetails.returnOfferApplied,
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
                    : { booking: await createBookingRecordWithConfirmation(bookingData), created: true };

                if (outcome.created) {
                    triggerBookingNotifications(hotelValidation.hotelId, [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' ') || null, bookingDetails.name || bookingDetails.roomName, bookingDetails.total, bookingDetails.checkin, guestInfo.email, outcome.booking.id);
                    runBookingSideEffectSweep({ bookingId: outcome.booking.id, limit: 5 }).catch(() => {});
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

function configuredFrontdeskAppStoreUrl() {
    // The public listing is stable product configuration, not a secret. Keep
    // the env override for regional/testing builds, but never hide the already
    // published owner app because Render is missing an optional URL variable.
    const raw = String(
        process.env.MARKETEL_FRONTDESK_APP_STORE_URL
        || 'https://apps.apple.com/us/app/marketel/id6801005750'
    ).trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        if (parsed.protocol === 'https:' && parsed.hostname === 'apps.apple.com') {
            return parsed.toString();
        }
    } catch (_) { /* invalid configuration stays unavailable */ }
    console.warn('MARKETEL_FRONTDESK_APP_STORE_URL must be an https://apps.apple.com URL.');
    return '';
}

const MARKETEL_FRONTDESK_APP_STORE_URL = configuredFrontdeskAppStoreUrl();

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

// A handoff token is not a session. The fd_ return token exists to carry an
// owner across one boundary — out to Stripe, back from setup — and expires in
// 24 hours, but the browser was storing it as its long-lived credential. A day
// later every request 401s and the client, which treats any 401 as "signed
// out", wipes the token and demands a PIN the owner may never have been given.
//
// So a return token is exchanged once for this: same signing secret, scoped to
// the one hotel it already proved access to, and lasting as long as a native
// session. Minting a PIN instead would either rotate the property's shared PIN
// and sign out its staff, or add a new PIN on every return.
const CRM_SESSION_TOKEN_EXPIRY_MS = NATIVE_SESSION_TOKEN_EXPIRY_MS;

function generateCrmSessionToken(hotelId, options = {}) {
    const payload = JSON.stringify({
        purpose: 'frontdesk-session',
        hotelId: String(hotelId || '').trim(),
        dogfoodPreview: !!options.dogfoodPreview,
        exp: Date.now() + CRM_SESSION_TOKEN_EXPIRY_MS,
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', NATIVE_SESSION_TOKEN_SECRET).update(encoded).digest('base64url');
    return `fds_${encoded}.${sig}`;
}

function verifyCrmSessionToken(token) {
    const raw = String(token || '').trim();
    if (!raw.startsWith('fds_')) return null;
    const parts = raw.slice(4).split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', NATIVE_SESSION_TOKEN_SECRET).update(encoded).digest('base64url');
    if (!timingSafeTextEqual(sig, expected)) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (payload.purpose !== 'frontdesk-session' || !payload.hotelId || payload.exp < Date.now()) return null;
        return {
            hotelId: String(payload.hotelId).trim(),
            dogfoodPreview: !!payload.dogfoodPreview,
        };
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
    // Handoff tokens are already short-lived, purpose-bound, hotel-scoped and
    // signed with the server secret. Do not additionally bind new tokens to the
    // mutable setup credential: finalization rotates that credential, which
    // used to invalidate the handoff between receiving it and opening it.
    void currentSetupToken;
    return generateCrmReturnToken(hotelId, '');
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
    const sessionAuth = returnAuth ? null : verifyCrmSessionToken(token);
    const nativeAuth = returnAuth || sessionAuth ? null : verifyNativeSessionToken(token);
    // A lookup that *fails* is not a credential that is *absent*. Swallowing the
    // error into an empty list made a transient database blip indistinguishable
    // from a wrong PIN, and the client responds to 401 by deleting a valid token
    // and demanding the PIN again.
    let credentialLookupFailed = false;
    const dbAllowedHotels = returnAuth || sessionAuth || nativeAuth
        ? []
        : await getDbAllowedHotelsForToken(token).catch((error) => {
            credentialLookupFailed = true;
            console.error('⚠️ crmAuth PIN lookup failed:', error?.message || error);
            return [];
        });
    const nativeAllowedHotels = nativeAuth
        ? await getDbAllowedHotelsForOwnerEmail(nativeAuth.email).catch((error) => {
            credentialLookupFailed = true;
            console.error('⚠️ crmAuth owner lookup failed:', error?.message || error);
            return [];
        })
        : [];
    let allowedHotels = returnAuth
        ? [returnAuth.hotelId]
        : sessionAuth
            ? [sessionAuth.hotelId]
            : nativeAuth
                ? nativeAllowedHotels
                : (dbAllowedHotels.length ? dbAllowedHotels : (CRM_TOKEN_HOTELS_MAP[token] || []));

    const requestedHotelId = String(req.query?.hotelId || req.body?.hotelId || '').trim();
    let isDogfoodPreviewAccess = !!sessionAuth?.dogfoodPreview;
    if (
        !returnAuth
        && !sessionAuth
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

    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedHotels?.length) {
        // Only claim the credential is bad when we actually established that.
        if (credentialLookupFailed) {
            return res.status(503).json({
                error: 'Front Desk could not reach its records. Please try again.',
                retryable: true,
            });
        }
        return res.status(401).json({ error: 'Unauthorized' });
    }
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

const guestStripeDomainAutomationEnabled = process.env.ENABLE_STRIPE_PAYMENT_METHOD_DOMAIN_SYNC !== 'false'
    && /^sk_(?:test|live)_/.test(String(process.env.STRIPE_SECRET_KEY || ''));

async function registerStripePaymentMethodDomain(domain) {
    if (!guestStripeDomainAutomationEnabled) return null;
    try {
        const result = await ensurePaymentMethodDomain(stripe, domain);
        if (result?.ok && result.created) {
            console.log(`✅ Stripe wallet domain registered: ${result.domain}`);
        }
        return result;
    } catch (error) {
        // Booking-page provisioning still succeeds. The startup reconciliation
        // repairs temporary Stripe or DNS failures on the next deployment.
        console.error(`⚠️ Stripe wallet domain registration failed for ${domain}: ${error.message}`);
        return null;
    }
}

async function reconcileStripePaymentMethodDomains() {
    if (!guestStripeDomainAutomationEnabled) return null;
    const rows = await prisma.hotelDomain.findMany({ select: { domain: true } });
    const result = await syncPaymentMethodDomains(stripe, rows.map(row => row.domain));
    console.log(`Stripe wallet domains: ${result.registered}/${result.requested} ready, ${result.created} added, ${result.failed.length} failed`);
    if (result.failed.length) {
        console.error('⚠️ Stripe wallet domain reconciliation failures:', result.failed);
    }
    return result;
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
        await Promise.all(domains.map(domain => registerStripePaymentMethodDomain(domain)));
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

// The push-to-start token is per install, not per activity. Without it a
// Temporary on-device diagnostic: the web half of Live Activities reports each
// step of its registration here so a card that never appears is visible in the
// server logs without a Mac. Deliberately lenient — it only logs.
app.post('/api/push/live-activity/debug', crmAuth, async (req, res) => {
    try {
        const hotelId = req.crmHotelId || req.query?.hotelId || 'unknown';
        const step = String(req.body?.step || '').slice(0, 40);
        let detail = '';
        try { detail = JSON.stringify(req.body?.detail || {}).slice(0, 300); } catch (_) { detail = '{}'; }
        console.log(`🔎 [live-activity/debug] hotel=${hotelId} native=${req.crmIsNativeClient} step=${step} detail=${detail}`);
    } catch (_) { /* diagnostics must never fail a request */ }
    res.json({ success: true });
});

// booking can only raise a card while the app is already open.
app.post('/api/push/live-activity/starter', crmAuth, async (req, res) => {
    try {
        if (!req.crmIsNativeClient) {
            return res.status(400).json({ success: false, message: 'Native client header required.' });
        }
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const startToken = normalizeApnsDeviceToken(req.body?.startToken);
        if (!startToken) {
            return res.status(400).json({ success: false, message: 'A valid push-to-start token is required.' });
        }
        const environment = String(req.body?.environment || '').toLowerCase() === 'sandbox'
            ? 'sandbox'
            : 'production';
        await prisma.liveActivityStarter.upsert({
            where: { startToken_hotelId: { startToken, hotelId } },
            create: { startToken, hotelId, environment, active: true, lastSeenAt: new Date() },
            update: { environment, active: true, lastSeenAt: new Date() },
        });
        console.log(`📲 [live-activity] push-to-start token registered hotel=${hotelId} env=${environment} token=…${startToken.slice(-6)} apns=${APNS_CONFIGURED}`);
        res.json({ success: true, pushConfigured: APNS_CONFIGURED });
    } catch (error) {
        console.error('live-activity starter register failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not register for Live Activities.' });
    }
});

// Each running activity issues its own update token; ending the right card
// later depends on having stored it against the booking that owns it.
app.post('/api/push/live-activity/register', crmAuth, async (req, res) => {
    try {
        if (!req.crmIsNativeClient) {
            return res.status(400).json({ success: false, message: 'Native client header required.' });
        }
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const activityId = String(req.body?.activityId || '').trim().slice(0, 128);
        const updateToken = normalizeApnsDeviceToken(req.body?.updateToken);
        const bookingId = String(req.body?.bookingId || '').trim().slice(0, 64);
        if (!activityId || !updateToken || !bookingId) {
            return res.status(400).json({ success: false, message: 'activityId, updateToken and bookingId are required.' });
        }
        const environment = String(req.body?.environment || '').toLowerCase() === 'sandbox'
            ? 'sandbox'
            : 'production';
        await prisma.liveActivity.upsert({
            where: { activityId },
            create: { activityId, updateToken, bookingId, hotelId, environment, state: 'active' },
            update: { updateToken, environment, state: 'active', endedAt: null },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('live-activity register failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not register the Live Activity.' });
    }
});

// The owner can dismiss a card by hand. Recording that stops us pushing to a
// token that no longer has anything to update.
app.post('/api/push/live-activity/ended', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const activityId = String(req.body?.activityId || '').trim().slice(0, 128);
        if (!activityId) {
            return res.status(400).json({ success: false, message: 'activityId is required.' });
        }
        await prisma.liveActivity.updateMany({
            where: { activityId, hotelId },
            data: { state: 'ended', endedAt: new Date() },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('live-activity end failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not end the Live Activity.' });
    }
});

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

// Compatibility route for guest browsers connected before Guestel launched.
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

// Guestel/App Clip handoff funnel (public). Older event names remain accepted
// so historic clients and reporting rows do not break during the migration.
app.post('/api/guest-install-event', async (req, res) => {
    try {
        const { hotelId, reservationCode, touchpoint, eventType } = req.body || {};
        if (!hotelId || !touchpoint || !eventType) {
            return res.status(400).json({ success: false, message: 'hotelId, touchpoint, and eventType are required.' });
        }
        const allowed = [
            'view',
            'cta_click',
            'installed',
            'notification_prompt',
            'notification_granted',
            'notification_denied',
            'notification_dismissed',
            'notification_subscribed',
            'notification_failed',
        ];
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
        const hotel = await resolvePublicHotelConfig(req.params.hotelId);
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
        const hotel = await resolvePublicHotelConfig(req.params.hotelId);
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
    'JourneySetupResumed',
    'JourneyRecoveryEmailRequested',
    'JourneyHandoffStarted',
    'JourneyHandoffCompleted',
    'JourneyFrontDeskReady',
    'JourneyRevealStarted',
    'JourneyRevealStageViewed',
    'JourneyRevealStageCompleted',
    'JourneyRevealNavigation',
    // Beats are the real resolution of the reveal. A stage view only says an
    // owner reached the guest-app stage; the beat says whether they got past
    // the install sheet. Without this the middle of the funnel is one bucket.
    'JourneyRevealBeatViewed',
    'JourneyAppCarouselSlideViewed',
    'JourneyAssistantFallbackSelected',
    'JourneyBillingIntervalSelected',
    'JourneyBookingPreviewOpened',
    'JourneyBookingPreviewModeChanged',
    'JourneyBookingPreviewEdited',
    'JourneyBookingPreviewCheckoutReached',
    'JourneyBookingChallengeShown',
    'JourneyBookingChallengeStarted',
    'JourneyBookingChallengeDismissed',
    'JourneyBookingChallengeAbandoned',
    'JourneyBookingChallengeCompleted',
    'JourneyGuestAppDemo',
    'JourneyBookingPageStatus',
    'JourneyCheckoutRequested',
    'JourneyCheckoutCancelled',
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

// Attribution is deliberately narrower than general journey metadata. These
// are the only URL fields needed to compare ads, and click/cookie identifiers
// stay out of the founder-facing campaign table.
const MARKETEL_ATTRIBUTION_KEYS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'angle',
    'referrer',
]);

function sanitizeMarketelAttributionTouch(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const touch = {};
    Object.entries(value).forEach(([key, rawValue]) => {
        if (!MARKETEL_ATTRIBUTION_KEYS.has(key) || rawValue == null) return;
        const cleanValue = redactJourneyString(rawValue, key === 'referrer' ? 300 : 180).trim();
        if (cleanValue) touch[key] = cleanValue;
    });
    return touch;
}

function marketelAttributionFromBody(body) {
    const firstTouch = sanitizeMarketelAttributionTouch(body?.journeyFirstTouch);
    const latestTouch = sanitizeMarketelAttributionTouch(body?.journeyLatestTouch);
    if (!Object.keys(firstTouch).length && !Object.keys(latestTouch).length) return null;
    return { firstTouch, latestTouch };
}

function marketelAttributionMetadata(body, base = {}) {
    const attribution = marketelAttributionFromBody(body);
    return {
        ...base,
        ...(attribution ? { attribution } : {}),
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
    // The reveal was rebuilt around real screenshots played as beats, and these
    // are the per-beat milestones it has been firing ever since. They were never
    // added here, so every one of them was rejected as an unknown event and the
    // guest-app and assistant stages recorded nothing between entry and exit.
    'GuestAppOwnerEditorViewed',
    'GuestAppInstallBannerViewed',
    'GuestAppInstallSheetViewed',
    'GuestAppHomeScreenViewed',
    'GuestAppRebookViewed',
    'GuestAppBroadcastViewed',
    // Guestel replaced the retired browser-install path. Keep the historic
    // names above so old sessions remain readable; the current reveal packs
    // the Front Desk, App Clip handoff and Guestel screens into three optional
    // carousels.
    'GuestelInstallFlowViewed',
    'GuestelWalletViewed',
    'GuestelReachViewed',
    'AssistantTextProofViewed',
    'AssistantAppProofViewed',
    'AssistantFallbackViewed',
    'MarketelSystemViewed',
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
        const revealStepByEvent = {
            BookingEngineRevealViewed: 1,
            AssistantRevealViewed: 2,
            GuestAppRevealViewed: 3,
            ActivationOfferViewed: 3,
            ActivationCtaClicked: 3,
        };
        if (Object.prototype.hasOwnProperty.call(revealStepByEvent, eventName)) {
            const revealDepth = revealStepByEvent[eventName];
            // The reveal is a hub now, not a sequence of screens. Preserve the
            // furthest completed depth so opening an earlier item cannot make a
            // recovery email forget the items the owner already inspected.
            await prisma.hotelConfig.updateMany({
                where: { id: hotelId, revealProgressStep: { lt: revealDepth } },
                data: { revealProgressStep: revealStepByEvent[eventName] },
            }).catch(() => {});
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
        // The activation screen is the first point where the owner has seen
        // the complete product and the $199 offer. Send one standard server
        // ViewContent event here; the individual reveal beats stay in our rich
        // first-party telemetry and do not muddy Meta's optimization signal.
        if (eventName === 'ActivationOfferViewed') {
            const hotel = await prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: { ownerEmail: true, ownerPhone: true, subscribed: true },
            }).catch(() => null);
            if (hotel && !hotel.subscribed) {
                const meta = marketelMetaContext(req);
                await queueMarketelCAPI('ViewContent', {
                    hotelId,
                    email: hotel.ownerEmail || '',
                    phone: hotel.ownerPhone || '',
                    externalId: hotelId,
                    ip: req.ip || req.socket?.remoteAddress || '',
                    userAgent: req.headers['user-agent'] || '',
                    sourceUrl: meta.sourceUrl,
                    fbp: meta.fbp,
                    fbc: meta.fbc,
                    value: 199,
                    currency: 'USD',
                    eventId: `marketel-offer.${hotelId}`,
                    contentName: 'Marketel activation offer',
                }).catch((error) => console.error('Activation offer CAPI queue failed:', error.message));
            }
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
                    policyChosen: false,
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
                    bookingApprovalPolicyChosenAt: true,
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
                policyChosen: !!hotel?.bookingApprovalPolicyChosenAt,
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
            if (requested === 'release' && (await countBookingApprovalChannels(hotelId)).total < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Connect at least one phone for app alerts or Assistant texts before choosing safety-first release.',
                });
            }
            data.bookingApprovalNoResponseAction = requested;
            data.bookingApprovalPolicyChosenAt = new Date();
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

// Compact post-activation health check. This is deliberately operational—not
// another onboarding tour—so an owner can see whether the system is actually
// ready to accept and safely handle a live guest.
app.get('/api/crm/operational-readiness', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (isStaticOnlyHotelId(hotelId)) {
            return res.json({ success: true, data: { visible: false, items: [], issues: [] } });
        }

        const [hotel, primaryDomain, channels, directBookings, failedJobs] = await Promise.all([
            prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: {
                    subscribed: true,
                    setupComplete: true,
                    bookingApprovalEnabled: true,
                    bookingApprovalNoResponseAction: true,
                    bookingApprovalPolicyChosenAt: true,
                },
            }),
            prisma.hotelDomain.findFirst({
                where: { hotelId, isPrimary: true },
                select: { domain: true },
            }),
            countBookingApprovalChannels(hotelId),
            prisma.booking.count({
                where: {
                    hotelId,
                    bookingType: { not: 'manual' },
                    status: ACTIVE_BOOKING_STATUS_FILTER,
                },
            }).catch(() => 0),
            prisma.bookingSideEffectJob.findMany({
                where: {
                    hotelId,
                    OR: [
                        { status: 'failed' },
                        { status: 'retrying', attempts: { gte: 3 } },
                    ],
                },
                include: {
                    booking: {
                        select: {
                            id: true,
                            roomName: true,
                            guestFirstName: true,
                            guestLastName: true,
                            status: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: 5,
            }).catch(() => []),
        ]);
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });

        const live = !!hotel.subscribed && !!primaryDomain?.domain;
        const alertReachable = channels.total > 0;
        const policyChosen = !!hotel.bookingApprovalPolicyChosenAt;
        const testCompleted = directBookings > 0;
        const items = [
            {
                key: 'booking_page',
                label: 'Booking page live',
                done: live,
                detail: live ? primaryDomain.domain : 'Activation or booking domain is not ready.',
                action: 'page',
            },
            {
                key: 'front_desk',
                label: 'Front Desk reachable',
                done: alertReachable,
                detail: alertReachable
                    ? `${channels.total} alert ${channels.total === 1 ? 'channel' : 'channels'} connected`
                    : 'Turn on app alerts or connect an Assistant phone.',
                action: 'assistant',
            },
            {
                key: 'fallback_rule',
                label: 'No-answer rule chosen',
                done: policyChosen,
                detail: policyChosen
                    ? (resolveApprovalNoResponseAction(hotel) === 'release' ? 'Safety-first: release request' : 'Revenue-first: keep booking')
                    : 'Choose what happens when nobody answers.',
                action: 'assistant',
            },
            {
                key: 'test_booking',
                label: 'Booking path verified',
                done: testCompleted,
                detail: testCompleted ? 'A direct booking reached Front Desk.' : 'Complete one real end-to-end test booking.',
                action: 'preview',
            },
        ];
        const issues = failedJobs.map((job) => ({
            id: job.id,
            bookingId: job.bookingId,
            type: job.type,
            error: job.lastError || 'This guest action needs attention.',
            roomName: job.booking?.roomName || 'Booking',
            guestName: [job.booking?.guestFirstName, job.booking?.guestLastName].filter(Boolean).join(' ') || 'Guest',
            bookingStatus: job.booking?.status || '',
            status: job.status,
            attempts: job.attempts,
            updatedAt: job.updatedAt,
        }));
        const complete = items.every((item) => item.done) && issues.length === 0;
        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            data: {
                visible: !!hotel.subscribed,
                complete,
                readyCount: items.filter((item) => item.done).length,
                totalCount: items.length,
                items,
                issues,
                bookingApprovalEnabled: hotel.bookingApprovalEnabled,
            },
        });
    } catch (error) {
        console.error('operational-readiness:', error.message);
        res.status(500).json({ success: false, message: 'Could not check launch readiness.' });
    }
});

app.post('/api/crm/booking-actions/:bookingId/retry', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const bookingId = String(req.params.bookingId || '').trim();
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, hotelId },
            select: { id: true },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        const reset = await prisma.bookingSideEffectJob.updateMany({
            where: { bookingId, hotelId, status: { in: ['failed', 'retrying'] } },
            data: {
                status: 'retrying',
                attempts: 0,
                nextAttemptAt: new Date(),
                lockedAt: null,
                lastError: null,
            },
        });
        if (reset.count) {
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    fulfillmentStatus: 'pending',
                    fulfillmentLastError: null,
                    fulfillmentUpdatedAt: new Date(),
                },
            });
        }
        const result = await runBookingSideEffectSweep({ bookingId, limit: 10 });
        res.json({
            success: true,
            retried: reset.count,
            fulfillment: result.fulfillment || await refreshBookingFulfillmentStatus(bookingId),
        });
    } catch (error) {
        console.error('booking-actions retry:', error.message);
        res.status(500).json({ success: false, message: 'Could not retry that guest action.' });
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
        const [events, installedBookings, recentBookings, legacyGuestPushSubscribers, nativeStayDevices, guestelPropertyDevices] = await Promise.all([
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
            prisma.guestNativePushDevice.findMany({
                where: { hotelId, active: true, deals: true },
                select: { deviceToken: true },
                distinct: ['deviceToken'],
            }).catch(() => []),
            prisma.guestelPropertyDevice?.findMany({
                where: { hotelId, active: true },
                select: { deviceToken: true, updates: true },
                distinct: ['deviceToken'],
            }).catch(() => []),
        ]);

        const guestelSavedDevices = new Set(guestelPropertyDevices.map(row => row.deviceToken)).size;
        const guestelBroadcastTokens = new Set([
            ...nativeStayDevices.map(row => row.deviceToken),
            ...guestelPropertyDevices.filter(row => row.updates).map(row => row.deviceToken),
        ]);
        // Legacy web endpoints and APNs tokens are different identifiers, so a
        // cross-channel duplicate cannot be safely merged. New iPhone users use
        // Guestel only; this sum keeps previously connected browsers reachable.
        const guestPushSubscribers = legacyGuestPushSubscribers + guestelBroadcastTokens.size;

        const byTouchpoint = {};
        for (const ev of events) {
            const tp = ev.touchpoint || 'unknown';
            if (!byTouchpoint[tp]) byTouchpoint[tp] = {
                views: 0,
                cta_clicks: 0,
                installed: 0,
                notification_prompts: 0,
                notification_granted: 0,
                notification_denied: 0,
                notification_dismissed: 0,
                notification_subscribed: 0,
                notification_failed: 0,
            };
            if (ev.eventType === 'view') byTouchpoint[tp].views++;
            else if (ev.eventType === 'cta_click') byTouchpoint[tp].cta_clicks++;
            else if (ev.eventType === 'installed') byTouchpoint[tp].installed++;
            else if (ev.eventType === 'notification_prompt') byTouchpoint[tp].notification_prompts++;
            else if (ev.eventType === 'notification_granted') byTouchpoint[tp].notification_granted++;
            else if (ev.eventType === 'notification_denied') byTouchpoint[tp].notification_denied++;
            else if (ev.eventType === 'notification_dismissed') byTouchpoint[tp].notification_dismissed++;
            else if (ev.eventType === 'notification_subscribed') byTouchpoint[tp].notification_subscribed++;
            else if (ev.eventType === 'notification_failed') byTouchpoint[tp].notification_failed++;
        }

        const totals = events.reduce((acc, ev) => {
            if (ev.eventType === 'view') acc.views++;
            else if (ev.eventType === 'cta_click') acc.cta_clicks++;
            else if (ev.eventType === 'installed') acc.installed++;
            else if (ev.eventType === 'notification_prompt') acc.notification_prompts++;
            else if (ev.eventType === 'notification_granted') acc.notification_granted++;
            else if (ev.eventType === 'notification_denied') acc.notification_denied++;
            else if (ev.eventType === 'notification_dismissed') acc.notification_dismissed++;
            else if (ev.eventType === 'notification_subscribed') acc.notification_subscribed++;
            else if (ev.eventType === 'notification_failed') acc.notification_failed++;
            return acc;
        }, {
            views: 0,
            cta_clicks: 0,
            installed: 0,
            notification_prompts: 0,
            notification_granted: 0,
            notification_denied: 0,
            notification_dismissed: 0,
            notification_subscribed: 0,
            notification_failed: 0,
        });

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
            legacyGuestPushSubscribers,
            guestelSavedDevices,
            guestelBroadcastSubscribers: guestelBroadcastTokens.size,
            byTouchpoint,
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Front Desk can hand a checking-in guest a one-use Guestel QR without exposing
// the reservation capability itself. Scanning it transfers exactly that stay;
// the bridge expires after 24 hours and can be claimed only once.
app.post('/api/crm/guestel-handoff', crmAuth, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const reservationCode = String(req.body?.reservationCode || '').trim();
        if (!reservationCode) {
            return res.status(400).json({ success: false, message: 'Choose a guest reservation first.' });
        }
        const booking = await findGuestBooking(hotelId, reservationCode);
        if (!booking || isDeadBookingStatus(booking.status)) {
            return res.status(404).json({ success: false, message: 'That active reservation could not be found.' });
        }
        const handoffToken = await issueGuestAppHandoff(booking);
        if (!handoffToken) {
            return res.status(503).json({ success: false, message: 'Could not prepare the Guestel pass.' });
        }
        res.json({ success: true, handoffToken, expiresInHours: 24 });
    } catch (error) {
        console.error('crm/guestel-handoff:', error.message);
        res.status(500).json({ success: false, message: 'Could not prepare the Guestel pass.' });
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

        const nativeSent = await sendNativeBroadcastToHotelGuests(hotelId, {
            title,
            body,
            url: `guestel://hotel?hotelId=${encodeURIComponent(hotelId)}`,
            tag: `hotel-broadcast-${hotelId}`,
            data: { type: 'guest_broadcast', hotelId },
        }, { TTL: 60 * 60 }, 'guestBroadcast');

        res.json({
            success: true,
            sent: result.sent + nativeSent,
            webSent: result.sent,
            nativeSent,
            failed: result.failed,
            cleaned: result.cleaned,
        });
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

// Owner-facing alerts only — legacy guest-browser subscriptions use source='guest'.
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
            ...(payloadObj.backgroundRefresh ? { 'content-available': 1 } : {}),
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
                'apns-topic': String(opts.topic || APNS_BUNDLE_ID),
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

// ── LIVE ACTIVITIES ───────────────────────────────────────────────────────
// Same APNs connection, different contract: a dedicated topic, the liveactivity
// push type, and a raw payload rather than an alert envelope.
function sendLiveActivityRequest(target, payload, opts = {}) {
    const host = target.environment === 'sandbox'
        ? 'https://api.sandbox.push.apple.com'
        : 'https://api.push.apple.com';
    const body = JSON.stringify(payload);
    const ttl = Math.max(0, Number(opts.TTL || 600));
    const headers = liveActivityApnsHeaders(APNS_BUNDLE_ID, { priority: opts.priority || 10 });

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
        timer = setTimeout(() => finish(new Error('APNs live activity request timed out')), 12000);
        client.once('error', error => finish(error));

        let request;
        try {
            request = client.request({
                ':method': 'POST',
                ':path': `/3/device/${target.token}`,
                authorization: `bearer ${createApnsProviderToken()}`,
                ...headers,
                'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
            });
        } catch (error) {
            finish(error);
            return;
        }

        let status = 0;
        let responseBody = '';
        request.setEncoding('utf8');
        request.on('response', h => { status = Number(h[':status'] || 0); });
        request.on('data', chunk => { responseBody += chunk; });
        request.on('error', error => finish(error));
        request.on('end', () => {
            let reason = '';
            try { reason = JSON.parse(responseBody || '{}').reason || ''; } catch (_) {}
            if (status === 200) return finish(null, { ok: true, status });
            const error = new Error(`APNs ${status || 'error'}${reason ? `: ${reason}` : ''}`);
            error.statusCode = status;
            error.reason = reason;
            finish(error);
        });
        request.end(body);
    });
}

const LIVE_ACTIVITY_DEAD_REASONS = new Set([
    'BadDeviceToken',
    'DeviceTokenNotForTopic',
    'Unregistered',
    'ExpiredToken',
]);

/**
 * Reconciles a booking's Live Activity with its current status.
 *
 * Called from the one place every decision already funnels through, so an owner
 * tap, an SMS reply, a notification action and the auto sweep all end the card
 * the same way. Best-effort throughout: a failed push must never change the
 * outcome of the booking that triggered it.
 */
async function syncBookingLiveActivity(booking, options = {}) {
    if (!APNS_CONFIGURED || !booking?.id || !prisma.liveActivity) return;
    try {
        const hotelId = booking.hotelId;
        const existing = await prisma.liveActivity.findFirst({
            where: { bookingId: booking.id, state: 'active' },
            orderBy: { createdAt: 'desc' },
        });
        const decision = liveActivityActionForBooking(booking, existing);
        console.log(`🎬 [live-activity] booking=${booking.id} hotel=${hotelId} status=${booking.status} action=${decision.action}${decision.reason ? ` (${decision.reason})` : ''}`);
        if (decision.action === 'none') return;

        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { id: true, name: true },
        }).catch(() => null);

        if (decision.action === 'start') {
            const starters = await prisma.liveActivityStarter.findMany({
                where: { hotelId, active: true },
            });
            if (!starters.length) {
                console.log(`🎬 [live-activity] no push-to-start tokens registered for hotel=${hotelId} — card skipped (device must open Front Desk on iOS 17.2+ with Live Activities on)`);
                return;
            }
            const payload = buildStartPayload(booking, hotel, options);
            const results = await Promise.allSettled(starters.map(starter =>
                sendLiveActivityRequest({ token: starter.startToken, environment: starter.environment }, payload)
            ));
            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason?.reason || r.reason?.message || 'error');
            console.log(`🎬 [live-activity] start push booking=${booking.id}: ${sent}/${starters.length} sent${failed.length ? `, failed=[${failed.join(', ')}]` : ''}`);
            const deadIds = results
                .map((r, i) => (r.status === 'rejected' && LIVE_ACTIVITY_DEAD_REASONS.has(r.reason?.reason) ? starters[i].id : null))
                .filter(Boolean);
            if (deadIds.length) {
                await prisma.liveActivityStarter.updateMany({
                    where: { id: { in: deadIds } },
                    data: { active: false },
                }).catch(() => {});
            }
            return;
        }

        // update | end — addressed to the activity's own token.
        const payload = decision.action === 'end'
            ? buildEndPayload(booking, options)
            : buildUpdatePayload(booking, options);
        await sendLiveActivityRequest(
            { token: existing.updateToken, environment: existing.environment },
            payload
        ).catch(error => {
            console.error(`❌ [live-activity] ${decision.action} booking=${booking.id}: ${error.message}`);
        });

        if (decision.action === 'end') {
            await prisma.liveActivity.update({
                where: { id: existing.id },
                data: { state: 'ended', endedAt: new Date() },
            }).catch(() => {});
        }
    } catch (error) {
        console.error(`❌ [live-activity] sync failed for booking=${booking?.id}: ${error.message}`);
    }
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

async function sendNativePushToGuestBooking(bookingId, payloadObj, opts = {}, label = 'guestNativePush') {
    if (!GUESTEL_APNS_CONFIGURED || !bookingId || !prisma.guestNativePushDevice) {
        if (!GUESTEL_APNS_CONFIGURED) console.error(`❌ [guest-apns] ${label}: Guestel APNs is not configured`);
        return 0;
    }
    const preference = opts.preference === 'stayUpdates' ? 'stayUpdates' : 'messages';
    const devices = await prisma.guestNativePushDevice.findMany({
        where: { bookingId, active: true, [preference]: true },
    });
    if (!devices.length) return 0;
    const results = await Promise.allSettled(devices.map(device =>
        sendApnsRequest(device, payloadObj, { ...opts, topic: GUESTEL_APNS_BUNDLE_ID })
    ));
    const deadReasons = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered']);
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(
                `❌ [guest-apns] ${label} booking=${bookingId} device=${devices[index].id}: `
                + `${result.reason?.message || result.reason}`
            );
        }
    });
    const deadIds = results
        .map((result, index) => result.status === 'rejected' && deadReasons.has(result.reason?.reason) ? devices[index].id : null)
        .filter(Boolean);
    if (deadIds.length) {
        await prisma.guestNativePushDevice.updateMany({
            where: { id: { in: deadIds } },
            data: { active: false },
        }).catch(() => {});
    }
    const sent = results.filter(result => result.status === 'fulfilled').length;
    console.log(`📲 [guest-apns] ${label} booking=${bookingId}: ${sent}/${devices.length} sent`);
    return sent;
}

async function sendNativeBroadcastToHotelGuests(hotelId, payloadObj, opts = {}, label = 'guestNativeBroadcast') {
    if (!GUESTEL_APNS_CONFIGURED || !hotelId || !prisma.guestNativePushDevice) return 0;
    const [stayRows, propertyRows] = await Promise.all([
        prisma.guestNativePushDevice.findMany({
            where: { hotelId, active: true, deals: true },
            distinct: ['deviceToken'],
        }),
        prisma.guestelPropertyDevice?.findMany({
            where: { hotelId, active: true, updates: true },
            distinct: ['deviceToken'],
        }) || [],
    ]);
    const rows = [...new Map([...stayRows, ...propertyRows].map(row => [row.deviceToken, row])).values()];
    if (!rows.length) return 0;
    const results = await Promise.allSettled(rows.map(device =>
        sendApnsRequest(device, payloadObj, { ...opts, topic: GUESTEL_APNS_BUNDLE_ID })
    ));
    const deadReasons = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered']);
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(
                `❌ [guest-apns] ${label} hotel=${hotelId} device=${rows[index].id || 'property-device'}: `
                + `${result.reason?.message || result.reason}`
            );
        }
    });
    const deadTokens = results
        .map((result, index) => result.status === 'rejected' && deadReasons.has(result.reason?.reason) ? rows[index].deviceToken : null)
        .filter(Boolean);
    if (deadTokens.length) {
        await Promise.all([
            prisma.guestNativePushDevice.updateMany({
                where: { deviceToken: { in: deadTokens } },
                data: { active: false },
            }).catch(() => {}),
            prisma.guestelPropertyDevice?.updateMany({
                where: { deviceToken: { in: deadTokens } },
                data: { active: false },
            }).catch(() => {}),
        ]);
    }
    const sent = results.filter(result => result.status === 'fulfilled').length;
    console.log(`📲 [guest-apns] ${label} hotel=${hotelId}: ${sent}/${rows.length} sent`);
    return sent;
}

async function saveGuestPushSubscription({ endpoint, p256dh, auth, hotelId, reservationCode }) {
    const cleanEndpoint = String(endpoint || '').trim();
    const cleanHotelId = String(hotelId || '').trim();
    const cleanCode = String(reservationCode || '').trim() || null;
    if (!cleanEndpoint || !p256dh || !auth || !cleanHotelId) {
        throw new Error('Missing subscription data');
    }
    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint: cleanEndpoint } });
    const existingCodes = existing?.source === 'guest' && existing.hotelId === cleanHotelId
        ? parseGuestPushReservationCodes(existing.reservationCode)
        : [];
    const reservationCodes = [...new Set([...existingCodes, cleanCode].filter(Boolean))];
    const data = {
        endpoint: cleanEndpoint,
        p256dh,
        auth,
        source: 'guest',
        hotelId: cleanHotelId,
        // A browser has one push endpoint even when its guest has multiple
        // upcoming stays. Preserve every thread instead of moving alerts to
        // whichever reservation was booked most recently.
        reservationCode: JSON.stringify(reservationCodes),
    };
    if (existing) {
        await prisma.pushSubscription.update({ where: { id: existing.id }, data });
    } else {
        await prisma.pushSubscription.create({ data });
    }
}

function parseGuestPushReservationCodes(value) {
    const clean = String(value || '').trim();
    if (!clean) return [];
    if (clean.startsWith('[')) {
        try {
            const parsed = JSON.parse(clean);
            if (Array.isArray(parsed)) {
                return parsed.map(code => String(code || '').trim()).filter(Boolean);
            }
        } catch (_) { /* legacy single-code values are handled below */ }
    }
    return [clean];
}

// Send push to guest subscriptions (optionally scoped to one reservation thread).
async function sendPushToGuests(hotelId, payloadObj, opts = {}, label = 'guestPush', reservationCode = '') {
    if (!VAPID_PRIVATE) { console.log(`🔕 [push] ${label} skipped — VAPID not configured (hotel=${hotelId})`); return { sent: 0, failed: 0, cleaned: 0 }; }
    if (!hotelId) { console.log(`🔕 [push] ${label} skipped — no hotelId`); return { sent: 0, failed: 0, cleaned: 0 }; }
    const reservationCodes = (Array.isArray(reservationCode) ? reservationCode : [reservationCode])
        .map((code) => String(code || '').trim())
        .filter(Boolean);
    let subs = await prisma.pushSubscription.findMany({ where: { hotelId, source: 'guest' } });
    if (reservationCodes.length > 0) {
        const requested = new Set(reservationCodes);
        subs = subs.filter(sub => (
            parseGuestPushReservationCodes(sub.reservationCode).some(code => requested.has(code))
        ));
    }
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
// pointless if no phone can receive the alert. Revenue-first properties keep
// the sale immediately; safety-first properties still honor their explicit
// release rule instead of silently changing it behind the owner's back.

const BOOKING_APPROVAL_TOKEN_EXPIRY_MS = 6 * 60 * 60 * 1000;
const BOOKING_APPROVAL_SWEEP_INTERVAL_MS = 60 * 1000;
const BOOKING_APPROVAL_DEFAULT_WINDOW_MINUTES = 20;
const BOOKING_APPROVAL_MIN_WINDOW_MINUTES = 1;
const BOOKING_APPROVAL_MAX_WINDOW_MINUTES = 180;
const BOOKING_APPROVAL_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const BOOKING_SIDE_EFFECT_SWEEP_INTERVAL_MS = 60 * 1000;
const BOOKING_SIDE_EFFECT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const BOOKING_SIDE_EFFECT_MAX_ATTEMPTS = 8;
const BOOKING_SIDE_EFFECT_TYPES = new Set([
    'confirmation_email',
    'release_hold',
    'release_email',
    'cancellation_email',
]);
const BOOKING_SIDE_EFFECT_PRIORITY = {
    release_hold: 0,
    release_email: 1,
    cancellation_email: 1,
    confirmation_email: 2,
};

function bookingSideEffectRetryDelayMs(attempts) {
    const delays = [30_000, 2 * 60_000, 10 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000];
    return delays[Math.min(delays.length - 1, Math.max(0, Number(attempts || 1) - 1))];
}

function bookingSideEffectMessageId(job) {
    const safeType = String(job?.type || 'action').replace(/[^a-z0-9_-]/gi, '-');
    const safeBooking = String(job?.bookingId || 'booking').replace(/[^a-z0-9_-]/gi, '-');
    return `<marketel-${safeType}-${safeBooking}@bookmarketel.com>`;
}

async function enqueueBookingSideEffectsTx(tx, booking, jobs) {
    const normalized = (Array.isArray(jobs) ? jobs : [])
        .map((job) => typeof job === 'string' ? { type: job } : job)
        .filter((job) => BOOKING_SIDE_EFFECT_TYPES.has(job?.type));
    if (!booking?.id || !booking?.hotelId || !normalized.length) return;

    await tx.bookingSideEffectJob.createMany({
        data: normalized.map((job) => ({
            bookingId: booking.id,
            hotelId: booking.hotelId,
            type: job.type,
            payload: job.payload === undefined ? undefined : job.payload,
        })),
        skipDuplicates: true,
    });
    await tx.booking.update({
        where: { id: booking.id },
        data: {
            fulfillmentStatus: 'pending',
            fulfillmentLastError: null,
            fulfillmentUpdatedAt: new Date(),
        },
    });
}

async function refreshBookingFulfillmentStatus(bookingId) {
    if (!bookingId) return { status: 'none', pending: 0, failed: 0 };
    const jobs = await prisma.bookingSideEffectJob.findMany({
        where: { bookingId },
        select: { status: true, lastError: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
    });
    if (!jobs.length) return { status: 'none', pending: 0, failed: 0 };
    const failedJobs = jobs.filter((job) => job.status === 'failed');
    const pendingJobs = jobs.filter((job) => !['completed', 'failed'].includes(job.status));
    const status = failedJobs.length ? 'attention' : (pendingJobs.length ? 'pending' : 'completed');
    const lastError = failedJobs[0]?.lastError || null;
    await prisma.booking.update({
        where: { id: bookingId },
        data: {
            fulfillmentStatus: status,
            fulfillmentLastError: lastError,
            fulfillmentUpdatedAt: new Date(),
        },
    }).catch(() => {});
    return { status, pending: pendingJobs.length, failed: failedJobs.length, lastError };
}

async function performBookingSideEffect(job) {
    const booking = await prisma.booking.findUnique({ where: { id: job.bookingId } });
    if (!booking) return;
    const messageId = bookingSideEffectMessageId(job);

    if (job.type === 'release_hold') {
        if (!(await voidBookingHold(booking))) throw new Error('The guest card hold could not be released yet.');
        return;
    }

    // Never tell a guest their hold was released until Stripe has actually
    // accepted the cancellation/refund. The hold job runs first; this guard is
    // also safe when multiple Render workers overlap.
    if (['release_email', 'cancellation_email'].includes(job.type)
        && booking.stripePaymentIntentId
        && booking.holdStatus !== 'released') {
        throw new Error('Waiting for the card hold to be released before emailing the guest.');
    }

    if (job.type === 'release_email') {
        if (!(await sendBookingReleasedEmail(booking, booking.approvalOutcome || 'owner_released', messageId))) {
            throw new Error('The release email could not be sent yet.');
        }
        return;
    }
    if (job.type === 'cancellation_email') {
        if (!(await sendBookingCancelledEmail(booking, booking.cancellationReason || '', messageId))) {
            throw new Error('The cancellation email could not be sent yet.');
        }
        return;
    }
    if (job.type === 'confirmation_email') {
        const sent = await notifyGuestBookingConfirmed({
            req: null,
            hotelId: booking.hotelId,
            guestInfo: guestInfoFromBookingRow(booking),
            bookingDetails: bookingDetailsFromBookingRow(booking),
            reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
            messageId,
        });
        if (!sent) throw new Error('The confirmation email could not be sent yet.');
    }
}

async function claimBookingSideEffectJob(jobId) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - BOOKING_SIDE_EFFECT_LOCK_TIMEOUT_MS);
    const claimed = await prisma.bookingSideEffectJob.updateMany({
        where: {
            id: jobId,
            nextAttemptAt: { lte: now },
            OR: [
                { status: { in: ['pending', 'retrying'] } },
                { status: 'processing', lockedAt: { lte: staleBefore } },
            ],
        },
        data: {
            status: 'processing',
            lockedAt: now,
            attempts: { increment: 1 },
            lastError: null,
        },
    });
    if (claimed.count !== 1) return null;
    return prisma.bookingSideEffectJob.findUnique({ where: { id: jobId } });
}

async function processClaimedBookingSideEffect(job) {
    try {
        await performBookingSideEffect(job);
        await prisma.bookingSideEffectJob.update({
            where: { id: job.id },
            data: {
                status: 'completed',
                completedAt: new Date(),
                lockedAt: null,
                lastError: null,
            },
        });
    } catch (error) {
        const message = String(error?.message || 'Booking action failed').slice(0, 1000);
        const permanent = Number(job.attempts || 0) >= BOOKING_SIDE_EFFECT_MAX_ATTEMPTS;
        await prisma.bookingSideEffectJob.update({
            where: { id: job.id },
            data: {
                status: permanent ? 'failed' : 'retrying',
                nextAttemptAt: new Date(Date.now() + bookingSideEffectRetryDelayMs(job.attempts)),
                lockedAt: null,
                lastError: message,
            },
        });
        console.error(`booking side effect ${job.type} booking=${job.bookingId} attempt=${job.attempts}:`, message);
    }
    return refreshBookingFulfillmentStatus(job.bookingId);
}

async function runBookingSideEffectSweep({ bookingId = '', limit = 100 } = {}) {
    if (!prisma.bookingSideEffectJob) return { processed: 0 };
    const now = new Date();
    const staleBefore = new Date(now.getTime() - BOOKING_SIDE_EFFECT_LOCK_TIMEOUT_MS);
    const candidates = await prisma.bookingSideEffectJob.findMany({
        where: {
            ...(bookingId ? { bookingId } : {}),
            nextAttemptAt: { lte: now },
            OR: [
                { status: { in: ['pending', 'retrying'] } },
                { status: 'processing', lockedAt: { lte: staleBefore } },
            ],
        },
        orderBy: { createdAt: 'asc' },
        take: Math.max(1, Math.min(500, Number(limit) || 100)),
    });
    candidates.sort((left, right) =>
        (BOOKING_SIDE_EFFECT_PRIORITY[left.type] ?? 10) - (BOOKING_SIDE_EFFECT_PRIORITY[right.type] ?? 10)
        || left.createdAt.getTime() - right.createdAt.getTime()
    );
    let processed = 0;
    let latest = null;
    for (const candidate of candidates) {
        const claimed = await claimBookingSideEffectJob(candidate.id).catch(() => null);
        if (!claimed) continue;
        latest = await processClaimedBookingSideEffect(claimed);
        processed += 1;
    }
    if (bookingId && !latest) latest = await refreshBookingFulfillmentStatus(bookingId);
    return { processed, fulfillment: latest };
}

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
    const windowMinutes = resolveApprovalWindowMinutes(config);
    if ((await countBookingApprovalChannels(config.id)).total < 1) {
        if (noResponseAction === 'confirm') return { ...off, outcome: 'auto_no_alerts' };
        // A phone can disappear after the policy was saved. Preserve the review
        // window and the owner's safety-first choice rather than confirming.
        return {
            hold: true,
            outcome: null,
            windowMinutes,
            pendingUntil: new Date(Date.now() + windowMinutes * 60 * 1000),
            noResponseAction,
            noAlertChannels: true,
        };
    }

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
        const checkinIso = normalizeIsoDate(checkin);
        const checkoutIso = normalizeIsoDate(checkout);
        if (!checkinIso || !checkoutIso) return '';
        const opts = { month: 'short', day: 'numeric' };
        // Noon UTC is deliberate: formatting a database midnight in a western
        // timezone can display the previous day. Owner push, SMS, email and the
        // booking card must all show the guest's check-in and checkout dates.
        const a = new Date(`${checkinIso}T12:00:00.000Z`).toLocaleDateString('en-US', opts);
        const b = new Date(`${checkoutIso}T12:00:00.000Z`).toLocaleDateString('en-US', opts);
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
        const current = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null);
        if (current) booking = current;
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
        const fulfillmentDone = booking.fulfillmentStatus === 'completed';
        const suffix = autoReleased
            ? (fulfillmentDone
                ? 'No response in time. The hold was voided and the guest was notified.'
                : 'No response in time. Front Desk is finishing the hold release and guest email.')
            : (released
                ? (fulfillmentDone
                    ? 'Room is back on sale, the hold was voided, and the guest was notified.'
                    : 'Room is back on sale. Front Desk is finishing the hold release and guest email.')
                : (autoConfirmed
                    ? (fulfillmentDone ? 'No response in time, so it went through and the guest was emailed.' : 'No response in time, so it went through. Front Desk is finishing the guest email.')
                    : (fulfillmentDone ? 'Guest has been emailed.' : 'Front Desk is finishing the guest email.')));

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

// Guest-side counterpart to the owner alert. Front Desk is the source of
// truth, so every material reservation transition should reach an installed
// guest app immediately as well as through email and foreground polling.
async function notifyGuestBookingStateChanged(booking, status, reason = '') {
    if (!booking?.hotelId || !booking?.id) return { sent: 0, failed: 0, cleaned: 0 };
    const normalized = String(status || booking.status || '').trim().toLowerCase();
    const code = guestBookingThreadCode(booking);
    const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
    const room = booking.roomName || 'Your room';
    let title = 'Your reservation was updated';
    let body = `${room}${stay ? ` · ${stay}` : ''}`;
    if (normalized === 'confirmed') {
        title = 'Your reservation is confirmed ✓';
        body = `${room}${stay ? ` · ${stay}` : ''} is confirmed.`;
    } else if (normalized === 'released') {
        title = 'Your room request was released';
        body = `The property could not confirm ${room}${stay ? ` for ${stay}` : ''}. Your temporary card hold is being released.`;
    } else if (normalized === 'cancelled' || normalized === 'canceled') {
        title = 'Your reservation was cancelled';
        body = reason
            ? `${room}${stay ? ` · ${stay}` : ''}: ${String(reason).trim().slice(0, 120)}`
            : `${room}${stay ? ` · ${stay}` : ''} was cancelled by the property. Tap for details or to contact Front Desk.`;
    }
    const payload = {
        title,
        body,
        url: `/guest/home?stay=${encodeURIComponent(code)}`,
        icon: `/api/hotel/${encodeURIComponent(booking.hotelId)}/guest-app-icon.png?s=192`,
        badge: '/icon-192.png',
        tag: `guest-booking-${booking.id}`,
        requireInteraction: normalized === 'released' || normalized === 'cancelled' || normalized === 'canceled',
        data: {
            type: 'guest_booking_status',
            hotelId: booking.hotelId,
            reservationCode: code,
            status: normalized,
        },
    };
    const [web, native] = await Promise.all([
        sendPushToGuests(
            booking.hotelId,
            payload,
            { TTL: 24 * 60 * 60, urgency: 'high' },
            'guestBookingStatus',
            guestBookingThreadCodes(booking, code)
        ),
        sendNativePushToGuestBooking(
            booking.id,
            {
                ...payload,
                url: `guestel://messages?hotelId=${encodeURIComponent(booking.hotelId)}&code=${encodeURIComponent(code)}`,
                backgroundRefresh: true,
            },
            { TTL: 24 * 60 * 60, preference: 'stayUpdates' },
            'bookingStatus'
        ),
    ]);
    return { ...web, native };
}

// Release an uncaptured authorization or refund a captured payment when the
// owner turns a confirmed booking away. Idempotency protects repeat taps.
async function voidBookingHold(booking) {
    if (!booking?.stripePaymentIntentId) return true;
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
        return true;
    } catch (e) {
        console.error('voidBookingHold:', e.message);
        return false;
    }
}

async function sendBookingReleasedEmail(booking, outcome = 'owner_released', messageId = '') {
    if (!booking?.guestEmail || booking.guestEmail === '-') return true;
    if (!emailTransporter) return false;
    try {
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            select: { name: true, phone: true, ownerEmail: true },
        }).catch(() => null);
        const hotelName = hotel?.name || 'the hotel';
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'there';
        const stay = formatApprovalStayRange(booking.checkinDate, booking.checkoutDate);
        const safeHotelName = escapeXml(hotelName);
        const safeGuestName = escapeXml(guestName);
        const safeRoomName = escapeXml(booking.roomName || 'room');
        const automatic = outcome === 'auto_released';
        const reasonCopy = automatic
            ? `The property did not confirm availability for <strong>${safeRoomName}</strong>${stay ? ` (${escapeXml(stay)})` : ''} before its review window ended, so your request was released automatically.`
            : `Unfortunately <strong>${safeHotelName}</strong> can't honour your request for <strong>${safeRoomName}</strong>${stay ? ` (${escapeXml(stay)})` : ''} — the room was taken just before your booking came through.`;
        const phoneLine = hotel?.phone
            ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Call ${escapeXml(hotelName)} at ${escapeXml(hotel.phone)} and they'll help you find another option.</p>`
            : (hotel?.ownerEmail
                ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Reply to this email and ${escapeXml(hotelName)} will help you find another option.</p>`
                : `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Contact ${escapeXml(hotelName)} directly if you need help finding another option.</p>`);

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#1a2b22;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">We couldn't confirm your room</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${safeGuestName},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">${reasonCopy}</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>You have not been charged.</strong> The temporary $1 authorisation on your card has been voided and will disappear from your statement.</p>${phoneLine}</td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: booking.guestEmail,
            ...(hotel?.ownerEmail ? { replyTo: hotel.ownerEmail } : {}),
            ...(messageId ? { messageId } : {}),
            subject: `Unable to confirm your reservation — ${hotelName}`,
            html,
        });
        console.log(`📧 released-booking email sent to ${booking.guestEmail}`);
        return true;
    } catch (e) {
        console.error('sendBookingReleasedEmail:', e.message);
        return false;
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
        const ownerAppReady = !!MARKETEL_FRONTDESK_APP_STORE_URL;
        const ownerCtaUrl = ownerAppReady ? MARKETEL_FRONTDESK_APP_STORE_URL : frontdeskUrl;
        const ownerCtaLabel = ownerAppReady ? 'Download Marketel Front Desk →' : 'Open Web Front Desk →';
        const ownerAppNote = ownerAppReady
            ? 'Marketel Front Desk is the owner app. Guests use Guestel to keep your property, follow their stay, and book direct again.'
            : 'The Web Front Desk is available now. Connect the Marketel Front Desk App Store listing before launch to receive native iPhone booking alerts.';

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#2E7D5B;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">This booking confirmed without you</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>${booking.roomName}</strong>${stay ? ` · ${stay}` : ''} was just booked at ${hotelName} and went straight to confirmed.</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">With the Marketel Front Desk owner app on your iPhone, you'd get <strong>${minutes} minutes</strong> to release a room you'd already sold somewhere else—one tap from the notification. Right now there's no owner device we can alert, so every booking locks in automatically.</p><div style="text-align:center;margin:0 0 20px;"><a href="${ownerCtaUrl}" style="display:inline-block;background:#2E7D5B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:10px;">${ownerCtaLabel}</a></div><div style="background:#f8f9fa;border-radius:10px;padding:14px 16px;"><p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">${ownerAppNote}</p></div></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

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
            fulfillment: await refreshBookingFulfillmentStatus(booking.id).catch(() => ({ status: booking.fulfillmentStatus || 'none' })),
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
        if (updated.count === 1) {
            await enqueueBookingSideEffectsTx(tx, booking, wantRelease
                ? ['release_hold', 'release_email']
                : ['confirmation_email']);
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

    if (!wantRelease) {
        // Only the sold-out signal is genuinely new here — the owner already got
        // the approval push, so notifyNewBooking would just be noise.
        maybeNotifyRoomSoldOutToday(
            decided.hotelId,
            decided.roomName,
            normalizeIsoDate(decided.checkinDate)
        ).catch(() => {});
    }

    // Try immediately for a fast happy path. Any provider outage stays in the
    // durable outbox and the background sweep resumes it after a restart.
    const fulfillmentRun = await runBookingSideEffectSweep({ bookingId: decided.id, limit: 10 })
        .catch((error) => ({
            processed: 0,
            fulfillment: { status: 'pending', lastError: error.message },
        }));

    notifyBookingApprovalResolved(decided, outcome, source).catch(() => {});
    notifyGuestBookingStateChanged(decided, decided.status).catch(() => {});
    // Every decision route reaches here — owner tap, SMS reply, notification
    // action and the auto sweep — so ending the Lock Screen card once, here,
    // is what stops a ghost countdown surviving a decision made elsewhere.
    syncBookingLiveActivity(decided, { decidedBy: source }).catch(() => {});
    console.log(`✅ [approval] ${outcome} booking=${decided.id} hotel=${decided.hotelId} via=${source}`);

    return {
        ok: true,
        code: 'applied',
        status: decided.status,
        outcome,
        booking: decided,
        fulfillment: fulfillmentRun.fulfillment || { status: 'pending' },
    };
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
            fulfillment: outcome.fulfillment || null,
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
            fulfillment: outcome.fulfillment || null,
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

async function sendBookingCancelledEmail(booking, reason, messageId = '') {
    if (!booking?.guestEmail || booking.guestEmail === '-') return true;
    if (!emailTransporter) return false;
    try {
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            select: { name: true, phone: true, ownerEmail: true },
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
            : (hotel?.ownerEmail
                ? `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Reply to this email and ${hotelName} will help you sort out somewhere to stay.</p>`
                : `<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Please contact ${hotelName} directly if you need help finding another place to stay.</p>`);

        // This guest already received a "Reservation confirmed" email, so the copy
        // has to acknowledge that directly rather than pretend it never happened.
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="background:#7f1d1d;padding:24px 32px;text-align:center;color:white;"><h1 style="margin:0;font-size:20px;font-weight:700;">Your reservation was cancelled</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">Hi ${escapeXml(guestName)},</p><p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;">We're sorry — ${hotelName} has had to cancel your reservation for <strong>${escapeXml(booking.roomName)}</strong>${stay ? ` (${stay})` : ''}, confirmation <strong>${escapeXml(code)}</strong>. We know you'd already had a confirmation from us, and we're sorry for the trouble this causes.</p>${reasonLine}<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.55;"><strong>Your payment has been handled automatically.</strong> Any temporary card authorisation has been released, and any captured online payment has been submitted for refund.</p>${contactLine}</td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Powered by Marketel</p></td></tr></table></td></tr></table></body></html>`;

        await emailTransporter.sendMail({
            from: `"${hotelName}" <support@bookmarketel.com>`,
            to: booking.guestEmail,
            ...(hotel?.ownerEmail ? { replyTo: hotel.ownerEmail } : {}),
            ...(messageId ? { messageId } : {}),
            subject: `Your reservation was cancelled — ${hotelName}`,
            html,
        });
        console.log(`📧 cancellation email sent to ${booking.guestEmail}`);
        return true;
    } catch (e) {
        console.error('sendBookingCancelledEmail:', e.message);
        return false;
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
        return {
            ok: true,
            code: 'already_cancelled',
            status: booking.status,
            booking,
            fulfillment: await refreshBookingFulfillmentStatus(booking.id)
                .catch(() => ({ status: booking.fulfillmentStatus || 'none' })),
        };
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
        if (updated.count === 1) {
            await enqueueBookingSideEffectsTx(tx, booking, [
                'release_hold',
                { type: 'cancellation_email', payload: { reason: String(reason || '').trim().slice(0, 500) } },
            ]);
        }
        return updated;
    }, { maxWait: 5000, timeout: 15000 }));
    if (result.count !== 1) {
        const fresh = await prisma.booking.findUnique({ where: { id: booking.id } }).catch(() => null);
        return {
            ok: true,
            code: 'already_cancelled',
            status: fresh?.status || booking.status,
            booking: fresh || booking,
            fulfillment: await refreshBookingFulfillmentStatus(booking.id)
                .catch(() => ({ status: fresh?.fulfillmentStatus || booking.fulfillmentStatus || 'none' })),
        };
    }

    const cancelled = {
        ...booking,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: String(reason || '').trim().slice(0, 500) || null,
        ownerReviewStatus: 'cancelled',
        ownerReviewedAt: new Date(),
        ownerReviewNextReminderAt: null,
    };
    const fulfillmentRun = await runBookingSideEffectSweep({ bookingId: cancelled.id, limit: 10 })
        .catch((error) => ({
            processed: 0,
            fulfillment: { status: 'pending', lastError: error.message },
        }));
    notifyGuestBookingStateChanged(cancelled, 'cancelled', cancelled.cancellationReason || '').catch(() => {});
    syncBookingLiveActivity(cancelled, { decidedBy: 'owner-cancel' }).catch(() => {});
    console.log(`🚫 [cancel] booking=${booking.id} hotel=${hotelId} was=${booking.status} reason=${reason || 'none'}`);

    return {
        ok: true,
        code: 'cancelled',
        status: 'cancelled',
        booking: cancelled,
        fulfillment: fulfillmentRun.fulfillment || { status: 'pending' },
    };
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
            fulfillment: outcome.fulfillment || null,
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
            fulfillment: outcome.fulfillment || null,
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
    const scheduledPushTimer = setInterval(() => {
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
    scheduledPushTimer.unref?.();
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
    'SetupResumed',
    'RevealResumed',
    'RevealResumeEmailSent',
    'MagicLinkRequested',
    'MagicLinkOpened',
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
    'SetupResumeEmailSent',
    'PreviewReadyEmailSending',
    'PreviewReadyEmailSent',
    'CheckoutCancelled',
    'QualifiedLead',
    'CheckoutRecoveryEmailSending',
    'CheckoutRecoveryEmailSent',
    'LegacyComebackEmailSent',
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
    'QualifiedLead',
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
            journeyFirstTouch,
            journeyLatestTouch,
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
                select: { id: true, ownerEmail: true, setupProgressStep: true },
            });
            if (!setupHotel) {
                return res.status(404).json({ success: false, message: 'Invalid setup token' });
            }
            trackedHotelId = setupHotel.id;
            trackedEmail = setupHotel.ownerEmail || null;
        }

        if (eventName === 'QualityAnswer') {
            const allowedAnswers = new Set([
                'online_ota_leakage',
                'direct_calls_messages',
                'repeat_guests',
                'building_demand',
                // Accept the previous page for in-flight/cached setup sessions.
                'google_website',
                'social_ads',
                'ota_marketplaces',
                'referrals_offline',
            ]);
            if (!setupHotel || !allowedAnswers.has(contentName)) {
                return res.status(400).json({ success: false, message: 'Invalid quality answer' });
            }
        }

        const setupStepMatch = /^Step([1-4])Reached$/.exec(String(eventName || ''));
        const durableSetupStep = eventName === 'QualityAnswer'
            ? 4
            : (setupStepMatch ? Number(setupStepMatch[1]) : 0);
        if (setupHotel && durableSetupStep > (Number(setupHotel.setupProgressStep) || 1)) {
            await prisma.hotelConfig.update({
                where: { id: setupHotel.id },
                data: { setupProgressStep: durableSetupStep },
            }).catch(() => {});
            setupHotel.setupProgressStep = durableSetupStep;
        }

        // Lead now fires server-side the moment an email is submitted, so this
        // gate guards the deeper qualified signal instead. Same standard, same
        // once-per-setup rule — it just no longer competes to be the ad
        // optimization event.
        if (eventName === 'QualifiedLead') {
            const qualifiedAnswers = new Set([
                'online_ota_leakage',
                'direct_calls_messages',
                'repeat_guests',
                // Cached versions use the former answers. Apply the same
                // standard across angles while those sessions finish.
                'google_website',
                'social_ads',
                'ota_marketplaces',
            ]);
            if (!setupHotel || !qualifiedAnswers.has(contentName)) {
                return res.status(400).json({ success: false, message: 'Invalid qualified lead' });
            }

            // A setup can qualify only once. The browser also uses a stable
            // event_id, while this protects the database from replays.
            const existingLead = await prisma.funnelEvent.findFirst({
                where: {
                    eventName: 'QualifiedLead',
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
        const linkedMetadata = linkedSessionId
            ? marketelAttributionMetadata({ journeyFirstTouch, journeyLatestTouch }, { linkedJourney: true })
            : undefined;
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
                metadata: linkedMetadata,
                guestEmail: trackedEmail,
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.socket?.remoteAddress || null,
                contentName: cleanContentName,
                externalId: linkedExternalId,
            },
        });
        if (eventName === 'QualifiedLead') {
            void sendAdminPush('QualifiedLead', { property: trackedEmail || trackedHotelId });
        }

        // QualifiedLead stays first-party on purpose. Meta already gets the
        // shallow signal (Lead, on email submit) and a deeper standard one
        // (CompleteRegistration, on setup completion); adding a third would
        // split an already thin conversion volume across more events.
        res.json({ success: true });
    } catch (e) {
        console.error('Onboarding funnel event error:', e.message);
        res.json({ success: true }); // Don't fail silently
    }
});

const MARKETEL_ATTRIBUTION_MILESTONES = new Set([
    'Lead',
    'SetupCompleted',
    'ActivationOfferViewed',
    'CheckoutStarted',
    'PaymentSucceeded',
]);
const MARKETEL_ACQUISITION_ANGLES = ['direct', 'guest_app', 'assistant'];

// These are Marketel's own QA/App Review properties. They must keep working in
// the product, but counting them as customers, MRR, booking volume or funnel
// conversions makes the business dashboard lie. The exact IDs avoid hiding a
// future real property merely because its name happens to contain "studio".
const FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS = [
    'hotel-a39be0df',      // Jack’s Inn
    'hotel-app-review',    // App Review property
    'marketel-review-inn', // App Review property (legacy ID)
    'hotel-9dbf11ec',      // Studios 17
];
// Salah uses this address to run the real acquisition journey end to end.
// Resolve it to property IDs instead of hard-coding every disposable test
// property, so future QA runs remain available in the product without ever
// inflating /funnel, the portfolio, MRR, or the acquisition report.
const FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS = [
    'bro2theno@gmail.com',
];
let funnelDashboardExclusionCache = {
    expiresAt: 0,
    hotelIds: FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS,
    guestEmails: FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS,
    sessionIds: [],
};

async function funnelDashboardExclusions() {
    if (funnelDashboardExclusionCache.expiresAt > Date.now()) {
        return {
            hotelIds: funnelDashboardExclusionCache.hotelIds,
            guestEmails: funnelDashboardExclusionCache.guestEmails,
            sessionIds: funnelDashboardExclusionCache.sessionIds,
        };
    }
    const emailFilters = FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS.map((email) => ({
        ownerEmail: { equals: email, mode: 'insensitive' },
    }));
    const testHotels = emailFilters.length
        ? await prisma.hotelConfig.findMany({
            where: { OR: emailFilters },
            select: { id: true },
        }).catch(() => [])
        : [];
    const hotelIds = Array.from(new Set([
        ...FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS,
        ...testHotels.map((hotel) => hotel.id),
    ]));
    const guestEmailFilters = FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS.map((email) => ({
        guestEmail: { equals: email, mode: 'insensitive' },
    }));
    const rows = await prisma.funnelEvent.findMany({
        where: {
            OR: [
                { hotelId: { in: hotelIds } },
                ...guestEmailFilters,
            ],
            sessionId: { not: null },
        },
        distinct: ['sessionId'],
        select: { sessionId: true },
    }).catch(() => []);
    const sessionIds = rows.map((row) => row.sessionId).filter(Boolean);
    const guestEmails = FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS;
    funnelDashboardExclusionCache = { expiresAt: Date.now() + 15_000, hotelIds, guestEmails, sessionIds };
    return { hotelIds, guestEmails, sessionIds };
}

function funnelDashboardWhere(where, exclusions) {
    const filters = [where];
    if (exclusions?.hotelIds?.length) {
        filters.push({ hotelId: { notIn: exclusions.hotelIds } });
    }
    if (exclusions?.sessionIds?.length) {
        filters.push({
            OR: [
                { sessionId: null },
                { sessionId: { notIn: exclusions.sessionIds } },
            ],
        });
    }
    if (exclusions?.guestEmails?.length) {
        filters.push({
            OR: [
                { guestEmail: null },
                { NOT: { guestEmail: { in: exclusions.guestEmails, mode: 'insensitive' } } },
            ],
        });
    }
    return filters.length === 1 ? where : { AND: filters };
}

function normalizedMarketelAngle(value) {
    const angle = String(value || '').trim().toLowerCase();
    return MARKETEL_ACQUISITION_ANGLES.includes(angle) ? angle : 'direct';
}

function marketelAttributionTouchFromMetadata(metadata, preferLatest = false) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    const attribution = metadata.attribution && typeof metadata.attribution === 'object'
        ? metadata.attribution
        : metadata;
    const candidates = preferLatest
        ? [attribution.latestTouch, attribution.firstTouch]
        : [attribution.firstTouch, attribution.latestTouch];
    for (const candidate of candidates) {
        const clean = sanitizeMarketelAttributionTouch(candidate);
        if (Object.keys(clean).length) return clean;
    }
    return {};
}

function marketelAttributionDimensions(touch, fallbackAngle = 'direct') {
    const clean = sanitizeMarketelAttributionTouch(touch);
    let source = String(clean.utm_source || '').trim().toLowerCase();
    if (!source && /facebook|instagram|meta/i.test(clean.referrer || '')) source = 'meta';
    return {
        angle: normalizedMarketelAngle(clean.angle || fallbackAngle),
        source: source || 'unknown',
        medium: String(clean.utm_medium || '').trim().toLowerCase() || 'unknown',
        campaign: String(clean.utm_campaign || '').trim() || 'unlabeled',
        content: String(clean.utm_content || '').trim() || 'unlabeled',
        term: String(clean.utm_term || '').trim() || '',
    };
}

function emptyMarketelAttributionGroup(dimensions) {
    return {
        ...dimensions,
        landingViews: 0,
        started: 0,
        leads: 0,
        setupCompleted: 0,
        offerViewed: 0,
        checkoutStarted: 0,
        paid: 0,
        revenue: 0,
        startToPaidRate: 0,
    };
}

function finalizeMarketelAttributionGroup(group) {
    return {
        ...group,
        revenue: Math.round(Number(group.revenue || 0) * 100) / 100,
        startToPaidRate: group.started
            ? Math.round((group.paid / group.started) * 10000) / 100
            : 0,
    };
}

function addMarketelAttributionProperty(group, property) {
    group.started += 1;
    if (property.milestones.has('Lead')) group.leads += 1;
    if (property.milestones.has('SetupCompleted')) group.setupCompleted += 1;
    if (property.milestones.has('ActivationOfferViewed')) group.offerViewed += 1;
    if (property.milestones.has('CheckoutStarted')) group.checkoutStarted += 1;
    if (property.milestones.has('PaymentSucceeded')) group.paid += 1;
    group.revenue += property.revenue;
}

async function buildMarketelFunnelAttribution(since, until, exclusions = { hotelIds: [], sessionIds: [] }) {
    const [acquisitionRows, landingRows] = await Promise.all([
        withRetry(() => prisma.funnelEvent.findMany({
            where: funnelDashboardWhere({
                eventName: 'AcquisitionAngle',
                createdAt: { gte: since, lte: until },
                hotelId: { not: 'marketel-onboarding' },
            }, exclusions),
            orderBy: { createdAt: 'asc' },
            select: {
                hotelId: true,
                contentName: true,
                metadata: true,
                createdAt: true,
            },
        })),
        withRetry(() => prisma.funnelEvent.findMany({
            where: funnelDashboardWhere({
                eventName: 'LandingPageView',
                createdAt: { gte: since, lte: until },
            }, exclusions),
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                eventId: true,
                sessionId: true,
                contentName: true,
                metadata: true,
            },
        })),
    ]);

    const acquisitionByHotel = new Map();
    acquisitionRows.forEach((row) => {
        if (!acquisitionByHotel.has(row.hotelId)) acquisitionByHotel.set(row.hotelId, row);
    });
    const hotelIds = Array.from(acquisitionByHotel.keys());
    const [milestoneRows, journeyFallbackRows] = hotelIds.length
        ? await Promise.all([
            withRetry(() => prisma.funnelEvent.findMany({
                where: {
                    hotelId: { in: hotelIds },
                    eventName: { in: Array.from(MARKETEL_ATTRIBUTION_MILESTONES) },
                    createdAt: { gte: since, lte: until },
                },
                orderBy: { createdAt: 'asc' },
                select: {
                    hotelId: true,
                    eventName: true,
                    eventId: true,
                    value: true,
                    metadata: true,
                },
            })),
            // Older acquisition rows predate durable UTM metadata. Their first
            // linked setup page view still contains the original first touch,
            // so the dashboard can attribute historical properties too.
            withRetry(() => prisma.funnelEvent.findMany({
                where: {
                    hotelId: { in: hotelIds },
                    eventName: 'JourneyPageViewed',
                    createdAt: { lte: until },
                },
                orderBy: { createdAt: 'asc' },
                select: { hotelId: true, metadata: true },
            })),
        ])
        : [[], []];

    const fallbackTouchByHotel = new Map();
    journeyFallbackRows.forEach((row) => {
        if (fallbackTouchByHotel.has(row.hotelId)) return;
        const touch = marketelAttributionTouchFromMetadata(row.metadata);
        if (Object.keys(touch).length) fallbackTouchByHotel.set(row.hotelId, touch);
    });

    const properties = new Map();
    acquisitionByHotel.forEach((row, hotelId) => {
        const storedTouch = marketelAttributionTouchFromMetadata(row.metadata);
        const touch = Object.keys(storedTouch).length ? storedTouch : (fallbackTouchByHotel.get(hotelId) || {});
        properties.set(hotelId, {
            hotelId,
            dimensions: marketelAttributionDimensions(touch, row.contentName),
            milestones: new Set(),
            paymentEventIds: new Set(),
            revenue: 0,
        });
    });
    milestoneRows.forEach((row) => {
        const property = properties.get(row.hotelId);
        if (!property) return;
        property.milestones.add(row.eventName);
        if (row.eventName === 'PaymentSucceeded') {
            const paymentKey = row.eventId || `${row.hotelId}:${row.value || 0}`;
            if (!property.paymentEventIds.has(paymentKey)) {
                property.paymentEventIds.add(paymentKey);
                property.revenue += Number(row.value) || 0;
            }
        }
    });

    const angleGroups = new Map(MARKETEL_ACQUISITION_ANGLES.map((angle) => [
        angle,
        emptyMarketelAttributionGroup({ angle }),
    ]));
    const campaignGroups = new Map();
    const campaignGroup = (dimensions) => {
        const key = [dimensions.angle, dimensions.source, dimensions.medium, dimensions.campaign, dimensions.content, dimensions.term].join('\u001f');
        if (!campaignGroups.has(key)) campaignGroups.set(key, emptyMarketelAttributionGroup(dimensions));
        return campaignGroups.get(key);
    };

    properties.forEach((property) => {
        addMarketelAttributionProperty(angleGroups.get(property.dimensions.angle), property);
        addMarketelAttributionProperty(campaignGroup(property.dimensions), property);
    });

    // Landing views are authoritative at the angle level. New milestone rows
    // also carry the sanitized UTM touch, so campaign-level visits can be
    // compared with server-owned starts and Stripe-confirmed paid outcomes.
    const seenLanding = new Set();
    landingRows.forEach((row) => {
        const identity = row.sessionId || row.eventId || row.id;
        if (seenLanding.has(identity)) return;
        seenLanding.add(identity);
        const angle = normalizedMarketelAngle(row.contentName);
        angleGroups.get(angle).landingViews += 1;
        const touch = marketelAttributionTouchFromMetadata(row.metadata);
        if (Object.keys(touch).length) {
            campaignGroup(marketelAttributionDimensions(touch, angle)).landingViews += 1;
        }
    });

    const byAngle = MARKETEL_ACQUISITION_ANGLES.map((angle) => finalizeMarketelAttributionGroup(angleGroups.get(angle)));
    const byCampaign = Array.from(campaignGroups.values())
        .map(finalizeMarketelAttributionGroup)
        .sort((left, right) => right.paid - left.paid || right.started - left.started || left.campaign.localeCompare(right.campaign));
    return {
        model: 'first-touch acquisition cohort',
        range: { from: since.toISOString(), to: until.toISOString() },
        byAngle,
        byCampaign,
    };
}

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

        const exclusions = await funnelDashboardExclusions();
        const visibleWhere = funnelDashboardWhere(where, exclusions);
        const requestedLimit = parseInt(req.query.limit, 10);
        const eventLimit = Number.isFinite(requestedLimit)
            ? Math.max(100, Math.min(5000, requestedLimit))
            : (source === 'onboarding' ? 2000 : 500);
        const events = await withRetry(() => prisma.funnelEvent.findMany({
            where: visibleWhere,
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

        const attribution = source === 'bookings'
            ? null
            : await buildMarketelFunnelAttribution(since, until, exclusions);
        res.json({ counts, recent, attribution });
    } catch (e) {
        console.error('Funnel API error:', e.message);
        res.json({ counts: {}, recent: [], attribution: null });
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

        const exclusions = await funnelDashboardExclusions();
        const where = funnelDashboardWhere({
            createdAt: { gte: since, lte: until },
            eventName: { in: MARKETEL_ONBOARDING_EVENT_NAMES },
        }, exclusions);
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
            if (['Lead', 'QualifiedLead', 'SetupCompleted', 'ActivationOfferViewed', 'ActivationCtaClicked', 'GoLiveClicked', 'CheckoutStarted', 'PaymentSucceeded'].includes(row.eventName)) {
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
                conversionEvents: ['Lead', 'QualifiedLead', 'SetupCompleted', 'ActivationOfferViewed', 'ActivationCtaClicked', 'GoLiveClicked', 'CheckoutStarted', 'PaymentSucceeded'],
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

app.get('/guest-support', (req, res) => {
    res.sendFile(path.join(__dirname, 'guest-support.html'));
});

// Root serves landing page too (for mktel.co)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// ── SELF-SERVE SETUP ──────────────────────────────────────────

async function recordSetupRecoveryEvent(req, { hotelId, email, eventName, metadata = {}, surface = 'recovery', pagePath = '/landing' }) {
    if (!funnelTrackingEnabled || !hotelId || !eventName) return;
    await prisma.funnelEvent.create({
        data: {
            hotelId,
            eventName,
            eventId: `marketel-${eventName.toLowerCase()}.${hotelId}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}`,
            guestEmail: email || null,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.socket?.remoteAddress || null,
            surface,
            pagePath,
            metadata,
        },
    }).catch(() => {});
}

// Start free setup — create hotel and redirect to wizard (no payment needed)
app.post('/api/setup/start', setupStartRateLimit, async (req, res) => {
    try {
        const email = normalizeOwnerEmail(req.body?.email);
        const requestedAngle = String(req.body?.acquisitionAngle || 'direct').trim();
        const acquisitionAngle = new Set(['direct', 'guest_app', 'assistant']).has(requestedAngle)
            ? requestedAngle
            : 'direct';
        if (!validOwnerEmail(email)) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // An ad click must never create a second empty property merely because
        // the owner returned in another tab. A signed first-party cookie lets
        // the same browser resume immediately; an unknown browser gets a
        // secure email link, so knowing an email address never grants access.
        const existingHotels = await prisma.hotelConfig.findMany({
            where: { ownerEmail: { equals: email, mode: 'insensitive' } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                name: true,
                ownerEmail: true,
                setupToken: true,
                setupComplete: true,
                setupProgressStep: true,
                revealProgressStep: true,
                subscribed: true,
            },
        });
        if (existingHotels.length) {
            const ownerClaim = verifySetupOwnerCookie(readRequestCookie(req, SETUP_OWNER_COOKIE));
            const browserHotel = ownerClaim && ownerClaim.email === email
                ? existingHotels.find(hotel => hotel.id === ownerClaim.hotelId)
                : null;
            if (browserHotel) {
                setSetupOwnerCookie(req, res, browserHotel.id, email);
                if (!browserHotel.setupComplete && browserHotel.setupToken) {
                    await recordSetupRecoveryEvent(req, {
                        hotelId: browserHotel.id,
                        email,
                        eventName: 'SetupResumed',
                        metadata: { source: 'signed-browser', setupStep: browserHotel.setupProgressStep },
                    });
                    return res.json({
                        success: true,
                        existing: true,
                        resumed: true,
                        hotelId: browserHotel.id,
                        setupUrl: `/setup/${browserHotel.setupToken}?angle=${encodeURIComponent(acquisitionAngle)}`,
                    });
                }
                const returnToken = await generateCrmReturnTokenForHotel(browserHotel.id, browserHotel.setupToken || '');
                const reveal = revealResumeParam(browserHotel.revealProgressStep);
                await recordSetupRecoveryEvent(req, {
                    hotelId: browserHotel.id,
                    email,
                    eventName: 'RevealResumed',
                    metadata: { source: 'signed-browser', revealStep: browserHotel.revealProgressStep },
                });
                const returnParams = new URLSearchParams({ hotelId: browserHotel.id, reveal });
                return res.json({
                    success: true,
                    existing: true,
                    resumed: true,
                    hotelId: browserHotel.id,
                    resumeUrl: `${marketelFrontdeskOrigin(req)}/frontdesk-return?${returnParams.toString()}#returnToken=${encodeURIComponent(returnToken)}`,
                });
            }

            const incomplete = existingHotels.find(hotel => !hotel.setupComplete && hotel.setupToken);
            let sent = false;
            if (incomplete) {
                const setupUrl = `${marketelFrontdeskOrigin(req)}/setup/${encodeURIComponent(incomplete.setupToken)}?angle=${encodeURIComponent(acquisitionAngle)}`;
                sent = await sendSetupResumeEmail({
                    toEmail: email,
                    hotelName: incomplete.name || 'your property',
                    setupUrl,
                });
                if (sent) {
                    await prisma.hotelConfig.update({
                        where: { id: incomplete.id },
                        data: { setupResumeEmailSentAt: new Date() },
                    }).catch(() => {});
                    await recordSetupRecoveryEvent(req, {
                        hotelId: incomplete.id,
                        email,
                        eventName: 'SetupResumeEmailSent',
                        metadata: { source: 'unknown-browser', setupStep: incomplete.setupProgressStep },
                    });
                }
            } else {
                sent = await sendFrontdeskAccessEmail({
                    req,
                    email,
                    hotels: existingHotels,
                    expiresInMs: RECOVERY_LINK_EXPIRY_MS,
                });
                if (sent) {
                    await recordSetupRecoveryEvent(req, {
                        hotelId: existingHotels[0].id,
                        email,
                        eventName: 'RevealResumeEmailSent',
                        metadata: { propertyCount: existingHotels.length },
                    });
                }
            }
            return res.json({
                success: true,
                existing: true,
                resumeEmailSent: sent,
                message: sent
                    ? 'We found your saved Marketel and emailed a secure link.'
                    : 'We found your saved Marketel. Contact support@bookmarketel.com if the email does not arrive.',
            });
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
                ownerEmail: email,
                setupComplete: false,
            }
        });
        setSetupOwnerCookie(req, res, hotelSlug, email);

        if (funnelTrackingEnabled) {
            const linkedExternalId = sanitizeJourneyIdentifier(req.body?.journeyVisitorId, 'mjv_');
            const linkedSessionId = sanitizeJourneyIdentifier(req.body?.journeySessionId, 'mjs_');
            const acquisitionMetadata = marketelAttributionMetadata(req.body, { linkedJourney: !!linkedSessionId });
            await prisma.funnelEvent.create({
                data: {
                    hotelId: hotelSlug,
                    eventName: 'AcquisitionAngle',
                    eventId: `marketel-angle.${hotelSlug}`,
                    guestEmail: email,
                    contentName: acquisitionAngle,
                    occurredAt: linkedSessionId ? journeyOccurredAt(req.body?.journeyOccurredAt) : null,
                    sessionId: linkedSessionId,
                    sequence: linkedSessionId ? Math.max(1, Math.min(1000000, parseInt(req.body?.journeySequence, 10) || 1)) : null,
                    surface: linkedSessionId ? redactJourneyString(req.body?.journeySurface || 'landing', 40) : null,
                    pagePath: linkedSessionId ? sanitizeJourneyPath(req.body?.journeyPagePath || '/landing') : null,
                    metadata: Object.keys(acquisitionMetadata).length ? acquisitionMetadata : undefined,
                    externalId: linkedExternalId,
                    userAgent: req.headers['user-agent'] || null,
                    ipAddress: req.ip || req.socket?.remoteAddress || null,
                },
            }).catch(() => {});
        }

        // Lead fires here — the moment an email is submitted — rather than at
        // setup step 3. The funnel is short enough now that email submission is
        // the honest top-of-funnel conversion, and Meta needs the volume to
        // leave learning: the deeper qualified signal is kept as QualifiedLead
        // and setup completion still reports CompleteRegistration.
        if (funnelTrackingEnabled) {
            const leadEventId = `marketel-lead.${hotelSlug}`;
            // A new property row already means this browser had no prior setup,
            // but an email can still repeat across deleted or abandoned rows.
            const recentLead = await prisma.funnelEvent.findFirst({
                where: {
                    eventName: 'Lead',
                    guestEmail: email,
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
                select: { id: true },
            }).catch(() => null);
            if (!recentLead) {
                const leadSessionId = sanitizeJourneyIdentifier(req.body?.journeySessionId, 'mjs_');
                const leadMetadata = marketelAttributionMetadata(req.body, { linkedJourney: !!leadSessionId });
                await prisma.funnelEvent.create({
                    data: {
                        hotelId: hotelSlug,
                        eventName: 'Lead',
                        eventId: leadEventId,
                        guestEmail: email,
                        contentName: acquisitionAngle,
                        occurredAt: leadSessionId ? journeyOccurredAt(req.body?.journeyOccurredAt) : null,
                        sessionId: leadSessionId,
                        surface: leadSessionId ? redactJourneyString(req.body?.journeySurface || 'landing', 40) : null,
                        pagePath: leadSessionId ? sanitizeJourneyPath(req.body?.journeyPagePath || '/landing') : null,
                        metadata: Object.keys(leadMetadata).length ? leadMetadata : undefined,
                        externalId: sanitizeJourneyIdentifier(req.body?.journeyVisitorId, 'mjv_'),
                        userAgent: req.headers['user-agent'] || null,
                        ipAddress: req.ip || req.socket?.remoteAddress || null,
                    },
                }).catch(() => {});
                void sendAdminPush('Lead', { property: email });
                // landing.html fires the Pixel copy with this same event_id, so
                // Meta collapses the browser and server events into one lead.
                const leadMeta = marketelMetaContext(req);
                await queueMarketelCAPI('Lead', {
                    hotelId: hotelSlug,
                    email,
                    externalId: hotelSlug,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    sourceUrl: leadMeta.sourceUrl,
                    fbp: leadMeta.fbp,
                    fbc: leadMeta.fbc,
                    eventId: leadEventId,
                    contentName: acquisitionAngle,
                }).catch((error) => console.error('Lead CAPI queue failed:', error.message));
            }
        }

        const setupUrl = `${marketelFrontdeskOrigin(req)}/setup/${setupToken}?angle=${encodeURIComponent(acquisitionAngle)}`;
        const setupResumeEmailSent = await sendSetupResumeEmail({
            toEmail: email,
            hotelName: 'your property',
            setupUrl,
        });
        if (setupResumeEmailSent) {
            await prisma.hotelConfig.update({
                where: { id: hotelSlug },
                data: { setupResumeEmailSentAt: new Date() },
            }).catch(() => {});
            await recordSetupRecoveryEvent(req, {
                hotelId: hotelSlug,
                email,
                eventName: 'SetupResumeEmailSent',
                metadata: { source: 'setup-created', setupStep: 1 },
            });
        }

        console.log('✅ Free setup started:', { hotelId: hotelSlug, acquisitionAngle });
        res.json({
            success: true,
            setupUrl: `/setup/${setupToken}?angle=${encodeURIComponent(acquisitionAngle)}`,
            token: setupToken,
            hotelId: hotelSlug,
            setupResumeEmailSent,
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
            include: {
                rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
                rates: true,
                domains: { where: { isPrimary: true }, take: 1 },
            },
        });
        if (!hotel) return res.status(404).json({ error: 'Invalid setup token' });
        const frontdeskReturnToken = hotel.setupComplete
            ? await generateCrmReturnTokenForHotel(hotel.id, hotel.setupToken || '').catch(() => '')
            : '';
        res.json({
            hotel: { id: hotel.id, name: hotel.name, address: hotel.address, phone: hotel.phone, subtitle: hotel.subtitle, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime, setupComplete: hotel.setupComplete },
            rooms: hotel.rooms.map(r => ({ id: r.id, name: r.name, description: r.description, amenities: r.amenities, maxOccupancy: r.maxOccupancy, totalUnits: r.totalUnits, images: r.images.map(i => ({ id: i.id, url: i.url, sortOrder: i.sortOrder })) })),
            rates: hotel.rates ? { nightly: hotel.rates.nightly, weekly: hotel.rates.weekly, monthly: hotel.rates.monthly, taxRate: hotel.rates.taxRate } : null,
            domain: hotel.domains[0]?.domain || '',
            resumeStep: Math.max(1, Math.min(4, Number(hotel.setupProgressStep) || 1)),
            frontdeskReturnToken,
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
            data: {
                name: name || hotel.name,
                address,
                phone,
                subtitle,
                checkInTime,
                checkOutTime,
                setupProgressStep: Math.max(2, Number(hotel.setupProgressStep) || 1),
            },
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
    DeleteObjectCommand,
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
// Explicit launch-QA escape hatch. This must be removed or set to false before
// paid traffic starts; production otherwise requires live Stripe objects.
const MARKETEL_ALLOW_TEST_BILLING = process.env.MARKETEL_ALLOW_TEST_BILLING === 'true';
const MARKETEL_ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
if (
    process.env.NODE_ENV === 'production'
    && MARKETEL_STRIPE_KEY_MODE === 'test'
    && MARKETEL_ALLOW_TEST_BILLING
) {
    console.warn('⚠️  Marketel checkout is using Stripe test mode in production for launch QA.');
} else if (process.env.NODE_ENV === 'production' && MARKETEL_STRIPE_KEY_MODE !== 'live') {
    console.error('❌ Marketel checkout disabled: production requires STRIPE_MARKETEL_SECRET_KEY in live mode.');
}

function marketelStripeModeAllowed(livemode) {
    if (process.env.NODE_ENV !== 'production') return true;
    if (livemode && MARKETEL_STRIPE_KEY_MODE === 'live') return true;
    return !livemode
        && MARKETEL_STRIPE_KEY_MODE === 'test'
        && MARKETEL_ALLOW_TEST_BILLING;
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
    if (!marketelStripeModeAllowed(!!price.livemode)) {
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
            if (!marketelStripeModeAllowed(MARKETEL_STRIPE_KEY_MODE === 'live')) {
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
            testModeAllowed: MARKETEL_ALLOW_TEST_BILLING,
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
            testModeAllowed: MARKETEL_ALLOW_TEST_BILLING,
            webhookConfigured: !!process.env.STRIPE_MARKETEL_WEBHOOK_SECRET,
            price: monthlyPrice,
            prices: { month: monthlyPrice, year: yearlyPrice },
        });
    } catch (e) {
        res.status(503).json({
            success: false,
            configured: true,
            keyMode: MARKETEL_STRIPE_KEY_MODE,
            testModeAllowed: MARKETEL_ALLOW_TEST_BILLING,
            webhookConfigured: !!process.env.STRIPE_MARKETEL_WEBHOOK_SECRET,
            message: e.message,
        });
    }
});

function productionLaunchReadiness() {
    const clean = name => String(process.env[name] || '').trim();
    const present = (name, minimumLength = 1) => {
        const value = clean(name);
        return value.length >= minimumLength && !/replace|example|your[-_]?/i.test(value);
    };
    const item = (id, label, ok, action, critical = true) => ({ id, label, ok: !!ok, action, critical });
    const authSecretNames = [
        'MAGIC_LINK_SECRET',
        'CRM_RETURN_TOKEN_SECRET',
        'CRM_PIN_HASH_SECRET',
        'NATIVE_SESSION_TOKEN_SECRET',
    ];
    const authSecretValues = authSecretNames.map(clean);
    const distinctAuthSecrets = authSecretValues.every(value => value.length >= 32)
        && new Set(authSecretValues).size === authSecretValues.length;
    const appStoreUrl = configuredFrontdeskAppStoreUrl();
    const backendUrl = clean('BACKEND_URL');
    const twilioSenderReady = present('TWILIO_PHONE_NUMBER') || present('TWILIO_MESSAGING_SERVICE_SID');

    const checks = [
        item('database-url', 'Pooled production database', present('DATABASE_URL'), 'Set DATABASE_URL on Render.'),
        item('database-direct-url', 'Direct migration database', present('DIRECT_URL'), 'Set DIRECT_URL on Render.'),
        item('auth-secrets', 'Stable distinct auth secrets', distinctAuthSecrets, `Set distinct 32+ character values for ${authSecretNames.join(', ')}.`),
        item('admin-token', 'Protected admin endpoints', present('ADMIN_TOKEN', 24), 'Set a long ADMIN_TOKEN on Render.'),
        item('guest-stripe-live', 'Guest $1 verification billing', clean('STRIPE_SECRET_KEY').startsWith('sk_live_'), 'Replace STRIPE_SECRET_KEY with the live guest-booking key.'),
        item('guest-stripe-webhook', 'Guest Stripe recovery webhook', clean('STRIPE_WEBHOOK_SECRET').startsWith('whsec_'), 'Set the signing secret for /api/stripe-webhook.'),
        item('marketel-stripe-live', 'Marketel subscription billing', MARKETEL_STRIPE_KEY_MODE === 'live', 'Set STRIPE_MARKETEL_SECRET_KEY to the live Marketel key.'),
        item('marketel-stripe-price', '$199 monthly Stripe object', present('STRIPE_MARKETEL_PRICE_ID') || present('STRIPE_MARKETEL_PRODUCT_ID'), 'Set STRIPE_MARKETEL_PRICE_ID or STRIPE_MARKETEL_PRODUCT_ID.'),
        item('marketel-stripe-webhook', 'Marketel subscription webhook', clean('STRIPE_MARKETEL_WEBHOOK_SECRET').startsWith('whsec_'), 'Set the signing secret for /api/marketel-stripe-webhook.'),
        item('test-billing-disabled', 'Launch billing is not in QA mode', !MARKETEL_ALLOW_TEST_BILLING, 'Remove MARKETEL_ALLOW_TEST_BILLING=true before ads.'),
        item('frontdesk-app-store', 'Front Desk App Store handoff', !!appStoreUrl, 'Set MARKETEL_FRONTDESK_APP_STORE_URL after Apple publishes the listing.'),
        item('backend-url', 'Public backend URL', /^https:\/\//i.test(backendUrl), 'Set BACKEND_URL to the public https Render origin.'),
        item('vercel-domains', 'Automatic property domains', present('VERCEL_TOKEN') && present('VERCEL_PROJECT_ID'), 'Set VERCEL_TOKEN and VERCEL_PROJECT_ID.'),
        item('image-storage', 'Durable property image storage', ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'].every(name => present(name)), 'Set all R2 storage values; Render disk is not durable.'),
        item('email', 'Owner and guest email delivery', present('BREVO_SMTP_HOST') && present('BREVO_SMTP_LOGIN') && (present('BREVO_SMTP_KEY') || present('BREVO_SMTP')), 'Set BREVO_SMTP_HOST, BREVO_SMTP_LOGIN, and BREVO_SMTP_KEY (or the supported BREVO_SMTP alias).'),
        item('guestel-push', 'Guestel native notifications', ['APNS_TEAM_ID', 'APNS_KEY_ID', 'APNS_PRIVATE_KEY'].every(name => present(name)) && present('GUESTEL_APNS_BUNDLE_ID'), 'Set APNs credentials and GUESTEL_APNS_BUNDLE_ID.'),
        item('ios-push', 'Front Desk native push notifications', ['APNS_TEAM_ID', 'APNS_KEY_ID', 'APNS_PRIVATE_KEY'].every(name => present(name)) && clean('APNS_BUNDLE_ID') === 'com.bookmarketel.frontdesk', 'Set APNs team, key, private key, and the exact bundle ID.'),
        item('assistant-sms', 'Front Desk Assistant SMS', present('TWILIO_ACCOUNT_SID') && present('TWILIO_AUTH_TOKEN') && twilioSenderReady && clean('TWILIO_VALIDATE_SIGNATURES') === 'true', 'Set Twilio credentials/sender and keep signature validation true.'),
        item('assistant-intelligence', 'Front Desk Assistant language model', present('OPENAI_API_KEY'), 'Set OPENAI_API_KEY.', false),
        item('meta-attribution', 'Meta Pixel/CAPI attribution', ENABLE_META_CAPI && present('MARKETEL_META_PIXEL_ID') && present('MARKETEL_META_ACCESS_TOKEN'), 'Enable Meta CAPI and set the Marketel Pixel and CAPI credentials.'),
        item('meta-test-mode-disabled', 'Meta production events are not in Test Events mode', !MARKETEL_META_TEST_EVENT_CODE, 'Remove MARKETEL_META_TEST_EVENT_CODE before paid traffic.'),
    ];
    const critical = checks.filter(check => check.critical);
    return {
        ready: critical.every(check => check.ok),
        passed: checks.filter(check => check.ok).length,
        total: checks.length,
        checks,
        manualOutsideRuntime: [
            'Deploy Prisma migrations and confirm /health returns 200.',
            'Replace App Review demo-account placeholders and keep the review property subscribed.',
            'Upload privacy-safe App Store screenshots and complete privacy/export declarations.',
            'Run the signed build on a real iPhone over Wi-Fi and cellular, then test TestFlight.',
            'Smoke monthly and annual live Checkout, guest $1 authorization, webhook activation, email, SMS, and push before ads.',
        ],
    };
}

// Front Desk shows a property its own revenue and nothing ever added those up,
// so there was no view of gross booking volume across the base. That total is
// the number every payments question starts from, so it belongs on one screen.
app.get('/api/admin/portfolio', adminAuth, async (req, res) => {
    try {
        const daysBack = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
        const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        const exclusions = await funnelDashboardExclusions();
        const [hotels, bookings] = await Promise.all([
            prisma.hotelConfig.findMany({
                where: { id: { notIn: exclusions.hotelIds } },
                select: { id: true, name: true, marketelSubscriptionStatus: true, createdAt: true },
            }),
            prisma.booking.findMany({
                where: {
                    createdAt: { gte: since },
                    hotelId: { notIn: exclusions.hotelIds },
                },
                select: { hotelId: true, grandTotal: true, nights: true, status: true },
            }),
        ]);

        const byHotel = new Map();
        for (const hotel of hotels) {
            byHotel.set(hotel.id, {
                hotelId: hotel.id,
                name: hotel.name || hotel.id,
                subscriptionStatus: hotel.marketelSubscriptionStatus || null,
                bookings: 0,
                cancelled: 0,
                nights: 0,
                gmv: 0,
            });
        }
        for (const booking of bookings) {
            const row = byHotel.get(booking.hotelId);
            if (!row) continue;
            const cancelled = String(booking.status || '').toLowerCase() === 'cancelled';
            if (cancelled) {
                row.cancelled += 1;
                continue;
            }
            row.bookings += 1;
            row.nights += Number(booking.nights) || 0;
            row.gmv += Number(booking.grandTotal) || 0;
        }

        const properties = Array.from(byHotel.values()).sort((a, b) => b.gmv - a.gmv);
        const paying = properties.filter((p) => ['active', 'trialing'].includes(String(p.subscriptionStatus || '').toLowerCase()));
        const gmv = properties.reduce((sum, p) => sum + p.gmv, 0);
        const bookingCount = properties.reduce((sum, p) => sum + p.bookings, 0);

        res.json({
            success: true,
            rangeDays: daysBack,
            totals: {
                properties: properties.length,
                payingProperties: paying.length,
                bookings: bookingCount,
                cancelled: properties.reduce((sum, p) => sum + p.cancelled, 0),
                nights: properties.reduce((sum, p) => sum + p.nights, 0),
                gmv: Math.round(gmv * 100) / 100,
                averageBookingValue: bookingCount ? Math.round((gmv / bookingCount) * 100) / 100 : 0,
                // What a processing spread would have earned over this window.
                // Sizing only — it assumes every booking settles on our rails.
                processingAt40Bps: Math.round(gmv * 0.004 * 100) / 100,
            },
            properties,
        });
    } catch (e) {
        console.error('admin portfolio:', e.message);
        res.status(500).json({ success: false, message: 'Could not build the portfolio view.' });
    }
});

// FunnelEvent is not only analytics. A few rows in it are load-bearing, and
// deleting them has consequences out in the world rather than on a chart:
//
//   ActivationEmailSent / ActivationEmailSending  send-once guard. Without the
//       row, a property that already received its activation email gets another.
//   PreviewReadyEmailSent                         same guard for the preview email.
//   BlockedBookingAttempt                         guest demand against a blocked
//       property. It is evidence, not telemetry, and feeds the comeback signal.
//   OnboardingAnswers                             what the owner told us at signup.
//
// So the purge works from an allowlist of the funnel telemetry itself. Anything
// not named here survives, which also means a future operational use of this
// table is safe by default rather than by remembering to update a denylist.
const FUNNEL_PURGE_PROTECTED = new Set([
    'ActivationEmailSending',
    'ActivationEmailSent',
    'PreviewReadyEmailSending',
    'PreviewReadyEmailSent',
    'CheckoutRecoveryEmailSending',
    'CheckoutRecoveryEmailSent',
    'LegacyComebackEmailSent',
    'BlockedBookingAttempt',
    'OnboardingAnswers',
]);
const FUNNEL_PURGEABLE_EVENT_NAMES = MARKETEL_ONBOARDING_EVENT_NAMES
    .filter((name) => !FUNNEL_PURGE_PROTECTED.has(name));

app.post('/api/admin/funnel/purge', adminAuth, async (req, res) => {
    try {
        if (String(req.body?.confirm || '') !== 'DELETE ALL ACTIVITY') {
            return res.status(400).json({
                success: false,
                message: 'Send confirm: "DELETE ALL ACTIVITY" to purge.',
            });
        }
        const before = req.body?.before ? new Date(req.body.before) : null;
        if (before && isNaN(before)) {
            return res.status(400).json({ success: false, message: 'Invalid before date.' });
        }
        const where = { eventName: { in: FUNNEL_PURGEABLE_EVENT_NAMES } };
        if (before) where.createdAt = { lt: before };
        const deleted = await prisma.funnelEvent.deleteMany({ where });
        console.log(`admin purge: removed ${deleted.count} funnel events${before ? ` before ${before.toISOString()}` : ''}`);
        res.json({
            success: true,
            deleted: deleted.count,
            scope: before ? `before ${before.toISOString()}` : 'all',
            preserved: [...FUNNEL_PURGE_PROTECTED],
        });
    } catch (e) {
        console.error('admin funnel purge:', e.message);
        res.status(500).json({ success: false, message: 'Could not purge activity.' });
    }
});

// The moments worth interrupting an operator for. Landing views are omitted on
// purpose: during an ad run they arrive constantly, and a dashboard that buzzes
// all day gets its notifications switched off within a day, taking the useful
// ones with it.
const ADMIN_PUSH_TRIGGERS = {
    Lead: { title: 'Qualified lead', body: (c) => `${c.property || 'A property'} answered as qualified.` },
    SetupCompleted: { title: 'Setup completed', body: (c) => `${c.property || 'A property'} finished setup.` },
    GoLiveClicked: { title: 'Activation clicked', body: (c) => `${c.property || 'A property'} clicked activate.` },
    PaymentSucceeded: { title: 'Paid', body: (c) => `${c.property || 'A property'} activated Marketel.` },
    SupportMessage: { title: 'New support message', body: (c) => `${c.property || 'A property'} sent a message.` },
};
const ADMIN_PUSH_DEFAULT_EVENTS = Object.keys(ADMIN_PUSH_TRIGGERS);

function adminPushWants(subscription, eventName) {
    const chosen = Array.isArray(subscription?.events) ? subscription.events : null;
    return chosen ? chosen.includes(eventName) : true;
}

// Fire-and-forget. A notification failing must never affect the request that
// triggered it — a payment still succeeded whether or not the phone buzzed.
async function sendAdminPush(eventName, context = {}) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
    const trigger = ADMIN_PUSH_TRIGGERS[eventName];
    if (!trigger) return;
    let subscriptions = [];
    try {
        subscriptions = await prisma.adminPushSubscription.findMany();
    } catch (_) {
        return;
    }
    const payload = JSON.stringify({
        title: trigger.title,
        body: trigger.body(context),
        tag: `marketel-${eventName}`,
        url: eventName === 'SupportMessage' ? '/funnel?view=support' : '/funnel',
    });
    await Promise.all(subscriptions.filter((s) => adminPushWants(s, eventName)).map(async (s) => {
        try {
            await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload
            );
            await prisma.adminPushSubscription.update({
                where: { id: s.id },
                data: { lastSentAt: new Date(), failures: 0 },
            }).catch(() => {});
        } catch (e) {
            // 404/410 mean the browser threw the subscription away. Anything
            // else may be transient, so only a gone endpoint is deleted.
            if (e?.statusCode === 404 || e?.statusCode === 410) {
                await prisma.adminPushSubscription.delete({ where: { id: s.id } }).catch(() => {});
            } else {
                await prisma.adminPushSubscription.update({
                    where: { id: s.id },
                    data: { failures: { increment: 1 } },
                }).catch(() => {});
            }
        }
    }));
}

app.get('/api/admin/push/status', adminAuth, async (_req, res) => {
    try {
        const subscriptions = await prisma.adminPushSubscription.findMany({
            // endpoint is returned so the page can tell which row is this
            // device and show its own trigger choices, not another device's.
            select: { id: true, endpoint: true, label: true, createdAt: true, events: true, lastSentAt: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json({
            success: true,
            configured: !!(VAPID_PUBLIC && VAPID_PRIVATE),
            publicKey: VAPID_PUBLIC || null,
            triggers: ADMIN_PUSH_DEFAULT_EVENTS,
            subscriptions,
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not read push status.' });
    }
});

app.post('/api/admin/push/subscribe', adminAuth, async (req, res) => {
    try {
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
            return res.status(503).json({ success: false, message: 'Push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.' });
        }
        const { endpoint, p256dh, auth, label, events } = req.body || {};
        if (!endpoint || !p256dh || !auth) {
            return res.status(400).json({ success: false, message: 'endpoint, p256dh and auth are required.' });
        }
        const chosen = Array.isArray(events)
            ? events.filter((name) => ADMIN_PUSH_DEFAULT_EVENTS.includes(name))
            : ADMIN_PUSH_DEFAULT_EVENTS;
        const saved = await prisma.adminPushSubscription.upsert({
            where: { endpoint: String(endpoint) },
            create: {
                endpoint: String(endpoint),
                p256dh: String(p256dh),
                auth: String(auth),
                label: label ? String(label).slice(0, 80) : null,
                events: chosen,
            },
            update: { p256dh: String(p256dh), auth: String(auth), events: chosen, failures: 0 },
            select: { id: true, events: true },
        });
        res.json({ success: true, id: saved.id, events: saved.events });
    } catch (e) {
        console.error('admin push subscribe:', e.message);
        res.status(500).json({ success: false, message: 'Could not save the subscription.' });
    }
});

app.post('/api/admin/push/unsubscribe', adminAuth, async (req, res) => {
    try {
        const endpoint = String(req.body?.endpoint || '');
        if (!endpoint) return res.status(400).json({ success: false, message: 'endpoint is required.' });
        await prisma.adminPushSubscription.deleteMany({ where: { endpoint } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not remove the subscription.' });
    }
});

app.post('/api/admin/push/test', adminAuth, async (_req, res) => {
    await sendAdminPush('PaymentSucceeded', { property: 'Test notification' });
    res.json({ success: true });
});

app.get('/api/admin/launch-readiness', adminAuth, (_req, res) => {
    const readiness = productionLaunchReadiness();
    res.status(readiness.ready ? 200 : 503).json({ success: readiness.ready, ...readiness });
});

app.get('/api/admin/meta-capi/status', adminAuth, async (_req, res) => {
    try {
        const exclusions = await funnelDashboardExclusions();
        const visibleMetaWhere = funnelDashboardWhere({
            eventName: { in: MARKETEL_CAPI_STATUS_NAMES },
        }, exclusions);
        const [grouped, recent] = await Promise.all([
            prisma.funnelEvent.groupBy({
                by: ['eventName'],
                where: visibleMetaWhere,
                _count: { _all: true },
            }),
            prisma.funnelEvent.findMany({
                where: visibleMetaWhere,
                orderBy: { createdAt: 'desc' },
                take: 30,
                select: {
                    id: true,
                    hotelId: true,
                    eventName: true,
                    eventId: true,
                    createdAt: true,
                    occurredAt: true,
                    metadata: true,
                },
            }),
        ]);
        const counts = { pending: 0, sent: 0, failed: 0 };
        for (const row of grouped) {
            if (row.eventName === MARKETEL_CAPI_PENDING) counts.pending = row._count._all;
            if (row.eventName === MARKETEL_CAPI_SENT) counts.sent = row._count._all;
            if (row.eventName === MARKETEL_CAPI_FAILED) counts.failed = row._count._all;
        }
        res.json({
            success: true,
            configuration: {
                enabled: ENABLE_META_CAPI,
                pixelConfigured: !!MARKETEL_PIXEL_ID,
                accessTokenConfigured: !!MARKETEL_ACCESS_TOKEN,
                configured: ENABLE_META_CAPI && !!MARKETEL_PIXEL_ID && !!MARKETEL_ACCESS_TOKEN,
                graphVersion: MARKETEL_META_GRAPH_API_VERSION,
                testMode: !!MARKETEL_META_TEST_EVENT_CODE,
            },
            counts,
            recent: recent.map((row) => {
                const metadata = marketelCapiMetadata(row);
                return {
                    id: row.id,
                    hotelId: row.hotelId,
                    status: row.eventName === MARKETEL_CAPI_SENT
                        ? 'sent'
                        : row.eventName === MARKETEL_CAPI_FAILED ? 'failed' : 'pending',
                    metaEventName: metadata.metaEventName || '',
                    providerEventId: row.eventId || '',
                    attempts: Number(metadata.attempts) || 0,
                    testMode: !!metadata.testMode,
                    eventsReceived: Number(metadata.eventsReceived) || 0,
                    lastError: String(metadata.lastError || '').slice(0, 500),
                    queuedAt: row.occurredAt || row.createdAt,
                    deliveredAt: metadata.deliveredAt || null,
                    nextAttemptAt: metadata.nextAttemptAt || null,
                };
            }),
        });
    } catch (error) {
        console.error('Meta CAPI admin status failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not load Meta delivery status.' });
    }
});

app.post('/api/admin/meta-capi/test', adminAuth, async (req, res) => {
    try {
        if (!MARKETEL_META_TEST_EVENT_CODE) {
            return res.status(400).json({
                success: false,
                message: 'Set MARKETEL_META_TEST_EVENT_CODE on Render before sending test events.',
            });
        }
        const eventName = String(req.body?.eventName || '').trim();
        if (!['ViewContent', 'InitiateCheckout', 'Subscribe'].includes(eventName)) {
            return res.status(400).json({ success: false, message: 'Unsupported Meta test event.' });
        }
        const eventId = `marketel-capi-test.${eventName}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
        const meta = marketelMetaContext(req);
        const queued = await queueMarketelCAPI(eventName, {
            hotelId: 'marketel-capi-test',
            externalId: 'marketel-capi-test',
            ip: req.ip || req.socket?.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            sourceUrl: meta.sourceUrl || `${req.protocol}://${req.get('host')}/funnel`,
            fbp: meta.fbp,
            fbc: meta.fbc,
            value: 199,
            currency: 'USD',
            eventId,
            contentName: 'Marketel CAPI delivery test',
            testEventCode: MARKETEL_META_TEST_EVENT_CODE,
        });
        res.json({ success: true, queued });
    } catch (error) {
        console.error('Meta CAPI test queue failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not queue the Meta test event.' });
    }
});

app.post('/api/admin/meta-capi/retry', adminAuth, async (_req, res) => {
    try {
        const failed = await prisma.funnelEvent.findMany({
            where: { eventName: MARKETEL_CAPI_FAILED },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        const nextAttemptAt = new Date().toISOString();
        for (const row of failed) {
            const metadata = marketelCapiMetadata(row);
            await prisma.funnelEvent.update({
                where: { id: row.id },
                data: {
                    eventName: MARKETEL_CAPI_PENDING,
                    metadata: {
                        ...metadata,
                        attempts: 0,
                        nextAttemptAt,
                        lastError: null,
                        manuallyRetriedAt: nextAttemptAt,
                    },
                },
            });
        }
        setImmediate(() => runMarketelCapiDeliverySweep().catch((error) => {
            console.error('Manual Meta CAPI retry sweep failed:', error.message);
        }));
        res.json({ success: true, requeued: failed.length });
    } catch (error) {
        console.error('Meta CAPI retry failed:', error.message);
        res.status(500).json({ success: false, message: 'Could not retry Meta events.' });
    }
});

app.post('/api/setup/:token/checkout', async (req, res) => {
    try {
        if (!marketelStripe) return res.status(503).json({ error: 'Payment not configured' });
        const hotel = await prisma.hotelConfig.findUnique({ where: { setupToken: req.params.token } });
        if (!hotel) return res.status(404).json({ error: 'Invalid token' });
        if (hotel.subscribed) return res.status(409).json({ error: 'This property is already activated' });

        // Meta CAPI: CustomizeProduct (they clicked Go Live)
        const cpMeta = marketelMetaContext(req);
        await queueMarketelCAPI('CustomizeProduct', {
            hotelId: hotel.id,
            email: hotel.ownerEmail,
            externalId: hotel.id,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.socket?.remoteAddress,
            sourceUrl: cpMeta.sourceUrl,
            fbp: req.body?.fbp || cpMeta.fbp,
            fbc: req.body?.fbc || cpMeta.fbc,
            eventId: `marketel-legacy-checkout.${hotel.id}.${Date.now()}`,
            contentName: 'Marketel legacy activation',
        }).catch((error) => console.error('Legacy checkout CAPI queue failed:', error.message));

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
    if (existing) {
        await registerStripePaymentMethodDomain(existing.domain);
        return existing.domain;
    }

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
    await registerStripePaymentMethodDomain(assignedDomain);
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
        const pinHash = hashCrmPin(defaultPin);
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
async function rotateCompletedSetupCredential(hotelId) {
    const replacement = crypto.randomBytes(32).toString('hex');
    await prisma.hotelConfig.update({
        where: { id: hotelId },
        data: { setupToken: replacement },
    });
    hotelConfigCache.delete(hotelId);
}

async function sendPreviewReadyEmailOnce(hotelId, req = null) {
    if (!hotelId || !emailTransporter) return false;
    let claim = null;
    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext('preview-ready-email'))`;
        const existing = await tx.funnelEvent.findFirst({
            where: {
                hotelId,
                eventName: { in: ['PreviewReadyEmailSending', 'PreviewReadyEmailSent'] },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existing?.eventName === 'PreviewReadyEmailSent') return;
        if (existing && existing.createdAt > new Date(Date.now() - 5 * 60 * 1000)) return;
        if (existing) await tx.funnelEvent.delete({ where: { id: existing.id } });
        claim = await tx.funnelEvent.create({
            data: {
                hotelId,
                eventName: 'PreviewReadyEmailSending',
                eventId: `marketel-preview-email.${hotelId}.${Date.now()}`,
            },
        });
    });
    if (!claim) return false;

    try {
        const [hotel, domainRow] = await Promise.all([
            prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: {
                    id: true,
                    name: true,
                    ownerEmail: true,
                    subscribed: true,
                    revealProgressStep: true,
                },
            }),
            prisma.hotelDomain.findFirst({
                where: { hotelId },
                orderBy: { isPrimary: 'desc' },
                select: { domain: true },
            }),
        ]);
        if (!hotel?.ownerEmail) throw new Error('Property has no owner email');
        if (hotel.subscribed) throw new Error('Property is already activated');
        const domain = domainRow?.domain || await assignUniqueDomainForHotel(hotel);
        const frontdeskUrl = frontdeskMagicUrl(req, hotel, {
            expiresInMs: RECOVERY_LINK_EXPIRY_MS,
        });
        const sent = await sendPreviewReadyEmail({
            toEmail: hotel.ownerEmail,
            hotelName: hotel.name || 'Your property',
            hotelId: hotel.id,
            domain,
            frontdeskUrl,
        });
        if (!sent) throw new Error('Preview email was not sent');
        await prisma.$transaction([
            prisma.funnelEvent.update({
                where: { id: claim.id },
                data: {
                    eventName: 'PreviewReadyEmailSent',
                    eventId: `marketel-preview-email.${hotelId}`,
                    guestEmail: hotel.ownerEmail,
                },
            }),
            prisma.hotelConfig.update({
                where: { id: hotelId },
                data: { previewReadyEmailSentAt: new Date() },
            }),
        ]);
        return true;
    } catch (error) {
        await prisma.funnelEvent.deleteMany({
            where: { id: claim.id, eventName: 'PreviewReadyEmailSending' },
        }).catch(() => {});
        console.error('Preview-ready email failed:', error.message);
        return false;
    }
}

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

        // The preview email normally went out as soon as /complete finished.
        // Retry here if SMTP was temporarily unavailable, but never make the
        // owner's click the only thing capable of creating their recovery path.
        const finalEmail = email || hotel.ownerEmail;
        let previewEmailSent = false;
        let activationEmailSent = false;
        if (finalEmail && hotel.subscribed) {
            // The legacy setup checkout collects contact details on its paid
            // success page. Once that email is saved, retry the paid handoff
            // instead of sending pre-activation language.
            activationEmailSent = await sendMarketelActivationEmailOnce(hotel.id, req);
        } else if (finalEmail) {
            previewEmailSent = await sendPreviewReadyEmailOnce(hotel.id, req);
        }

        console.log('✅ Preview handoff completed:', {
            hotelId: hotel.id,
            domain: domainPref === 'custom' ? customDomain : assignedDomain,
            previewEmailSent,
            activationEmailSent,
        });

        // The URL credential has finished its job. Rotate instead of clearing:
        // setupToken also marks an unpaid self-serve property as preview-only,
        // so nulling it would accidentally open public booking APIs. The old
        // setup URL loses every read/write permission immediately.
        await rotateCompletedSetupCredential(hotel.id);
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
        const parsedNightly = Number(nightly);
        const safeNightly = Number.isFinite(parsedNightly) && parsedNightly > 0 ? parsedNightly : 69;
        const parsedWeekly = Number(weekly);
        const safeWeekly = Number.isFinite(parsedWeekly) && parsedWeekly > 0 ? parsedWeekly : safeNightly * 7;
        const parsedMonthly = Number(monthly);
        const safeMonthly = Number.isFinite(parsedMonthly) && parsedMonthly > 0 ? parsedMonthly : safeNightly * 28;
        const parsedTaxRate = Number(taxRate);
        const safeTaxRate = Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 && parsedTaxRate <= 1
            ? parsedTaxRate
            : 0;
        await prisma.hotelRates.upsert({
            where: { hotelId: hotel.id },
            create: { hotelId: hotel.id, nightly: safeNightly, weekly: safeWeekly, monthly: safeMonthly, taxRate: safeTaxRate },
            update: { nightly: safeNightly, weekly: safeWeekly, monthly: safeMonthly, taxRate: safeTaxRate },
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

        // Reloads and retries are normal in a mobile funnel. Completion is
        // idempotent: reuse the property and issue a fresh, short-lived handoff
        // token instead of manufacturing another staff PIN.
        if (hotel.setupComplete) {
            const assignedDomain = await assignUniqueDomainForHotel(hotel);
            const frontdeskReturnToken = await generateCrmReturnTokenForHotel(hotel.id, hotel.setupToken || '');
            const previewEmailSent = await sendPreviewReadyEmailOnce(hotel.id, req);
            const registrationEventId = `marketel-registration.${hotel.id}`;
            setSetupOwnerCookie(req, res, hotel.id, hotel.ownerEmail || '');
            return res.json({
                success: true,
                bookingUrl: `https://${assignedDomain}`,
                frontdeskUrl: `${marketelFrontdeskOrigin(req)}/frontdesk?hotelId=${encodeURIComponent(hotel.id)}`,
                frontdeskReturnToken,
                previewEmailSent,
                resumed: true,
                registrationEventId,
                registrationNewlyCompleted: false,
            });
        }

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
            data: { setupComplete: true, active: true, setupProgressStep: 3 },
        });

        // Create a default CRM PIN
        const defaultPin = generateCrmOwnerPin();
        const pinHash = hashCrmPin(defaultPin);
        try {
            await prisma.crmPin.create({ data: { hotelId: hotel.id, pinHash, label: 'Default PIN' } });
        } catch (e) { /* ignore duplicate */ }

        const frontdeskReturnToken = await generateCrmReturnTokenForHotel(hotel.id, hotel.setupToken || '');
        const previewEmailSent = await sendPreviewReadyEmailOnce(hotel.id, req);
        setSetupOwnerCookie(req, res, hotel.id, hotel.ownerEmail || '');

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
                    metadata: linkedSessionId ? marketelAttributionMetadata(req.body, { linkedJourney: true }) : undefined,
                    guestEmail: hotel.ownerEmail || null,
                    externalId: linkedExternalId,
                },
            })).catch(() => {});
        }

        // Setup completion is a deeper standard Meta event than Lead. The
        // deterministic ID is returned to setup.html so Pixel and CAPI describe
        // the same registration rather than two conversions.
        const registrationEventId = `marketel-registration.${hotel.id}`;
        const registrationMeta = marketelMetaContext(req);
        await queueMarketelCAPI('CompleteRegistration', {
            hotelId: hotel.id,
            email: hotel.ownerEmail || '',
            phone: hotel.ownerPhone || '',
            externalId: hotel.id,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            sourceUrl: registrationMeta.sourceUrl || `${req.protocol}://${req.get('host')}/setup`,
            fbp: registrationMeta.fbp,
            fbc: registrationMeta.fbc,
            eventId: registrationEventId,
            contentName: 'marketel-property-setup',
        }).catch((error) => console.error('CompleteRegistration CAPI queue failed:', error.message));

        void sendAdminPush('SetupCompleted', { property: hotel.name || hotel.ownerEmail || hotel.id });
        console.log(`✅ Setup completed (freemium): ${hotel.name} (${hotel.id}) → ${assignedDomain}`);
        res.json({
            success: true,
            bookingUrl: 'https://' + assignedDomain,
            frontdeskUrl: `${marketelFrontdeskOrigin(req)}/frontdesk?hotelId=${encodeURIComponent(hotel.id)}`,
            crmPin: defaultPin, // backwards compatibility for already-cached setup pages
            frontdeskReturnToken,
            previewEmailSent,
            registrationEventId,
            registrationNewlyCompleted: true,
        });
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

async function resolvePublicHotelConfig(hotelId) {
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

// Per-hotel square image used by browser identity and Guestel surfaces: an
// uploaded logo, or a generated letter tile (e.g. "M" for Mo's Hotel).
app.get('/api/hotel/:hotelId/guest-app-icon.png', async (req, res) => {
    try {
        const allowedSizes = [96, 128, 152, 180, 192, 256, 512];
        let size = parseInt(req.query.s, 10) || 192;
        if (!allowedSizes.includes(size)) size = 192;

        const hotel = await resolvePublicHotelConfig(req.params.hotelId);
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
            background_color: '#EFF4F0',
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
            include: {
                rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
                rates: true,
                domains: { where: { isPrimary: true }, take: 1 },
            },
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
                    include: {
                        rooms: { include: { images: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
                        rates: true,
                        domains: { where: { isPrimary: true }, take: 1 },
                    },
                });
            }
        }

        if (!hotel || hotel.active === false) return res.status(404).json({ error: 'Hotel not found' });

        // Build absolute image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resolveImgUrl = (url) => url.startsWith('http') ? url : baseUrl + url;

        // Allow preview for unpaid hotels (setupComplete=false) — they just can't have a public domain yet
        res.json({
            id: hotel.id,
            domain: hotel.domains?.[0]?.domain || '',
            name: hotel.name,
            phone: hotel.phone,
            address: hotel.address,
            subtitle: hotel.subtitle,
            pms: hotel.pms,
            theme: hotel.theme || 'light',
            appIconUrl: hotel.appIconUrl ? resolveImgUrl(hotel.appIconUrl) : '',
            guestelWalletImageUrl: hotel.guestelWalletImageUrl ? resolveImgUrl(hotel.guestelWalletImageUrl) : '',
            guestelWalletSubtitle: hotel.guestelWalletSubtitle || hotel.address || '',
            checkInTime: hotel.checkInTime,
            checkOutTime: hotel.checkOutTime,
            cancellationPolicy: hotel.cancellationPolicy || '',
            // Returning-guest offer, only when live — the booking engine and
            // Guestel show a "return rate" to guests who already stayed here.
            returnOffer: (hotel.returnOfferEnabled && Number(hotel.returnOfferValue) > 0)
                ? {
                    kind: hotel.returnOfferKind === 'amount' ? 'amount' : 'percent',
                    value: Number(hotel.returnOfferValue) || 0,
                    label: hotel.returnOfferLabel || '',
                }
                : null,
            subscribed: hotel.subscribed || false,
            rates: hotel.rates ? { NIGHTLY: hotel.rates.nightly, WEEKLY: hotel.rates.weekly, MONTHLY: hotel.rates.monthly, taxRate: hotel.rates.taxRate } : { NIGHTLY: 69, WEEKLY: 483, MONTHLY: 1932, taxRate: 0 },
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
                guestelWalletImageUrl: true,
                guestelWalletSubtitle: true,
                returnOfferEnabled: true,
                returnOfferKind: true,
                returnOfferValue: true,
                returnOfferLabel: true,
                otaCommissionRate: true,
                subscribed: true,
                setupToken: true,
                ownerEmail: true,
                rooms: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                    select: {
                        images: {
                            orderBy: { sortOrder: 'asc' },
                            take: 1,
                            select: { url: true },
                        },
                    },
                },
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
            guestelWalletImageUrl: dbHotel?.guestelWalletImageUrl || '',
            guestelWalletFallbackImageUrl: absolutePublicAssetUrl(req, dbHotel?.rooms?.[0]?.images?.[0]?.url),
            guestelWalletSubtitle: dbHotel?.guestelWalletSubtitle || '',
            returnOfferEnabled: dbHotel?.returnOfferEnabled || false,
            returnOfferKind: dbHotel?.returnOfferKind || 'percent',
            returnOfferValue: Number(dbHotel?.returnOfferValue) || 0,
            returnOfferLabel: dbHotel?.returnOfferLabel || '',
            otaCommissionRate: Number.isFinite(Number(dbHotel?.otaCommissionRate)) ? Number(dbHotel?.otaCommissionRate) : 0.15,
            subscribed: dbHotel?.subscribed || false,
            frontdeskAppStoreUrl: MARKETEL_FRONTDESK_APP_STORE_URL,
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
        const {
            name, subtitle, address, phone, cancellationPolicy, theme,
            returnOfferEnabled, returnOfferKind, returnOfferValue, returnOfferLabel,
            otaCommissionRate,
        } = req.body;
        const data = {};
        if (name !== undefined) data.name = name || undefined;
        if (subtitle !== undefined) data.subtitle = subtitle;
        if (address !== undefined) data.address = address;
        if (phone !== undefined) data.phone = phone;
        if (cancellationPolicy !== undefined) data.cancellationPolicy = cancellationPolicy;
        if (theme !== undefined) data.theme = theme;
        // Returning-guest offer. Clamp to safe, sensible bounds so a bad client
        // value can never produce a negative or absurd return rate for guests.
        if (returnOfferEnabled !== undefined) data.returnOfferEnabled = !!returnOfferEnabled;
        if (returnOfferKind !== undefined) {
            data.returnOfferKind = returnOfferKind === 'amount' ? 'amount' : 'percent';
        }
        if (returnOfferValue !== undefined) {
            const kind = data.returnOfferKind
                || (returnOfferKind === 'amount' ? 'amount' : 'percent');
            const raw = Number(returnOfferValue);
            const safe = Number.isFinite(raw) ? raw : 0;
            data.returnOfferValue = kind === 'percent'
                ? Math.min(50, Math.max(0, Math.round(safe)))
                : Math.min(1000, Math.max(0, Math.round(safe * 100) / 100));
        }
        if (returnOfferLabel !== undefined) {
            data.returnOfferLabel = String(returnOfferLabel || '').slice(0, 80) || null;
        }
        if (otaCommissionRate !== undefined) {
            const raw = Number(otaCommissionRate);
            const safe = Number.isFinite(raw) ? raw : 0.15;
            // Accept either a fraction (0.15) or a percentage (15) from the client.
            const asFraction = safe > 1 ? safe / 100 : safe;
            data.otaCommissionRate = Math.min(0.4, Math.max(0, asFraction));
        }
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
app.post('/api/forgot-pin', forgotPinRateLimit, async (req, res) => {
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
const RECOVERY_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const NATIVE_LOGIN_CODE_EXPIRY_MS = 10 * 60 * 1000;
const SETUP_OWNER_COOKIE = 'marketelSetupOwner';
const SETUP_OWNER_COOKIE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

if (!configuredMagicLinkSecret) {
    console.warn('MAGIC_LINK_SECRET or SESSION_SECRET is not set; using an ephemeral magic-link secret for this process.');
}

function normalizeOwnerEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function validOwnerEmail(value) {
    const email = normalizeOwnerEmail(value);
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function readRequestCookie(req, name) {
    const header = String(req?.headers?.cookie || '');
    const prefix = `${name}=`;
    for (const part of header.split(';')) {
        const clean = part.trim();
        if (!clean.startsWith(prefix)) continue;
        try { return decodeURIComponent(clean.slice(prefix.length)); }
        catch (_) { return ''; }
    }
    return '';
}

function signSetupOwnerPayload(encoded) {
    return crypto.createHmac('sha256', MAGIC_LINK_SECRET).update(`setup-owner:${encoded}`).digest('base64url');
}

function generateSetupOwnerCookie(hotelId, email) {
    const payload = Buffer.from(JSON.stringify({
        hotelId: String(hotelId || '').trim(),
        email: normalizeOwnerEmail(email),
        exp: Date.now() + SETUP_OWNER_COOKIE_EXPIRY_MS,
    })).toString('base64url');
    return `${payload}.${signSetupOwnerPayload(payload)}`;
}

function verifySetupOwnerCookie(value) {
    const [encoded, signature, extra] = String(value || '').split('.');
    if (!encoded || !signature || extra) return null;
    if (!timingSafeTextEqual(signature, signSetupOwnerPayload(encoded))) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (!payload.hotelId || !payload.email || Number(payload.exp) < Date.now()) return null;
        return { hotelId: String(payload.hotelId), email: normalizeOwnerEmail(payload.email) };
    } catch (_) {
        return null;
    }
}

function setSetupOwnerCookie(req, res, hotelId, email) {
    const secure = req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
    res.cookie(SETUP_OWNER_COOKIE, generateSetupOwnerCookie(hotelId, email), {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: SETUP_OWNER_COOKIE_EXPIRY_MS,
        path: '/',
    });
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

// ── Guestel guest identity ─────────────────────────────────────
// Email verification recovers a guest's wallet on a new phone. Individual
// bookings also receive a narrower signed reservation capability at checkout,
// so the device that booked can message immediately without another prompt.
const GUEST_LOGIN_CODE_EXPIRY_MS = 10 * 60 * 1000;

function hashGuestLoginCode(email, code) {
    return crypto.createHmac('sha256', process.env.GUEST_IDENTITY_SECRET || NATIVE_SESSION_TOKEN_SECRET)
        .update(`${String(email || '').trim().toLowerCase()}:${String(code || '').trim()}`)
        .digest('hex');
}

async function guestBookingsForEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return [];
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    const deletion = await prisma.guestelAccountDeletion.findUnique({ where: { emailHash } });
    return prisma.booking.findMany({
        where: {
            guestEmail: { equals: normalizedEmail, mode: 'insensitive' },
            status: { notIn: ['deleted'] },
            guestAccessRevokedAt: null,
            ...(deletion ? { createdAt: { gt: deletion.deletedAt } } : {}),
        },
        orderBy: { checkinDate: 'desc' },
        take: 100,
    });
}

app.post('/api/guest/auth/code/request', guestCodeRequestRateLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
        }
        const booking = (await guestBookingsForEmail(email))[0];
        // Do not reveal whether this address has ever booked a stay.
        if (!booking) return res.json({ success: true });
        if (!emailTransporter) {
            return res.status(503).json({ success: false, message: 'Email is temporarily unavailable. Try again shortly.' });
        }
        const code = String(crypto.randomInt(100000, 1000000));
        await prisma.guestLoginChallenge.upsert({
            where: { email },
            create: {
                email,
                codeHash: hashGuestLoginCode(email, code),
                expiresAt: new Date(Date.now() + GUEST_LOGIN_CODE_EXPIRY_MS),
            },
            update: {
                codeHash: hashGuestLoginCode(email, code),
                expiresAt: new Date(Date.now() + GUEST_LOGIN_CODE_EXPIRY_MS),
                attempts: 0,
            },
        });
        await prisma.guestLoginChallenge.deleteMany({
            where: { expiresAt: { lt: new Date(Date.now() - GUEST_LOGIN_CODE_EXPIRY_MS) } },
        }).catch(() => {});
        await emailTransporter.sendMail({
            from: '"Guestel" <support@bookmarketel.com>',
            to: email,
            subject: `${code} is your Guestel code`,
            html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:40px 20px;text-align:center;">
                <h2 style="font-size:22px;color:#1a2b22;margin:0 0 12px;">Bring back your stays</h2>
                <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 22px;">Enter this code in Guestel. It expires in 10 minutes.</p>
                <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#2E7D5B;margin-left:8px;">${code}</div>
                <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">If you did not request this, you can ignore this email.</p>
            </div>`,
            text: `${code} is your Guestel verification code. It expires in 10 minutes.`,
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Guestel code request error:', error.message);
        res.status(500).json({ success: false, message: 'Could not send the code. Try again.' });
    }
});

app.post('/api/guest/auth/code/verify', guestCodeVerifyRateLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
        const challenge = await prisma.guestLoginChallenge.findUnique({ where: { email } });
        if (!challenge || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= 5) {
            if (email) await prisma.guestLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
            return res.status(401).json({ success: false, message: 'That code is invalid or expired. Request a new one.' });
        }
        await prisma.guestLoginChallenge.update({ where: { email }, data: { attempts: { increment: 1 } } });
        if (!timingSafeTextEqual(challenge.codeHash, hashGuestLoginCode(email, code))) {
            return res.status(401).json({ success: false, message: 'That code is invalid or expired.' });
        }
        const bookings = await guestBookingsForEmail(email);
        if (!bookings.length) {
            await prisma.guestLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
            return res.status(401).json({ success: false, message: 'No stays were found for that email.' });
        }
        await prisma.guestLoginChallenge.deleteMany({ where: { email } }).catch(() => {});
        res.json({
            success: true,
            sessionToken: createGuestIdentityToken(email),
            expiresInDays: 90,
        });
    } catch (error) {
        console.error('Guestel code verify error:', error.message);
        res.status(500).json({ success: false, message: 'Could not verify the code. Try again.' });
    }
});

app.get('/api/guest/wallet', guestWalletRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const identity = readGuestIdentityToken(bearerToken(req));
        if (!identity) return res.status(401).json({ success: false, message: 'Sign in to restore your stays.' });
        const bookings = await guestBookingsForEmail(identity.email);
        const hotelIds = [...new Set(bookings.map(booking => booking.hotelId))];
        const hotels = hotelIds.length ? await prisma.hotelConfig.findMany({
            where: { id: { in: hotelIds }, active: true },
            include: {
                domains: { where: { isPrimary: true }, take: 1 },
                rooms: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }, orderBy: { sortOrder: 'asc' }, take: 1 },
            },
        }) : [];
        const latest = bookings[0];
        res.json({
            success: true,
            guest: latest ? {
                name: [latest.guestFirstName, latest.guestLastName].filter(Boolean).join(' ').trim(),
                email: latest.guestEmail,
                phone: latest.guestPhone,
            } : { name: '', email: identity.email, phone: '' },
            hotels: hotels.map(hotel => ({
                hotelId: hotel.id,
                domain: hotel.domains?.[0]?.domain || '',
                name: hotel.name,
                location: hotel.guestelWalletSubtitle || hotel.address || 'Direct booking',
                imageURL: hotel.guestelWalletImageUrl || hotel.rooms?.[0]?.images?.[0]?.url || hotel.appIconUrl || '',
            })),
            reservations: bookings.map(booking => ({
                code: booking.pmsConfirmationCode || booking.ourReservationCode,
                hotelId: booking.hotelId,
                checkin: booking.checkinDate,
                checkout: booking.checkoutDate,
                status: booking.status,
                roomName: booking.roomName,
                reservationToken: safeReservationToken(booking),
            })),
        });
    } catch (error) {
        console.error('Guestel wallet error:', error.message);
        res.status(500).json({ success: false, message: 'Could not restore your stays.' });
    }
});

async function verifiedGuestBooking(req, hotelId, reservationCode = '') {
    const token = bearerToken(req);
    const reservation = readReservationToken(token);
    if (reservation) {
        if (hotelId && reservation.hotelId !== String(hotelId)) return null;
        const booking = await prisma.booking.findFirst({
            where: { id: reservation.bookingId, hotelId: reservation.hotelId },
        });
        if (!booking || booking.guestAccessRevokedAt) return null;
        const codes = guestBookingThreadCodes(booking, reservation.reservationCode);
        return reservationCode && !codes.includes(String(reservationCode).trim()) ? null : booking;
    }
    const identity = readGuestIdentityToken(token);
    if (!identity || !hotelId || !reservationCode) return null;
    const booking = await findGuestBooking(String(hotelId), String(reservationCode));
    return booking && !booking.guestAccessRevokedAt && guestEmailMatches(booking, identity.email) ? booking : null;
}

async function verifiedGuestBookings(req, suppliedTokens = []) {
    const byId = new Map();
    const identity = readGuestIdentityToken(bearerToken(req));
    if (identity) {
        const bookings = await guestBookingsForEmail(identity.email);
        bookings.forEach(booking => byId.set(booking.id, booking));
    }

    const claims = (Array.isArray(suppliedTokens) ? suppliedTokens : [])
        .slice(0, 100)
        .map(token => readReservationToken(token))
        .filter(Boolean);
    if (claims.length) {
        const ids = [...new Set(claims.map(claim => claim.bookingId))];
        const bookings = await prisma.booking.findMany({ where: { id: { in: ids }, guestAccessRevokedAt: null } });
        bookings.forEach((booking) => {
            const verified = claims.some(claim => (
                claim.bookingId === booking.id
                && claim.hotelId === booking.hotelId
                && guestBookingThreadCodes(booking, claim.reservationCode).includes(claim.reservationCode)
            ));
            if (verified) byId.set(booking.id, booking);
        });
    }
    return [...byId.values()];
}

function guestMessageJSON(message) {
    let requests = [];
    try { requests = message.requests ? JSON.parse(message.requests) : []; } catch (_) {}
    return {
        id: message.id,
        body: message.body || '',
        sender: message.sender || 'guest',
        createdAt: message.createdAt,
        requests,
    };
}

// Exchanges the short-lived App Clip bridge for the normal, reservation-scoped
// capability. The URL token itself cannot read messages or modify a booking.
app.post('/api/guest/native/handoff/create', guestHandoffGlobalRateLimit, guestHandoffRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const booking = await verifiedGuestBooking(req, '', '');
        if (!booking) return res.status(401).json({ success: false, message: 'This stay could not be verified.' });
        const handoffToken = await issueGuestAppHandoff(booking);
        if (!handoffToken) return res.status(503).json({ success: false, message: 'Guestel transfer is temporarily unavailable.' });
        res.json({ success: true, handoffToken });
    } catch (error) {
        console.error('Guestel handoff creation error:', error.message);
        res.status(500).json({ success: false, message: 'Could not prepare this stay for Guestel.' });
    }
});

app.post('/api/guest/native/handoff', guestHandoffGlobalRateLimit, guestHandoffRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const rawToken = String(req.body?.handoffToken || '').trim();
        if (!rawToken) return res.status(401).json({ success: false, message: 'This Guestel handoff has expired.' });
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const claim = await prisma.guestAppHandoff.findUnique({ where: { tokenHash } });
        if (!claim || claim.claimedAt || claim.expiresAt.getTime() <= Date.now()) {
            return res.status(401).json({ success: false, message: 'This Guestel handoff has expired.' });
        }
        const claimed = await prisma.guestAppHandoff.updateMany({
            where: { id: claim.id, claimedAt: null, expiresAt: { gt: new Date() } },
            data: { claimedAt: new Date() },
        });
        if (claimed.count !== 1) {
            return res.status(401).json({ success: false, message: 'This Guestel handoff was already used.' });
        }
        const booking = await prisma.booking.findFirst({
            where: { id: claim.bookingId, hotelId: claim.hotelId },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'That stay could not be found.' });
        }
        res.json({
            success: true,
            reservation: {
                code: booking.pmsConfirmationCode || booking.ourReservationCode,
                hotelId: booking.hotelId,
                checkin: booking.checkinDate,
                checkout: booking.checkoutDate,
                status: booking.status,
                roomName: booking.roomName,
                reservationToken: safeReservationToken(booking),
            },
        });
    } catch (error) {
        console.error('Guestel handoff error:', error.message);
        res.status(500).json({ success: false, message: 'Could not bring this stay into Guestel.' });
    }
});

// One lightweight inbox request for all locally verified stays. Reading this
// list does not mark a conversation read; only opening its native thread does.
app.post('/api/guest/native/conversations', guestConversationsGlobalRateLimit, guestConversationsRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const bookings = await verifiedGuestBookings(req, req.body?.reservationTokens);
        if (!bookings.length) return res.json({ success: true, conversations: [] });

        const bookingById = new Map(bookings.map(booking => [booking.id, booking]));
        const bookingByThread = new Map();
        bookings.forEach((booking) => {
            guestBookingThreadCodes(booking).forEach(code => {
                bookingByThread.set(`${booking.hotelId}:${code}`, booking);
            });
        });
        const filters = bookings.flatMap(booking => {
            const codes = guestBookingThreadCodes(booking);
            return [
                { bookingId: booking.id },
                ...(codes.length ? [{ hotelId: booking.hotelId, reservationCode: { in: codes } }] : []),
            ];
        });
        const rows = await prisma.guestMessage.findMany({
            where: { OR: filters },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });
        const grouped = new Map();
        rows.forEach((message) => {
            const booking = (message.bookingId && bookingById.get(message.bookingId))
                || bookingByThread.get(`${message.hotelId}:${message.reservationCode || ''}`);
            if (!booking) return;
            if (booking.guestMessagesHiddenBefore
                && message.createdAt.getTime() <= booking.guestMessagesHiddenBefore.getTime()) return;
            let summary = grouped.get(booking.id);
            if (!summary) {
                summary = { latest: message, unreadCount: 0 };
                grouped.set(booking.id, summary);
            }
            if (message.sender === 'hotel' && !message.guestReadAt) summary.unreadCount += 1;
        });
        res.json({
            success: true,
            conversations: bookings.flatMap((booking) => {
                const summary = grouped.get(booking.id);
                // A deleted conversation stays out of Guestel until a new
                // message is created after the deletion cutoff. The property
                // continues to retain and see the complete thread.
                if (booking.guestMessagesHiddenBefore && !summary) return [];
                return [{
                    code: booking.pmsConfirmationCode || booking.ourReservationCode,
                    hotelId: booking.hotelId,
                    roomName: booking.roomName,
                    checkin: booking.checkinDate,
                    checkout: booking.checkoutDate,
                    status: booking.status,
                    latestMessage: summary?.latest ? guestMessageJSON(summary.latest) : null,
                    unreadCount: summary?.unreadCount || 0,
                }];
            }),
        });
    } catch (error) {
        console.error('Guestel conversations error:', error.message);
        res.status(500).json({ success: false, message: 'Could not load conversations.' });
    }
});

app.get('/api/guest/native/messages', guestMessagesFetchGlobalRateLimit, guestMessagesFetchRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hotelId = String(req.query?.hotelId || '').trim();
        const code = String(req.query?.code || '').trim();
        const booking = await verifiedGuestBooking(req, hotelId, code);
        if (!booking) return res.status(401).json({ success: false, message: 'This stay could not be verified.' });
        const threadCodes = guestBookingThreadCodes(booking, code);
        const messages = await prisma.guestMessage.findMany({
            where: {
                hotelId: booking.hotelId,
                reservationCode: { in: threadCodes },
                ...(booking.guestMessagesHiddenBefore
                    ? { createdAt: { gt: booking.guestMessagesHiddenBefore } }
                    : {}),
            },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });
        await prisma.guestMessage.updateMany({
            where: { hotelId: booking.hotelId, reservationCode: { in: threadCodes }, sender: 'hotel', guestReadAt: null },
            data: { guestReadAt: new Date() },
        }).catch(() => {});
        res.json({ success: true, messages: messages.map(guestMessageJSON) });
    } catch (error) {
        console.error('Guestel native messages fetch error:', error.message);
        res.status(500).json({ success: false, message: 'Could not load messages.' });
    }
});

// Guestel mirrors the native Messages convention: deleting a conversation
// removes the guest's copy, not the property's operational record. Storing the
// cutoff on the verified booking makes the choice follow the guest across
// devices and lets a genuinely new reply recreate the thread naturally.
app.delete('/api/guest/native/conversation', guestMessagesReadGlobalRateLimit, guestMessagesReadRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hotelId = String(req.query?.hotelId || '').trim();
        const code = String(req.query?.code || '').trim();
        const booking = await verifiedGuestBooking(req, hotelId, code);
        if (!booking) return res.status(401).json({ success: false, message: 'This stay could not be verified.' });

        const hiddenBefore = new Date();
        const threadCodes = guestBookingThreadCodes(booking, code);
        await prisma.$transaction([
            prisma.booking.update({
                where: { id: booking.id },
                data: { guestMessagesHiddenBefore: hiddenBefore },
            }),
            prisma.guestMessage.updateMany({
                where: {
                    hotelId: booking.hotelId,
                    reservationCode: { in: threadCodes },
                    sender: 'hotel',
                    guestReadAt: null,
                    createdAt: { lte: hiddenBefore },
                },
                data: { guestReadAt: hiddenBefore },
            }),
        ]);
        res.json({ success: true, hiddenBefore: hiddenBefore.toISOString() });
    } catch (error) {
        console.error('Guestel conversation delete error:', error.message);
        res.status(500).json({ success: false, message: 'Could not delete this conversation.' });
    }
});

app.post('/api/guest/native/stays', guestWalletRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const claims = (Array.isArray(req.body?.reservationTokens) ? req.body.reservationTokens : [])
            .slice(0, 100)
            .map(token => readReservationToken(token))
            .filter(Boolean);
        if (!claims.length) return res.status(401).json({ success: false, message: 'No verified stays were supplied.' });
        const ids = [...new Set(claims.map(claim => claim.bookingId))];
        const bookings = await prisma.booking.findMany({ where: { id: { in: ids } } });
        const verified = bookings.filter(booking => claims.some(claim => (
            claim.bookingId === booking.id
            && claim.hotelId === booking.hotelId
            && guestBookingThreadCodes(booking, claim.reservationCode).includes(claim.reservationCode)
        )));
        res.json({
            success: true,
            reservations: verified.map(booking => ({
                code: booking.pmsConfirmationCode || booking.ourReservationCode,
                hotelId: booking.hotelId,
                checkin: booking.checkinDate,
                checkout: booking.checkoutDate,
                status: booking.status,
                roomName: booking.roomName,
                reservationToken: safeReservationToken(booking),
            })),
        });
    } catch (error) {
        console.error('Guestel native stay sync error:', error.message);
        res.status(500).json({ success: false, message: 'Could not refresh stays.' });
    }
});

app.post('/api/guest/native/messages', guestMessageGlobalRateLimit, guestMessageRateLimit, async (req, res) => {
    try {
        const hotelId = String(req.body?.hotelId || '').trim();
        const code = String(req.body?.reservationCode || '').trim();
        const body = String(req.body?.body || '').trim().slice(0, 2000);
        if (!body) return res.status(400).json({ success: false, message: 'Message is empty.' });
        const booking = await verifiedGuestBooking(req, hotelId, code);
        if (!booking) return res.status(401).json({ success: false, message: 'This stay could not be verified.' });
        const canonicalCode = guestBookingThreadCode(booking, code);
        const guestName = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ').trim() || 'Guest';
        const message = await prisma.guestMessage.create({
            data: {
                hotelId: booking.hotelId,
                bookingId: booking.id,
                reservationCode: canonicalCode,
                guestName,
                guestEmail: booking.guestEmail || null,
                guestPhone: booking.guestPhone || null,
                roomName: booking.roomName || null,
                body,
                sender: 'guest',
            },
        });
        notifyGuestMessage(booking.hotelId, guestName, body.slice(0, 140), canonicalCode).catch(() => {});
        res.json({ success: true, message: guestMessageJSON(message) });
    } catch (error) {
        console.error('Guestel native message send error:', error.message);
        res.status(500).json({ success: false, message: 'Could not send message.' });
    }
});

// Deletes the guest-facing Guestel account while preserving hotel reservation,
// tax, dispute, and message records. Old signed reservation capabilities are
// invalidated, and the deletion watermark prevents an email restore from
// rebuilding the historical wallet. A later new booking can create a new one.
app.delete('/api/guest/native/account', guestCodeVerifyRateLimit, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const suppliedTokens = Array.isArray(req.body?.reservationTokens)
            ? req.body.reservationTokens.slice(0, 100)
            : [];
        const verified = await verifiedGuestBookings(req, suppliedTokens);
        if (!verified.length) {
            return res.status(401).json({ success: false, message: 'Verify a stay before deleting your Guestel account.' });
        }

        const identity = readGuestIdentityToken(bearerToken(req));
        const normalizedEmail = String(identity?.email || verified[0]?.guestEmail || '').trim().toLowerCase();
        if (!normalizedEmail || !verified.every(booking => guestEmailMatches(booking, normalizedEmail))) {
            return res.status(401).json({ success: false, message: 'This Guestel account could not be verified.' });
        }

        const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
        const deletedAt = new Date();
        const retainedBookings = await prisma.booking.findMany({
            where: { guestEmail: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true },
        });
        const bookingIds = retainedBookings.map(booking => booking.id);
        const deviceToken = String(req.body?.deviceToken || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();

        // Possession of this independently signed capability authorizes removal
        // of that Stripe customer. A previously deleted customer is success.
        const paymentClaim = readGuestPaymentToken(String(req.body?.paymentToken || '').trim());
        if (paymentClaim?.customerId) {
            const customer = await stripe.customers.retrieve(paymentClaim.customerId).catch(() => null);
            if (customer && !customer.deleted) await stripe.customers.del(paymentClaim.customerId);
        }

        const writes = [
            prisma.guestelAccountDeletion.upsert({
                where: { emailHash },
                create: { emailHash, deletedAt },
                update: { deletedAt },
            }),
            prisma.booking.updateMany({
                where: { id: { in: bookingIds } },
                data: {
                    guestAccessRevokedAt: deletedAt,
                    guestMessagesHiddenBefore: deletedAt,
                },
            }),
            prisma.guestLoginChallenge.deleteMany({ where: { email: normalizedEmail } }),
            prisma.guestNativePushDevice.deleteMany({ where: { bookingId: { in: bookingIds } } }),
            prisma.guestAppHandoff.deleteMany({ where: { bookingId: { in: bookingIds } } }),
            prisma.guestelPropertyDevice.deleteMany({
                where: {
                    OR: [
                        { guestEmailHash: emailHash },
                        ...(deviceToken ? [{ deviceToken }] : []),
                    ],
                },
            }),
        ];
        await prisma.$transaction(writes);
        res.json({
            success: true,
            retainedReservationRecords: bookingIds.length,
            message: 'Your Guestel account was deleted. Your reservations were not cancelled.',
        });
    } catch (error) {
        console.error('Guestel account deletion error:', error.message);
        res.status(500).json({ success: false, message: 'Could not delete your Guestel account. Nothing was cancelled.' });
    }
});

app.post('/api/guest/native/push/register', guestNativePushRateLimit, async (req, res) => {
    try {
        const deviceToken = String(req.body?.deviceToken || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        const environment = req.body?.environment === 'sandbox' ? 'sandbox' : 'production';
        if (!/^[a-f0-9]{32,200}$/.test(deviceToken)) {
            return res.status(400).json({ success: false, message: 'A valid APNs device token is required.' });
        }
        let bookings = [];
        const identity = readGuestIdentityToken(bearerToken(req));
        if (identity) bookings = await guestBookingsForEmail(identity.email);
        const reservationTokens = Array.isArray(req.body?.reservationTokens)
            ? req.body.reservationTokens.slice(0, 100)
            : [];
        const reservationClaims = reservationTokens.map(token => readReservationToken(token)).filter(Boolean);
        if (reservationClaims.length) {
            const ids = [...new Set(reservationClaims.map(claim => claim.bookingId))];
            const claimed = await prisma.booking.findMany({ where: { id: { in: ids }, guestAccessRevokedAt: null } });
            const valid = claimed.filter(booking => reservationClaims.some(claim => claim.bookingId === booking.id && claim.hotelId === booking.hotelId));
            bookings = [...new Map([...bookings, ...valid].map(booking => [booking.id, booking])).values()];
        }
        const requestedHotelIds = [...new Set((Array.isArray(req.body?.hotelIds) ? req.body.hotelIds : [])
            .slice(0, 100)
            .map(value => String(value || '').trim())
            .filter(Boolean))];
        const activeHotels = requestedHotelIds.length
            ? await prisma.hotelConfig.findMany({
                where: { id: { in: requestedHotelIds }, active: true },
                select: { id: true },
            })
            : [];
        if (!bookings.length && !activeHotels.length) {
            return res.status(401).json({ success: false, message: 'Save a property or verify a stay before enabling notifications.' });
        }
        const preferences = req.body?.preferences || {};
        const propertyUpdates = preferences.propertyUpdates === true || preferences.deals === true;
        const guestEmail = String(identity?.email || bookings[0]?.guestEmail || '').trim().toLowerCase();
        const guestEmailHash = guestEmail
            ? crypto.createHash('sha256').update(guestEmail).digest('hex')
            : null;
        const writes = bookings.map(booking => prisma.guestNativePushDevice.upsert({
            where: { deviceToken_bookingId: { deviceToken, bookingId: booking.id } },
            create: {
                deviceToken,
                environment,
                hotelId: booking.hotelId,
                bookingId: booking.id,
                reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
                stayUpdates: preferences.stayUpdates !== false,
                messages: preferences.messages !== false,
                deals: propertyUpdates,
            },
            update: {
                environment,
                hotelId: booking.hotelId,
                reservationCode: booking.pmsConfirmationCode || booking.ourReservationCode,
                stayUpdates: preferences.stayUpdates !== false,
                messages: preferences.messages !== false,
                deals: propertyUpdates,
                active: true,
                lastSeenAt: new Date(),
            },
        }));
        activeHotels.forEach(hotel => {
            writes.push(prisma.guestelPropertyDevice.upsert({
                where: { deviceToken_hotelId: { deviceToken, hotelId: hotel.id } },
                create: {
                    deviceToken,
                    environment,
                    hotelId: hotel.id,
                    guestEmailHash,
                    updates: propertyUpdates,
                },
                update: {
                    environment,
                    guestEmailHash,
                    updates: propertyUpdates,
                    active: true,
                    lastSeenAt: new Date(),
                },
            }));
        });
        await prisma.$transaction(writes);
        res.json({
            success: true,
            registeredStays: bookings.length,
            registeredProperties: activeHotels.length,
            pushConfigured: GUESTEL_APNS_CONFIGURED,
        });
    } catch (error) {
        console.error('Guestel native push register error:', error.message);
        res.status(500).json({ success: false, message: 'Could not enable notifications.' });
    }
});

// Guest-owned delivery probe. It can only target the requesting device and a
// stay proven by the same signed reservation/identity capability used by the
// rest of Guestel. Besides giving the notification settings screen an honest
// "Send test" action, returning APNs' rejection reason makes a bad topic,
// profile or expired token diagnosable instead of silently swallowing it.
app.post('/api/guest/native/push/test', guestNativePushRateLimit, async (req, res) => {
    try {
        const deviceToken = String(req.body?.deviceToken || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        const hotelId = String(req.body?.hotelId || '').trim();
        const code = String(req.body?.reservationCode || '').trim();
        if (!/^[a-f0-9]{32,200}$/.test(deviceToken)) {
            return res.status(400).json({ success: false, message: 'A valid APNs device token is required.' });
        }
        if (!GUESTEL_APNS_CONFIGURED) {
            return res.status(503).json({ success: false, message: 'Guestel notifications are not configured on the server.' });
        }
        const booking = await verifiedGuestBooking(req, hotelId, code);
        if (!booking) {
            return res.status(401).json({ success: false, message: 'This stay could not be verified.' });
        }
        const device = await prisma.guestNativePushDevice.findFirst({
            where: { deviceToken, bookingId: booking.id, active: true },
        });
        if (!device) {
            return res.status(409).json({
                success: false,
                message: 'This iPhone is not registered for that stay yet. Turn notifications on and try again.',
            });
        }
        try {
            await sendApnsRequest(device, {
                title: 'Guestel notifications are on ✓',
                body: 'Front Desk replies and important stay updates will appear here.',
                url: `guestel://messages?hotelId=${encodeURIComponent(booking.hotelId)}&code=${encodeURIComponent(guestBookingThreadCode(booking, code))}`,
                tag: `guestel-test-${booking.id}`,
                data: {
                    type: 'guest_message',
                    hotelId: booking.hotelId,
                    reservationCode: guestBookingThreadCode(booking, code),
                },
            }, { TTL: 60, topic: GUESTEL_APNS_BUNDLE_ID });
            return res.json({ success: true, sent: 1 });
        } catch (error) {
            const deadReasons = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered']);
            const rejectionReason = String(error?.reason || error?.message || 'APNs error').slice(0, 120);
            if (deadReasons.has(error?.reason)) {
                await prisma.guestNativePushDevice.updateMany({
                    where: { deviceToken, bookingId: booking.id },
                    data: { active: false },
                }).catch(() => {});
            }
            console.error(`❌ [guest-apns] test booking=${booking.id}: ${error.message}`);
            return res.status(502).json({
                success: false,
                message: `Apple rejected the test notification (${rejectionReason}).`,
                reason: rejectionReason,
            });
        }
    } catch (error) {
        console.error('Guestel native push test error:', error.message);
        res.status(500).json({ success: false, message: 'Could not test notifications.' });
    }
});

app.post('/api/guest/native/push/unregister', guestNativePushRateLimit, async (req, res) => {
    try {
        const deviceToken = String(req.body?.deviceToken || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        if (!deviceToken) return res.status(400).json({ success: false, message: 'A device token is required.' });
        let bookingIds = [];
        const identity = readGuestIdentityToken(bearerToken(req));
        if (identity) bookingIds = (await guestBookingsForEmail(identity.email)).map(booking => booking.id);
        const claims = (Array.isArray(req.body?.reservationTokens) ? req.body.reservationTokens : [])
            .slice(0, 100)
            .map(token => readReservationToken(token))
            .filter(Boolean);
        bookingIds = [...new Set([...bookingIds, ...claims.map(claim => claim.bookingId)])];
        const hotelIds = [...new Set((Array.isArray(req.body?.hotelIds) ? req.body.hotelIds : [])
            .slice(0, 100)
            .map(value => String(value || '').trim())
            .filter(Boolean))];
        if (!bookingIds.length && !hotelIds.length) {
            return res.status(401).json({ success: false, message: 'No Guestel properties or stays were supplied.' });
        }
        const [stayResult, propertyResult] = await Promise.all([
            bookingIds.length ? prisma.guestNativePushDevice.updateMany({
                where: { deviceToken, bookingId: { in: bookingIds } },
                data: { active: false },
            }) : { count: 0 },
            hotelIds.length ? prisma.guestelPropertyDevice.updateMany({
                where: { deviceToken, hotelId: { in: hotelIds } },
                data: { active: false },
            }) : { count: 0 },
        ]);
        res.json({ success: true, unregistered: stayResult.count + propertyResult.count });
    } catch (error) {
        console.error('Guestel native push unregister error:', error.message);
        res.status(500).json({ success: false, message: 'Could not disable notifications.' });
    }
});

function generateMagicToken(email, hotelId, options = {}) {
    const expiresInMs = Math.max(
        5 * 60 * 1000,
        Math.min(RECOVERY_LINK_EXPIRY_MS, Number(options.expiresInMs) || MAGIC_LINK_EXPIRY_MS)
    );
    const payload = JSON.stringify({
        purpose: 'frontdesk-magic',
        email: normalizeOwnerEmail(email),
        hotelId: String(hotelId || '').trim(),
        exp: Date.now() + expiresInMs,
    });
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
        if (payload.purpose && payload.purpose !== 'frontdesk-magic') return null;
        if (!payload.hotelId || !payload.email || payload.exp < Date.now()) return null;
        return payload;
    } catch (e) { return null; }
}

function revealResumeParam(step) {
    const normalized = Math.max(0, Math.min(3, Number(step) || 0));
    return normalized === 3 ? 'checkout' : `step-${normalized}`;
}

function frontdeskMagicUrl(req, hotel, options = {}) {
    const token = generateMagicToken(hotel.ownerEmail, hotel.id, {
        expiresInMs: options.expiresInMs || MAGIC_LINK_EXPIRY_MS,
    });
    const params = new URLSearchParams({
        hotelId: hotel.id,
        magic: token,
        reveal: options.reveal === false ? '' : 'resume',
    });
    if (!params.get('reveal')) params.delete('reveal');
    return `${marketelFrontdeskOrigin(req)}/frontdesk?${params.toString()}`;
}

async function sendFrontdeskAccessEmail({ req, email, hotels, expiresInMs = MAGIC_LINK_EXPIRY_MS }) {
    if (!emailTransporter || !email || !Array.isArray(hotels) || !hotels.length) return false;
    const cleanHotels = hotels.slice(0, 10).map(hotel => ({
        id: String(hotel.id || '').trim(),
        name: String(hotel.name || hotel.id || 'Your property').trim(),
        subscribed: !!hotel.subscribed,
        url: frontdeskMagicUrl(req, hotel, { expiresInMs }),
    })).filter(hotel => hotel.id);
    if (!cleanHotels.length) return false;
    const buttons = cleanHotels.map(hotel => `
        <a href="${emailTemplateValue(hotel.url)}" style="display:block;margin-top:10px;padding:14px 18px;border-radius:11px;background:#2e7d5b;color:#fff;text-decoration:none;font-size:15px;font-weight:700;text-align:center;">
            ${hotel.subscribed ? 'Open' : 'Continue'} ${emailTemplateValue(hotel.name)}
        </a>`).join('');
    const listText = cleanHotels.map(hotel => `${hotel.name}: ${hotel.url}`).join('\n');
    try {
        await emailTransporter.sendMail({
            from: '"Marketel" <support@bookmarketel.com>',
            to: email,
            subject: cleanHotels.length === 1
                ? `Continue ${cleanHotels[0].name} in Marketel`
                : 'Choose a Marketel property to continue',
            html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:36px 20px;color:#19231d;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2e7d5b;">Secure access</div>
                <h1 style="font-size:23px;line-height:1.25;margin:8px 0 10px;">${cleanHotels.length === 1 ? 'Your Marketel is waiting' : 'Choose the property you want to open'}</h1>
                <p style="font-size:14px;line-height:1.6;color:#5d6a62;margin:0 0 18px;">Each button opens the correct property and returns to its saved stage. No PIN is required.</p>
                ${buttons}
                <p style="font-size:12px;line-height:1.5;color:#89938d;margin:22px 0 0;">These links expire automatically. If you did not request this email, you can ignore it.</p>
            </div>`,
            text: `Open your Marketel property—no PIN required.\n\n${listText}\n\nThese links expire automatically.`,
        });
        return true;
    } catch (error) {
        console.error('Front Desk access email failed:', error.message);
        return false;
    }
}

async function runCheckoutRecoverySweep() {
    if (!emailTransporter) return { checked: 0, sent: 0 };
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const candidates = await prisma.hotelConfig.findMany({
        where: {
            setupComplete: true,
            subscribed: false,
            ownerEmail: { not: null },
            checkoutStartedAt: { lte: cutoff },
            checkoutRecoveryEmailSentAt: null,
        },
        orderBy: { checkoutStartedAt: 'asc' },
        take: 25,
        select: {
            id: true,
            name: true,
            ownerEmail: true,
            subscribed: true,
            revealProgressStep: true,
            checkoutStartedAt: true,
        },
    });
    let sentCount = 0;
    for (const hotel of candidates) {
        const claimedAt = new Date();
        const claimed = await prisma.hotelConfig.updateMany({
            where: {
                id: hotel.id,
                subscribed: false,
                checkoutStartedAt: hotel.checkoutStartedAt,
                checkoutRecoveryEmailSentAt: null,
            },
            data: { checkoutRecoveryEmailSentAt: claimedAt },
        });
        if (!claimed.count) continue;
        const event = await prisma.funnelEvent.create({
            data: {
                hotelId: hotel.id,
                eventName: 'CheckoutRecoveryEmailSending',
                eventId: `marketel-checkout-recovery.${hotel.id}.${claimedAt.getTime()}`,
                guestEmail: hotel.ownerEmail,
                surface: 'email',
                pagePath: '/frontdesk',
                metadata: { checkoutStartedAt: hotel.checkoutStartedAt?.toISOString() || null },
            },
        }).catch(() => null);
        const resumeUrl = frontdeskMagicUrl(null, hotel, {
            expiresInMs: RECOVERY_LINK_EXPIRY_MS,
        });
        const sent = await sendMarketelLifecycleEmail({
            toEmail: hotel.ownerEmail,
            subject: `${hotel.name || 'Your Marketel'} is still saved`,
            template: 'checkout-recovery.html',
            replacements: {
                HOTEL_NAME: hotel.name || 'your property',
                RESUME_URL: resumeUrl,
            },
            text: `Your Marketel is still saved and no charge was made.\n\nReview activation when you are ready: ${resumeUrl}\n\nQuestions? Reply to this email.`,
        });
        if (sent) {
            sentCount += 1;
            if (event) {
                await prisma.funnelEvent.update({
                    where: { id: event.id },
                    data: { eventName: 'CheckoutRecoveryEmailSent' },
                }).catch(() => {});
            }
        } else {
            await prisma.hotelConfig.updateMany({
                where: { id: hotel.id, subscribed: false, checkoutRecoveryEmailSentAt: claimedAt },
                data: { checkoutRecoveryEmailSentAt: null },
            }).catch(() => {});
            if (event) await prisma.funnelEvent.delete({ where: { id: event.id } }).catch(() => {});
        }
    }
    return { checked: candidates.length, sent: sentCount };
}

// Send magic link email
app.post('/api/auth/magic-link', magicLinkRateLimit, async (req, res) => {
    try {
        const email = normalizeOwnerEmail(req.body?.email);
        const requestedHotelId = String(req.body?.hotelId || '').trim();
        if (!email) return res.json({ success: true }); // Don't reveal if email missing

        const hotels = await prisma.hotelConfig.findMany({
            where: {
                ownerEmail: { equals: email, mode: 'insensitive' },
                ...(requestedHotelId ? { id: requestedHotelId } : {}),
                active: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                name: true,
                ownerEmail: true,
                subscribed: true,
                revealProgressStep: true,
            },
        });
        const sent = await sendFrontdeskAccessEmail({ req, email, hotels });
        if (sent && hotels[0]) {
            await recordSetupRecoveryEvent(req, {
                hotelId: hotels[0].id,
                email,
                eventName: 'MagicLinkRequested',
                metadata: { propertyCount: hotels.length, requestedHotelId: requestedHotelId || null },
                surface: 'frontdesk-auth',
                pagePath: '/frontdesk',
            });
        }

        // Always use the same response. Besides preventing account discovery,
        // this keeps a stale/typo email from turning into a dead-end error page.
        res.json({ success: true });
    } catch (e) {
        console.error('magic-link error:', e.message);
        res.json({ success: true });
    }
});

// Verify magic link token — returns a scoped session without rotating any
// owner/staff PIN. Email login is a session, not a password-reset operation.
app.get('/api/auth/verify-magic', async (req, res) => {
    try {
        const token = String(req.query?.token || '').trim();
        const payload = verifyMagicToken(token);
        if (!payload) return res.status(401).json({ success: false, message: 'Link expired or invalid.' });

        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: String(payload.hotelId) },
            select: { id: true, ownerEmail: true, active: true, subscribed: true, revealProgressStep: true },
        });
        if (!hotel?.active || normalizeOwnerEmail(hotel.ownerEmail) !== normalizeOwnerEmail(payload.email)) {
            return res.status(401).json({ success: false, message: 'Link expired or invalid.' });
        }
        await recordSetupRecoveryEvent(req, {
            hotelId: hotel.id,
            email: hotel.ownerEmail,
            eventName: 'MagicLinkOpened',
            metadata: { revealStep: hotel.revealProgressStep, subscribed: hotel.subscribed },
            surface: 'frontdesk-auth',
            pagePath: '/frontdesk',
        });
        res.json({
            success: true,
            token: generateCrmSessionToken(hotel.id),
            hotelId: hotel.id,
            revealStep: Math.max(0, Math.min(3, Number(hotel.revealProgressStep) || 0)),
            subscribed: !!hotel.subscribed,
        });
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
    const checkoutTracking = await prisma.funnelEvent.findFirst({
        where: { eventName: 'CheckoutStarted', eventId: `marketel-checkout.${checkoutSession.id}` },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true, userAgent: true, ipAddress: true },
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
        void sendAdminPush('PaymentSucceeded', { property: hotel?.ownerEmail || hotelId });
    }

    // Stripe redirects leave the browser and webhooks have no browser cookies.
    // The original fbp/fbc, source URL, IP and user agent were captured before
    // Checkout and carried in Stripe/FunnelEvent, so Subscribe retains the same
    // match quality even when the webhook is the only request that arrives.
    const storedTracking = checkoutTracking?.metadata && typeof checkoutTracking.metadata === 'object'
        ? checkoutTracking.metadata.metaAttribution || {}
        : {};
    const requestMeta = req ? marketelMetaContext(req) : {};
    await queueMarketelCAPI('Subscribe', {
        hotelId,
        email: hotel?.ownerEmail || '',
        phone: hotel?.ownerPhone || '',
        externalId: hotelId,
        ip: checkoutTracking?.ipAddress || req?.ip || '',
        userAgent: checkoutTracking?.userAgent || req?.headers?.['user-agent'] || '',
        sourceUrl: checkoutSession?.metadata?.metaSourceUrl
            || storedTracking.sourceUrl
            || requestMeta.sourceUrl
            || process.env.BACKEND_URL
            || 'https://bookmarketel.com/frontdesk',
        fbp: checkoutSession?.metadata?.metaFbp || storedTracking.fbp || requestMeta.fbp || '',
        fbc: checkoutSession?.metadata?.metaFbc || storedTracking.fbc || requestMeta.fbc || '',
        value: amountUsd,
        currency: 'USD',
        eventId,
        contentName: billingPlan.contentName,
    });
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
        const meta = marketelMetaContext(req);
        const billingInterval = normalizeMarketelBillingInterval(req.body?.billingInterval);
        const frontdeskOrigin = marketelFrontdeskOrigin(req);
        const billing = await getMarketelSubscriptionPrice(billingInterval);
        const { amountUsd } = billing;
        const returnToken = await generateCrmReturnTokenForHotel(hotelId, hotel?.setupToken);
        const cancelParams = new URLSearchParams({
            hotelId,
            reveal: 'checkout',
            checkoutCancelled: '1',
        });
        const cancelAuth = new URLSearchParams({ returnToken });
        const cancelUrl = `${frontdeskOrigin}/frontdesk-return?${cancelParams.toString()}#${cancelAuth.toString()}`;
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
        void sendAdminPush('GoLiveClicked', { property: hotel.name || hotel.ownerEmail || hotelId });
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
                ...(meta.fbp ? { metaFbp: meta.fbp } : {}),
                ...(meta.fbc ? { metaFbc: meta.fbc } : {}),
                ...(meta.sourceUrl ? { metaSourceUrl: meta.sourceUrl } : {}),
                ...(journeyExternalId ? { journeyVisitorId: journeyExternalId } : {}),
                ...(journeySessionId ? { journeySessionId } : {}),
            },
            subscription_data: {
                metadata: {
                    product: 'hotel-go-live',
                    hotelId,
                    billingInterval,
                    billingAmountUsd: String(amountUsd),
                    ...(meta.fbp ? { metaFbp: meta.fbp } : {}),
                    ...(meta.fbc ? { metaFbc: meta.fbc } : {}),
                    ...(meta.sourceUrl ? { metaSourceUrl: meta.sourceUrl } : {}),
                    ...(journeyExternalId ? { journeyVisitorId: journeyExternalId } : {}),
                    ...(journeySessionId ? { journeySessionId } : {}),
                },
            },
            success_url: `${baseUrl}/api/crm/go-live-success?session_id={CHECKOUT_SESSION_ID}&frontdeskOrigin=${encodeURIComponent(frontdeskOrigin)}`,
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
                userAgent: req.headers['user-agent'] || null,
                ipAddress: req.ip || req.socket?.remoteAddress || null,
                metadata: {
                    source: 'activation-cta',
                    provider: 'stripe',
                    billingInterval,
                    metaAttribution: { fbp: meta.fbp, fbc: meta.fbc, sourceUrl: meta.sourceUrl },
                },
            },
        }).catch(() => {});
        await prisma.hotelConfig.update({
            where: { id: hotelId },
            data: {
                checkoutStartedAt: new Date(),
            },
        }).catch(() => {});
        await queueMarketelCAPI('InitiateCheckout', {
            hotelId,
            email: hotel.ownerEmail || '',
            phone: hotel.ownerPhone || '',
            externalId: hotelId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            sourceUrl: meta.sourceUrl,
            fbp: meta.fbp,
            fbc: meta.fbc,
            value: amountUsd,
            currency: 'USD',
            eventId: checkoutEventId,
            contentName: billing.contentName,
        }).catch((error) => console.error('InitiateCheckout CAPI queue failed:', error.message));
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
            const authFragment = new URLSearchParams({
                returnToken: frontdeskReturnToken,
                pin: frontdeskActivationPin || frontdeskReturnToken,
            });
            const target = `${frontdeskOrigin}/frontdesk-return?${params.toString()}#${authFragment.toString()}`;
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
            const authFragment = new URLSearchParams({ pin: frontdeskActivationPin });
            const target = `${frontdeskOrigin}/frontdesk-return?${params.toString()}#${authFragment.toString()}`;
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
        const hotelId = resolveScopedHotelId(req);
        if (!hotelId) { res.status(403).json({ success: false, message: 'Missing authorized property context.' }); return; }
        const thread = await loadOwnerSupportThread(hotelId);
        res.json({ success: true, thread: serializeSupportThread(thread, 'owner') });
    } catch (e) {
        console.error('crm:support:get error:', e.message);
        res.status(500).json({ success: false, message: 'Could not load your support conversation.' });
    }
});

app.post('/api/crm/support/read', crmAuth, async (req, res) => {
    try {
        const hotelId = resolveScopedHotelId(req);
        if (!hotelId) { res.status(403).json({ success: false, message: 'Missing authorized property context.' }); return; }
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
        const hotelId = resolveScopedHotelId(req);
        if (!hotelId) { res.status(403).json({ success: false, message: 'Missing authorized property context.' }); return; }
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
        void sendAdminPush('SupportMessage', { property: hotel.name || hotel.ownerEmail || hotelId });
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

        // Owners were only told by email that support had answered, so a reply
        // landed in an inbox while Front Desk sat silent — the reverse of the
        // owner's own message, which alerts us immediately.
        if (existing.hotel?.id) {
            void sendPushToHotel(existing.hotel.id, {
                title: 'Marketel replied',
                body: message.length > 140 ? `${message.slice(0, 137)}…` : message,
                url: '/frontdesk?support=1',
                icon: '/apple-touch-icon.png',
                tag: `support-reply-${threadId}`,
                renotify: true,
                data: { type: 'support_reply', threadId },
            }, { TTL: 24 * 60 * 60, urgency: 'high' }, 'support-reply').catch(() => {});
        }

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

// Deleting a business account is owner-only: a shared front-desk PIN must never
// be able to destroy the property. The one exception is the synthetic App Review
// property, whose reviewers sign in with property ID and PIN as our review notes
// instruct — without this they reach a dead end on a flow Apple requires them to
// verify. 'app_review' is written only by seed-app-review-property.js and read
// nowhere else, so no real customer can take this path. The seven-day recovery
// window means a reviewer who does delete it can be undone rather than locking
// out the next reviewer.
function isAppReviewDemoProperty(hotel) {
    return String(hotel?.marketelSubscriptionStatus || '').trim().toLowerCase() === 'app_review';
}

function hasAccountOwnerSession(req, hotel) {
    if (isAppReviewDemoProperty(hotel)) return true;
    const sessionEmail = String(req.crmNativeEmail || '').trim().toLowerCase();
    const ownerEmail = String(hotel?.ownerEmail || '').trim().toLowerCase();
    return !!(req.crmIsNativeSession && sessionEmail && ownerEmail && sessionEmail === ownerEmail);
}

function requireNativeOwnerSession(req, res, hotel) {
    if (!hasAccountOwnerSession(req, hotel)) {
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
    if (hotel.marketelStripeSubscriptionId) {
        subscriptionIds.add(hotel.marketelStripeSubscriptionId);
    } else if (hotel.marketelStripeCustomerId) {
        const subscriptions = await marketelStripe.subscriptions.list({
            customer: hotel.marketelStripeCustomerId,
            status: 'all',
            limit: 100,
        });
        subscriptions.data
            .filter(subscription => (
                subscription.status !== 'canceled'
                && String(subscription.metadata?.hotelId || '') === String(hotel.id || '')
            ))
            .forEach(subscription => subscriptionIds.add(subscription.id));
    }

    for (const subscriptionId of subscriptionIds) {
        await cancelStripeSubscriptionForDeletion(subscriptionId);
    }
}

async function releaseStripeHoldsForDeletion(bookings = []) {
    if (!stripe) throw new Error('Stripe is unavailable; guest card holds could not be released.');
    const intentIds = [...new Set(
        bookings
            .filter(booking => booking.holdStatus === 'active')
            .map(booking => String(booking.stripePaymentIntentId || '').trim())
            .filter(Boolean)
    )];
    for (const paymentIntentId of intentIds) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'requires_capture') {
            await stripe.paymentIntents.cancel(paymentIntentId);
        }
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
            guestelWalletImageUrl: true,
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
        const activeHoldBookings = await prisma.booking.findMany({
            where: { hotelId: hotel.id, holdStatus: 'active' },
            select: { stripePaymentIntentId: true, holdStatus: true },
        });
        await releaseStripeHoldsForDeletion(activeHoldBookings);

        const mediaUrls = [
            hotel.appIconUrl,
            hotel.guestelWalletImageUrl,
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
            select: { ownerEmail: true, marketelSubscriptionStatus: true },
        });
        if (!hotel) return res.status(404).json({ success: false, message: 'Property not found.' });
        const request = await prisma.accountDeletionRequest.findUnique({ where: { hotelId } });
        res.json({
            success: true,
            ownerSession: hasAccountOwnerSession(req, hotel),
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
                marketelSubscriptionStatus: true,
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
            select: { ownerEmail: true, marketelSubscriptionStatus: true },
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

        // The owner's real OTA commission %, so "fees avoided" is their number.
        const rateRow = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { otaCommissionRate: true },
        });
        const otaRate = Number(rateRow?.otaCommissionRate);
        const otaCommissionRate = Number.isFinite(otaRate) && otaRate > 0 ? otaRate : 0.15;

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
                otaCommissionRate,
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

function guestelWalletSubtitle(value) {
    return String(value == null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 64);
}

async function deleteGuestelWalletUpload(url, hotelId) {
    const clean = String(url || '').trim();
    if (!clean || !clean.includes('guestel-wallet-')) return;
    if (R2_PUBLIC_URL) {
        const key = r2ObjectKeyFromPublicUrl(clean);
        if (key && key.startsWith(`${hotelId}/`)) {
            await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(() => {});
        }
        return;
    }
    if (!clean.startsWith(`/uploads/${hotelId}/`)) return;
    const uploadsRoot = path.resolve(__dirname, 'public', 'uploads');
    const target = path.resolve(__dirname, 'public', clean.replace(/^\//, ''));
    if (target.startsWith(`${uploadsRoot}${path.sep}`)) {
        try { fs.unlinkSync(target); } catch (_) { /* already gone */ }
    }
}

// A wide cover is separate from the square notification/logo image. The same
// server-owned fields feed the Front Desk preview and Guestel's SwiftUI wallet,
// so the owner never edits a mock that disagrees with the guest experience.
app.post('/api/crm/guestel-wallet-card', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const subtitle = guestelWalletSubtitle(req.body?.subtitle);
        const hotel = await prisma.hotelConfig.update({
            where: { id: hotelId },
            data: { guestelWalletSubtitle: subtitle || null },
            select: { guestelWalletImageUrl: true, guestelWalletSubtitle: true, address: true },
        });
        hotelConfigCache.delete(hotelId);
        res.json({
            success: true,
            subtitle: hotel.guestelWalletSubtitle || '',
            fallbackSubtitle: hotel.address || '',
            imageUrl: absolutePublicAssetUrl(req, hotel.guestelWalletImageUrl),
        });
    } catch (e) {
        console.error('CRM Guestel wallet card save error:', e.message);
        res.status(500).json({ success: false, message: 'Could not save the Guestel card.' });
    }
});

app.post('/api/crm/guestel-wallet-image', crmAuth, (req, res, next) => {
    req.hotelId = req.crmDefaultHotelId || req.crmResolvedHotelId || 'unknown';
    next();
}, upload.single('image'), async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        if (!req.file) return res.status(400).json({ success: false, message: 'Choose a JPG, PNG, or WebP image.' });
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(req.file.mimetype || '').toLowerCase())) {
            if (req.file.path) {
                try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
            }
            return res.status(415).json({ success: false, message: 'Guestel covers must be JPG, PNG, or WebP.' });
        }
        let inputBuffer = req.file.buffer;
        if (!inputBuffer && req.file.path) {
            inputBuffer = fs.readFileSync(req.file.path);
            try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
        }
        if (!inputBuffer) return res.status(400).json({ success: false, message: 'Could not read that image.' });

        const optimized = await sharp(inputBuffer)
            .rotate()
            .resize(1600, 1000, { fit: 'cover', position: 'attention', withoutEnlargement: true })
            .webp({ quality: 84, effort: 4 })
            .toBuffer();
        let url;
        const filename = `guestel-wallet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
        if (R2_PUBLIC_URL) {
            url = await uploadToR2(optimized, `${hotelId}/${filename}`, 'image/webp');
        } else {
            const dir = path.join(__dirname, 'public', 'uploads', hotelId);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, filename), optimized);
            url = `/uploads/${hotelId}/${filename}`;
        }

        const prior = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { guestelWalletImageUrl: true },
        });
        await prisma.hotelConfig.update({
            where: { id: hotelId },
            data: { guestelWalletImageUrl: url },
        });
        hotelConfigCache.delete(hotelId);
        await deleteGuestelWalletUpload(prior?.guestelWalletImageUrl, hotelId);
        res.json({ success: true, imageUrl: absolutePublicAssetUrl(req, url) });
    } catch (e) {
        console.error('CRM Guestel wallet image upload error:', e.message);
        res.status(500).json({ success: false, message: 'Could not update the Guestel cover.' });
    }
});

app.delete('/api/crm/guestel-wallet-image', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: hotelId },
            select: { guestelWalletImageUrl: true },
        });
        await prisma.hotelConfig.update({
            where: { id: hotelId },
            data: { guestelWalletImageUrl: null },
        });
        hotelConfigCache.delete(hotelId);
        await deleteGuestelWalletUpload(hotel?.guestelWalletImageUrl, hotelId);
        res.json({ success: true });
    } catch (e) {
        console.error('CRM Guestel wallet image reset error:', e.message);
        res.status(500).json({ success: false, message: 'Could not reset the Guestel cover.' });
    }
});

// Update rates
app.post('/api/crm/rates', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const { nightly, weekly, monthly, taxRate } = req.body;
        const parsedNightly = Number(nightly);
        const safeNightly = Number.isFinite(parsedNightly) && parsedNightly > 0 ? parsedNightly : 69;
        const parsedWeekly = Number(weekly);
        const safeWeekly = Number.isFinite(parsedWeekly) && parsedWeekly > 0 ? parsedWeekly : safeNightly * 7;
        const parsedMonthly = Number(monthly);
        const safeMonthly = Number.isFinite(parsedMonthly) && parsedMonthly > 0 ? parsedMonthly : safeNightly * 28;
        const parsedTaxRate = Number(taxRate);
        const safeTaxRate = Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 && parsedTaxRate <= 1
            ? parsedTaxRate
            : 0;
        await prisma.hotelRates.upsert({
            where: { hotelId },
            create: { hotelId, nightly: safeNightly, weekly: safeWeekly, monthly: safeMonthly, taxRate: safeTaxRate },
            update: { nightly: safeNightly, weekly: safeWeekly, monthly: safeMonthly, taxRate: safeTaxRate },
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
    fulfillmentStatus: true,
    fulfillmentLastError: true,
    fulfillmentUpdatedAt: true,
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
// Trades any proven browser credential for a real property-scoped session.
// Setup/Stripe handoffs therefore do not die after 24 hours, and an ordinary
// PIN login no longer has to keep the reusable staff PIN in browser storage.
app.post('/api/crm/session/exchange', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        res.json({
            success: true,
            token: generateCrmSessionToken(hotelId, {
                dogfoodPreview: !!req.crmIsDogfoodPreview,
            }),
            hotelId,
            expiresInMs: CRM_SESSION_TOKEN_EXPIRY_MS,
        });
    } catch (e) {
        console.error('crm session exchange:', e.message);
        res.status(500).json({ success: false, message: 'Could not create a session.' });
    }
});

app.get('/api/crm/bootstrap', crmBootstrapRateLimit, crmAuth, async (req, res) => {
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
                    guestelWalletImageUrl: true,
                    guestelWalletSubtitle: true,
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
            guestelWalletImageUrl: dbHotel?.guestelWalletImageUrl || '',
            guestelWalletSubtitle: dbHotel?.guestelWalletSubtitle || '',
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
                    guestelWalletImageUrl: dbHotel?.guestelWalletImageUrl || '',
                    guestelWalletSubtitle: dbHotel?.guestelWalletSubtitle || '',
                    subscribed: dbHotel?.subscribed || false,
                    frontdeskAppStoreUrl: MARKETEL_FRONTDESK_APP_STORE_URL,
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
        const reservationCodes = [...new Set(rows.map((message) => message.reservationCode).filter(Boolean))];
        const threadBookings = bookingIds.length || reservationCodes.length
            ? await withRetry(() => prisma.booking.findMany({
                where: {
                    hotelId,
                    OR: [
                        ...(bookingIds.length ? [{ id: { in: bookingIds } }] : []),
                        ...(reservationCodes.length ? [
                            { ourReservationCode: { in: reservationCodes } },
                            { pmsConfirmationCode: { in: reservationCodes } },
                        ] : []),
                    ],
                },
                select: {
                    id: true,
                    ourReservationCode: true,
                    pmsConfirmationCode: true,
                    status: true,
                    checkinDate: true,
                    checkoutDate: true,
                    cancellationReason: true,
                    ownerMessagesHiddenBefore: true,
                },
            }))
            : [];
        const bookingById = new Map(threadBookings.map((booking) => [booking.id, booking]));
        const bookingByCode = new Map(threadBookings.flatMap((booking) => (
            guestBookingThreadCodes(booking).map((code) => [code, booking])
        )));
        const bookingForMessage = (message) => bookingById.get(message.bookingId)
            || bookingByCode.get(message.reservationCode);
        const visibleRows = rows.filter((message) => {
            const threadBooking = bookingForMessage(message);
            return !threadBooking?.ownerMessagesHiddenBefore
                || message.createdAt.getTime() > threadBooking.ownerMessagesHiddenBefore.getTime();
        });
        const messages = visibleRows.map((m) => {
            const threadBooking = bookingForMessage(m);
            let requests = [];
            try { requests = m.requests ? JSON.parse(m.requests) : []; } catch (_) { requests = []; }
            return {
                id: m.id,
                createdAt: m.createdAt,
                bookingId: m.bookingId,
                reservationCode: guestBookingThreadCode(threadBooking, m.reservationCode),
                bookingStatus: threadBooking?.status || '',
                checkin: threadBooking?.checkinDate || null,
                checkout: threadBooking?.checkoutDate || null,
                cancellationReason: threadBooking?.cancellationReason || '',
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

// Removing a Front Desk conversation is intentionally non-destructive. The
// reservation and message records remain available for operations/auditing;
// the owner inbox simply stops returning messages at or before this cutoff.
// A later guest message falls after the cutoff and makes the thread reappear.
app.delete('/api/crm/messages/:reservationCode/conversation', crmAuth, async (req, res) => {
    try {
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const reservationCode = String(req.params.reservationCode || '').trim();
        const booking = await findGuestBooking(hotelId, reservationCode);
        if (!booking) return res.status(404).json({ success: false, message: 'Conversation not found.' });

        const hiddenBefore = new Date();
        const threadCodes = guestBookingThreadCodes(booking, reservationCode);
        await prisma.$transaction([
            prisma.booking.update({
                where: { id: booking.id },
                data: { ownerMessagesHiddenBefore: hiddenBefore },
            }),
            prisma.guestMessage.updateMany({
                where: {
                    hotelId,
                    reservationCode: { in: threadCodes },
                    readAt: null,
                    createdAt: { lte: hiddenBefore },
                },
                data: { readAt: hiddenBefore },
            }),
        ]);
        res.json({ success: true, hiddenBefore: hiddenBefore.toISOString() });
    } catch (e) {
        console.error('CRM conversation delete error:', e.message);
        res.status(500).json({ success: false, message: 'Could not delete this conversation.' });
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
            url: `/guest/messages?stay=${encodeURIComponent(canonicalCode)}`,
            icon: `/api/hotel/${encodeURIComponent(hotelId)}/guest-app-icon.png?s=192`,
            badge: '/icon-192.png',
            tag: `guest-message-${canonicalCode}`,
            requireInteraction: false,
            data: {
                type: 'guest_message',
                hotelId,
                reservationCode: canonicalCode,
            },
        }, { TTL: 60 * 60 }, 'guestReply', threadCodes).catch((e) => {
            console.error('guest reply push error:', e.message);
        });
        if (booking?.id) {
            sendNativePushToGuestBooking(booking.id, {
                title: 'New message from Front Desk',
                body: body.trim().slice(0, 160),
                url: `guestel://messages?hotelId=${encodeURIComponent(hotelId)}&code=${encodeURIComponent(canonicalCode)}`,
                tag: `guest-message-${canonicalCode}`,
                data: {
                    type: 'guest_message',
                    hotelId,
                    reservationCode: canonicalCode,
                },
            }, { TTL: 60 * 60 }, 'frontDeskReply').catch((e) => {
                console.error('guest native reply push error:', e.message);
            });
        }

        res.json({ success: true, message: { id: reply.id, body: reply.body, sender: 'hotel', createdAt: reply.createdAt } });
    } catch (e) {
        console.error('POST /api/crm/messages/:reservationCode/reply error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send reply.' });
    }
});

// Legacy delete route: never erase a real reservation record. Route it through
// the same cancellation transaction used by the visible Front Desk action so
// inventory, the card hold, email, Guestel state and revenue history stay aligned.
app.delete('/api/crm/bookings/:id', crmAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const hotelId = requireScopedHotelId(req, res);
        if (!hotelId) return;
        const result = await cancelBookingByOwner(id, hotelId, 'Removed in Front Desk');
        if (!result.ok && result.code === 'not_found') {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({
            success: true,
            status: result.status,
            code: result.code,
            fulfillment: result.fulfillment,
        });
    } catch (e) {
        console.error('CRM legacy delete/cancel error:', e.message);
        res.status(500).json({ success: false, message: e.message || 'Cancellation failed' });
    }
});

// Mount telemetry routes (LLM-optimized session intelligence)
telemetry.setupRoutes(app);

function startServer() {
    return app.listen(PORT, () => {
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

    // Durable provider work (Stripe hold release and guest email) is separate
    // from the booking decision itself. Retrying from the database means a
    // Render restart or short provider outage cannot leave a guest uninformed.
    if (process.env.ENABLE_BOOKING_SIDE_EFFECT_SWEEP !== 'false') {
        const sideEffectSweep = () => runBookingSideEffectSweep()
            .catch((e) => console.error('Booking side-effect sweep:', e.message));
        setTimeout(sideEffectSweep, 10_000);
        setInterval(sideEffectSweep, BOOKING_SIDE_EFFECT_SWEEP_INTERVAL_MS);
    }

    // BookingCenter/Cloudbeds may accept a reservation while Neon is briefly
    // unavailable. The PMS confirmation is first written to Stripe metadata;
    // this sweep turns that durable receipt into the missing Front Desk row
    // without ever calling the PMS a second time.
    if (process.env.ENABLE_EXTERNAL_PMS_RECONCILIATION !== 'false' && process.env.STRIPE_SECRET_KEY) {
        const externalPmsSweep = () => runExternalPmsReconciliation()
            .catch((e) => console.error('External PMS reconciliation sweep:', e.message));
        setTimeout(externalPmsSweep, 60_000);
        setInterval(externalPmsSweep, 15 * 60 * 1000);
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

    // One restrained reminder after an owner leaves Stripe. This is recovery,
    // not a drip campaign: the durable sent timestamp is never reset by a new
    // checkout attempt, and a completed subscription is excluded before send.
    if (process.env.ENABLE_CHECKOUT_RECOVERY_EMAIL !== 'false') {
        const checkoutRecoverySweep = () => runCheckoutRecoverySweep()
            .catch((e) => console.error('Checkout recovery sweep:', e.message));
        setTimeout(checkoutRecoverySweep, 2 * 60 * 1000);
        setInterval(checkoutRecoverySweep, 15 * 60 * 1000);
    }

    // CAPI conversions are queued in Neon before the request completes. This
    // sweep drains anything left by a transient Meta outage or a Render restart.
    if (ENABLE_META_CAPI) {
        const capiSweep = () => runMarketelCapiDeliverySweep()
            .catch((e) => console.error('Marketel CAPI delivery sweep:', e.message));
        setTimeout(capiSweep, 12_000);
        setInterval(capiSweep, 60_000);
    }

    // Stripe requires every exact booking-page subdomain to be registered for
    // Apple Pay, Google Pay and Link. New domains are registered inline; this
    // restrained startup pass backfills older properties and repairs provider
    // outages without making activation depend on Stripe's domains API.
    if (guestStripeDomainAutomationEnabled) {
        setTimeout(() => reconcileStripePaymentMethodDomains()
            .catch((e) => console.error('Stripe wallet domain reconciliation:', e.message)), 25_000);
    }
    });
}

if (require.main === module) {
    startServer();
}

// The release-QA runner imports these exact production paths. Keeping them
// behind one explicit namespace prevents test helpers from becoming HTTP API.
module.exports = {
    app,
    startServer,
    prisma,
    releaseQa: {
        ManualInventoryUnavailableError,
        createManualBookingRecordWithInventory,
        deleteRoomCatalogEntry,
        formatApprovalStayRange,
        getManualAvailability,
        manualBookingStayDates,
        saveRoomCatalogEntry,
    },
};
