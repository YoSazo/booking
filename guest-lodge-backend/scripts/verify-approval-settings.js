require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Verifies the owner-facing side of the approval feature: the settings endpoint
// and its "no devices, no toggle" guard, the derived growth-checklist tick, and
// the Front Desk install stamp. Mints a Front Desk return token offline rather
// than touching any hotel's PIN.
//
//   node scripts/verify-approval-settings.js <hotelId> [baseUrl]

const prisma = new PrismaClient();
const HOTEL_ID = (process.argv[2] || '').trim();
const BASE = (process.argv[3] || 'http://localhost:3001').replace(/\/$/, '');

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

async function main() {
    if (!HOTEL_ID) {
        console.error('Usage: node scripts/verify-approval-settings.js <hotelId> [baseUrl]');
        process.exit(1);
    }
    const hotel = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: {
            id: true,
            name: true,
            pms: true,
            setupToken: true,
            bookingApprovalEnabled: true,
            bookingApprovalNoResponseAction: true,
            frontdeskInstalledAt: true,
        },
    });
    if (!hotel) { console.error(`No hotel ${HOTEL_ID}`); process.exit(1); }
    if (!hotel.setupToken) { console.error('Hotel has no setupToken; cannot mint a return token.'); process.exit(1); }

    // Snapshot so we can restore whatever the hotel looked like before.
    const original = {
        bookingApprovalEnabled: hotel.bookingApprovalEnabled,
        bookingApprovalNoResponseAction: hotel.bookingApprovalNoResponseAction,
        frontdeskInstalledAt: hotel.frontdeskInstalledAt,
    };
    const token = mintReturnToken(HOTEL_ID, hotel.setupToken);
    // Mirrors the browser client, which always attaches hotelId to both the query
    // string and the JSON body.
    const call = async (method, path, body) => {
        const sep = path.includes('?') ? '&' : '?';
        const res = await fetch(`${BASE}${path}${sep}hotelId=${encodeURIComponent(HOTEL_ID)}`, {
            method,
            headers: { 'Content-Type': 'application/json', 'x-crm-token': token },
            body: method === 'GET' ? undefined : JSON.stringify({ hotelId: HOTEL_ID, ...(body || {}) }),
        });
        return { httpStatus: res.status, body: await res.json().catch(() => ({})) };
    };

    console.log(`\nHotel: ${hotel.name} (${hotel.id})  pms=${hotel.pms}\n`);

    console.log('Auth');
    const noAuth = await fetch(`${BASE}/api/crm/booking-approval`);
    check('endpoint requires a CRM token', noAuth.status === 401, `saw ${noAuth.status}`);
    const authed = await call('GET', '/api/crm/booking-approval');
    check('minted return token is accepted', authed.httpStatus === 200, JSON.stringify(authed.body).slice(0, 200));

    const [webDevices, nativeDevices] = await Promise.all([
        prisma.pushSubscription.count({ where: { hotelId: HOTEL_ID, NOT: { source: 'guest' } } }),
        prisma.nativePushDevice.count({ where: { hotelId: HOTEL_ID, active: true } }),
    ]);
    const devicesBefore = webDevices + nativeDevices;
    const reachableChannels = Number(authed.body.data.reachableChannels || 0);
    console.log(`\nSettings (owner app devices: ${devicesBefore}; reachable app/text channels: ${reachableChannels})`);
    check('reports manual-PMS support correctly',
        authed.body.data.supported === (String(hotel.pms).toLowerCase() === 'manual'),
        `saw supported=${authed.body.data.supported}`);
    check('device count matches the database', authed.body.data.devices === devicesBefore,
        `saw ${authed.body.data.devices}`);
    check('exposes a missed-review count', typeof authed.body.data.missedReviews === 'number');
    check('exposes the no-answer rule', ['confirm', 'release'].includes(authed.body.data.noResponseAction));

    console.log('\nNo-answer policy');
    const releaseRule = await call('POST', '/api/crm/booking-approval', { noResponseAction: 'release' });
    check('release rule is accepted', releaseRule.httpStatus === 200, JSON.stringify(releaseRule.body));
    const savedRule = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: { bookingApprovalNoResponseAction: true },
    });
    check('release rule is persisted', savedRule.bookingApprovalNoResponseAction === 'release');
    const invalidRule = await call('POST', '/api/crm/booking-approval', { noResponseAction: 'guess' });
    check('invalid rule is rejected', invalidRule.httpStatus === 400, JSON.stringify(invalidRule.body));

    if (reachableChannels === 0) {
        const refused = await call('POST', '/api/crm/booking-approval', { enabled: true });
        check('refuses to enable with no reachable device', refused.httpStatus === 400,
            `saw ${refused.httpStatus} ${JSON.stringify(refused.body)}`);
        const still = await prisma.hotelConfig.findUnique({ where: { id: HOTEL_ID }, select: { bookingApprovalEnabled: true } });
        check('refusal left the setting untouched', still.bookingApprovalEnabled === original.bookingApprovalEnabled);
    } else {
        const on = await call('POST', '/api/crm/booking-approval', { enabled: true });
        check('enables when a device can be reached', on.httpStatus === 200, JSON.stringify(on.body));
        const afterOn = await prisma.hotelConfig.findUnique({ where: { id: HOTEL_ID }, select: { bookingApprovalEnabled: true } });
        check('setting persisted as enabled', afterOn.bookingApprovalEnabled === true);
        const off = await call('POST', '/api/crm/booking-approval', { enabled: false });
        check('disables again', off.httpStatus === 200 && (await prisma.hotelConfig.findUnique({
            where: { id: HOTEL_ID }, select: { bookingApprovalEnabled: true },
        })).bookingApprovalEnabled === false);
    }

    console.log('\nWindow clamping');
    const clamped = await call('POST', '/api/crm/booking-approval', { windowMinutes: 9999 });
    check('absurd window is clamped, not stored', clamped.body?.data?.bookingApprovalWindowMinutes === 180,
        JSON.stringify(clamped.body));
    const tiny = await call('POST', '/api/crm/booking-approval', { windowMinutes: 0 });
    check('zero window is clamped up to the floor', tiny.body?.data?.bookingApprovalWindowMinutes === 1,
        JSON.stringify(tiny.body));
    await call('POST', '/api/crm/booking-approval', { windowMinutes: 20 });

    console.log('\nDerived growth checklist');
    const checklist = await call('GET', '/api/crm/growth-checklist');
    const alerts = checklist.body?.checklist?.frontdeskAlerts;
    check('frontdeskAlerts item is present', !!alerts, JSON.stringify(checklist.body).slice(0, 200));
    check('frontdeskAlerts is marked derived', alerts?.derived === true);
    check('frontdeskAlerts tick follows real device count', alerts?.done === (devicesBefore > 0),
        `done=${alerts?.done} devices=${devicesBefore}`);
    const spoof = await call('POST', '/api/crm/growth-checklist', { key: 'frontdeskAlerts', done: true });
    check('frontdeskAlerts cannot be self-reported', spoof.httpStatus === 400, `saw ${spoof.httpStatus}`);

    console.log('\nInstall stamp');
    await prisma.hotelConfig.update({ where: { id: HOTEL_ID }, data: { frontdeskInstalledAt: null } });
    const ev1 = await call('POST', '/api/crm/frontdesk-install-event', { installed: true });
    check('install event accepted', ev1.body?.success === true);
    const stamped = await prisma.hotelConfig.findUnique({ where: { id: HOTEL_ID }, select: { frontdeskInstalledAt: true } });
    check('frontdeskInstalledAt gets stamped', !!stamped.frontdeskInstalledAt);
    const firstStamp = stamped.frontdeskInstalledAt.getTime();
    await new Promise((r) => setTimeout(r, 1100));
    await call('POST', '/api/crm/frontdesk-install-event', { installed: true });
    const restamped = await prisma.hotelConfig.findUnique({ where: { id: HOTEL_ID }, select: { frontdeskInstalledAt: true } });
    check('repeat launches keep the first install date', restamped.frontdeskInstalledAt.getTime() === firstStamp);

    console.log('\nRestore');
    await prisma.hotelConfig.update({ where: { id: HOTEL_ID }, data: original });
    const restored = await prisma.hotelConfig.findUnique({
        where: { id: HOTEL_ID },
        select: { bookingApprovalEnabled: true, bookingApprovalNoResponseAction: true, frontdeskInstalledAt: true },
    });
    check('hotel settings restored',
        restored.bookingApprovalEnabled === original.bookingApprovalEnabled
        && restored.bookingApprovalNoResponseAction === original.bookingApprovalNoResponseAction
        && String(restored.frontdeskInstalledAt) === String(original.frontdeskInstalledAt));

    console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} passed, ${failed} failed\n`);
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('\nverify crashed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
