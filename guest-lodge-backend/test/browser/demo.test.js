'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

test('demo moves from sample photo and dictation to the real offer', async () => {
  const h = await open({ arm: 'claims', demo: true, signedIn: false });
  try {
    // The public sample is independent of the owner's draft and account.
    await h.page.waitForSelector('[data-sim-pick]');
    const images = await h.page.locator('.sim-pick img').count();
    assert.ok(images >= 3);
    await h.page.locator('[data-sim-pick]').first().click();
    await h.page.waitForSelector('#sim-mic-button');
    await h.page.click('#sim-mic-button');
    await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 8000 });
    await h.page.click('#sim-shutter');
    await h.page.waitForSelector('#sim-see', { timeout: 8000 });
    await h.page.click('#sim-see');
    await h.page.waitForSelector('#sim-buy');
    const text = await h.body();
    assert.match(text, /\$25/);
    assert.match(text, /Start 3 days free|3 days free/i);
    await h.page.click('#sim-keep');
    await h.page.waitForSelector('#sim-keep-form');
    assert.match(await h.body(), /Building .* is always free/i);
    h.assertClean();
  } finally { await h.close(); }
});

test('the sample purchase CTA records intent before checkout', async () => {
  const h = await open({ arm: 'claims', demo: true, signedIn: false });
  try {
    await h.page.waitForSelector('[data-sim-pick]');
    await h.page.locator('[data-sim-pick]').first().click();
    await h.page.waitForSelector('#sim-mic-button');
    await h.page.click('#sim-mic-button');
    await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 8000 });
    await h.page.click('#sim-shutter');
    await h.page.waitForSelector('#sim-see', { timeout: 8000 });
    await h.page.click('#sim-see');
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#sim-email-field');
    await h.page.fill('#sim-email-field', 'owner@example.test');
    await h.page.click('#sim-email-go');
    await h.page.waitForTimeout(100);
    assert.ok(h.events.some(event => event.name === 'SimCheckoutTapped'));
    assert.equal(h.purchases[0]?.tool, 'claims');
    h.assertClean();
  } finally { await h.close(); }
});
