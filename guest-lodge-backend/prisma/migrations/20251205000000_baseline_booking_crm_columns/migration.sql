-- Baseline: add CRM columns to Booking if missing (fixes drift when DB was updated without a migration)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "crmStage" TEXT DEFAULT 'new';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "callStatus" TEXT DEFAULT 'not-called';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "callLog" TEXT;
