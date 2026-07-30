-- Native APNs devices
CREATE TABLE "NativePushDevice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NativePushDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NativePushDevice_deviceToken_hotelId_key"
ON "NativePushDevice"("deviceToken", "hotelId");

CREATE INDEX "NativePushDevice_hotelId_active_idx"
ON "NativePushDevice"("hotelId", "active");

CREATE INDEX "NativePushDevice_deviceToken_active_idx"
ON "NativePushDevice"("deviceToken", "active");

ALTER TABLE "NativePushDevice"
ADD CONSTRAINT "NativePushDevice_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Durable native email-code challenges
CREATE TABLE "NativeLoginChallenge" (
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NativeLoginChallenge_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "NativeLoginChallenge_expiresAt_idx"
ON "NativeLoginChallenge"("expiresAt");

-- In-app account deletion requests
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionRequest_hotelId_key"
ON "AccountDeletionRequest"("hotelId");

CREATE INDEX "AccountDeletionRequest_status_scheduledFor_idx"
ON "AccountDeletionRequest"("status", "scheduledFor");

ALTER TABLE "AccountDeletionRequest"
ADD CONSTRAINT "AccountDeletionRequest_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
