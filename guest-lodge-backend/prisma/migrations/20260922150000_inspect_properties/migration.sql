-- Properties that exist on their own, so one can be added before its first
-- report and deleted afterwards.
CREATE TABLE "InspectProperty" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectProperty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InspectProperty_accountId_name_key" ON "InspectProperty"("accountId", "name");

ALTER TABLE "InspectProperty" ADD CONSTRAINT "InspectProperty_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InspectAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
