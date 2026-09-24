'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

for (const arm of ['claims', 'inspect', 'incident']) {
  test(`${arm}: landing names its own product and leads to setup`, async () => {
    const h = await open({ arm, signedIn: false });
    try {
      await h.page.waitForSelector('#start');
      const text = await h.body();
      assert.match(text, new RegExp(arm, 'i'));
      if (arm === 'claims') {
        assert.match(text, /damage/i);
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
