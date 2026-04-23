-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "hotelId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PushSubscription_hotelId_idx" ON "PushSubscription"("hotelId");
