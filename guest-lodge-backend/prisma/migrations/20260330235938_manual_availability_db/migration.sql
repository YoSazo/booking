-- CreateTable
CREATE TABLE "ManualRoom" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualOverride" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "availableUnits" INTEGER,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualRoom_hotelId_name_key" ON "ManualRoom"("hotelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ManualOverride_roomId_date_key" ON "ManualOverride"("roomId", "date");

-- AddForeignKey
ALTER TABLE "ManualOverride" ADD CONSTRAINT "ManualOverride_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ManualRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
