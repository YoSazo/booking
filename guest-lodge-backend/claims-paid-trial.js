'use strict';

const crypto = require('crypto');
const OFFER = Object.freeze({ version: 'claims-1-48-v1', upfront: 100, balance: 4800, days: 3, currency: 'usd' });
const DAY = 86400000;
const SUPPORT = 'support@bookmarketel.com';
const error = (status, message) => Object.assign(new Error(message), { status });
const idOf = object => typeof object === 'string' ? object : object?.id;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = value => new Date(value).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' UTC';
const trialAccess = (account, now = Date.now()) => {
  const trial = account.claimsPaidTrial;
  return !!trial && trial.version === OFFER.version && ['active', 'cancelled'].includes(trial.status)
    && Date.parse(trial.endsAt) > now;
};
const trialSummary = account => {
  const t = account.claimsPaidTrial;
  return t ? { status: t.status, endsAt: t.endsAt, upfront: OFFER.upfront / 100, balance: OFFER.balance / 100,
    cancelled: t.status === 'cancelled', paid: t.status === 'paid' } : null;
};

// Every state transition locks only the account row, never a network call.
// There is one balance PaymentIntent per trial; retries retrieve that same
// object. A crash can orphan an UNCONFIRMED intent, never a second charge.
function createClaimsPaidTrial({ prisma, stripe, mail, secret, origin, lockAccount, record, queueCapi, saveAttribution = async a => a,
  now = async () => {
    const [row] = await prisma.$queryRaw`SELECT CURRENT_TIMESTAMP AS "now"`;
    return new Date(row.now);
  } }) {
  const sign = (accountId, sessionId) => crypto.createHmac('sha256', secret).update(`claims-paid-trial:${accountId}:${sessionId}`).digest('hex');
  const manageUrl = account => `${origin}/api/inspect/claims-trial/manage?account=${encodeURIComponent(account.id)}&token=${sign(account.id, account.claimsPaidTrial.sessionId)}`;
  const authorized = async (accountId, supplied) => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(String(accountId || '')) || !/^[a-f0-9]{64}$/.test(String(supplied || ''))) throw error(403, 'This trial link is not valid. Sign in to manage your trial.');
    const account = await prisma.inspectAccount.findUnique({ where: { id: accountId } });
    if (!account?.claimsPaidTrial || !crypto.timingSafeEqual(Buffer.from(sign(account.id, account.claimsPaidTrial.sessionId)), Buffer.from(supplied))) throw error(403, 'This trial link is not valid. Sign in to manage your trial.');
    return account;
  };
  const transition = (accountId, change) => prisma.$transaction(async tx => {
    const account = await lockAccount(tx, accountId);
    const patch = await change(account, tx);
    return patch ? tx.inspectAccount.update({ where: { id: accountId }, data: patch }) : account;
  });
  const event = (account, name, suffix, detail) => record(account.id, name, `claims-paid-trial:${account.claimsPaidTrial.sessionId}:${suffix}`,
    { tool: 'claims', visitorId: account.claimsPaidTrial.visitorId || null, detail });
  const send = (account, subject, text, footer = 'Manage or cancel your trial') => mail.sendMail({ from: '"Marketel" <support@bookmarketel.com>', to: account.email, subject,
    text: `${text}\n\n${footer}: ${manageUrl(account)}\n\nQuestions? Reply to this email.` });
  async function recordStarted(account, req) {
    await event(account, 'PaidTrialStarted', 'started', '1');
    let pending = false;
    if (!account.claimsPaidTrial.noTrack) {
      try { await queueCapi('StartTrial', { account, req: req || { headers: { 'stripe-signature': 'verified' } },
        eventId: `claims-paid-trial.${account.claimsPaidTrial.sessionId}`, value: 1,
        eventTime: Math.floor(Date.parse(account.claimsPaidTrial.startedAt) / 1000), contentName: 'Marketel Claims $1 paid trial' }); }
      catch (e) { pending = true; console.error('Claims StartTrial analytics pending:', e.code || e.name); }
    }
    return transition(account.id, a => ({ claimsPaidTrial: { ...a.claimsPaidTrial,
      startedRecordedAt: a.claimsPaidTrial.startedRecordedAt || new Date().toISOString(), startCapiPending: pending } }));
  }

  async function adopt(session, req) {
    if (session?.mode !== 'payment' || session.metadata?.plan !== 'lifetime_trial' || session.metadata?.tool !== 'claims'
      || session.metadata?.trialVersion !== OFFER.version || session.payment_status !== 'paid' || session.status !== 'complete'
      || Number(session.amount_total) !== OFFER.upfront || session.currency !== OFFER.currency
      || session.consent?.terms_of_service !== 'accepted') return null;
    const email = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const intent = await stripe.paymentIntents.retrieve(idOf(session.payment_intent), { expand: ['latest_charge'] });
    if (intent.status !== 'succeeded' || intent.amount_received !== OFFER.upfront || intent.currency !== OFFER.currency
      || idOf(intent.customer) !== idOf(session.customer) || !idOf(intent.payment_method)
      || intent.setup_future_usage !== 'off_session' || intent.latest_charge?.refunded || intent.latest_charge?.disputed) return null;
    const clock = await now();
    const emailHash = crypto.createHmac('sha256', secret).update(`claims-paid-trial-email:${email}`).digest('hex');
    const outcome = await prisma.$transaction(async tx => {
      const receipt = await tx.inspectPaidTrialClaim.findUnique({ where: { sessionId: session.id } });
      if (receipt) {
        const existing = await tx.inspectAccount.findUnique({ where: { email } });
        // Crucially, do not upsert a deleted account or re-schedule its charge.
        return existing?.claimsPaidTrial?.sessionId === session.id ? { account: existing, duplicate: false } : { retired: true };
      }
      const row = await tx.inspectAccount.upsert({ where: { email }, create: { email }, update: {} });
      const account = await lockAccount(tx, row.id);
      if (account.claimsPaidTrial?.sessionId === session.id) return { account, duplicate: false };
      // One paid trial per account. Do not replace an existing subscription,
      // lifetime entitlement, cancelled trial or its consent with a second $1.
      const priorTrial = await tx.inspectPaidTrialClaim.findUnique({ where: { emailHash } });
      if (priorTrial || account.claimsPaidTrial || account.lifetimeSince || ['active', 'trialing', 'past_due'].includes(account.subscriptionStatus)) return { account, duplicate: true, trialUsed: !!priorTrial };
      const trial = { version: OFFER.version, status: 'active', sessionId: session.id,
        initialIntentId: intent.id, customerId: idOf(session.customer), paymentMethodId: idOf(intent.payment_method),
        startedAt: clock.toISOString(), endsAt: new Date(clock.getTime() + OFFER.days * DAY).toISOString(),
        consentAt: clock.toISOString(), consentTerms: '$1 today; $48 automatically after 3 days unless cancelled; $49 total; no subscription.',
        visitorId: /^v_[A-Za-z0-9]{8,40}$/.test(session.metadata.visitorId || '') ? session.metadata.visitorId : null,
        noTrack: session.metadata.noTrack === '1', source: session.metadata.source || 'web' };
      await tx.inspectPaidTrialClaim.create({ data: { emailHash, sessionId: session.id } });
      return { account: await tx.inspectAccount.update({ where: { id: account.id }, data: { claimsPaidTrial: trial,
        ...(account.stripeCustomerId ? {} : { stripeCustomerId: trial.customerId }) } }), duplicate: false };
    });
    if (outcome.retired) return outcome;
    if (outcome.duplicate) {
      // Throw on failure so a webhook retry can finish the refund.
      await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `claims-trial-duplicate:${session.id}` });
      return outcome;
    }
    const m = session.metadata;
    outcome.account = await saveAttribution(outcome.account,
      { fbp: m.ad_fbp, fbc: m.ad_fbc, sourceUrl: m.ad_src, utmCampaign: m.ad_campaign, utmContent: m.ad_content },
      { ip: m.ad_ip, headers: { 'user-agent': m.ad_ua } });
    outcome.account = await recordStarted(outcome.account, req);
    return outcome;
  }

  async function cancel(accountId) {
    let account = await prisma.inspectAccount.findUnique({ where: { id: accountId } });
    const t = account?.claimsPaidTrial;
    if (!t) throw error(404, 'No paid trial was found.');
    if (['cancelled', 'failed', 'refunded'].includes(t.status)) return account;
    if (t.status === 'paid') throw error(409, 'Your one-time payment is already complete. Nothing renews. Contact support about a refund.');
    if (t.balanceIntentId) {
      const pi = await stripe.paymentIntents.retrieve(t.balanceIntentId);
      if (pi.status === 'succeeded') { await complete(pi); throw error(409, 'Your one-time payment is already complete. Contact support about a refund.'); }
      // Cancel at Stripe BEFORE accepting cancellation. If confirmation wins
      // the race, cancellation cannot falsely promise that no charge occurred.
      if (pi.status !== 'canceled') {
        try { await stripe.paymentIntents.cancel(pi.id); }
        catch (e) { throw error(409, 'Payment is being processed. Please retry or contact support; cancellation has not yet been confirmed.'); }
      }
    }
    account = await transition(accountId, async a => {
      if (a.claimsPaidTrial.status === 'paid') throw error(409, 'Payment already completed. Please contact support about a refund.');
      // A worker may have saved an intent after the read above. Ask the caller
      // to retry rather than accept a cancellation we have not stopped.
      if (a.claimsPaidTrial.balanceIntentId && a.claimsPaidTrial.balanceIntentId !== t.balanceIntentId) throw error(409, 'Payment is being prepared. Please tap cancel again.');
      return { claimsPaidTrial: { ...a.claimsPaidTrial, status: 'cancelled', cancelledAt: (await now()).toISOString() } };
    });
    await event(account, 'PaidTrialCancelled', 'cancelled', 'trial');
    return account;
  }

  async function complete(intent) {
    if (intent.metadata?.product !== 'marketel-claims-trial-balance' || intent.status !== 'succeeded'
      || intent.currency !== OFFER.currency || intent.amount_received !== OFFER.balance) return null;
    const id = intent.metadata.inspectAccountId;
    const found = await prisma.inspectAccount.findUnique({ where: { id } });
    if (!found?.claimsPaidTrial) return null;
    if (found.claimsPaidTrial.balanceIntentId !== intent.id || idOf(intent.customer) !== found.claimsPaidTrial.customerId) throw error(400, 'Unexpected trial payment.');
    // Inspect the current charge as well as the PaymentIntent: a refunded
    // intent still says succeeded. Never resurrect access from a stale event.
    const current = await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] });
    if (current.status !== 'succeeded' || current.amount_received !== OFFER.balance || current.currency !== OFFER.currency) return null;
    if (current.latest_charge?.refunded || current.latest_charge?.disputed) {
      const reversed = await transition(id, a => ({
        ...(a.claimsPaidTrial.paidAt === a.lifetimeSince?.toISOString() ? { lifetimeSince: null } : {}),
        claimsPaidTrial: { ...a.claimsPaidTrial, status: 'refunded' },
      }));
      await event(reversed, 'PaidTrialRefunded', `refunded:${intent.id}`, 'balance');
      return reversed;
    }
    const account = await transition(id, async a => {
      const t = a.claimsPaidTrial;
      if (t.balanceIntentId !== intent.id || idOf(intent.customer) !== t.customerId) throw error(400, 'Unexpected trial payment.');
      if (t.status === 'paid' || t.status === 'refunded') return null;
      if (t.status === 'cancelled') throw error(409, 'A cancelled trial has a payment; manual review required.');
      const paidAt = await now();
      return { lifetimeSince: a.lifetimeSince || paidAt,
        claimsPaidTrial: { ...t, status: 'paid', paidAt: paidAt.toISOString() } };
    });
    if (account.claimsPaidTrial.status !== 'paid') return account;
    await event(account, 'PaidTrialConverted', 'converted', '49');
    // Only the balance is Purchase revenue. The $1 is a separate StartTrial;
    // reporting $49 here would overstate the money received by this event.
    let pending = false;
    if (!account.claimsPaidTrial.noTrack) {
      try { await queueCapi('Purchase', { account,
        req: { headers: { 'stripe-signature': 'verified' } }, eventId: `claims-trial-balance.${intent.id}`, value: 48,
        eventTime: Math.floor(Date.parse(account.claimsPaidTrial.paidAt) / 1000),
        appPurchase: account.claimsPaidTrial.source === 'app', contentName: 'Marketel Claims lifetime balance' }); }
      catch (e) { pending = true; console.error('Claims Purchase analytics pending:', e.code || e.name); }
    }
    return transition(account.id, a => a.claimsPaidTrial.status !== 'paid' ? null : ({ claimsPaidTrial: {
      ...a.claimsPaidTrial, convertedRecordedAt: a.claimsPaidTrial.convertedRecordedAt || new Date().toISOString(), conversionCapiPending: pending } }));
  }

  async function failPayment(account, reason) {
    account = await transition(account.id, a => ['paid', 'cancelled', 'refunded'].includes(a.claimsPaidTrial.status) ? null
      : { claimsPaidTrial: { ...a.claimsPaidTrial, status: 'failed', failure: reason } });
    if (account.claimsPaidTrial.status === 'failed') await event(account, 'PaidTrialPaymentFailed', 'failed', reason);
    return account;
  }

  // A declined $48 is not the end of the sale. The customer can pay the
  // balance once, on this card or another. Fulfilment reuses complete(): the
  // new PaymentIntent becomes the trial's balance intent, so every check there
  // (amount, customer, refund, replay) applies unchanged.
  const recoveryMetadata = (account, t) => ({ product: 'marketel-claims-trial-balance', recovery: '1', inspectAccountId: account.id, trialSessionId: t.sessionId });
  async function startRecovery(accountId) {
    const account = await prisma.inspectAccount.findUnique({ where: { id: accountId } });
    const t = account?.claimsPaidTrial;
    if (!t) throw error(404, 'No paid trial was found.');
    if (t.status === 'paid' || account.lifetimeSince) throw error(409, 'Your $49 lifetime purchase is already complete.');
    if (t.status !== 'failed') throw error(409, 'There is no unpaid balance on this trial.');
    const initial = await stripe.paymentIntents.retrieve(t.initialIntentId, { expand: ['latest_charge'] });
    if (initial.latest_charge?.refunded || initial.latest_charge?.disputed) throw error(409, 'Your $1 payment was refunded, so this trial is closed.');
    const metadata = recoveryMetadata(account, t);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer: t.customerId, payment_method_types: ['card'], adaptive_pricing: { enabled: false },
      line_items: [{ quantity: 1, price_data: { currency: OFFER.currency, unit_amount: OFFER.balance,
        product_data: { name: 'Marketel Claims: lifetime access, remaining balance', description: '$1 already paid. This $48 completes $49 total. No subscription.' } } }],
      custom_text: { submit: { message: 'This one $48 payment completes your $49 lifetime purchase ($1 already paid). No subscription. Nothing else will be charged.' } },
      metadata, payment_intent_data: { metadata },
      success_url: manageUrl(account), cancel_url: manageUrl(account) });
    await transition(accountId, a => a.claimsPaidTrial.status !== 'failed' ? null
      : ({ claimsPaidTrial: { ...a.claimsPaidTrial, recoverySessionId: session.id } }));
    await event(account, 'PaidTrialRecoveryStarted', `recovery-started:${session.id}`, '48');
    return session;
  }

  async function recover(sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const m = session.metadata || {};
    if (session.mode !== 'payment' || m.product !== 'marketel-claims-trial-balance' || m.recovery !== '1' || session.status !== 'complete'
      || session.payment_status !== 'paid' || Number(session.amount_total) !== OFFER.balance || session.currency !== OFFER.currency) return null;
    const found = await prisma.inspectAccount.findUnique({ where: { id: String(m.inspectAccountId || '') } });
    const t = found?.claimsPaidTrial;
    if (!t || t.sessionId !== m.trialSessionId || idOf(session.customer) !== t.customerId) return null;
    const pi = await stripe.paymentIntents.retrieve(idOf(session.payment_intent), { expand: ['latest_charge'] });
    if (pi.status !== 'succeeded' || pi.amount_received !== OFFER.balance || pi.currency !== OFFER.currency
      || idOf(pi.customer) !== t.customerId || pi.latest_charge?.refunded || pi.latest_charge?.disputed) return null;
    if (t.balanceIntentId === pi.id && t.status === 'paid' && t.convertedRecordedAt && !t.conversionCapiPending) return found;
    let duplicate = false;
    await transition(found.id, a => {
      const x = a.claimsPaidTrial;
      if (x.balanceIntentId === pi.id) return null;
      // Only a failed trial can take a recovery payment. Anything else
      // (already paid, cancelled, refunded, or a second payment) is refunded.
      if (x.status !== 'failed' || a.lifetimeSince) { duplicate = true; return null; }
      return { claimsPaidTrial: { ...x, status: 'collecting', balanceIntentId: pi.id, failedBalanceIntentId: x.balanceIntentId || null } };
    });
    if (duplicate) {
      await stripe.refunds.create({ payment_intent: pi.id }, { idempotencyKey: `claims-trial-recovery-duplicate:${pi.id}` });
      return null;
    }
    return complete(pi);
  }

  async function processAccount(row) {
    let account = await prisma.inspectAccount.findUnique({ where: { id: row.id } });
    let t = account?.claimsPaidTrial;
    if (!t) return;
    let clock = await now();
    if (!t.startedRecordedAt || t.startCapiPending) { account = await recordStarted(account); t = account.claimsPaidTrial; }
    if (t.status === 'paid' && (!t.convertedRecordedAt || t.conversionCapiPending)) {
      account = await complete(await stripe.paymentIntents.retrieve(t.balanceIntentId));
      if (!account) return;
      t = account.claimsPaidTrial;
    }
    if (t.status === 'failed' && t.recoverySessionId) {
      const checkout = await stripe.checkout.sessions.retrieve(t.recoverySessionId);
      if (checkout.status === 'complete') { account = await recover(checkout.id) || account; t = account.claimsPaidTrial; }
      else if (checkout.status === 'expired') { account = await transition(account.id, a => ({ claimsPaidTrial: { ...a.claimsPaidTrial, recoverySessionId: null } })); t = account.claimsPaidTrial; }
    }
    if (t.status === 'paid' && !t.receiptSentAt) {
      await send(account, 'Your Marketel Claims lifetime access is ready',
        `Your remaining $48 payment succeeded. Together with the $1 trial payment, you have paid $49 for lifetime access. No subscription and no further scheduled charges.\n\nContinue: ${origin}/claims\nTerms and refund conditions: ${origin}/claims/terms`);
      await transition(account.id, a => a.claimsPaidTrial.status !== 'paid' ? null : ({ claimsPaidTrial: { ...a.claimsPaidTrial, receiptSentAt: clock.toISOString() } }));
      return;
    }
    if (t.status === 'failed' && !t.failureNotifiedAt) {
      await send(account, 'Your remaining Claims payment did not complete',
        'Your $1 trial has ended, but the remaining $48 did not complete. Nothing else will be charged automatically. Your saved reports have not been deleted. You can finish your $49 lifetime purchase with one $48 payment, on this card or another, at the link below.',
        'Finish your purchase ($48)');
      await transition(account.id, a => ({ claimsPaidTrial: { ...a.claimsPaidTrial, failureNotifiedAt: clock.toISOString() } }));
      return;
    }
    if (!['active', 'collecting'].includes(t.status)) return;
    if (!t.welcomeSentAt) {
      await send(account, 'Your $1 Marketel Claims trial has started',
        `You paid $1 for 3 days of full access. Your remaining $48 is scheduled for ${when(t.endsAt)}, unless you cancel first. $49 total for lifetime access. No subscription. Cancelling stops the $48, not the $1 already paid. Your reports stay saved.\n\nStart now: ${origin}/claims`);
      account = await transition(account.id, a => ({ claimsPaidTrial: { ...a.claimsPaidTrial, welcomeSentAt: clock.toISOString() } }));
      t = account.claimsPaidTrial;
    }
    if ((!t.reminderSentAt || t.status === 'active' && clock.getTime() - Date.parse(t.endsAt) > DAY) && Date.parse(t.endsAt) <= clock.getTime() + DAY) {
      // Never collect after an outage without a full day's reminder. Extend
      // access/deadline, rather than move a charge earlier than consented.
      const endsAt = new Date(Math.max(Date.parse(t.endsAt), clock.getTime() + DAY + 5 * 60000)).toISOString();
      await send(account, 'Reminder: your remaining $48 is due tomorrow',
        `You paid $1. Your remaining $48 will be charged automatically on ${when(endsAt)} unless you cancel before then. That completes your $49 lifetime purchase. No subscription and no further scheduled charges.\n\nCancel using the link below, even if you have already made or sent a report.`);
      account = await transition(account.id, a => a.claimsPaidTrial.status !== 'active' ? null : ({ claimsPaidTrial: { ...a.claimsPaidTrial,
        endsAt: new Date(Math.max(Date.parse(a.claimsPaidTrial.endsAt), Date.parse(endsAt))).toISOString(),
        reminderSentAt: new Date(Math.max(Date.parse(a.claimsPaidTrial.reminderSentAt) || 0, clock.getTime())).toISOString() } }));
      await event(account, 'PaidTrialReminderSent', 'reminder', '48');
      t = account.claimsPaidTrial;
    }
    clock = await now();
    if (!t.reminderSentAt || clock.getTime() < Date.parse(t.endsAt) || clock.getTime() < Date.parse(t.reminderSentAt) + DAY) return;
    if (!['active', 'collecting'].includes(t.status)) return;
    const initial = await stripe.paymentIntents.retrieve(t.initialIntentId, { expand: ['latest_charge'] });
    if (initial.latest_charge?.refunded || initial.latest_charge?.disputed) {
      await cancel(account.id);
      account = await transition(account.id, a => ({ claimsPaidTrial: { ...a.claimsPaidTrial, status: 'refunded' } }));
      await event(account, 'PaidTrialRefunded', `refunded:${t.initialIntentId}`, 'initial');
      return;
    }
    if (!t.balanceIntentId) {
      const pi = await stripe.paymentIntents.create({ amount: OFFER.balance, currency: OFFER.currency,
        customer: t.customerId, payment_method: t.paymentMethodId, payment_method_types: ['card'],
        description: 'Marketel Claims lifetime access — remaining $48 ($1 already paid)',
        metadata: { product: 'marketel-claims-trial-balance', inspectAccountId: account.id, trialSessionId: t.sessionId } },
      { idempotencyKey: `claims-trial-balance-create:${t.sessionId}` });
      account = await transition(account.id, async a => {
        if (a.claimsPaidTrial.status !== 'active' || a.claimsPaidTrial.balanceIntentId) return null;
        if (a.lifetimeSince || a.stripeSubscriptionId && ['active', 'trialing', 'past_due'].includes(a.subscriptionStatus)) return { claimsPaidTrial: { ...a.claimsPaidTrial, status: 'cancelled' } };
        const stamp = (await now()).getTime();
        // Another worker may have extended the reminder/deadline while Stripe
        // created this unconfirmed intent. Recheck under the row lock.
        if (stamp < Date.parse(a.claimsPaidTrial.endsAt) || !a.claimsPaidTrial.reminderSentAt
          || stamp < Date.parse(a.claimsPaidTrial.reminderSentAt) + DAY) return null;
        return { claimsPaidTrial: { ...a.claimsPaidTrial, status: 'collecting', balanceIntentId: pi.id } };
      });
      t = account.claimsPaidTrial;
      if (t.balanceIntentId === pi.id && ['paid', 'refunded'].includes(t.status)) return;
      // A newer deadline leaves this intent unconfirmed. Keep it reusable
      // under the same idempotency key, rather than cache a cancelled intent
      // that would make the legitimate later collection fail.
      if (t.status === 'active' && !t.balanceIntentId) return;
      if (t.balanceIntentId !== pi.id || t.status !== 'collecting') {
        await stripe.paymentIntents.cancel(pi.id); return;
      }
    }
    // Retrieval reconciles a successful charge even if the process died
    // before recording it or the webhook is delayed. Never make a new PI.
    let pi = await stripe.paymentIntents.retrieve(t.balanceIntentId);
    if (pi.status === 'requires_confirmation') {
      try { pi = await stripe.paymentIntents.confirm(pi.id, { off_session: true }, { idempotencyKey: `claims-trial-balance-confirm:${t.sessionId}` }); }
      catch (e) {
        // Only Stripe-declared card failures are terminal. Network/timeouts
        // leave collecting and reconcile the same intent on the next run.
        if (e.type !== 'StripeCardError') throw e;
        pi = await stripe.paymentIntents.retrieve(t.balanceIntentId);
      }
    }
    if (pi.status === 'succeeded') return complete(pi);
    if (['requires_payment_method', 'requires_action', 'canceled'].includes(pi.status)) {
      if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(pi.id);
      await failPayment(account, pi.status);
    }
  }

  let busy = false;
  async function sweep() {
    if (busy || !stripe || !mail) return;
    busy = true;
    try {
      let cursor;
      do {
        const accounts = await prisma.inspectAccount.findMany({ where: { OR: ['active', 'collecting', 'failed', 'paid', 'cancelled', 'refunded'].map(status => ({ claimsPaidTrial: { path: ['status'], equals: status } })) },
          orderBy: { id: 'asc' }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
        for (const account of accounts) {
          try { await processAccount(account); }
          catch (e) { console.error('Claims paid trial processing failed:', account.id, e.code || e.name); }
        }
        cursor = accounts.length === 200 ? accounts.at(-1).id : null;
      } while (cursor);
    } finally { busy = false; }
  }

  async function refunded(chargeId) {
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge.refunded && !charge.disputed) return;
    const intentId = idOf(charge.payment_intent);
    if (!intentId) return;
    const accounts = await prisma.inspectAccount.findMany({ where: { OR: ['initialIntentId', 'balanceIntentId'].map(key => ({ claimsPaidTrial: { path: [key], equals: intentId } })) }, take: 1 });
    const a = accounts[0];
    if (!a?.claimsPaidTrial) return;
    const t = a.claimsPaidTrial;
    // Stop any pending balance first; no refund event can leave a $48
    // collection running after the $1 payment has been reversed.
    if (['active', 'collecting'].includes(t.status)) {
      try { await cancel(a.id); }
      catch (e) { if (e.status !== 409 || (await prisma.inspectAccount.findUnique({ where: { id: a.id } }))?.claimsPaidTrial?.status !== 'paid') throw e; }
    }
    const updated = await transition(a.id, current => ({
      ...(current.claimsPaidTrial.balanceIntentId === intentId && current.claimsPaidTrial.paidAt === current.lifetimeSince?.toISOString() ? { lifetimeSince: null } : {}),
      claimsPaidTrial: { ...current.claimsPaidTrial, status: current.claimsPaidTrial.status === 'paid' && current.claimsPaidTrial.initialIntentId === intentId ? 'paid' : 'refunded' },
    }));
    await event(updated, 'PaidTrialRefunded', `refunded:${intentId}`, charge.disputed ? 'disputed' : 'refunded');
  }

  function page(account) {
    const t = account.claimsPaidTrial;
    const cancellable = ['active', 'collecting'].includes(t.status);
    const text = t.status === 'paid' ? 'Your $49 lifetime purchase is complete. No subscription. Nothing renews.'
      : t.status === 'cancelled' ? 'Trial cancelled. The remaining $48 will not be charged. Your $1 trial payment remains paid. Your saved reports are not deleted.'
      : t.status === 'failed' ? 'The remaining $48 did not complete. Your reports are saved. Nothing else will be charged automatically. Finish your $49 lifetime purchase with one $48 payment below.'
      : t.status === 'refunded' ? 'This payment was refunded. No remaining payment is scheduled.'
      : `$1 paid. The remaining $48 is scheduled for ${when(t.endsAt)}. $49 total for lifetime access. No subscription. Cancel below to stop the $48, even if you have already sent a report.`;
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manage your Claims trial</title><link rel="stylesheet" href="/inspect/inspect.css"><body><main style="max-width:540px;margin:60px auto;padding:20px"><section class="card"><h1>Your Claims trial</h1><p>${esc(text)}</p>${cancellable ? `<form method="post" action="${esc(manageUrl(account))}"><button type="submit">Cancel trial — stop the $48 payment</button></form>` : ''}${t.status === 'failed' ? `<form method="post" action="${esc(manageUrl(account).replace('/claims-trial/manage', '/claims-trial/pay'))}"><button type="submit">Pay the remaining $48</button></form>` : ''}<p><a href="/claims">Back to Claims</a> · <a href="mailto:${SUPPORT}">Contact support</a></p></section></main></body></html>`;
  }
  return { adopt, cancel, complete, sweep, authorized, page, manageUrl, refunded, startRecovery, recover };
}

module.exports = { OFFER, createClaimsPaidTrial, trialAccess, trialSummary };
