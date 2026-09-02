-- New self-serve properties should begin with no assumed lodging tax. The
-- owner can explicitly set the rate required by their jurisdiction in Front
-- Desk; silently quoting 10% is not a safe default.
ALTER TABLE "HotelRates"
  ALTER COLUMN "weekly" SET DEFAULT 483,
  ALTER COLUMN "monthly" SET DEFAULT 1932,
  ALTER COLUMN "taxRate" SET DEFAULT 0;

-- Repair only unpaid self-serve previews whose values exactly match the old
-- generated defaults. Configured/live properties and custom rates are left
-- untouched.
UPDATE "HotelRates" AS rates
SET "weekly" = ROUND(rates."nightly" * 7)
FROM "HotelConfig" AS hotel
WHERE hotel."id" = rates."hotelId"
  AND hotel."subscribed" = false
  AND ABS(rates."weekly" - ROUND(rates."nightly" * 6)) < 0.01;

UPDATE "HotelRates" AS rates
SET "monthly" = ROUND(rates."nightly" * 28)
FROM "HotelConfig" AS hotel
WHERE hotel."id" = rates."hotelId"
  AND hotel."subscribed" = false
  AND ABS(rates."monthly" - ROUND(rates."nightly" * 24)) < 0.01;

UPDATE "HotelRates" AS rates
SET "taxRate" = 0
FROM "HotelConfig" AS hotel
WHERE hotel."id" = rates."hotelId"
  AND hotel."subscribed" = false
  AND ABS(rates."taxRate" - 0.10) < 0.000001;
