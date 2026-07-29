ALTER TABLE "HotelConfig"
ADD COLUMN "marketelStripeCustomerId" TEXT,
ADD COLUMN "marketelStripeSubscriptionId" TEXT,
ADD COLUMN "marketelSubscriptionStatus" TEXT,
ADD COLUMN "marketelCurrentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "HotelConfig_marketelStripeCustomerId_key"
ON "HotelConfig"("marketelStripeCustomerId");

CREATE UNIQUE INDEX "HotelConfig_marketelStripeSubscriptionId_key"
ON "HotelConfig"("marketelStripeSubscriptionId");
