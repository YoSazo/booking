const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const reveal = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'reveal.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'settings.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'funnel.html'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'setup.html'), 'utf8');
const metaCapi = fs.readFileSync(path.join(root, 'marketel-meta-capi.js'), 'utf8');

function allowlist(startMarker) {
    const start = server.indexOf(startMarker);
    assert.notEqual(start, -1, `missing allowlist: ${startMarker}`);
    const end = server.indexOf(']);', start);
    return new Set(
        server
            .slice(start, end)
            .match(/'[A-Za-z]+'/g)
            .map((name) => name.replace(/'/g, ''))
    );
}

// The reveal was rebuilt around real screenshots played as beats and the
// server allowlists were not updated with it, so nine reveal milestones and
// four journey events were rejected as unknown for the whole first ad run.
// Nothing surfaces that failure — the client swallows the error — so the only
// way it stays fixed is a test that reads both sides.
test('every reveal event the client fires is accepted by the server', () => {
    const revealEvents = allowlist('const MARKETEL_VALUE_REVEAL_EVENTS = new Set([');

    const fired = new Set();
    for (const match of reveal.matchAll(/trackReveal\('([A-Za-z]+)'/g)) fired.add(match[1]);
    // Stage entry fires from an array indexed by step, not a literal argument.
    for (const match of reveal.matchAll(/event: '([A-Za-z]+)'/g)) fired.add(match[1]);
    const stageArray = reveal.match(/const events = \[([\s\S]*?)\];/);
    if (stageArray) {
        for (const match of stageArray[1].matchAll(/'([A-Za-z]+)'/g)) fired.add(match[1]);
    }

    assert.ok(fired.size >= 15, `expected the reveal to fire many events, saw ${fired.size}`);
    const rejected = [...fired].filter((name) => !revealEvents.has(name));
    assert.deepEqual(rejected, [], `reveal events rejected at ingest: ${rejected.join(', ')}`);
});

test('every journey event the reveal fires is accepted by the server', () => {
    const journeyEvents = allowlist('const MARKETEL_JOURNEY_EVENT_NAMES');

    const fired = new Set();
    for (const match of reveal.matchAll(/trackJourney\('([A-Za-z]+)'/g)) fired.add(match[1]);

    assert.ok(fired.size >= 10, `expected journey events, saw ${fired.size}`);
    const rejected = [...fired].filter((name) => !journeyEvents.has(name));
    assert.deepEqual(rejected, [], `journey events rejected at ingest: ${rejected.join(', ')}`);
});

test('the dashboard names every beat it charts', () => {
    // A beat that reaches the database but has no label renders as a raw event
    // name, which is how the reveal restructure went unnoticed on this screen.
    const walk = dashboard.match(/const REVEAL_WALK = \[([\s\S]*?)\];/);
    assert.ok(walk, 'REVEAL_WALK is missing from the dashboard');
    const keys = [...walk[1].matchAll(/key: '([A-Za-z]+)'/g)].map((match) => match[1]);
    assert.ok(keys.length >= 12, `expected the full reveal walk, saw ${keys.length}`);
    for (const key of keys) {
        assert.match(dashboard, new RegExp(`${key}: '`), `${key} has no label in TYPE_LABELS`);
    }
});

test('every push trigger is actually fired by the code path it names', () => {
    // A trigger defined but never called is a notification that silently never
    // arrives, which is indistinguishable from "nothing happened yet".
    const block = server.slice(
        server.indexOf('const ADMIN_PUSH_TRIGGERS = {'),
        server.indexOf('const ADMIN_PUSH_DEFAULT_EVENTS')
    );
    const triggers = [...block.matchAll(/^\s{4}([A-Za-z]+):/gm)].map((m) => m[1]);
    assert.ok(triggers.length >= 5, `expected the trigger table, saw ${triggers.length}`);
    for (const name of triggers) {
        assert.match(
            server,
            new RegExp(`sendAdminPush\\('${name}'`),
            `${name} is a push trigger that nothing ever sends`
        );
    }
    // Business paths must never block on or fail from a notification: a payment
    // succeeded whether or not the phone buzzed. The only permitted await is
    // /api/admin/push/test, where the caller is asking whether the send worked.
    const calls = server.match(/(?:void|await) sendAdminPush\(/g) || [];
    const guarded = server.match(/void sendAdminPush\(/g) || [];
    assert.equal(
        calls.length - guarded.length,
        1,
        'exactly one awaited sendAdminPush is allowed, and only in the test route'
    );
    assert.match(
        server.slice(server.indexOf("app.post('/api/admin/push/test'")),
        /^[\s\S]{0,200}await sendAdminPush\(/,
        'the awaited call is not the one in the test route'
    );
});

test('the dashboard offers exactly the triggers the server supports', () => {
    const labels = dashboard.match(/const PUSH_TRIGGER_LABELS = \{([\s\S]*?)\};/);
    assert.ok(labels, 'PUSH_TRIGGER_LABELS is missing');
    const shown = [...labels[1].matchAll(/^\s{2}([A-Za-z]+):/gm)].map((m) => m[1]);
    const block = server.slice(
        server.indexOf('const ADMIN_PUSH_TRIGGERS = {'),
        server.indexOf('const ADMIN_PUSH_DEFAULT_EVENTS')
    );
    const supported = [...block.matchAll(/^\s{4}([A-Za-z]+):/gm)].map((m) => m[1]);
    assert.deepEqual(shown.sort(), supported.sort());
});

test('Meta CAPI uses one hashed first-party external ID across the commercial funnel', () => {
    assert.match(metaCapi, /externalId/);
    assert.match(metaCapi, /userData\.external_id = \[hashMetaValue\(externalId\)\]/);

    const lead = server.slice(
        server.indexOf("if (eventName === 'Lead') {", server.indexOf('// Match the browser')),
        server.indexOf('res.json({ success: true });', server.indexOf('// Match the browser'))
    );
    assert.match(lead, /externalId: trackedHotelId/);

    const subscribeStart = server.indexOf("queueMarketelCAPI('Subscribe'");
    const subscribe = server.slice(
        subscribeStart,
        server.indexOf('await sendMarketelActivationEmailOnce', subscribeStart)
    );
    assert.match(subscribe, /externalId: hotelId/);

    const checkoutStart = server.indexOf("queueMarketelCAPI('InitiateCheckout'");
    const checkout = server.slice(
        checkoutStart,
        server.indexOf("console.log('crm:go-live checkout session created:", checkoutStart)
    );
    assert.match(checkout, /externalId: hotelId/);
});

test('Meta setup completion is a deduplicated standard CompleteRegistration event', () => {
    const completeRoute = server.slice(
        server.indexOf("app.post('/api/setup/:token/complete'"),
        server.indexOf("app.get('/api/setup/:token/site-status'")
    );
    assert.match(completeRoute, /queueMarketelCAPI\('CompleteRegistration'/);
    assert.match(completeRoute, /eventId: registrationEventId/);
    assert.match(completeRoute, /registrationEventId = `marketel-registration\.\$\{hotel\.id\}`/);
    assert.match(completeRoute, /registrationNewlyCompleted: true/);
    assert.match(completeRoute, /registrationNewlyCompleted: false/);
    assert.match(setup, /fbq\('track', 'CompleteRegistration'/);
    assert.match(setup, /eventID: completeData\.registrationEventId/);
    assert.match(setup, /completeData\.registrationNewlyCompleted/);
});

test('Lead qualification describes a current monetizable problem and is identical across ad angles', () => {
    for (const answer of ['online_ota_leakage', 'direct_calls_messages', 'repeat_guests']) {
        assert.match(setup, new RegExp(`answer === '${answer}'`), `${answer} is not qualified in setup`);
        assert.match(server, new RegExp(`'${answer}'`), `${answer} is not accepted by the server`);
    }
    assert.match(setup, /answerQualityQ\('building_demand'\)/);
    assert.doesNotMatch(
        setup.slice(setup.indexOf('function answerQualityQ'), setup.indexOf("window.MarketelJourney?.track('JourneyQualitySelected'")),
        /building_demand/,
        'building demand must remain tracked but unqualified'
    );
    const leadValidation = server.slice(
        server.indexOf("if (eventName === 'Lead')"),
        server.indexOf('// A setup can qualify only once')
    );
    assert.doesNotMatch(leadValidation, /acquisitionAngle|AcquisitionAngle/);
    assert.doesNotMatch(leadValidation, /building_demand/);
});

test('Marketel CAPI uses a configurable current Graph API version', () => {
    const helper = server.slice(
        server.indexOf('// Marketel CAPI'),
        server.indexOf('// Helper to extract fbp/fbc')
    );
    assert.match(helper, /MARKETEL_META_GRAPH_API_VERSION/);
    assert.match(helper, /process\.env\.MARKETEL_META_GRAPH_API_VERSION/);
    assert.match(helper, /'v26\.0'/);
    assert.doesNotMatch(helper, /graph\.facebook\.com\/v18\.0/);
});

test('commercial Meta events use a durable retrying server outbox', () => {
    assert.match(server, /const MARKETEL_CAPI_PENDING = 'MetaCapiPending'/);
    assert.match(server, /async function queueMarketelCAPI/);
    assert.match(server, /pg_advisory_xact_lock/);
    assert.match(server, /async function runMarketelCapiDeliverySweep/);
    assert.match(server, /setInterval\(capiSweep, 60_000\)/);
    assert.match(server, /queueMarketelCAPI\('ViewContent'/);
    assert.match(server, /queueMarketelCAPI\('InitiateCheckout'/);
    assert.match(server, /queueMarketelCAPI\('Subscribe'/);
    assert.match(server, /MARKETEL_META_TEST_EVENT_CODE/);
});

test('Stripe carries Meta attribution into the paid webhook', () => {
    const goLive = server.slice(
        server.indexOf("app.post('/api/crm/go-live'"),
        server.indexOf("app.get('/api/crm/go-live-success'")
    );
    assert.match(goLive, /metaFbp/);
    assert.match(goLive, /metaFbc/);
    assert.match(goLive, /metaSourceUrl/);
    assert.match(settings, /journey\?\.linkage\?\.\(\)/);
    assert.match(settings, /\.\.\.journeyLinkage/);
    const paid = server.slice(
        server.indexOf('async function recordMarketelPaymentSuccess'),
        server.indexOf('function invoiceSubscriptionId')
    );
    assert.match(paid, /checkoutSession\?\.metadata\?\.metaFbp/);
    assert.match(paid, /checkoutSession\?\.metadata\?\.metaFbc/);
    assert.match(paid, /queueMarketelCAPI\('Subscribe'/);
});

test('the funnel dashboard exposes sanitized Meta delivery receipts and test controls', () => {
    assert.match(server, /\/api\/admin\/meta-capi\/status/);
    assert.match(server, /\/api\/admin\/meta-capi\/test/);
    assert.match(server, /\/api\/admin\/meta-capi\/retry/);
    assert.match(dashboard, /Meta CAPI delivery/);
    assert.match(dashboard, /sendMetaCapiTest\('ViewContent'\)/);
    assert.match(dashboard, /sendMetaCapiTest\('Subscribe'\)/);
    assert.match(dashboard, /Declined cards stop at InitiateCheckout/);
});

test('QA properties and their sessions never inflate the business dashboard', () => {
    const exclusionBlock = server.slice(
        server.indexOf('const FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS'),
        server.indexOf('function normalizedMarketelAngle')
    );
    for (const hotelId of ['hotel-a39be0df', 'hotel-app-review', 'marketel-review-inn', 'hotel-9dbf11ec']) {
        assert.match(exclusionBlock, new RegExp(hotelId), `${hotelId} is not excluded`);
    }
    assert.match(exclusionBlock, /sessionId: \{ notIn: exclusions\.sessionIds \}/);
    assert.match(server, /buildMarketelFunnelAttribution\(since, until, exclusions/);
    assert.match(server, /const visibleWhere = funnelDashboardWhere\(where, exclusions\)/);
    assert.match(server, /const where = funnelDashboardWhere\(\{[\s\S]{0,180}MARKETEL_ONBOARDING_EVENT_NAMES/);
    const portfolio = server.slice(
        server.indexOf("app.get('/api/admin/portfolio'"),
        server.indexOf('// FunnelEvent is not only analytics')
    );
    assert.match(portfolio, /id: \{ notIn: FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS \}/);
    assert.match(portfolio, /hotelId: \{ notIn: FUNNEL_DASHBOARD_EXCLUDED_HOTEL_IDS \}/);
});

test('funnel dashboard attributes each ad angle and UTM through paid activation', () => {
    assert.match(server, /async function buildMarketelFunnelAttribution/);
    assert.match(server, /eventName: 'AcquisitionAngle'/);
    assert.match(server, /'PaymentSucceeded'/);
    assert.match(server, /utm_campaign/);
    assert.match(server, /utm_content/);
    assert.match(server, /startToPaidRate/);
    assert.match(dashboard, /Which ads become subscribers/);
    assert.match(dashboard, /Campaign and creative/);
    assert.match(dashboard, /row\.paid/);
    assert.match(dashboard, /row\.revenue/);
});

test('purging activity is confirmed, scoped, and never touches business records', () => {
    const purge = server.slice(
        server.indexOf("app.post('/api/admin/funnel/purge'"),
        server.indexOf("app.get('/api/admin/launch-readiness'")
    );
    assert.ok(purge, 'purge route is missing');
    assert.match(purge, /adminAuth/);
    assert.match(purge, /DELETE ALL ACTIVITY/);
    // Deleting by allowlist, never by "everything except". A bare deleteMany
    // with no eventName filter would take the protected rows with it.
    assert.match(purge, /deleteMany\(\{ where \}\)/);
    assert.match(purge, /eventName: \{ in: FUNNEL_PURGEABLE_EVENT_NAMES \}/);
    assert.doesNotMatch(purge, /prisma\.(booking|hotelConfig|supportThread|supportMessage)\.delete/);
});

test('the purge cannot delete a row that something else depends on', () => {
    // Each of these gates behaviour outside the dashboard. Losing the email
    // guards re-sends real mail to real customers, which is why the protection
    // is asserted here and not left to the comment above the set.
    const protectedRows = [
        ['ActivationEmailSent', /if \(existing\?\.eventName === 'ActivationEmailSent'\) return;/],
        ['PreviewReadyEmailSent', /eventName: \{ in: \['PreviewReadyEmailSending', 'PreviewReadyEmailSent'\] \}[\s\S]{0,300}existing\?\.eventName === 'PreviewReadyEmailSent'/],
        ['CheckoutRecoveryEmailSent', /checkoutRecoveryEmailSentAt: null[\s\S]{0,900}eventName: 'CheckoutRecoveryEmailSending'/],
        ['BlockedBookingAttempt', /eventName: 'BlockedBookingAttempt', createdAt/],
    ];
    for (const [name, usage] of protectedRows) {
        assert.match(server, usage, `${name} no longer guards what this test assumes`);
        assert.match(
            server,
            new RegExp(`FUNNEL_PURGE_PROTECTED = new Set\\(\\[[\\s\\S]*?'${name}'`),
            `${name} is load-bearing but not protected from the purge`
        );
    }
    assert.match(server, /FUNNEL_PURGEABLE_EVENT_NAMES = MARKETEL_ONBOARDING_EVENT_NAMES[\s\S]{0,120}FUNNEL_PURGE_PROTECTED\.has/);
});
