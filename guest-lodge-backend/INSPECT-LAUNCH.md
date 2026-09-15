# Marketel Inspect launch gate

Inspect is intentionally disabled by default. Enable it only after infrastructure
and internal QA are complete. It must be enabled while Apple reviews the updated
app, but keep it unadvertised and `noindex` until approval.

## Infrastructure

- Create a private Cloudflare R2 bucket used only by Inspect. Public development
  URLs and anonymous object reads must be disabled. Set `INSPECT_R2_BUCKET`; it
  must not equal the booking-photo `R2_BUCKET`.
- Set a distinct random `INSPECT_AUTH_SECRET` of at least 32 characters and keep
  it stable; it also keys the non-readable lifetime-free-report claim.
- Confirm `support@bookmarketel.com` is an authenticated sender for email codes.
- Deploy Prisma migration `20260915000000_inspect`.
- Set `INSPECT_PUBLIC_ORIGIN=https://bookmarketel.com`.
- Optionally set `INSPECT_AI_MODEL` and `OPENAI_API_KEY`. Inspect remains usable
  without wording assistance.

## Stripe

- Create one recurring USD Price: exactly **$29.00 every month**. Set its ID as
  `STRIPE_INSPECT_PRICE_ID`.
- Set `STRIPE_INSPECT_SECRET_KEY`, or deliberately omit it to use the existing
  Marketel Stripe account.
- Create a dedicated webhook endpoint at
  `https://bookmarketel.com/api/inspect-stripe-webhook` (or the equivalent public
  backend host) and subscribe to `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
  Set its signing secret as `STRIPE_INSPECT_WEBHOOK_SECRET`.
- Create a Stripe customer-portal configuration that permits payment-method
  updates and subscription cancellation. Set its ID as
  `STRIPE_INSPECT_PORTAL_CONFIGURATION_ID`.
- Confirm a test checkout produces an `active` subscription carrying
  `product=marketel-inspect` and the matching `inspectAccountId` metadata.

## Required QA

- Web: anonymous local draft, refresh recovery, camera/library import, room
  reorder/removal, email verification, upload retry, optional AI rejection and
  acceptance, free finalization, immutable reopen, PDF, share-link rotation and
  revoke, paid quota, cancellation, and account deletion.
- Storage: neither original nor display objects resolve without an authenticated
  API or private report capability. Deleting a report/account removes both via
  the durable deletion sweep.
- Billing: concurrent checkout clicks create one subscription; replayed webhooks
  do not duplicate payment events; an old canceled-subscription event cannot
  overwrite a newer active subscription; usage resets once per paid period.
- iPhone/TestFlight: product chooser, existing Front Desk return, camera and
  library, local draft recovery, US storefront purchase link, non-US/unknown
  storefront suppression, Stripe return refresh, native PDF share sheet, product
  switching, and separate Inspect deletion/sign-out.
- App Review metadata, privacy labels and screenshots must be updated from the
  files in `marketel-frontdesk-ios/app-store/`.

After backend QA, enable Inspect for App Review without starting acquisition.
Begin the public launch only after approval. Rollback is setting
`INSPECT_ENABLED=false`; saved data remains intact.
