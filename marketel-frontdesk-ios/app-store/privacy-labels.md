# App Store privacy labels

What to enter under App Privacy in App Store Connect for the Marketel app.
It covers Claims (the tool new installs see) and Front Desk, whose code still
ships for existing customers. Keep it in step with
`ios/App/App/PrivacyInfo.xcprivacy`; `npm run verify:release` checks the parts
that are easy to lose.

## Tracking

**No, we do not use data for tracking.** Nothing done inside the app goes to
Meta, including a purchase started from the app and paid in Safari: those
checkouts are marked `source: app` and the server never sends them. Changing
that means an App Tracking Transparency prompt and a tracking label.

## Data linked to the user (all: App Functionality unless noted)

| Category | Type | Why |
|---|---|---|
| Contact Info | Email Address | Sign-in codes, account, receipts |
| Contact Info | Name | Report author and signer names |
| Contact Info | Phone Number | Front Desk support and assistant features |
| Contact Info | Physical Address | Property and unit names/addresses |
| User Content | Photos or Videos | Report photos, business logo |
| User Content | Audio Data | Voice notes are uploaded and transcribed (OpenAI); not stored |
| User Content | Customer Support | Support messages |
| User Content | Emails or Text Messages | Front Desk guest and assistant messages |
| User Content | Other User Content | Observations, signatures, saved properties, report details |
| Identifiers | User ID | Account identifier (also Analytics) |
| Identifiers | Device ID | Front Desk push token (also Analytics) |
| Purchases | Purchase History | Subscription and single-report status; cards stay with Stripe |
| Usage Data | Product Interaction | Report and funnel events (Analytics and App Functionality) |

## Not collected by the app

- **Location:** Claims never records it. Inspect and Incident can, but a new
  install cannot reach them; revisit if either returns to the menu.
- Diagnostics, health, financial info, contacts, browsing or search history,
  sensitive info.

## Other declarations

- Not directed to children.
- `ITSAppUsesNonExemptEncryption` is false (standard HTTPS/TLS only).
- Privacy policy URL: `https://bookmarketel.com/privacy`.
