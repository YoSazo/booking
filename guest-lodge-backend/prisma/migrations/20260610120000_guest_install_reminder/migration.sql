-- Track pre-check-in "add to home screen" reminder emails
ALTER TABLE "Booking" ADD COLUMN "guestInstallReminderSentAt" TIMESTAMP(3);
