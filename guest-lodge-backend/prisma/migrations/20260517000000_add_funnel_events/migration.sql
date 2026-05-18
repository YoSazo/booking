-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "contentName" TEXT,
    "checkinDate" TEXT,
    "checkoutDate" TEXT,
    "nights" INTEGER,
    "guestFirstName" TEXT,
    "guestLastName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "externalId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunnelEvent_hotelId_createdAt_idx" ON "FunnelEvent"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_eventName_createdAt_idx" ON "FunnelEvent"("eventName", "createdAt");
