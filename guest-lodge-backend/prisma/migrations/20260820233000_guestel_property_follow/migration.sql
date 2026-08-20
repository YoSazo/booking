CREATE TABLE "GuestelPropertyDevice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceToken" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "hotelId" TEXT NOT NULL,
    "updates" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GuestelPropertyDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestelPropertyDevice_deviceToken_hotelId_key"
    ON "GuestelPropertyDevice"("deviceToken", "hotelId");

CREATE INDEX "GuestelPropertyDevice_hotelId_active_updates_idx"
    ON "GuestelPropertyDevice"("hotelId", "active", "updates");

CREATE INDEX "GuestelPropertyDevice_deviceToken_active_idx"
    ON "GuestelPropertyDevice"("deviceToken", "active");
