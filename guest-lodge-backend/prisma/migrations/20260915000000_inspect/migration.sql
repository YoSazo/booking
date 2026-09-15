CREATE TABLE "InspectAccount" (
 "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "freeReportUsed" BOOLEAN NOT NULL DEFAULT false, "stripeCustomerId" TEXT UNIQUE, "stripeSubscriptionId" TEXT UNIQUE,
 "subscriptionStatus" TEXT, "periodStart" TIMESTAMP(3), "periodEnd" TIMESTAMP(3), "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
 "reportsUsed" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "InspectChallenge" ("email" TEXT PRIMARY KEY, "codeHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0, "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "InspectFreeClaim" ("emailHash" TEXT PRIMARY KEY, "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "InspectSession" ("tokenHash" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL REFERENCES "InspectAccount"("id") ON DELETE CASCADE, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "InspectSession_accountId_idx" ON "InspectSession"("accountId");
CREATE TABLE "InspectReport" (
 "id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL REFERENCES "InspectAccount"("id") ON DELETE CASCADE,
 "propertyName" TEXT NOT NULL, "document" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "finalizedAt" TIMESTAMP(3), "shareHash" TEXT UNIQUE, "aiRewrites" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "InspectReport_accountId_createdAt_idx" ON "InspectReport"("accountId", "createdAt");
CREATE TABLE "InspectAttachment" (
 "id" TEXT PRIMARY KEY, "reportId" TEXT NOT NULL REFERENCES "InspectReport"("id") ON DELETE CASCADE,
 "objectKey" TEXT NOT NULL UNIQUE, "originalKey" TEXT NOT NULL UNIQUE, "source" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InspectAttachment_reportId_idx" ON "InspectAttachment"("reportId");
CREATE TABLE "InspectEvent" ("id" TEXT PRIMARY KEY, "accountId" TEXT, "name" TEXT NOT NULL, "sourceId" TEXT UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "InspectEvent_createdAt_name_idx" ON "InspectEvent"("createdAt", "name");
CREATE TABLE "InspectGarbage" ("objectKey" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
