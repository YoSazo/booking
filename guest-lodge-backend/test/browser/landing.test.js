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
    assert.ok(frame.w <= 420 && frame.x > 300, JSON.stringify(frame));
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
