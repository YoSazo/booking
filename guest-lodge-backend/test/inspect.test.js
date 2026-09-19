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

test('Claims creates an honest damage document without changing condition reports', () => {
  for (const type of ['routine', 'move-in', 'move-out', 'incident', 'damage']) {
    assert.equal(validateDocument({ ...validDocument(), type }).type, type);
  }
  assert.equal(validateDocument({ ...validDocument(), type: 'damage', eventTime: 'unknown' }).eventTime, 'unknown');
  assert.equal(validateDocument({ ...validDocument(), type: 'damage', eventTime: '16:45' }).eventTime, '16:45');
  assert.throws(() => validateDocument({ ...validDocument(), type: 'damage', eventTime: 'late' }), /HH:MM/);
  const signature = role => ({ role, name: 'Alex', strokes: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]] });
  assert.deepEqual(validateSignatures([signature('owner'), signature('guest')], 'damage').map(s => s.role), ['owner', 'guest']);
  assert.deepEqual(validateSignatures([], 'damage'), []);
  assert.throws(() => validateSignatures([signature('resident')], 'damage'), /one owner and one guest/);
  assert.deepEqual(validateSignatures([signature('manager'), signature('resident')], 'routine').map(s => s.role), ['manager', 'resident']);
});

test('damage voice notes and artifacts use the Claims guardrails and identity', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..');
  const server = fs.readFileSync(path.join(root, 'inspect.js'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'public/inspect/inspect.js'), 'utf8');
  const web = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const terms = fs.readFileSync(path.join(root, 'public/inspect/terms.html'), 'utf8');
  const chooser = fs.readFileSync(path.join(root, '../marketel-frontdesk-ios/www/index.html'), 'utf8');
  assert.match(server, /damage: `You format a spoken damage note/);
  assert.match(server, /Never estimate repair or replacement cost, assign blame, or state a cause/);
  assert.match(server, /VOICE_INSTRUCTIONS\[report\.document\.type\]/);
  assert.match(server, /damage: \{ brand: 'MARKETEL CLAIMS', file: 'damage-report\.pdf' \}/);
  assert.match(server, /res\.type\('html'\)\.send\(`<!doctype html><html><head>.*?<title>\$\{safe\(typeLabel\(d\.type\)\)\}/);
  assert.match(server, /roleLabel\(signature\.role\)/);
  assert.match(client, /damage: \['owner', 'guest'\]/);
  assert.match(client, /data-original-photo/);
  assert.match(client, /const documentFileName = type => type === 'incident'.*?'damage-report\.pdf'/);
  assert.match(web, /Claims produces documentation; it does not file, submit or manage claims/);
  assert.match(terms, /it does not file, submit or manage claims/);
  for (const arm of ['inspect', 'claims', 'incident']) {
    assert.match(chooser, new RegExp(`data-product="${arm}"`));
  }
  assert.match(chooser, /inspect\/index\.html\?arm=\$\{product\}/);
  assert.doesNotMatch(chooser, /data-product="bookings"/);
  assert.match(client, /if\(LANDING_ARMS\[chosen\]\)localStorage\.setItem\('marketel\.product',chosen\)/);
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
  // The property, not the prose: signedAt is never taken from the request, so a
  // client cannot backdate a signature. It is stamped server-side when the
  // signature first appears — not rewritten at finalize, which would claim
  // everyone signed the moment the report was frozen.
  assert.match(source, /signedAt is never taken from the client/);
  assert.doesNotMatch(source, /signedAt: signature\?\.signedAt|signedAt: input/);
  assert.match(source, /function stampSignatures\(next, previous, at = new Date\(\)\)/);
  assert.match(source, /seen\.get\(`\$\{signature\.role\}:\$\{signature\.name\}:\$\{JSON\.stringify\(signature\.strokes\)\}`\) \|\| at\.toISOString\(\)/);
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

test('dictation works in the app without the shell owning the note', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const root = path.join(__dirname, '..', '..', 'marketel-frontdesk-ios', 'ios', 'App');
    const swift = fs.readFileSync(path.join(root, 'App', 'NativeDictation.swift'), 'utf8');
    const project = fs.readFileSync(path.join(root, 'App.xcodeproj', 'project.pbxproj'), 'utf8');
    const plist = fs.readFileSync(path.join(root, 'App', 'Info.plist'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

    // One engine, one tap, two sinks. If the recogniser ever opened its own
    // input we would be back to two things fighting for one microphone.
    assert.match(swift, /installTap\(onBus: 0/);
    assert.match(swift, /request\?\.append\(buffer\)/);
    assert.match(swift, /file\?\.write\(from: buffer\)/);
    assert.equal((swift.match(/installTap/g) || []).length, 1);

    // Missing this key hard-crashes on the first authorization request.
    assert.match(plist, /NSSpeechRecognitionUsageDescription/);

    // A Sources entry is what actually compiles it — the group alone ships a
    // build with the feature silently absent.
    const sources = project.slice(project.indexOf('isa = PBXSourcesBuildPhase'));
    assert.match(sources.slice(0, sources.indexOf('};')), /NativeDictation\.swift in Sources/);

    // Captions are decoration: the note still comes from the server's own
    // transcript of the uploaded audio, so the shell returns audio, not text.
    assert.match(client, /window\.marketelInspectAudioCaptured/);
    assert.match(client, /sendVoiceNote\(pending\.index/);
    assert.match(client, /if\(native\)return nativeRecordRoom\(index\)/);

    // Dismissing the sheet must stop the engine or the microphone stays open.
    const nativePath = client.slice(client.indexOf('function nativeRecordRoom'), client.indexOf('window.marketelInspectDictationText'));
    assert.match(nativePath, /addEventListener\('close'[\s\S]*?stop\(\)/);
});

test('the original camera file can be handed over, and only to its owner', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const route = server.slice(server.indexOf('const ORIGINAL_TYPES'), server.indexOf('const voiceUpload'));

    // Preserve the uploaded bytes for the owner; a resized share image is not
    // interchangeable with the uploaded file in an evidence workflow.
    assert.match(route, /object\(a\.originalKey\)/);
    assert.doesNotMatch(route, /object\(a\.objectKey\)/);
    assert.match(route, /owned\(prisma, req\.inspect\.id, req\.params\.id\)/);

    // Owner only: a share token reads the report, it does not carry evidence.
    const shared = server.slice(server.indexOf("router.get('/shared/:token'"), server.indexOf("router.use((req, res, next) => {\n    const raw"));
    assert.doesNotMatch(shared, /originalKey/);

    // The type was never recorded, so a camera-roll import is as likely to be
    // HEIC as JPEG and must not be handed over named .jpg.
    assert.match(route, /ext: 'heic'/);
    assert.match(route, /'ftyp'/);
    assert.match(route, /ext: 'png'/);
    assert.match(route, /ext: 'webp'/);
    assert.match(route, /ext: 'avif'/);
    assert.match(route, /ext: 'bin', mime: 'application\/octet-stream'/);

    // The reading copies stay the resized ones — that is the right file there.
    assert.match(server, /res\.type\('jpeg'\)\.send\(await object\(a\.objectKey\)\)/);

    // Offered only when there is something on the server to fetch.
    assert.match(client, /const canDownload=!native&&draft\.serverId&&remoteId/);
    assert.match(client, /photos\/\$\{remoteId\}\/original/);
});

test('an incident record does not misstate anything to an insurer', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

    // type is the wedge discriminator and needs no migration, but the three
    // existing types must keep working.
    assert.match(server, /\['routine', 'move-in', 'move-out', 'incident', 'damage'\]/);

    // date is when it was written down; neither it nor finalizedAt says when
    // the thing happened. Optional, and unknown is a real answer.
    assert.match(server, /document\.eventTime = eventTime/);
    assert.match(server, /eventTime !== 'unknown' && !\/\^\(\[01\]/);

    // A witness is not a "resident", and nobody signed at the moment the
    // report was frozen.
    assert.match(server, /incident: \['manager', 'witness'\]/);
    assert.match(server, /default: \['manager', 'resident'\]/);
    const finalize = server.slice(server.indexOf('const finalizedAt = new Date();'), server.indexOf('const finalized = await tx.inspectReport.update'));
    assert.match(finalize, /stampSignatures\(document\.signatures, r\.document\?\.signatures, finalizedAt\)/);
    assert.doesNotMatch(finalize, /signedAt: finalizedAt\.toISOString\(\)/);

    // A share link is a bearer token to the whole document, and an incident
    // narrative can name a person and their injury.
    assert.match(server, /Incident records are not shareable by link/);
    assert.match(client, /d\.type==='incident'\?'':'<button id="share"/);

    // The model must never turn "her wrist looked bad" into an injury.
    assert.match(server, /Never diagnose, characterise or speculate about injury/);
    assert.match(server, /VOICE_INSTRUCTIONS\[report\.document\.type\] \|\| VOICE_INSTRUCTIONS\.default/);

    // And both artifacts that leave the app carry the right disclaimer.
    assert.match(server, /Not a legal, medical or insurance determination/);
    assert.match(server, /disclaimerFor\(report\.document\.type\)/);
    assert.match(server, /disclaimerFor\(d\.type\)/);
    assert.match(client, /esc\(pw\.disclaimer\)/);
});

test('each wedge is a root path, skinned per arm, and still attributed for free', () => {
    const fsx = require('node:fs'), pathx = require('node:path');
    const root = pathx.join(__dirname, '..');
    const client = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'inspect.js'), 'utf8');
    const shell = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'index.html'), 'utf8');
    const termsHtml = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'terms.html'), 'utf8');
    const server = fsx.readFileSync(pathx.join(root, 'server.js'), 'utf8');

    // The path is canonical: it survives a shared link, reads as a product
    // rather than a feature, and is already in sourceUrl via location.pathname
    // — so attribution needs no new plumbing and utm_campaign goes back to
    // naming the campaign instead of doubling as the arm.
    const armPath = client.match(/const ARM_PATH = (\/.+\/);/);
    assert.ok(armPath, 'the client must expose its arm-path pattern');
    const pattern = new RegExp(armPath[1].slice(1, -1));
    for (const url of ['/incident', '/incident/', '/inspect/incident', '/inspect/incident/', '/claims']) {
        assert.match(url, pattern, `${url} must resolve to an arm`);
    }
    // The bare product path is not an arm, and a deeper path never is.
    assert.doesNotMatch('/inspect/', pattern);
    assert.doesNotMatch('/incident/terms/extra', pattern);
    assert.match(client, /LANDING_ARMS\[fromPath\] \|\| LANDING_ARMS\[fromParam\.toLowerCase\(\)\]/);
    assert.match(client, /utm_campaign:/);

    // Served from a root path, the shell can no longer resolve its own assets
    // relatively. Capacitor serves www/ as its root with the bundle at
    // www/inspect/, so absolute product-scoped URLs work in the app too.
    assert.doesNotMatch(shell, /(src|href)="\.\//);
    assert.match(shell, /href="\/inspect\/inspect\.css/);
    assert.match(shell, /src="\/inspect\/inspect\.js/);

    // Every arm goes through one gate, so a new path cannot ship without the
    // headers. An empty allowlist disables the microphone for every origin
    // including this one, which killed dictation in Chrome while Safari let it
    // through.
    assert.match(server, /function inspectGate\(req, res, next\)/);
    assert.match(server, /app\.get\(`\/\$\{slug\}`, inspectGate/);
    assert.match(server, /app\.get\(`\/\$\{slug\}\/terms`, inspectGate/);
    assert.match(server, /app\.use\('\/inspect\/', inspectGate/);
    const policy = (server.match(/setHeader\('Permissions-Policy', '[^']+'\)/g) || []).join(' ');
    assert.match(policy, /microphone=\(self\)/);
    assert.doesNotMatch(policy, /microphone=\(\)/);

    // A slug has to survive the root namespace, which it shares with Booking's
    // own pages and with express.static(public) serving every file in there.
    const slugs = [...server.matchAll(/^    (\w+): Object\.freeze\(\{ product: '(\w+)'/gm)].map(m => m[1]);
    assert.deepEqual(slugs, ['incident', 'claims']);
    const taken = new Set([...server.matchAll(/app\.(?:get|post|use|all)\('\/([a-z0-9-]+)'/g)].map(m => m[1]));
    for (const slug of slugs) {
        assert.ok(!taken.has(slug), `/${slug} collides with an existing route`);
        assert.ok(!fsx.existsSync(pathx.join(root, 'public', slug)), `/${slug} collides with a public file`);
    }

    // The shell and the terms page ship as complete HTML and are rewritten per
    // arm at send time, because Capacitor serves both straight off disk with no
    // server in front of them. That only holds while the literals still exist:
    // check every one the server expects to find, so a copy edit cannot quietly
    // turn the skin off and leave an incident visitor inside Inspect.
    const swaps = server.slice(server.indexOf('function inspectSkinned'), server.indexOf('function inspectGate'));
    const literals = [...swaps.matchAll(/^            \['([^']+)',/gm)].map(m => m[1]);
    assert.ok(literals.length >= 8, 'expected the shell and terms substitutions');
    for (const literal of literals) {
        const decoded = literal.replace(/\\u2014/g, '\u2014').replace(/\\u2190/g, '\u2190');
        assert.ok(shell.includes(decoded) || termsHtml.includes(decoded),
            `no file contains the literal the server substitutes: ${decoded}`);
    }

    // Someone who clicked an advertisement about incidents must not land inside
    // a product that talks about move-out comparisons, so the chrome, the
    // paywall and the terms link all follow the arm rather than the codebase.
    const skin = client.slice(client.indexOf('const SKIN = {'), client.indexOf('const landingArm'));
    for (const key of ['product', 'home', 'terms', 'navList', 'navCreate', 'navPlaces',
                       'listHeading', 'placesHeading', 'documentLabel', 'offerHeading',
                       'offerAnchor', 'offerPoints']) {
        assert.match(skin, new RegExp(`\\b${key}:`), `the incident arm must override ${key}`);
        assert.ok(skin.split(`${key}:`).length > 2, `${key} needs a default and an incident value`);
    }
    // No surface may hardcode the product name or its terms URL any more.
    const surfaces = client.slice(client.indexOf('function landing()'));
    assert.doesNotMatch(surfaces, /bookmarketel\.com\/inspect\/terms/);
    assert.doesNotMatch(surfaces, /MARKETEL INSPECT/);
    assert.doesNotMatch(surfaces, /a year of Inspect/);
    assert.match(surfaces, /esc\(sk\.terms\)/);

    // Each arm has its own name; all use one account and report allowance.
    assert.match(server, /incident: Object\.freeze\(\{ product: 'Incident'/);
    assert.match(server, /claims: Object\.freeze\(\{ product: 'Claims'/);

    // Claims leads with uploaded evidence rather than an AI-generated finding.
    const arms = client.slice(client.indexOf('const LANDING_ARMS'), client.indexOf('const ARM_PATH'));
    assert.match(arms, /photos kept as uploaded/);
    assert.doesNotMatch(arms, /\bAI\b|writes the notes/);

    // And it promises preservation, never an outcome.
    assert.doesNotMatch(arms, /\b(guarantee[sd]?|approved|accepted|win|reimburse[sd]?)\b/i);
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

    // The header cannot disappear when the fixed-body scroll lock is applied,
    // and the sheet treats it as a boundary while the keyboard is present.
    assert.match(css, /header\s*\{\s*position:\s*fixed/);
    assert.match(client, /const webHeader=native\?0:/);
    assert.match(client, /const shellTop=Math\.max\(number\('--shell-top'\),webHeader\)/);
    assert.doesNotMatch(css, /transition:\s*top/);

    // The visible band owns the sheet position. Safari's pan is cancelled only
    // on the frozen page, and native keyboard height is not confused with the
    // already-resized web visual viewport.
    assert.match(client, /--sheet-top/);
    assert.match(client, /--sheet-max-height/);
    assert.match(client, /--viewport-pan/);
    assert.match(client, /--kb-native/);
    assert.doesNotMatch(client, /--sheet-shift/);
});

test('the required email flow expands the persistent header without replacing the report', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.css'), 'utf8');
    const header = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'index.html'), 'utf8');
    const drawer = client.slice(client.indexOf('function headerDrawer('), client.indexOf('function confirmAction('));
    const auth = client.slice(client.indexOf('function ensureAuth('), client.indexOf('async function refresh('));

    assert.match(header, /<header>.*id="header-drawer".*id="header-drawer-body".*<\/header>/s);
    assert.match(header, /id="header-drawer"[^>]*aria-hidden="true" inert/);
    assert.match(auth, /headerDrawer\(html\)/);
    assert.doesNotMatch(drawer, /document\.createDocumentFragment\(\)/);
    assert.doesNotMatch(drawer, /replaceChildren\(origin\)/);
    assert.doesNotMatch(drawer, /scrollTo\(/);
    assert.doesNotMatch(auth, /\bmodal\(/);
    assert.doesNotMatch(auth, /showModal\(/);
    assert.doesNotMatch(auth, /lockPage\(/);
    assert.match(drawer, /drawer\.inert=true/);
    assert.match(drawer, /app\.inert=true/);
    assert.match(drawer, /bar\.inert=true/);
    assert.match(css, /\.header-drawer\s*\{[^}]*grid-template-rows:\s*0fr/);
    assert.match(css, /html\.auth-open \.header-drawer\s*\{[^}]*grid-template-rows:\s*1fr/);
    assert.match(css, /html\.auth-open \.header-bar, html\.auth-open main, html\.auth-open nav\s*\{[^}]*pointer-events:\s*none/);
});

test('the app signs in through its glass banner and never inerts a page behind a hidden header', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.css'), 'utf8');
    const chooser = fs.readFileSync(path.join(__dirname, '..', '..', 'marketel-frontdesk-ios', 'www', 'index.html'), 'utf8');
    const drawer = client.slice(client.indexOf('function headerDrawer('), client.indexOf('function confirmAction('));
    const auth = client.slice(client.indexOf('function ensureAuth('), client.indexOf('async function refresh('));
    const nativeBranch = auth.slice(auth.indexOf('if(native){'), auth.indexOf('let drawer=null;'));

    // The app hides the web header; a drawer inside it must refuse to open
    // before anything is made inert, or every button on the page goes dead.
    assert.ok(drawer.indexOf('getClientRects().length') > -1);
    assert.ok(drawer.indexOf('getClientRects().length') < drawer.indexOf('app.inert=true'));
    assert.match(nativeBranch, /type:'inspectAuth'/);
    assert.match(nativeBranch, /return;/);
    assert.doesNotMatch(nativeBranch, /headerDrawer\(/);
    for (const bridge of ['marketelInspectAuthRequest', 'marketelInspectAuthVerify', 'marketelInspectAuthClosed']) {
        assert.match(client, new RegExp(`window\\.${bridge}=`));
    }
    assert.match(client, /type:'inspectAuthResult'/);
    assert.match(client, /\$\('sign-in'\)\.onclick=\(\)=>ensureAuth\(\(\)=>run\(\(\)=>openAccountHome\(\)\),'signin'\)/);
    assert.match(client, /if\(action==='signin'\)/);
    assert.match(client, /if\(action==='choose'\)/);
    assert.match(client, /type:'inspectState',[^}]*product:skin\(\)\.product/);

    // Flow cards centre between the chrome that is actually on screen.
    assert.match(css, /\.flow-frame \{[^}]*top: calc\(var\(--chrome-top\)/);
    assert.match(css, /\.flow-frame \{[^}]*var\(--chrome-bottom\)/);
    assert.doesNotMatch(css, /\.flow-frame \{[^}]*64px/);
    assert.match(css, /\.native-inspect-shell \{[^}]*--chrome-top: 82px/);
    assert.match(css, /\.native-inspect-shell \.flow-screen \{ margin-top: -16px; \}/);

    // The chooser hands the bar to the shell and cues the tool page's entrance.
    assert.match(chooser, /type: 'chooserState'/);
    assert.match(chooser, /type: 'shellProduct'/);
    assert.match(chooser, /sessionStorage\.setItem\('marketel\.enter', '1'\)/);
    assert.match(client, /sessionStorage\.getItem\('marketel\.enter'\)/);
    assert.match(css, /html\.wedge-enter \.hero > \*/);
    // One continuous colour under the status bar in the app.
    assert.match(css, /\.native-inspect-shell body::after \{[^}]*clip-path: inset\(0 0 calc\(100% - env\(safe-area-inset-top/);
    assert.match(chooser, /body::after \{[^}]*clip-path: inset\(0 0 calc\(100% - env\(safe-area-inset-top/);
    assert.match(css, /\.native-inspect-shell \.hero #sign-in \{ margin-top: 12px;/);
});

test('each tool lists only its own report types, and rejects unknown ones', async () => {
  const express = require('express');
  let where = null;
  const account = { id: 'acct_1', email: 'owner@example.com', freeReportUsedAt: null, subscriptionStatus: null };
  const prisma = {
    inspectSession: { findUnique: async () => ({ tokenHash: 'h', expiresAt: new Date(Date.now() + 60000), account }) },
    inspectReport: { findMany: async query => { where = query.where; return []; } },
  };
  const app = express();
  app.use(express.json());
  const registration = registerInspect(app, {
    prisma, mail: { sendMail: async () => {} }, stripe: {},
    env: {
      INSPECT_ENABLED: 'true', INSPECT_AUTH_SECRET: 'a'.repeat(32),
      INSPECT_R2_BUCKET: 'private', R2_BUCKET: 'public', R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
      STRIPE_MARKETEL_SECRET_KEY: 'sk_test_marketel',
      STRIPE_INSPECT_PRICE_ID: 'price_test', STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_test',
    },
  });
  const headers = { Authorization: `Bearer ${'b'.repeat(43)}` };
  try {
    const claims = await request(app, '/api/inspect/reports?take=50&types=damage', { headers });
    assert.equal(claims.status, 200);
    assert.deepEqual(where, { accountId: 'acct_1', OR: [{ document: { path: ['type'], equals: 'damage' } }] });

    const inspect = await request(app, '/api/inspect/reports?take=50&types=routine,move-in,move-out', { headers });
    assert.equal(inspect.status, 200);
    assert.deepEqual(where.OR.map(clause => clause.document.equals), ['routine', 'move-in', 'move-out']);

    where = null;
    const unknown = await request(app, '/api/inspect/reports?types=damage,anything', { headers });
    assert.equal(unknown.status, 400);
    assert.equal(where, null);

    const all = await request(app, '/api/inspect/reports', { headers });
    assert.equal(all.status, 200);
    assert.deepEqual(where, { accountId: 'acct_1' });
  } finally {
    registration.close();
  }
});

test('switching tools can never strand the app on a blank page', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const chooser = fs.readFileSync(path.join(__dirname, '..', '..', 'marketel-frontdesk-ios', 'www', 'index.html'), 'utf8');
  const boot = client.slice(client.indexOf('let booted=false;'));

  // Storage is opened on demand with a bound, never awaited raw at boot.
  assert.doesNotMatch(client, /const db = new Promise/);
  assert.match(client, /request\.onblocked = /);
  assert.match(boot, /draft=await withTimeout\(stored\('get'\),\s*\d+\)/);
  assert.match(boot, /await withTimeout\(refresh\(\),\s*\d+\)/);
  assert.match(boot, /setTimeout\(\(\)=>\{if\(!booted\)renderRecovery\(\);\}/);
  // No database write as a page leaves; leaving closes the connection instead.
  assert.doesNotMatch(client, /addEventListener\('pagehide',\s*\(\)\s*=>\s*remember\(\)\)/);
  assert.match(client, /addEventListener\('pagehide', \(\) => \{ const open = dbPromise; dbPromise = null; open\?\.then\(database => database\.close\(\)/);
  // Every JSON request is bounded.
  assert.match(client, /setTimeout\(\(\) => controller\.abort\(\), 15000\)/);
  // Hops between tools replace the page instead of stacking history.
  assert.match(client, /if\(action==='choose'\)\{location\.replace\('\.\.\/index\.html\?choose=1'\)/);
  assert.doesNotMatch(client, /location\.assign\('\.\.\/index\.html/);
  // Each tool keeps its own draft and asks only for its own reports.
  assert.match(client, /const draftKey = \(\) => `current:\$\{toolId\(\)\}`/);
  assert.match(client, /inspect: \['routine', 'move-in', 'move-out'\], claims: \['damage'\], incident: \['incident'\]/);
  assert.equal((client.match(/\/reports\?take=50&\$\{toolTypesQuery\(\)\}/g) || []).length, 3);
  assert.match(client, /<small>\$\{esc\(documentLabelFor\(d\.type\)\)\}<\/small>/);
  // A chooser restored from the back/forward cache undoes its departure.
  assert.match(chooser, /addEventListener\('pageshow'[\s\S]{0,200}classList\.remove\('leaving'\)/);
});

test('the landing defers pricing by one transparent tap without opening checkout', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const landing = client.slice(client.indexOf('function landing()'), client.indexOf('async function start('));
    const preview = landing.slice(landing.indexOf('function previewPlans()'));

    assert.match(landing, /Your first complete report across Marketel Inspect is free\. No card\./);
    assert.match(landing, /id="see-plans"/);
    assert.doesNotMatch(landing.slice(0,landing.indexOf('function previewPlans()')), /\$199|\$29\/month/);
    assert.match(preview, /Plans after your free \$\{esc\(skin\(\)\.doc\)\}/);
    assert.match(preview, /PLANS\[planInterval\]/);
    assert.match(preview, /Create my first \$\{esc\(skin\(\)\.doc\)\} free/);
    assert.doesNotMatch(preview, /logInspect\(/);
    assert.doesNotMatch(preview, /\/checkout/);
});

test('Inspect destructive choices use product UI instead of browser alerts', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

    assert.match(client, /function confirmAction\(/);
    assert.doesNotMatch(client, /\bconfirm\s*\(/);
    assert.doesNotMatch(client, /\bprompt\s*\(/);
    assert.doesNotMatch(client, /\balert\s*\(/);
});

test('the landing demo still reads when nothing is allowed to move', () => {
    const client = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
    const demo = client.slice(client.indexOf('function playDemo()'), client.indexOf('function landing()'));

    // inspect.css only collapses CSS animations; a JS typing loop runs straight
    // through that, so reduced motion has to be asked about here.
    assert.match(demo, /prefers-reduced-motion: reduce/);
    assert.match(demo, /said\.textContent=script;demo\.classList\.add\('is-in'\);return;/);
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
    // Both surfaces now share sendVoiceNote, so the ordering lives there: the
    // event has to be written before the email wall, or the owners it exists
    // to count — the ones who refuse to verify — stay invisible.
    const send = client.slice(client.indexOf('function sendVoiceNote'), client.indexOf('let nativeDictation'));
    assert.ok(send.indexOf("logInspect('VoiceNoteRecorded',true)") < send.indexOf('ensureAuth('),
        'the recording event fires after the auth wall, so a bail there stays invisible');

    // Name only. The voice route promises the recording never leaves memory.
    assert.match(client, /const logInspect=\(name,anonymous=false\)=>/);
    assert.match(client, /body:\{name\}/);

    // The promise must not overclaim on a document used in disputes.
    assert.doesNotMatch(client, /report writes itself/i);
    // The arm supplies the name; the claim it makes must stay the same one.
    assert.match(client, /\$\{esc\(skin\(\)\.product\)\} writes the note/);
    assert.match(client, /\$\{skin\(\)\.writesLabel\} the note/);
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
