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

## Landing A/B test: sales letter vs quiz

`/payoff` serves the sales letter (`index.html`) or the quiz (`quiz.html`).
- Each new visitor is drawn 50/50 and kept on that version by an HttpOnly
  `payoff_variant` cookie.
- `?v=letter` or `?v=quiz` picks one, and sticks.
- Crawlers and Meta's ad review always get the letter.
- `PAYOFF_QUIZ_SHARE` (0–1) changes the split. 0 or 1 ends the test for
  everyone, whatever their cookie says.

Both versions lead to the same order page, price and checkout. The Meta pixel
loads on both. On the quiz its automatic collection is off, because people
type balances there.

The quiz is paced like the ad:
- It opens with the ad's caption ("CREDIT CARD HOLDERS 👇") over Lauren.
- One tap per question, then one number per screen.
- Their real date on minimums (the engine's `minimums` plan).
- The extra amount moves a live "sooner / less interest" figure.
- The plan screen keeps the exact month, the first card and the monthly
  payments locked behind Unlock My Plan.
- The typed cards stay in the browser. When the buyer goes to pay, they are
  written to the tool's `payoff.v1`, unless the tool already has cards.

/funnel shows a "Sales letter vs Quiz" table (`PayoffVariant`) and "Quiz: how
far they got" (`PayoffQuizStep`, step names only, never numbers). Judge the test
on purchases per visitor of each version.

## Order page

`order.html`, `order.css` and `order.js` copy a proven one-step order form
(True Money Saver's), measured at 414px:
1. A bold line, then one white card holding the name and email fields, the
   product table, the two extras and the order summary.
   - The extras sit in dashed cream boxes with a yellow bar, a blinking red
     arrow, a green headline and a red underlined offer line.
2. Stripe's payment fields, and Complete Order.
3. Under the card: card logos, the guarantee lines and the gold seal.
4. A grey column with "Here's what happens when you order today:", the
   crossed-out Total Value, four comment screenshots and the device image.

The page uses Montserrat and Open Sans, self-hosted in `assets/` (SIL OFL).
On desktop the grey column sits beside the form.

The payment happens on the page:
- Stripe's Payment Element and Express Checkout Element (Apple Pay, Google Pay,
  or a pay-later button where the reference has PayPal) mount without a
  payment existing. Ticking an extra updates their amount.
- Complete Order checks the name, email and Stripe's fields, then
  `/api/payoff/pay` creates a PaymentIntent at server prices (metadata
  `checkout: embedded`), and Stripe confirms it.
- Retrying the same order reuses the payment.
- Stripe.js loads only when `/api/payoff/config` returns `stripeKey` (the
  publishable key of the billing account, as for Claims).
- Without it, or if Stripe's fields can't load, Complete Order opens Stripe's
  hosted page (`/api/payoff/checkout`) instead.

## Checkout offer

The order page offers $5 off the $33 plan for 30 minutes. A signed, HttpOnly
cookie keeps the original deadline across reloads. The offer shows in a red bar
pinned to the top of the order page, and as a row in the order summary, both
with the clock. Optional extras remain $22 and $9.

The server only honours the offer while it is running. Complete Order never
charges a total the buyer hasn't seen: if the offer ended on screen late, it
repaints and asks them to review. On the hosted fallback, Stripe applies the
fixed-amount coupon `marketel-payoff-checkout-5-v1`.

The sales page's price blocks copy the reference letter: "(Reg. price $375)"
crossed out, then one bold line worded three ways (`Today:`, `Sale Price:`,
`SALE PRICE:`), then the orange pill button. They preview offer eligibility
($28) without starting the timer. Stripe
offers the payment methods enabled in the Dashboard (Cash App Pay, Klarna,
Afterpay and others when the buyer is eligible). An unpaid delayed payment
does not unlock access.

The owner offers a full refund within 30 days of purchase, including extras.
The guarantee appears on the sales page, at checkout, in the terms and in
access emails.

## Access

Access is the paid order's id signed with `PAYOFF_ACCESS_SECRET` (falling back
to `INSPECT_AUTH_SECRET`), stored in `payoff.access`. The id is a PaymentIntent
from the order page, or a Checkout Session from the hosted fallback or older
orders.
- After paying, the order page (or Stripe, after a redirecting method) opens
  `/payoff/app?payment_intent=…`. The hosted page returns to
  `/payoff/app?session_id=…`.
  - `/api/payoff/confirm` checks the payment and returns the signed link, and
    emails it once.
  - A payment that didn't go through sends the buyer back to checkout.
  - The `payment_intent.succeeded` webhook fulfils too.
- `/payoff/app?access=…` (the emailed link) is checked by `/api/payoff/access`.
- "Email me my link" (`/api/payoff/resend`) finds a paid order for the email
  and resends it. It searches sessions by email, and PaymentIntents by
  `metadata.email`. Owner emails (the /funnel exclusion list) get an owner
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
