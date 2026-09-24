'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report } = require('./harness');
const { load } = require('../../wedges/registry');
const path = require('node:path');

for (const id of ['moveout', 'fixture']) {
  test(`${id}: baseline, report and text-only deadline render from its manifest`, async () => {
    const config = load({ fixture: true }).byId[id];
    const h = await open({ arm: id, includeFixture: id === 'fixture', native: false,
      accountData: { businessName: 'Unit Firm', active: true, remaining: 5, freeAvailable: false }, properties: ['Unit A'] });
    const checkCopy = async where => {
      const rendered = await h.page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('img[alt]')].filter(el => el.getClientRects().length).map(el => el.alt).join(' '));
      for (const word of config.copy.forbidden) assert.doesNotMatch(rendered, new RegExp(`\\b${word}\\b`, 'i'), `${where}: leaked ${word}`);
    };
    try {
      await h.page.waitForSelector('#new-report');
      await checkCopy('reports');
      await h.page.click('[data-page="properties"]');
      await h.page.waitForSelector('[data-baseline]');
      await checkCopy('properties');
      await h.page.click('[data-baseline]');
      await h.page.waitForSelector('#preview');
      await checkCopy('baseline editor');
      assert.match(await h.body(), /move-in/i);
      await h.page.setInputFiles('[data-files]', path.join(__dirname, '../../public/inspect/sample/inspect-wall-thumb.jpg'));
      await h.page.waitForSelector('[data-photo-id]');
      await h.page.click('#preview');
      await h.page.waitForSelector('[data-view-baseline]');
      assert.match(await h.body(), /Last move-in/i);
      await h.page.waitForSelector('[data-property]');
      await h.page.click('[data-property]');
      await h.page.waitForSelector('#preview');
      await checkCopy('report editor');
      await h.page.click('#to-details');
      await h.page.click('#use-existing-property');
      await h.page.waitForSelector('[data-existing-property]');
      await checkCopy('saved place sheet');
      await h.page.click('[data-existing-property]');
      await h.page.waitForSelector('#preview');
      await h.page.setInputFiles('[data-files]', path.join(__dirname, '../../public/inspect/sample/inspect-wall-thumb.jpg'));
      await h.page.waitForSelector('[data-photo-id]');
      await h.page.waitForFunction(() => [...document.querySelectorAll('[data-photo-id] figcaption')].some(el => el.textContent.includes('Saved')));
      const uploaded = h.data.photoCount;
      await h.page.click('#preview');
      await h.page.waitForSelector('#send-report');
      await h.page.waitForSelector('.comparison-banner');
      await checkCopy('preview');
      assert.doesNotMatch(await h.body(), /File by [A-Z][a-z]+ \d+/);
      await h.page.click('#send-report');
      await h.page.waitForSelector('.deadline');
      assert.equal(h.data.photoCount, uploaded, 'sending must reuse the background upload');
      assert.match(await h.body(), /Check the deposit return deadline/);
      assert.doesNotMatch(await h.body(), /File by [A-Z][a-z]+ \d+/);
      await checkCopy('send sheet');
      if (config.types[config.listTypes[0]].can.shareable) {
        await h.page.click('#delivery-share');
        await h.page.waitForSelector('#share-url');
        await checkCopy('share sheet');
        await h.page.evaluate(() => { document.execCommand = () => true; });
        await h.page.click('#copy-link');
        await h.page.waitForSelector('#copy-link.is-done');
        assert.match(await h.body(), /Copied ✓/);
        await checkCopy('copied notice');
      } else {
        assert.equal(await h.page.locator('#delivery-share, #delivery-originals').count(), 0);
        assert.ok(await h.page.locator('#delivery-pdf').count());
      }
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('a saved unit does not show another wedge\'s latest report as its own', async () => {
  const other = report('damage', { finalizedAt: new Date().toISOString(), document: {
    propertyName: 'Unit A', type: 'damage', date: '2026-09-20', author: 'Sam',
    rooms: [{ name: 'Kitchen', observation: '', issue: false, photos: [] }], signatures: [] } });
  const h = await open({ arm: 'fixture', includeFixture: true, signedIn: true,
    accountData: { businessName: 'Unit Firm' }, reports: [other], properties: ['Unit A'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('[data-page="properties"]');
    await h.page.waitForSelector('.property-row');
    assert.doesNotMatch(await h.body(), /damage/i);
    h.assertClean();
  } finally { await h.close(); }
});
