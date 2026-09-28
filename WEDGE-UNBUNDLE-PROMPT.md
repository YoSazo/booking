# Codex task: find bloated apps we can undercut with a simpler, cheaper iPhone app

Marketel builds small, dead-simple, iPhone-first tools ("wedges") and sells them
with Meta ads. Our edge is distribution (ads at 4–5% link CTR, about $1 a click)
and simplicity. **The new rule for finding a wedge:** find a product that already
has lots of paying subscribers, that does far too much, where users say it is
too complicated, too expensive, or that they only use one feature. We offer that
one job: simpler, cheaper ($25/month or less), in a well-designed iPhone app.

**It does NOT have to fit our current engines.** It has to be simple enough to
build in days, not months.

This is research and writing only. The output is a ranked list and build-ready
briefs.

---

## 0. Ground rules

- **Branch:** work on a new branch, `unbundle-research`. Write only under
  `docs/wedges/research/unbundle/`. Commit to that branch. Never push to
  `main`: a push to `main` deploys production.
- **Read-only, and never contact anyone.** Don't post, comment, message, sign
  up, or start trials that ask for a card. Don't use the Meta, Stripe or
  database credentials in `.env`.
- **Cite everything.**
  - Every fact, price, subscriber number and quote gets a URL and the date you
    checked it.
  - Quote people exactly, two sentences at most. For App Store and Google Play
    reviews, record the star rating when it is visible.
  - Never invent a quote, a number or a source. Mark estimates as estimates,
    with their inputs. If a page is blocked, say so; don't guess what it says.
- **Recency:** prefer 2025–2026 sources. Price increases and fee changes are
  some of the strongest evidence, so date them.

## 1. Read these first

1. `docs/wedges/FRAMEWORK.md`: especially "Launch playbook: the ads" and the
   kill rule. Every wedge you propose will be judged by it.
2. The earlier wedge research, on branch `wedge-research`:
   `git show wedge-research:docs/wedges/research/SCORECARD.md`, and the briefs
   next to it. Don't repeat that work; this search starts from the incumbents
   instead of from our engines.
3. `guest-lodge-backend/wedges/claims.js` and `guest-lodge-backend/wedges/intake.js`:
   what a finished wedge looks like.

## 2. The ad script every wedge must fit

Both of our winning ads have the same seven parts. A wedge whose script you
cannot write truthfully is out.

1. **Identity callout** that stops the right person: "Hotel owners," /
   "Airbnb hosts,".
2. **Money they are losing to someone:** "you're giving Booking.com free
   money", "you're paying for it yourself".
3. **Fast fix:** "build X in under 3 minutes".
4. **How it works, in one sentence.**
5. **One detail that kills the objection:** "works with whatever you use now".
6. "Completely free to try."
7. **A close that restates the loss as an injustice:** "stop giving
   Booking.com bookings that were already yours".

This search adds a second kind of money villain to part 2: overpaying for
bloated software, or platform fees and commissions on customers who were
already yours.

## 2b. The low-customer-cost test (a hard filter)

Proof that people pay is not enough: the wedge must be cheap to win from a
cold ad. At about $1.30 a visitor, a paying customer under ~$50 needs roughly
3 in 100 visitors to end up paying. Keep a candidate only if it passes all
four:

1. **The need is there this week** for most people with the identity: a
   weekly or daily job, not an occasional emergency.
2. **The first use pays off the same day** in money: a job won, a payment
   received, a review posted, a fee avoided. Not just "more professional".
3. **No free substitute that's good enough.** Check Venmo, texting a link,
   the platform's own free AI tool, and apps that are free forever, such as
   Joist.
4. **No switching.** It replaces paper, texts or nothing; it doesn't ask
   them to leave software their business runs on.

Add these outside signals of cheap customers:

- App Store rating counts for simple, low-price apps in the category. For
  example, Invoice Simple has 123,000 ratings at $7–22 a month, which shows
  that category can be sold cheaply at scale.
- Meta Ad Library advertisers in the category whose ads have run for months.

## 3. What to find: at least 30 incumbents

For each one, record:

- **Who uses it,** as the identity in 1–2 words (for example "Barbers",
  "Photographers", "Painters").
- **Paid base:** company-reported customer numbers, press releases, and App
  Store rating counts as a proxy. Cite them.
- **Price:** plans, per-user fees, commissions, marketplace fees, and any
  recent price increase, dated.
- **Bloat and price pain:** App Store and Google Play reviews at 1–3 stars,
  and Reddit threads saying "too complicated", "too expensive", "I only use
  X", "they raised the price", or "the fees are killing me". Count how often
  each complaint appears in your sample.
- **The one job** most users actually use.
- **Build simplicity:** the screens, backend and integrations the one job
  needs, and an estimate in days.
  - Flag the hard parts: payments, calendars, SMS, bank feeds.
  - **Exclude anything regulated,** such as health records (HIPAA) or
    accounting and tax compliance.
- **Switching:** can our app work alongside the incumbent, or must the user
  leave it? How locked in is their data?
- **Frequency:** how often a user does the one job. Weekly or more is best.
- **The pitch:** the seven-part script, the price comparison, and whether
  the identity is reachable on Meta.
- **Market size:** the number of US businesses or people with that identity,
  cited.

### Where to look

- **App Store:** `apps.apple.com/us/app/...`, 1–3 star reviews.
- **Google Play, G2, Capterra, Trustpilot.**
- **Reddit:** for example r/Barber, r/Hairstylist, r/salons, r/Photography
  and its business subreddits, r/WeddingPhotography, r/Contractor,
  r/sweatystartup, r/smallbusiness, r/Entrepreneur, r/Detailing,
  r/restaurateur, r/AirBnB, r/airbnb_hosts, r/PetGroomers, r/personaltraining,
  r/tattoo and r/tattooartists.
- **Company pricing pages and price-change announcements.**
- **The Meta Ad Library:** who advertises to each identity, and how long their
  ads have been running.

### Seed list (not a limit; add your own)

- **Beauty and appointments:** Booksy, Vagaro, Fresha, Square Appointments,
  GlossGenius, Mindbody, Acuity, Calendly.
- **Photographers and creatives:** HoneyBook, Dubsado, Pixieset.
- **Trades and home services:** CompanyCam, Jobber, Housecall Pro, Workiz,
  Houzz Pro, Buildertrend, JobNimbus, Invoice Simple.
- **Vehicles and pets:** Urable, MoeGo, Gingr.
- **Restaurants:** Toast, OpenTable, Resy.
- **Short-term rentals and hotels:** Hostaway, Guesty, Hospitable, OwnerRez,
  Turno, Breezeway, PriceLabs, Cloudbeds, Little Hotelier.
- **Inspections and condition records:** SafetyCulture, Record360, RentCheck,
  zInspector, HappyCo.

## 4. Scoring the top 12

Score each from 1 to 5 on the criteria below, and show the arithmetic.
**The total is out of 105.**

| Criterion | Weight |
|---|---|
| Size of the paid base | ×3 |
| Bloat or price pain, from reviews | ×3 |
| How clear the one job is | ×2 |
| How simple it is to build | ×2 |
| Money villain (fees, commissions, price increases) | ×2 |
| How strongly the identity stops the scroll on Meta | ×2 |
| Used weekly or more | ×2 |
| Works alongside the incumbent | ×1 |
| Users live on their phones (iPhone-centric) | ×1 |
| The output reaches someone else (a customer, a client), so every use advertises us | ×1 |

## 5. What to deliver (all under `docs/wedges/research/unbundle/`)

1. **`LONGLIST.md`:** all 30 or more incumbents, grouped by category. For each:
   the identity, price, the one job, the pain, and in or out with the reason.
2. **`SCORECARD.md`:** the top 12 with arithmetic, and the sources.
3. **`<id>-BRIEF.md` for each of the top 5:**
   - **The case:** the incumbent and its price; the identity; the one job; 6
     or more quotes from at least 3 places, including the App Store; the
     price anchor.
   - **The product:**
     - the 3-minute flow, screen by screen;
     - the build scope in screens, backend and integrations, and days;
     - the pricing: $25/month or less, with a free trial.
   - **The ad:** the seven-part script; primary text; headline; Meta
     targeting.
   - **Risks:**
     - how hard switching is;
     - trademarks: never use a competitor's trademark in App Store keywords,
       and in ads name platforms only descriptively, as with Airbnb and
       Booking.com;
     - App Store guideline 4.3: we ship one app with a chooser, not near-copies.
   - **Prediction:** what the kill rule is likely to show (share tapping
     start free at 100 visitors).
4. **`RECOMMENDATION.md`:** the next 2 to build, why, and what we must
   confirm before building them.

## 6. How you know you're done

- 30 or more incumbents, each with a cited price and cited evidence of pain.
- The top 12 scored with visible arithmetic.
- 5 briefs a builder could start from, each with a truthful seven-part script.
- Every price and subscriber number linked and dated.
- No invented quotes or numbers.
- Nothing outside `docs/wedges/research/unbundle/` changed.

**When you finish, reply with:** the top 5 in order with their scores, the 2
you would build next, and anything you couldn't verify.
