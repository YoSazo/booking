-- Owner approval window on bookings. All additive/nullable so this is safe to
-- apply to a live database; IF NOT EXISTS keeps it idempotent.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvalRequestedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pendingUntil" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvalOutcome" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvalDecidedAt" TIMESTAMP(3);

-- Drives the auto-confirm sweep, which scans for pending rows past their window.
CREATE INDEX IF NOT EXISTS "Booking_status_pendingUntil_idx" ON "Booking"("status", "pendingUntil");

-- Per-hotel approval settings. Off by default: without push the hold is pointless.
ALTER TABLE "HotelConfig" ADD COLUMN IF NOT EXISTS "bookingApprovalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelConfig" ADD COLUMN IF NOT EXISTS "bookingApprovalWindowMinutes" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "HotelConfig" ADD COLUMN IF NOT EXISTS "frontdeskInstalledAt" TIMESTAMP(3);
