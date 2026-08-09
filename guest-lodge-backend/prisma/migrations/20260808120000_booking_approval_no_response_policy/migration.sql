ALTER TABLE "HotelConfig"
ADD COLUMN IF NOT EXISTS "bookingApprovalNoResponseAction" TEXT NOT NULL DEFAULT 'confirm';

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "approvalNoResponseAction" TEXT;
