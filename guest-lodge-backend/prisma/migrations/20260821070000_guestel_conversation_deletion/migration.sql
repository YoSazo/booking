ALTER TABLE "Booking"
    ADD COLUMN "guestMessagesHiddenBefore" TIMESTAMP(3),
    ADD COLUMN "guestAccessRevokedAt" TIMESTAMP(3);

ALTER TABLE "GuestelPropertyDevice"
    ADD COLUMN "guestEmailHash" TEXT;

CREATE INDEX "GuestelPropertyDevice_guestEmailHash_active_idx"
    ON "GuestelPropertyDevice"("guestEmailHash", "active");

CREATE TABLE "GuestelAccountDeletion" (
    "emailHash" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestelAccountDeletion_pkey" PRIMARY KEY ("emailHash")
);
