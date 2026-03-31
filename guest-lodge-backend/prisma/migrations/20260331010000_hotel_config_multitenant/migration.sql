-- CreateTable
CREATE TABLE "HotelConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "pms" TEXT NOT NULL,
    "propertyId" TEXT,
    "siteId" TEXT,
    "sitePassword" TEXT,
    "chainCode" TEXT,
    "roomIDMapping" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDomain" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPin" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelDomain_domain_key" ON "HotelDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPin_hotelId_pinHash_key" ON "CrmPin"("hotelId", "pinHash");

-- CreateIndex
CREATE INDEX "CrmPin_pinHash_active_idx" ON "CrmPin"("pinHash", "active");

-- AddForeignKey
ALTER TABLE "HotelDomain" ADD CONSTRAINT "HotelDomain_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPin" ADD CONSTRAINT "CrmPin_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;