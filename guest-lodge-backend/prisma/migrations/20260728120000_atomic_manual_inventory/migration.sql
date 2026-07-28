-- Tracks exactly which explicit manual-availability counters a booking
-- consumed, allowing an owner cancellation to restore those nights safely.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "inventoryOverrideDates" TEXT;
