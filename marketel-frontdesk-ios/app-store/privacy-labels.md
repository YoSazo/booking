# App Store privacy labels

Use these as a conservative starting point when completing App Privacy in App
Store Connect. Confirm the production configuration immediately before
submission.

## Data linked to the user

- Contact info: name, email address, phone number, physical address
- User content: guest and Front Desk Assistant messages, property descriptions,
  room details, photos, support messages, and reservation information
- Identifiers: Marketel property/account identifier and native push/device token
- Purchases: Marketel subscription status and payment history metadata; card
  numbers are handled by Stripe and are not stored by Marketel
- Usage data: product interaction used for service operation and improvement

## Purposes

- App functionality
- Analytics/product improvement for product-interaction data

Account and support emails, booking alerts, login codes, and assistant messages
are service communications and therefore use the App Functionality purpose,
not Developer Advertising or Marketing.

## Tracking

Select **No, we do not use data for tracking**. The authenticated native app
does not load Meta Pixel or Microsoft Clarity. Do not change that production
behavior without revisiting both this answer and `PrivacyInfo.xcprivacy`.

## Other declarations

- The app is not directed to children.
- `ITSAppUsesNonExemptEncryption` is false because the app relies on standard
  operating-system HTTPS/TLS and does not implement proprietary encryption.
- The public privacy-policy URL should be
  `https://guest-lodge-backend.onrender.com/privacy`.
