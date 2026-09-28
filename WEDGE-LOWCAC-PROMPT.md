# Codex task: find products we can sell on Meta for under $50 a paying customer

**Forget our current software.** Marketel's report engine, booking engine and
wedge list are **not** constraints here. The product can be anything: a
consumer app, a prosumer tool, a one-time digital purchase, a weekly
subscription, a different audience entirely. The only question is:

> **What can we sell through Meta ads, with a dead-simple iPhone app or web
> app, for a cost per PAYING customer under $50, ideally under $30?**

This is research and writing only. The output is a ranked list with the cost
math and evidence for each candidate.

---

## What we are good at (use it, don't rebuild it)

- **Meta ads with identity-callout scripts.** Our ads get a 3.3–5% link CTR
  against about 1.8% for the category. The script has seven parts:
  1. an identity that stops the scroll ("Airbnb hosts,");
  2. the money they're losing to someone;
  3. a fix that takes under 3 minutes;
  4. how it works, in one sentence;
  5. one detail that kills the objection;
  6. "free to try";
  7. a close that restates the loss as an injustice.
- **UGC video creative,** and offer-first landing pages: a real-time video of
  the product with the price visible from the first second.
- **Building simple products in days.** The iPhone app ships through
  TestFlight; Stripe handles checkout.

**Our problem:** our audiences, business owners and hosts who skew 55+, cost
**$40–75 per 1,000 views**. That makes about $1.30 per visitor, and cheap
customers impossible unless more than 1.3% of visitors pay.

## 0. Ground rules

- **Branch:** `lowcac-research`. Write only under
  `docs/wedges/research/lowcac/`. Commit to that branch. Never push to `main`:
  a push to `main` deploys production.
- **Read-only, and never contact anyone.** Don't post, sign up, or start
  trials that ask for a card. Don't use the Meta, Stripe or database
  credentials in `.env`.
- **Cite everything.** Every number gets a URL and the date checked. Quote
  exactly. Mark estimates, and show their inputs. Never invent a quote, a
  number or a source.
- **Exclude:**
  - anything regulated or high-risk: medical or health claims, financial or
    legal advice, gambling, crypto, adult content, weight-loss claims,
    anything needing a license;
  - marketplaces that need two sides to work;
  - anything whose value depends on producing a lot of content, such as
    courses or question banks.

## 1. The cost math every candidate must show

**Cost per paying customer (CAC) = cost per landed visitor ÷ share of visitors
who end up paying.**

- **Cost per visitor:** (CPM ÷ 1,000) ÷ link CTR, adjusted for the ~80% of
  clicks that actually load the page. Find the real CPM for the candidate's
  audience. Consumer audiences are often $8–15 per 1,000 views, against our
  $40–75, and this alone can cut cost per customer by 3–5 times. Cite it.
- **Share of visitors who pay:** use published benchmarks for that exact
  model:
  - web-to-app quiz funnels;
  - intro offers ($1 trials, weekly plans, 50–80% off the first period);
  - one-time purchases (e-commerce conversion rates);
  - card-required trials.
- **Show three scenarios** (good, middle, weak) for each candidate, as a
  table.
- **Also show what a customer is worth:** the first payment, and the value
  over 3 months, against CAC. A $29 one-time purchase with a $25 CAC works;
  a $7/week subscription with 40% keeping it past month one might too.

## 2. Evidence that cheap customers exist (the most important section)

For each candidate category, find **outside proof that someone is already
buying these customers profitably on Meta**:

- **Meta Ad Library** (US, active): advertisers in the category, how many
  active ads, and the oldest start dates. Ads running 60+ days usually mean
  profitable. Record their format: quiz funnel, UGC, identity callout, price
  offer.
- **App Store and Google Play:** rating counts, top-grossing ranks, and
  public revenue estimates (Appfigures, Sensor Tower public pages).
- **Web-to-app reports** (FunnelFox, RevenueCat, Adapty and others): which
  categories convert best on web, at what price, and with which offers.
- **Founder write-ups and case studies** with real numbers: "we get
  customers for $X on Meta".

## 3. Where to look (go wide; these are seeds, not limits)

- **Consumer web-to-app categories that live on Meta:** fitness and habit
  (no weight-loss claims), sleep, pet training, parenting, language, hobbies,
  AI photo and video tools, scanners and utilities, relationships and
  communication, productivity for individuals.
- **Consumers at an acute money moment**, where a one-time purchase fits:
  - renters moving out (getting the deposit back);
  - rental-car pickup (pre-existing damage);
  - travelers (refunds and delays: check the rules; no legal advice);
  - disputing a charge;
  - selling a used car;
  - selling items on marketplaces.
- **Prosumers with a strong identity and cheap audiences:** gig drivers
  (Uber, DoorDash, Instacart), truckers (excluding regulated logbooks),
  nurses, teachers, real-estate agents, travel nurses, hairstylists, nail
  techs, lash techs, tattoo artists, personal trainers, dog groomers,
  cleaners, resellers, Etsy sellers, creators.
- **E-commerce-style digital impulse buys:** personalized reports or plans,
  AI portraits, custom documents, templates. Note each one's refund risk.

## 4. Keep a candidate only if all six are true

1. **CAC under $50 in the middle scenario,** with cited inputs.
2. **Someone is visibly buying these customers on Meta now** (the Ad Library
   evidence).
3. **Value in the first session:** they get the thing, or a real result, the
   same day. The purchase is an impulse, not a considered deal.
4. **Price between $5 and $30,** one-time or recurring, with an intro offer
   possible.
5. **The seven-part script fits truthfully,** with an identity they call
   themselves and a loss they feel.
6. **Buildable in 1–10 days** as a simple iPhone or web app. List the parts:
   screens, AI calls, payments, integrations.

## 5. What to deliver (under `docs/wedges/research/lowcac/`)

1. **`CANDIDATES.md`:** 30 or more ideas from at least 6 different areas,
   each with its audience, the offer, a cost per visitor estimate, and in or
   out with the reason.
2. **`SCORECARD.md`:** the top 10.
   - Show the CAC math table (good, middle, weak) for each.
   - Include the Ad Library evidence, customer value against CAC, build days,
     and the risks.
   - Rank them by the middle scenario's CAC.
3. **`<id>-BRIEF.md` for each of the top 3:**
   - **The offer:** the audience and the identity callout; the exact offer
     (price, intro offer, one-time or recurring).
   - **The funnel:** screen by screen, from the ad to payment. A quiz is
     allowed if it raises conversion.
   - **The ad:** the seven-part script, primary text and headline.
   - **The product:** the build list and days.
   - **The proof:** the Ad Library and market evidence, with links.
   - **The math:** the three CAC scenarios.
   - **The test:** the $40–100 smoke test that would prove or kill it in a
     week.
4. **`RECOMMENDATION.md`:** the one to test first, and why.

**Done means:** every candidate has cited cost inputs and outside evidence;
no invented numbers; nothing outside `docs/wedges/research/lowcac/` changed.

**When you finish, reply with** the top 3, each with its middle-scenario CAC
and one line of evidence, and anything you couldn't verify.
