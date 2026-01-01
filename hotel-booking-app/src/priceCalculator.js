/**
 * Shared price calculation utility
 * Calculates tiered pricing based on nights and rates
 */

export const calculateTieredPrice = (nights, rates) => {
  if (nights <= 0 || !rates) return 0;
  if (nights < 7) return nights * rates.NIGHTLY;

  const WEEK_N = +(rates.WEEKLY / 7).toFixed(2);
  const MONTHLY_NIGHTS_THRESHOLD = 28;

  let discountedTotalRem = nights;
  let discountedTotal = 0;

  // Apply monthly rates first
  discountedTotal += Math.floor(discountedTotalRem / MONTHLY_NIGHTS_THRESHOLD) * rates.MONTHLY;
  discountedTotalRem %= MONTHLY_NIGHTS_THRESHOLD;

  // Apply weekly rates next
  discountedTotal += Math.floor(discountedTotalRem / 7) * rates.WEEKLY;
  discountedTotalRem %= 7;

  // Apply nightly rate for remaining days
  discountedTotal += discountedTotalRem * WEEK_N;

  return +discountedTotal.toFixed(2);
};
