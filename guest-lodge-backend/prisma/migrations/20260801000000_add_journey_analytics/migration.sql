ALTER TABLE "FunnelEvent"
ADD COLUMN "occurredAt" TIMESTAMP(3),
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "sequence" INTEGER,
ADD COLUMN "surface" TEXT,
ADD COLUMN "pagePath" TEXT,
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "metadata" JSONB;

CREATE INDEX "FunnelEvent_externalId_createdAt_idx" ON "FunnelEvent"("externalId", "createdAt");
CREATE INDEX "FunnelEvent_sessionId_sequence_idx" ON "FunnelEvent"("sessionId", "sequence");
CREATE INDEX "FunnelEvent_hotelId_sessionId_createdAt_idx" ON "FunnelEvent"("hotelId", "sessionId", "createdAt");
CREATE UNIQUE INDEX "FunnelEvent_journey_eventId_key" ON "FunnelEvent"("eventId") WHERE "eventId" LIKE 'journey.%';
