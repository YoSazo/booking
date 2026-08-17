const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'core.js'), 'utf8');
const assistant = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'assistant.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'settings.js'), 'utf8');

// A notification that opens the app but not the thing it is about is worse than
// no notification: the owner taps, lands on whatever tab was already there, and
// concludes the alert was noise. Support replies did exactly that — the server
// sent /frontdesk?support=1 and nothing on the client read the parameter.
test('every Front Desk deep link a notification sends is handled by the client', () => {
    // Deliberately not start_url: that is the PWA manifest's launch URL, used
    // for install attribution, and nothing is expected to route on it.
    const sent = new Set();
    for (const match of server.matchAll(/(?<!start_)url: ['`]\/frontdesk\?([a-zA-Z]+)=/g)) sent.add(match[1]);
    assert.ok(sent.size >= 3, `expected several frontdesk deep links, saw ${[...sent].join(', ')}`);

    // A plain substring beats a regex here: escaping a template literal
    // through a heredoc silently ate the backslashes and matched nothing.
    const unhandled = [...sent].filter((param) => !core.includes("get('" + param + "')"));
    assert.deepEqual(unhandled, [], `deep-link params nothing reads: ${unhandled.join(', ')}`);
});

test('the support deep link opens the conversation rather than just the app', () => {
    assert.match(server, /url: '\/frontdesk\?support=1'/);
    // Reading the parameter is not enough — it has to reach the module that
    // renders the thread.
    const handler = core.slice(core.indexOf("urlParams.get('support')"));
    assert.match(handler.slice(0, 700), /loadSupportModule\(\)[\s\S]{0,120}openSupportConversation\(\)/);
    // And clear itself, so a refresh does not reopen it forever.
    assert.match(handler.slice(0, 400), /searchParams\.delete\('support'\)/);
});

test('booking decisions show they were received before the reload lands', () => {
    // The POST plus three reloads take seconds; with no pending state the tap
    // reads as missed and gets pressed again.
    assert.match(core, /function setBookingDecisionPending\(bookingId, action\)/);
    const at = core.indexOf('async function decideBookingFromCard');
    const decide = core.slice(at, at + 1400);
    assert.match(decide, /const restoreButtons = setBookingDecisionPending\(bookingId, action\);/);
    // Both buttons lock, so the same decision cannot be sent twice in flight.
    assert.match(core, /button\.disabled = true;/);
    // Failure must hand the card back, or the owner stares at "Keeping…".
    assert.match(decide, /catch \(error\) \{\s*\n\s*restoreButtons\(\);/);
});

test('the Assistant modal retires its own tutorial', () => {
    // The story teaches what texting your Front Desk means. Rendering it
    // unconditionally meant every configured owner scrolled a fixed demo
    // conversation to reach their settings, forever.
    assert.match(assistant, /const hasConfigured = !!config\.enabled && recipients\.length > 0;/);
    assert.match(assistant, /const storySection = hasConfigured/);
    // And the demo names their own room rather than an invented one.
    assert.match(assistant, /function firstRoomName\(\)/);
    assert.match(assistant, /New booking: \$\{esc\(firstRoomName\(\)\)\}/);

    // "Cannot work yet" is one message, not a stack of independent apologies.
    assert.match(assistant, /const blockers = \[\];/);
    assert.doesNotMatch(assistant, /const systemNote = capabilities\.smsConfigured/);
    assert.doesNotMatch(assistant, /const inventoryNote = capabilities\.manualAvailability/);
});

test('the Assistant has one obvious surface, not three', () => {
    // A pill above the tab bar: visible without owning a tab, and present in
    // every state rather than only once the Assistant has done something.
    assert.match(assistant, /export function renderAssistantPill\(\)/);
    assert.match(assistant, /pill\.classList\.add\('is-visible'\)/);
    assert.match(assistant, /crm\.currentFilter === 'bookings'/);

    // Wording follows state, so an unconfigured Assistant reads as an
    // invitation rather than a bare name.
    assert.match(assistant, /'Set up Front Desk Assistant'/);
    assert.match(assistant, /'Front Desk needs your review'/);

    // The two stopgaps it replaced are gone. Three doors to one feature is
    // worse than one door anybody can find.
    assert.doesNotMatch(settings, /assistantSettingsRowHtml/);
    assert.doesNotMatch(assistant, /fda-native-result is-intro/);
});

test('no emoji ships in the Front Desk interface', () => {
    // Front Desk draws its icons from a bundled lucide set. An emoji renders
    // differently on every platform and reads as a placeholder beside them.
    const dir = path.join(root, 'frontdesk', 'src');
    const offenders = [];
    for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.js')) continue;
        const text = fs.readFileSync(path.join(dir, file), 'utf8');
        text.split(/\r?\n/).forEach((line, index) => {
            if (/\p{Extended_Pictographic}/u.test(line)) offenders.push(`${file}:${index + 1}`);
        });
    }
    assert.deepEqual(offenders, [], `emoji found: ${offenders.join(', ')}`);
});
