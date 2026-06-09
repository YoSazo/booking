-- CreateTable
CREATE TABLE "GuestMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "bookingId" TEXT,
    "reservationCode" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "roomName" TEXT,
    "body" TEXT,
    "requests" TEXT,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "GuestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestMessage_hotelId_createdAt_idx" ON "GuestMessage"("hotelId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuestMessage" ADD CONSTRAINT "GuestMessage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
