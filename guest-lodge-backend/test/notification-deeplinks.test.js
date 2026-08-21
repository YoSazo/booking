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

test('Your Page uses one disclosure pattern and shrinks once set up', () => {
    // It previously used three at once: a tab switcher for rates and PIN, a
    // real accordion for Subscription, and everything else permanently open.
    assert.match(settings, /function pageSectionHtml\(title, bodyHtml/);
    assert.doesNotMatch(settings, /page-utility-tab/);
    assert.doesNotMatch(settings, /selectPageUtility/);

    // Sections open when unfinished and closed when done, so a new property
    // gets the guided page and an established one gets a short list.
    assert.match(settings, /open: !\(hotelRes\?\.rates\?\.nightly > 0\)/);
    assert.match(settings, /open: !hotelRes\?\.cancellationPolicy/);

    // The checkout mock-up hosted exactly one field inside fifty lines of fake
    // page. The field stays; the simulation does not.
    assert.match(settings, /id="edit-hotel-policy"/);
    assert.doesNotMatch(settings, /Checkout Page Preview/);

    // The tour still targets the rates card, and the scroll-to-rates helper
    // still finds an .accordion-body whose previous sibling holds the arrow.
    assert.match(settings, /id: 'tour-rates-card'/);
    assert.match(settings, /page-section-head[\s\S]{0,400}accordion-body/);
    for (const field of ['edit-rate-nightly', 'edit-new-pin']) {
        assert.ok(settings.includes(field), `${field} was lost in the conversion`);
    }
});

test('motion is a system, not scattered one-off transitions', () => {
    const css = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'styles', 'core.css'), 'utf8');
    // One vocabulary. Bare `ease` is symmetrical and reads sluggish on a phone.
    for (const token of ['--ease-out', '--ease-sheet', '--dur-fast', '--dur-base']) {
        assert.ok(css.includes(token), `${token} is missing from the motion tokens`);
    }
    // Respecting the setting is both an accessibility requirement and the
    // cheapest signal that the motion was designed rather than sprinkled.
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /animation-duration: 0\.01ms !important/);
});

test('utility sections switch immediately instead of closing in two stages', () => {
    // Rates, PIN, and checkout-note fields can change height while open. A
    // measured-height transition then lands once for its old measurement and
    // again when display settles. These disclosures deliberately snap.
    assert.doesNotMatch(settings, /const target = body\.scrollHeight;/);
    assert.doesNotMatch(settings, /void body\.offsetHeight;/);
    assert.match(settings, /if \(body\._sectionTimer\) \{/);
    assert.ok(settings.includes("body.style.display = opening ? 'block' : 'none';"),
        'the disclosure must switch in one paint');
    assert.match(settings, /body\.classList\.remove\('is-animating', 'is-opening', 'is-collapsed'\)/);
});

test('deleting a photo animates the photo out, and puts it back on failure', () => {
    assert.match(settings, /data-thumb-id="\$\{esc\(img\.id\)\}"/);
    assert.match(settings, /thumb\.classList\.add\('marketel-removing'\)/);
    // The animation promises a deletion. If the request fails, undo the promise.
    assert.match(settings, /catch \(e\) \{[\s\S]{0,320}thumb\.classList\.remove\('marketel-removing'\)/);
});

test('the Assistant pill is native, and the web only says what it should read', () => {
    const appDelegate = fs.readFileSync(
        path.join(root, '..', 'marketel-frontdesk-ios', 'ios', 'App', 'App', 'AppDelegate.swift'),
        'utf8'
    );
    const css = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'styles', 'core.css'), 'utf8');

    // UIGlassEffect samples the real screen and does its own specular and edge
    // work. A CSS backdrop-filter inside the web view cannot see past the web
    // view, so it could never be the same material as the tab bar beside it.
    assert.match(appDelegate, /private let assistantPill = UIVisualEffectView\(\)/);
    assert.match(appDelegate, /UIGlassEffect\(style: \.regular\)[\s\S]{0,400}assistantPill\.effect = glass/);
    assert.match(appDelegate, /assistantPillButton\.addTarget\(self, action: #selector\(openAssistantFromPill\)/);
    assert.match(appDelegate, /sendWebAction\("assistant"\)/);

    // Never fade a UIVisualEffectView through partial alpha: it forces an
    // offscreen render and flashes an empty white material. The rest of the
    // shell already learned this.
    assert.doesNotMatch(appDelegate, /assistantPill\.alpha/);
    assert.match(appDelegate, /assistantPill\.isHidden/);

    // Exactly one implementation. A CSS pill would only ever render in a
    // browser tab and would drift from the native one.
    assert.doesNotMatch(css, /\.fda-pill/);
    assert.doesNotMatch(assistant, /fda-pill/);

    // The web decides the wording and whether it belongs on screen; both ride
    // the state message that already reports the selected tab.
    assert.match(core, /assistantPill: crm\.currentFilter === 'bookings'/);
    assert.match(core, /assistantPillLabel: window\.marketelAssistantPillLabel/);
    assert.match(appDelegate, /payload\["assistantPill"\] as\? Bool/);
});

test('the pill label is known before the Assistant data arrives', () => {
    // Treating "not loaded" as "not configured" made a set-up property show
    // "Set up Front Desk" and correct itself seconds later.
    assert.match(assistant, /function rememberedAssistantConfigured\(\)/);
    assert.match(assistant, /: rememberedAssistantConfigured\(\)/);
    assert.match(assistant, /if \(data\) rememberAssistantConfigured\(configured\);/);
    // Scoped per property, or switching properties inherits the wrong answer.
    assert.match(assistant, /ASSISTANT_CONFIGURED_KEY \+ ':' \+ \(crm\.activeHotelId/);
    // Pushed immediately rather than waiting for the next tick, so the label is
    // right on the frame the tab appears.
    assert.match(assistant, /window\.syncNativeShellState\?\.\(\)/);
});
test('closing a section has no leftover staged-motion classes', () => {
    const css = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'styles', 'core.css'), 'utf8');
    assert.doesNotMatch(css, /\.accordion-body\.is-opening > \* \{/);
    assert.doesNotMatch(css, /\.accordion-body\.is-animating/);
    assert.doesNotMatch(settings, /body\.classList\.add\('is-collapsed'/);
});

test('the native pill survives a fast tab switch', () => {
    const appDelegate = fs.readFileSync(
        path.join(root, '..', 'marketel-frontdesk-ios', 'ios', 'App', 'App', 'AppDelegate.swift'),
        'utf8'
    );
    // Switching tabs quickly starts a second animation before the first
    // finishes. Deciding from the captured value hid a pill that had since been
    // asked to show again, and it stayed gone until the owner navigated away
    // and back slowly.
    assert.match(appDelegate, /completion: \{ finished in/);
    assert.match(appDelegate, /guard finished, !self\.assistantPillVisible else \{ return \}/);
    assert.doesNotMatch(appDelegate, /completion: \{ _ in\s*\n\s*if !visible \{/);
});

test('content that arrives after the page does not pop in', () => {
    // Room cards and guest messages both land after their own fetch, so they
    // replaced a loading row rather than arriving with the page.
    assert.match(settings, /window\.applyRiseStagger\?\.\(cards\);/);
    assert.match(core, /window\.applyRiseStagger\?\.\(panel\);/);
    // Both must sit after the innerHTML assignment completes, not inside the
    // template literal that builds it.
    const roomsAt = settings.indexOf('window.applyRiseStagger?.(cards);');
    assert.ok(settings.lastIndexOf("}).join('');", roomsAt) > 0,
        'the room-card stagger runs before the markup is committed');
});
