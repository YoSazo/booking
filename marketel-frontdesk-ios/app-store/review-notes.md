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

Before submission, replace the fields below with a stable, paid review property
that contains safe demonstration rooms, bookings, and availability:

- Email: `REPLACE_WITH_REVIEW_EMAIL`
- One-time email code: generated on demand, so App Review must have access to
  the email inbox; alternatively provide the credentials below.
- Property ID: `REPLACE_WITH_REVIEW_PROPERTY_ID`
- Front Desk PIN: `REPLACE_WITH_REVIEW_PIN`

Do not use a real customer's account. Keep the review account subscribed and
available for the entire review period.

## What to test

1. Sign in with the review email or property ID and PIN.
2. The four native tabs are Your Page, Bookings, Availability, and Guest App.
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
