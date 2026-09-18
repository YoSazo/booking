'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { registerInspect, validateDocument, validateSignatures, validateInspectPrice, shouldIgnoreSubscription, startsNewPaidPeriod, entitlement, sanitizeInspectAttribution, mergeInspectAttribution, inspectEnvReadiness, LIMITS, hash } = require('../inspect');

const validDocument = () => ({
  propertyName: 'Oak Street · Unit 2',
  author: 'Alex Rivera',
  type: 'routine',
  date: '2026-09-15',
  rooms: [{ name: 'Living room', observation: 'Small scuff beside the doorway.', issue: true, photos: ['photo_1'] }],
});

test('Inspect document validation preserves observations without inventing fields', () => {
  assert.deepEqual(validateDocument(validDocument()), validDocument());
  assert.throws(() => validateDocument({ ...validDocument(), date: '2026-02-30' }), /valid inspection date/);
  assert.throws(() => validateDocument({ ...validDocument(), rooms: [
    { name: 'A', observation: '', photos: ['same'] },
    { name: 'B', observation: '', photos: ['same'] },
  ] }), /duplicate photo/);
  assert.equal(LIMITS.reports, 30);
  assert.equal(LIMITS.photos, 100);
});

test('Inspect signatures are bounded and cannot supply their own timestamp', () => {
  const signatures = validateSignatures([{ role: 'manager', name: 'Alex Rivera', signedAt: '2001-01-01', strokes: [[{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.8 }]] }]);
  assert.deepEqual(signatures, [{ role: 'manager', name: 'Alex Rivera', strokes: [[{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.8 }]] }]);
  assert.throws(() => validateSignatures([
    { role: 'resident', name: 'A', strokes: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]] },
    { role: 'resident', name: 'B', strokes: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]] },
  ]), /one manager and one resident/);
  assert.throws(() => validateSignatures([{ role: 'manager', name: 'A', strokes: [[{ x: -1, y: 0 }, { x: 1, y: 1 }]] }]), /Invalid signature point/);
});

test('Inspect voice notes and comparisons fail closed around evidence', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
  assert.match(source, /router\.post\('\/reports\/:id\/voice-draft'/);
  assert.match(source, /Do not infer from photos, diagnose causes, assign fault or liability/);
  assert.match(source, /Audio and transcript exist only in memory/);
  assert.match(source, /signedAt is deliberately omitted/);
  assert.match(source, /baselineReportId/);
  assert.match(schema, /onDelete: SetNull/);
  assert.match(client, /AI only organized what it heard\. Check every detail/);
  assert.match(client, /Press and hold a photo to lift it, then drag it where you want it/);
  assert.match(client, /Start move-out comparison/);
});

test('coverage can say what is missing and nothing about condition', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const route = server.slice(server.indexOf('const COVERAGE_SURFACES'), server.indexOf("router.post('/reports/:id/pdf'"));

    // Structured Outputs guarantees shape, never facts — so the shape carries
    // the guarantee. There must be no free-text field the model could put a
    // claim about the property into: rooms come back as integers, surfaces
    // from a closed enum, and the name is re-emitted from our own document.
    assert.match(route, /room: \{ type: 'integer' \}/);
    assert.match(route, /enum: COVERAGE_SURFACES/);
    assert.doesNotMatch(route.slice(route.indexOf('json_schema'), route.indexOf('const parsed')), /type: 'string' \}(?!,\s*enum)/);
    assert.match(route, /name: byIndex\.get\(row\.room\)/);
    assert.match(route, /COVERAGE_SURFACES\.includes\(surface\)/);

    // It is not a note suggestion, so it must not spend the owner's ten.
    assert.doesNotMatch(route, /claimAiUse|releaseAiUse/);
    assert.match(route, /rate\(`coverage:\$\{req\.inspect\.id\}`/);

    // Advisory: every failure path returns an empty result, never an error.
    assert.match(route, /if \(!env\.OPENAI_API_KEY\) return res\.json\(\{ rooms: \[\] \}\)/);
    assert.match(route, /catch \(error\) \{[\s\S]*?res\.json\(\{ rooms: \[\] \}\)/);

    // One call, a bounded payload, and not the 1600px rendition the PDF uses.
    assert.equal((route.match(/responses\.create/g) || []).length, 1);
    assert.match(route, /COVERAGE_PER_ROOM = 4/);
    assert.match(route, /COVERAGE_TOTAL = 24/);
    assert.match(route, /\.resize\(\{ width: 512, height: 512/);

    // The client asks for it; it never runs itself, because the check needs the
    // photos uploaded and a surprise upload on reaching preview is worse.
    assert.match(client, /id="coverage-run"/);
    assert.match(client, /reports\/\$\{draft\.serverId\}\/coverage/);
});

test('live feedback never costs the recording it is decorating', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const live = client.slice(client.indexOf('function liveMeter('), client.indexOf('async function recordRoom'));

    // The meter reads the stream already being recorded — no second microphone.
    assert.match(live, /createMediaStreamSource\(stream\)/);
    // Captions open their own, so on iOS they compete with the MediaRecorder.
    // Every failure has to be silent: the note comes from the server transcript
    // either way, and losing the audio to win a caption is a bad trade.
    assert.match(live, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
    assert.equal((live.match(/catch\s*\{\s*return\(\)=>\{\};\s*\}/g) || []).length, 2);
    assert.match(live, /if\(!Recognition\|\|!target\)return\(\)=>\{\};/);
    // Safari ends the session on a pause; it has to come back by itself.
    assert.match(live, /recognition\.onend=\(\)=>\{if\(!stopped\)/);

    // Both stop with the recorder, including when the sheet is cancelled.
    const record = client.slice(client.indexOf('async function recordRoom'), client.indexOf('function reviewVoiceNote'));
    assert.match(record, /const stopMeter=liveMeter\(stream\),stopCaptions=liveCaptions\(\);/);
    assert.match(record, /finally\{clearInterval\(tick\);stopMeter\(\);stopCaptions\(\);/);
});

test('a sheet opens without summoning the keyboard', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const modal = client.slice(client.indexOf('function modal(content'), client.indexOf('function settleSheet'));

    // Autofocus dragged the whole iOS mess in at once: keyboard up, visual
    // viewport shrunk, iOS panning it to reveal the field, and computing that
    // pan against a body pinned at -scrollY — so the sheet landed differently
    // depending on where the page happened to be scrolled.
    assert.match(modal, /\$\('dialog'\)\.focus\(\);/);
    assert.doesNotMatch(modal, /querySelector\('input/);

    // The code step keeps its focus on purpose: it has to happen inside the
    // same user gesture or iOS drops the keyboard before the field exists.
    assert.match(client, /Synchronous focus inside the same user gesture/);
});

test('Inspect sheets use one keyboard coordinate system and no visual scrim', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.css'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'index.html'), 'utf8');

    // The browser must not resize the layout viewport while our own visual-
    // viewport handler independently positions the sheet.
    assert.match(html, /interactive-widget=overlays-content/);
    assert.doesNotMatch(html, /interactive-widget=resizes-content/);

    // A modal remains blocking, but nothing behind it is blurred, tinted or dimmed.
    assert.match(css, /dialog::backdrop\s*\{[^}]*background:\s*transparent/);
    assert.match(css, /dialog::backdrop\s*\{[^}]*backdrop-filter:\s*none/);

    // The visible band owns the sheet position. Safari's pan is cancelled only
    // on the frozen page, and native keyboard height is not confused with the
    // already-resized web visual viewport.
    assert.match(client, /--sheet-top/);
    assert.match(client, /--sheet-max-height/);
    assert.match(client, /--viewport-pan/);
    assert.match(client, /--kb-native/);
    assert.doesNotMatch(client, /--sheet-shift/);
});

test('the landing demo still reads when nothing is allowed to move', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const demo = client.slice(client.indexOf('function playDemo()'), client.indexOf('function landing()'));

    // inspect.css only collapses CSS animations; a JS typing loop runs straight
    // through that, so reduced motion has to be asked about here.
    assert.match(demo, /prefers-reduced-motion: reduce/);
    assert.match(demo, /said\.textContent=DEMO_SAID;demo\.classList\.add\('is-in'\);return;/);
    // And the loop must stop when the screen is replaced under it.
    assert.match(demo, /document\.body\.contains\(said\)/);
});

test('the AI is the path, and the note is never hidden once written', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

    // Voice leads; typing is the escape hatch. If the disclosure ever renders
    // closed over an existing observation the owner's note looks deleted.
    assert.match(client, /class="wide" data-voice/);
    assert.match(client, /r\.observation\.trim\(\) \? 'open' : ''/);
    assert.match(client, /<summary>Write it myself<\/summary>/);

    // The recording event has to clear the auth boundary, because the owners it
    // exists to count are exactly the ones who have not signed in yet.
    const anon = server.slice(server.indexOf('const ANON_EVENTS'), server.indexOf('router.use((req, res, next) => {\n    const raw'));
    assert.match(anon, /ANON_EVENTS = new Set\(\['VoiceNoteRecorded'\]\)/);
    assert.match(anon, /record\(null, req\.body\.name\)/);
    assert.match(anon, /rate\(`inspect-anon-events:/);
    assert.ok(server.indexOf("router.post('/events/anon'") < server.indexOf('Please sign in to Inspect.'),
        'the anonymous event route is below the auth boundary and can never fire');

    // It is sent once a usable recording exists and before the email wall.
    const record = client.slice(client.indexOf('async function recordRoom'), client.indexOf('function reviewVoiceNote'));
    assert.ok(record.indexOf("logInspect('VoiceNoteRecorded',true)") < record.indexOf('ensureAuth(process)'),
        'the recording event fires after the auth wall, so a bail there stays invisible');

    // Name only. The voice route promises the recording never leaves memory.
    assert.match(client, /const logInspect=\(name,anonymous=false\)=>/);
    assert.match(client, /body:\{name\}/);

    // The promise must not overclaim on a document used in disputes.
    assert.doesNotMatch(client, /report writes itself/i);
    assert.match(client, /Inspect writes the notes/);
});

test('the AI path is observable, and cannot be advertised while it is off', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

    // Visible, so the product cannot pass every check while its advertised
    // workflow 503s — but never critical, because launchConfigured requires
    // every critical check and would take sign-in and export dark with it.
    const aiItem = server.slice(server.indexOf("item('inspect-ai-key'"), server.indexOf("item('inspect-stripe-price'"));
    assert.match(aiItem, /present\('OPENAI_API_KEY'\)/);
    assert.match(aiItem, /, false\),\s*$/);
    assert.doesNotMatch(aiItem, /requireWhenEnabled/);

    // Both ends of the pipeline report, so a silent failure is visible.
    assert.match(server, /recordBestEffort\(req\.inspect\.id, 'VoiceNoteDrafted'\)/);
    assert.match(server, /recordBestEffort\(req\.inspect\.id, 'VoiceNoteFailed'\)/);
    for (const name of ['VoiceNoteKept', 'VoiceNoteDiscarded']) {
        assert.match(server, new RegExp(`'${name}', null`), `${name} is not accepted from the client`);
        assert.match(client, new RegExp(name), `${name} is never sent`);
    }

    // Kept-vs-discarded is a rate, so it must not be deduped per account the
    // way the one-per-account offer view is.
    assert.match(server, /\['AdditionalReportOfferViewed', accountId => `inspect-offer:\$\{accountId\}`\]/);
    assert.match(server, /if \(!sourceId\) rate\(`inspect-events:/);

    // Closing the review sheet is an answer, not an absence.
    assert.match(client, /kept\?'VoiceNoteKept':'VoiceNoteDiscarded'/);

    // The recording and transcript still never reach an event payload.
    assert.match(server, /Neither is\n      \/\/ added to the report, logs, object storage, or an event payload/);
});

test('Inspect entitlement is separate, period-bound, and keeps the lifetime free report', () => {
  const future = new Date(Date.now() + 86400000);
  assert.deepEqual(entitlement({ subscriptionStatus: null, periodEnd: null, freeReportUsed: false, reportsUsed: 0 }), {
    active: false, freeAvailable: true, remaining: 0, periodEnd: null,
    cancellationScheduled: false, price: 29, interval: 'month', limits: LIMITS,
  });
  const paid = entitlement({ subscriptionStatus: 'active', periodEnd: future, freeReportUsed: true, reportsUsed: 7, cancelAtPeriodEnd: true });
  assert.equal(paid.active, true);
  assert.equal(paid.remaining, 23);
  assert.equal(paid.cancellationScheduled, true);
  // An annual period must carry twelve months of report allowance, or the
  // yearly plan would sell one twelfth of the monthly plan's work.
  const yearly = entitlement({ subscriptionStatus: 'active', periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2027-01-01'), freeReportUsed: true, reportsUsed: 12 });
  assert.equal(yearly.interval, 'year');
  assert.equal(yearly.price, 199);
  assert.equal(yearly.remaining, 348);
  assert.equal(yearly.limits.reports, 360);
  assert.equal(hash('session').length, 64);
});

test('Inspect billing accepts only the promised price and ignores stale subscription events', () => {
  const price = { unit_amount: 2900, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } };
  assert.equal(validateInspectPrice(price), price);
  assert.throws(() => validateInspectPrice({ ...price, unit_amount: 2999 }), /USD 29/);
  assert.throws(() => validateInspectPrice({ ...price, recurring: { interval: 'year', interval_count: 1 } }), /USD 29/);
  const yearPrice = { unit_amount: 19900, currency: 'usd', recurring: { interval: 'year', interval_count: 1 } };
  assert.equal(validateInspectPrice(yearPrice, 'year'), yearPrice);
  assert.throws(() => validateInspectPrice({ ...yearPrice, unit_amount: 19800 }, 'year'), /USD 199/);
  assert.throws(() => validateInspectPrice(price, 'year'), /USD 199/);
  assert.throws(() => validateInspectPrice(yearPrice, 'month'), /USD 29/);
  const active = { stripeSubscriptionId: 'sub_new', subscriptionStatus: 'active', periodStart: new Date('2026-09-01') };
  assert.equal(shouldIgnoreSubscription(active, { id: 'sub_old' }), true);
  assert.equal(shouldIgnoreSubscription({ ...active, subscriptionStatus: 'canceled' }, { id: 'sub_newer' }), false);
  assert.equal(startsNewPaidPeriod(active, 'active', new Date('2026-10-01')), true);
  assert.equal(startsNewPaidPeriod(active, 'active', new Date('2026-09-01')), false);
  assert.equal(startsNewPaidPeriod({ ...active, subscriptionStatus: 'past_due' }, 'active', new Date('2026-09-01')), true);
});

test('Inspect Meta attribution is bounded, server-stamped, and preserves the latest real click', () => {
  const first = sanitizeInspectAttribution({
    fbp: 'fb.1.1720000000000.123456789',
    fbc: 'fb.1.1720000000000.click_one',
    sourceUrl: 'https://bookmarketel.com/inspect/?utm_source=meta&fbclid=click_one',
    utmSource: 'meta', utmCampaign: 'inspect_launch', arbitrarySecret: 'discard me',
  }, { ip: '203.0.113.10', headers: { 'user-agent': 'Inspect Browser' } });
  assert.equal(first.fbp, 'fb.1.1720000000000.123456789');
  assert.equal(first.fbc, 'fb.1.1720000000000.click_one');
  assert.equal(first.utmCampaign, 'inspect_launch');
  assert.equal(first.ipAddress, '203.0.113.10');
  assert.equal(first.userAgent, 'Inspect Browser');
  assert.equal(first.arbitrarySecret, undefined);

  const directReturn = sanitizeInspectAttribution({ fbp: 'fb.1.1720000000001.987654321' }, {
    ip: '203.0.113.11', headers: { 'user-agent': 'Returning Browser' },
  });
  const preserved = mergeInspectAttribution(first, directReturn);
  assert.equal(preserved.fbc, first.fbc);
  assert.equal(preserved.utmCampaign, 'inspect_launch');
  assert.equal(preserved.fbp, directReturn.fbp);

  const secondClick = sanitizeInspectAttribution({
    fbp: directReturn.fbp,
    fbc: 'fb.1.1720000000002.click_two',
    sourceUrl: 'https://bookmarketel.com/inspect/?utm_campaign=inspect_refresh&fbclid=click_two',
    utmCampaign: 'inspect_refresh',
  }, { ip: '203.0.113.12', headers: { 'user-agent': 'Returning Browser' } });
  assert.equal(mergeInspectAttribution(first, secondClick).utmCampaign, 'inspect_refresh');
  assert.equal(sanitizeInspectAttribution({ fbp: 'not-meta', sourceUrl: 'javascript:alert(1)' }), null);
});

test('Inspect conversion events stay server-side, idempotent, and product-scoped', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const terms = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'terms.html'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /queueInspectCapi\('Lead'[\s\S]{0,180}inspect-lead\.\$\{req\.inspect\.id\}/);
  assert.match(source, /queueInspectCapi\('CompleteRegistration'[\s\S]{0,180}inspect-registration\.\$\{req\.inspect\.id\}/);
  // Checkout value follows the chosen plan so Meta optimises toward the
  // annual conversion rather than a flat $29.
  assert.match(source, /queueInspectCapi\('InitiateCheckout'[\s\S]{0,220}value: plan\.amount \/ 100/);
  assert.match(source, /year: Object\.freeze\(\{ interval: 'year', amount: 19900/);
  assert.match(source, /const purchasablePlans = \(\) =>/);
  assert.match(source, /queueInspectCapi\('Purchase'[\s\S]{0,260}invoice\.amount_paid/);
  assert.match(source, /eventId: `inspect-purchase\.\$\{invoice\.id\}`/);
  assert.match(source, /product: 'marketel-inspect'/);
  assert.match(server, /queueCapi: queueMarketelCAPI/);
  assert.match(server, /isCapiExcludedEmail/);
  assert.match(client, /fbclid[\s\S]{0,220}`fb\.1\.\$\{Date\.now\(\)\}\.\$\{fbclid\}`/);
  assert.match(client, /inspect\.metaAttribution\.v1/);
  assert.doesNotMatch(client, /connect\.facebook\.net|fbq\(/);
  assert.match(terms, /Conversion events are sent server-to-server to Meta/);
});

async function request(app, path, options) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    return await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('Inspect app handoff is hashed, single-use, bound to its account and short-lived', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

  // Only a digest is ever persisted: the emailed bearer cannot be recovered from
  // a database dump.
  assert.match(source, /inspectHandoff\.create\(\{ data: \{ tokenHash: hash\(raw\)/);
  assert.doesNotMatch(source, /inspectHandoff\.create\([\s\S]{0,200}token: raw/);
  assert.match(schema, /model InspectHandoff[\s\S]{0,260}tokenHash String\s+@id/);
  assert.match(schema, /onDelete: Cascade/);

  // Redemption deletes the row inside the same transaction that mints the
  // session, so a replayed link cannot open a second session.
  assert.match(source, /inspectHandoff\.deleteMany\([\s\S]{0,160}expiresAt: \{ gt: new Date\(\) \}/);
  assert.match(source, /if \(claimed\.count !== 1\) return null/);
  assert.match(source, /10 \* 60000/);

  // Both directions are rate limited, and the opaque value is shape-checked
  // before it is ever used to look anything up.
  assert.match(source, /rate\(`handoff-mail:\$\{req\.inspect\.id\}`/);
  assert.match(source, /rate\(`handoff-redeem:\$\{req\.ip\}`/);
  assert.match(source, /\^\[A-Za-z0-9_-\]\{43\}\$/);

  // A requested report must belong to the requesting account.
  assert.match(source, /inspectReport\.findFirst\(\{ where: \{ id: reportId, accountId: req\.inspect\.id \}/);

  // Expired rows are swept with the other short-lived tables.
  assert.match(source, /inspectHandoff\.deleteMany\(\{ where: \{ expiresAt: \{ lt: new Date\(\) \} \} \}\)/);

  // The app claims the link itself, and the fallback page never echoes a token.
  assert.match(server, /com\.bookmarketel\.frontdesk[\s\S]{0,160}\/inspect\/open/);
  assert.match(server, /app\.get\('\/inspect\/open'/);
  assert.doesNotMatch(server, /inspect\/open'[\s\S]{0,1400}req\.query\.handoff/);
  assert.match(client, /window\.marketelInspectOpenHandoff\s*=/);
});

test('Inspect launch-readiness stays non-blocking while disabled and blocks when enabled without infra', () => {
  const dark = inspectEnvReadiness({ INSPECT_ENABLED: 'false' });
  assert.equal(dark.enabled, false);
  assert.equal(dark.checks.find(c => c.id === 'inspect-enabled-flag').ok, true);
  assert.equal(dark.checks.find(c => c.id === 'inspect-auth-secret').critical, false);

  const incomplete = inspectEnvReadiness({ INSPECT_ENABLED: 'true' });
  assert.equal(incomplete.enabled, true);
  assert.equal(incomplete.checks.find(c => c.id === 'inspect-enabled-flag').ok, false);
  assert.equal(incomplete.checks.find(c => c.id === 'inspect-auth-secret').critical, true);

  const placeholders = inspectEnvReadiness({
    INSPECT_ENABLED: 'true', INSPECT_AUTH_SECRET: 'a'.repeat(32),
    INSPECT_R2_BUCKET: 'marketel-inspect-private', R2_BUCKET: 'marketel-uploads',
    R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
    STRIPE_MARKETEL_SECRET_KEY: 'sk_live_marketel', STRIPE_INSPECT_PRICE_ID: 'price_inspect_29',
    STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_PASTE_ME', STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_PASTE_ME',
  });
  assert.equal(placeholders.checks.find(c => c.id === 'inspect-stripe-webhook').ok, false);
  assert.equal(placeholders.checks.find(c => c.id === 'inspect-stripe-portal').ok, false);

  const ready = inspectEnvReadiness({
    INSPECT_ENABLED: 'true',
    INSPECT_AUTH_SECRET: 'a'.repeat(32),
    OPENAI_API_KEY: 'sk-test-inspect',
    INSPECT_R2_BUCKET: 'marketel-inspect-private',
    R2_BUCKET: 'marketel-uploads',
    R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    STRIPE_MARKETEL_SECRET_KEY: 'sk_live_marketel',
    STRIPE_INSPECT_PRICE_ID: 'price_inspect_29',
    STRIPE_INSPECT_YEARLY_PRICE_ID: 'price_inspect_199',
    STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_inspect',
    STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_inspect',
  });
  assert.equal(ready.checks.every(c => c.ok), true);
  assert.equal(ready.checks.find(c => c.id === 'inspect-price-validation').ok, true);

  const dedicatedStorage = inspectEnvReadiness({
    INSPECT_ENABLED: 'true',
    INSPECT_AUTH_SECRET: 'a'.repeat(32),
    INSPECT_R2_BUCKET: 'marketel-inspect-private',
    R2_BUCKET: 'marketel-uploads',
    INSPECT_R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
    INSPECT_R2_ACCESS_KEY_ID: 'inspect-key',
    INSPECT_R2_SECRET_ACCESS_KEY: 'inspect-secret',
    STRIPE_MARKETEL_SECRET_KEY: 'sk_live_marketel',
    STRIPE_INSPECT_PRICE_ID: 'price_inspect_29',
    STRIPE_INSPECT_YEARLY_PRICE_ID: 'price_inspect_199',
    STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_inspect',
    STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_inspect',
  });
  assert.equal(dedicatedStorage.checks.find(c => c.id === 'inspect-private-bucket').ok, true);
  assert.equal(dedicatedStorage.checks.find(c => c.id === 'inspect-enabled-flag').ok, true);
});

test('Inspect photo uploads preserve the local-work recovery message when storage fails', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  assert.match(source, /Inspect photo storage failed:/);
  assert.match(source, /Your report and photo remain on this device; try again shortly\./);
});

test('Inspect has one canonical trailing-slash route through Render and Vercel', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'hotel-booking-app', 'vercel.json'), 'utf8'));
  assert.match(server, /app\.get\('\/inspect'/);
  assert.match(server, /if \(req\.path\.endsWith\('\/'\)\) return next\(\)/);
  assert.match(server, /res\.redirect\(308, '\/inspect\/'\)/);
  assert.deepEqual(vercel.redirects?.find(route => route.source === '/inspect'), {
    source: '/inspect', destination: '/inspect/', permanent: true,
  });
  assert.ok(vercel.rewrites.some(route => route.source === '/inspect/(.*)'
    && route.destination.endsWith('/inspect/$1')));
});

test('Inspect API is dark behind its flag and requires a bearer session', async () => {
  const off = express();
  off.use(express.json());
  const offRegistration = registerInspect(off, { prisma: {}, mail: null, stripe: null, env: { INSPECT_ENABLED: 'false' } });
  assert.equal((await request(off, '/api/inspect/config')).status, 404);
  offRegistration.close();

  const on = express();
  on.use(express.json());
  const onRegistration = registerInspect(on, {
    prisma: { inspectSession: { findUnique: async () => null } },
    mail: {},
    stripe: {},
    env: {
      INSPECT_ENABLED: 'true', INSPECT_AUTH_SECRET: 'a'.repeat(32),
      INSPECT_R2_BUCKET: 'private', R2_BUCKET: 'public', R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
      STRIPE_MARKETEL_SECRET_KEY: 'sk_test_marketel',
      STRIPE_INSPECT_PRICE_ID: 'price_test', STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_test',
    },
  });
  const config = await request(on, '/api/inspect/config');
  assert.equal(config.status, 200);
  assert.deepEqual(await config.json(), { enabled: true, appStoreUrl: 'https://apps.apple.com/us/app/marketel/id6801005750', limits: { reports: 30, photos: 100 } });
  assert.equal((await request(on, '/api/inspect/account')).status, 401);
  onRegistration.close();
});

test('Inspect email-code requests acquire a Prisma-safe advisory lock', async () => {
  let lockQuery = '';
  let challengeCreated = false;
  let emailSent = false;
  const transaction = {
    $queryRaw: async strings => { lockQuery = strings.join('?'); return [{ locked: 1 }]; },
    inspectChallenge: {
      findUnique: async () => null,
      upsert: async () => { challengeCreated = true; },
      deleteMany: async () => {},
    },
  };
  const prisma = { $transaction: async callback => callback(transaction) };
  const app = express();
  app.use(express.json());
  const registration = registerInspect(app, {
    prisma,
    mail: { sendMail: async () => { emailSent = true; } },
    stripe: {},
    env: {
      INSPECT_ENABLED: 'true', INSPECT_AUTH_SECRET: 'a'.repeat(32),
      INSPECT_R2_BUCKET: 'private', R2_BUCKET: 'public', R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
      STRIPE_MARKETEL_SECRET_KEY: 'sk_test_marketel',
      STRIPE_INSPECT_PRICE_ID: 'price_test', STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_test',
    },
  });
  const response = await request(app, '/api/inspect/auth/request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com' }),
  });
  assert.equal(response.status, 200);
  assert.match(lockQuery, /SELECT 1 AS locked FROM pg_advisory_xact_lock/);
  assert.equal(challengeCreated, true);
  assert.equal(emailSent, true);
  registration.close();
});
