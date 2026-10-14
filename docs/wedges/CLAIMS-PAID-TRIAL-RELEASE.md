# Claims $1 paid trial release

Offer: $1 actually collected today, three days of full access, then $48
automatically unless cancelled. $49 total for lifetime access, no subscription.
The existing $49 checkout remains valid for cached old pages; other wedges and
native purchases retain their current offers.

## Before deploying

1. Run backend and browser tests, `npm run wedges:check`, and the iOS release
   readiness check. Generate Prisma after the schema change.
2. Ensure Render runs `npx prisma migrate deploy` BEFORE starting this server.
   `npm start` already does this; a hosting override of `node server.js` does
   not. Apply migration `20261014190000_claims_paid_trial`. Do not launch this
   server with an old schema. No existing customer rows are rewritten.
3. In the actual LIVE Inspect billing account, verify the public terms URL is
   configured in Stripe's public business settings. The session requires a
   terms checkbox and explicitly links `https://bookmarketel.com/claims/terms`.
4. Verify the existing `/api/inspect-stripe-webhook` endpoint receives
   `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`
   and `charge.dispute.created` (or all events). Keep its existing subscription
   events too. The worker also reconciles balance payments after restarts.
5. Verify the production mail transport. No reminder accepted by the mail
   transport means no balance collection. The warning is at least 24 hours.
6. Run an end-to-end TEST-MODE card payment and balance collection, including
   a cancellation. A test-mode session-creation check alone is not a completed
   payment test. Never put a live key in an automated charge test.
   `node scripts/claims-paid-trial-stripe-qa.js --confirm-test-payments` checks
   real test-mode card saving/collection/cancellation with a deterministic
   in-memory ledger, then refunds the test payments and removes its customers.
   This complements, but does not replace, real-phone Checkout and production
   migration checks. `CLAIMS_QA_STRIPE_SECRET_KEY` may select a test key; live
   keys are refused before any request.

## Rollout and checking

- This branch does not publish itself. Push to main deploys the web product.
- After deployment, check the $1/$48 disclosure, terms checkbox, verified
  return date, cancellation link, and account cancellation on an actual phone.
  QA URLs use `?notrack=1`; do not manufacture ad conversions.
- Insert a `FunnelReset` marker using the DATABASE clock after the live version
  is verified. Preserve every historical row; never call a destructive reset.
- Update any priced ad to the same $1 trial / $49 total offer. No campaign
  optimization or budget change is part of this release.
- Read `$1 paid trial → $49 lifetime access` on `/funnel`: a $1 start is NOT
  a full purchase. Meta hears StartTrial at $1 and Purchase at the $48 balance.
- Watch `Claims paid trial processing failed` logs and cancelled/failed trials.
  A decline or additional authentication stops automatic collection, retains
  saved reports, and sends an email directing the owner to support. There is
  no customer self-service payment-recovery flow in this release.

## Native app

The web/native assets are mirrored, but an installed app is not updated by a
web deploy. `appStore.paidTrialLive` stays false until an approved build has
the new trial account/cancellation UI. Trial-specific upsells therefore keep
new buyers on the web. Old pay-once customers retain their existing app links.
Uploading a TestFlight build is a separate action.

## Stopping the test safely

Remove `offer.paidTrial` from the Claims manifest and regenerate assets to
stop NEW paid trials and restore the $49 web offer. Keep the new backend,
migration, cancellation routes, mail and worker running until every existing
trial is paid or cancelled. Rolling the whole server back would strand those
customers' cancellation links. Do not remove their consent/payment ledger.

The minimal `InspectPaidTrialClaim` receipt survives account deletion. It holds
only a keyed email derivative and checkout ID, preventing old $1 webhooks from
recreating a deleted account or scheduling a second balance.
