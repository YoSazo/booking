'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { load, validate } = require('../wedges/registry');
const { open } = require('../test/browser/harness');
const root = path.resolve(__dirname, '..');
const workspace = path.resolve(root, '..');
const registry = load({ fixture: true });
const target = process.argv[2] || 'all';
const wedges = target === 'all' ? registry.all : [registry.byId[target]];
if (wedges.some(item => !item)) throw new Error(`Unknown wedge ${target}`);
const fail = message => { throw new Error(message); };
const wordPattern = word => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
const copied = fs.readFileSync(path.join(root, 'public/inspect/wedges.js'), 'utf8');
const iosWedges = fs.readFileSync(path.join(workspace, 'marketel-frontdesk-ios/www/inspect/wedges.js'), 'utf8');
const webApp = fs.readFileSync(path.join(root, 'public/inspect/inspect.js'));
const iosApp = fs.readFileSync(path.join(workspace, 'marketel-frontdesk-ios/www/inspect/inspect.js'));
if (copied !== iosWedges || !webApp.equals(iosApp)) fail('Web and app wedge bundles differ. Rebuild and mirror first.');
execFileSync(process.execPath, [path.join(__dirname, 'wedges-build.js'), '--check'], { cwd: root, stdio: 'inherit' });

function checkManifest(wedge) {
  validate(wedge);
  const allFields = JSON.stringify({ ...wedge, copy: undefined });
  if (/TODO/.test(allFields)) fail(`${wedge.id}: fill every TODO before checking`);
  const visibleFields = { chooser: wedge.chooser, termsIntro: wedge.termsIntro, skin: wedge.skin, landing: wedge.landing, demo: wedge.demo,
    types: Object.values(wedge.types).map(type => ({ label: type.label, eyebrow: type.eyebrow, dateLabel: type.dateLabel,
      propertyLabel: type.propertyLabel, disclaimer: type.disclaimer, baselineAction: type.baselineAction,
      baselineSave: type.baselineSave, signerHint: type.can.signerHint, deadline: type.can.deadline?.text })) };
  const strings = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings)
    : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
  const raw = strings(visibleFields).join('\n');
  if (/\b(guarantee(?:d|s)?|winning|win|get your money back)\b/i.test(raw)) fail(`${wedge.id}: copy promises an outcome`);
  if (/\b20\d{2}-\d{2}-\d{2}\b/.test(raw)) fail(`${wedge.id}: write dates in words`);
  for (const label of [wedge.chooser, wedge.skin.navCreate, wedge.skin.listHeading, wedge.skin.placesHeading]) {
    const first = label.replace(/^[^A-Za-z]+/, '')[0];
    if (first && first !== first.toUpperCase()) fail(`${wedge.id}: sentence-case labels must start with a capital letter`);
  }
  const checks = [
    ['chooser', wedge.chooser, 125],
    ['headline', wedge.landing.golden?.headline || wedge.landing.title || wedge.skin.offerHeading, 160],
    ['CTA', wedge.landing.golden?.cta || wedge.skin.navCreate, 55],
    ['nav', wedge.skin.navCreate, 40],
  ];
  for (const [field, value, max] of checks) if (typeof value !== 'string' || value.replace(/<[^>]+>/g, '').length > max) fail(`${wedge.id}: ${field} must be under ${max} characters`);
  for (const caption of wedge.appStore.captions) if (caption.length > 90 || caption.split('\n').length > 2) fail(`${wedge.id}: App Store caption is too long`);
  if (wedge.status !== 'hidden' && wedge.appStore.captions.length < 4) fail(`${wedge.id}: add four App Store captions`);
  for (const forbidden of wedge.copy.forbidden) if (wordPattern(forbidden).test(raw)) fail(`${wedge.id}: manifest contains forbidden copy ${forbidden}`);
  if (wedge.demo) {
    const sample = path.join(root, 'public/inspect/sample');
    for (const finding of wedge.demo.findings) {
      for (const suffix of ['.jpg', '-thumb.jpg']) {
        const file = path.join(sample, finding.photo + suffix);
        if (!fs.existsSync(file)) fail(`${wedge.id}: missing ${file}`);
        const max = suffix === '.jpg' ? (wedge.status === 'draft' ? 300_000 : 500_000) : 40_000;
        if (fs.statSync(file).size > max) fail(`${wedge.id}: ${file} exceeds ${max} bytes`);
      }
    }
  }
}
// Sentences of five or more words that belong to another wedge's manifest and
// not to this one. The engine rendering one of them in this wedge means copy
// is hard-coded somewhere it should come from the manifest.
function foreignPhrases(wedge) {
  const own = JSON.stringify(wedge);
  const phrases = new Set();
  const walk = value => {
    if (typeof value === 'string') {
      for (const sentence of value.split(/(?<=[.!?])\s+/)) {
        const text = sentence.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.split(' ').length >= 5 && !text.includes('${') && !own.includes(text)) phrases.add(text);
      }
    } else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  for (const other of registry.all) if (other.id !== wedge.id) walk({ ...other, copy: undefined });
  return [...phrases];
}
// A phrase another wedge also uses is fine when the engine builds it from a
// template around this wedge's own noun ("PDF export on every ${doc}" renders
// "…every record" for any wedge whose document is a record). A phrase with none
// of this wedge's nouns in it is a real leak.
const engineSource = fs.readFileSync(path.join(root, 'public/inspect/inspect.js'), 'utf8');
function engineTemplate(wedge, phrase) {
  const nouns = [...(wedge.copy.nouns || []), wedge.skin?.doc, wedge.skin?.docPlural, wedge.skin?.placeSingular].filter(Boolean);
  const used = nouns.filter(noun => wordPattern(noun).test(phrase));
  if (!used.length) return false;
  const around = phrase.split(new RegExp(`\\b(?:${used.map(noun => noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i'))
    .map(part => part.replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, '')).filter(part => part.length >= 3);
  return around.length > 0 && around.every(part => engineSource.includes(part));
}
async function scanCopy(wedge, page, label) {
  const visible = (await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('img[alt]')].filter(img => img.getClientRects().length).map(img => img.alt).join(' '))).replace(/\s+/g, ' ');
  for (const forbidden of wedge.copy.forbidden) if (wordPattern(forbidden).test(visible)) fail(`${wedge.id} ${label}: rendered copy contains ${forbidden}`);
  for (const phrase of foreignPhrases(wedge)) if (visible.includes(phrase) && !engineTemplate(wedge, phrase)) fail(`${wedge.id} ${label}: shows another wedge's copy "${phrase}"`);
}
async function renderedCopy(wedge) {
  const fixture = wedge.id === 'fixture';
  const check = (page, label) => scanCopy(wedge, page, label);
  const landing = await open({ arm: wedge.id, includeFixture: fixture, signedIn: false, demo: !!wedge.demo });
  try {
    await landing.page.waitForSelector(wedge.demo ? '[data-sim-pick]' : '#start');
    await check(landing.page, 'landing');
    if (wedge.demo) {
      await landing.page.locator('[data-sim-pick]').first().click();
      await landing.page.click('#sim-mic-button');
      await landing.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
      await landing.page.click('#sim-shutter');
      await landing.page.waitForSelector('#sim-see', { timeout: 10000 });
      await landing.page.click('#sim-see');
      await landing.page.waitForSelector('#sim-buy');
      await check(landing.page, 'demo report');
    }
    landing.assertClean();
  } finally { await landing.close(); }
  const pricing = await open({ arm: wedge.id, includeFixture: fixture, signedIn: false, demo: false });
  try {
    await pricing.page.waitForSelector('#see-plans');
    await pricing.page.click('#see-plans');
    await pricing.page.waitForSelector('#plan-start');
    await check(pricing.page, 'plans');
    pricing.assertClean();
  } finally { await pricing.close(); }
  const signed = await open({ arm: wedge.id, includeFixture: fixture, signedIn: true, accountData: { businessName: 'Unit Firm', active: true, remaining: 5 }, properties: ['Unit A'] });
  try {
    await signed.page.waitForSelector('#new-report');
    await check(signed.page, 'reports');
    await signed.page.click('[data-page="properties"]');
    await signed.page.waitForSelector('#new-property');
    await check(signed.page, 'places');
    signed.assertClean();
  } finally { await signed.close(); }
}
async function artifacts(wedge) {
  if (!wedge.demo) return;
  const dest = path.join(workspace, 'artifacts/wedges', wedge.id);
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(dest)) {
    if (/^(opening-frame|camera|capture|preview|send-sheet|share-sheet|private-link)\.png$/.test(file)
      || /^demo-walkthrough\.(webm|mp4)$/.test(file) || /^[a-f0-9]{32}\.webm$/.test(file)) fs.unlinkSync(path.join(dest, file));
  }
  const fixture = wedge.id === 'fixture';
  const options = { arm: wedge.id, includeFixture: fixture, viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 };
  const shot = async (page, file) => {
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); });
    if (await page.locator('main#app').count()) {
      const loaded = await page.evaluate(() => document.fonts.check('400 16px "DM Sans"'));
      if (!loaded) fail(`${wedge.id}: DM Sans did not load before ${file}`);
    }
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(dest, file), animations: 'disabled' });
  };
  const demo = await open({ ...options, signedIn: false, demo: true, videoDir: dest });
  let rawVideo;
  try {
    await demo.page.waitForSelector('[data-sim-pick]');
    await shot(demo.page, 'opening-frame.png');
    await demo.page.locator('[data-sim-pick]').first().click();
    await demo.page.waitForSelector('#sim-mic-button');
    await shot(demo.page, 'camera.png');
    await demo.page.click('#sim-mic-button');
    await demo.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
    await demo.page.click('#sim-shutter');
    await demo.page.waitForSelector('#sim-see', { timeout: 10000 });
    await demo.page.click('#sim-see');
    await demo.page.waitForSelector('#sim-buy');
    rawVideo = await demo.page.video().path();
    demo.assertClean();
  } finally { await demo.close(); }
  const webm = path.join(dest, 'demo-walkthrough.webm');
  fs.copyFileSync(rawVideo, webm);
  fs.unlinkSync(rawVideo);
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2', '-r', '30', path.join(dest, 'demo-walkthrough.mp4')], { stdio: 'pipe' }); }
  catch { console.warn(`${wedge.id}: ffmpeg unavailable; walkthrough is in WebM`); }
  const app = await open({ ...options, signedIn: true, accountData: { businessName: 'Unit Firm', active: true, remaining: 5 },
    properties: ['Unit A'], photoFallback: path.join(root, 'public/inspect/sample', wedge.demo.findings[0].photo + '-thumb.jpg') });
  try {
    await app.page.waitForSelector('#new-report');
    await app.page.click('#new-report');
    const chip = app.page.locator('[data-pick-property]').first();
    if (await chip.count()) await chip.click();
    else if (await app.page.locator('#setup-property').count()) { await app.page.fill('#setup-property', 'Unit A'); await app.page.click('#setup-build'); }
    await app.page.waitForSelector('#preview');
    for (let index = 0; index < wedge.demo.findings.length; index++) {
      const finding = wedge.demo.findings[index];
      if (index) await app.page.click('#add-room');
      const room = app.page.locator(`[data-room="${index}"]`);
      await room.locator('[data-field="name"]').fill(wedge.types[wedge.listTypes[0]].unit === 'entry' ? finding.label : finding.room);
      await room.locator('.write-own summary').click();
      await room.locator('[data-field="observation"]').fill(finding.note);
      await room.locator('[data-files]').setInputFiles(path.join(root, 'public/inspect/sample', finding.photo + '.jpg'));
      await app.page.waitForFunction(count => document.querySelectorAll('[data-photo-id]').length >= count, index + 1);
    }
    await shot(app.page, 'capture.png');
    await app.page.click('#preview');
    await app.page.waitForSelector(wedge.offer.mode === 'pay-at-export' ? '#send-report' : '#finalize');
    for (const finding of wedge.demo.findings) if (!(await app.body()).includes(finding.note)) fail(`${wedge.id}: screenshot preview is missing ${finding.id} note`);
    await scanCopy(wedge, app.page, 'preview');
    await shot(app.page, 'preview.png');
    await app.page.click(wedge.offer.mode === 'pay-at-export' ? '#send-report' : '#finalize');
    await app.page.waitForSelector('#delivery-pdf');
    await scanCopy(wedge, app.page, 'send sheet');
    await shot(app.page, 'send-sheet.png');
    if (wedge.types[wedge.listTypes[0]].can.shareable) {
      await app.page.click('#delivery-share');
      await app.page.waitForSelector('#share-url');
      await shot(app.page, 'share-sheet.png');
      await app.page.goto('http://app.test/api/inspect/shared/test');
      await app.page.waitForSelector('figure img');
      await scanCopy(wedge, app.page, 'private link');
      await shot(app.page, 'private-link.png');
    }
    app.assertClean();
  } finally { await app.close(); }
  console.log(`${wedge.id}: screenshots and walkthrough in ${dest}`);
}
(async () => {
  for (const wedge of wedges) checkManifest(wedge);
  for (const wedge of wedges) await renderedCopy(wedge);
  execFileSync('npm', ['test'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'test:browser'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'verify:release'], { cwd: path.join(workspace, 'marketel-frontdesk-ios'), stdio: 'inherit' });
  for (const wedge of wedges.filter(item => item.id === target || (target === 'all' && item.status === 'draft'))) await artifacts(wedge);
  console.log(`wedge:check ${target} passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
