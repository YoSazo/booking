# App Review notes

Marketel Front Desk is a companion app for existing Marketel business
customers operating real-world lodging properties. It manages room
availability and reservations for physical stays; it does not sell media or
consumer digital content. The app does not sell features, link to a checkout, or
offer subscription management. Only a property with an active Marketel account
can sign in.

The Front Desk HTML, JavaScript, CSS, fonts, and icons are packaged inside the
submitted app. Network requests after launch are authenticated API/data calls,
image/media delivery, and Apple push registration—not a remote website replacing
the submitted executable.

## Review account

The private Property ID and Front Desk PIN are supplied in App Store Connect's
App Review sign-in information. They open a dedicated, permanently entitled
demonstration property containing only synthetic rooms, guests, bookings, and
availability. No email-inbox access or one-time code is required for review.

Do not place those credentials in this repository. Keep the dedicated review
property subscribed and available for the entire review period.

## What to test

1. On the sign-in screen, choose **Use property ID and PIN instead**, then use
   the private credentials supplied in App Store Connect.
2. The four native tabs are Your Page, Bookings, Availability, and Guest Reach. Guest Reach is where the property shares its booking-page QR or Home Screen link and communicates with guests; it is not a second App Store app.
3. Open Bookings to inspect reservation and guest details.
4. Open Availability to change a demonstration room-night.
5. Open Your Page to edit demonstration property information and find Privacy,
   Terms, Support, and Delete Account.
6. Allow notifications. A backend-generated test booking can demonstrate native
   alerts; the app otherwise remains fully usable if notification permission is
   declined.

The app uses the camera or photo library only after the reviewer chooses to add
or replace a property photo. The Contacts permission is requested only if the
reviewer chooses to save the Marketel support/assistant contact.

Support: support@bookmarketel.com
