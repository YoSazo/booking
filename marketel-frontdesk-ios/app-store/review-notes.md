# App Review notes

Marketel Claims helps short-term rental hosts document guest damage. The host
photographs the damage (camera or photo library), describes it by voice or by
typing, and gets a dated report they can send as a private link or a PDF.
Hosts can also "check in" a unit at turnover (photos only); a later damage
report of the same property shows those photos as the "before". The app does
not sell media or consumer content.

## Payments

Building a report is free. Sending a finished report needs a Marketel plan:
$25/month or $199/year, unlimited reports (fair use 300 a month).

In the United States storefront only, the app opens a Stripe-hosted checkout
or billing page in Safari, outside the app. The app reads StoreKit's
storefront country and shows no prices, purchase links or subscription
management links in any other storefront. Existing subscribers anywhere can
sign in and use their plan.

## Review access

Sign-in uses an emailed one-time code. For review, the account in App Review
sign-in information (username = email, password = 6-digit code) signs in with
that fixed code instead; no inbox is needed. The account already has report
credits, so a report can be sent without a purchase.

## What to test

1. On first launch, choose **Claims**.
2. Tap **Sign in** (top right), enter the review email, then the 6-digit code.
3. Tap **New Report**, type any rental name, and tap **Build my report**.
4. Tap **Take photo** (camera) or **Add photos** (library). While the camera is
   open, tap the mic and describe what you see; the words become the note.
5. Tap **Build my report** to preview, then **Send this report**. Choose
   **Create a private link** or **Download the PDF** (iOS share sheet).
6. **Properties**: add a property, tap **Check in** and take a photo. A damage
   report for that property then shows it as the "before".
7. The **•••** menu holds Account, Manage subscription, Privacy, Terms,
   Support and **Delete account**.

Camera, photo library and microphone are requested only when the reviewer
chooses to add a photo or tap the mic. Voice is transcribed to text and the
audio is not kept.

The app's HTML, JavaScript, CSS, fonts and icons are packaged inside the
submitted build. Network requests after launch are authenticated API calls and
photo delivery, not a remote website replacing the app.

Front Desk remains in the app for existing Marketel lodging customers already
signed in to it from an earlier version; it is no longer offered to new users.

Support: support@bookmarketel.com
