# Reply to Guideline 2.1 — Information Needed

Paste items 2–7 into **App Store Connect → App Review Information → Notes**, and
attach the screen recording described in item 1. Do not put credentials in this
file — they live in the App Review sign-in fields.

---

## 1. Screen recording — shot list

Record on a **physical iPhone running the latest iOS**, one continuous take,
starting from tapping the app icon. Cover, in this order:

1. **Launch** — app icon → splash → sign-in screen.
2. **Login** — choose *Use property ID and PIN instead*, enter the demo Property
   ID and PIN supplied in App Review sign-in information. Show the app opening
   to the demonstration property.
3. **Bookings** — open a reservation, show guest and stay details, and show the
   keep/release decision controls on a pending request.
4. **Availability** — change one demonstration room-night and show it save.
5. **Your Page** — edit a property field and save. Then scroll to show
   **Privacy, Terms, Support and Delete Account**.
6. **Account deletion flow** — tap Delete Account and show the confirmation and
   grace-period screen. Cancel it rather than completing, and say so aloud or in
   a caption.
7. **Guest Reach** — show the booking-page QR/link surface used to reach guests.
8. **Permission prompts** — trigger and show each system prompt:
   - Notifications (accept, so registration can be demonstrated)
   - Photo library / camera, by choosing to add a room photo
   - Contacts, only if you demonstrate saving the support contact
9. **No purchases** — state in a caption that the app contains no purchase,
   subscription or upgrade flow, and that nothing in it links to checkout.

There is no account **registration** flow in the app: accounts are created for
existing Marketel business customers outside the app, so there is nothing to
record for that step.

---

## 2. Devices and operating systems tested

> Replace with the exact devices you used.

- iPhone \<model\>, iOS \<version\> — physical device, via TestFlight
- iOS Simulator, iPhone \<model\>, iOS \<version\> — development testing

---

## 3. App functions, target audience, and value

Marketel is a companion app for existing Marketel business customers who operate
real-world lodging properties — independent motels, inns and small hotels,
typically owner-operated with a handful of rooms.

The problem it solves: a small property that takes reservations directly has no
practical way to know, in the moment, whether a room a guest just requested
online is still physically available — the owner may have taken a walk-in or a
phone booking minutes earlier. Larger operators solve this with property
management system integrations that small properties cannot afford or install.

Marketel solves it by asking the owner. When a direct reservation request
arrives, the app alerts the owner and asks whether the room is still free. The
owner keeps or releases the request from the app, and Marketel updates the
property's availability, notifies the guest, and releases the temporary card
authorization if the request is declined.

The app manages availability and reservations for physical overnight stays. It
does not sell media or consumer digital content.

---

## 4. Setup and access instructions

No setup is required by the reviewer. The Property ID and PIN provided in the
App Review sign-in information open a dedicated demonstration property that is
permanently entitled for the review period and contains only synthetic rooms,
guests, reservations and availability.

1. On the sign-in screen choose **Use property ID and PIN instead**.
2. Enter the supplied Property ID and six-digit PIN.

No email inbox access, one-time code, or sample file is required. The four tabs
are **Your Page**, **Bookings**, **Availability** and **Guest Reach**.

**Account deletion.** Delete Account is under Your Page, beside Privacy, Terms
and Support. Deleting a business account normally requires the owner to be
signed in with the owner email, because a shared front-desk PIN is used by
staff and must not be able to delete the property. The demonstration property
is exempt from that safeguard so the reviewer can run the whole flow directly
from the supplied Property ID and PIN. Deletion schedules a seven-day recovery
window and can be cancelled from the same screen with **Keep my Marketel
account**.

The app contains no purchase, subscription, upgrade or checkout flow of any
kind. Only a property with an existing active Marketel account can sign in;
billing is handled entirely outside the app by the business customer.

---

## 5. External services used

**AI service**
- **OpenAI** — powers the Front Desk Assistant, which interprets an owner's
  plain-language SMS reply (for example, "a walk-in took the queen suite") and
  turns it into an availability change. Only reservation and room context is
  sent; no payment data.

**Messaging and delivery**
- **Twilio** — SMS alerts and Assistant replies to the property's own staff.
- **Brevo (SMTP)** — transactional email to owners and guests.
- **Apple Push Notification service** — native alerts to this app.

**Infrastructure**
- **Render** — application backend hosting.
- **Vercel** — hosting for each property's public booking page.
- **Cloudflare R2** — storage for property and room photographs.

**Payments (outside this app)**
- **Stripe** — processes a temporary card authorization for the property's own
  guests on the property's public booking page, and the property's own Marketel
  subscription. Neither flow exists inside this app; the app contains no
  purchase path and never reaches Stripe.

---

## 6. Regional differences

The app functions consistently in all regions. There are no region-gated
features, no regional content variations, and no geographic restrictions on
functionality. The interface is English and current customers operate United
States properties, so amounts are shown in US dollars, but nothing in the app
behaves differently by region.

---

## 7. Regulated industry and third-party material

Not applicable, and to be explicit about why:

Marketel is business software licensed to lodging operators to manage **their
own** rooms. It is not a travel agency or online travel marketplace: it does not
resell, aggregate, or display inventory belonging to third parties, and no
property can see or manage another property's rooms or reservations. Each signed-in
account is scoped to a single property that the account holder operates.

The app contains no protected third-party material. All property names,
photographs and descriptions are supplied by the operator of that property. All
imagery in the demonstration property is synthetic and owned by Marketel.
