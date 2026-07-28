-- Confirmed bookings remain visible until the owner verifies availability.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerReviewStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerReviewRequestedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerReviewedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerReviewReminderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerReviewNextReminderAt" TIMESTAMP(3);

ALTER TABLE "HotelConfig" ADD COLUMN IF NOT EXISTS "bookingReviewReminderMinutes" INTEGER NOT NULL DEFAULT 15;

CREATE INDEX IF NOT EXISTS "Booking_ownerReviewStatus_ownerReviewNextReminderAt_idx"
ON "Booking"("ownerReviewStatus", "ownerReviewNextReminderAt");
