'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

test('a property check-in enters native capture for that property', async () => {
  const h = await open({ native: true, properties: ['Pine Cottage'], accountData: { businessName: 'Pine Stays' } });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.evaluate(() => window.marketelInspectNativeSelectTab('properties'));
    await h.page.waitForSelector('[data-check-in]');
    await h.page.click('[data-check-in]');
    await h.page.waitForTimeout(100);
    assert.ok(h.shell.some(message => message.type === 'inspectCamera'));
    assert.match(await h.body(), /Kitchen|Check-in|Camera/i);
    h.assertClean();
  } finally { await h.close(); }
});
