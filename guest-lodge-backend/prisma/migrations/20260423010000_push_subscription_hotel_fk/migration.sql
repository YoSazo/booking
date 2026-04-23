-- Remove legacy subscriptions that cannot be safely scoped to a hotel.
DELETE FROM "PushSubscription"
WHERE "hotelId" IS NULL;

DELETE FROM "PushSubscription" ps
WHERE NOT EXISTS (
    SELECT 1
    FROM "HotelConfig" hc
    WHERE hc."id" = ps."hotelId"
);

-- Harden hotel scoping at the database layer.
ALTER TABLE "PushSubscription"
ALTER COLUMN "hotelId" SET NOT NULL;

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "HotelConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
