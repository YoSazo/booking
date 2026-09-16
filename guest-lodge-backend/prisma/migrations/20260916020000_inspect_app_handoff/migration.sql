CREATE TABLE "InspectHandoff" (
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "reportId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectHandoff_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX "InspectHandoff_accountId_idx" ON "InspectHandoff"("accountId");
CREATE INDEX "InspectHandoff_expiresAt_idx" ON "InspectHandoff"("expiresAt");

ALTER TABLE "InspectHandoff"
ADD CONSTRAINT "InspectHandoff_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "InspectAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
