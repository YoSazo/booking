const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const reveal = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'reveal.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'funnel.html'), 'utf8');

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
        ['PreviewReadyEmailSent', /eventName: 'PreviewReadyEmailSent'[\s\S]{0,200}if \(!existingEmail\)/],
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
