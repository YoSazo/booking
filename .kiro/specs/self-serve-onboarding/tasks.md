# Tasks — Self-Serve Hotel Onboarding

## Task 1: Database Migration
- [ ] Add new fields to HotelConfig (setupToken, setupComplete, stripeAccountId, ownerEmail, ownerPhone, phone, address, subtitle, checkInTime, checkOutTime)
- [ ] Create Room model with relation to HotelConfig
- [ ] Create RoomImage model with relation to Room
- [ ] Create HotelRates model with relation to HotelConfig
- [ ] Add Room and HotelRates relations to HotelConfig
- [ ] Run migration and generate Prisma client

## Task 2: Setup API Endpoints
- [ ] GET /api/setup/:token — return hotel setup state (hotel info, rooms, rates, completion status)
- [ ] POST /api/setup/:token/hotel — save hotel name, address, phone, subtitle, check-in/out times
- [ ] POST /api/setup/:token/rooms — create/update/delete rooms (name, description, amenities, maxOccupancy, totalUnits)
- [ ] POST /api/setup/:token/rates — save nightly, weekly, monthly rates + tax rate
- [ ] POST /api/setup/:token/complete — mark setup as done, create HotelDomain record for subdomain

## Task 3: Image Upload
- [ ] POST /api/setup/:token/rooms/:roomId/images — accept multipart image upload
- [ ] Store images in /public/uploads/{hotelId}/ directory
- [ ] Validate file type (JPEG, PNG, WebP) and size (max 5MB)
- [ ] Return image URL after upload
- [ ] DELETE /api/setup/:token/rooms/:roomId/images/:imageId — remove an image

## Task 4: Setup Wizard UI (setup.html)
- [ ] Create setup.html served at GET /setup/:token
- [ ] Step 1: Hotel Info form (name, address, phone, subtitle, check-in/out)
- [ ] Step 2: Rooms manager (add/edit/remove rooms, upload photos per room)
- [ ] Step 3: Rates form (nightly, weekly, monthly, tax rate)
- [ ] Step 4: Review & Go Live (preview summary, confirm button)
- [ ] Progress indicator showing current step
- [ ] Auto-save on each step completion

## Task 5: Public Hotel Config API
- [ ] GET /api/hotel/:hotelId/public — return hotel info, rooms with images, rates (no auth)
- [ ] Include room images sorted by sortOrder
- [ ] Include rates
- [ ] Cache response for 30 seconds

## Task 6: Frontend Dynamic Hotel Loading
- [ ] Update App.jsx to fetch hotel config from /api/hotel/:hotelId/public on load
- [ ] Fall back to hotelData.js if API returns 404 (backwards compatible)
- [ ] Map API response to the same shape as static hotelData entries
- [ ] Handle loading state while fetching

## Task 7: Subdomain Routing
- [ ] On setup complete, create HotelDomain record: {slug}.clickinns.com → hotelId
- [ ] Frontend getHotelId() already checks domain — ensure it resolves dynamic hotels
- [ ] Add wildcard CNAME instruction to docs (*.clickinns.com → Vercel)

## Task 8: Stripe Webhook for Auto-Provisioning
- [ ] Listen for checkout.session.completed on the $997 payment link
- [ ] Extract customer email from the session
- [ ] Create HotelConfig with pms='manual', active=false, setupToken=random
- [ ] Create CrmPin for the new hotel (default PIN)
- [ ] Send setup link to customer email (or redirect after payment)

## Task 9 (Phase 2): Stripe Connect
- [ ] POST /api/setup/:token/stripe — create Stripe Connect Express account, return onboarding URL
- [ ] GET /api/setup/:token/stripe/return — handle Stripe Connect callback, save account ID
- [ ] Update payment flow to use transfer_data when connected account exists
