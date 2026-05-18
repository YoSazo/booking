-- AlterTable: Add onboarding and hotel detail fields to HotelConfig
ALTER TABLE "HotelConfig" ADD COLUMN "setupToken" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "setupComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelConfig" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "ownerPhone" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "phone" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "address" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "checkInTime" TEXT DEFAULT '15:00';
ALTER TABLE "HotelConfig" ADD COLUMN "checkOutTime" TEXT DEFAULT '11:00';

-- CreateIndex
CREATE UNIQUE INDEX "HotelConfig_setupToken_key" ON "HotelConfig"("setupToken");

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amenities" TEXT,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 4,
    "totalUnits" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomImage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelRates" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "nightly" DOUBLE PRECISION NOT NULL DEFAULT 69,
    "weekly" DOUBLE PRECISION NOT NULL DEFAULT 299,
    "monthly" DOUBLE PRECISION NOT NULL DEFAULT 999,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_hotelId_name_key" ON "Room"("hotelId", "name");
CREATE INDEX "Room_hotelId_sortOrder_idx" ON "Room"("hotelId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomImage_roomId_sortOrder_idx" ON "RoomImage"("roomId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HotelRates_hotelId_key" ON "HotelRates"("hotelId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomImage" ADD CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelRates" ADD CONSTRAINT "HotelRates_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
