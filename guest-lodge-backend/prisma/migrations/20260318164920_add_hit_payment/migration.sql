/*
  Warnings:

  - A unique constraint covering the columns `[endpoint]` on the table `PushSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PushSubscription" ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "source" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
