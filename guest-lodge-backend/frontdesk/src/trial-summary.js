// Shared by the checkout confirmation and the persistent trial banner.
export function trialSummary(crm) {
  const trial = crm.trialStatus || crm.marketelLatestTrialState || {};
  const trialing = crm.marketelSubscriptionStatus === 'trialing' || trial.trialing === true;
  const rawEnd = trial.endsAt || crm.marketelSubscriptionPeriodEnd;
  const end = rawEnd ? new Date(rawEnd) : null;
  const endLabel = end && Number.isFinite(end.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(end)
    : '';
  const amount = Number(trial.renewalAmountUsd);
  const interval = ['month', 'year'].includes(trial.billingInterval) ? trial.billingInterval : '';
  const price = amount > 0 && interval
    ? `$${amount.toLocaleString('en-US')}/${interval}` : '';
  const daysLeft = trial.daysLeft != null && Number.isFinite(Number(trial.daysLeft))
    ? Math.max(0, Number(trial.daysLeft)) : null;
  const canceled = trial.cancellationScheduled === true;
  const ended = !crm.hotelSubscribed && !trialing && !!(trial.canceledAt || trial.startedAt);
  return {
    trialing, canceled, ended, daysLeft, endLabel, price,
    title: trialing ? (canceled ? 'Your trial cancellation is scheduled' : `Your ${crm.marketelTrialDays || 14}-day trial has started`)
      : crm.hotelSubscribed ? 'Your Marketel access is active' : ended ? 'Your trial access has ended' : 'Confirming your trial…',
    billing: trialing ? (canceled
      ? `No subscription charge is scheduled. ${endLabel ? `Access continues through ${endLabel}.` : 'Your access-end date is loading.'}`
      : price && endLabel ? `Automatically renews at ${price} on ${endLabel} unless you cancel before then.`
        : 'Your billing details are loading. Check Trial & Billing for your renewal amount and date.')
      : crm.hotelSubscribed ? 'Manage your subscription in Trial & Billing.' : ended ? 'New direct bookings are paused. Your existing reservations and guest messages remain available.' : 'We are checking your subscription status. Your property setup is saved.',
  };
}
