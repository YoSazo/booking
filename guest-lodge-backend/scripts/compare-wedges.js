'use strict';
// Run with a clean main worktree: node scripts/compare-wedges.js /path/to/main
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { open, report } = require('../test/browser/harness');

const main = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(main, 'guest-lodge-backend/public/inspect/index.html'))) throw new Error('Pass the main worktree path');
const out = path.resolve(__dirname, '../../artifacts/wedges/pixel-diff');
fs.mkdirSync(out, { recursive: true });
const typeFor = { claims: 'damage', inspect: 'routine', incident: 'incident' };
const pause = page => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {})));
});
async function capture(arm, state, old) {
  const type = typeFor[arm];
  const saved = report(type, { id: 'same-report', finalizedAt: '2026-09-23T12:00:00.000Z', document: {
    propertyName: 'Pine Cottage', author: 'A. Host', type, date: '2026-09-23',
    rooms: [{ name: type === 'damage' ? '' : 'Kitchen', observation: 'Scuff beside the door.', issue: false, photos: [] }], signatures: []
  } });
  const h = await open({ arm, signedIn: state !== 'landing', demo: false,
    accountData: { businessName: 'Pine Stays', active: true, remaining: 5 },
    reports: [saved], properties: ['Pine Cottage'], viewport: { width: 390, height: 844 },
    webRoot: old ? path.join(main, 'guest-lodge-backend/public/inspect') : undefined });
  try {
    if (state === 'landing') await h.page.waitForSelector('#start');
    else await h.page.waitForSelector('[data-open]');
    if (state === 'editor' || state === 'preview') {
      await h.page.click('#new-report');
      if (arm !== 'claims') {
        await h.page.waitForSelector('#property');
        await h.page.fill('#property', 'Pine Cottage');
        await h.page.click('#to-rooms');
      } else {
        await h.page.waitForSelector('[data-pick-property]');
        await h.page.locator('[data-pick-property]').first().click();
      }
      await h.page.waitForSelector('#preview');
      if (state === 'preview') {
        await h.page.locator('.write-own summary').first().click();
        await h.page.locator('[data-field="observation"]').first().fill('Scuff beside the door.');
        await h.page.click('#preview');
        await h.page.waitForSelector('#edit');
      }
    }
    await pause(h.page);
    await h.page.waitForTimeout(500);
    const file = path.join(out, `${arm}-${state}-${old ? 'main' : 'branch'}.png`);
    await h.page.screenshot({ path: file, animations: 'disabled' });
    h.assertClean();
    return file;
  } finally { await h.close(); }
}
async function compare(left, right, dest) {
  const a = await sharp(left).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(right).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error('Screenshot dimensions differ');
  const { width, height } = a.info;
  const diff = Buffer.alloc(width * height * 3);
  let changed = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const pos = pixel * 3, x = pixel % width, y = Math.floor(pixel / width);
    const different = Math.max(Math.abs(a.data[pos] - b.data[pos]), Math.abs(a.data[pos + 1] - b.data[pos + 1]), Math.abs(a.data[pos + 2] - b.data[pos + 2])) > 8;
    if (different) { changed++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    for (let c = 0; c < 3; c++) diff[pos + c] = different ? [220, 42, 52][c] : Math.round(a.data[pos + c] * .35 + 165);
  }
  await sharp(diff, { raw: { width, height, channels: 3 } }).png().toFile(dest);
  return { changed, percent: (changed * 100 / (width * height)).toFixed(2), bounds: changed ? `${minX},${minY}–${maxX},${maxY}` : 'none' };
}
(async () => {
  const rows = [];
  for (const arm of Object.keys(typeFor)) for (const state of ['landing', 'reports', 'editor', 'preview']) {
    const left = await capture(arm, state, true);
    const right = await capture(arm, state, false);
    const result = await compare(left, right, path.join(out, `${arm}-${state}-diff.png`));
    rows.push({ arm, state, ...result });
    console.log(`${arm} ${state}: ${result.percent}% (${result.changed} pixels), bounds ${result.bounds}`);
  }
  fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(rows, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
