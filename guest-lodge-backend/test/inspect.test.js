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
  // Plans are sold as unlimited; this is the fair-use ceiling the terms state.
  assert.equal(LIMITS.reports, 300);
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
  assert.match(require('../wedges/claims').types.damage.voiceInstruction, /You format a spoken damage note/);
  assert.match(require('../wedges/claims').types.damage.voiceInstruction, /Never estimate repair or replacement cost, assign blame, or state a cause/);
  assert.match(server, /VOICE_INSTRUCTIONS\[report\.document\.type\]/);
  assert.deepEqual([require('../wedges/claims').types.damage.brand, require('../wedges/claims').types.damage.file], ['MARKETEL CLAIMS', 'damage-report.pdf']);
  assert.match(server, /res\.type\('html'\)\.send\(`<!doctype html><html><head>.*?<title>\$\{safe\(typeLabel\(d\.type\)\)\}/);
  assert.match(server, /roleLabel\(signature\.role\)/);
  assert.deepEqual(require('../wedges/claims').types.damage.signers, { manager: 'owner', other: 'guest' });
  assert.match(client, /data-original-photo/);
  assert.match(client, /const documentFileName = type => typeConfig\(type\)\.file/);
  assert.match(require('../wedges/claims').termsIntro, /Claims produces documentation; it does not file, submit or manage claims/);
  assert.match(terms, /it does not file, submit or manage claims/);
  // Claims is the only wedge running ads, so it is the only one on the menu.
  // The others still open if something links straight to them.
  assert.match(chooser, /data-product="claims"/);
  for (const hidden of ['inspect', 'incident']) {
    assert.doesNotMatch(chooser, new RegExp(`data-product="${hidden}"`), hidden);
  }
  assert.match(chooser, /More tools coming soon/);
  assert.doesNotMatch(chooser, /All three use the same account/);
  assert.match(chooser, /WEDGE_PRODUCTS_START/);
  // Only what is offered reopens by itself; a hidden tool someone last used
  // must not skip the menu and land them straight back in it.
  assert.match(chooser, /if \(!choosing && offered\.includes\(selected\)\) return open\(selected\);/);
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
    assert.deepEqual(require('../wedges/registry').load().all.flatMap(w => Object.keys(w.types)).sort(), ['routine', 'move-in', 'move-out', 'incident', 'damage', 'check-in', 'landlord-move-out', 'landlord-move-in'].sort());

    // date is when it was written down; neither it nor finalizedAt says when
    // the thing happened. Optional, and unknown is a real answer.
    assert.match(server, /document\.eventTime = eventTime/);
    assert.match(server, /eventTime !== 'unknown' && !\/\^\(\[01\]/);

    // A witness is not a "resident", and nobody signed at the moment the
    // report was frozen.
    assert.deepEqual(require('../wedges/incident').types.incident.signers, { manager: 'staff', other: 'witness' });
    assert.deepEqual(require('../wedges/inspect').types.routine.signers, { manager: 'manager', other: 'resident' });
    const finalize = server.slice(server.indexOf('const finalizedAt = new Date();'), server.indexOf('const finalized = await tx.inspectReport.update'));
    assert.match(finalize, /stampSignatures\(document\.signatures, r\.document\?\.signatures, finalizedAt\)/);
    assert.doesNotMatch(finalize, /signedAt: finalizedAt\.toISOString\(\)/);

    // A share link is a bearer token to the whole document, and an incident
    // narrative can name a person and their injury.
    assert.equal(require('../wedges/incident').types.incident.can.shareable, false);
    assert.match(client, /wedge\(d\.type\)\.can\.shareable/);

    // The model must never turn "her wrist looked bad" into an injury.
    assert.match(require('../wedges/incident').types.incident.voiceInstruction, /Never diagnose, characterise or speculate about injury/);
    assert.match(server, /VOICE_INSTRUCTIONS\[report\.document\.type\] \|\| VOICE_INSTRUCTIONS\.default/);

    // And both artifacts that leave the app carry the right disclaimer.
    assert.match(require('../wedges/incident').types.incident.disclaimer, /Not a legal, medical or insurance determination/);
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
    const slugs = require('../wedges/registry').load().all.filter(w => w.id !== 'inspect').map(w => w.id);
    assert.deepEqual(slugs, ['claims', 'incident', 'moveout']);
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
    const inspect = require('../wedges/inspect'), incident = require('../wedges/incident');
    for (const key of ['product','home','terms','navList','navCreate','navPlaces','listHeading','placesHeading','documentLabel','offerHeading','offerAnchor','offerPoints']) {
      assert.ok(inspect.skin[key], `Inspect missing ${key}`);
      assert.ok(incident.skin[key], `Incident missing ${key}`);
    }
    // No surface may hardcode the product name or its terms URL any more.
    const surfaces = client.slice(client.indexOf('function landing()'));
    assert.doesNotMatch(surfaces, /bookmarketel\.com\/inspect\/terms/);
    assert.doesNotMatch(surfaces, /MARKETEL INSPECT/);
    assert.doesNotMatch(surfaces, /a year of Inspect/);
    assert.match(surfaces, /esc\(sk\.terms\)/);

    // Each arm has its own name; all use one account and report allowance.
    assert.match(server, /require\('\.\/wedges\/registry'\)\.load\(\)/);
    assert.equal(require('../wedges/incident').product, 'Incident');
    assert.equal(require('../wedges/claims').product, 'Claims');

    // Claims leads with uploaded evidence rather than an AI-generated finding.
    const claimsCopy = JSON.stringify(require('../wedges/claims').landing);
    assert.match(claimsCopy, /photos kept as uploaded/);
    assert.doesNotMatch(claimsCopy, /\bAI\b|writes the notes/);
    assert.doesNotMatch(claimsCopy, /\b(guarantee[sd]?|approved|accepted|win|reimburse[sd]?)\b/i);
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

// A small harness for the money path: a signed-in session, and just enough of
// Prisma and Stripe to watch what each route asks them to do.
function moneyHarness({ account: accountOverrides = {}, report: reportOverrides = {}, stripe: stripeOverrides = {}, env: envOverrides = {} } = {}) {
  const express = require('express');
  const calls = { accountUpdates: [], sessions: [], events: [], capi: [], freeClaims: 0, mail: [], garbage: [], reportDeletes: [] };
  const account = { id: 'acct_1', email: 'owner@example.com', freeReportUsed: false, reportsUsed: 0, reportCredits: 0,
    subscriptionStatus: null, periodEnd: null, stripeCustomerId: 'cus_1', businessName: 'Pine Stays', logoKey: 'inspect/logos/acct_1/a.png', ...accountOverrides };
  const report = { id: 'rep_1', accountId: 'acct_1', finalizedAt: null, baselineReport: null, attachments: [{ id: 'p1' }],
    document: { propertyName: 'Pine Ave', type: 'damage', date: '2026-09-19', eventTime: 'unknown', author: 'Sam',
      rooms: [{ name: 'Kitchen', observation: 'Chipped counter.', issue: true, photos: ['p1'] }], signatures: [] }, ...reportOverrides };
  const seenEvents = new Set();
  let sessionExpiry = new Date(Date.now() + 60000);
  // Enough of a store for the property routes to be exercised honestly: what is
  // added, counted and deleted is really kept, scoped to the account.
  const properties = [];
  let reports = [report];
  const mine = where => row => row.accountId === where.accountId;
  const db = {
    $queryRaw: async () => [],
    inspectSession: { findUnique: async () => ({ tokenHash: 'h', expiresAt: sessionExpiry, account }), deleteMany: async () => ({ count: 0 }),
      update: async ({ data }) => { calls.sessionExtensions = (calls.sessionExtensions || 0) + 1; sessionExpiry = data.expiresAt; return {}; },
      findMany: async () => [], create: async ({ data }) => { calls.sessionsCreated = (calls.sessionsCreated || 0) + 1; return data; } },
    // No outstanding codes: only the review path can verify here.
    inspectChallenge: { deleteMany: async () => ({ count: 0 }), findUnique: async () => null,
      update: async () => ({}), delete: async () => ({}), upsert: async () => ({}) },
    inspectHandoff: { deleteMany: async () => ({ count: 0 }) },
    inspectAccount: {
      findUniqueOrThrow: async () => account,
      findUnique: async () => account,
      // Enough of a filter for the sweep to be exercised honestly: the one
      // account comes back only when it actually matches the query.
      findMany: async ({ where = {} } = {}) => {
        const ends = new Date(account.periodEnd || 0).getTime();
        const matches = (where.subscriptionStatus === undefined || where.subscriptionStatus === account.subscriptionStatus)
          && (where.reportsUsed === undefined || where.reportsUsed === account.reportsUsed)
          && (!where.periodEnd || (ends < new Date(where.periodEnd.lt).getTime() && ends > new Date(where.periodEnd.gt).getTime()));
        return matches ? [account] : [];
      },
      upsert: async ({ create }) => ({ ...account, email: create.email }),
      update: async ({ data }) => {
        calls.accountUpdates.push(data);
        if ('stripeCustomerId' in data) account.stripeCustomerId = data.stripeCustomerId;
        if (typeof data.reportCredits === 'number') account.reportCredits = data.reportCredits;
        if (data.reportCredits?.increment) account.reportCredits += data.reportCredits.increment;
        if (data.reportCredits?.decrement) account.reportCredits -= data.reportCredits.decrement;
        return { ...account };
      },
    },
    inspectReport: {
      findFirst: async () => report,
      update: async ({ data }) => ({ ...report, ...data }),
      count: async () => 0,
      create: async ({ data }) => { calls.reportsCreated = (calls.reportsCreated || []).concat(data); return { id: 'rep_new', attachments: [], ...data }; },
      groupBy: async ({ where }) => {
        const counts = new Map();
        for (const row of reports.filter(mine(where))) counts.set(row.document.propertyName, (counts.get(row.document.propertyName) || 0) + 1);
        return [...counts].map(([propertyName, all]) => ({ propertyName, _count: { _all: all } }));
      },
      findMany: async ({ where }) => reports.filter(mine(where))
        .filter(row => where.propertyName === undefined || row.document.propertyName === where.propertyName)
        .filter(row => !where.finalizedAt || row.finalizedAt)
        .map(row => ({ ...row, propertyName: row.document.propertyName,
          attachments: row.attachments.map(a => ({ objectKey: `photos/${a.id}`, originalKey: `originals/${a.id}` })) })),
      deleteMany: async ({ where }) => {
        calls.reportDeletes.push(where);
        const before = reports.length;
        reports = reports.filter(row => !(mine(where)(row) && where.id.in.includes(row.id)));
        return { count: before - reports.length };
      },
    },
    inspectProperty: {
      findMany: async ({ where }) => properties.filter(mine(where)).map(row => ({ name: row.name })),
      count: async ({ where }) => properties.filter(mine(where)).length,
      upsert: async ({ where, create }) => {
        const key = where.accountId_name;
        if (!properties.some(row => row.accountId === key.accountId && row.name === key.name)) properties.push({ ...create });
      },
      deleteMany: async ({ where }) => {
        const before = properties.length;
        for (let i = properties.length - 1; i >= 0; i--) if (mine(where)(properties[i]) && properties[i].name === where.name) properties.splice(i, 1);
        return { count: before - properties.length };
      },
    },
    inspectGarbage: { createMany: async ({ data }) => { calls.garbage.push(...data); }, deleteMany: async () => ({ count: 0 }) },
    inspectAttachment: { create: async ({ data }) => { calls.attachments = (calls.attachments || []).concat(data); return { id: 'att_new', createdAt: new Date(), ...data }; } },
    inspectFreeClaim: { findUnique: async () => null, create: async () => { calls.freeClaims += 1; } },
    inspectEvent: {
      findUnique: async ({ where }) => (seenEvents.has(where.sourceId) ? { id: where.sourceId } : null),
      create: async ({ data }) => { if (data.sourceId) seenEvents.add(data.sourceId); calls.events.push(data); },
      upsert: async ({ where, create }) => { if (!seenEvents.has(where.sourceId)) { seenEvents.add(where.sourceId); calls.events.push(create); } },
      findFirst: async ({ where }) => [...calls.events].reverse().find(event => event.name === where.name
        && (!where.accountId || event.accountId === where.accountId)) || null,
    },
  };
  const prisma = { ...db, $transaction: async callback => callback(db) };
  const stripe = {
    prices: { retrieve: async () => ({}) },
    customers: { create: async () => ({ id: 'cus_new' }), retrieve: async id => ({ id }) },
    checkout: { sessions: { create: async (params, options) => { calls.sessions.push({ params, options }); return { id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }; } } },
    webhooks: { constructEvent: body => body },
    ...stripeOverrides,
  };
  const app = express();
  app.use(express.json());
  const registration = registerInspect(app, {
    prisma, mail: { sendMail: async message => { calls.mail.push(message); } }, stripe,
    capiConfigured: true,
    queueCapi: async (name, payload) => { calls.capi.push({ name, value: payload.value, contentName: payload.contentName, eventId: payload.eventId }); },
    isCapiExcludedEmail: (email) => String(email || '').includes('+qa@'),
    env: {
      INSPECT_ENABLED: 'true', INSPECT_AUTH_SECRET: 'a'.repeat(32),
      INSPECT_R2_BUCKET: 'private', R2_BUCKET: 'public', R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
      STRIPE_MARKETEL_SECRET_KEY: 'sk_test_marketel',
      STRIPE_INSPECT_PRICE_ID: 'price_test', STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_INSPECT_PORTAL_CONFIGURATION_ID: 'bpc_test',
      ...envOverrides,
    },
  });
  const headers = { Authorization: `Bearer ${'b'.repeat(43)}`, 'Content-Type': 'application/json' };
  return { app, registration, calls, account, report, headers };
}

test('Manage subscription opens the default portal when the configured one is rejected', async () => {
  const portal = (reject) => {
    const seen = [];
    return { seen, billingPortal: { sessions: { create: async params => {
      seen.push(params);
      const error = reject(params);
      if (error) throw error;
      return { url: `https://billing.stripe.test/${params.configuration || 'default'}` };
    } } } };
  };
  const call = async h => {
    const response = await request(h.app, '/api/inspect/billing', { method: 'POST', headers: h.headers, body: JSON.stringify({ native: true }) });
    return { status: response.status, body: await response.json() };
  };
  const missing = Object.assign(new Error("No such configuration: 'bpc_replace_me'"), { type: 'StripeInvalidRequestError', code: 'resource_missing', param: 'configuration' });

  // The configured portal, when Stripe has it, and the app's way back.
  let stripe = portal(() => null);
  let h = moneyHarness({ stripe });
  try {
    const { status, body } = await call(h);
    assert.equal(status, 200);
    assert.equal(body.url, 'https://billing.stripe.test/bpc_test');
    assert.equal(stripe.seen[0].return_url, 'https://bookmarketel.com/inspect/checkout-return.html?status=billing');
  } finally { h.registration.close(); }

  // A placeholder or other-mode id used to surface as a generic failure.
  stripe = portal(params => (params.configuration ? missing : null));
  h = moneyHarness({ stripe });
  try {
    const { status, body } = await call(h);
    assert.equal(status, 200);
    assert.equal(body.url, 'https://billing.stripe.test/default');
    assert.equal(stripe.seen.length, 2);
    assert.equal(stripe.seen[1].customer, 'cus_1');
  } finally { h.registration.close(); }

  // If Stripe has no portal at all, they are told what to do instead.
  stripe = portal(params => (params.configuration ? missing : new Error('No configuration provided')));
  h = moneyHarness({ stripe });
  try {
    const { status, body } = await call(h);
    assert.equal(status, 503);
    assert.match(body.error, /support@bookmarketel\.com/);
  } finally { h.registration.close(); }

  // Any other Stripe failure is not papered over with the default.
  stripe = portal(() => Object.assign(new Error('No such customer'), { type: 'StripeInvalidRequestError', param: 'customer' }));
  h = moneyHarness({ stripe });
  try {
    assert.equal((await call(h)).status, 500);
    assert.equal(stripe.seen.length, 1);
  } finally { h.registration.close(); }
});

test('plans are unlimited everywhere they are described', () => {
  const fs = require('node:fs'), path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/inspect/inspect.js'), 'utf8');
  assert.doesNotMatch(client, /remaining this billing period|\$\{account\.remaining\} \$\{esc\(sk\.docPlural\)\} left|reports a month|PLANS\.(?:month|year)\.reports/);
  assert.match(client, /month:\[`\$\$\{PLANS\.month\.price\}\/month`,`Unlimited \$\{sk\.docPlural\}`\]/);
  // The export gate never sends a subscriber to the paywall.
  assert.match(client, /if\(canSend\(\)\)return finishExport\(action\);\s*\/\/[^\n]*\n\s*if\(account\?\.active\)return notice\(FAIR_USE_REACHED,'error'\);/);
  const terms = fs.readFileSync(path.join(__dirname, '../public/inspect/terms.html'), 'utf8');
  assert.match(terms, /\$25 USD per month or \$199 USD per year\. Both include unlimited finalized reports/);
  assert.match(terms, /fair use of 300 finalized reports per monthly billing period \(3,600 per yearly period\)/);
  assert.doesNotMatch(terms, /\$29/);
});

test('photos are dated on the copy everyone reads; the original is kept byte-for-byte', async () => {
  const sharp = require('sharp');
  const { S3Client } = require('@aws-sdk/client-s3');
  const puts = new Map();
  const send = S3Client.prototype.send;
  S3Client.prototype.send = async function (command) { if (command.input?.Body) puts.set(command.input.Key, Buffer.from(command.input.Body)); return {}; };
  const h = moneyHarness();
  try {
    const photo = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#d8d2c4' } }).jpeg().toBuffer();
    const form = new FormData();
    form.append('photo', new Blob([photo], { type: 'image/jpeg' }), 'p.jpg');
    form.append('source', 'camera');
    form.append('takenAt', new Date(Date.now() - 60000).toISOString());
    form.append('zone', 'America/Chicago');
    const response = await request(h.app, '/api/inspect/reports/rep_1/photos', { method: 'POST', headers: { Authorization: h.headers.Authorization }, body: form });
    assert.equal(response.status, 200);
    const original = [...puts].find(([key]) => key.endsWith('/original'))[1];
    assert.equal(Buffer.compare(original, photo), 0, 'the original is what was received');
    const display = [...puts].find(([key]) => key.endsWith('/display.jpg'))[1];
    // stats() reads the whole input, so the corner is cropped out first.
    const corner = async bytes => (await sharp(await sharp(bytes).extract({ left: 30, top: 830, width: 120, height: 40 }).toBuffer()).stats()).channels[0].mean;
    const meta = await sharp(display).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 900], 'the stamp never changes the size');
    assert.ok(await corner(display) < await corner(photo) - 40, 'the bottom-left carries the dated pill');
  } finally { S3Client.prototype.send = send; h.registration.close(); }
});

test('the stamp and the caption say when a photo was taken, honestly', () => {
  const { stampText, photoCaption, usDate } = require('../inspect');
  const taken = new Date(Date.UTC(2026, 8, 23, 1, 14));
  const received = new Date(Date.UTC(2026, 8, 23, 1, 15));
  assert.equal(stampText({ takenAt: taken.toISOString(), zone: 'America/Chicago', source: 'camera', receivedAt: received }), 'Sep 22, 2026 · 8:14 PM');
  // An import's own date cannot be trusted, so it carries the day it arrived.
  assert.equal(stampText({ takenAt: taken.toISOString(), zone: 'America/Chicago', source: 'import', receivedAt: received }), 'Imported · Sep 22, 2026');
  // A clock in the future, or a zone that does not exist, is not believed.
  assert.equal(stampText({ takenAt: new Date(received.getTime() + 3600000).toISOString(), zone: 'America/Chicago', source: 'camera', receivedAt: received }), 'Received · Sep 22, 2026');
  assert.equal(stampText({ takenAt: taken.toISOString(), zone: 'Mars/Base', source: 'camera', receivedAt: received }), 'Sep 23, 2026 · 1:14 AM UTC');
  const document = { photoTimes: { a1: { takenAt: taken.toISOString(), zone: 'America/Chicago' }, a2: { zone: 'America/Chicago' } } };
  assert.equal(photoCaption(document, { id: 'a1', source: 'camera', createdAt: received }), 'Taken Sep 22, 2026 at 8:14 PM · received by Marketel 8:15 PM');
  assert.equal(photoCaption(document, { id: 'a2', source: 'import', createdAt: received }), 'Imported · received by Marketel Sep 22, 2026 at 8:15 PM');
  assert.equal(usDate('2026-09-12'), 'Sep 12, 2026');
  // Only photos the document holds keep a time, and only values that parse.
  const kept = validateDocument({ propertyName: 'Pine', type: 'damage', date: '2026-09-22', author: 'Sam',
    rooms: [{ name: 'Bedroom', observation: '', photos: ['a1'] }],
    photoTimes: { a1: { takenAt: taken.toISOString(), zone: 'America/Chicago' }, stranger: { takenAt: taken.toISOString() }, a9: 'nope' } });
  assert.deepEqual(kept.photoTimes, { a1: { takenAt: taken.toISOString(), zone: 'America/Chicago' } });
});

test('a check-in is saved free: no allowance, no trial end, nothing to Meta, no name needed', async () => {
  const updates = [];
  const h = moneyHarness({
    account: { subscriptionStatus: 'trialing', stripeSubscriptionId: 'sub_trial', periodEnd: new Date(Date.now() + 86400000), metaAttribution: { fbp: 'fb.1.1700000000.1' } },
    report: { document: { propertyName: 'Pine Ave', type: 'check-in', date: '2026-09-12', author: '', rooms: [{ name: 'Bedroom', observation: '', issue: false, photos: ['p1'] }], signatures: [] } },
    stripe: { subscriptions: { update: async (id, params) => { updates.push({ id, params }); return { id }; } } },
  });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.equal(h.calls.accountUpdates.length, 0, 'nothing is spent');
    assert.deepEqual(updates, [], 'the trial is left alone');
    assert.equal(h.calls.capi.length, 0, 'Meta hears nothing');
    assert.ok(h.calls.events.some(e => e.name === 'CheckInSaved'));
    assert.ok(!h.calls.events.some(e => e.name === 'ReportFinalized'));
  } finally { h.registration.close(); }
});

test('a damage report links only to its own property\'s saved check-in', async () => {
  const checkIn = { finalizedAt: new Date(), propertyName: 'Pine Ave',
    document: { propertyName: 'Pine Ave', type: 'check-in', date: '2026-09-12', author: '', rooms: [{ name: 'Bedroom', observation: '', issue: false, photos: ['p1'] }], signatures: [] } };
  const body = extra => JSON.stringify({ propertyName: 'pine ave', type: 'damage', date: '2026-09-22', author: 'Sam', rooms: [{ name: 'Bedroom', observation: '', photos: [] }], ...extra });
  let h = moneyHarness({ report: checkIn });
  try {
    const response = await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers, body: body({ baselineReportId: 'rep_1' }) });
    assert.equal(response.status, 200);
    assert.equal(h.calls.reportsCreated[0].baselineReportId, 'rep_1');
    assert.equal((await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers,
      body: body({ propertyName: 'Oak Street', baselineReportId: 'rep_1' }) })).status, 400, 'another property\'s check-in is refused');
  } finally { h.registration.close(); }
  h = moneyHarness({ report: { ...checkIn, finalizedAt: null } });
  try {
    assert.equal((await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers, body: body({ baselineReportId: 'rep_1' }) })).status, 400, 'an unsaved check-in is refused');
  } finally { h.registration.close(); }
});

test('Moveout saves a free move-in baseline and links only the same unit to its departure report', async () => {
  const baseline = { finalizedAt: new Date(), propertyName: 'Unit A', document: {
    propertyName: 'Unit A', type: 'landlord-move-in', date: '2026-09-12', author: '',
    rooms: [{ name: 'Bedroom', observation: '', photos: ['p1'] }], signatures: [] } };
  const h = moneyHarness({ report: baseline });
  const body = extra => JSON.stringify({ propertyName: 'unit a', type: 'landlord-move-out', date: '2026-09-24',
    author: 'Sam', rooms: [{ name: 'Bedroom', observation: '', photos: [] }], ...extra });
  try {
    const saved = await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers,
      body: body({ baselineReportId: 'rep_1' }) });
    assert.equal(saved.status, 200);
    assert.equal(h.calls.reportsCreated[0].baselineReportId, 'rep_1');
    assert.equal((await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers,
      body: body({ propertyName: 'Unit B', baselineReportId: 'rep_1' }) })).status, 400);
    assert.equal((await request(h.app, '/api/inspect/reports', { method: 'POST', headers: h.headers,
      body: JSON.stringify({ ...JSON.parse(body({ baselineReportId: 'rep_1' })), type: 'damage' }) })).status, 400);
  } finally { h.registration.close(); }
  const free = moneyHarness({ report: { ...baseline, finalizedAt: null } });
  try {
    const response = await request(free.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: free.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.equal(free.calls.accountUpdates.length, 0);
    assert.ok(free.calls.events.some(event => event.name === 'MoveInSaved'));
  } finally { free.registration.close(); }
});

test('properties know their last check-in, counted apart from reports', async () => {
  const h = moneyHarness({ report: { finalizedAt: new Date(),
    document: { propertyName: 'Pine Ave', type: 'check-in', date: '2026-09-12', author: '', rooms: [{ name: 'Bedroom', photos: ['p1', 'p2'] }, { name: 'Kitchen', photos: ['p3'] }], signatures: [] } } });
  try {
    const response = await request(h.app, '/api/inspect/properties', { headers: h.headers });
    const [pine] = (await response.json()).propertyDetails;
    assert.deepEqual({ reportCount: pine.reportCount, checkInCount: pine.checkInCount, latestCheckIn: pine.latestCheckIn },
      { reportCount: 0, checkInCount: 1, latestCheckIn: { id: 'rep_1', date: '2026-09-12', photoCount: 3 } });
  } finally { h.registration.close(); }
});

test('a shared damage report shows each finding against the check-in of the same room, with its times', async () => {
  const received = new Date(Date.UTC(2026, 8, 23, 1, 15));
  const h = moneyHarness({ report: { finalizedAt: new Date(), shareHash: 'x',
    attachments: [{ id: 'p1', source: 'camera', createdAt: received }],
    document: { propertyName: 'Pine Ave', type: 'damage', date: '2026-09-22', author: 'Sam', signatures: [],
      rooms: [{ name: 'Bedroom', observation: 'Hole in the wall.', issue: true, photos: ['p1'] }, { name: 'Hallway', observation: 'Scuff.', issue: true, photos: [] }],
      photoTimes: { p1: { takenAt: new Date(received.getTime() - 60000).toISOString(), zone: 'America/Chicago' } } },
    baselineReport: { attachments: [{ id: 'b1', source: 'camera', createdAt: new Date(Date.UTC(2026, 8, 12, 20)) }],
      document: { propertyName: 'Pine Ave', type: 'check-in', date: '2026-09-12', author: '', signatures: [],
        rooms: [{ name: 'bedroom', observation: '', photos: ['b1'] }, { name: 'Kitchen', observation: '', photos: [] }] } } } });
  try {
    const html = await (await request(h.app, `/api/inspect/shared/${'a'.repeat(43)}`, {})).text();
    assert.match(html, /Compared with:<\/strong> the check-in on Sep 12, 2026/);
    assert.equal((html.match(/Before · check-in Sep 12, 2026/g) || []).length, 1, 'only the room with the same name gets a before');
    assert.match(html, /compare-label">After</);
    assert.match(html, /Taken Sep 22, 2026 at 8:14 PM · received by Marketel 8:15 PM/);
    assert.doesNotMatch(html, /Upload date recorded separately|No observation recorded\.<\/p><figure><img alt="Recorded property condition" src="[^"]*\/b1"/);
  } finally { h.registration.close(); }
  const server = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  assert.match(server, /doc\.fontSize\(9\)\.text\(photoCaption\(report\.document, a\)\)/, 'the PDF uses the same caption');
  assert.doesNotMatch(server, /Uploaded \$\{a\.createdAt\.toISOString\(\)\}/);
});

test('the app dates photos, keeps check-ins with their property, and shows the before', () => {
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  assert.match(client, /if\(f\.takenAt\)form\.append\('takenAt',f\.takenAt\);\s*form\.append\('zone',f\.zone\|\|PHONE_ZONE\);/);
  assert.match(client, /draft\.files\.push\(\{id,blob,source:'camera',name:`camera-\$\{id\}\.jpg`,takenAt:new Date\(\)\.toISOString\(\),zone:PHONE_ZONE\}\)/);
  assert.match(client, /return \{\.\.\.draft\.document,photoTimes:times,rooms:/);
  assert.deepEqual(require('../wedges/claims').listTypes, ['damage']);
  assert.match(client, /const toolTypesQuery = \(\) => `types=\$\{TOOL_LIST_TYPES\[toolId\(\)\]\.join\(','\)\}`;/);
  assert.match(client, /data-baseline="\$\{index\}"/);
  assert.equal(require('../wedges/claims').types['check-in'].baselineSave, 'Save check-in');
  assert.match(client, /baselineReportId:draft\.baselineId/);
  assert.match(client, /data-ask-name="\$\{esc\(name\)\}"/);
  assert.match(client, /if\(cameraAsk\|\|cameraBefore\)return;/);
  assert.match(client, /hudShell\(\)&&!photosOnly\?/);
  assert.match(client, /Shots land here, each one dated\./);
});

test('someone who keeps using Marketel stays signed in', async () => {
  const h = moneyHarness();
  try {
    // The harness session was due to end in a minute; using it extends it.
    assert.equal((await request(h.app, '/api/inspect/account', { headers: h.headers })).status, 200);
    assert.equal(h.calls.sessionExtensions, 1);
    // Extended at most once a day: the next request leaves it alone.
    assert.equal((await request(h.app, '/api/inspect/account', { headers: h.headers })).status, 200);
    assert.equal(h.calls.sessionExtensions, 1);
  } finally { h.registration.close(); }
  const server = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  assert.match(server, /const SESSION_DAYS = 90;/);
  // Nothing a Claims user can see says "Inspect" any more.
  for (const stale of ['Please sign in to Inspect', 'Inspect could not complete', 'Inspect billing is not configured', 'That Inspect plan', 'Inspect is not available yet']) {
    assert.ok(!server.includes(stale), stale);
  }
});

test('receipts and quotes are kept with their finding, never date-stamped, and shown apart', async () => {
  const doc = validateDocument({ propertyName: 'Pine', type: 'damage', date: '2026-09-22', author: 'Sam', checkoutDate: '2026-09-21',
    rooms: [{ name: 'Bathroom', observation: '', photos: ['p1'], receipts: ['q1'] }] });
  assert.deepEqual(doc.rooms[0].receipts, ['q1']);
  assert.equal(doc.checkoutDate, '2026-09-21');
  assert.throws(() => validateDocument({ propertyName: 'Pine', type: 'damage', date: '2026-09-22', author: 'Sam', checkoutDate: '2026-02-31', rooms: [{ name: 'B', observation: '', photos: [] }] }), /check-out date/);
  assert.throws(() => validateDocument({ propertyName: 'Pine', type: 'damage', date: '2026-09-22', author: 'Sam', rooms: [{ name: 'B', observation: '', photos: ['p1'], receipts: ['p1'] }] }), /duplicate/);
  const received = new Date(Date.UTC(2026, 8, 23, 1, 15));
  const h = moneyHarness({ report: { finalizedAt: new Date(), shareHash: 'x',
    attachments: [{ id: 'p1', source: 'camera', createdAt: received }, { id: 'q1', source: 'import', createdAt: received }],
    document: { propertyName: 'Pine Ave', type: 'damage', date: '2026-09-22', checkoutDate: '2026-09-21', author: 'Sam', signatures: [],
      rooms: [{ name: 'Bathroom', observation: 'Holder torn off.', issue: true, photos: ['p1'], receipts: ['q1'] }] } } });
  try {
    const html = await (await request(h.app, `/api/inspect/shared/${'a'.repeat(43)}`, {})).text();
    assert.match(html, /<h3>Receipts &amp; estimates<\/h3><figure><img alt="Receipt or estimate" src="[^"]*\/photos\/q1">/);
    assert.match(html, /Guest checked out Sep 21, 2026/);
    assert.doesNotMatch(html, /Issue noted/, 'every finding on a damage report is damage');
  } finally { h.registration.close(); }
  const server = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  assert.match(server, /if \(req\.body\.kind !== 'receipt'\) bytes = await stampPhoto\(/, 'a receipt is a document, not a scene');
  assert.match(server, /const kept = new Set\(document\.rooms\.flatMap\(r => \[\.\.\.r\.photos, \.\.\.\(r\.receipts \|\| \[\]\)\]\)\);/, 'saving never throws a receipt away');
});

test('a property can be added on its own, and deleted with its reports', async () => {
  const h = moneyHarness();
  const call = async (method, body) => {
    const response = await request(h.app, '/api/inspect/properties', { method, headers: h.headers, body: body && JSON.stringify(body) });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  try {
    let response = await call('GET');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.propertyDetails.map(p => [p.name, p.reportCount]), [['Pine Ave', 1]]);

    // Added without starting a report, trimmed, sorted in, and never doubled.
    response = await call('POST', { name: '  Oak Street · Unit 2 ' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.properties, ['Oak Street · Unit 2', 'Pine Ave']);
    response = await call('POST', { name: 'Oak Street · Unit 2' });
    assert.deepEqual(response.body.properties, ['Oak Street · Unit 2', 'Pine Ave']);
    assert.equal((await call('POST', { name: '   ' })).status, 400);
    assert.equal((await call('POST', { name: 'x'.repeat(161) })).status, 400);

    // A property with no reports goes on its own.
    response = await call('DELETE', { name: 'Oak Street · Unit 2' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.deletedReportIds, []);
    assert.deepEqual(response.body.properties, ['Pine Ave']);
    assert.deepEqual(h.calls.garbage, []);

    // One a report names takes the report with it, photos queued for removal,
    // and only this account's reports are touched.
    response = await call('DELETE', { name: 'Pine Ave' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.deletedReportIds, ['rep_1']);
    assert.deepEqual(response.body.properties, []);
    assert.deepEqual(h.calls.garbage, [{ objectKey: 'photos/p1' }, { objectKey: 'originals/p1' }]);
    assert.equal(h.calls.reportDeletes[0].accountId, 'acct_1');
  } finally { h.registration.close(); }
});

test('the Properties page adds and deletes a property itself, and names it properly', () => {
  const fs = require('node:fs'), path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/inspect/inspect.js'), 'utf8');
  // "+ New propertie" came from stripping an s off the heading.
  assert.doesNotMatch(client, /placesHeading\.replace\(/);
  assert.match(client, /\+ New \$\{esc\(sk\.placeSingular\)\}/);
  assert.equal(require('../wedges/claims').skin.placeSingular, 'property');
  assert.equal(require('../wedges/incident').skin.placeSingular, 'location');
  // Adding one opens its own sheet; it no longer starts a damage report.
  assert.match(client, /\$\('new-property'\)\.onclick=\(\)=>\{haptic\(\);newProperty\(\);\}/);
  assert.match(client, /function newProperty\(\)[\s\S]{0,1400}api\('\/properties',\{method:'POST'/);
  assert.match(client, /async function deleteProperty[\s\S]{0,900}confirmAction[\s\S]{0,700}api\('\/properties',\{method:'DELETE'/);
});

test('a new report asks where, not for a photo, and stays on the New Report tab', () => {
  const fs = require('node:fs'), path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/inspect/inspect.js'), 'utf8');
  assert.doesNotMatch(client, /setup-photo|photoLabel/);
  assert.match(client, /flowScreen\('','setup-screen',\{page:'current'\}\)/);
  assert.match(client, /function flowScreen\(content,kind='',\{page\}=\{\}\)[\s\S]{0,200}setActiveNav\(page\)/);
});

test('signing in replaces the landing at once and waits on the one reports request', () => {
  const fs = require('node:fs'), path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/inspect/inspect.js'), 'utf8');
  const home = client.slice(client.indexOf('async function openAccountHome(){'), client.indexOf('$(\'account-button\').onclick'));
  assert.ok(home.indexOf('is-arriving') > -1 && home.indexOf('is-arriving') < home.indexOf('await'), 'the loading state is painted before anything is awaited');
  assert.match(home, /reportsLoading/);
  assert.equal((client.match(/signedInAt=Date\.now\(\)/g) || []).length, 2, 'both sign-in paths stamp the moment');
});

test('checkout and billing leave the app for the browser, and the return is always re-read', () => {
  const fs = require('node:fs'), path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/inspect/inspect.js'), 'utf8');
  assert.doesNotMatch(client, /openExternal\((?:r\.url|\(await api\('\/billing')/);
  assert.equal((client.match(/openPurchase\((?:r\.url|\(await api\('\/billing')/g) || []).length, 4);
  assert.match(client, /const back=purchaseAway;purchaseAway=false;\s*if\(!back&&Date\.now\(\)-lastForegroundSync<60000\)return;/);
  const page = fs.readFileSync(path.join(__dirname, '../public/inspect/checkout-return.html'), 'utf8');
  assert.match(page, /href="com\.bookmarketel\.frontdesk:\/\/return"/);
  assert.match(page, /<script src="\/inspect\/checkout-return\.js"><\/script>/);
  const script = fs.readFileSync(path.join(__dirname, '../public/inspect/checkout-return.js'), 'utf8');
  for (const status of ['success', 'cancelled', 'billing']) assert.match(script, new RegExp(`${status}: \\[`));
});

test('a single Claims report is sold once, at the price the page shows, and returns to Claims', async () => {
  const h = moneyHarness();
  try {
    const response = await request(h.app, '/api/inspect/checkout', { method: 'POST', headers: h.headers, body: JSON.stringify({ interval: 'report', reportId: 'rep_1' }) });
    assert.equal(response.status, 200);
    const { params, options } = h.calls.sessions[0];
    assert.equal(params.mode, 'payment');
    assert.deepEqual(params.line_items, [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 1200, product_data: { name: 'Marketel Claims report' } } }]);
    assert.deepEqual(params.metadata, { product: 'marketel-inspect-report', inspectAccountId: 'acct_1', reportId: 'rep_1', tool: 'claims' });
    assert.equal(params.success_url, 'https://bookmarketel.com/claims?checkout=success&report=rep_1&session={CHECKOUT_SESSION_ID}');
    assert.match(options.idempotencyKey, /^inspect-report-checkout:acct_1:rep_1:web:/);
    assert.ok(h.calls.events.some(event => event.name === 'CheckoutStarted' && event.tool === 'claims' && event.detail === 'report'));
  } finally { h.registration.close(); }

  // Every tool sells a single report now, at the same impulse price. A
  // first-free tool still gives the first one away — that is offerMode, which
  // is independent of whether the next one can be bought outright — but the
  // wall after it is $12 rather than a monthly subscription.
  const inspect = moneyHarness({ report: { document: { propertyName: 'Oak', type: 'routine', date: '2026-09-19', author: 'Sam', rooms: [], signatures: [] } } });
  try {
    const response = await request(inspect.app, '/api/inspect/checkout', { method: 'POST', headers: inspect.headers, body: JSON.stringify({ interval: 'report', reportId: 'rep_1' }) });
    assert.equal(response.status, 200);
    assert.equal(inspect.calls.sessions.length, 1);
    const line = inspect.calls.sessions[0].params.line_items[0];
    assert.equal(line.price_data.unit_amount, 1200);
    assert.match(line.price_data.product_data.name, /Marketel Inspect report/);
  } finally { inspect.registration.close(); }

  // The guard that refuses an unpriced tool still exists, so adding a tool
  // without a price cannot silently invent one.
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  assert.match(src, /if \(!amount\) throw fail\(400, 'Single reports are not sold for this tool\.'\)/);
});

test('a customer id from the other Stripe mode is replaced, not a dead end', async () => {
  const retrieved = [];
  const h = moneyHarness({
    account: { stripeCustomerId: 'cus_from_live_mode' },
    stripe: { customers: {
      retrieve: async id => { retrieved.push(id); const error = new Error(`No such customer: ${id}`); error.code = 'resource_missing'; throw error; },
      create: async () => ({ id: 'cus_test_new' }),
    } },
  });
  try {
    const response = await request(h.app, '/api/inspect/checkout', { method: 'POST', headers: h.headers, body: JSON.stringify({ interval: 'report', reportId: 'rep_1' }) });
    assert.equal(response.status, 200);
    assert.deepEqual(retrieved, ['cus_from_live_mode']);
    // The unusable id is cleared, a fresh customer is stored, checkout proceeds.
    assert.ok(h.calls.accountUpdates.some(update => update.stripeCustomerId === null));
    assert.ok(h.calls.accountUpdates.some(update => update.stripeCustomerId === 'cus_test_new'));
    assert.equal(h.calls.sessions.length, 1);
  } finally { h.registration.close(); }
});

test('a paid single report grants exactly one credit, however often Stripe delivers it', async () => {
  const h = moneyHarness();
  const event = { type: 'checkout.session.completed', created: 1760000000, data: { object: {
    id: 'cs_paid', mode: 'payment', payment_status: 'paid', amount_total: 1200, currency: 'usd',
    metadata: { product: 'marketel-inspect-report', inspectAccountId: 'acct_1', reportId: 'rep_1', tool: 'claims' } } } };
  try {
    for (let delivery = 0; delivery < 3; delivery++) {
      const response = await request(h.app, '/api/inspect-stripe-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(event) });
      assert.equal(response.status, 200);
    }
    assert.equal(h.account.reportCredits, 1);
    assert.equal(h.calls.events.filter(e => e.name === 'PaymentSucceeded' && e.detail === 'report' && e.tool === 'claims').length, 1);
    // An unpaid session grants nothing.
    const unpaid = { ...event, data: { object: { ...event.data.object, id: 'cs_unpaid', payment_status: 'unpaid' } } };
    await request(h.app, '/api/inspect-stripe-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(unpaid) });
    assert.equal(h.account.reportCredits, 1);
  } finally { h.registration.close(); }
});

test('returning from Stripe confirms its own payment, for its own account only', async () => {
  const paid = { id: 'cs_return_1', mode: 'payment', payment_status: 'paid', amount_total: 1200, currency: 'usd',
    metadata: { product: 'marketel-inspect-report', inspectAccountId: 'acct_1', reportId: 'rep_1', tool: 'claims' } };
  const sessions = { cs_return_1: paid, cs_someone_else: { ...paid, id: 'cs_someone_else', metadata: { ...paid.metadata, inspectAccountId: 'acct_2' } } };
  const h = moneyHarness({ stripe: { checkout: { sessions: { retrieve: async id => sessions[id] } } } });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(h.app, '/api/inspect/checkout/confirm', { method: 'POST', headers: h.headers, body: JSON.stringify({ sessionId: 'cs_return_1' }) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).credits, 1);
    }
    await request(h.app, '/api/inspect/checkout/confirm', { method: 'POST', headers: h.headers, body: JSON.stringify({ sessionId: 'cs_someone_else' }) });
    assert.equal(h.account.reportCredits, 1);
    const invalid = await request(h.app, '/api/inspect/checkout/confirm', { method: 'POST', headers: h.headers, body: JSON.stringify({ sessionId: 'not-a-session' }) });
    assert.equal(invalid.status, 400);
  } finally { h.registration.close(); }
});

test('finalizing spends the right allowance for each tool and snapshots the business', async () => {
  // Claims is pay-at-export: the lifetime free report does not apply.
  let h = moneyHarness();
  try {
    const refused = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(refused.status, 402);
    assert.equal(h.calls.freeClaims, 0);
  } finally { h.registration.close(); }

  h = moneyHarness({ account: { reportCredits: 1 } });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(h.calls.accountUpdates.at(-1), { reportCredits: { decrement: 1 } });
    const body = await response.json();
    assert.deepEqual(body.document.business, { name: 'Pine Stays', logoKey: 'inspect/logos/acct_1/a.png' });
  } finally { h.registration.close(); }

  // A plan's allowance is spent before a purchased credit.
  h = moneyHarness({ account: { reportCredits: 1, subscriptionStatus: 'active', periodEnd: new Date(Date.now() + 86400000), freeReportUsed: true } });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(h.calls.accountUpdates.at(-1), { reportsUsed: { increment: 1 } });
  } finally { h.registration.close(); }

  // A subscriber at the fair-use ceiling is told how to have it lifted, never
  // sold anything; a credit they bought is still spent before that.
  const ceiling = { subscriptionStatus: 'active', periodEnd: new Date(Date.now() + 86400000), freeReportUsed: true, reportsUsed: 300 };
  h = moneyHarness({ account: ceiling });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 402);
    assert.match((await response.json()).error, /fair-use limit[\s\S]*support@bookmarketel\.com/);
  } finally { h.registration.close(); }
  h = moneyHarness({ account: { ...ceiling, reportCredits: 1 } });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(h.calls.accountUpdates.at(-1), { reportCredits: { decrement: 1 } });
  } finally { h.registration.close(); }

  // Inspect keeps its lifetime free report.
  h = moneyHarness({ report: { document: { propertyName: 'Oak', type: 'routine', date: '2026-09-19', author: 'Sam', rooms: [{ name: 'Kitchen', observation: '', issue: false, photos: ['p1'] }], signatures: [] } } });
  try {
    const response = await request(h.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(h.calls.accountUpdates.at(-1), { freeReportUsed: true });
    assert.equal(h.calls.freeClaims, 1);
  } finally { h.registration.close(); }
});

test('asking to send a report is what Meta hears, when a purchase cannot be', async () => {
  const h = moneyHarness();
  try {
    const seen = await request(h.app, '/api/inspect/events', { method: 'POST', headers: h.headers, body: JSON.stringify({ name: 'ExportOfferViewed', tool: 'claims', visitorId: 'v_abcdef123456' }) });
    assert.equal(seen.status, 200);
    const sent = h.calls.capi.filter(e => e.name === 'AddToCart');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].value, 12);
    assert.match(sent[0].contentName, /Marketel Claims ready to send/);
    // Reopening the sheet in the same hour carries the same event id, so Meta
    // counts one intent however many times the sheet is opened.
    await request(h.app, '/api/inspect/events', { method: 'POST', headers: h.headers, body: JSON.stringify({ name: 'ExportOfferViewed', tool: 'claims' }) });
    assert.equal(new Set(h.calls.capi.map(e => e.eventId)).size, 1);
    // A step that is not the offer stays internal.
    await request(h.app, '/api/inspect/events', { method: 'POST', headers: h.headers, body: JSON.stringify({ name: 'ReportRevealed', tool: 'claims' }) });
    assert.equal(h.calls.capi.filter(e => e.name === 'AddToCart').length, 2);
  } finally { h.registration.close(); }
});

test('a test run from the owner mailbox never reaches Meta', () => {
  const fs = require('node:fs');
  const server = fs.readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
  // Plus-aliases are the same mailbox, so a +claims1 test purchase is excluded too.
  assert.match(server, /function normalizeExcludedEmail/);
  assert.match(server, /isCapiExcludedEmail: \(email\) => FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS\.includes\(\s*normalizeExcludedEmail\(email\)/);
  assert.match(server, /'samatarsalahudeen@gmail\.com',/);
});

test('the landing email is a lead once, reveals nothing, and ladder events keep only safe detail', async () => {
  const h = moneyHarness();
  try {
    const lead = { email: 'New@Example.com', tool: 'claims', visitorId: 'v_abcdef123456' };
    const first = await request(h.app, '/api/inspect/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { success: true });
    await request(h.app, '/api/inspect/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    assert.equal(h.calls.events.filter(e => e.name === 'LeadFirst').length, 1);
    assert.ok(h.calls.events.some(e => e.name === 'LeadCaptured' && e.tool === 'claims' && e.visitorId === 'v_abcdef123456'));
    const bad = await request(h.app, '/api/inspect/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nope' }) });
    assert.equal(bad.status, 400);

    const declined = await request(h.app, '/api/inspect/events/anon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'OfferDeclined', tool: 'claims', visitorId: 'v_abcdef123456', detail: 'too_expensive' }) });
    assert.equal(declined.status, 200);
    await request(h.app, '/api/inspect/events/anon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'OfferDeclined', tool: 'nowhere', visitorId: 'bad id', detail: '<script>' }) });
    const decline = h.calls.events.filter(e => e.name === 'OfferDeclined');
    assert.deepEqual(decline.map(e => [e.tool, e.visitorId, e.detail]), [['claims', 'v_abcdef123456', 'too_expensive'], ['inspect', null, null]]);
  } finally { h.registration.close(); }
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

test('a damage report is findings, and the capture screen is the recording', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
  const companion = client.slice(client.indexOf('function cameraCompanion('), client.indexOf('window.marketelInspectCameraOpened'));

  // Claims counts findings; Inspect and Incident still walk rooms, because
  // comparisons match by room name and coverage is per room.
  assert.equal(require('../wedges/claims').types.damage.unit, 'entry');
  assert.match(server, /unit: item\.types\[item\.listTypes\[0\]\]\.unit/);
  for (const tool of ['inspect', 'incident']) assert.equal(require('../wedges/'+tool).types[require('../wedges/'+tool).listTypes[0]].unit, 'room');
  assert.match(client, /rooms: \[\{ name: entryTool\(type\) \? '' : wedge\(type\)\.seeds\[0\]/);

  // An unnamed entry keeps its empty name through validation and is numbered
  // where it is read, so no document claims a location nobody gave.
  assert.doesNotMatch(server, /text\(room\.name, 100\) \|\| 'Room'/);
  assert.match(server, /const entryHeading = \(room, index\) => room\.name \|\| `Finding \$\{index \+ 1\}`/);
  assert.match(client, /const entryLabel = \(room, index\) => room\?\.name \|\| `Finding \$\{index \+ 1\}`/);
  for (const renderer of ['roomHtml', 'appendPdfRoom']) assert.ok(server.includes(`${renderer}`) && server.includes('entryHeading('), `${renderer} does not number an unnamed entry`);

  // The capture screen is the words and the photographs. Nothing instructs.
  assert.doesNotMatch(client, /shots:|shotStep|data-shot/);
  assert.match(companion, /hud-note/);
  assert.match(companion, /id="hud-talk"/);
  // Adding one is a chip beside the rooms now, not a wide button, and nothing
  // in the capture screen invents a "Finding 2" to label it with.
  assert.match(companion, /id="hud-next" class="camera-room is-add">\+ another room/);
  assert.doesNotMatch(companion, /Next \$\{esc\(entries/);
  // Dictation writes the speaker's own words, with nothing uploaded from here.
  assert.match(client, /if\(hudDictation&&draft\?\.document\?\.rooms\[hudDictation\.index\]/);
  assert.match(client, /if\(hudDictation\)\{hudDictation=null;/);
});

test('on the web a photograph asks what it is, before anything else', () => {
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const screen = client.slice(client.indexOf('function entryScreen('), client.indexOf('// One step visible at a time'));
  // Adding a photo on the web opens the finding it just filled.
  assert.match(client, /if\(entryTool\(\)&&!native&&cameraRoom===null\)return entryScreen\(i\)/);
  assert.match(screen, /What is this\?/);
  assert.match(screen, /id="entry-text"/);
  assert.match(screen, /Add another photo/);
  // Recording is only offered where it can work: it needs an account.
  assert.match(screen, /\$\{session\?`<button type="button" class="secondary wide" data-voice/);
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
  assert.match(client, /Object\.entries\(MANIFESTS\)\.map\(\(\[id, item\]\) => \[id, Object\.keys\(item\.types\)\]\)/);
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

test('the cold offer leads with the single report and hides the year until it means something', () => {
    const fsx = require('node:fs'), pathx = require('node:path');
    const root = pathx.join(__dirname, '..');
    const client = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'inspect.js'), 'utf8');
    const server = fsx.readFileSync(pathx.join(root, 'inspect.js'), 'utf8');

    // A cold click is an impulse and an impulse does not sign up for a year.
    // Run the real ordering rather than asserting on its spelling.
    const offer = client.slice(client.indexOf('async function exportOffer'), client.indexOf('function resumePendingExport'));
    const body = offer.slice(offer.indexOf('const available='), offer.indexOf('let choice='));
    const build = new Function('accountPlans', 'priorReports', 'price', 'PLANS', `
        const account = { plans: accountPlans, priorReports };
        const reportPrice = () => price;
        const sk = { doc: 'report', docPlural: 'reports' };
        ${body}
        return { options, label };`);
    const PLANS = { year: { price: 199 }, month: { price: 25 } };

    // Claims, cold: the single report first and selected, no year anywhere.
    const cold = build(['year', 'month'], 0, 12, PLANS);
    assert.deepEqual(cold.options, ['report', 'month']);
    assert.equal(cold.options[0], 'report', 'the default is options[0]');
    assert.equal(cold.label.report[0], '$12');
    assert.equal(cold.label.month[0], '$25/month');
    // A plan is unlimited, so it is never sold as a number of reports.
    assert.equal(cold.label.month[1], 'Unlimited reports');

    // Finishing one is the first evidence the need recurs, and only then is a
    // year a real offer — framed by the arithmetic, not a percentage.
    const repeat = build(['year', 'month'], 1, 12, PLANS);
    assert.deepEqual(repeat.options, ['report', 'month', 'year']);
    assert.match(repeat.label.year[1], /^Unlimited reports · the price of 17 single ones$/);

    // A first-free tool sells no single report, and still offers its plans.
    assert.deepEqual(build(['year', 'month'], 1, 0, PLANS).options, ['month', 'year']);
    // And a year-only configuration must never produce an empty sheet.
    assert.deepEqual(build(['year'], 0, 0, PLANS).options, ['year']);

    // $25 is the same number on both sides of the wire, and the guard that
    // refuses a mispriced Stripe object names it.
    assert.match(server, /month: Object\.freeze\(\{ interval: 'month', amount: 2500/);
    assert.match(server, /must be USD 25 per month/);
    assert.match(client, /month: Object\.freeze\(\{ price: 25/);
    // Monthly leads everywhere a price is shown, not just here.
    assert.match(client, /let planInterval = 'month'/);

    // priorReports cannot be derived from the account row: reportsUsed stays
    // at zero for a credit-funded finalize and freeReportUsed is never set by
    // a pay-at-export tool. It counts finished documents only.
    assert.match(server, /const priorReports = accountId => prisma\.inspectReport\.count\(\{ where: \{ accountId, finalizedAt: \{ not: null \} \} \}\)/);
    assert.equal(server.split('priorReports: await priorReports(').length - 1, 3,
        'the account route and both auth payloads must carry it');
});

// A ${...} inside a plain string never runs; it ships to the screen as source
// text. A regex cannot find these — an apostrophe in prose and a ${} inside an
// HTML attribute in a template literal both defeat it, and a character class
// like /[&<>"']/ desynchronises a naive scan for the rest of the file. So walk
// the context stack: quotes, backticks, template expressions, comments and
// regex literals each nest properly.
function rawInterpolations(src) {
  const bad=[], stack=[]; const top=()=>stack[stack.length-1];
  let line=1, prev='';
  const REGEX_OK=new Set(['','(',',','=',':','[','!','&','|','?','{','}',';','+','-','*','%','~','^','<','>','\n']);
  for(let i=0;i<src.length;i++){
    const c=src[i], n=src[i+1];
    if(c==='\n'){line++; if(!top())prev='\n'; continue;}
    const t=top();
    if(t==='sq'||t==='dq'){
      if(c==='\\'){i++;continue;}
      if(c==='$'&&n==='{')bad.push({line,near:src.slice(i,i+40)});
      if((t==='sq'&&c==="'")||(t==='dq'&&c==='"')){stack.pop();prev=c;}
      continue;
    }
    if(t==='tpl'){
      if(c==='\\'){i++;continue;}
      if(c==='`'){stack.pop();prev=c;continue;}
      if(c==='$'&&n==='{'){stack.push('expr');i++;prev='{';}
      continue;
    }
    if(t==='re'){
      if(c==='\\'){i++;continue;}
      if(c==='['){stack.push('recls');continue;}
      if(c==='/'){stack.pop();prev='/';}
      continue;
    }
    if(t==='recls'){ if(c==='\\'){i++;continue;} if(c===']')stack.pop(); continue; }
    if(/\s/.test(c))continue;
    if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++;line++;continue;}
    if(c==='/'&&n==='*'){i+=2;while(i<src.length&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++;}i++;continue;}
    if(c==='/'&&REGEX_OK.has(prev)){stack.push('re');continue;}
    if(c==="'")stack.push('sq');
    else if(c==='"')stack.push('dq');
    else if(c==='`')stack.push('tpl');
    // Braces inside an interpolation — destructuring, object literals — must
    // nest, or the first `}` closes the expression early and desyncs the rest
    // of the file. Tracked only there, so top-level scanning is unchanged.
    else if(c==='{'&&(top()==='expr'||top()==='brace'))stack.push('brace');
    else if(c==='}'&&(top()==='expr'||top()==='brace'))stack.pop();
    prev=c;
  }
  return bad;
}

test('every tool sells a single report, and the free first one survives it', () => {
    const fsx=require('node:fs'), pathx=require('node:path');
    const root=pathx.join(__dirname,'..');
    const server=fsx.readFileSync(pathx.join(root,'inspect.js'),'utf8');
    const client=fsx.readFileSync(pathx.join(root,'public','inspect','inspect.js'),'utf8');

    // The offer used to hang off the landing arm, but /inspect/ has no arm
    // entry — landingArm() is null there — so Inspect could never be priced.
    // It belongs to the tool, beside the types.
    assert.match(client, /const TOOL_OFFERS = Object\.fromEntries/);
    assert.match(client, /const payAtExport = \(\) => toolOffer\(\)\.mode === 'pay-at-export'/);
    assert.match(client, /const reportPrice = \(\) => toolOffer\(\)\.reportPrice \|\| 0/);
    assert.doesNotMatch(client, /landingArm\(\)\?\.offer/);

    const manifests=require('../wedges/registry').load().all;
    assert.match(server, /WEDGE_REGISTRY\.all\.map/);
    assert.match(client, /Object\.entries\(MANIFESTS\)\.map/);
    assert.deepEqual(Object.fromEntries(manifests.map(w=>[w.id,w.offer.mode])), {claims:'pay-at-export',incident:'first-free',inspect:'first-free',moveout:'pay-at-export'});
    assert.ok(manifests.every(w=>w.offer.reportPrice===12));

    // offerMode is independent of the price. A first-free tool still gives the
    // first report away; what changed is that the wall after it is $12 rather
    // than a monthly subscription — the shape that sold nothing on booking.
    assert.equal(require('../wedges/inspect').offer.mode, 'first-free');
    assert.equal(require('../wedges/incident').offer.mode, 'first-free');
    assert.equal(require('../wedges/claims').offer.mode, 'pay-at-export');
    assert.match(client, /\(!payAtExport\(\) && account\.freeAvailable\)/,
        'the free first report must not depend on the tool being unpriced');
    // Finalize spends the free report first, then plan allowance, then a
    // bought credit — credits work for a first-free tool too.
    assert.match(server, /offerMode === 'first-free' && access\.freeAvailable \? \{ freeReportUsed: true \}[\s\S]{0,200}reportCredits: \{ decrement: 1 \}/);
});

test('a report can say where it was made, without claiming more than it knows', () => {
    const fsx=require('node:fs'), pathx=require('node:path');
    const root=pathx.join(__dirname,'..');
    const server=fsx.readFileSync(pathx.join(root,'inspect.js'),'utf8');
    const client=fsx.readFileSync(pathx.join(root,'public','inspect','inspect.js'),'utf8');
    const shell=fsx.readFileSync(pathx.join(root,'..','marketel-frontdesk-ios','ios','App','App','Info.plist'),'utf8');
    const serverJs=fsx.readFileSync(pathx.join(root,'server.js'),'utf8');

    // Run the real validator rather than asserting on its spelling.
    const block=server.slice(server.indexOf('const LOCATION_ACCURACY_LIMIT'), server.indexOf('function stampSignatures'));
    const failLocal=(code,message)=>Object.assign(new Error(message),{status:code});
    const {validateFix,stampLocation}=new Function('fail', block+'; return {validateFix,stampLocation};')(failLocal);
    const T0=new Date('2026-09-20T21:02:00Z'), T1=new Date('2026-09-20T22:41:00Z');
    const fix={lat:41.8781234567,lon:-87.6298123,accuracy:8.4};

    // The time is ours. A client-supplied clock is not evidence of anything,
    // which is why signatures are stamped server-side for the same reason.
    assert.equal(validateFix({...fix,at:'1999-01-01T00:00:00.000Z'},T0).at, T0.toISOString());
    assert.equal(validateFix(fix,T0).lat, 41.878123, 'six decimal places is ~0.1 m; more is false precision');

    // A fix vaguer than two kilometres says nothing about being at a property.
    assert.equal(validateFix({...fix,accuracy:5000},T0), undefined);
    assert.equal(validateFix(null,T0), undefined);
    for (const bad of [{lat:91,lon:0,accuracy:5},{lat:0,lon:181,accuracy:5},{lat:'x',lon:0,accuracy:5},{lat:0,lon:0,accuracy:-1}]) {
        assert.throws(() => validateFix(bad,T0), /Invalid location/, `accepted ${JSON.stringify(bad)}`);
    }

    // Arrival must survive every later save, or each edit would drag the
    // arrival time forward and the on-site duration would collapse to zero.
    const first=stampLocation({start:fix},undefined,T0);
    const later=stampLocation({start:fix,end:{...fix,accuracy:12}},first,T1);
    assert.equal(later.start.at, first.start.at, 'the arrival time must not move');
    assert.equal(later.end.at, T1.toISOString(), 'a completion fix is stamped when it first appears');
    // A genuinely different coordinate is a new fix and gets a new time.
    assert.equal(stampLocation({start:{lat:40,lon:-80,accuracy:9}},first,T1).start.at, T1.toISOString());
    assert.equal(stampLocation({start:{...fix,accuracy:9999}},undefined,T0), undefined);

    // Both artifacts that leave the product carry it, and neither calls it proof.
    assert.match(server, /const LOCATION_NOTE = 'Location and times as reported by the device\. Coordinates are not verified\.'/);
    assert.match(server, /locationLines\(d\)\.map/, 'the share page must render it');
    assert.match(server, /const located = locationLines\(report\.document\)/, 'the PDF must render it');
    assert.doesNotMatch(server, /\bLOCATION_NOTE[\s\S]{0,400}\bproof\b/i);

    // The same empty-allowlist trap as the microphone: geolocation=() disables
    // it for every origin including this one.
    const policy=(serverJs.match(/setHeader\('Permissions-Policy', '[^']+'\)/g)||[]).join(' ');
    assert.match(policy, /geolocation=\(self\)/);
    assert.doesNotMatch(policy, /geolocation=\(\)/);
    // And iOS denies silently without a usage description.
    assert.match(shell, /<key>NSLocationWhenInUseUsageDescription<\/key>/);

    // A fix has no time until the server gives it one, so the preview rendered
    // new Date(undefined) and printed "Invalid Date" on a real device. Showing
    // the device's own clock instead would defeat the reason it is stamped
    // server-side at all, so the time is simply withheld until it is real.
    const preview=client.slice(client.indexOf('const fixStamp ='), client.indexOf('function signaturePreview'));
    const escLocal=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    const {locationPreview}=new Function('esc', preview+'; return {locationPreview};')(escLocal);
    const unsaved=locationPreview({location:{start:{lat:41.8781234,lon:-87.6298123,accuracy:8.437}}});
    assert.doesNotMatch(unsaved, /Invalid Date/);
    assert.match(unsaved, /time recorded when you save/);
    assert.match(unsaved, /±8 m/, 'accuracy is rounded, not printed to three decimals');
    assert.doesNotMatch(unsaved, /On site/, 'a duration needs two real times');
    const saved=locationPreview({location:{
        start:{lat:41.878123,lon:-87.629812,accuracy:8,at:'2026-09-20T21:02:00.000Z'},
        end:{lat:41.878140,lon:-87.629790,accuracy:12,at:'2026-09-20T22:41:00.000Z'}}});
    assert.match(saved, /On site 1h 39m/);
    assert.doesNotMatch(saved, /time recorded when you save|Invalid Date/);
    assert.doesNotMatch(locationPreview({location:{start:{lat:1,lon:2,accuracy:3,at:'not-a-date'}}}), /Invalid Date/);
    // The PDF must never carry it either, whatever is stored.
    const lines=new Function(server.slice(server.indexOf("const LOCATION_NOTE ="), server.indexOf('const signaturesHtml'))+'; return locationLines;')();
    assert.doesNotMatch(lines({location:{start:{lat:1,lon:2,accuracy:3}}}).join(' '), /Invalid Date/);

    // Capture must never be able to stop someone finishing a report.
    const capture=client.slice(client.indexOf('const LOCATION_TIMEOUT'), client.indexOf('const newDocument'));
    assert.match(capture, /if\(!navigator\.geolocation\)return Promise\.resolve\(null\)/);
    assert.match(capture, /setTimeout\(\(\)=>finish\(null\),LOCATION_TIMEOUT\+1000\)/, 'a webview may ignore the built-in timeout');
    assert.match(capture, /\}catch\{ finish\(null\); \}/);
    assert.match(capture, /\.catch\(\(\)=>\{\}\)/);
    // Recorded at the start of a report and at the end of every send path.
    assert.equal(client.split("markLocation('start')").length - 1, 2, 'both places a draft is created');
    assert.equal(client.split("markLocation('end')").length - 1, 2, 'both the paid and the free finalize path');
});

test('the camera sheet leaves the room list usable above it', () => {
    const fsx=require('node:fs'), pathx=require('node:path');
    const root=pathx.join(__dirname,'..');
    const client=fsx.readFileSync(pathx.join(root,'public','inspect','inspect.js'),'utf8');
    const shell=fsx.readFileSync(pathx.join(root,'..','marketel-frontdesk-ios','ios','App','App','AppDelegate.swift'),'utf8');
    const camera=fsx.readFileSync(pathx.join(root,'..','marketel-frontdesk-ios','ios','App','App','NativeCamera.swift'),'utf8');

    // The sheet must stop at the medium detent or there is no page to use.
    assert.match(shell, /sheet\.detents = \[\.medium\(\), \.large\(\)\][\s\S]{0,80}selectedDetentIdentifier = \.medium/);

    // The room a shot lands in is read at capture time, not bound when the
    // camera was presented — otherwise retargeting silently does nothing and
    // every photo still lands in the room it opened on.
    assert.match(camera, /var room: Int \{ didSet/);
    assert.match(camera, /self\.onCapture\(encoded, self\.room\)/);
    assert.doesNotMatch(shell, /"room": room, "dataUrl"/, 'the presented room must not be captured in the closure');
    assert.match(shell, /"room": capturedRoom, "dataUrl": dataUrl/);
    assert.match(shell, /case "inspectCameraRoom":/);
    assert.match(shell, /camera\.room = payload\["room"\] as\? Int \?\? camera\.room/);

    // Both ways out of the sheet must tell the page, or the companion stays
    // up with no camera behind it.
    assert.match(camera, /if isBeingDismissed \{ onDismiss\(\) \}/);
    assert.match(shell, /marketelInspectCameraClosed/);
    assert.match(shell, /marketelInspectCameraOpened/);

    // The page side: tapping retargets, and a photo arriving updates the
    // counts rather than repainting the editor hidden behind the sheet.
    const companion=client.slice(client.indexOf('let cameraRoom=null'), client.indexOf('window.marketelInspectPhotoCaptured'));
    assert.match(companion, /type:'inspectCameraRoom',room:index/);
    assert.match(companion, /data-camera-room/);
    assert.match(client, /if\(cameraRoom!==null\)cameraCompanion\(true\);/);
    // Closing restores whatever screen the operator was actually on.
    assert.match(companion, /cameraRoom=null;\s*if\(draft&&!preview&&!draft\.finalizedAt\)editor\('rooms'\)/);
});

test('no template expression ships to the screen as literal text', () => {
    const fsx=require('node:fs'), pathx=require('node:path');
    const root=pathx.join(__dirname,'..');

    // The scanner must find a real one and ignore the things that break a regex.
    assert.equal(rawInterpolations("const x=`a${c?'<p>No saved ${esc(s().d)} yet.</p>':''}b`;").length, 1,
        'must catch a ${} in a single-quoted ternary branch');
    assert.equal(rawInterpolations('const e=v=>v.replace(/[&<>"\']/g,c=>m[c]); const t=`x${y}`;').length, 0,
        'a character class holding quotes must not desynchronise the scan');
    assert.equal(rawInterpolations("const t=`it's ${x} fine`;").length, 0,
        'an apostrophe in prose is not a string');
    assert.equal(rawInterpolations('const t=`<img src="${esc(u)}">`;').length, 0,
        'an attribute inside a template literal interpolates normally');
    assert.equal(rawInterpolations("const t=`a${xs.map(({a,b})=>`<i>${a}</i>`).join('')}b`; const u=`<b w=\"${w}\">`;").length, 0,
        'braces inside an interpolation must not close it early');
    assert.equal(rawInterpolations("const t=`a${f({k:1})}b`; const s='no ${x} here';").length, 1,
        'and the scan is still in step afterwards, catching the real one');

    // Three of these shipped: the reports empty state rendered the source of
    // its own interpolation, because the language pass put ${} into branches
    // that were single-quoted strings.
    for (const file of ['public/inspect/inspect.js', 'public/inspect/index.html']) {
        if (!file.endsWith('.js')) continue;
        const found = rawInterpolations(fsx.readFileSync(pathx.join(root, file), 'utf8'));
        assert.deepEqual(found, [], `${file} ships raw \${...}: ` +
            found.map(f => `line ${f.line} ${f.near}`).join(' | '));
    }
});

test('a flow cannot repaint the screen after the operator has left it', () => {
    const client=require('node:fs').readFileSync(
        require('node:path').join(__dirname,'..','public','inspect','inspect.js'),'utf8');

    // The setup flow restores on a 900ms timer. Tapping a tab inside that
    // window used to let the old screen land back on top of the new one.
    assert.match(client, /let activeFlow=null/);
    assert.match(client, /function dismissFlow\(\)/);
    assert.match(client, /if\(settled\|\|activeFlow!==handle\)return;/,
        'restore must no-op once the flow is no longer current');
    // Opening a flow retires any previous one.
    assert.match(client.slice(client.indexOf('function flowScreen')), /^function flowScreen\([^)]*\)\{\s*dismissFlow\(\);/m);
    // Every screen that paints #app directly must retire an open flow first.
    for (const entry of ['async function list(', 'async function start(', 'function editor(']) {
        const region = client.slice(client.indexOf(entry), client.indexOf(entry) + 320);
        assert.match(region, /dismissFlow\(\)/, `${entry} must dismiss an open flow`);
    }
    // The account button is disabled for the life of a flow, so it is released
    // on every exit — not only the one that restores the screen.
    assert.match(client, /const release=\(\)=>\{[^}]*\$\('account-button'\)\.disabled=false/);
    // A class toggled on <html> that no stylesheet reads is not containment.
    assert.doesNotMatch(client, /flow-open/);

    // One veil element, reference counted: the export run raises one and the
    // upload inside it raises another, and two would paint the blur twice.
    assert.match(client, /let veilEl=null,veilDepth=0/);
    assert.match(client, /veilDepth=Math\.max\(0,veilDepth-1\)/);

    // run() falls back to document.activeElement, which is nothing after a
    // touch — so these two buttons never went busy while three round trips ran.
    assert.match(client, /\$\('send-report'\)\.onclick=event=>requestExport\('share',event\.currentTarget\)/);
    assert.match(client, /\$\('download-report'\)\.onclick=event=>requestExport\('pdf',event\.currentTarget\)/);
    const req=client.slice(client.indexOf('function requestExport'), client.indexOf('async function finishExport'));
    assert.match(req, /busyVeil\(`Preparing your \$\{skin\(\)\.doc\}`/, 'the wait before the sheet must be covered');
    assert.match(req, /finally \{ veil\.done\(\); \}/);
});

test('a blocking wait shows the product waiting, and finishing offers every way out', () => {
    const fsx = require('node:fs'), pathx = require('node:path');
    const root = pathx.join(__dirname, '..');
    const client = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'inspect.js'), 'utf8');
    const css = fsx.readFileSync(pathx.join(root, 'public', 'inspect', 'inspect.css'), 'utf8');

    // Uploading photos is blocking work — losing the page loses the photos —
    // so it gets the breathing Marketel mark every other wait uses, not a
    // toast that slides past the corner of the report.
    const save = client.slice(client.indexOf('async function save()'), client.indexOf('function liveMeter'));
    assert.doesNotMatch(save, /notice\('Uploading/);
    assert.match(save, /busyVeil\(/);
    // Counted, so it says how much is left rather than merely that something
    // is happening.
    assert.match(save, /\$\{done\} of \$\{pending\.length\} uploaded/);
    // And the veil is removed even when an upload throws, or it would strand
    // the operator behind a permanent overlay.
    assert.match(save, /finally \{ veil\?\.done\(\); \}/);

    // The veil reuses .loading, so the animation cannot drift from the rest of
    // the product, and it sits above every other layer.
    const veil = client.slice(client.indexOf('function busyVeil'), client.indexOf('function flowScreen'));
    assert.match(veil, /class="loading"/);
    assert.match(veil, /role','status'/);
    assert.match(css, /\.busy-veil \{[^}]*z-index: 70/);
    assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,200}\.busy-veil \{ animation: none/);

    // Finishing is the moment the document becomes real. Both the paid and the
    // free path show it the same way, and both end in the same chooser.
    for (const path of ['async function finishExport', "if($('finalize'))"]) {
        const region = client.slice(client.indexOf(path), client.indexOf(path) + 1200);
        assert.match(region, /busyVeil\(`Building your \$\{skin\(\)\.doc\}`/, `${path} must show the build state`);
        assert.match(region, /deliverySheet\(/, `${path} must end in the delivery sheet`);
    }

    // The chooser lists every way out, and never offers a link for a document
    // that is not allowed to have one.
    const sheet = client.slice(client.indexOf('function deliverySheet'), client.indexOf('function exportOffer'));
    assert.match(sheet, /is built\./);
    assert.match(sheet, /const canShare=!!wedge\(d\.type\)\.can\.shareable/);
    assert.match(sheet, /delivery-share/);
    assert.match(sheet, /delivery-pdf/);
    // The original files are the reason a damage report is worth paying for,
    // so they are a listed choice rather than something to go hunting for.
    assert.match(sheet, /hasOriginals=!!wedge\(d\.type\)\.can\.originals/);
    assert.match(sheet, /delivery-originals/);
    // Declining is a real answer and must not trap anyone in the sheet.
    assert.match(sheet, /delivery-later/);

    // One implementation of the originals list, reachable from the finalized
    // screen and the chooser alike.
    assert.equal(client.split('function originalsSheet(').length - 1, 1);
    assert.match(client, /if\(\$\('originals'\)\)\$\('originals'\)\.onclick=\(\)=>originalsSheet\(\);/);
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
    assert.match(anon, /ANON_EVENTS = new Set\(\['VoiceNoteRecorded', \.\.\.LADDER_EVENTS/);
    assert.match(anon, /record\(null, req\.body\.name, undefined, eventExtra\(req\.body\)\)/);
    assert.match(anon, /rate\(`inspect-anon-events:/);
    assert.ok(server.indexOf("router.post('/events/anon'") < server.indexOf('Please sign in again.'),
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
    assert.match(client, /\$\{skin\(\)\.writesLabel\.replace\(\/\^\.\/,c=>c\.toUpperCase\(\)\)\} the note/);
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
    active: false, freeAvailable: true, remaining: 0, credits: 0, businessName: '', hasLogo: false, periodEnd: null,
    cancellationScheduled: false, price: 25, interval: 'month', limits: LIMITS,
  });
  const paid = entitlement({ subscriptionStatus: 'active', periodEnd: future, freeReportUsed: true, reportsUsed: 7, cancelAtPeriodEnd: true });
  assert.equal(paid.active, true);
  assert.equal(paid.remaining, 293);
  assert.equal(paid.cancellationScheduled, true);
  // An annual period carries twelve months of fair use, or the yearly plan
  // would get one twelfth of the monthly plan's ceiling.
  const yearly = entitlement({ subscriptionStatus: 'active', periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2027-01-01'), freeReportUsed: true, reportsUsed: 12 });
  assert.equal(yearly.interval, 'year');
  assert.equal(yearly.price, 199);
  assert.equal(yearly.remaining, 3588);
  assert.equal(yearly.limits.reports, 3600);
  assert.equal(hash('session').length, 64);
});

test('Inspect billing accepts only the promised price and ignores stale subscription events', () => {
  const price = { unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } };
  assert.equal(validateInspectPrice(price), price);
  assert.throws(() => validateInspectPrice({ ...price, unit_amount: 2999 }), /USD 25/);
  assert.throws(() => validateInspectPrice({ ...price, recurring: { interval: 'year', interval_count: 1 } }), /USD 25/);
  const yearPrice = { unit_amount: 19900, currency: 'usd', recurring: { interval: 'year', interval_count: 1 } };
  assert.equal(validateInspectPrice(yearPrice, 'year'), yearPrice);
  assert.throws(() => validateInspectPrice({ ...yearPrice, unit_amount: 19800 }, 'year'), /USD 199/);
  assert.throws(() => validateInspectPrice(price, 'year'), /USD 199/);
  assert.throws(() => validateInspectPrice(yearPrice, 'month'), /USD 25/);
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
  assert.deepEqual(await config.json(), { enabled: true, appStoreUrl: 'https://apps.apple.com/us/app/marketel/id6801005750', limits: { reports: 300, photos: 100 } });
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

// ——— The simulation funnel ————————————————————————————————————————
test('the simulation sells before anyone has an account, and Stripe collects the email', async () => {
  const updates = [];
  const h = moneyHarness({
    stripe: {
      prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) },
      subscriptions: { update: async (id, params) => { updates.push({ id, params }); return { id }; } },
    },
  });
  try {
    // No Authorization header: this is the whole point of the route.
    const response = await request(h.app, '/api/inspect/checkout/sim', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: 'month', tool: 'claims', visitorId: `v_${'a'.repeat(12)}` }) });
    assert.equal(response.status, 200);
    const { params } = h.calls.sessions[0];
    assert.equal(params.mode, 'subscription');
    // No customer, so Stripe asks for the email itself and Apple Pay fills it.
    assert.ok(!('customer' in params));
    assert.equal(params.metadata.sim, '1');
    assert.equal(params.metadata.product, 'marketel-inspect');
    assert.equal(params.metadata.tool, 'claims');
    assert.deepEqual(params.subscription_data.metadata, params.metadata);
    assert.equal(params.success_url, 'https://bookmarketel.com/claims?sim=1&checkout=success&session={CHECKOUT_SESSION_ID}');
    assert.equal(params.cancel_url, 'https://bookmarketel.com/claims?sim=1&checkout=cancelled');
    assert.ok(h.calls.events.some(event => event.name === 'SimCheckoutStarted' && event.tool === 'claims'));
  } finally { h.registration.close(); }
});

test('a demo checkout tells Meta a trial started, or the sale, under one id', async () => {
  const fromAd = { metaAttribution: { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.abc' } };
  const stripe = { subscriptions: { update: async id => ({ id }), retrieve: async id => ({ id, metadata: {} }) } };
  const completed = object => ({ type: 'checkout.session.completed', created: 1760000000, data: { object: {
    id: 'cs_demo', mode: 'subscription', subscription: 'sub_demo', customer: 'cus_demo', invoice: 'in_first', currency: 'usd',
    customer_details: { email: 'buyer@example.com' },
    metadata: { product: 'marketel-inspect', sim: '1', interval: 'month', tool: 'claims' }, ...object } } });
  const send = (h, event) => request(h.app, '/api/inspect-stripe-webhook', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(event) });

  // $0 today is a trial: Meta hears StartTrial now, and we record which plan.
  let h = moneyHarness({ account: fromAd, stripe });
  try {
    assert.equal((await send(h, completed({ amount_total: 0 }))).status, 200);
    assert.deepEqual(h.calls.capi.map(e => [e.name, e.eventId]), [['StartTrial', 'inspect-trial.cs_demo']]);
    const started = h.calls.events.find(e => e.name === 'TrialStarted');
    assert.equal(started.tool, 'claims');
    assert.equal(started.detail, 'month');
  } finally { h.registration.close(); }

  // Paid today: the sale, under the id invoice.paid uses, so Meta counts one.
  h = moneyHarness({ account: fromAd, stripe });
  try {
    assert.equal((await send(h, completed({ amount_total: 2500 }))).status, 200);
    assert.deepEqual(h.calls.capi.map(e => [e.name, e.eventId, e.value]), [['Purchase', 'inspect-purchase.in_first', 25]]);
  } finally { h.registration.close(); }

  // Someone no ad brought in is nobody's to attribute.
  h = moneyHarness({ stripe });
  try {
    assert.equal((await send(h, completed({ amount_total: 0 }))).status, 200);
    assert.equal(h.calls.capi.length, 0);
    assert.ok(h.calls.events.some(e => e.name === 'TrialStarted'), 'the trial itself still counts');
  } finally { h.registration.close(); }
});

test('the demo start-button tap reaches Meta as InitiateCheckout, once per visitor, never from the app', async () => {
  const visitorId = `v_${'a'.repeat(12)}`;
  const tap = (h, body = {}, origin = 'https://bookmarketel.com') => request(h.app, '/api/inspect/events/anon', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ name: 'SimCheckoutTapped', tool: 'claims', visitorId, detail: 'month', attribution: { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.abc' }, ...body }) });

  let h = moneyHarness();
  try {
    assert.equal((await tap(h)).status, 200);
    assert.deepEqual(h.calls.capi, [{ name: 'InitiateCheckout', value: 25, contentName: 'Marketel Claims month plan', eventId: `inspect-sim-tap.${visitorId}` }]);
    assert.ok(h.calls.events.some(e => e.name === 'SimCheckoutTapped' && e.detail === 'month' && e.visitorId === visitorId), 'our own ladder counts it too');
    // The yearly plan carries its own price; the id is the visitor's, so Meta
    // counts one however many times they tap.
    assert.equal((await tap(h, { detail: 'year' })).status, 200);
    assert.equal(h.calls.capi[1].value, 199);
    assert.equal(h.calls.capi[1].eventId, h.calls.capi[0].eventId);
  } finally { h.registration.close(); }

  // From the app, or with no visitor to count once: our ladder only.
  h = moneyHarness();
  try {
    assert.equal((await tap(h, {}, 'capacitor://localhost')).status, 200);
    assert.equal((await tap(h, { visitorId: 'nope' })).status, 200);
    assert.equal(h.calls.capi.length, 0);
  } finally { h.registration.close(); }

  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  assert.match(client, /function simBuy\(trigger\)\{\n  simCheckoutTapped\(\);/);
  assert.match(client, /name:'SimCheckoutTapped',tool:toolId\(\),visitorId,detail:planInterval,attribution:inspectAttribution/);
});

test('"keep it free" emails the link once, and only when asked', async () => {
  const h = moneyHarness();
  const lead = body => request(h.app, '/api/inspect/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maybe@example.com', tool: 'claims', ...body }) });
  try {
    assert.equal((await lead({})).status, 200);
    assert.equal(h.calls.mail.length, 0, 'a plain lead sends nothing');
    assert.equal((await lead({ keep: true })).status, 200);
    assert.equal(h.calls.mail.length, 1);
    const sent = h.calls.mail[0];
    assert.equal(sent.subject, 'Marketel, for when you need it');
    assert.match(sent.text, /https:\/\/bookmarketel\.com\/claims\?sim=0/);
    assert.match(sent.text, /Building one is always free\. Sending it is \$12, or \$25 a month/);
    assert.ok(h.calls.events.some(e => e.name === 'KeptFree'));
    assert.equal((await lead({ keep: true })).status, 200);
    assert.equal(h.calls.mail.length, 1, 'never twice');
  } finally { h.registration.close(); }

  // The page: a quiet way out under the offer, prominent after a cancelled
  // checkout, and the trial's words come from one place.
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  assert.match(client, /api\('\/leads',\{method:'POST',body:\{email,tool:toolId\(\),visitorId,attribution:inspectAttribution,keep:true\}\}\)/);
  assert.match(client, /id="sim-keep" class="\$\{declined\?'secondary wide':'quiet'\}"/);
  assert.match(client, /state==='cancelled'&&simPicked\)\{[\s\S]{0,120}simReport\(\{declined:true\}\)/);
  assert.match(client, /cta:`Start \$\{SIM_TRIAL_DAYS\} days free →`/);
  assert.match(client, /terms:`\$0 today\. \$\$\{plan\.price\}\$\{plan\.per\} from \$\{from\}, or from your first \$\{sk\.doc\} if sooner\./);
});

test('a simulation purchase creates the account from the email Stripe collected', async () => {
  const updates = [];
  const h = moneyHarness({
    account: { stripeCustomerId: null, email: 'newbuyer@example.com' },
    stripe: {
      subscriptions: {
        update: async (id, params) => { updates.push({ id, params }); return { id }; },
        retrieve: async id => ({ id, metadata: { product: 'not-marketel-inspect' } }),
      },
    },
  });
  const event = { type: 'checkout.session.completed', created: 1760000000, data: { object: {
    id: 'cs_sim', mode: 'subscription', subscription: 'sub_sim', customer: 'cus_sim',
    customer_details: { email: 'NewBuyer@Example.com ' },
    metadata: { product: 'marketel-inspect', sim: '1', interval: 'month', tool: 'claims', visitorId: `v_${'a'.repeat(12)}` } } } };
  try {
    const response = await request(h.app, '/api/inspect-stripe-webhook', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(event) });
    assert.equal(response.status, 200);
    // The Stripe customer is adopted, because this account had none.
    assert.ok(h.calls.accountUpdates.some(update => update.stripeCustomerId === 'cus_sim'));
    // And the subscription is stamped, which is what syncSubscription reads.
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, 'sub_sim');
    assert.equal(updates[0].params.metadata.inspectAccountId, 'acct_1');
    assert.equal(updates[0].params.metadata.product, 'marketel-inspect');
    assert.equal(updates[0].params.metadata.tool, 'claims');
    assert.ok(h.calls.events.some(event => event.name === 'SimPurchased'));
  } finally { h.registration.close(); }

  // An account that already had a customer — from an earlier single report —
  // moves to the one that is paying. syncSubscription refuses mismatched
  // customers, so keeping the old link left the buyer paid-for and locked out.
  const linked = moneyHarness({
    account: { stripeCustomerId: 'cus_earlier_report' },
    stripe: { subscriptions: { update: async () => ({}), retrieve: async id => ({ id, metadata: {} }) } },
  });
  try {
    await request(linked.app, '/api/inspect-stripe-webhook', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(event) });
    assert.ok(linked.calls.accountUpdates.some(update => update.stripeCustomerId === 'cus_sim'));
  } finally { linked.registration.close(); }

  // But never onto a second subscription beside a live one: that is a double
  // charge to sort out by hand, not a switch of who is billed.
  const already = moneyHarness({
    account: { stripeCustomerId: 'cus_live', stripeSubscriptionId: 'sub_live', subscriptionStatus: 'active' },
    stripe: { subscriptions: { update: async () => { throw new Error('must not restamp'); }, retrieve: async id => ({ id, metadata: {} }) } },
  });
  try {
    const response = await request(already.app, '/api/inspect-stripe-webhook', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(event) });
    assert.equal(response.status, 200);
    assert.ok(!already.calls.accountUpdates.some(update => update.stripeCustomerId === 'cus_sim'));
  } finally { already.registration.close(); }
});

test('someone who paid is never locked out by a webhook that did not arrive', async () => {
  const simSub = { id: 'sub_sim', customer: 'cus_sim', status: 'active',
    metadata: { product: 'marketel-inspect', sim: '1', interval: 'month', tool: 'claims' } };
  const stamps = [];
  const stripeStub = {
    customers: { list: async ({ email }) => ({ data: email === 'owner@example.com' ? [{ id: 'cus_sim' }] : [] }), create: async () => ({ id: 'cus_new' }), retrieve: async id => ({ id }) },
    subscriptions: {
      list: async ({ customer }) => ({ data: customer === 'cus_sim' ? [simSub] : [] }),
      update: async (id, params) => { stamps.push({ id, params }); return { ...simSub, metadata: { ...simSub.metadata, ...params.metadata } }; },
    },
    prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) },
  };

  // Refreshing billing finds the unlinked subscription for the verified email
  // and links it to this account.
  const h = moneyHarness({ account: { stripeCustomerId: null, email: 'owner@example.com' }, stripe: stripeStub });
  try {
    const response = await request(h.app, '/api/inspect/billing/refresh', { method: 'POST', headers: h.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.equal(stamps.length, 1);
    assert.equal(stamps[0].id, 'sub_sim');
    assert.equal(stamps[0].params.metadata.inspectAccountId, 'acct_1');
    assert.ok(h.calls.accountUpdates.some(update => update.stripeCustomerId === 'cus_sim'));
  } finally { h.registration.close(); }

  // A subscription already claimed by another account is not taken.
  stamps.length = 0;
  simSub.metadata.inspectAccountId = 'acct_someone_else';
  const other = moneyHarness({ account: { stripeCustomerId: null, email: 'owner@example.com' }, stripe: stripeStub });
  try {
    await request(other.app, '/api/inspect/billing/refresh', { method: 'POST', headers: other.headers, body: '{}' });
    assert.equal(stamps.length, 0);
  } finally { other.registration.close(); delete simSub.metadata.inspectAccountId; }

  // And the simulation's checkout refuses to charge an email that already pays.
  const paying = moneyHarness({
    account: { email: 'owner@example.com', subscriptionStatus: 'active', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 20 * 86400000).toISOString() },
    stripe: stripeStub,
  });
  try {
    const response = await request(paying.app, '/api/inspect/checkout/sim', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval: 'month', tool: 'claims', email: 'owner@example.com' }) });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /already have Marketel/);
    assert.equal(paying.calls.sessions.length, 0);
  } finally { paying.registration.close(); }
});

test('App Review signs in with a fixed code, and nobody else can', async () => {
  const REVIEW = { INSPECT_REVIEW_EMAIL: 'Review@BookMarketel.com', INSPECT_REVIEW_CODE: '482915' };
  const post = (app, path, body) => request(app, `/api/inspect${path}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const h = moneyHarness({ account: { email: 'review@bookmarketel.com', stripeCustomerId: null }, env: REVIEW });
  try {
    // Asking for a code sends nothing; there is no inbox to read it from.
    const asked = await post(h.app, '/auth/request', { email: 'review@bookmarketel.com' });
    assert.equal(asked.status, 200);
    assert.equal(h.calls.mail.length, 0);
    // The fixed code opens it, matched case-insensitively on the email.
    const ok = await post(h.app, '/auth/verify', { email: 'REVIEW@bookmarketel.com', code: '482915' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.match(body.token, /^[A-Za-z0-9_-]{43}$/);
    // And it can send without paying, so review never meets a real charge.
    assert.ok(h.calls.accountUpdates.some(update => update.reportCredits === 25));
    assert.equal(body.credits, 25);
    // A wrong code is refused like any other.
    assert.equal((await post(h.app, '/auth/verify', { email: 'review@bookmarketel.com', code: '000000' })).status, 401);
  } finally { h.registration.close(); }

  // The same code for any other email opens nothing.
  const other = moneyHarness({ env: REVIEW });
  try {
    assert.equal((await post(other.app, '/auth/verify', { email: 'owner@example.com', code: '482915' })).status, 401);
  } finally { other.registration.close(); }

  // Off entirely unless the code is six digits: a half-configured environment
  // must not open a door with an empty code.
  for (const bad of [{ INSPECT_REVIEW_EMAIL: 'review@bookmarketel.com' }, { ...REVIEW, INSPECT_REVIEW_CODE: '12345' }]) {
    const off = moneyHarness({ account: { email: 'review@bookmarketel.com' }, env: bad });
    try {
      assert.equal((await post(off.app, '/auth/verify', { email: 'review@bookmarketel.com', code: bad.INSPECT_REVIEW_CODE || '' })).status, 401);
    } finally { off.registration.close(); }
  }

  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'inspect.js'), 'utf8');
  // Off unless both halves are configured, and the code must be six digits so
  // it can be typed into the same field as a real one.
  assert.match(src, /const reviewCode = \/\^\\d\{6\}\$\/\.test\(String\(env\.INSPECT_REVIEW_CODE \|\| ''\)\)/);
  assert.match(src, /const isReviewAccount = email => !!reviewEmail && !!reviewCode && email === reviewEmail;/);
  // Compared in constant time, and only for that one email.
  assert.match(src, /const review = isReviewAccount\(email\) && sameSecret\(String\(req\.body\.code \|\| ''\), reviewCode\);/);
  // It never emails, is kept out of Meta's data, and is topped back up so a
  // reviewer who deletes it can repeat the whole flow.
  assert.match(src, /if \(isReviewAccount\(email\)\) return res\.json\(\{ success: true \}\);/);
  assert.match(src, /isCapiExcludedEmail\(account\.email\) \|\| isReviewAccount\(account\.email\)/);
  assert.match(src, /if \(review && \(Number\(account\.reportCredits\) \|\| 0\) < 25\)/);
});

test('the simulation ladder is measurable and closed to anything else', async () => {
  const h = moneyHarness();
  try {
    for (const name of ['SimStarted', 'SimFindingPicked', 'SimPhotoTaken', 'SimNoteWritten', 'SimReportShown', 'SimOfferViewed']) {
      const response = await request(h.app, '/api/inspect/events/anon', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, tool: 'claims', detail: 'carpet' }) });
      assert.equal(response.status, 200, name);
    }
    assert.ok(h.calls.events.some(event => event.name === 'SimFindingPicked' && event.detail === 'carpet'));
    // Which finding they picked is the only detail carried, and it is a slug.
    const dirty = await request(h.app, '/api/inspect/events/anon', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'SimPhotoTaken', tool: 'claims', detail: '<script>' }) });
    assert.equal(dirty.status, 200);
    assert.ok(h.calls.events.some(event => event.name === 'SimPhotoTaken' && event.detail === null));
    const unknown = await request(h.app, '/api/inspect/events/anon', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'SimWhatever', tool: 'claims' }) });
    assert.equal(unknown.status, 400);
  } finally { h.registration.close(); }
});

test('every sample photo the simulation offers actually exists', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..', 'public', 'inspect');
  for (const tool of ['inspect', 'claims', 'moveout']) {
    const photos = require('../wedges/'+tool).demo.findings.map(f => f.photo);
    assert.equal(photos.length, 3, `${tool} should offer three things to document`);
    assert.ok(photos.every(photo => photo.startsWith(`${tool}-`)), `${tool} photos: ${photos.join(', ')}`);
    for (const photo of photos) {
      for (const variant of [`${photo}.jpg`, `${photo}-thumb.jpg`]) {
        const file = path.join(root, 'sample', variant);
        assert.ok(fs.existsSync(file), `missing sample image ${variant}`);
        // The page promises twenty seconds; a full-size shot over 500KB and
        // three thumbnails over 40KB each stop it keeping that promise.
        const bytes = fs.statSync(file).size;
        assert.ok(bytes < (variant.includes('-thumb') ? 40_000 : 500_000), `${variant} is ${bytes} bytes`);
      }
    }
  }
  // The simulation must never write into the real pipeline.
  const src=fs.readFileSync(path.join(root,'inspect.js'),'utf8');
  const sim = src.slice(src.indexOf('const SIMS ='), src.indexOf('function landing() {'));
  assert.ok(!/persist\(|stored\('put'|api\('\/reports/.test(sim), 'the simulation must not touch drafts or reports');
});

test('the simulation keeps the address even when the card is never reached', async () => {
  const h = moneyHarness({
    stripe: {
      prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) },
    },
  });
  try {
    const response = await request(h.app, '/api/inspect/checkout/sim', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: 'month', tool: 'claims', email: 'Buyer@Example.com ' }) });
    assert.equal(response.status, 200);
    // Prefilled, so Stripe's own email field is answered and Apple Pay is the
    // only tap left on their page.
    assert.equal(h.calls.sessions[0].params.customer_email, 'buyer@example.com');
    // And the lead exists from this moment, not from the payment.
    assert.ok(h.calls.events.some(event => event.name === 'LeadCaptured' && event.tool === 'claims'));
    assert.ok(h.calls.capi.some(event => event.name === 'Lead'));
  } finally { h.registration.close(); }

  // No address is still allowed: Stripe collects it and the webhook adopts it.
  const anon = moneyHarness({ stripe: { prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) } } });
  try {
    const response = await request(anon.app, '/api/inspect/checkout/sim', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval: 'month', tool: 'claims' }) });
    assert.equal(response.status, 200);
    assert.ok(!('customer_email' in anon.calls.sessions[0].params));
    assert.ok(!anon.calls.events.some(event => event.name === 'LeadCaptured'));
  } finally { anon.registration.close(); }

  // A malformed address is refused rather than passed to Stripe.
  const bad = moneyHarness({ stripe: { prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) } } });
  try {
    const response = await request(bad.app, '/api/inspect/checkout/sim', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval: 'month', tool: 'claims', email: 'nope' }) });
    assert.equal(response.status, 400);
    assert.equal(bad.calls.sessions.length, 0);
  } finally { bad.registration.close(); }
});

test('the address that paid can be recovered, and only by whoever holds the checkout id', async () => {
  const sessions = {
    cs_test_a1GoodSessionIdentifier000001: { id: 'cs_test_a1GoodSessionIdentifier000001', status: 'complete', metadata: { sim: '1' }, customer_details: { email: 'payer@example.com' } },
    cs_test_a1OpenSessionIdentifier000002: { id: 'cs_test_a1OpenSessionIdentifier000002', status: 'open', metadata: { sim: '1' }, customer_details: { email: 'payer@example.com' } },
    cs_test_a1OtherSessionIdentifier00003: { id: 'cs_test_a1OtherSessionIdentifier00003', status: 'complete', metadata: {}, customer_details: { email: 'someone@example.com' } },
  };
  const h = moneyHarness({ stripe: { checkout: { sessions: {
    create: async () => ({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }),
    retrieve: async id => sessions[id] || null,
  } } } });
  try {
    const ok = await request(h.app, '/api/inspect/checkout/sim/email', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'cs_test_a1GoodSessionIdentifier000001' }) });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { email: 'payer@example.com' });

    // An unfinished checkout, or one that is not the simulation's, gives up
    // nothing — and says nothing about which of the two it was.
    for (const id of ['cs_test_a1OpenSessionIdentifier000002', 'cs_test_a1OtherSessionIdentifier00003']) {
      const response = await request(h.app, '/api/inspect/checkout/sim/email', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id }) });
      assert.equal(response.status, 200, id);
      assert.deepEqual(await response.json(), { email: '' }, id);
    }
    const junk = await request(h.app, '/api/inspect/checkout/sim/email', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'whatever' }) });
    assert.equal(junk.status, 400);
  } finally { h.registration.close(); }
});

// ——— Free until your first report ————————————————————————————————
test('a trial grants the product it is a trial of', () => {
  const soon = new Date(Date.now() + 20 * 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  const trialing = entitlement({ subscriptionStatus: 'trialing', periodEnd: soon, periodStart: new Date().toISOString(), reportsUsed: 0, reportCredits: 0, freeReportUsed: true });
  // Without this a trialer hands over a card and is locked out of the very
  // thing they are trialing, then charged for it.
  assert.equal(trialing.active, true);
  assert.ok(trialing.remaining > 0);
  // The period guard still applies: an expired trial is not access.
  assert.equal(entitlement({ subscriptionStatus: 'trialing', periodEnd: past, reportsUsed: 0, reportCredits: 0, freeReportUsed: true }).active, false);
  // And nothing else was widened.
  for (const status of ['past_due', 'canceled', 'incomplete', 'unpaid', null]) {
    assert.equal(entitlement({ subscriptionStatus: status, periodEnd: soon, reportsUsed: 0, reportCredits: 0, freeReportUsed: true }).active, false, String(status));
  }
});

test('the demo starts with three free days, card upfront, once per person', async () => {
  const price = { id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } };
  const sim = (h, body) => request(h.app, '/api/inspect/checkout/sim', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval: 'month', tool: 'claims', ...body }) });
  const stripe = { prices: { retrieve: async () => price }, customers: { list: async () => ({ data: [] }) } };

  // Someone who has never subscribed: $0 today, and the card is taken now.
  let h = moneyHarness({ stripe });
  try {
    const response = await sim(h, { email: 'new@example.com' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).trialDays, 3);
    const params = h.calls.sessions[0].params;
    assert.equal(params.subscription_data.trial_period_days, 3);
    assert.equal(params.payment_method_collection, 'always');
    assert.equal(params.subscription_data.metadata.sim, '1');
  } finally { h.registration.close(); }

  // Someone who has had a plan before pays today: a trial is not repeatable.
  h = moneyHarness({ stripe, account: { subscriptionStatus: 'canceled', stripeSubscriptionId: 'sub_old', periodEnd: new Date(Date.now() - 86400000) } });
  try {
    const response = await sim(h, { email: 'back@example.com' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).trialDays, 0);
    assert.ok(!('trial_period_days' in h.calls.sessions[0].params.subscription_data));
    assert.ok(!('payment_method_collection' in h.calls.sessions[0].params));
  } finally { h.registration.close(); }

  // No address, no trial: there is nobody to hold to "once".
  h = moneyHarness({ stripe });
  try {
    assert.equal((await (await sim(h, {})).json()).trialDays, 0);
    assert.ok(!('trial_period_days' in h.calls.sessions[0].params.subscription_data));
  } finally { h.registration.close(); }

  // The page's copy and the server's trial are one number.
  const fs = require('node:fs'), path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'inspect.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const days = source => Number(/const SIM_TRIAL_DAYS = (\d+);/.exec(source)?.[1]);
  assert.equal(days(server), 3);
  assert.equal(days(client), days(server));

  // The authed checkout is a different offer and keeps charging today.
  const paid = moneyHarness({
    stripe: {
      prices: { retrieve: async () => ({ id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }) },
      subscriptions: { list: async () => ({ data: [] }) },
      checkout: { sessions: {
        create: async (params, options) => { paid.calls.sessions.push({ params, options }); return { id: 'cs_2', url: 'https://checkout.stripe.test/cs_2' }; },
        list: async () => ({ data: [] }),
      } },
    },
  });
  try {
    const response = await request(paid.app, '/api/inspect/checkout', { method: 'POST', headers: paid.headers, body: JSON.stringify({ interval: 'month' }) });
    assert.equal(response.status, 200);
    assert.ok(!('trial_period_days' in paid.calls.sessions[0].params.subscription_data));
  } finally { paid.registration.close(); }
});

test('finalizing the first report is what starts the billing', async () => {
  const updates = [];
  const trialStripe = () => ({ subscriptions: { update: async (id, params) => { updates.push({ id, params }); return { id }; } } });
  const document = { propertyName: 'Pine Ave', type: 'damage', date: '2026-09-21', eventTime: 'unknown', author: 'Sam',
    rooms: [{ name: 'Kitchen', observation: 'Chipped counter.', issue: true, photos: ['p1'] }], signatures: [] };

  const trial = moneyHarness({
    account: { subscriptionStatus: 'trialing', stripeSubscriptionId: 'sub_trial', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 20 * 86400000).toISOString(), freeReportUsed: true },
    report: { document },
    stripe: trialStripe(),
  });
  try {
    const response = await request(trial.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: trial.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(updates, [{ id: 'sub_trial', params: { trial_end: 'now' } }]);
    assert.ok(trial.calls.events.some(event => event.name === 'TrialConverted'));
  } finally { trial.registration.close(); }

  // An account already paying is left alone.
  updates.length = 0;
  const active = moneyHarness({
    account: { subscriptionStatus: 'active', stripeSubscriptionId: 'sub_live', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 20 * 86400000).toISOString(), freeReportUsed: true },
    report: { document },
    stripe: trialStripe(),
  });
  try {
    const response = await request(active.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: active.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.deepEqual(updates, []);
  } finally { active.registration.close(); }

  // And a Stripe failure must never cost someone the report they just made.
  const broken = moneyHarness({
    account: { subscriptionStatus: 'trialing', stripeSubscriptionId: 'sub_trial', periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 20 * 86400000).toISOString(), freeReportUsed: true },
    report: { document },
    stripe: { subscriptions: { update: async () => { throw new Error('stripe is down'); } } },
  });
  try {
    const response = await request(broken.app, '/api/inspect/reports/rep_1/finalize', { method: 'POST', headers: broken.headers, body: '{}' });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).finalizedAt);
  } finally { broken.registration.close(); }
});

test('a trial about to bill for nothing gets a warning, once', async () => {
  const soon = new Date(Date.now() + 20 * 3600000);
  const h = moneyHarness({ account: { subscriptionStatus: 'trialing', reportsUsed: 0, periodEnd: soon.toISOString(), email: 'owner@example.com' } });
  try {
    await h.registration.sweep();
    assert.equal(h.calls.mail.length, 1);
    const sent = h.calls.mail[0];
    assert.equal(sent.to, 'owner@example.com');
    // It has to say the thing that stops a dispute: nothing has been taken.
    assert.match(sent.subject, /not been charged/i);
    assert.match(sent.text, /you have not been charged anything/i);
    assert.match(sent.text, /\$25 a month, or when you send your first report/);
    assert.match(sent.text, /https:\/\/bookmarketel\.com\/claims\?sim=0[\s\S]*Manage subscription[\s\S]*Cancel before/);
    assert.doesNotMatch(`${sent.from} ${sent.text}`, /Inspect/);
    // And never twice, however often the sweep runs.
    await h.registration.sweep();
    await h.registration.sweep();
    assert.equal(h.calls.mail.length, 1);
    assert.ok(h.calls.events.some(event => event.name === 'TrialReminderSent'));
  } finally { h.registration.close(); }

  // It names the tool and the plan the trial was for.
  const yearly = moneyHarness({ account: { subscriptionStatus: 'trialing', reportsUsed: 0, periodEnd: soon.toISOString() } });
  try {
    yearly.calls.events.push({ accountId: 'acct_1', name: 'TrialStarted', tool: 'inspect', detail: 'year' });
    await yearly.registration.sweep();
    assert.match(yearly.calls.mail[0].text, /\$199 a year/);
    assert.match(yearly.calls.mail[0].text, /bookmarketel\.com\/inspect\/\?sim=0/);
  } finally { yearly.registration.close(); }

  // Two days left of three is too early: that would land the day they signed up.
  const fresh = moneyHarness({ account: { subscriptionStatus: 'trialing', reportsUsed: 0, periodEnd: new Date(Date.now() + 2 * 86400000).toISOString() } });
  try {
    await fresh.registration.sweep();
    assert.equal(fresh.calls.mail.length, 0);
  } finally { fresh.registration.close(); }

  // Someone who has actually used it is converting on their own terms.
  const using = moneyHarness({ account: { subscriptionStatus: 'trialing', reportsUsed: 2, periodEnd: soon.toISOString() } });
  try {
    await using.registration.sweep();
    assert.equal(using.calls.mail.length, 0);
  } finally { using.registration.close(); }

  // And a trial with weeks left is not chased.
  const early = moneyHarness({ account: { subscriptionStatus: 'trialing', reportsUsed: 0, periodEnd: new Date(Date.now() + 20 * 86400000).toISOString() } });
  try {
    await early.registration.sweep();
    assert.equal(early.calls.mail.length, 0);
  } finally { early.registration.close(); }
});

test('the app stops quoting a price to someone who already paid, and a business is not a signature', () => {
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');

  // The reveal used to name $12 whatever the account held. canSend() already
  // knows about plans, credits and the free report.
  assert.match(client, /\$\{canSend\(\)\?`<p class="muted">Sending finalizes this version\. Included in your plan\.<\/p>`/);
  // And the export itself has always respected it, so the copy was the only lie.
  assert.match(client, /if\(canSend\(\)\)return finishExport\(action\);/);

  // A signature is a person. `author` can be filled from the business name,
  // which is how someone's signature came to read as their company.
  // Your own signature starts from the one you kept, or your remembered name,
  // never from the document's author (which can be the business).
  assert.match(client, /const name=existing\?\.name\|\|\(own\?\(savedSignature\(\)\?\.name\|\|rememberedAuthor\(\)\):''\);/);
  assert.doesNotMatch(client, /own\?\(draft\.document\.author/);
  assert.doesNotMatch(client, /role==='owner' \? \(draft\.document\.author\|\|rememberedAuthor\(\)\)/);

  // Where the phone stood proves nothing about damage found at checkout.
  assert.equal(require('../wedges/claims').types.damage.can.location, false);
  assert.match(client, /if\(wedge\(draft\.document\?\.type\)\.can\.location===false\)return Promise\.resolve\(\);/);
  assert.match(client, /\$\{wedge\(d\.type\)\.can\.location===false\?'':locationPreview\(d\)\}/);

  // The capture control is a microphone that needs the shell bridge, not a URL
  // scheme, and it never tells anyone to hold anything.
  assert.match(client, /const hudShell = \(\) => !!window\.webkit\?\.messageHandlers\?\.marketelShell;/);
  assert.doesNotMatch(client, /Hold to talk/);
});

test('the room is asked before the camera, and changing your mind leaves nothing behind', () => {
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'public', 'inspect', 'inspect.js'), 'utf8');
  const add = client.slice(client.indexOf("$('hud-next').onclick="), client.indexOf("document.querySelectorAll('[data-camera-room]')"));
  // For findings, "+ another room" only asks. Nothing is pushed until Done,
  // which is what used to leave "No observation recorded" in the report.
  const entryBranch = add.slice(add.indexOf('if(entries){'), add.indexOf('return;', add.indexOf('if(entries){')));
  assert.match(entryBranch, /cameraAsk='new'/);
  assert.doesNotMatch(entryBranch, /rooms\.push/);
  assert.match(entryBranch, /type:'inspectCameraClose'/);
  // The question has a way back, so a mistaken tap is never answered by
  // inventing a room name.
  assert.match(client, /id="hud-room-back"/);
  assert.match(client, /\$\('hud-room-back'\)\.onclick=\(\)=>\{haptic\(\);leaveCameraAsk\(\);\};/);
  // The camera sheet only opens once the room has a name or one is picked.
  assert.match(client, /if\(entryTool\(\)&&!\(room\?\.name\|\|''\)\.trim\(\)\)\{ cameraAsk='name'; cameraCompanion\(true\); return; \}/);
  // A dismissal we asked for is not the owner leaving the camera.
  assert.match(client, /window\.marketelInspectCameraClosed=\(\)=>\{\n  document\.documentElement\.classList\.remove\('camera-open'\);\n  if\(cameraAsk\|\|cameraBefore\)return;/);
});

test('Meta hears about the website, never about what happens inside the app', async () => {
  const price = { id: 'price_test', unit_amount: 2500, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } };
  const lead = (h, headers = {}) => request(h.app, '/api/inspect/checkout/sim', { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ interval: 'month', tool: 'claims', email: 'new@example.com' }) });

  // The same lead from the website is sent; from the iOS app it is not, because
  // pairing app activity with Meta's identifiers is tracking under Apple's rules.
  const web = moneyHarness({ stripe: { prices: { retrieve: async () => price }, customers: { list: async () => ({ data: [] }) } } });
  try {
    assert.equal((await lead(web, { Origin: 'https://bookmarketel.com' })).status, 200);
    assert.ok(web.calls.capi.some(event => event.name === 'Lead'));
  } finally { web.registration.close(); }
  const app = moneyHarness({ stripe: { prices: { retrieve: async () => price }, customers: { list: async () => ({ data: [] }) } } });
  try {
    assert.equal((await lead(app, { Origin: 'capacitor://localhost' })).status, 200);
    assert.equal(app.calls.capi.length, 0);
    // The lead is still ours; only Meta is left out.
    assert.ok(app.calls.events.some(event => event.name === 'LeadCaptured'));
  } finally { app.registration.close(); }

  // A payment Stripe reports is sent only for someone the website brought in.
  const paid = { type: 'checkout.session.completed', created: 1760000000, data: { object: {
    id: 'cs_paid_meta', mode: 'payment', payment_status: 'paid', amount_total: 1200, currency: 'usd',
    metadata: { product: 'marketel-inspect-report', inspectAccountId: 'acct_1', reportId: 'rep_1', tool: 'claims' } } } };
  const webhook = h => request(h.app, '/api/inspect-stripe-webhook', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': 't' }, body: JSON.stringify(paid) });
  const organic = moneyHarness();
  try {
    assert.equal((await webhook(organic)).status, 200);
    assert.ok(!organic.calls.capi.some(event => event.name === 'Purchase'));
  } finally { organic.registration.close(); }
  const fromAd = moneyHarness({ account: { metaAttribution: { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.abc' } } });
  try {
    assert.equal((await webhook(fromAd)).status, 200);
    assert.ok(fromAd.calls.capi.some(event => event.name === 'Purchase'));
  } finally { fromAd.registration.close(); }

  // Someone the ads once brought in who then pays from inside the app: Stripe
  // reports it, not the app, but it is still app activity and is not sent.
  const inApp = moneyHarness({ account: { metaAttribution: { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.abc' } } });
  try {
    paid.data.object.id = 'cs_paid_in_app';
    paid.data.object.metadata = { ...paid.data.object.metadata, source: 'app' };
    assert.equal((await webhook(inApp)).status, 200);
    assert.equal(inApp.calls.capi.length, 0);
    assert.ok(inApp.calls.events.some(event => event.name === 'PaymentSucceeded'), 'the purchase itself still counts');
  } finally { inApp.registration.close(); }

  // Which is why every checkout the app starts says so, and one from the
  // website does not.
  const marks = moneyHarness();
  try {
    const checkout = native => request(marks.app, '/api/inspect/checkout', { method: 'POST', headers: marks.headers, body: JSON.stringify({ interval: 'report', reportId: 'rep_1', native }) });
    assert.equal((await checkout(true)).status, 200);
    assert.equal(marks.calls.sessions.at(-1).params.metadata.source, 'app');
    assert.equal(marks.calls.sessions.at(-1).params.payment_intent_data.metadata.source, 'app');
    assert.equal((await checkout(false)).status, 200);
    assert.equal(marks.calls.sessions.at(-1).params.metadata.source, undefined);
  } finally { marks.registration.close(); }
  const client = require('node:fs').readFileSync(require('node:path').join(__dirname, '../inspect.js'), 'utf8');
  assert.match(client, /const metadata = \{ product: 'marketel-inspect', inspectAccountId: a\.id, interval, tool, \.\.\.\(nativeReturn \? \{ source: 'app' \} : \{\}\) \};[\s\S]{0,260}metadata,\s*subscription_data: \{ metadata \}/);
  assert.match(client, /appPurchase: subscription\.metadata\?\.source === 'app'/);
});

test('a browser switched off on /funnel counts for nothing: no steps, no Meta event', async () => {
  const visitorId = `v_${'b'.repeat(12)}`;
  const h = moneyHarness();
  try {
    const send = (name, extra = {}) => request(h.app, '/api/inspect/events/anon', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://bookmarketel.com', 'x-marketel-no-track': '1' },
      body: JSON.stringify({ name, tool: 'claims', visitorId, detail: 'month', attribution: { fbp: 'fb.1.1700000000.123' }, ...extra }) });
    for (const name of ['SimStarted', 'SimReportShown', 'SimCheckoutTapped']) {
      const response = await send(name);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, ignored: true });
    }
    assert.equal(h.calls.events.filter(e => e.visitorId === visitorId).length, 0, 'nothing recorded');
    assert.deepEqual(h.calls.capi, [], 'nothing sent to Meta');
    // Unknown names are still refused, switched off or not.
    assert.equal((await send('NotAStep')).status, 400);
    // And an ordinary visitor still counts.
    await request(h.app, '/api/inspect/events/anon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SimStarted', tool: 'claims', visitorId, detail: 'phone' }) });
    assert.equal(h.calls.events.filter(e => e.visitorId === visitorId && e.name === 'SimStarted').length, 1);
  } finally { h.registration.close(); }
});
