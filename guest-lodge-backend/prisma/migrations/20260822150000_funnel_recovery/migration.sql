ALTER TABLE "HotelConfig"
ADD COLUMN "setupProgressStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "revealProgressStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "setupResumeEmailSentAt" TIMESTAMP(3),
ADD COLUMN "previewReadyEmailSentAt" TIMESTAMP(3),
ADD COLUMN "checkoutStartedAt" TIMESTAMP(3),
ADD COLUMN "checkoutRecoveryEmailSentAt" TIMESTAMP(3);

-- Existing completed previews have already reached the ready step even though
-- older builds had no durable progress column.
UPDATE "HotelConfig"
SET "setupProgressStep" = 4
WHERE "setupComplete" = TRUE;
