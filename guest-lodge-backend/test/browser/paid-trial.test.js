'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

const trial = { status: 'active', endsAt: '2026-10-20T12:00:00Z', upfront: 1, balance: 48, cancelled: false, paid: false };
test('verified return shows the actual charge date and direct cancellation, not lifetime or free days', async () => {
  const h = await open({ signedIn: false, query: 'sim=1&checkout=success&session=cs_test_verifiedtrial00001',
    simEmail: { email: 'buyer@example.test', paidTrial: trial, manageUrl: 'https://bookmarketel.com/api/inspect/claims-trial/manage?account=fixture&token=fixture' } });
  try {
    await h.page.waitForSelector('#paid-trial-manage');
    const text = await h.body();
    assert.match(text, /Your \$1 trial has started/);
    assert.match(text, /remaining \$48 will be charged automatically on/);
    assert.match(text, /unless you cancel/);
    assert.doesNotMatch(text, /free days have started|is yours\.|Paid once\./);
    assert.match(await h.page.getAttribute('#paid-trial-manage', 'href'), /claims-trial\/manage/);
    h.assertClean();
  } finally { await h.close(); }
});

for (const refuse of [false, true]) {
  test(`account cancellation ${refuse?'failure preserves the active trial':'succeeds without billing portal or refund request'}`, async () => {
    const h = await open({ accountData: { active: true, remaining: 300, interval: 'paid-trial', paidTrial: trial } });
    try {
      let attempts = 0;
      await h.page.route('**/api/inspect/claims-trial/cancel', async route => {
        attempts++;
        if (!refuse) h.data.account.paidTrial = { ...trial, status: 'cancelled', cancelled: true };
        await route.fulfill({ status: refuse?409:200, headers: { 'content-type': 'application/json' },
          body: JSON.stringify(refuse?{ error: 'Payment is being processed. Please retry; cancellation has not yet been confirmed.' }:h.data.account) });
      });
      await h.page.waitForFunction(() => document.getElementById('account-button')?.textContent === 'Account');
      await h.page.click('#account-button');
      await h.page.waitForSelector('#cancel-paid-trial');
      assert.equal(await h.page.locator('#manage').count(), 0);
      await h.page.click('#cancel-paid-trial');
      await h.page.waitForSelector(refuse?'#notice .toast.error':'#notice .toast.success');
      assert.equal(attempts, 1);
      if (refuse) {
        assert.equal(await h.page.isEnabled('#cancel-paid-trial'), true);
        assert.match(await h.page.textContent('#notice'), /not yet been confirmed/);
      } else {
        assert.match(await h.page.textContent('#notice'), /No remaining payment will be charged/);
        assert.equal(h.data.account.paidTrial.cancelled, true);
      }
      h.assertClean();
    } finally { await h.close(); }
  });
}
