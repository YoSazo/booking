# Marketel Payoff

Public page: https://bookmarketel.com/payoff. The tool: https://bookmarketel.com/payoff/app.

$33.11 USD once at the current sale price (previous regular price $375), no subscription. The tool opens straight after payment and the
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

## Landing: sales letter

Production passes `quizShare: 0` to `registerPayoff` in `server.js`. All normal
`/payoff` visits get the sales letter, including browsers previously assigned
to the quiz. The 50/50 split is off.

The quiz remains available for preview at `?v=quiz`; `?v=letter` selects the
letter. The reusable router still supports `quizShare` / `PAYOFF_QUIZ_SHARE`
for a future test, but the explicit production setting takes precedence.

Both versions lead to the same order page, price and checkout. The Meta pixel
loads on both. On the quiz its automatic collection is off, because people
type balances there.

## Story page (the static ad's landing)

`/payoff/hidden-payoff` (`story.html`, `story.css`, `story.js`) is the page
Lauren's static ad opens: a long article in the reference advertorial's layout
(dark top bar, breadcrumb, quote headline, dated byline, the story, the
$79,000 example, what you get, comments, price) and the reference's
"advertisement, not a news article" notice at the foot. Its three buttons open
the sales letter at `/payoff?v=letter&from=story`, as the reference sends its
readers to its sales page rather than straight to checkout.

The story page counts the landing and the ad click (`PayoffLanded`,
`PayoffFrom`), then `PayoffStory:viewed` once per visitor, how far down they
read (`scroll25`, `scroll50`, `scroll75`, `scroll100`, each once), `button`
when the first button is on screen (it sits after the $79,000 example, about
59% down on a phone), and `PayoffStory:tapped` on a button. The letter skips `PayoffFrom` for
`from=story`, so the source stays the ad. `/funnel` shows both steps as
"Story page (static ad)". The $6,500 note and the $79,000 example are worked
out with `engine.js` (the debts are listed on the page); change a figure only
by rerunning it. Lauren's own figures are her real statements and Payoff
result.

The quiz is built to leave the visitor believing one thing: "I'm stuck because
of [what they named]. The fix is paying in the right order, with something
doing the maths for me. Payoff does that for my cards, and it costs far less
than it saves." Each step puts a bit of that belief in or strengthens it:
- **The question.** "You want these cards gone. What's been getting in the
  way?" Four answers, each something the tool really fixes. Their answer comes
  back as a "that's the trap" screen that points to paying in order and
  letting the tool do the maths.
- **Their own numbers.**
  - "At 24%, this card adds about $84 in interest every month."
  - "✓ Card 1 added: about $84 of its $126 minimum is interest."
  - "Right now, about $109 of your $161 in minimums goes to interest every
    month."
- **Before any extra money.** "Keep paying what you pay now, in the right
  order, and you're out X sooner."
- **The plan.** It says their answer back ("You told us: … Your plan: …") and
  puts the saving next to the price ("could save you $7,144 … It costs $28.11,
  once").
- **Taps that reward.** A ✓ pops on the chosen answer. The debt-free year and
  the "sooner" and "less interest" figures count up. Confetti on the plan.

The quiz is paced like the ad:
- It opens with the ad's caption ("CREDIT CARD HOLDERS 👇") over Lauren.
- One tap per question, then one number per screen.
- Their real date on minimums (the engine's `minimums` plan).
- The extra amount moves a live "sooner / less interest" figure.
- The plan screen keeps the exact month, the first card and the monthly
  payments locked behind Unlock My Plan.
- A red bar offers the $5 checkout offer for finishing: "Finish your plan in
  10 minutes and get an extra $5 off".
  - The 10 minutes start at the first answer and are counted on the server
    (`/api/payoff/quiz`, signed `payoff_quiz` cookie).
  - Finishing in time unlocks the $5. Its own repeating clock starts at
    checkout.
  - Quiz visitors who finish late, or not at all, get no offer cookie at
    checkout and pay $33. The letter's visitors are unaffected.
- The typed cards stay in the browser. When the buyer goes to pay, they are
  written to the tool's `payoff.v1`, unless the tool already has cards.

/funnel shows a "Sales letter vs Quiz" table (`PayoffVariant`) and "Quiz: how
far they got" (`PayoffQuizStep`, step names only, never numbers). Judge the test
on purchases per visitor of each version.

## Order page

`order.html`, `order.css` and `order.js` follow the reference two-step order
page (The Last Wish's), in this order:
1. The first screen, before any field: a green header "Your Debt-Free Date &
   Payoff Plan / Is Reserved For: MM : SS", the device picture, "(Valued at
   $375)", a large green "Just 28.11", a smaller crossed-out $33.11, USD and
   one-time-payment wording, the free $5 gift, a compact 30-day guarantee and
   the secure-checkout box. Price remains visible on small phones; the
   reassurance and form follow without squeezing the copy to fit.
2. One white card: "Contact Details" (labeled name and email), "Payment
   Information" (wallet buttons, OR, Stripe's card fields), the product line,
   the two extras, the order summary and the two-line button "Get My Debt-Free
   Date / Opens right after you pay".
   - The extras sit in dashed cream boxes with a yellow bar, a blinking red
     arrow, a green headline and a short "ONE TIME OFFER" paragraph ending
     "This is a one-time offer, and you will never see this price again."
3. Under the card: the gold seal, the guarantee lines and card logos.
4. A grey column with "Here's what happens when you order today:", the
   crossed-out Total Value, four comment screenshots and the device image.
5. A footer with Terms & Conditions | Privacy Policy and the copyright line,
   as on every Payoff page.

The page uses Montserrat and Open Sans, self-hosted in `assets/` (SIL OFL).
On desktop the grey column sits beside the form.

The payment happens on the page:
- Stripe's Payment Element and Express Checkout Element (Apple Pay, Google Pay,
  or a pay-later button where the reference has PayPal) mount without a
  payment existing. Ticking an extra updates their amount.
- The button checks the name, email and Stripe's fields, then
  `/api/payoff/pay` creates a PaymentIntent at server prices (metadata
  `checkout: embedded`), and Stripe confirms it.
- Retrying the same order reuses the payment.
- The Payment Element's tabs are ordered card (open by default), bank
  (`us_bank_account`), then Klarna; Stripe puts any other enabled methods in
  its "more" menu.
- Stripe.js loads only when `/api/payoff/config` returns `stripeKey` (the
  publishable key of the billing account, as for Claims).
- Without it, or if Stripe’s fields can’t load, the button opens Stripe's
  hosted page (`/api/payoff/checkout`) instead.

## Free $5 gift and the reservation clock

Every order page visitor gets a free $5 gift on the $33.11 plan ("Free gift: $5
off" in the summary, $28.11 total). Optional extras remain $22 and $9. A signed,
HttpOnly cookie anchors the gift's clock across reloads.

The "Is Reserved For" clock counts down from 05:00 and carries on through
reloads (`payoff.reserveEnd` in the browser). At 00:00 it stays at 00:00; the
next page load after that starts a new 05:00. Neither the order nor the gift
ever ends: the server always honours the $5, whatever the clock shows (its own
gift clock repeats every five minutes; cookies from the old 30-minute offer
join that loop). This is a deliberate owner decision (October 20, 2026) and a
knowing exception to the real-deadline rule in `docs/wedges/FRAMEWORK.md`; do
not "fix" it back to an expiring offer without the owner.

The extras show their regular prices, set by the owner: Cash-flow calendar
~~$79~~ $22 and Spending reset ~~$49~~ $9.

Under the product picture: "★★★★★ 10,000+ sold" with six face crops.
"Sold" counts purchases (about 11,300 per the owner, to be confirmed with
Lauren); keep it a true, rounded-down figure.

Frozen from October 20, 2026 to measure the new order page against the old one
on `/funnel`. Next test, only if many visitors reach the card fields and do not
pay: move Tara's comment from the grey column to right under the button. On the hosted fallback, Stripe applies
the fixed-amount coupon `marketel-payoff-checkout-5-v1`.

The sales page repeats the same clear price block: a small crossed-out regular
price and $33.11, a large green "Just 28.11", explicit USD / one-time-payment
wording, the applied $5 gift, a wide orange button and the compact 30-day
money-back banner. The amount comes from the existing offer lookup; previewing
it does not start the checkout clock. If the lookup fails, it shows $33.11
and checkout can still apply its server-issued gift.

New payments carry offerVersion payoff-v2 and a $33.11 base price ($28.11
after the $5 gift). Earlier payoff-v1 and preorder receipts are verified at
their original $33/$28 amounts, so existing access and delayed confirmations
still work. Stripe idempotency fingerprints include the quoted total.
The letter has no bar or clock; the reservation clock stays on the order page.

Stripe
offers the payment methods enabled in the Dashboard (Cash App Pay, Klarna,
Afterpay and others when the buyer is eligible). An unpaid delayed payment
does not unlock access.

The pages show a "30-day money-back guarantee" without details; the terms'
Refund Eligibility Requirements (copied from the reference) define it: 30
consecutive days of documented use, then a request within 90 days of purchase,
including extras. The request window must stay longer than the required use,
or no one could qualify. Short copy (the letter's FAQ, receipt email, Stripe's
note, the privacy policy) points to the terms instead of promising "within 30
days". A test checks every page names the same 30 days. Orders placed before
October 20, 2026 keep the unconditional guarantee they were sold with.

## Terms and privacy

`terms.html` (`/payoff/terms`) has the offer, delivery, guarantee, Refund
Eligibility Requirements, a Disclaimer (educational purposes only, no
guaranteed results, you are responsible for your decisions, assumption of
risk, limitation of liability) and planning estimates. `privacy.html`
(`/payoff/privacy`) follows the reference's eight sections and adds nothing
beyond them except true lines: the hashed email and name sent to Meta,
balances never leaving the device, and the card kept for the same visit.

## Interest Cutter (the offer after purchase)

A tool inside Payoff (`cutter` in `extras`, its own tab): `compareLowerRate` in
`engine.js` runs the buyer's debts with some moved to a 0% balance transfer
(fee, promo months, rate after, card limit, partial amounts) or a
consolidation loan (APR, term, origination fee), at the same monthly budget,
and answers "saves $X after fees" or "your current plan costs less". It also
has call scripts with notes (lower rate, late-fee refund, hardship program)
and a 0% promo tracker. Words live in `cutter-content.js`, a DRAFT for Lauren
to review before launch. Everything typed stays on the device.

The sale, the ClickFunnels sequence:
1. After paying, the order page goes to `/payoff/upgrade` (hosted Checkout
   returns there too). The page confirms the order first (unlocking Payoff
   and sending its email), then shows "WAIT! Your plan isn't complete
   yet...", the stars row, a labeled example comparison, "~~$147~~ Today Only
   107", YES, the guarantee and badges, a real 2:00 clock and a muted "No
   thanks".
2. "No thanks" or 00:00 shows "I get it. Money's tight right now." (the
   reason answers why they said no) at "~~$107~~ Today
   Only 47", with its own 2:00 clock. Its "No thanks" or 00:00 opens Payoff.
   Each clock survives a reload; the server refuses 107 and 47 more than 30
   minutes after the order was paid.
3. Inside Payoff the locked tab offers it at $147 (`/payoff/upgrade?offer=regular`).

Payment: `/pay` creates a Stripe customer and keeps cards for this visit only
(`payment_method_options.card.setup_future_usage: on_session`, matched by the
order page's Elements). `POST /api/payoff/upgrade` charges that card in one
click, for the 107 and 47 offers in that visit only; the 147 price bought
later from inside Payoff always uses the payment form, as the order page and
terms promise. Apple Pay and Google Pay can't be reused while the buyer is present
(Apple's rules), so they, Klarna, bank and hosted-checkout orders get a pop-up
payment form. One Interest Cutter per order. A paid one is its own
PaymentIntent (`product: marketel-payoff-cutter`, `parentOrder`), written onto
its order as `cutter`; `/access` adds `cutter` while it is paid and not
refunded. The receipt says it is covered by the same 30-day guarantee.

Meta hears it as the custom `InterestCutterPurchase` (pixel and Conversions
API, one event id), never `Purchase`, so the ads keep optimizing for first
purchases. `/funnel` has an "Interest Cutter after purchase" table. Add a real
Interest Cutter testimonial above YES once buyers give one, with permission.

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
