'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

const OLD_DEADLINE = Date.parse('2026-10-14T05:09:00Z');
const beforeDeadline = new Date(OLD_DEADLINE - 3600000).toISOString();
const count = (h, name) => h.events.filter(event => event.name === name).length;

// Test Stripe's stable contract: initialize asynchronously and mount an empty
// container. A zero-height iframe is not yet a visible payment surface.
async function paymentFixture(h, { initDelay = 0, renderDelay = 0, fail = false, render = true, failHosted = false } = {}) {
  const requests = [];
  await h.page.route('**/api/inspect/checkout/sim', route => {
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const response = body.embedded
      ? { embedded: true, publishableKey: 'pk_test_fixture', clientSecret: 'cs_test_fixture_secret', sessionId: 'cs_test_fixture000001', amount: 49, lifetime: true, trialDays: 0 }
      : { embedded: false, url: 'https://checkout.stripe.com/c/pay/cs_test_hosted', lifetime: true, trialDays: 0 };
    return route.fulfill({ status: !body.embedded && failHosted ? 503 : 200,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(!body.embedded && failHosted ? { error: 'Payment is unavailable. Please try again.' } : response) });
  });
  await h.page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: '<html><body>Hosted payment fallback</body></html>', headers: { 'content-type': 'text/html' } }));
  await h.page.route('https://js.stripe.com/v3/', route => route.fulfill({
    headers: { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' },
    body: `
      window.__stripeFixture = { mounts: 0, destroyed: 0 };
      window.Stripe = key => ({ initEmbeddedCheckout: async options => {
        window.__stripeFixture.options = options;
        await new Promise(resolve => setTimeout(resolve, ${initDelay}));
        if (${fail}) throw new Error('Stripe init failed');
        let frame;
        return {
          mount: selector => {
            if (document.querySelector(selector).childNodes.length) throw new Error('Embedded Checkout must be mounted in a DOM element that contains no child nodes.');
            window.__stripeFixture.mounts++;
            frame = document.createElement('iframe');
            frame.title = 'Stripe payment form';
            frame.style.cssText = 'width:100%;height:0;border:0;display:block';
            frame.srcdoc = '<html><body style="margin:0;padding:16px;box-sizing:border-box;font:16px system-ui"><strong>$49.00</strong><p>Email</p><input style="box-sizing:border-box;width:100%" type="email"><p>Card information</p><input style="box-sizing:border-box;width:100%" placeholder="Card number"><p>Your card details stay inside Stripe.</p><button style="width:100%;padding:14px;background:#2e7d5b;color:white;border:0;border-radius:8px">Pay $49.00</button></body></html>';
            document.querySelector(selector).appendChild(frame);
            if (${render}) setTimeout(() => { frame.style.height = '470px'; }, ${renderDelay});
          },
          destroy: () => { window.__stripeFixture.destroyed++; frame?.remove(); }
        };
      }});
    `,
  }));
  return requests;
}

for (const width of [320, 390, 1280]) {
  test(`Claims ${width}px: payment opens in place without analytics, waits for a visible frame, and can reopen`, async () => {
    const h = await open({ signedIn: false, query: '', viewport: { width, height: 900 }, now: beforeDeadline });
    try {
      const requests = await paymentFixture(h, { renderDelay: 450 });
      await h.page.waitForSelector('#sim-buy');
      const beforeUrl = h.page.url();
      await h.page.evaluate(() => { document.getElementById('sim-buy').click(); document.getElementById('sim-paybar-buy').click(); });
      await h.page.waitForSelector('#stripe-checkout iframe', { state: 'attached' });
      assert.equal(count(h, 'SimCheckoutRendered'), 0, 'an inserted frame is not a rendered form');
      assert.equal(requests.length, 1, 'the two CTAs share the same in-flight attempt');
      await h.page.waitForSelector('#stripe-checkout.is-ready');
      await h.page.waitForTimeout(80);
      assert.equal(count(h, 'SimCheckoutRendered'), 1);
      assert.equal(h.page.url(), beforeUrl, 'no Stripe redirect before payment');
      assert.equal(await h.page.$('#sim-email-field'), null, 'no additional email screen');
      assert.equal(await h.page.isVisible('#sim-buy'), false);
      assert.equal(await h.page.isVisible('#sim-paybar'), false, 'the sticky CTA cannot cover payment inputs');
      assert.equal(await h.page.locator('.offer-tape').count(), 1, 'reviews are kept on the page');
      assert.match(await h.page.textContent('.checkout-promise'), /\$49 once\. Yours for good\./);
      assert.match(await h.page.textContent('.checkout-promise'), /No subscription\. Nothing renews\./);
      assert.match(await h.page.textContent('.checkout-refund'), /within 3 days and haven't sent a report/);
      const layout = await h.page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth,
        form: document.getElementById('stripe-checkout').getBoundingClientRect().toJSON() }));
      assert.ok(layout.content <= layout.width && layout.form.left >= 0 && layout.form.right <= layout.width, JSON.stringify(layout));
      if (width === 390) await h.page.screenshot({ path: '/tmp/claims-embedded-checkout-390.png', fullPage: true });
      await h.page.click('#embedded-payment-close');
      assert.equal(await h.page.$('#embedded-payment'), null);
      await h.page.click('#sim-buy');
      await h.page.waitForSelector('#stripe-checkout.is-ready');
      assert.equal(requests.length, 2);
      assert.equal(await h.page.evaluate(() => window.__stripeFixture.destroyed), 1);
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('closing during Stripe initialization cancels the attempt without redirecting or reporting readiness', async () => {
  const h = await open({ signedIn: false, query: '', now: beforeDeadline });
  try {
    const requests = await paymentFixture(h, { initDelay: 900 });
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#embedded-payment-close');
    await h.page.click('#embedded-payment-close');
    await h.page.waitForTimeout(1100);
    assert.equal(requests.length, 1, 'closing must never start the hosted fallback');
    assert.equal(count(h, 'SimCheckoutRendered'), 0);
    assert.equal(await h.page.$('#embedded-payment'), null);
    assert.equal(await h.page.isVisible('#sim-buy'), true);
    assert.equal(await h.page.isEnabled('#sim-buy'), true);
    assert.ok(h.page.url().endsWith('/claims'));
    h.assertClean();
  } finally { await h.close(); }
});

test('a Stripe initialization error recovers through hosted Checkout with the same offer and attribution', async () => {
  const h = await open({ signedIn: false, query: 'fbclid=fixtureclick', now: beforeDeadline });
  try {
    const requests = await paymentFixture(h, { fail: true });
    await h.page.click('#sim-buy');
    await h.page.waitForURL('https://checkout.stripe.com/**');
    assert.deepEqual(requests.map(r => r.embedded), [true, false]);
    assert.equal(requests[0].plan, 'lifetime');
    assert.deepEqual(requests[1].attribution, requests[0].attribution);
    assert.match(requests[1].attribution.fbc, /fixtureclick/);
    assert.equal(count(h, 'SimCheckoutRendered'), 1, 'only the successful fallback is sent');
    h.assertClean();
  } finally { await h.close(); }
});

test('an iframe that never renders falls back; a failed fallback restores the purchase button', async () => {
  const h = await open({ signedIn: false, query: '', now: beforeDeadline });
  try {
    const requests = await paymentFixture(h, { render: false, failHosted: true });
    await h.page.evaluate(() => {
      const original = window.setTimeout;
      window.setTimeout = (fn, ms, ...args) => original(fn, ms === 20000 ? 400 : ms, ...args);
    });
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#notice .toast.error');
    assert.deepEqual(requests.map(r => r.embedded), [true, false]);
    assert.equal(count(h, 'SimCheckoutRendered'), 0);
    assert.equal(await h.page.$('#embedded-payment'), null);
    assert.equal(await h.page.isVisible('#sim-buy'), true);
    assert.equal(await h.page.isEnabled('#sim-buy'), true);
    assert.match(await h.page.textContent('#notice'), /Payment is unavailable/);
    h.assertClean();
  } finally { await h.close(); }
});

test('a completed embedded payment returns through the existing verified Session fulfillment path', async () => {
  const h = await open({ signedIn: false, query: '', now: beforeDeadline, simEmail: { email: 'buyer@example.test' } });
  try {
    await paymentFixture(h);
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    await h.page.evaluate(() => window.__stripeFixture.options.onComplete());
    await h.page.waitForSelector('.sim-thanks');
    assert.match(h.page.url(), /session=cs_test_fixture000001/);
    await h.page.waitForFunction(() => document.getElementById('sim-paid-email')?.textContent === 'buyer@example.test');
    assert.match(await h.body(), /Marketel Claims is yours/);
    assert.match(await h.body(), /No subscription, and nothing renews/);
    h.assertClean();
  } finally { await h.close(); }
});

test('the offer deadline cannot remove a payment form while someone is entering payment', async () => {
  const h = await open({ signedIn: false, query: '', now: beforeDeadline, launchFixture: { lifetime: 199, launch: { price: 49, until: new Date(OLD_DEADLINE).toISOString().replace('.000Z', 'Z') } } });
  try {
    await paymentFixture(h);
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    await h.page.evaluate(at => { Date.now = () => at; }, OLD_DEADLINE + 1000);
    await h.page.waitForTimeout(1200);
    assert.equal(await h.page.locator('#stripe-checkout iframe').count(), 1);
    assert.match(await h.page.textContent('.checkout-promise'), /\$49 once/);
    await h.page.click('#embedded-payment-close');
    assert.match(await h.page.textContent('#sim-buy'), /\$199/);
    h.assertClean();
  } finally { await h.close(); }
});
