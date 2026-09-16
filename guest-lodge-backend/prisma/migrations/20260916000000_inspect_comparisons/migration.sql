ALTER TABLE "InspectReport"
ADD COLUMN "baselineReportId" TEXT;

CREATE INDEX "InspectReport_baselineReportId_idx"
ON "InspectReport"("baselineReportId");

ALTER TABLE "InspectReport"
ADD CONSTRAINT "InspectReport_baselineReportId_fkey"
FOREIGN KEY ("baselineReportId") REFERENCES "InspectReport"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
