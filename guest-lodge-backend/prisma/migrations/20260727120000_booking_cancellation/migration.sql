-- Lets an owner turn away a booking that has already confirmed, which is the
-- walk-in double-booking case: the room was given away at the desk hours after
-- the online booking locked in. Additive and idempotent, safe on a live database.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- Backs the oversell conflict scan, which walks a hotel's live bookings by date.
CREATE INDEX IF NOT EXISTS "Booking_hotelId_status_checkinDate_idx" ON "Booking"("hotelId", "status", "checkinDate");
