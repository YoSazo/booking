# Marketel launch checklist

Code status as of August 12, 2026: booking-price ownership, manual-inventory
locking, Stripe recovery, setup-token rotation, account-deletion cleanup,
Front Desk web/native bundles, and release-readiness checks are implemented.
The items below require credentials, provider dashboards, or a real device.

## 1. Render production environment

Set every value documented in `guest-lodge-backend/.env.example`. In
particular, do not launch with inherited or ephemeral auth secrets:

- distinct 32+ character `MAGIC_LINK_SECRET`, `CRM_RETURN_TOKEN_SECRET`,
  `CRM_PIN_HASH_SECRET`, and `NATIVE_SESSION_TOKEN_SECRET`
- a long `ADMIN_TOKEN`
- live guest Stripe key + `/api/stripe-webhook` signing secret; subscribe that
  endpoint to `payment_intent.amount_capturable_updated` and
  `payment_intent.succeeded`
- live Marketel Stripe key, exact $199 monthly Price, $1,990 yearly Price (or
  the configured Product fallback), and `/api/marketel-stripe-webhook` secret
- `MARKETEL_ALLOW_TEST_BILLING=false`
- Vercel, R2, Brevo, VAPID, Twilio, OpenAI, Meta CAPI, and APNs values
- `BACKEND_URL` and `MARKETEL_FRONTDESK_ORIGIN` on their public HTTPS origins

After deployment, run the protected audit (send the token as a header; never
put it in a URL):

```bash
curl -sS \
  -H 'x-admin-token: YOUR_ADMIN_TOKEN' \
  https://guest-lodge-backend.onrender.com/api/admin/launch-readiness
```

Do not run paid traffic until every critical check reports `ok: true`.

## 2. Database and web deployment

- Let Render run `prisma migrate deploy`, then confirm `/health` returns 200.
- Confirm Vercel has the newest booking-engine deployment.
- Complete one brand-new incognito funnel from ad landing through setup,
  monthly live Stripe Checkout, activation, Front Desk login, and guest URL.
- Repeat with annual billing and verify exactly $1,990/year.
- Create a real $1 guest authorization; verify the pending/confirmed booking,
  owner SMS, owner email/push, confirmation email, and guest PWA return flow.
- Test a simultaneous last-room booking on two devices; only one may win.
- Test cancel/release and account deletion on disposable properties; verify the
  Stripe hold is released and only that property's subscription is cancelled.

## 3. Apple / TestFlight

- Finish Apple enrollment and agreements.
- Complete `marketel-frontdesk-ios/app-store/submission-checklist.md`.
- Replace all `REPLACE_WITH_REVIEW_*` values in
  `marketel-frontdesk-ios/app-store/review-notes.md` with a stable subscribed
  demo property (never a real customer).
- Add the eight signing/App Store Connect GitHub Actions secrets.
- Upload a signed build to TestFlight and test sign-in, switching property,
  all four tabs, photo/contact permissions, push actions, Assistant, sign-out,
  and deletion cancellation over Wi-Fi and cellular.
- Submit for review. After Apple publishes the listing, set the exact
  `https://apps.apple.com/...` URL as `MARKETEL_FRONTDESK_APP_STORE_URL` on
  Render and redeploy.

## 4. Final ad gate

- Open the paid activation success screen and confirm its primary CTA opens
  the live App Store listing; web Front Desk remains the muted fallback.
- Verify Meta Pixel and server CAPI events once each—especially Lead,
  checkout-requested, Subscribe, and Purchase—with no duplicate Subscribe.
- Record the exact release commit and start with the proven Booking.com / under
  60-second control creative. Make funnel changes from accumulated telemetry,
  not individual sessions.
