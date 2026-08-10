ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "fulfillmentLastError" TEXT,
ADD COLUMN IF NOT EXISTS "fulfillmentUpdatedAt" TIMESTAMP(3);

ALTER TABLE "HotelConfig"
ADD COLUMN IF NOT EXISTS "bookingApprovalPolicyChosenAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BookingSideEffectJob" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSideEffectJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingSideEffectJob_bookingId_type_key"
ON "BookingSideEffectJob"("bookingId", "type");

CREATE INDEX IF NOT EXISTS "BookingSideEffectJob_status_nextAttemptAt_idx"
ON "BookingSideEffectJob"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "BookingSideEffectJob_bookingId_status_idx"
ON "BookingSideEffectJob"("bookingId", "status");

CREATE INDEX IF NOT EXISTS "BookingSideEffectJob_hotelId_status_updatedAt_idx"
ON "BookingSideEffectJob"("hotelId", "status", "updatedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'BookingSideEffectJob_bookingId_fkey'
    ) THEN
        ALTER TABLE "BookingSideEffectJob"
        ADD CONSTRAINT "BookingSideEffectJob_bookingId_fkey"
        FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
