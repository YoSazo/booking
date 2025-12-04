/*
  Warnings:

  - You are about to drop the column `BookingType` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "BookingType",
ADD COLUMN     "bookingType" TEXT NOT NULL DEFAULT 'standard';
