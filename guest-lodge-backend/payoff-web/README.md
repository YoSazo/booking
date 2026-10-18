# Marketel Payoff

Public page: https://bookmarketel.com/payoff. The tool: https://bookmarketel.com/payoff/app.

$33 USD once, no subscription. The tool opens straight after payment and the
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
