'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, newAppReport } = require('./harness');

test('Claims starts with a finding, and receipt controls sit apart from photos', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await newAppReport(h, { property: 'Pine Cottage' });
    await h.page.click('#edit');
    await h.page.waitForSelector('#preview');
    const text = await h.body();
    assert.match(text, /Finding 1/);
    assert.match(text, /Add a receipt or quote/);
    assert.ok((await h.page.locator('.receipts').count()) > 0);
    h.assertClean();
  } finally { await h.close(); }
});
