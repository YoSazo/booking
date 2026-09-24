'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report } = require('./harness');

for (const native of [false, true]) for (const signedIn of [false, true]) for (const full of [false, true]) {
  test(`${native ? 'app' : 'web'} ${signedIn ? 'signed in' : 'visitor'} ${full ? 'with reports' : 'empty'} has a real first page`, async () => {
    const h = await open({ native, signedIn, reports: full ? [report('damage')] : [], slowList: 80 });
    try {
      await h.page.waitForSelector('#app > *');
      const first = await h.body();
      assert.ok(first.trim().length > 25);
      assert.doesNotMatch(first, /^Loading\.{0,3}$/);
      if (signedIn) {
        await h.page.waitForSelector('#new-report');
        for (const tab of ['properties', 'reports']) {
          if (native) await h.page.evaluate(tab => window.marketelInspectNativeSelectTab(tab), tab);
          else await h.page.click(`[data-page="${tab}"]`);
          await h.page.waitForSelector('#app > *');
          assert.ok((await h.body()).trim().length > 25);
        }
      }
      h.assertClean();
    } finally { await h.close(); }
  });
}
