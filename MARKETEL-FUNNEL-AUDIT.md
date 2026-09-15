# Marketel Funnel Audit — 2026-09-02

Written by Claude after (a) running the live funnel end-to-end on a throttled
iPhone viewport, (b) reading the full Meta ad account via the Graph API, (c)
querying the Neon production DB, and (d) going back through git to reconstruct
what the funnel looked like during each campaign.


---

## THE OBJECTIVE: $18,000 cash collected, as fast as possible

> **Revision note, after review.** The first version of this section was built on a
> misreading. You wrote "3 30 min sessions"; I read it as three *booked sales calls*
> and it meant three cold prospects each spending ~30 minutes customising their
> engine. Everything I derived from the wrong reading — "$39 per booked call", a 25%
> call close rate, "the path runs through your mouth", a nine-conversation forecast,
> four warm annual closes waiting — is withdrawn. What follows is the corrected
> version.

### What the corrected fact actually tells us

Three cold clicks each spending half an hour inside the product is *strong*
engagement — that is not idle curiosity, it is an owner doing real work. They didn't
convert because **activation was hidden inside the booking engine and nobody found
it**.

So you have now run two experiments, and they failed at two different points:

| | What worked | Where it died |
|---|---|---|
| **FUNNEL** (May) | deep engagement, ~30-min sessions | the offer was never discoverable |
| **WEB2APP** (Aug) | offer is discoverable; 100% open the reveal, 67% start the challenge | the road to the offer contradicts itself |

**Neither experiment has tested whether $199 is acceptable to someone who saw a
coherent product.** That is the single most important sentence in this document, and
my first draft talked past it.

### The arithmetic still holds; the prescription does not

$18,000 at $199/mo is ~90 subscription-months. At $1,990/yr prepaid it is 9
customers. That maths is unchanged.

What I got wrong was the leap to *therefore default cold traffic to annual*. "Ten
times the cash per conversion" is true per-conversion and misleading as a business
claim, because the conversion rate will obviously not survive the immediate charge
going from $199 to $1,990. With one person having ever seen the activation page, we
have no basis to trade conversion for AOV.

**Corrected recommendation:**

- Keep **monthly** selected by default for cold traffic.
- Keep yearly prominent on the same screen with the $398 saving legible — that costs
  no conversion and lifts AOV for anyone who would have taken it anyway.
- Offer annual **personally**, to warm operators, in conversation.
- Revisit yearly-first only after you have real monthly conversions to trade against.

### The instrument that decides everything: ~8–10 activation-page visitors

Right now exactly **one** person has seen the offer. Until roughly 8–10 have, you
cannot distinguish between three completely different diseases:

1. They reach the offer and refuse it → **the offer is wrong.** Test price/terms.
2. They never reach the offer → **progression is broken.** Fix the reveal.
3. They start Stripe and stop → **trust or payment friction.** Fix that.

**We currently have evidence for (2) only.** Every recommendation I made about the
offer — pay-on-first-booking, annual-first, the setup fee — was optimising a variable
nobody has measured. Withdrawn until the data exists.

### How much does the reveal fix accelerate the signal?

This is the strongest argument for doing the trust fixes first, and it is arithmetic
rather than rhetoric. Cost per completed setup is about **$25**.

| Offer pass-through | Setups needed for 10 offer views | Ad spend |
|---|---|---|
| **17%** (today) | ~59 | **~$1,475** |
| **60%** (fixed reveal) | ~17 | **~$425** |

Fixing the first personalised screen is worth roughly **$1,000 of ad spend purely in
time-to-signal**, before it converts a single extra customer. That is why it comes
first — not because the reveal is ugly, but because it is the thing standing between
you and the ability to test anything else.

### Where the $18k realistically comes from

Being honest about the warm list, which I inflated:

- **Jack's Inn** — your testing property. Not a prospect.
- **Studios 17** — already activated. Not a new close.
- **Suite Stay / St Croix / Home Place** — legacy `clickinns.com`. They validate the
  booking-engine technology; they are not evidence for the current $199 funnel, and
  they may have commercial arrangements that predate it. Worth a conversation, not a
  forecast.
- **Rocky Hide A Way Cottages, Studio 53, Puukala Sunset Estates** — genuine warm
  follow-up, days old, qualified answers, abandoned at a broken screen. Contact them
  for **qualitative feedback**, not as probable annual customers.

That last group is the highest-value thing you can do this week, and the reason is
information, not revenue: three people who abandoned at the exact screen this audit
indicts can tell you in ten minutes whether the diagnosis is right.

**I am not going to give you a forecast for nine closes.** I don't have the data to
support one, and the first version of this document produced a confident number out
of a misreading. The honest statement is: fix the contradictions, get 8–10 people to
the offer, and *then* the conversion rate you observe will tell you what $18k costs
and how long it takes.

## 0. Method, and what to distrust

**What I actually did.** I drove `bookmarketel.com` in headless Chrome at a 390×844
iPhone viewport with an iOS Safari UA, screenshotting every frame from the landing
page through Stripe checkout. I ran the 60-second booking challenge myself. I read
the ad account through the Graph API with your `MARKETEL_META_ACCESS_TOKEN`
(read-only calls). I ran `marketel-report.js` and then queried `FunnelEvent`
directly for reveal-stage granularity. I diffed `landing.html` and `server.js`
across the commits that bracket each campaign.

**A test record exists in prod.** I created `hotel-6fa971c9` / "Cedar Hollow Inn" /
`cedarhollowinn.mktel.co`, owner `salahsalad100+fa1788377289@gmail.com`. I stopped
at the Stripe form; no payment. Delete it when convenient. I excluded it from every
DB query below.

**Two things limit confidence, and you should hold them in mind the whole way
down:**

1. **`FunnelEvent` has no rows before 2026-08-24.** Every DB-derived number in this
   document describes the last ten days only — i.e. the WEB2APP campaign. The May
   FUNNEL campaign left no trace in your own database. Only Meta has that history,
   and Meta's version is coarse. This is worth fixing on its own: you cannot do
   before/after analysis on your own funnel right now.
2. **n is tiny.** Six people have reached the reveal, ever. Four started the
   challenge. One saw a price. Every ratio below built on those numbers is
   directional, not statistical. I will flag where I'm reading tea leaves.

---

## 1. Corrections to what I told you earlier

I got three things wrong in the last two messages. Taking them out first so the
rest reads clean.

### 1.1 "You're spending $2.70/day" — wrong

That was lifetime spend ($363.28) divided by account age (4.5 months), across a
window where ads were mostly off and you were travelling. The **active campaign
has a $25.00/day budget and is pacing to it exactly**: $149.75 over six days =
$24.96/day. That's still light for a $199/mo B2B product, but it is not the slow
leak I called it.

### 1.2 "The landing page conversion collapsed 6x" — wrong, and the cause was
different

I compared FUNNEL's 21 leads against WEB2APP's 5 and called it a landing page
regression. Then I went to git. **The `Lead` event was redefined on 2026-07-25 in
commit `35911b1d`.**

| | May (FUNNEL) | Now (WEB2APP) |
|---|---|---|
| Where `Lead` fires | `/api/setup/start` | funnel step 3 of setup |
| What it means | an email was typed | 3 setup steps done **and** a favourable answer to the quality question |
| Unqualified answers | n/a | rejected, HTTP 400, no Lead recorded |

`building_demand` ("We're still building a consistent flow of guests") does not
produce a Lead at all. So `$5.59 CPL` and `$29.95 CPL` are measuring two different
human beings. A $28.50 qualified lead who finished setup is arguably the better
buy. **The number in your head — "the other campaign had $5 CPL" — is not the
comparison you think it is.**

### 1.3 "4 real prospects in 4 months" — misleading

I lumped four campaigns together. Two of them were Meta instant-form lead-gen
(zero landing page views by design), one was the old simple funnel, one is six days
old. Decomposed properly below.

---

## 2. The account, decomposed

**`act_998443262837972` · "Marketel" · USD · US/Central · created 2026-04-21 ·
balance $11.41 · no spend cap.**

Lifetime: **$363.28** spend, 7,701 impressions, 4,711 reach, freq 1.63, 282 link
clicks, 3.66% link CTR, $1.03 CPC, **$47.17 CPM**.

| Campaign | Status | Started | Spend | Impr | Link clicks | LPV | Leads | Regs | link CTR |
|---|---|---|---|---|---|---|---|---|---|
| PROJECT HOTEL \| SOFTWARE | paused | Apr 22 | $34.31 | 568 | 8 | 0 | 0 | 0 | 1.41% |
| PROJECT HOTEL \| SOFTWARE \| NO ENGINE | paused | Apr 24 | $61.92 | 1,387 | 25 | 0 | 0 | 0 | 1.80% |
| PROJECT HOTEL \| FUNNEL | paused | May 22 | $117.30 | 3,140 | 119 | 71 | 21 | 0 | 3.79% |
| **PROJECT MARKETEL \| WEB2APP** | **active** | **Aug 27** | **$149.75** | **2,606** | **130** | **107** | **5** | **6** | **4.99%** |

All four are `OUTCOME_LEADS` / `LOWEST_COST_WITHOUT_CAP`.

**The first two ($96.23) are instant-form lead gen** — zero landing page views is
the tell. Different funnel, disregard as you said.

**FUNNEL ($117.30, May–June)** was the simple self-serve route: landing → setup →
dropped straight into Front Desk. No Guestel, no App Clip, no reveal. This is the
campaign that produced your three 30-minute calls, Studios 17 among them.

**WEB2APP ($149.75, six days old)** is the current funnel with the value reveal.

---

## 3. The real funnel, honestly

First, strip the junk. Here is placement split by campaign:

| Campaign | Platform | Spend | Link clicks | LPV | Leads |
|---|---|---|---|---|---|
| FUNNEL | facebook | $72.50 | 49 | 35 | 15 |
| FUNNEL | instagram | $40.64 | 26 | 17 | 6 |
| FUNNEL | **audience_network** | **$3.57** | **43** | **19** | **0** |
| WEB2APP | facebook | $98.53 | 34 | 30 | 4 |
| WEB2APP | instagram | $43.98 | 14 | 8 | 1 |
| WEB2APP | **audience_network** | **$4.75** | **74** | **65** | **0** |
| WEB2APP | threads | $2.63 | 8 | 4 | 0 |

**In the active campaign, $4.75 of Audience Network bought 57% of your link clicks
and 61% of your landing page views, and produced zero leads.** Broken out further,
the bulk of it is `rewarded_video` — people tapping ads to earn in-game currency.

Every ratio you have looked at in Ads Manager for the last six days has been
dragged by that. Real WEB2APP delivery is **$142.51 → 48 link clicks → 38 landing
page views → 5 leads**.

### The stage-by-stage, WEB2APP only

| Stage | Count | Survival |
|---|---|---|
| Impressions | 2,606 | — |
| Link clicks (real placements) | 48 | 1.8% of impr |
| Landing page views (real) | 38 | 79% |
| Email submitted (`SetupStarted`, DB, all sources) | 8 | ≤21% |
| Setup completed | 6 | 75% |
| Reveal opened (`ValueRevealStarted`) | 6 | 100% |
| Tapped "View your booking page" | 6 | **100%** |
| Started the 60-second challenge | 4 | **67%** |
| **Completed the challenge** | **0** | **0%** |
| Reached checkout inside the preview | **0** | 0% |
| Advanced past reveal stage 1 | 2 | 33% |
| Saw the $199 price (`ActivationOfferViewed`) | 1 | 17% |
| Clicked Activate | 0 | 0% |
| Paid | **0** | 0% |

Seven properties created in the window: **Studios 17** (yours, Sep 2, the only one
with `revealProgressStep` > 0), one blank incomplete, **Rocky Hide A Way Cottages**,
**AI slop**, **Studio 53**, **Lol**, **Puukala Sunset Estates**. Two are obvious
junk. Every real one sits at `revealProgressStep = 0`.

Quality answers given, in order: `ota_marketplaces` ×3, `repeat_guests`,
`direct_calls_messages`, `repeat_guests`. Every single person who answered gave a
qualified answer. **Your traffic is the right traffic.**

---

## 4. Where it dies

### 4.1 Four people started your challenge. Zero finished.

```
JourneyBookingChallengeShown          6 hotels
JourneyBookingChallengeStarted        4 hotels
JourneyBookingChallengeCompleted      0 hotels
JourneyBookingPreviewCheckoutReached  0 hotels
JourneyBookingChallengeAbandoned      3 hotels
ActivationCtaClicked                  0 hotels
```

This is the most important block of numbers in the whole audit. Those four were the
highest-intent traffic you have had in four months. They typed an email, named
their property, entered a rate, watched the build screen, tapped into the preview,
and then *opted in* to a timed challenge. Nobody does that unless they want the
product to be good.

Then they hit the screen I hit. Here is exactly what it shows:

- a **gray placeholder bed icon** captioned "Add your room photo"
- **four amenities they never entered** — Free WiFi, Smart TV, Free Parking, Weekly
  Cleaning — hard-coded at `hotel-booking-app/src/RoomCard.jsx:280` as the guest-side
  fallback when amenities are empty
- "Choose dates to see rates", no price visible
- a **`Locked`** badge: *"Keep Cedar Hollow Inn in Guestel — Available once this
  property finishes setup"*, sitting two inches below your own "✓ Your live guest
  page is online"
- and while the 60-second timer runs, the largest button on screen is
  **"See how you edit it in Front Desk →"** — the exit

Cost per human who has ever seen your price: **$363**. One person.

### 4.2 The challenge exposes your pricing defaults, and they are wrong

I entered **$129/night**. I ran the challenge to the cart. It produced:

```
Room (7 nights)   $774.00      → $110.57/night, not $129
Taxes & Fees       $77.40      → flat 10%, never set by the owner
Total             $851.40
Reserve for $0 Today · Pay when you check in on Sep 2, 2026
```

Two lines of code:

- `guest-lodge-backend/setup.html:863` — `weekly: existingRates.weekly || Math.round(nightly * 6)`
  and `monthly: existingRates.monthly || Math.round(nightly * 24)`. A seven-night
  stay is billed as six nights (**14% off**); a month is billed as 24 nights
  (**20% off**). The owner never agreed to either.
- `guest-lodge-backend/server.js:13237` — `taxRate: taxRate || 0.10`. A flat 10%
  "Taxes & Fees" line appears on their page in a jurisdiction whose lodging tax is
  almost certainly not 10%.

An operator who runs your challenge concludes the product discounts their rooms and
misquotes their tax. That is the single interactive proof point in the funnel and it
argues against you. Four for four.

### 4.3 The money question — and this one ties to your Studios 17 feedback

You said one of the three callers emailed asking **"where is the app and how do I
get money or deposit."** You answered half of that. The reveal now shows Guestel, the
App Clip, the Front Desk app, Live Activities. "Where is the app" is handled.

**"How do I get money" is still unanswered anywhere in the funnel**, and it's worse
than unanswered — it's contradicted:

- `prisma/schema.prisma:407` declares `stripeAccountId String?` on `HotelConfig`.
  **It is referenced nowhere in the codebase.** Zero usages. Stripe Connect is not
  wired.
- `server.js:3168` and `server.js:5148`: *"Full online payment is not enabled for
  this property. Reserve with the $1 verification instead."* The default model is a
  $1 card verification hold; the guest pays the property at arrival.
- The activation screen's only mention of Stripe is *"Billing starts when you
  complete secure Stripe checkout"* — that is **them paying you**, not them getting
  paid.
- The three-things list reads: Direct Booking Page / Front Desk / Guestel. Nothing
  about money reaching a bank account.

So the owner's actual experience is: test the booking flow, see **"$0 today, pay
when you check in"**, and conclude either that the engine doesn't collect money, or
that Marketel is sitting on it. Both kill the sale. That is precisely the email you
received.

The $1-hold model is a perfectly defensible product decision — it's *simpler*, the
owner charges the card at the desk the way they already do, and it sidesteps a
mountain of Connect onboarding, KYC and chargeback liability. **But you have to say
so, out loud, in the funnel.** One sentence on the activation screen: *"Guests
reserve with a $1 card verification and pay you directly at check-in — Marketel
never touches your money."* That converts a silent objection into a feature.

### 4.4 Your ad promises free. Your funnel charges $199.

The live ad, `PROJECT MARKETEL | HOWNERS`, ends:

> "No tech headaches. No contracts. **No credit card. Completely free to build and
> try.**"

and earlier promises:

> "✅ Guests book straight with you in under 60 seconds"

Then the product says **Locked** and asks for $199/month before it will take a
single booking.

Six people reached the reveal. One reached a price. **They were not rejecting $199 —
most were never told about it.** They found the thing the ad promised was free, and
it was locked.

---

## 5. What the git history says

Two commits bracket everything.

**`35911b1d` — 2026-07-25.** Changed the landing sub-CTA from:

> "No credit card. Takes 3 minutes. Completely free to build."

to:

> "Free to build and preview. **$199/month** only when you activate, with a **7-day
> money-back guarantee**. Cancel anytime."

The same commit moved the `Lead` event from `/api/setup/start` to setup step 3 with
a qualification gate.

**`085b0cc1` — 2026-07-29.** *"Replace pre-activation tour with value reveal."*

So the funnel WEB2APP is driving is architecturally different from the one FUNNEL
drove, in three simultaneous ways: price is now disclosed pre-click-through, the
conversion event is deeper, and there's a seven-beat reveal between setup and the
price. Three variables changed at once. That's why nothing is cleanly comparable and
why the DB gap hurts.

**Like-for-like on the one thing that is comparable** — real-placement landing page
views converting to *any* email:

| | FUNNEL (May, "No credit card") | WEB2APP (Aug, "$199/month") |
|---|---|---|
| Real spend (FB+IG) | $113.14 | $142.51 |
| Real LPV | 52 | 38 |
| Emails captured | 21 | ≤8 |
| **LPV → email** | **40.4%** | **≤21%** |

Call it a 2x drop, not 6x, and the 8 is an upper bound because it includes organic
and direct traffic. Confounded by the ad angle changing too (FUNNEL ran the "direct
booking page" script; HOWNERS runs the "renting your own guests / home screen"
script). **But it is the one number I'd want a clean read on**, because it's the
cheapest thing in the funnel to test and the top of everything else.

Worth noting the opposite signal: HOWNERS gets a **5.36% link CTR** against
FUNNEL's 3.84%, and an 83% link-click→LPV rate against 61%. The new ad brings
*better* traffic to the page and the page converts it worse. That points at the page,
not the audience.

---

## 6. Media buying: what's actually wrong

Ranked by how cheap the fix is.

**1. Audience Network — exclude it today.** 57% of clicks, 61% of landing page
views, 0 leads, for $4.75. It is corrupting your reporting *and* teaching a
conversion-optimized pixel that cheap landing page views live inside mobile games.
Free to fix, immediate.

**2. Reels — flagged, not concluded.**

```
facebook / facebook_reels    $132.67 → 43 LPV → 16 leads → 0 registrations
instagram / instagram_reels   $73.64 → 13 LPV →  3 leads → 0 registrations
facebook / feed               $62.70 → 16 LPV →  3 leads → 3 registrations
instagram / feed              $36.44 →  9 LPV →  2 leads → 2 registrations
```

Feed converted 5 of 5 leads through to completed setup; Reels converted 0 of 19.

**Correction:** this comparison spans both campaigns, and I spent a whole section of
this document explaining that `Lead` means different things across that boundary —
then made a cross-period comparison anyway. `CompleteRegistration` also wasn't wired
during FUNNEL, so the "0 registrations" is partly an artefact of instrumentation, not
behaviour. Treat this as *worth watching within WEB2APP only*, not as a decision.
Reallocating placement mid-learning would also reset delivery again, which you have
already done once this week.

**3. The targeting spec is chain employees, not owners.**

```
work_employers:  "HOTEL MANAGEMENT"
work_positions:  "Hotel General Manager", "Hotel Operation Manager"
advantage_audience: 1
age_min 18 / age_max 65
```

A GM at a branded property cannot buy software and doesn't personally feel OTA
commission — corporate owns both. Your buyer is an owner-operator who lists himself
as "Owner" at "[his property]" or leaves the field blank. And `advantage_audience: 1`
lets Meta leave the spec anyway, which is how you paid real money into 18–24 and
25–34.

Better: drop the job-title spec entirely, kill audience expansion, age 30–65, and
build a **lookalike from your existing real properties** — Suite Stay, St Croix,
Home Place, Studios 17. A four-row seed list beats a wrong interest spec.

**4. You're optimizing for `LEAD`.** Six leads in 4.5 months means the pixel has
never left learning; Meta wants ~50 conversions per adset per week. At $25/day
with a conversion that fires once every two days, delivery is effectively random.
Once the reveal is fixed, move to `CompleteRegistration` — it's a deeper signal and
you already fire it server-side with a deduped event ID at `server.js:13336`.

**5. Your 1-1-1 instinct was right.** Running three ads in one adset split $25/day
three ways and starved HOWNERS, which is your best creative by every metric.
Collapsing back to 1-1-1 reset learning, which is why the last few days were
volatile — that's expected and it's already recovering. Yesterday produced your
first-ever `ActivationOfferViewed`. Don't touch it again for at least a week.

**6. Don't add budget yet.** Every incremental dollar today buys a person who will
hit the Locked screen. Fix the reveal first, then fund it properly.

**Things that are NOT the problem, so stop looking at them:** the ad creative (5.36%
link CTR is genuinely strong — "You never owned them. You rented them" is the best
copy in this operation, don't touch it), page performance (808ms FCP, 3.6s load,
432KB, 40 requests on simulated slow 4G with 4x CPU throttle), the setup flow
(75% of email submitters complete it — leave it alone), and audience quality (6 of 6
gave qualified answers).

---

## 7. Product fixes, in order

*(Read §"THE OBJECTIVE" first — these are Tier 4. They matter, but they are what you
 do between sales calls, not instead of them.)*

### The offer — this is worth more than every design fix combined

**"Your page goes live now. Put a card on file. You don't pay until it produces a
booking."**

The current boundary is the worst available one: they build a page, and the page is
a mockup that says Locked. Zero value delivered, $199 asked, from a cold lead who
has never heard of you. Flip it and the ask becomes "add a card, pay nothing until
it works."

Mechanically: Stripe SetupIntent ($0 auth) at activation, bill $199 on the first
direct booking. You keep the same price; you collect it from people who have already
proven the product works for them, which also collapses churn — an owner who has
taken a booking through it does not cancel.

Second-order effect that matters as much: they now have a **live URL they will
actually promote**, which produces real bookings, which turns your single anonymous
`$5,800 — Suite Stay` data point into forty case studies.

And your ad copy already sells this offer. You are currently buying clicks with a
free promise and cashing them against a paywall. Make the product match the ad.

### The challenge — make it send a real text to their phone

You already built the best demo in the product and you are showing it as **a picture
of Jack's Inn**.

Add one field to setup: phone number. Then the challenge becomes *book your own
room*. Ten seconds later their actual phone buzzes:

> **Marketel Front Desk** — New request at Cedar Hollow Inn: King Suite, Sep 2–9,
> $851.40. Still free? Reply yes to keep it.

They text "yes". Availability on their live page updates in front of them.

`frontdesk-assistant.js` already does this. That is a $199/month demonstration. A
carousel of a stranger's screenshots is not. And it doubles as your SMS channel for
follow-up, which you currently don't have.

### Look them up on Google Places during setup

Type property name → autocomplete → pull real address, real photos, real star
rating, real review count. Three things happen at once:

1. **The gray placeholder bed dies.** The reveal shows their actual property with
   their actual photos, found in three seconds. That's the wow you're missing.
2. **You prove "already found you"** — the core objection, answered with their own
   data, before you ask for money: *"Cedar Hollow Inn has 87 Google reviews. Every
   one of those people searched for you by name. When they tap Book on your Google
   listing, where do they land?"*
3. **Setup gets shorter**, not longer.

Places API is cheap. Show Google's photos with attribution in the preview and prompt
them to upload their own for the live page — honest, and it still solves the reveal.

### Lead the reveal with their money, not your product

Slide 1 today is your product. Make it their P&L:

> **Cedar Hollow Inn — 4 rooms at $129.**
> At 65% occupancy that's about **$10,000 a month**. If half comes through
> Booking.com at 18%, you hand over roughly **$900 a month — $10,800 a year**.
> Marketel is $1,990 a year.

**Correction — withdrawn.** I proposed replacing the step-3 question with "roughly
how much of your business comes through Booking.com / Expedia / Airbnb?". That is
worse than what you have. It narrows Marketel to a single angle when the current
question deliberately captures three valid buyers (OTA leakage, direct
calls/messages, repeat guests), and it invites a guessed number that then propagates
into a headline figure.

My proposed money slide had the same flaw: stacking assumed occupancy on top of
assumed OTA share produces an impressive-looking number that an owner who knows their
own book will immediately catch. The conservative calculator you have is more honest.

The wording is still worth tightening, e.g.:

> At a $129 nightly rate and 15% OTA commission, 11 direct room-nights avoid about
> $213 in commission — enough to cover one month of Marketel.

My only remaining preference is that owners count in *bookings*, not room-nights, so
"about two direct bookings" may land better than "11 room-nights" for the same
arithmetic. That is a wording preference, not a correction — and labelling each
figure (15–25% range on the landing page, 20% for the Suite Stay example, 15% in the
calculator) resolves the inconsistency I flagged without changing any number.

### Fix beat one. Do not cut beats two through five.

1. **Your money** (above)
2. **Your page** — real photos, and let them change one thing live. Edit the rate,
   watch the page update. Interaction beats animation.
3. **Your price** — with the new offer, and one sentence about how they get paid.

**Correction.** I originally said to cut this to three beats and move Guestel, the
App Clip and Live Activities into onboarding. That's wrong, and the reason is
pricing: a bare booking engine at $199/mo competes with Cloudbeds and Little Hotelier
and loses. The bundle — engine converts, Guestel keeps the relationship, Front Desk
controls availability — is *what justifies the price*. Deleting the differentiators
would make $199 look worse, not better.

What the data actually indicts is **beat one**, not the existence of beats two
through five. Every prospect opened the reveal; the recorded `revealProgressStep = 0`
means they stopped at the booking-page stage specifically. Fix that screen, keep each
carousel skippable with one unambiguous forward action, and leave the value story
intact.

The narrower true criticism survives: beats two to five are about **Studios 17**, not
the prospect. Personalising those visuals is worth doing. Deleting them is not.

### Fix the break-even sentence

"About 11 room-nights could cover Marketel" reads as *$1,419 of bookings to pay
$199*. Owners do that arithmetic in two seconds and it looks terrible. The true
statement, at $129/night with one 3-night direct booking saving ~$70 of commission:

> **Three direct bookings a month covers it.**

Three is small. Eleven is not. Same math, opposite feeling.

And pick one commission number. You currently use 15–25% in the headline, 20% in the
proof line, and 15% in the reveal calculator. Use 18% everywhere — it's the honest
Booking.com median and it's defensible if anyone checks.

### The follow-up gap is narrower than I first said

**Correction.** I wrote "you have none." That is wrong, and I had contradicting
evidence in my own query output at the time. What exists today:

- `sendSetupResumeEmail` — `server.js:219` (8 `SetupResumeEmailSent` events in the DB)
- `sendPreviewReadyEmailOnce` — `server.js:13075`
- exact-stage reveal persistence — `server.js:7297`
- email-first recovery with signed magic links — `server.js:14984`
- checkout-abandonment recovery — `server.js:14923`

The magic-link path also means my "returning prospects hit a hostile PIN wall" claim
was overstated: the PIN is a fallback, and the email-first path is the primary route.

**The one genuine gap:** the checkout-recovery loop keys on `checkoutStartedAt`, so
somebody who *viewed the offer and never started checkout* is not covered by
anything. Given that this is currently the largest cohort at the bottom of your
funnel, it's worth adding — after the reveal fixes, since right now the cohort is one
person.

### Proof

Your entire proof stack is one anonymous number. For owner-operators — who trust
other owner-operators and essentially nobody else:

- **A 45-second phone video of the Suite Stay owner.** Unproduced, shot in their
  lobby, name and face, saying "we did $5,800 direct last month." Ugly and real
  beats polished for this audience.
- **Your face and name in the landing hero.** "Message Salah" appears once, at the
  very end, in the smallest text on the page. That line is your strongest asset.
- **A real Front Desk bookings screen with real dollar figures**, not an
  illustration.

---

## 8. Does this work at all?

Your own numbers, real placements only:

- $100 → ~34 link clicks → ~27 landing page views → ~5 emails → ~4 completed setups
- **Cost per completed setup: ~$25.** That is genuinely good.
- But only 1 in 6 setups ever reaches a price → **~$150 per price-view**, and 0% of
  those convert.

Fix the reveal so 60% of setup-completers reach the offer and 20% activate:

- $25 per setup → ~$42 per price-view → **CAC ≈ $210**
- At $199/mo that's ~1.1 months payback. That works, with room to spare.

Even at half that efficiency it works. **The gap between "infinite CAC" and "$210
CAC" is entirely inside the reveal.** Not the budget, not the creative, not the
targeting.

---

## 9. The plan, corrected

The ordering principle is no longer "sell your way to $18k." It is: **remove the
contradictions that make the funnel untestable, then buy enough traffic to read the
offer.**

### Now — the trust and accuracy fixes

These are the ones the evidence actually supports, and none of them is a strategy
bet.

1. **Remove invented amenities when none were supplied.** `RoomCard.jsx:280`. Right
   now a live guest page advertises Free WiFi, Smart TV, Free Parking and Weekly
   Cleaning for properties that never claimed them.
2. **Give the no-photo state an intentional fallback** instead of a grey placeholder
   bed captioned "Add your room photo".
3. **Remove the contradictory Guestel "Locked / finish setup" treatment.**
   Preview-only is fine; appearing broken is not, especially two inches under
   "✓ Your live guest page is online".
4. **Stop silently inventing weekly/monthly discounts and a 10% tax** —
   `setup.html:863`, `server.js:13237`. This is the strongest technical finding in
   the audit and it must be fixed before challenge-completion data means anything.
5. **Explain the $1 verification and how the property gets paid**, one sentence:
   *"Guests verify their card with a temporary $1 hold, then pay your property
   directly. Marketel never holds your room revenue."*
6. **Make sure the challenge CTA doesn't compete with the challenge.** While the
   60-second timer runs, the largest control on screen is the exit.
7. **Test stage-aware email return on a second device** — the machinery exists at
   `server.js:7297` and `:14984`; confirm it lands people where they stopped.
8. **Exclude Audience Network.** The one ad change I'd still make unreservedly:
   within WEB2APP alone it is $4.75 for 74 clicks, 65 landing page views and zero
   leads, and rewarded-video traffic structurally cannot contain this buyer.

### Then — freeze and measure

9. **Freeze the funnel** and run the existing campaign, unchanged, until **8–10 real
   people reach the activation page.** Post-fix that is roughly $425 of spend; today
   it would be $1,475. Do not touch targeting, placement mix, optimisation event or
   ad rotation during this window — you have already reset learning once this week.

10. **Contact the three recent abandoners** — Rocky Hide A Way Cottages, Studio 53,
    Puukala Sunset Estates — for *qualitative* feedback. They abandoned at exactly
    the screen this audit indicts. Ten minutes with any one of them is worth more
    than the rest of this document.

### Only then — the offer questions

Once 8–10 people have seen the price, the data tells you which experiment to run, and
none of these should be run before that:

- They see it and refuse → test price, term, or a trial.
- They start Stripe and stop → payment trust.
- They still don't reach it → progression is still broken; the reveal fixes weren't
  enough.

### What I'd hold back

**Annual-first defaults, pay-on-first-booking, the $500 setup fee, cutting the reveal
to three beats, and replacing the qualification question** are all withdrawn as
immediate actions. Each is a plausible experiment; none is supported by data that
exists today; and several would destroy the very signal you're about to collect.

## 10. Things I'd want to know that I couldn't determine

- **Why did `FunnelEvent` start on 2026-08-24?** Table recreated, migration, or
  retention policy? Whatever it is, you're flying blind on anything older than ten
  days, and you'll want that history the next time you change the funnel.
- **What did the three 30-minute callers actually say**, beyond the app/money email?
  That's the highest-value data you own and none of it is written down anywhere I
  could find in the repo.
- **Were Suite Stay, St Croix and Home Place founder-sold?** If so, your only proof
  that anyone will pay for this came from you in a room, not from the funnel — which
  is fine, but it means the funnel has never once closed a customer and you should
  size your confidence accordingly.
- ~~**Is `revealProgressStep` written at all?**~~ **Answered, and it strengthens the
  central finding.** `server.js:7292` maps `BookingEngineRevealViewed → 0`, so 0 is a
  *written* value meaning "stopped at the booking-page stage", not an unwritten
  default. `BookingEngineRevealViewed` fired for six hotels. So it is now confirmed
  rather than inferred: every real prospect reached the first personalised screen and
  stopped there.
