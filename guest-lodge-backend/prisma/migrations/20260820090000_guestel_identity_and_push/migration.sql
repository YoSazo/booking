CREATE TABLE "GuestLoginChallenge" (
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestLoginChallenge_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "GuestLoginChallenge_expiresAt_idx" ON "GuestLoginChallenge"("expiresAt");

CREATE TABLE "GuestNativePushDevice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceToken" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "hotelId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "stayUpdates" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "deals" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "GuestNativePushDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestNativePushDevice_deviceToken_bookingId_key" ON "GuestNativePushDevice"("deviceToken", "bookingId");
CREATE INDEX "GuestNativePushDevice_bookingId_active_idx" ON "GuestNativePushDevice"("bookingId", "active");
CREATE INDEX "GuestNativePushDevice_hotelId_reservationCode_active_idx" ON "GuestNativePushDevice"("hotelId", "reservationCode", "active");
CREATE INDEX "GuestNativePushDevice_deviceToken_active_idx" ON "GuestNativePushDevice"("deviceToken", "active");
