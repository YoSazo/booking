ALTER TABLE "InspectAccount" ADD COLUMN "claimsPaidTrial" JSONB;
CREATE INDEX "InspectAccount_claimsPaidTrial_status_idx"
  ON "InspectAccount" (("claimsPaidTrial"->>'status'))
  WHERE "claimsPaidTrial" IS NOT NULL;
CREATE TABLE "InspectPaidTrialClaim" (
  "emailHash" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectPaidTrialClaim_pkey" PRIMARY KEY ("emailHash")
);
CREATE UNIQUE INDEX "InspectPaidTrialClaim_sessionId_key" ON "InspectPaidTrialClaim"("sessionId");
