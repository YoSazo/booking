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

const phone = { width: 390, height: 844 };
const settle = async h => { await h.page.waitForSelector('#sim-buy'); await h.page.waitForTimeout(500); };
test('"How do I cancel?" names the exact path, shows the real screens, and counts when it is opened', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await settle(h);
    const help = h.page.locator('#sim-offer .cancel-help');
    assert.equal(await help.count(), 1);
    assert.equal(await help.evaluate(el => el.open), false, 'closed until asked');
    assert.match(await help.locator('summary').textContent(), /How do I cancel\?/);
    await help.locator('summary').click();
    assert.equal(await help.evaluate(el => el.open), true);
    const text = await help.textContent();
    assert.match(text, /Your \$1 Marketel Claims trial has started/);
    assert.match(text, /Manage or cancel your trial/);
    assert.match(text, /Cancel trial — stop the \$48 payment/);
    assert.match(text, /Account.*Cancel my trial/);
    assert.match(text, /\$1 stays paid/);
    assert.equal(await help.locator('img').count(), 2);
    for (let i = 0; i < 2; i++) {
      const image = help.locator('img').nth(i);
      await image.scrollIntoViewIfNeeded();
      await h.page.waitForFunction(el => el.complete && el.naturalWidth > 0, await image.elementHandle());
    }
    assert.equal(h.events.filter(e => e.name === 'SimCancelHelpOpened').length, 1);
    h.assertClean();
  } finally { await h.close(); }
});

test('the end of the page has its own button, and the sticky bar returns when no buy button is on screen', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await settle(h);
    assert.match(await h.page.textContent('#sim-buy-end'), /Try it for \$1/);
    const barShown = () => h.page.evaluate(() => !document.getElementById('sim-paybar').classList.contains('is-stood-down'));
    // Buy button visible: the bar stays out of the way.
    await h.page.evaluate(() => document.getElementById('sim-buy').scrollIntoView({ block: 'center' }));
    await h.page.waitForTimeout(400);
    assert.equal(await barShown(), false);
    // Scrolled so the first button is under the header and the last is still below
    // the screen: the card is on screen but no button is, so the bar must be back.
    // Opening the help makes the card tall enough to scroll past both buttons.
    await h.page.click('#sim-offer .cancel-help summary');
    await h.page.waitForTimeout(300);
    const between = await h.page.evaluate(() => {
      const first = document.getElementById('sim-buy'), last = document.getElementById('sim-buy-end');
      window.scrollTo(0, first.getBoundingClientRect().bottom + scrollY - 40);
      return { firstBottom: first.getBoundingClientRect().bottom, lastTop: last.getBoundingClientRect().top, vh: innerHeight };
    });
    assert.ok(between.firstBottom <= 72 && between.lastTop >= between.vh, JSON.stringify(between));
    await h.page.waitForTimeout(400);
    assert.equal(await barShown(), true, 'a visitor mid-card still has a button to tap');
    // The end button starts checkout exactly like the first one.
    await h.page.evaluate(() => document.getElementById('sim-buy-end').scrollIntoView({ block: 'center' }));
    await h.page.click('#sim-buy-end');
    for (let i = 0; i < 30 && !h.purchases.length; i++) await h.page.waitForTimeout(100);
    assert.equal(h.purchases[0]?.plan, 'lifetime_trial');
    h.assertClean();
  } finally { await h.close(); }
});
