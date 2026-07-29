-- CreateTable
CREATE TABLE "FrontDeskAssistantConfig" (
    "hotelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "checkFrequency" TEXT NOT NULL DEFAULT 'smart',
    "dailyCheckTime" TEXT NOT NULL DEFAULT '18:00',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "notifyNewBookings" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontDeskAssistantConfig_pkey" PRIMARY KEY ("hotelId")
);

-- CreateTable
CREATE TABLE "FrontDeskAssistantRecipient" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phoneE164" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "verificationCodeHash" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontDeskAssistantRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrontDeskAssistantActivity" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "recipientId" TEXT,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "providerMessageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrontDeskAssistantActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrontDeskAssistantPendingAction" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "recipientId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontDeskAssistantPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrontDeskAssistantRecipient_hotelId_phoneE164_key"
ON "FrontDeskAssistantRecipient"("hotelId", "phoneE164");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantRecipient_hotelId_active_priority_idx"
ON "FrontDeskAssistantRecipient"("hotelId", "active", "priority");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantRecipient_phoneE164_active_idx"
ON "FrontDeskAssistantRecipient"("phoneE164", "active");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantActivity_hotelId_createdAt_idx"
ON "FrontDeskAssistantActivity"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantActivity_providerMessageId_idx"
ON "FrontDeskAssistantActivity"("providerMessageId");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantPendingAction_hotelId_status_expiresAt_idx"
ON "FrontDeskAssistantPendingAction"("hotelId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "FrontDeskAssistantPendingAction_recipientId_status_createdAt_idx"
ON "FrontDeskAssistantPendingAction"("recipientId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantConfig"
ADD CONSTRAINT "FrontDeskAssistantConfig_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantRecipient"
ADD CONSTRAINT "FrontDeskAssistantRecipient_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantActivity"
ADD CONSTRAINT "FrontDeskAssistantActivity_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantActivity"
ADD CONSTRAINT "FrontDeskAssistantActivity_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "FrontDeskAssistantRecipient"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantPendingAction"
ADD CONSTRAINT "FrontDeskAssistantPendingAction_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskAssistantPendingAction"
ADD CONSTRAINT "FrontDeskAssistantPendingAction_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "FrontDeskAssistantRecipient"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
