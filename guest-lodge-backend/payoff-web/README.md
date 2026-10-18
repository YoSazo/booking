# Marketel Payoff paid preorders

Public page: https://bookmarketel.com/payoff. The app is not yet built. This
release sells a clearly disclosed paid preorder, never immediate app access.

Prices are enforced by the server: $33 USD once for Payoff, with optional $22
cash-flow calendar and $9 spending reset preorders. Extras start unchecked.
The buyer must acknowledge that they pay now, software is in development and
no release date has been announced. This is repeated on Stripe, the return
page and the confirmation email. No subscription is created.

## Commerce and deployment

`../payoff.js` registers the page, order, terms and confirmation routes and
`/api/payoff/{config,checkout,confirm,event}`. The existing Inspect Stripe
client and verified `/api/inspect-stripe-webhook` dispatch Payoff sessions
separately from Trace and report purchases. No new table, migration, Stripe
Price IDs or webhook endpoints are required.

Production checkout requires the live Inspect/Marketel secret key, its webhook
signing secret, the mail transport and the existing event store. `PAYOFF_ENABLED=false`
disables the public page and new purchases. Confirmation of earlier paid
orders continues. Missing configuration disables checkout.

Prices, line items and return URLs come from the server. A browser attempt ID,
normalized basket and email determine Stripe's idempotency key. Confirmation
requires a retrieved, complete, paid session for this exact product/version,
USD currency and the exact basket amount. Browser returns and verified
webhooks share fulfillment. A unique event records the paid order, and a
separate email claim prevents ordinary duplicate sends; failed sends release
the claim so Stripe can retry. No unlock or immediate app access is issued.

Stripe is the durable preorder ledger. Sessions and their PaymentIntents carry
`product=marketel-payoff-preorder`, `offerVersion=payoff-preorder-v1` and the
selected addon IDs. The later app must explicitly adopt these existing paid
orders, deliver the purchased tools and email access to the checkout address.
Do not ask preorder buyers to purchase again.

Order inquiries/cancellations/refund requests go to support@bookmarketel.com.
The terms introduce no unapproved satisfaction guarantee or delivery deadline.
No debt balances or bank information are collected. Anonymous page/checkout
steps and paid orders are available under Payoff preorders on `/funnel`.

## Content and preview

The owner confirmed that the testimonials and founder content are genuine.
The software illustrations use example data and are labeled accordingly.
Images are copied byte for byte; the Jeanne/Kati recipient variant is excluded.

Local design preview (payments always disabled):

```sh
cd guest-lodge-backend
PAYOFF_PREVIEW_PORT=4176 node scripts/preview-payoff.js
```

## Checks

```sh
cd guest-lodge-backend
npm test
npm run test:browser
cd ../marketel-frontdesk-ios
npm run verify:release
```

Payoff checks cover all four prices, server-side rejection of invalid baskets,
preorder consent, idempotency, paid/unpaid confirmation, verified signatures,
webhook-only confirmation, SMTP retry, anonymous events, actual browser
checkout/retry/return behavior and layouts at 320/390/430/1280px. The existing
preview remains unable to submit a payment. Real sandbox Checkout Sessions
also validate Stripe's request contract without charging a card.
