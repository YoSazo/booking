-- Keep Front Desk unread state and guest unread state independent.
ALTER TABLE "GuestMessage" ADD COLUMN "guestReadAt" TIMESTAMP(3);

-- There was no guest-side read tracking before this migration. Do not surface
-- every historical Front Desk reply as a brand-new badge after deployment.
UPDATE "GuestMessage"
SET "guestReadAt" = COALESCE("readAt", "createdAt")
WHERE "sender" = 'hotel';
