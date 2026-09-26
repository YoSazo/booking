'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

for (const arm of ['claims', 'inspect', 'incident']) {
  test(`${arm}: landing names its own product and leads to setup`, async () => {
    const h = await open({ arm, signedIn: false });
    try {
      await h.page.waitForSelector(arm === 'claims' ? '#see-demo' : '#start');
      const text = await h.body();
      assert.match(text, new RegExp(arm, 'i'));
      if (arm === 'claims') {
        assert.match(text, /damage/i);
        // The landing leads with the simulation; a real report is one quiet tap away.
        assert.equal(await h.page.isVisible('#lead-form'), false);
        await h.page.click('#real-report');
        await h.page.fill('#lead-email', 'owner@example.test');
        await h.page.click('#start');
      } else await h.page.click('#start');
      if (arm === 'claims') await h.page.waitForSelector('#setup-business, #setup-property', { timeout: 5000 });
      else assert.match(await h.body(), /Which property\?|Which location\?/);
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('saved property is one tap from the signed-in setup card', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    assert.match(await h.body(), /Which rental/);
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('#preview');
    assert.match(await h.body(), /Finding 1/);
    h.assertClean();
  } finally { await h.close(); }
});

// On a computer the landing leads with the simulation, which runs inside a
// phone frame that also holds its camera sheet, and ← Back returns.
test('desktop: See how it works opens the simulation in a phone frame', async () => {
  const h = await open({ arm: 'claims', signedIn: false, viewport: { width: 1280, height: 800 } });
  try {
    await h.page.waitForSelector('#see-demo');
    assert.match(await h.page.textContent('#see-demo'), /See how it works/);
    await h.page.click('#see-demo');
    await h.page.waitForSelector('[data-sim-pick]');
    assert.equal(await h.page.evaluate(() => document.documentElement.classList.contains('sim-framed')), true);
    const frame = await h.page.evaluate(() => { const r = document.getElementById('app').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    assert.ok(frame.w <= 420 && frame.x > 100, JSON.stringify(frame)); // phone-sized, set in from the edge
    await h.page.locator('[data-sim-pick]').first().click();
    await h.page.waitForSelector('.sim-sheet');
    const sheet = await h.page.evaluate(() => { const r = document.querySelector('.sim-sheet').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    assert.ok(sheet.x >= frame.x - 1 && sheet.x + sheet.w <= frame.x + frame.w + 1 && sheet.y + sheet.h <= frame.y + frame.h + 1, JSON.stringify({ frame, sheet }));
    await h.page.click('#sim-frame-back');
    await h.page.waitForSelector('#see-demo');
    assert.equal(await h.page.evaluate(() => document.documentElement.classList.contains('sim-framed')), false);
    h.assertClean();
  } finally { await h.close(); }
});

// Wide enough, the report builds beside the phone and the offer ends up next to
// it; too narrow, the phone stands alone and keeps its offer and pay bar.
for (const [width, split] of [[1280, true], [800, false]]) {
  test(`desktop ${width}px: the demo ${split ? 'builds the report beside the phone and offers beside it' : 'keeps everything in the phone'}`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, viewport: { width, height: 800 } });
    try {
      await h.page.waitForSelector('#see-demo');
      await h.page.click('#see-demo');
      await h.page.locator('[data-sim-pick]').first().click();
      await h.page.waitForSelector('#sim-mic-button');
      assert.equal(!!(await h.page.$('#sim-side')), split);
      if (split) assert.match(await h.page.textContent('#sim-side-note'), /Your words become this note/);
      await h.page.click('#sim-mic-button');
      await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
      if (split) assert.doesNotMatch(await h.page.textContent('#sim-side-note'), /Your words become this note/);
      await h.page.click('#sim-shutter');
      await h.page.waitForSelector('#sim-see', { timeout: 10000 });
      if (split) {
        await h.page.waitForSelector('#sim-side .sim-side-photo img');
        assert.match(await h.page.textContent('#sim-side .sim-side-photo figcaption'), /\d{4} · \d{1,2}:\d{2}/);
        assert.match(await h.page.textContent('#sim-side'), /File by /);
      }
      await h.page.click('#sim-see');
      await h.page.waitForSelector('#sim-next'); await h.page.click('#sim-next');
      await h.page.waitForSelector('#sim-buy');
      const where = await h.page.evaluate(() => ({ inSide: !!document.querySelector('#sim-side #sim-buy'), inPhone: !!document.querySelector('#app #sim-buy'),
        paybar: getComputedStyle(document.getElementById('sim-paybar')).display, date: document.querySelector('.sim-doc .muted')?.textContent || '' }));
      assert.deepEqual({ inSide: where.inSide, inPhone: where.inPhone, paybarShown: where.paybar !== 'none' }, { inSide: split, inPhone: !split, paybarShown: !split });
      assert.doesNotMatch(where.date, /\d{4}-\d{2}-\d{2}/, 'the sample report shows its date in words');
      h.assertClean();
    } finally { await h.close(); }
  });
}

// A hidden control must be gone, not just marked: the demo camera's Done once
// showed from the start, and tapping it skipped the note and the photo.
test('phone demo: the camera\'s Done appears only once the note and photo are done', async () => {
  const h = await open({ arm: 'claims', signedIn: false, demo: true, viewport: { width: 390, height: 844 } });
  try {
    await h.page.waitForSelector('[data-sim-pick]');
    await h.page.locator('[data-sim-pick]').first().click();
    await h.page.waitForSelector('#sim-mic-button');
    assert.equal(await h.page.isVisible('#sim-done'), false);
    const shown = await h.page.evaluate(() => [...document.querySelectorAll('[hidden]')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id || el.className));
    assert.deepEqual(shown, [], 'every hidden element is off screen');
    await h.page.click('#sim-mic-button');
    await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
    assert.equal(await h.page.isVisible('#sim-done'), false, 'still hidden before the photo');
    await h.page.click('#sim-shutter');
    await h.page.waitForSelector('#sim-see', { timeout: 10000 });
    assert.equal(await h.page.isVisible('#sim-done'), true);
    h.assertClean();
  } finally { await h.close(); }
});

// Under the offer, screens of the real app: in the phone on a phone, beside it
// on a wide screen, and not at all for a wedge the approved app does not carry.
for (const [arm, width, expect] of [['claims', 390, 'phone'], ['claims', 1280, 'side'], ['moveout', 390, 'none']]) {
  test(`${arm} at ${width}px: the real app's screens ${expect === 'none' ? 'are not shown' : `sit under the offer (${expect})`}`, async () => {
    const h = await open({ arm, signedIn: false, demo: width < 760, viewport: { width, height: 844 } });
    try {
      if (width >= 760) { await h.page.waitForSelector('#see-demo'); await h.page.click('#see-demo'); }
      await h.page.locator('[data-sim-pick]').first().click();
      await h.page.waitForSelector('#sim-mic-button');
      await h.page.click('#sim-mic-button');
      await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
      await h.page.click('#sim-shutter');
      await h.page.waitForSelector('#sim-see', { timeout: 10000 });
      await h.page.click('#sim-see');
      await h.page.waitForSelector('#sim-next'); await h.page.click('#sim-next');
      await h.page.waitForSelector('#sim-buy');
      const proof = await h.page.evaluate(() => { const p = document.getElementById('sim-app-proof'); return p ? { inSide: !!p.closest('#sim-side'), inPhone: !!p.closest('#app'), afterOffer: !!(document.getElementById('sim-offer').compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING), shots: p.querySelectorAll('figure img').length, captions: [...p.querySelectorAll('figcaption')].map(f => f.textContent) } : null; });
      if (expect === 'none') { assert.equal(proof, null); return h.assertClean(); }
      assert.ok(proof && proof.shots === 4 && proof.afterOffer, JSON.stringify(proof));
      assert.equal(proof.inSide, expect === 'side');
      assert.equal(proof.inPhone, expect === 'phone');
      assert.ok(!proof.captions.some(c => /book directly/i.test(c)), 'no booking-engine captions');
      await h.page.locator('#sim-app-proof').scrollIntoViewIfNeeded();
      await h.page.waitForFunction(() => [...document.querySelectorAll('#sim-app-proof img')].slice(0, 1).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 5000 });
      // It reads as a carousel: an arrow to go on, dots that follow, a way back.
      const onDot = () => h.page.evaluate(() => [...document.querySelectorAll('.sim-dot')].findIndex(dot => dot.classList.contains('is-on')));
      const shown = selector => h.page.evaluate(s => !document.querySelector(s).hidden, selector);
      assert.equal(await onDot(), 0);
      assert.equal(await shown('.sim-screens-arrow.is-prev'), false, 'no way back from the first screen');
      assert.equal(await shown('.sim-screens-arrow.is-next'), true);
      await h.page.click('.sim-screens-arrow.is-next');
      await h.page.waitForFunction(() => document.querySelectorAll('.sim-dot')[1].classList.contains('is-on'), null, { timeout: 3000 });
      assert.equal(await shown('.sim-screens-arrow.is-prev'), true);
      await h.page.click('.sim-dot:nth-child(4)');
      await h.page.waitForFunction(() => document.querySelectorAll('.sim-dot')[3].classList.contains('is-on'), null, { timeout: 3000 });
      assert.equal(await shown('.sim-screens-arrow.is-next'), false, 'no way on from the last screen');
      await h.page.click('.sim-screens-arrow.is-prev');
      await h.page.waitForFunction(() => document.querySelectorAll('.sim-dot')[2].classList.contains('is-on'), null, { timeout: 3000 });
      h.assertClean();
    } finally { await h.close(); }
  });
}

// The report is its own page, with one way on; the price is the next page.
for (const [width, desktop] of [[390, false], [1280, true]]) {
  test(`${desktop ? 'desktop' : 'phone'}: the report comes first with no price, then "Get this" opens the offer`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, demo: !desktop, viewport: { width, height: 844 } });
    try {
      if (desktop) { await h.page.waitForSelector('#see-demo'); await h.page.click('#see-demo'); }
      await h.page.locator('[data-sim-pick]').first().click();
      await h.page.waitForSelector('#sim-mic-button');
      await h.page.click('#sim-mic-button');
      await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
      await h.page.click('#sim-shutter');
      await h.page.waitForSelector('#sim-see', { timeout: 10000 });
      await h.page.click('#sim-see');
      await h.page.waitForSelector('#sim-next');
      const report = await h.page.evaluate(() => ({ price: !!document.getElementById('sim-buy'), offer: !!document.getElementById('sim-offer'), text: document.body.innerText }));
      assert.deepEqual({ price: report.price, offer: report.offer }, { price: false, offer: false }, 'no price on the report page');
      assert.match(report.text, /Get this for my property/);
      await h.page.click(desktop ? '#sim-next-side' : '#sim-next');
      await h.page.waitForSelector('#sim-buy');
      if (desktop) {
        const where = await h.page.evaluate(() => ({ offerInSide: !!document.querySelector('#sim-side #sim-buy'), phoneStillReport: !!document.querySelector('#app .sim-report') }));
        assert.deepEqual(where, { offerInSide: true, phoneStillReport: true });
      } else {
        assert.equal(await h.page.isVisible('.sim-report'), false, 'the offer is its own page');
        await h.page.waitForTimeout(150);
        const top = await h.page.evaluate(() => ({ scroll: window.scrollY, price: document.querySelector('#sim-offer .price').getBoundingClientRect().top }));
        assert.ok(top.scroll < 5 && top.price < 700, `the offer opens at the top, price in view: ${JSON.stringify(top)}`);
        await h.page.click('#sim-back-report');
        await h.page.waitForSelector('#sim-next');
        assert.equal(!!(await h.page.$('#sim-buy')), false, 'back on the report, still no price');
      }
      const steps = h.events.map(e => e.name);
      assert.ok(steps.includes('SimReportShown') && steps.includes('SimGetThisTapped') && steps.indexOf('SimGetThisTapped') < steps.indexOf('SimOfferViewed'), JSON.stringify(steps));
      h.assertClean();
    } finally { await h.close(); }
  });
}
