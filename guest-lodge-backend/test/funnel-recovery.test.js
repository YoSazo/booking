const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'landing.html'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'setup.html'), 'utf8');
const core = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'core.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');

function route(startMarker, endMarker) {
    const start = server.indexOf(startMarker);
    assert.notEqual(start, -1, `${startMarker} is missing`);
    const end = server.indexOf(endMarker, start);
    assert.notEqual(end, -1, `${endMarker} is missing after ${startMarker}`);
    return server.slice(start, end);
}

test('setup start resumes instead of creating duplicate properties', () => {
    const start = route("app.post('/api/setup/start'", "// Serve setup wizard");
    assert.match(start, /findMany\([\s\S]*ownerEmail/);
    assert.match(start, /verifySetupOwnerCookie/);
    assert.match(start, /if \(existingHotels\.length\)/);
    assert.match(start, /setupUrl: `\/setup\/\$\{browserHotel\.setupToken\}/);
    assert.match(start, /resumeEmailSent: sent/);
    assert.ok(
        start.indexOf('if (existingHotels.length)') < start.indexOf('prisma.hotelConfig.create'),
        'a duplicate can be created before existing properties are handled'
    );
});

test('a fresh setup receives an automatic recovery email', () => {
    const start = route("app.post('/api/setup/start'", "// Serve setup wizard");
    assert.match(start, /sendSetupResumeEmail\(/);
    assert.match(start, /setupResumeEmailSentAt: new Date\(\)/);
    assert.match(start, /eventName: 'SetupResumeEmailSent'/);
    assert.match(fs.readFileSync(path.join(root, 'email-templates', 'setup-resume.html'), 'utf8'), /Continue my setup/);
});

test('completed setup sends preview recovery before the CTA is clicked', () => {
    const complete = route("app.post('/api/setup/:token/complete'", "// Polled by setup.html");
    assert.match(complete, /sendPreviewReadyEmailOnce\(hotel\.id, req\)/);
    assert.match(server, /PreviewReadyEmailSending/);
    assert.match(server, /PreviewReadyEmailSent/);
});

test('email login creates a scoped session without mutating staff PINs', () => {
    const verify = route("app.get('/api/auth/verify-magic'", "// Change PIN");
    assert.match(verify, /normalizeOwnerEmail\(hotel\.ownerEmail\)/);
    assert.match(verify, /token: generateCrmSessionToken\(hotel\.id\)/);
    assert.doesNotMatch(verify, /crmPin\.(create|update|updateMany|delete)/);
    assert.match(core, /hotelId: crm\.activeHotelId \|\| ''/);
    assert.match(core, /Opening your saved Marketel/);
});

test('the exact setup and reveal stages are durable', () => {
    for (const field of ['setupProgressStep', 'revealProgressStep', 'checkoutStartedAt', 'checkoutRecoveryEmailSentAt']) {
        assert.match(schema, new RegExp(`\\b${field}\\b`));
    }
    assert.match(setup, /data\.resumeStep/);
    assert.match(core, /\^step-\(\[0-2\]\)\$/);
    assert.match(server, /const revealDepth = revealStepByEvent\[eventName\]/);
    assert.match(server, /revealProgressStep: \{ lt: revealDepth \}/);
    assert.match(server, /data: \{ revealProgressStep: revealStepByEvent\[eventName\] \}/);
});

test('landing recovery is a visible success state, not a generic error', () => {
    assert.match(landing, /if \(data\.existing\)/);
    assert.match(landing, /Your work is saved/);
    assert.match(landing, /Send the link again/);
    assert.doesNotMatch(landing, /alert\('Something went wrong\. Try again\.'\)/);
});

test('checkout abandonment gets one durable, subscription-aware recovery', () => {
    assert.match(server, /async function runCheckoutRecoverySweep\(\)/);
    assert.match(server, /subscribed: false[\s\S]{0,250}checkoutRecoveryEmailSentAt: null/);
    assert.match(server, /checkoutRecoveryEmailSentAt: claimedAt/);
    assert.match(server, /template: 'checkout-recovery\.html'/);
    assert.match(server, /ENABLE_CHECKOUT_RECOVERY_EMAIL/);
    const goLive = route("app.post('/api/crm/go-live'", "// Go Live success");
    assert.doesNotMatch(goLive, /checkoutRecoveryEmailSentAt: null/, 'opening checkout again must not create an email drip');
});
