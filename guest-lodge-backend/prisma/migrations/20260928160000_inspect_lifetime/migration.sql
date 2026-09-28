-- The pay-once offer: an account that paid once keeps its plan for good.
ALTER TABLE "InspectAccount" ADD COLUMN "lifetimeSince" TIMESTAMP(3);
