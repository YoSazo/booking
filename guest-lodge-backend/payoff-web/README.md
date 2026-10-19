# Marketel Payoff

Public page: https://bookmarketel.com/payoff. The tool: https://bookmarketel.com/payoff/app.

$33 USD once at the current sale price (previous regular price $375), no subscription. The tool opens straight after payment and the
buyer gets an email with their link.

## The tool

`engine.js` is the maths (pure, shared with the Node tests): monthly interest
is balance × APR ÷ 12 rounded to the cent; a card's minimum follows its
balance down (interest + the share of balance the entered minimum implies, at
least 1%, floor $25); a loan's payment stays fixed. Every plan except
"minimums only" keeps the monthly total fixed and pours what the minimums
leave down the plan's order, so money freed by a finished debt rolls on in the
same month. Capped at 600 months.

`app.html`, `app.js`, `app.css` are the phone UI. The buyer's numbers stay in
`localStorage` (`payoff.v1`) and are never sent anywhere.

## Checkout offer

The order page offers $5 off the $33 plan for 30 minutes. Its signed,
HttpOnly cookie preserves the original deadline across reloads. Opening
Stripe within that window locks in the quoted price; the Stripe Session
keeps that quote. Optional extras remain $22 and $9.

The page and Stripe both show regular prices and a separate $5 saving.
Stripe uses the fixed-amount coupon `marketel-payoff-checkout-5-v1`, validated
and created idempotently by the server when first needed. Receipts and
fulfillment validate the resulting total. The sticky reminder shares the
same clock and hides around typing and the payment button.

Product device visuals were generated from real app screenshots, then saved
as small WebP files. The original screenshots are preserved. Asset paths and
prompts are in `assets/checkout-visuals.md`. The selected-software recap uses
the previous base price and actual extra prices, and shows the sale total.

The sales page previews offer eligibility without starting the timer. Returning
visitors keep their existing deadline. Stripe uses payment methods enabled in
the Dashboard, rather than a card-only list; Cash App Pay and Klarna appear
when the buyer is eligible. An unpaid delayed payment does not unlock access.

The owner offers a full refund within 30 days of purchase, including extras.
The guarantee appears beside offers, in checkout, in terms and in access emails.

## Access

Access is the paid Checkout Session id signed with `PAYOFF_ACCESS_SECRET`
(falling back to `INSPECT_AUTH_SECRET`), stored in `payoff.access`.
- Stripe returns to `/payoff/app?session_id=…`; `/api/payoff/confirm` checks
  the session and returns the signed link, and emails it once.
- `/payoff/app?access=…` (the emailed link) is checked by `/api/payoff/access`.
- "Email me my link" (`/api/payoff/resend`) finds a paid session for the email
  in Stripe and resends; owner emails (the /funnel exclusion list) get an owner
  link. The reply is the same either way.
- Earlier paid preorders (`marketel-payoff-preorder` / `payoff-preorder-v1`)
  open the tool too. Their optional extras are still owed.

## Sales content

`content.js` holds the rating, testimonials and founder story.
`assets/tool-result.jpg` is a real screenshot of the tool with the page's
worked example; recapture it if the result screen changes.

## Checks

```sh
cd guest-lodge-backend
node --test test/payoff-*.test.js
node --test test/browser/payoff-*.test.js
npm test
```
