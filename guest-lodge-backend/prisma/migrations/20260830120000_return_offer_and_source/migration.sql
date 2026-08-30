-- Returning-guest offer + configurable OTA commission rate on the property.
ALTER TABLE "HotelConfig" ADD COLUMN "returnOfferEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelConfig" ADD COLUMN "returnOfferKind" TEXT DEFAULT 'percent';
ALTER TABLE "HotelConfig" ADD COLUMN "returnOfferValue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "HotelConfig" ADD COLUMN "returnOfferLabel" TEXT;
ALTER TABLE "HotelConfig" ADD COLUMN "otaCommissionRate" DOUBLE PRECISION DEFAULT 0.15;

-- Attribution for the Guestel rebooking loop + offer redemption on bookings.
ALTER TABLE "Booking" ADD COLUMN "source" TEXT;
ALTER TABLE "Booking" ADD COLUMN "returnOfferApplied" BOOLEAN NOT NULL DEFAULT false;
