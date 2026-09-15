# App Review notes

Marketel serves two related real-property jobs. Inspect creates condition
reports from photos and observations entered by a property operator. Front Desk
is a companion for Marketel lodging customers managing room availability and
physical-stay reservations. The app does not sell media or consumer content.

Inspect includes one finalized report without a card. In the United States
storefront only, after that free report the app may open a Stripe-hosted web
page for the $29/month business service. The app reads StoreKit's storefront
country and does not show purchase or subscription-management links in other
storefronts. Existing subscribers outside the United States can sign in and use
their paid allowance. Front Desk booking activation remains web-side and its
native access rules are unchanged.

The Front Desk and Inspect HTML, JavaScript, CSS, fonts, and icons are packaged
inside the submitted app. Network requests after launch are authenticated
API/data calls, image/media delivery, and Apple push registration—not a remote
website replacing the submitted executable.

## Review access

The private Property ID and Front Desk PIN are supplied in App Store Connect's
App Review sign-in information. They open a dedicated, permanently entitled
demonstration property containing only synthetic rooms, guests, bookings, and
availability. No email-inbox access or one-time code is required for review.

Do not place those credentials in this repository. Keep the dedicated review
property subscribed and available for the entire review period.

Inspect can be tested without those credentials: choose Inspect at first launch,
create a report locally, add a synthetic photo and preview it. Saving/exporting
asks for an email one-time code, so the reviewer may use an inbox they control.
The first finalized report requires no purchase or card.

## What to test

1. On a clean install, choose **Inspect**. Create and preview a synthetic report;
   verify an email to finalize the one free report and open the native PDF share sheet.
2. Return to Front Desk using the product switch. On the sign-in screen, choose **Use property ID and PIN instead**, then use
   the private credentials supplied in App Store Connect.
3. The four native tabs are Your Page, Bookings, Availability, and Guest Reach. Guest Reach is where the property shares its booking-page QR or Home Screen link and communicates with guests; it is not a second App Store app.
4. Open Bookings to inspect reservation and guest details.
5. Open Availability to change a demonstration room-night.
6. Open Your Page to edit demonstration property information and find Privacy,
   Terms, Support, and Delete Account.
7. Allow notifications. A backend-generated test booking can demonstrate native
   alerts; the app otherwise remains fully usable if notification permission is
   declined.

The app uses the camera or photo library only after the reviewer chooses to add
a report or property photo. The Contacts permission is requested only if the
reviewer chooses to save the Marketel support/assistant contact.

Support: support@bookmarketel.com
