CREATE TABLE "GuestAppHandoff" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "tokenHash" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    CONSTRAINT "GuestAppHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestAppHandoff_tokenHash_key" ON "GuestAppHandoff"("tokenHash");
CREATE INDEX "GuestAppHandoff_expiresAt_idx" ON "GuestAppHandoff"("expiresAt");
CREATE INDEX "GuestAppHandoff_bookingId_idx" ON "GuestAppHandoff"("bookingId");
