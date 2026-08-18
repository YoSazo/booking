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
    assert.match(assistant, /'Set up Front Desk'/);
    assert.match(assistant, /'Needs your review'/);

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

test('the Assistant pill knows its state before the data arrives', () => {
    // Treating "not loaded" as "not configured" made a set-up property open on
    // "Set up Front Desk Assistant" and correct itself seconds later.
    assert.match(assistant, /function rememberedAssistantConfigured\(\)/);
    assert.match(assistant, /const configured = data\s*\n?\s*\?/);
    assert.match(assistant, /: rememberedAssistantConfigured\(\)/);
    assert.match(assistant, /if \(data\) rememberAssistantConfigured\(configured\);/);
    // Scoped per property, or switching properties would inherit the answer.
    assert.match(assistant, /crm\.activeHotelId/);
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

test('sections animate open instead of snapping', () => {
    // display:none cannot be transitioned, so height has to be measured.
    assert.match(settings, /const target = body\.scrollHeight;/);
    // will-change must be released, or the layer is kept alive for nothing.
    assert.ok(settings.includes("body.style.willChange = '';"),
        'will-change is never released after the animation');
    // A forced reflow between the two writes, or they coalesce and nothing moves.
    assert.match(settings, /void body\.offsetHeight;/);
    // Re-tapping mid-flight must not measure a half-open section.
    assert.match(settings, /if \(body\._sectionTimer\) \{/);
    // Reduced motion skips the animation rather than running it at 0ms.
    assert.ok(settings.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches"),
        'toggleSection does not consult the reduced-motion setting');
    assert.ok(settings.includes("body.style.display = opening ? 'block' : 'none';"),
        'reduced motion should switch instantly rather than animate at 0ms');
});

test('deleting a photo animates the photo out, and puts it back on failure', () => {
    assert.match(settings, /data-thumb-id="\$\{esc\(img\.id\)\}"/);
    assert.match(settings, /thumb\.classList\.add\('marketel-removing'\)/);
    // The animation promises a deletion. If the request fails, undo the promise.
    assert.match(settings, /catch \(e\) \{[\s\S]{0,320}thumb\.classList\.remove\('marketel-removing'\)/);
});

test('the pill morphs into the sheet and cleans up after itself', () => {
    const css = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'styles', 'core.css'), 'utf8');
    assert.match(assistant, /function supportsViewTransitions\(\)/);
    assert.match(assistant, /function withPillMorph\(run\)/);
    assert.ok(assistant.includes("withPillMorph(() => openAssistantSheetNow())"),
        'opening does not run through the morph');
    // Closing runs it in reverse, so the sheet shrinks back into the pill.
    assert.ok(assistant.includes("sheet.style.viewTransitionName = 'fda-morph'"),
        'closing does not tag the sheet for the reverse morph');
    // A leftover name makes the NEXT transition silently skip, so both ends
    // must clear regardless of how the transition resolved.
    assert.ok(assistant.includes('transition.finished.finally('),
        'names are not cleared on a rejected or skipped transition');
    // Unsupported browsers and reduced motion fall through to a plain open.
    assert.ok(assistant.includes("typeof document.startViewTransition === 'function'"),
        'view transitions are assumed rather than feature-detected');
    assert.match(css, /::view-transition-group\(fda-morph\)/);
});

test('both floating surfaces are glass, and both degrade together', () => {
    const css = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'styles', 'core.css'), 'utf8');
    // The pill sits a few pixels above the nav. Different glass on two adjacent
    // floating controls reads as a mistake, so the material must be identical.
    const navRule = css.slice(css.indexOf('.mobile-bottom-nav {'), css.indexOf('.mobile-nav-item {'));
    const pillRule = css.slice(css.indexOf('.fda-pill {'), css.indexOf('.fda-pill.is-visible'));
    const blurOf = (rule) => (rule.match(/backdrop-filter: (blur\([^)]+\))/) || [])[1];
    assert.ok(blurOf(navRule), 'the nav bar is not glass');
    assert.equal(blurOf(pillRule), blurOf(navRule), 'pill and nav must use the same blur');
    // saturate() is a second filter pass per frame on an always-visible layer,
    // for a difference nobody sees. Two of them cost more than the animations.
    assert.doesNotMatch(navRule, /saturate\(/);
    assert.doesNotMatch(pillRule, /saturate\(/);
    // A transform on an element captured by a View Transition fights the
    // transform the transition applies, which made the morph jump.
    assert.doesNotMatch(pillRule, /transform: translateX/);
    // Translucency without blur is just a faded control, and both must degrade
    // together or the pair looks broken rather than plain.
    const fb = css.slice(css.indexOf('@supports not ((backdrop-filter'));
    assert.match(fb.slice(0, 600), /.fda-pill {/);
    assert.match(fb.slice(0, 600), /.mobile-bottom-nav {/);
});
