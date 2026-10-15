'use strict';

// Opt-in integration check. Actual Stripe TEST payments, deterministic in-memory
// ledger/clock, no real mail/CAPI/production DB. This is not live phone/browser
// checkout QA. Never remove the test-key guard.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const dotenv = require('dotenv');
const Stripe = require('stripe');
const { OFFER, createClaimsPaidTrial } = require('../claims-paid-trial');

async function main() {
  if (!process.argv.includes('--confirm-test-payments')) throw new Error('Use --confirm-test-payments to create and refund TEST-MODE payments.');
  const root = path.resolve(__dirname, '..');
  const env = Object.assign({}, ...['.env', '.env.local'].map(file => path.join(root, file))
    .filter(file => fs.existsSync(file)).map(file => dotenv.parse(fs.readFileSync(file))));
  const key = process.env.CLAIMS_QA_STRIPE_SECRET_KEY || env.STRIPE_INSPECT_SECRET_KEY || env.STRIPE_MARKETEL_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('Refusing to run: a Stripe TEST secret key is required.');
  const stripe = new Stripe(key);
  for (const scenario of ['paid', 'cancelled']) {
    const runId = crypto.randomUUID();
    const account = { id: `qa_${runId}`, email: 'claims-qa@example.invalid', lifetimeSince: null };
    const receipts = [], mail = [], events = new Map(), capi = [];
    const tx = { inspectAccount: {
      findUnique: async () => structuredClone(account), upsert: async () => structuredClone(account),
      update: async ({ data }) => { Object.assign(account, structuredClone(data)); return structuredClone(account); },
      findMany: async () => [structuredClone(account)],
    }, inspectPaidTrialClaim: {
      findUnique: async ({ where }) => receipts.find(row => Object.entries(where).every(([k, v]) => row[k] === v)) || null,
      create: async ({ data }) => { receipts.push(data); return data; },
    } };
    const prisma = { ...tx, $transaction: async fn => fn(tx) };
    let clock = new Date();
    let customer, initial;
    try {
      customer = await stripe.customers.create({ email: account.email, metadata: { purpose: 'claims-paid-trial-qa', runId } });
      initial = await stripe.paymentIntents.create({ amount: OFFER.upfront, currency: 'usd', customer: customer.id,
        payment_method: 'pm_card_visa', payment_method_types: ['card'], setup_future_usage: 'off_session', confirm: true,
        metadata: { purpose: 'claims-paid-trial-qa', runId } }, { idempotencyKey: `claims-qa-initial:${runId}` });
      assert.equal(initial.livemode, false);
      assert.equal(initial.status, 'succeeded');
      const service = createClaimsPaidTrial({ prisma, stripe, secret: 'qa-only-secret-not-production'.repeat(2), origin: 'https://example.invalid',
        now: async () => clock, lockAccount: async () => structuredClone(account),
        mail: { sendMail: async message => { mail.push(message); } },
        record: async (id, name, source) => { events.set(source, name); }, queueCapi: async (name, value) => { capi.push({ name, value: value.value }); } });
      // A synthetic completed-session envelope bridges the already separately
      // tested Checkout consent contract to a real captured/saved card.
      await service.adopt({ id: `cs_qa_${runId}`, mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 100,
        currency: 'usd', customer: customer.id, payment_intent: initial.id, customer_details: { email: account.email },
        metadata: { plan: 'lifetime_trial', tool: 'claims', trialVersion: OFFER.version, authorization: OFFER.authorization } });
      assert.equal(account.claimsPaidTrial.status, 'active');
      assert.equal(account.lifetimeSince, null);
      await service.sweep();
      if (scenario === 'cancelled') await service.cancel(account.id);
      clock = new Date(clock.getTime() + 2 * 86400000);
      await service.sweep();
      clock = new Date(Date.parse(account.claimsPaidTrial.endsAt) + 1);
      await service.sweep();
      if (scenario === 'paid') {
        assert.equal(account.claimsPaidTrial.status, 'paid');
        assert.ok(account.lifetimeSince);
        const balance = await stripe.paymentIntents.retrieve(account.claimsPaidTrial.balanceIntentId);
        assert.equal(balance.livemode, false); assert.equal(balance.amount_received, 4800); assert.equal(balance.status, 'succeeded');
        assert.equal(mail.length, 2);
        assert.deepEqual(capi, [{ name: 'StartTrial', value: 1 }, { name: 'Purchase', value: 48 }]);
        await service.sweep();
        assert.equal([...events.values()].filter(name => name === 'PaidTrialConverted').length, 1);
      } else {
        assert.equal(account.claimsPaidTrial.status, 'cancelled');
        assert.equal(account.claimsPaidTrial.balanceIntentId, undefined);
        assert.equal(account.lifetimeSince, null);
      }
      console.log(`PASS Stripe TEST ${scenario}: $1 captured/card saved; ${scenario === 'paid' ? '$48 collected once; lifetime granted' : 'cancellation prevented balance collection'}`);
    } finally {
      for (const id of [account.claimsPaidTrial?.balanceIntentId, initial?.id].filter(Boolean)) {
        const pi = await stripe.paymentIntents.retrieve(id);
        if (pi.livemode) throw new Error('Unexpected live PaymentIntent; refusing automatic cleanup.');
        if (pi.status === 'succeeded') await stripe.refunds.create({ payment_intent: id }, { idempotencyKey: `claims-qa-refund:${runId}:${id}` });
        else if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(id);
      }
      if (customer) await stripe.customers.del(customer.id);
      console.log(`Cleaned up ${scenario}: TEST payments refunded, test customer deleted.`);
    }
  }
}

main().catch(error => { console.error('Claims Stripe QA failed:', error.code || error.name, error.message); process.exitCode = 1; });
