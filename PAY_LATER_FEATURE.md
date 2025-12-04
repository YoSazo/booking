# "Reserve Now, Pay Later" Feature Implementation

## Overview
Added a third booking option for **7+ night stays**: "Reserve Now, Pay Later" - allowing guests to reserve rooms with $0 upfront payment by placing a pre-authorization hold on their card.

---

## 🎯 Feature Description

### What It Does:
- **Guest selects "Reserve Now, Pay Later"** option during plan selection (7+ nights only)
- **$75.90 pre-authorization hold** is placed on their card (NOT charged)
- **Booking is confirmed** in Cloudbeds PMS
- **Full payment due at check-in** at the hotel
- **Hold is released** when guest checks in (disappears from their card)
- **Hold is captured** (charged $75.90) if guest no-shows

---

## 📋 Implementation Details

### Files Modified:

#### 1. **Database Schema** (`prisma/schema.prisma`)
Added new fields to track pre-authorization holds:
- `amountPaidNow` - Amount paid upfront ($0 for pay later)
- `preAuthHoldAmount` - Hold amount ($75.90)
- `holdStatus` - Status: 'active', 'released', 'captured'
- `holdReleasedAt` - Timestamp when hold released
- `holdCapturedAt` - Timestamp when hold captured
- `noShowFeePaid` - Boolean if no-show fee was charged

#### 2. **Backend** (`guest-lodge-backend/server.js`)
Added 4 new API endpoints:

**POST `/api/create-preauth-hold`**
- Creates PaymentIntent with `capture_method: 'manual'`
- Places $75.90 hold on card without charging
- Returns clientSecret for frontend

**POST `/api/complete-pay-later-booking`**
- Verifies PaymentIntent status is `requires_capture`
- Creates booking in Cloudbeds PMS
- Saves booking to database with `holdStatus: 'active'`
- Returns success with reservation code

**POST `/api/release-hold`**
- Cancels PaymentIntent to release hold
- Updates booking: `holdStatus: 'released'`
- Called when guest checks in

**POST `/api/capture-no-show-fee`**
- Captures the held funds ($75.90)
- Updates booking: `holdStatus: 'captured'`, `noShowFeePaid: true`
- Called when guest no-shows

#### 3. **Frontend** (`hotel-booking-app/src/GuestInfoPage.jsx`)

**Plan Selection UI (Step 3):**
- Added new "Reserve Now, Pay Later" option for 7+ night bookings
- Shows: "$0 Today" with warning about $75.90 hold
- Displayed alongside "Try 1 Night First" and "Complete Your Booking"

**Payment Handler:**
- Added `handlePayLaterBooking()` function
- Calls `/api/create-preauth-hold` to create hold
- Uses Stripe.js to confirm card (authorize, not charge)
- Checks for `paymentIntent.status === 'requires_capture'`
- Calls `/api/complete-pay-later-booking` to finalize
- Supports both card and digital wallet payments

**Payment Step UI (Step 4):**
- Added informational banner explaining the hold
- Shows clear messaging: "Card Verification - No Charge Today"
- Explains what happens if they show up vs. no-show
- Updated button text: "Confirm Reservation - $0 Today"

---

## 🔄 User Flow

```
1. Guest selects 7+ nights → Sees 3 plan options
2. Guest chooses "Reserve Now, Pay Later"
3. Guest enters payment info
4. Stripe authorizes $75.90 hold (status: requires_capture)
5. Backend creates booking in Cloudbeds
6. Guest sees confirmation: "$0 paid, $75.90 hold on card"
7a. Guest checks in → Release hold (no charge)
7b. Guest no-shows → Capture hold (charge $75.90)
```

---

## 🏨 Hotel Operations

### When Guest Checks In:
```bash
# Call this endpoint when guest arrives
POST /api/release-hold
Body: { "bookingId": "clx123abc" }

# Hold is cancelled, disappears from guest's card in 5-7 days
```

### When Guest No-Shows:
```bash
# Call this endpoint after check-in date passes
POST /api/capture-no-show-fee
Body: { "bookingId": "clx123abc" }

# $75.90 is charged to guest's card
```

---

## 🔐 Security & Validation

- ✅ Card validation ensures funds are available
- ✅ Pre-authorization hold guarantees payment
- ✅ No risk of declined cards at no-show time
- ✅ Stripe handles PCI compliance
- ✅ Hold automatically expires after 7 days if not captured

---

## 💳 Stripe PaymentIntent States

| State | Meaning | Action |
|-------|---------|--------|
| `requires_payment_method` | Waiting for card | User entering details |
| `requires_confirmation` | Card entered | Confirming authorization |
| `requires_capture` | ✅ **Hold active** | Booking confirmed |
| `succeeded` | Charged | No-show fee captured |
| `canceled` | Hold released | Guest checked in |

---

## 🧪 Testing Instructions

### 1. Test Successful Booking:
- Select 7+ nights
- Choose "Reserve Now, Pay Later"
- Use test card: `4242 4242 4242 4242`
- Expiry: Any future date, CVC: Any 3 digits
- Should see: Booking confirmed, $0 charged

### 2. Test Hold Release (Check-in):
```javascript
// In backend, get booking ID from database
const bookingId = "your-booking-id";

// Call release endpoint
fetch('http://localhost:3001/api/release-hold', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bookingId })
});

// Check Stripe Dashboard: PaymentIntent should be canceled
```

### 3. Test No-Show Capture:
```javascript
// Call capture endpoint
fetch('http://localhost:3001/api/capture-no-show-fee', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bookingId })
});

// Check Stripe Dashboard: $75.90 should be charged
```

---

## 📊 Database Migration

After updating schema, run:
```bash
cd guest-lodge-backend
npx prisma migrate dev --name add_pay_later_fields
npx prisma generate
```

---

## 🚀 Deployment Checklist

- [ ] Run database migration on production
- [ ] Deploy backend with new endpoints
- [ ] Deploy frontend with new UI
- [ ] Test with Stripe test mode
- [ ] Switch to live Stripe keys
- [ ] Set up automated no-show checking (optional cron job)
- [ ] Train staff on releasing holds at check-in

---

## 🔮 Future Enhancements

1. **Automated No-Show Detection**
   - Daily cron job checks bookings past check-in date
   - Automatically captures holds for no-shows
   - Sends email notifications

2. **Partial Hold Amounts**
   - Adjust hold based on booking value
   - Longer stays = higher hold amount

3. **Admin Dashboard**
   - View all active holds
   - Manually release/capture holds
   - Track no-show rates

4. **Guest Communication**
   - Email reminders about hold
   - SMS notifications when hold released
   - Receipt for no-show charges

---

## 📞 Support

For issues or questions:
- Check Stripe Dashboard for PaymentIntent status
- Review database `Booking` table for `holdStatus`
- Check browser console for frontend errors
- Review server logs for API errors

---

## ✅ Implementation Complete!

All features have been implemented and are ready for testing.
