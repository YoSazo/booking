'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { OFFER, createClaimsPaidTrial, trialAccess, trialSummary } = require('../claims-paid-trial');
const { entitlement } = require('../inspect');
const clone = value => structuredClone(value);
const DAY = 86400000;

function fixture(extra = {}) {
  let clock = new Date('2026-10-15T12:00:00Z');
  const account = { id: 'acct_trial', email: 'buyer@example.test', lifetimeSince: null, reportsUsed: 0, freeReportUsed: false, ...extra };
  const events = new Map(), intents = new Map(), creates = new Map(), confirms = new Map();
  const receipts = [];
  const calls = { creates: [], confirms: [], charges: 0, refunds: [], mail: [], capi: [], cancels: [] };
  const initial = { id: 'pi_initial', status: 'succeeded', amount_received: 100, currency: 'usd', customer: 'cus_trial',
    payment_method: 'pm_trial', setup_future_usage: 'off_session', latest_charge: { refunded: false, disputed: false } };
  intents.set(initial.id, initial);
  const session = { id: 'cs_trial_123456', mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 100, currency: 'usd',
    payment_intent: initial.id, customer: initial.customer, customer_details: { email: account.email }, consent: null,
    metadata: { product: 'marketel-inspect', plan: 'lifetime_trial', tool: 'claims', trialVersion: OFFER.version, authorization: OFFER.authorization, visitorId: 'v_abcdefghijklm' } };
  let tail = Promise.resolve();
  const db = {
    inspectPaidTrialClaim: {
      findUnique: async ({ where }) => receipts.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null,
      create: async ({ data }) => { receipts.push(clone(data)); return data; },
    },
    inspectAccount: {
      findUnique: async ({ where }) => where.id && where.id !== account.id ? null : clone(account),
      upsert: async () => clone(account),
      update: async ({ data }) => { Object.assign(account, clone(data)); return clone(account); },
      findMany: async ({ where, cursor }) => {
        if (cursor) return [];
        const matches = !where?.OR || where.OR.some(item => {
          const filter = item.claimsPaidTrial;
          return filter && account.claimsPaidTrial?.[filter.path[0]] === filter.equals;
        });
        return matches ? [clone(account)] : [];
      },
    },
  };
  const prisma = { ...db, $transaction: async fn => {
    const previous = tail; let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    try { return await fn(db); } finally { release(); }
  } };
  const stripe = {
    paymentIntents: {
      retrieve: async id => { assert.ok(intents.has(id), id); return clone(intents.get(id)); },
      create: async (params, options) => {
        calls.creates.push({ params, options });
        if (!creates.has(options.idempotencyKey)) {
          const pi = { id: 'pi_balance', status: 'requires_confirmation', amount_received: 0, ...params };
          intents.set(pi.id, pi); creates.set(options.idempotencyKey, pi.id);
        }
        return clone(intents.get(creates.get(options.idempotencyKey)));
      },
      confirm: async (id, params, options) => {
        calls.confirms.push({ id, params, options });
        if (confirms.has(options.idempotencyKey)) return clone(confirms.get(options.idempotencyKey));
        const pi = intents.get(id);
        if (pi.status === 'canceled') throw new Error('Cannot confirm a cancelled intent');
        pi.status = 'succeeded'; pi.amount_received = pi.amount; calls.charges++;
        confirms.set(options.idempotencyKey, clone(pi));
        return clone(pi);
      },
      cancel: async id => {
        const pi = intents.get(id);
        if (pi.status === 'succeeded') throw new Error('Cannot cancel a successful intent');
        pi.status = 'canceled'; calls.cancels.push(id); return clone(pi);
      },
    },
    refunds: { create: async (params, options) => { calls.refunds.push({ params, options }); return { id: 're_trial' }; } },
    charges: { retrieve: async id => ({ id, payment_intent: 'pi_balance', refunded: true }) },
  };
  const options = { prisma, stripe, secret: 's'.repeat(32), origin: 'https://bookmarketel.com',
    now: async () => new Date(clock), lockAccount: async () => clone(account),
    mail: { sendMail: async message => { calls.mail.push(message); } },
    record: async (accountId, name, sourceId, detail) => { events.set(sourceId, { accountId, name, ...detail }); },
    queueCapi: async (name, data) => { calls.capi.push({ name, ...data }); } };
  const service = createClaimsPaidTrial(options);
  const advance = ms => { clock = new Date(clock.getTime() + ms); };
  const due = async () => {
    await service.adopt(session);
    await service.sweep();
    advance(2 * DAY);
    await service.sweep();
    clock = new Date(Date.parse(account.claimsPaidTrial.endsAt) + 1);
  };
  return { account, calls, intents, initial, session, service, options, events, stripe, advance, due, receipts,
    setClock: value => { clock = new Date(value); }, clock: () => clock };
}

test('a verified $1 with explicit consent grants only three days, never lifetime; replay cannot extend it', async () => {
  const h = fixture();
  await h.service.adopt(h.session);
  const ends = h.account.claimsPaidTrial.endsAt;
  assert.equal(Date.parse(ends) - h.clock().getTime(), 3 * DAY);
  assert.equal(h.account.claimsPaidTrial.consentMethod, 'pay_button');
  assert.match(h.account.claimsPaidTrial.consentTerms, /^\$1 today\. \$48 one-time after 3 days unless canceled\./);
  assert.equal(h.account.lifetimeSince, null);
  assert.equal(trialAccess(h.account, h.clock().getTime()), true);
  assert.equal(entitlement(h.account, h.clock().getTime()).interval, 'paid-trial');
  assert.equal(entitlement(h.account, h.clock().getTime()).lifetime, false);
  assert.equal(trialAccess(h.account, Date.parse(ends)), false);
  assert.equal(h.events.size, 1);
  assert.ok(h.calls.capi.every(event => event.name === 'StartTrial' && event.value === 1));
  h.advance(DAY);
  await h.service.adopt(h.session);
  assert.equal(h.account.claimsPaidTrial.endsAt, ends);
  assert.equal(h.events.size, 1);
  const summary = trialSummary(h.account);
  assert.equal(summary.balance, 48);
  assert.doesNotMatch(JSON.stringify(summary), /pm_trial|cus_trial|pi_initial|sessionId|consentTerms/);
});

test('a checkout opened with the terms checkbox before the pay-button disclosure still starts its trial', async () => {
  const h = fixture();
  const { authorization, ...metadata } = h.session.metadata;
  await h.service.adopt({ ...h.session, metadata, consent: { terms_of_service: 'accepted' } });
  assert.equal(h.account.claimsPaidTrial.consentMethod, 'terms_checkbox');
  assert.match(h.account.claimsPaidTrial.consentTerms, /\$48 automatically after 3 days/);
});

test('unpaid, wrong amount/currency/version/tool, missing consent and refunded initial charges grant nothing', async () => {
  for (const patch of [{ payment_status: 'unpaid' }, { amount_total: 1 }, { amount_total: 4900 }, { currency: 'eur' },
    { mode: 'setup' },
    { metadata: { plan: 'lifetime_trial', tool: 'claims', trialVersion: OFFER.version } },
    { metadata: { plan: 'lifetime_trial', tool: 'claims', trialVersion: OFFER.version, authorization: 'forged' } },
    { metadata: { plan: 'lifetime_trial', tool: 'claims', trialVersion: OFFER.version }, consent: { terms_of_service: 'declined' } },
    { metadata: { plan: 'lifetime_trial', tool: 'incident', trialVersion: OFFER.version } },
    { metadata: { plan: 'lifetime_trial', tool: 'claims', trialVersion: 'forged' } }]) {
    const h = fixture();
    assert.equal(await h.service.adopt({ ...h.session, ...patch }), null);
    assert.equal(h.account.claimsPaidTrial, undefined);
    assert.equal(h.events.size, 0);
  }
  for (const patch of [{ setup_future_usage: null }, { customer: 'cus_wrong' }, { amount_received: 0 }, { latest_charge: { refunded: true } }]) {
    const h = fixture(); Object.assign(h.initial, patch);
    assert.equal(await h.service.adopt(h.session), null);
    assert.equal(h.account.claimsPaidTrial, undefined);
  }
});

test('existing paid users and repeat trial checkouts are refunded, not overwritten; refund failures retry', async () => {
  for (const extra of [{ lifetimeSince: new Date() }, { subscriptionStatus: 'active' }]) {
    const h = fixture(extra);
    assert.equal((await h.service.adopt(h.session)).duplicate, true);
    assert.equal(h.calls.refunds.length, 1);
    assert.equal(h.account.claimsPaidTrial, undefined);
  }
  const h = fixture(); await h.service.adopt(h.session); await h.service.cancel(h.account.id);
  h.stripe.refunds.create = async () => { throw new Error('temporary failure'); };
  await assert.rejects(() => h.service.adopt({ ...h.session, id: 'cs_another' }), /temporary failure/);
  assert.equal(h.account.claimsPaidTrial.status, 'cancelled');
});

test('cancellation needs no refund request, retains the trial window, and prevents all balance charges', async () => {
  const h = fixture(); await h.service.adopt(h.session);
  const url = new URL(h.service.manageUrl(h.account));
  assert.equal((await h.service.authorized(h.account.id, url.searchParams.get('token'))).id, h.account.id);
  await assert.rejects(() => h.service.authorized(h.account.id, 'a'.repeat(64)), { status: 403 });
  const page = h.service.page(h.account);
  assert.match(page, /method="post"/);
  assert.match(page, /remaining \$48/);
  assert.equal(h.account.claimsPaidTrial.status, 'active', 'rendering a GET page never cancels');
  await h.service.cancel(h.account.id); await h.service.cancel(h.account.id);
  assert.equal(trialAccess(h.account, h.clock().getTime()), true, 'paid trial time is retained');
  h.advance(5 * DAY); await h.service.sweep();
  assert.equal(h.calls.charges, 0);
  assert.equal(h.calls.refunds.length, 0, 'cancellation does not silently refund the $1');
  assert.equal(h.events.size, 2, 'cancellation is idempotent');
});

test('welcome and reminder name the total, deadline and direct cancellation; charge waits a full day after notice', async () => {
  const h = fixture(); await h.due();
  assert.equal(h.calls.charges, 0);
  assert.equal(h.calls.mail.length, 2);
  assert.match(h.calls.mail[0].text, /\$1.*remaining \$48/s);
  assert.match(h.calls.mail[0].text, /UTC/);
  assert.match(h.calls.mail[1].text, /even if you have already made or sent/);
  assert.ok(h.calls.mail.every(message => message.text.includes('/claims-trial/manage?')));
  assert.ok(Date.parse(h.account.claimsPaidTrial.endsAt) >= Date.parse(h.account.claimsPaidTrial.reminderSentAt) + DAY);
  await h.service.sweep();
  assert.equal(h.calls.charges, 1);
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
  assert.ok(h.account.lifetimeSince instanceof Date);
  assert.equal(h.calls.capi.filter(event => event.name === 'Purchase')[0].value, 48);
  assert.equal(h.calls.confirms[0].params.off_session, true);
  assert.equal(h.calls.creates[0].params.amount, 4800);
  assert.equal(h.calls.creates[0].params.customer, 'cus_trial');
  await h.service.sweep();
  await h.service.complete(clone(h.intents.get('pi_balance')));
  assert.equal(h.calls.charges, 1);
  assert.equal([...h.events.values()].filter(e => e.name === 'PaidTrialConverted').length, 1);
});

test('outages extend the deadline; failed reminder delivery never permits a balance charge', async () => {
  const h = fixture(); await h.service.adopt(h.session); h.advance(8 * DAY);
  const broken = createClaimsPaidTrial({ ...h.options, mail: { sendMail: async () => { throw new Error('mail unavailable'); } } });
  await broken.sweep();
  assert.equal(h.calls.charges, 0);
  assert.equal(h.account.claimsPaidTrial.reminderSentAt, undefined);
  await h.service.sweep();
  assert.equal(h.calls.charges, 0);
  assert.ok(Date.parse(h.account.claimsPaidTrial.endsAt) > h.clock().getTime() + DAY);
});

test('two workers and a restart after a successful Stripe charge cannot charge twice', async () => {
  const h = fixture(); await h.due();
  const originalConfirm = h.stripe.paymentIntents.confirm;
  let lostResponse = true;
  h.stripe.paymentIntents.confirm = async (...args) => {
    const pi = await originalConfirm(...args);
    if (lostResponse) { lostResponse = false; throw new Error('connection lost after charge'); }
    return pi;
  };
  await h.service.sweep();
  assert.equal(h.calls.charges, 1);
  assert.equal(h.account.lifetimeSince, null);
  const restarted = createClaimsPaidTrial(h.options);
  await Promise.all([restarted.sweep(), h.service.sweep()]);
  assert.equal(h.calls.charges, 1);
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
});

test('two workers racing the first balance attempt preserve paid state and collect only once', async () => {
  const h = fixture(); await h.due();
  const other = createClaimsPaidTrial(h.options);
  await Promise.all([h.service.sweep(), other.sweep()]);
  assert.equal(h.calls.charges, 1);
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
  assert.equal(h.calls.cancels.length, 0, 'a stale worker cannot cancel a shared successful intent');
});

test('a newer reminder deadline wins over a worker with an old due snapshot', async () => {
  const h=fixture(); await h.due();
  const create=h.stripe.paymentIntents.create;
  h.stripe.paymentIntents.create=async(...args)=>{
    const pi=await create(...args);
    h.account.claimsPaidTrial.endsAt=new Date(h.clock().getTime()+DAY).toISOString();
    return pi;
  };
  await h.service.sweep();
  assert.equal(h.calls.charges,0);
  assert.equal(h.account.claimsPaidTrial.status,'active');
  assert.equal(h.intents.get('pi_balance').status,'requires_confirmation');
  h.stripe.paymentIntents.create=create;
  h.setClock(Date.parse(h.account.claimsPaidTrial.endsAt)+1);
  await h.service.sweep();
  assert.equal(h.calls.charges,1,'the later legitimate collection can reuse the unconfirmed intent');
});

test('cancellation while an unconfirmed intent is being created prevents confirmation', async () => {
  const h = fixture(); await h.due();
  const original = h.stripe.paymentIntents.create;
  h.stripe.paymentIntents.create = async (...args) => {
    const pi = await original(...args); await h.service.cancel(h.account.id); return pi;
  };
  await h.service.sweep();
  assert.equal(h.calls.charges, 0);
  assert.equal(h.intents.get('pi_balance').status, 'canceled');
  assert.equal(h.account.claimsPaidTrial.status, 'cancelled');
});

test('cancellation after Stripe has charged reports the truth, not a false cancellation success', async () => {
  const h = fixture(); await h.due(); await h.service.sweep();
  await assert.rejects(() => h.service.cancel(h.account.id), { status: 409 });
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
});

test('decline and additional authentication expire trial access without lifetime or automatic retries', async () => {
  for (const status of ['requires_action', 'requires_payment_method']) {
    const h = fixture(); await h.due();
    h.stripe.paymentIntents.confirm = async id => { const pi = h.intents.get(id); pi.status = status; return clone(pi); };
    await h.service.sweep();
    assert.equal(h.account.claimsPaidTrial.status, 'failed');
    assert.equal(h.account.lifetimeSince, null);
    assert.equal(trialAccess(h.account, h.clock().getTime()), false);
    await h.service.sweep(); await h.service.sweep();
    assert.equal(h.calls.mail.filter(m => m.subject.includes('did not complete')).length, 1);
    assert.equal(h.calls.charges, 0);
    assert.equal(h.calls.capi.filter(e => e.name === 'Purchase').length, 0);
  }
});

test('no-track trials send no advertising conversion; verified balance refunds revoke only their own grant', async () => {
  const h = fixture(); h.session.metadata.noTrack = '1'; await h.due(); await h.service.sweep();
  assert.equal(h.calls.capi.length, 0);
  await h.service.refunded('ch_balance');
  assert.equal(h.account.lifetimeSince, null);
  assert.equal(h.account.claimsPaidTrial.status, 'refunded');
  await h.service.complete(clone(h.intents.get('pi_balance')));
  assert.equal(h.account.lifetimeSince, null, 'a late success webhook cannot undo a refund');
});

test('a wrong balance amount, customer or intent can never grant lifetime access', async () => {
  const h = fixture(); await h.due();
  h.account.claimsPaidTrial.balanceIntentId = 'pi_balance'; h.account.claimsPaidTrial.status = 'collecting';
  const pi = { id: 'pi_balance', metadata: { product: 'marketel-claims-trial-balance', inspectAccountId: h.account.id }, status: 'succeeded', currency: 'usd', amount_received: 4800, customer: 'cus_trial' };
  assert.equal(await h.service.complete({ ...pi, amount_received: 100 }), null);
  await assert.rejects(() => h.service.complete({ ...pi, customer: 'cus_other' }), { status: 400 });
  await assert.rejects(() => h.service.complete({ ...pi, id: 'pi_wrong' }), { status: 400 });
  assert.equal(h.account.lifetimeSince, null);
});

test('a paid-trial receipt survives account deletion, so replay cannot recreate a trial or schedule another charge', async () => {
  const h = fixture(); await h.service.adopt(h.session); await h.service.cancel(h.account.id);
  assert.equal(h.receipts.length, 1);
  assert.doesNotMatch(h.receipts[0].emailHash, /buyer|example/);
  h.options.prisma.inspectAccount.findUnique = async () => null;
  const result = await h.service.adopt(h.session);
  assert.equal(result.retired, true);
  assert.equal(h.calls.charges, 0);
  assert.equal(h.calls.refunds.length, 0, 'a replay is not a second payment to refund');
});

test('an initial-payment refund prevents collection even if its webhook never arrives', async () => {
  const h = fixture(); await h.due(); h.initial.latest_charge.refunded = true;
  await h.service.sweep();
  assert.equal(h.calls.charges, 0);
  assert.equal(h.account.claimsPaidTrial.status, 'refunded');
  assert.equal(h.account.lifetimeSince, null);
});

test('a stale success event cannot grant access when the current balance charge is refunded', async () => {
  const h = fixture(); await h.due(); await h.service.sweep();
  h.intents.get('pi_balance').latest_charge = { id:'ch_balance', refunded:true };
  await h.service.complete(clone(h.intents.get('pi_balance')));
  assert.equal(h.account.lifetimeSince, null);
  assert.equal(h.account.claimsPaidTrial.status, 'refunded');
});

test('a lost conversion event is reconciled after lifetime access was already granted', async () => {
  const h = fixture(); await h.due();
  let failOnce = true;
  const processor = createClaimsPaidTrial({ ...h.options, queueCapi: async (name, value) => {
    if (name==='Purchase' && failOnce) { failOnce=false; throw new Error('queue unavailable'); }
    return h.options.queueCapi(name,value);
  } });
  await processor.sweep();
  assert.equal(h.account.claimsPaidTrial.status,'paid');
  assert.ok(h.account.claimsPaidTrial.convertedRecordedAt);
  assert.equal(h.account.claimsPaidTrial.conversionCapiPending,true);
  await processor.sweep();
  assert.ok(h.account.claimsPaidTrial.convertedRecordedAt);
  assert.equal(h.account.claimsPaidTrial.conversionCapiPending,false);
  assert.equal(h.calls.charges,1);
  assert.equal(h.calls.capi.filter(event=>event.name==='Purchase').length,1);
});

// A declined $48 is recoverable: one more $48, on any card, finishes the $49.
async function failed(extra) {
  const h = fixture(extra); await h.due();
  h.stripe.paymentIntents.confirm = async id => { const pi = h.intents.get(id); pi.status = 'requires_payment_method'; return clone(pi); };
  await h.service.sweep();
  assert.equal(h.account.claimsPaidTrial.status, 'failed');
  await h.service.sweep();
  const sessions = new Map(); const created = [];
  h.stripe.checkout = { sessions: {
    create: async params => { created.push(params); const s = { id: `cs_recover_${created.length}`, url: `https://checkout.stripe.com/c/${created.length}`, status: 'open', payment_status: 'unpaid',
      mode: 'payment', amount_total: 4800, currency: 'usd', customer: params.customer, metadata: params.metadata, payment_intent: `pi_recover_${created.length}` }; sessions.set(s.id, s); return clone(s); },
    retrieve: async id => clone(sessions.get(id)) } };
  const pay = (id, patch = {}) => {
    const s = sessions.get(id); Object.assign(s, { status: 'complete', payment_status: 'paid' }, patch);
    h.intents.set(s.payment_intent, { id: s.payment_intent, status: 'succeeded', amount_received: 4800, currency: 'usd', customer: 'cus_trial',
      metadata: s.metadata, latest_charge: { refunded: false, disputed: false } });
  };
  return { h, sessions, created, pay };
}

test('a declined balance can be finished with one $48 payment, which grants lifetime exactly once', async () => {
  const { h, created, pay } = await failed();
  assert.match(h.calls.mail.find(m => m.subject.includes('did not complete')).text, /Finish your purchase \(\$48\): https:\/\/bookmarketel\.com\/api\/inspect\/claims-trial\/manage/);
  const session = await h.service.startRecovery(h.account.id);
  assert.equal(created[0].line_items[0].price_data.unit_amount, 4800);
  assert.equal(created[0].customer, 'cus_trial');
  assert.equal(created[0].payment_intent_data.metadata.recovery, '1');
  assert.equal(h.account.claimsPaidTrial.recoverySessionId, session.id);
  assert.equal(h.account.lifetimeSince, null, 'opening checkout grants nothing');
  pay(session.id);
  await h.service.recover(session.id);
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
  assert.ok(h.account.lifetimeSince);
  assert.equal(h.account.claimsPaidTrial.balanceIntentId, 'pi_recover_1');
  await h.service.recover(session.id); await h.service.recover(session.id); await h.service.sweep();
  assert.equal(h.calls.capi.filter(e => e.name === 'Purchase').length, 1);
  assert.equal(h.calls.capi.filter(e => e.name === 'Purchase')[0].value, 48);
  assert.equal(h.calls.refunds.length, 0);
  assert.equal(h.calls.charges, 0);
  assert.equal(h.calls.mail.filter(m => m.subject.includes('lifetime access is ready')).length, 1);
});

test('recovery checkout is offered only to a failed, unrefunded trial', async () => {
  const { h } = await failed();
  for (const status of ['active', 'collecting', 'paid', 'cancelled', 'refunded']) {
    h.account.claimsPaidTrial.status = status;
    await assert.rejects(() => h.service.startRecovery(h.account.id), { status: 409 });
  }
  h.account.claimsPaidTrial.status = 'failed';
  h.intents.get('pi_initial').latest_charge.refunded = true;
  await assert.rejects(() => h.service.startRecovery(h.account.id), { status: 409 });
  h.intents.get('pi_initial').latest_charge.refunded = false;
  h.account.lifetimeSince = new Date();
  await assert.rejects(() => h.service.startRecovery(h.account.id), { status: 409 });
});

test('a forged, short or foreign recovery payment grants nothing', async () => {
  const { h, pay } = await failed();
  const session = await h.service.startRecovery(h.account.id);
  assert.equal(await h.service.recover(session.id), null, 'unpaid');
  for (const patch of [{ amount_total: 100 }, { currency: 'eur' }, { customer: 'cus_other' }, { metadata: { ...session.metadata, recovery: '0' } },
    { metadata: { ...session.metadata, trialSessionId: 'cs_other' } }, { metadata: { ...session.metadata, inspectAccountId: 'acct_other' } }]) {
    pay(session.id, patch);
    assert.equal(await h.service.recover(session.id), null, JSON.stringify(patch));
    assert.equal(h.account.lifetimeSince, null);
    assert.equal(h.account.claimsPaidTrial.status, 'failed');
  }
  pay(session.id); h.intents.get(`pi_recover_1`).amount_received = 100;
  assert.equal(await h.service.recover(session.id), null);
  assert.equal(h.account.lifetimeSince, null);
});

test('a second or late recovery payment is refunded, never stacked or applied to a cancelled trial', async () => {
  const { h, pay } = await failed();
  const first = await h.service.startRecovery(h.account.id);
  const second = await h.service.startRecovery(h.account.id);
  pay(first.id); pay(second.id);
  await h.service.recover(first.id);
  await h.service.recover(second.id); await h.service.recover(second.id);
  assert.equal(h.account.claimsPaidTrial.balanceIntentId, 'pi_recover_1');
  assert.deepEqual(h.calls.refunds.map(r => r.params.payment_intent), ['pi_recover_2', 'pi_recover_2']);
  assert.ok(h.calls.refunds.every(r => r.options.idempotencyKey === 'claims-trial-recovery-duplicate:pi_recover_2'));
  const cancelled = await failed();
  const late = await cancelled.h.service.startRecovery(cancelled.h.account.id);
  cancelled.h.account.claimsPaidTrial.status = 'cancelled';
  cancelled.pay(late.id);
  await cancelled.h.service.recover(late.id);
  assert.equal(cancelled.h.account.lifetimeSince, null);
  assert.equal(cancelled.h.calls.refunds.length, 1);
});

test('the sweep finishes a paid recovery whose webhook never arrived, and forgets an expired one', async () => {
  const { h, sessions, pay } = await failed();
  const session = await h.service.startRecovery(h.account.id);
  sessions.get(session.id).status = 'expired';
  await h.service.sweep();
  assert.equal(h.account.claimsPaidTrial.recoverySessionId, null);
  const again = await h.service.startRecovery(h.account.id);
  pay(again.id);
  await h.service.sweep();
  assert.equal(h.account.claimsPaidTrial.status, 'paid');
  assert.ok(h.account.lifetimeSince);
});

test('refunding a recovery payment revokes only the access it granted', async () => {
  const { h, pay } = await failed();
  const session = await h.service.startRecovery(h.account.id);
  pay(session.id); await h.service.recover(session.id);
  h.stripe.charges.retrieve = async id => ({ id, payment_intent: 'pi_recover_1', refunded: true });
  await h.service.refunded('ch_recover');
  assert.equal(h.account.lifetimeSince, null);
  assert.equal(h.account.claimsPaidTrial.status, 'refunded');
});
