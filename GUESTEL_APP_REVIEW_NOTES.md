<!-- Copy everything between the >>> and <<< lines into
     App Store Connect → App Review Information → Notes.
     (Adapted for ONE combined recording; fits the 4000-char limit.)
     Replace [iOS VERSION] with Settings → General → About. -->

>>> PASTE START >>>
SCREEN RECORDING
One physical-device recording is attached. In one continuous capture it shows BOTH the full Guestel app flow and the App Clip.

App flow (starts on Home Screen): open Guestel, add the synthetic "Marketel Review Inn" property, open its hotel card, choose future dates and a room, submit a direct pay-at-property room request via Stripe test mode, see it appear in the wallet, enable notifications, send a private Front Desk message, view the saved payment method, and complete in-app account deletion.

App Clip: invoked from the property's booking page in Safari — the system App Clip card, the personalized Marketel Review Inn Clip, the direct-booking flow, and Apple's full-app install overlay.

Guestel has no mandatory login. Guests immediately add a participating property. "Restore stays" is optional email recovery for a new device.

DEVICE TESTED
iPhone 13, iOS [iOS VERSION] — physical device, submitted TestFlight build.

WHAT IT DOES / AUDIENCE / VALUE
Guestel is a guest-facing direct-booking wallet for people who already have a relationship with a participating independent hotel, motel, or inn. Guests can: save participating properties, view rooms and direct availability, submit a direct room request, keep reservation status and property messages together, receive confirmation/Front Desk notifications, message the property privately about an existing stay, save an optional payment method, rebook directly, and delete their account in-app.

It solves returning guests having to re-search a property through a third-party marketplace. It is NOT a discovery marketplace or travel agency — guests do not browse unrelated properties. A property enters Guestel only after the guest opens that property's Guestel link/App Clip or enters its Marketel booking domain.

ACCESS (no username/password)
1. Launch Guestel → Hotels → Add.
2. Enter: marketel-review-inn.mktel.co → Add hotel.
3. Open the Marketel Review Inn card → Book another stay.
4. Pick future dates and any room; enter guest details (use an email you can access).
5. Stripe test card: 4242 4242 4242 4242, any future expiry, CVC 123, ZIP 55401.

Stripe test mode is used for review — no real charge or reservation is created. The $1 is a temporary test authorization to verify the card; the displayed lodging balance is payable directly to the property.

After booking, allow notifications to test alerts. The Messages tab holds private reservation communication.
Restore stays: Account → Restore stays (emails a 6-digit code).
Account deletion: Account → Privacy & this device → Delete Guestel account. This removes the guest's wallet, saved-payment access, notification registrations, and conversation access; it does not cancel the underlying reservation.

App Clip review URL: https://clip.mktel.co/clip/marketel-review-inn?intent=book

All demonstration content is synthetic, maintained solely for App Review.

EXTERNAL SERVICES
Render (backend/API), Neon (PostgreSQL), Vercel (property booking pages used by the App Clip), Stripe (test card verification + optional saved cards; Guestel never receives full card numbers), Apple Push Notification service (notifications), Brevo (transactional/verification email), Twilio (staff booking alerts), OpenAI (assists the property-side Front Desk Assistant only; not used for public content or autonomous guest conversations), Cloudflare R2 (property images). No ad networks, social login, or data brokers.

REGIONAL / REGULATED
Consistent across regions; English UI; participating properties are US-based, so prices show in USD; nothing region-gated. Guestel facilitates direct reservations for physical lodging between a guest and a participating property. It does not sell digital content, resell third-party inventory, provide financial services, or host public user content — guest messages are private one-to-one service communication about an existing reservation.

No new binary is required. Please continue reviewing the currently submitted build.
<<< PASTE END <<<


---- OPTIONAL: short Resolution Center message (send with the recording) ----
Hello App Review,
Thank you for the request. We've added the requested details under App Review Information → Notes (access instructions, the synthetic review property, Stripe test-card details, external services, regional info, and the in-app account deletion path), and attached a physical-device recording demonstrating the full Guestel flow and the App Clip.
No new binary is required — please continue reviewing the currently submitted build. Thank you.
