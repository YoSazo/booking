# Self-Serve Hotel Onboarding — Design

## Overview

After paying $997 on the landing page, a new hotel owner gets a setup link. They open it, configure their hotel (name, address, rooms, photos, rates), connect Stripe, and their booking site goes live automatically. Zero manual intervention.

## Flow

```
Pay $997 → Stripe sends webhook → Server creates hotel record + setup token
→ Customer gets email/redirect with setup URL
→ Setup wizard: Hotel Info → Rooms & Photos → Rates → Stripe Connect → Go Live
→ Booking site is live at {slug}.clickinns.com
```

## Database Changes (Prisma)

### New fields on HotelConfig:

```prisma
model HotelConfig {
  // ... existing fields ...
  
  // Onboarding
  setupToken      String?   @unique  // one-time setup link token
  setupComplete   Boolean   @default(false)
  stripeAccountId String?   // Stripe Connect account ID
  ownerEmail      String?
  ownerPhone      String?
  
  // Hotel details (editable by owner)
  phone           String?
  address         String?
  subtitle        String?
  checkInTime     String?   @default("15:00")
  checkOutTime    String?   @default("11:00")
}
```

### New model for rooms (replaces static hotelData.js per hotel):

```prisma
model Room {
  id            String   @id @default(cuid())
  hotel         HotelConfig @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  hotelId       String
  name          String
  description   String?
  amenities     String?
  maxOccupancy  Int      @default(4)
  totalUnits    Int      @default(1)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  images        RoomImage[]
  
  @@unique([hotelId, name])
  @@index([hotelId, sortOrder])
}

model RoomImage {
  id        String   @id @default(cuid())
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  roomId    String
  url       String   // S3/Cloudflare R2 URL
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  
  @@index([roomId, sortOrder])
}

model HotelRates {
  id        String      @id @default(cuid())
  hotel     HotelConfig @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  hotelId   String      @unique
  nightly   Float       @default(69)
  weekly    Float       @default(299)
  monthly   Float       @default(999)
  taxRate   Float       @default(0.10)  // 10% default
  updatedAt DateTime    @updatedAt
}
```

## API Endpoints

### Webhook (Stripe payment link)
```
POST /api/webhooks/stripe-payment-link
- Creates HotelConfig with setupToken
- Sends setup link to customer email (from Stripe checkout)
```

### Setup Wizard (token-authenticated)
```
GET  /api/setup/:token          → Get current setup state
POST /api/setup/:token/hotel    → Save hotel name, address, phone, subtitle
POST /api/setup/:token/rooms    → Create/update rooms
POST /api/setup/:token/images   → Upload room images (multipart)
POST /api/setup/:token/rates    → Save nightly/weekly/monthly rates
POST /api/setup/:token/stripe   → Start Stripe Connect onboarding
GET  /api/setup/:token/stripe/return → Stripe Connect callback
POST /api/setup/:token/complete → Mark setup done, provision domain
```

### Image Storage
- Use Cloudflare R2 (S3-compatible, free egress)
- Or fallback: store in /public/uploads/{hotelId}/ on the server (simpler for MVP)
- Accept JPEG/PNG/WebP, max 5MB per image
- Auto-resize to max 1200px width

## Frontend: Setup Wizard Page

New route: `GET /setup/:token` → serves `setup.html`

Multi-step form:
1. **Hotel Info** — name, address, phone, subtitle, check-in/out times
2. **Rooms** — add rooms (name, description, amenities, max occupancy, unit count), upload photos per room
3. **Rates** — nightly, weekly, monthly pricing + tax rate
4. **Stripe** — connect their Stripe account via Stripe Connect Express
5. **Go Live** — preview their booking site, confirm, get their URLs

## Booking Site Changes

The frontend (`hotel-booking-app`) currently reads from `hotelData.js` (static). For self-serve hotels:
- The `/api/availability` endpoint already handles `manual` PMS
- Add a new endpoint: `GET /api/hotel-config/:hotelId/public` that returns hotel info + rooms + rates + image URLs
- The frontend fetches this on load instead of reading from the static file
- Falls back to `hotelData.js` for existing hotels (backwards compatible)

## Domain Provisioning

For MVP:
- Each hotel gets `{slug}.clickinns.com`
- Slug is auto-generated from hotel name (e.g., "Sunset Inn" → `sunset-inn.clickinns.com`)
- Add a wildcard DNS record `*.clickinns.com` → your Vercel/Render deployment
- The frontend reads the subdomain to determine hotelId
- Custom domains can be added later via the admin panel

## Stripe Connect

- Use Stripe Connect Express (simplest for platforms)
- Hotel owner connects their Stripe account during setup
- Bookings create PaymentIntents on the platform account with `transfer_data` to the connected account
- Platform can take a % cut later if desired

## What Gets Built (Priority Order)

1. **Database migration** — new models + fields
2. **Setup wizard HTML page** — multi-step form
3. **Setup API endpoints** — CRUD for hotel config, rooms, images, rates
4. **Image upload** — local storage for MVP, R2 later
5. **Stripe Connect integration** — onboarding flow
6. **Public hotel config API** — so frontend can load dynamic hotels
7. **Frontend dynamic loading** — fetch hotel data from API instead of static file
8. **Domain routing** — subdomain-based hotel resolution
9. **Stripe webhook for payment link** — auto-create hotel on purchase

## MVP Scope (Build First)

For the fastest path to "customer pays, sets up, goes live":
- Steps 1-4 (database, wizard UI, APIs, image upload)
- Skip Stripe Connect initially (you manually add their Stripe key, or use your platform account)
- Skip custom domains (just use subdomains)
- Image upload stores locally in /public/uploads/

This gets the core self-serve flow working. Stripe Connect and custom domains are phase 2.
