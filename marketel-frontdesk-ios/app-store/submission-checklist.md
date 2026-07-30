# Marketel Front Desk submission checklist

## Apple Developer

- [ ] Enroll the seller in the Apple Developer Program and accept current
  agreements.
- [ ] Register explicit App ID `com.bookmarketel.frontdesk`.
- [ ] Enable Push Notifications on that App ID.
- [ ] Create an Apple Distribution certificate and an App Store provisioning
  profile named for this app.
- [ ] Create an APNs `.p8` key and record its key ID and team ID.
- [ ] Create the app record in App Store Connect with SKU
  `marketel-frontdesk-ios`.

## GitHub Actions secrets

- [ ] `APPLE_DISTRIBUTION_CERTIFICATE_BASE64`
- [ ] `APPLE_DISTRIBUTION_CERTIFICATE_PASSWORD`
- [ ] `APPLE_PROVISIONING_PROFILE_BASE64`
- [ ] `APPLE_PROVISIONING_PROFILE_NAME`
- [ ] `APPLE_TEAM_ID`
- [ ] `APP_STORE_CONNECT_KEY_ID`
- [ ] `APP_STORE_CONNECT_ISSUER_ID`
- [ ] `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`

Encode binary files with base64 as one line before storing them as secrets.
The App Store Connect API key needs permission to upload builds.

## Production backend

- [ ] Deploy the Prisma migration
  `20260729213000_ios_app_store_readiness`.
- [ ] Set stable, distinct `SESSION_SECRET`, `MAGIC_LINK_SECRET`, and
  `CRM_RETURN_TOKEN_SECRET` values.
- [ ] Set `CRM_PIN_HASH_SECRET` to a separate long random secret.
- [ ] Set `NATIVE_SESSION_TOKEN_SECRET` to another long random secret.
- [ ] Set `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, and
  `APNS_BUNDLE_ID=com.bookmarketel.frontdesk`.
- [ ] Confirm `BACKEND_URL` is the public HTTPS backend.
- [ ] Confirm outbound email and the native login-code email work in production.
- [ ] Confirm `/privacy`, `/terms`, and `/app-support` are public.
- [ ] Confirm account deletion works against a disposable subscribed test
  property, including cancellation during the grace period.

## App Store Connect

- [ ] App name: `Marketel Front Desk`
- [ ] Primary category: Business
- [ ] Secondary category: Travel, if desired
- [ ] Subtitle, description, keywords, and promotional text from this folder
- [ ] Privacy URL:
  `https://guest-lodge-backend.onrender.com/privacy`
- [ ] Support URL:
  `https://guest-lodge-backend.onrender.com/app-support`
- [ ] Complete privacy labels using `privacy-labels.md`.
- [ ] Verify the submitted build contains the 1024×1024 RGB App Store icon
  without transparency.
- [ ] Capture privacy-safe screenshots using `screenshot-plan.md`.
- [ ] Replace every placeholder in `review-notes.md` with a stable demo account.
- [ ] Set age rating answers accurately; the current product has no restricted
  content.
- [ ] Complete export-compliance, content-rights, and advertising-identifier
  questions.

## Release

- [ ] Run the signed workflow once with TestFlight upload disabled.
- [ ] Install that artifact on a real iPhone and test sign-in, property
  switching, every tab, photo permissions, contact creation, notifications,
  notification actions, sign-out, and deletion cancellation.
- [ ] Run again with TestFlight upload enabled.
- [ ] Test the TestFlight build over Wi-Fi and cellular data.
- [ ] Verify the production backend is awake and review credentials work before
  pressing Submit for Review.
