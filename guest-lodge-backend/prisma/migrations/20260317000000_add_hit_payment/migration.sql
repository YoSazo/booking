-- CreateTable
CREATE TABLE "HitPayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "guestFirstName" TEXT NOT NULL,
    "guestLastName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "checkinDate" TEXT NOT NULL,
    "checkoutDate" TEXT NOT NULL,
    "nights" INTEGER NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT,
    CONSTRAINT "HitPayment_pkey" PRIMARY KEY ("id")
);

