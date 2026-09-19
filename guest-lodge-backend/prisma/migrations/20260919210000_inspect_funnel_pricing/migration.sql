-- Single-report purchases, the business a report is sent under, and a
-- per-tool funnel ladder that can be read before anyone signs in.
ALTER TABLE "InspectAccount"
ADD COLUMN "reportCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "businessName" TEXT,
ADD COLUMN "logoKey" TEXT;

ALTER TABLE "InspectEvent"
ADD COLUMN "tool" TEXT,
ADD COLUMN "visitorId" TEXT,
ADD COLUMN "detail" TEXT;

CREATE INDEX "InspectEvent_tool_name_createdAt_idx" ON "InspectEvent"("tool", "name", "createdAt");
