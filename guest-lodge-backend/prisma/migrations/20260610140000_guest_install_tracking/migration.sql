-- Reliable install signal (set by guest install page, not push subscription)
ALTER TABLE "Booking" ADD COLUMN "guestAppInstalledAt" TIMESTAMP(3);

-- Funnel: views, CTA clicks, installs by touchpoint
CREATE TABLE "GuestInstallEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "reservationCode" TEXT,
    "touchpoint" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "GuestInstallEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuestInstallEvent_hotelId_createdAt_idx" ON "GuestInstallEvent"("hotelId", "createdAt");
CREATE INDEX "GuestInstallEvent_hotelId_eventType_createdAt_idx" ON "GuestInstallEvent"("hotelId", "eventType", "createdAt");
CREATE INDEX "GuestInstallEvent_reservationCode_idx" ON "GuestInstallEvent"("reservationCode");
