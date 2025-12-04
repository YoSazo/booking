-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ourReservationCode" TEXT NOT NULL,
    "pmsConfirmationCode" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "hotelId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "checkinDate" TIMESTAMP(3) NOT NULL,
    "checkoutDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "guestFirstName" TEXT NOT NULL,
    "guestLastName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxesAndFees" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "BookingType" TEXT NOT NULL DEFAULT 'standard',
    "amountPaidNow" DOUBLE PRECISION DEFAULT 0,
    "preAuthHoldAmount" DOUBLE PRECISION,
    "holdStatus" TEXT,
    "holdReleasedAt" TIMESTAMP(3),
    "holdCapturedAt" TIMESTAMP(3),
    "noShowFeePaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_ourReservationCode_key" ON "Booking"("ourReservationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");
