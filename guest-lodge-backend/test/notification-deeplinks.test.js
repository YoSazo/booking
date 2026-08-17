const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'core.js'), 'utf8');

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

    const unhandled = [...sent].filter((param) => !new RegExp(`get\\('${param}'\\)`).test(core));
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
    const decide = core.slice(
        core.indexOf('async function decideBookingFromCard'),
        core.indexOf('async function decideBookingFromCard') + 1400
    );
    assert.match(decide, /const restoreButtons = setBookingDecisionPending\(bookingId, action\);/);
    // Both buttons lock, so the same decision cannot be sent twice in flight.
    assert.match(core, /button\.disabled = true;/);
    // Failure must hand the card back, or the owner is stuck looking at "Keeping…".
    assert.match(decide, /catch \(error\) \{\s*\n\s*restoreButtons\(\);/);
});

test('the Assistant modal retires its own tutorial', () => {
    const assistant = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'assistant.js'), 'utf8');
    // The story teaches what texting your Front Desk means. Rendering it
    // unconditionally meant every configured owner scrolled a fixed demo
    // conversation to reach their settings, forever.
    assert.match(assistant, /const hasConfigured = !!config\.enabled && recipients\.length > 0;/);
    assert.match(assistant, /const storySection = hasConfigured\s*\n?\s*\?\s*''/);
    // And the demo names their own room rather than an invented one.
    assert.match(assistant, /function firstRoomName\(\)/);
    assert.match(assistant, /New booking: \$\{esc\(firstRoomName\(\)\)\}/);

    // "Cannot work yet" is one message, not a stack of independent apologies.
    assert.match(assistant, /const blockers = \[\];/);
    assert.doesNotMatch(assistant, /const systemNote = capabilities\.smsConfigured/);
    assert.doesNotMatch(assistant, /const inventoryNote = capabilities\.manualAvailability/);
});

test('Settings offers a route to the Assistant that survives lazy loading', () => {
    const settings = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'settings.js'), 'utf8');
    assert.match(settings, /function assistantSettingsRowHtml\(\)/);
    assert.match(settings, /\$\{assistantSettingsRowHtml\(\)\}/);
    // assistant.js is lazy. Calling its export directly would be undefined
    // until something else had already opened the modal, so this goes through
    // the action that loads the module first.
    assert.match(settings, /window\.marketelNativeAction\?\.\('assistant'\)/);
    assert.doesNotMatch(settings, /onclick="openFrontDeskAssistant\(\)"/);
    // And must not assert a state it cannot know before that data loads.
    assert.match(settings, /const status = !data/);
});

test('the Assistant is reachable before it has ever done anything', () => {
    const assistant = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'assistant.js'), 'utf8');
    const emptyState = assistant.slice(
        assistant.indexOf('const activity = latestMeaningfulActivity();'),
        assistant.indexOf('const attention =')
    );
    // The panel used to hide itself with no activity, leaving the unlabelled
    // overflow menu as the only route to a feature owners pay for.
    assert.match(emptyState, /fda-native-result is-intro/);
    assert.match(emptyState, /onclick="openFrontDeskAssistant\(\)"/);
    // Still quiet while loading, so it does not flash an invitation and replace
    // it with a result a moment later.
    assert.match(emptyState, /if \(crm\.assistantLoading\) \{[\s\S]{0,140}display = 'none';/);
});
