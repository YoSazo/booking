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
  test(`Claims ${width}px: focused payment keeps trust, waits for a visible frame, and can reopen`, async () => {
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
      assert.equal(h.page.url(), `${beforeUrl}#payment`, 'payment is a same-site step, not a Stripe redirect');
      assert.equal(count(h, 'SimPaymentStepViewed'), 1);
      assert.equal(await h.page.$('#sim-email-field'), null, 'no additional email screen');
      assert.equal(await h.page.isVisible('#sim-buy'), false);
      assert.equal(await h.page.isVisible('#sim-paybar'), false, 'the sticky CTA cannot cover payment inputs');
      assert.equal(await h.page.locator('.offer-tape').count(), 1, 'reviews are kept on the page');
      assert.equal(await h.page.isVisible('.offer-landing'), false, 'the long pitch is not the payment screen');
      assert.equal(await h.page.isVisible('.checkout-review'), true, 'trust carries onto the payment screen');
      assert.match(await h.page.textContent('.checkout-review'), /Daniel Harris/);
      assert.match(await h.page.textContent('.checkout-next'), /Start your first report immediately in your browser/);
      assert.equal(await h.page.locator('.checkout-next').count(),1,'next steps are not repeated below the form');
      assert.equal(await h.page.evaluate(()=>{
        const follows=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
        const form=document.getElementById('stripe-checkout'),next=document.querySelector('.checkout-next'),review=document.querySelector('.checkout-review');
        return follows(form,next)&&follows(next,review);
      }),true,'the form comes first; what happens after payment and the review sit under it');
      const formTop=await h.page.evaluate(()=>document.getElementById('stripe-checkout').getBoundingClientRect().top);
      assert.ok(formTop<420,'the card form starts high on the screen, not below a stack of copy: '+formTop);
      assert.match(await h.page.textContent('.checkout-promise'), /\$49 once\. Yours for good\./);
      assert.match(await h.page.textContent('.checkout-promise'), /No subscription\. Nothing renews\./);
      assert.match(await h.page.textContent('.checkout-refund'), /within 3 days and haven't sent a report/);
      const layout = await h.page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth,
        form: document.getElementById('stripe-checkout').getBoundingClientRect().toJSON() }));
      assert.ok(layout.content <= layout.width && layout.form.left >= 0 && layout.form.right <= layout.width, JSON.stringify(layout));
      if (width === 390) await h.page.screenshot({ path: '/tmp/claims-embedded-checkout-390.png', fullPage: true });
      await h.page.click('#embedded-payment-close');
      assert.equal(await h.page.$('#embedded-payment'), null);
      await h.page.waitForURL(beforeUrl);
      await h.page.click('#sim-buy');
      await h.page.waitForSelector('#stripe-checkout.is-ready');
      assert.equal(requests.length, 2);
      assert.equal(await h.page.evaluate(() => window.__stripeFixture.destroyed), 1);
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('the payment next steps mention the iPhone app only when this wedge is live in it', async () => {
  const h=await open({signedIn:false,query:''});
  try{
    await paymentFixture(h);
    for(const live of [true,false]){
      await h.page.evaluate(value=>{window.MARKETEL_WEDGES.claims.appStore.live=value;},live);
      await h.page.click('#sim-buy');
      await h.page.waitForSelector('#stripe-checkout.is-ready');
      const text=await h.page.textContent('.checkout-next');
      assert.equal(text.includes('Prefer the iPhone app?'),live);
      assert.equal(text.includes('same email'),live);
      assert.doesNotMatch(text,/\$49|Pay .*once/,'do not repeat the price as another step');
      await h.page.click('#embedded-payment-close');
      await h.page.waitForURL('http://app.test/claims');
    }
    h.assertClean();
  }finally{await h.close();}
});

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

test('Stripe is preloaded on the landing, without a Session or checkout event; the buy tap reuses it', async () => {
  let requests,loads=0;
  const h=await open({signedIn:false,query:'',beforeOpen:async page=>{
    requests=await paymentFixture({page});
    page.on('request',request=>{if(request.url()==='https://js.stripe.com/v3/')loads++;});
  }});
  try{
    await h.page.waitForFunction(()=>typeof window.Stripe==='function');
    assert.equal(loads,1);
    assert.equal(requests.length,0);
    assert.equal(await h.page.locator('#stripe-checkout iframe').count(),0,'preloading does not mount heavy payment UI');
    assert.equal(count(h,'SimPaymentStepViewed'),0);
    assert.equal(count(h,'SimCheckoutRendered'),0);
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    assert.equal(loads,1,'no second Stripe.js download on payment entry');
    assert.equal(requests.length,1);
    await h.page.reload();
    await h.page.waitForSelector('.offer-landing');
    assert.equal(await h.page.locator('#payment-step').count(),0,'reload returns to the offer, never silently starts payment');
    assert.equal(requests.length,1);
    assert.equal(h.page.url(),'http://app.test/claims');
    h.assertClean();
  }finally{await h.close();}
});

test('a failed Stripe preload is retried at checkout, without dropping the buyer', async () => {
  let loads=0;
  const h=await open({signedIn:false,query:'',beforeOpen:async page=>{
    await paymentFixture({page});
    await page.route('https://js.stripe.com/v3/',route=>++loads===1
      ?route.fulfill({status:503,body:'temporarily unavailable'})
      :route.fallback());
  }});
  try{
    await h.page.waitForTimeout(150);
    assert.equal(loads,1);
    assert.equal(count(h,'SimCheckoutRendered'),0);
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    assert.equal(loads,2);
    assert.equal(count(h,'SimCheckoutRendered'),1);
    h.assertClean();
  }finally{await h.close();}
});

test('preloading stays out of signed-in visits, the app, other wedges and the demo', async () => {
  for(const options of [{signedIn:true,query:''},{signedIn:false,native:true},{signedIn:false,arm:'inspect',query:''},{signedIn:false,query:'sim=1'}]){
    let loads=0;
    const h=await open({...options,beforeOpen:async page=>{page.on('request',request=>{if(request.url()==='https://js.stripe.com/v3/')loads++;});}});
    try{
      await h.page.waitForTimeout(100);
      assert.equal(loads,0,JSON.stringify(options));
      h.assertClean();
    }finally{await h.close();}
  }
});

test('browser Back restores the exact offer DOM, scroll position and attribution, without treating payment scroll as landing engagement', async () => {
  const h=await open({signedIn:false,query:'fbclid=fixtureclick&utm_campaign=claims'});
  try{
    await paymentFixture(h);
    await h.page.evaluate(()=>{window.__originalVideo=document.getElementById('offer-video');window.scrollTo(0,260);});
    await h.page.waitForTimeout(100);
    const original=await h.page.evaluate(()=>({url:location.href,scroll:window.scrollY}));
    await h.page.evaluate(()=>document.getElementById('sim-buy').click());
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    const scrollEvents=h.events.filter(event=>event.name.startsWith('OfferScroll')).length;
    await h.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    await h.page.waitForTimeout(120);
    assert.equal(h.events.filter(event=>event.name.startsWith('OfferScroll')).length,scrollEvents);
    await h.page.goBack();
    await h.page.waitForSelector('.offer-landing:not([hidden])');
    await h.page.waitForTimeout(100);
    assert.equal(h.page.url(),original.url);
    assert.equal(await h.page.evaluate(()=>window.__originalVideo===document.getElementById('offer-video')),true);
    assert.ok(Math.abs(await h.page.evaluate(()=>window.scrollY)-original.scroll)<2);
    assert.equal(await h.page.locator('#payment-step').count(),0);
    await h.page.goForward();
    await h.page.waitForTimeout(120);
    assert.equal(await h.page.locator('#payment-step').count(),0,'Forward does not start another payment');
    assert.equal(h.page.url(),original.url);
    h.assertClean();
  }finally{await h.close();}
});

test('Back while the Session request is pending discards the late response and allows a fresh attempt', async () => {
  const h=await open({signedIn:false,query:''});
  try{
    const requests=await paymentFixture(h);
    let release,started;
    const gate=new Promise(resolve=>{release=resolve;});
    const arrived=new Promise(resolve=>{started=resolve;});
    await h.page.route('**/api/inspect/checkout/sim',async route=>{
      await h.page.unroute('**/api/inspect/checkout/sim',undefined);
      started();await gate;
      await route.fulfill({status:200,headers:{'content-type':'application/json'},body:JSON.stringify({embedded:true,publishableKey:'pk_test_fixture',clientSecret:'cs_test_old_secret',sessionId:'cs_test_old',amount:49,lifetime:true})});
    });
    await h.page.click('#sim-buy');await arrived;
    await h.page.click('#embedded-payment-close');
    await h.page.waitForURL('http://app.test/claims');
    assert.equal(count(h,'SimCheckoutRendered'),0);
    assert.equal(await h.page.locator('#payment-step').count(),0);
    // Reinstall the fixture after removing the delayed handler.
    const fresh=await paymentFixture(h);
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#stripe-checkout.is-ready');
    release();
    await h.page.waitForTimeout(150);
    assert.equal(fresh.length,1);
    assert.equal(await h.page.locator('#stripe-checkout.is-ready').count(),1,'the abandoned response cannot remove the new form');
    assert.equal(requests.length,0,'the abandoned request did not trigger a fallback');
    h.assertClean();
  }finally{await h.close();}
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
