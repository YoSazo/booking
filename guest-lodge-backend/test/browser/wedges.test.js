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

// The business name belongs inside the report. A bare `header` CSS rule used to
// pin it over the site bar on the web and hide it entirely in the app.
for (const native of [false, true]) {
  test(`${native ? 'app' : 'web'}: the business name sits inside the report preview`, async () => {
    const h = await open({ arm: 'claims', native, accountData: { businessName: 'Unit Firm', active: true, remaining: 5, freeAvailable: false }, properties: ['Pine Ave'] });
    try {
      await h.page.waitForSelector('#new-report');
      if (native) await h.page.evaluate(() => window.marketelInspectNativeSelectTab('properties'));
      else await h.page.click('[data-page="properties"]');
      await h.page.waitForSelector('[data-property]');
      await h.page.click('[data-property]');
      await h.page.waitForSelector('#preview');
      await h.page.click('#preview');
      await h.page.waitForSelector('.biz-header', { state: 'attached' });
      const biz = await h.page.evaluate(() => { const el = document.querySelector('.biz-header'), style = getComputedStyle(el), box = el.getBoundingClientRect(), card = el.closest('article')?.getBoundingClientRect();
        return { position: style.position, shown: style.display !== 'none' && box.height > 0, inside: !!card && box.top >= card.top && box.bottom <= card.bottom, text: el.innerText.trim() }; });
      assert.equal(biz.position, 'static', JSON.stringify(biz));
      assert.ok(biz.shown && biz.inside && biz.text === 'Unit Firm', JSON.stringify(biz));
      h.assertClean();
    } finally { await h.close(); }
  });
}

// Each wedge's send sheet speaks for itself: the originals line comes from its
// manifest, so a landlord never reads Claims' "Some platforms ask for these."
test('the originals line on the send sheet is each wedge\'s own', () => {
  const registry = load({ fixture: true });
  const offered = registry.all.flatMap(wedge => Object.entries(wedge.types).filter(([, type]) => type.can.originals).map(([id, type]) => ({ wedge: wedge.id, id, line: type.originalsLine })));
  assert.ok(offered.length >= 2, JSON.stringify(offered));
  for (const item of offered) assert.ok(item.line && item.line.trim(), `${item.wedge}/${item.id} needs an originalsLine`);
  const moveout = offered.find(item => item.wedge === 'moveout');
  assert.doesNotMatch(moveout.line, /platform/i);
  const source = require('node:fs').readFileSync(path.join(__dirname, '../../public/inspect/inspect.js'), 'utf8');
  assert.doesNotMatch(source, /Some platforms ask for these|Open Claims on the web|bookmarketel\.com\/claims'/, 'Claims copy is hard-coded in the engine');
});

// appStore.live is the switch between "use it here in the browser" and "get the
// iPhone app" after paying. Claims stays on the web until Apple approves.
for (const [id, live] of [['claims', false], ['fixture', true]]) {
  test(`${id}: after paying, ${live ? 'buyers are pointed at the iPhone app' : 'buyers start in the browser and never see the App Store'}`, async () => {
    const config = load({ fixture: true }).byId[id];
    assert.equal(config.appStore.live, live);
    const h = await open({ arm: id, includeFixture: id === 'fixture', signedIn: false, demo: true });
    try {
      await h.page.goto(`http://app.test/${id}?checkout=success`, { waitUntil: 'domcontentloaded' });
      await h.page.waitForSelector('.sim-thanks');
      const view = await h.page.evaluate(() => ({ appLink: !!document.querySelector('.sim-thanks a[href*="apps.apple.com"]'),
        start: document.getElementById('sim-signin')?.textContent.trim(), text: document.querySelector('.sim-thanks').innerText }));
      if (live) {
        assert.ok(view.appLink, JSON.stringify(view));
        assert.match(view.text, /Get the iPhone app/);
      } else {
        assert.ok(!view.appLink && !/iPhone app|App Store/i.test(view.text), JSON.stringify(view));
        assert.match(view.start, /^Start your first /);
        await h.page.click('#sim-signin');
        await h.page.waitForSelector('#auth-email, #email-form, [type="email"]', { timeout: 5000 });
      }
      h.assertClean();
    } finally { await h.close(); }
  });
}
