# Marketel release QA

Run the automated release gate from `guest-lodge-backend`:

```bash
npm run qa:release:auto
```

This runs the unit suite, creates one randomly named `release-qa-*` property in
the configured PostgreSQL database, exercises the live inventory and room
catalog functions, and removes that property in `finally` even when a check
fails. It does not call Stripe, Twilio, APNs, email, Vercel, or a public Marketel
URL.

## Automated checklist coverage

- **9:** two simultaneous guests competing for the final unit
- **10:** two-unit capacity accepts two overlapping stays and blocks the third
- **12:** a stay with one overlapping night is blocked; checkout remains exclusive
- **13:** a closed night disappears from availability and cannot be booked
- **16:** double-submit/two-tab completion creates one booking and one email job
- **17:** the same reservation code reuses its Stripe preauthorization key, and
  a completion retry returns the existing Stripe-intent booking
- **18:** occupied nights end before checkout while owner-facing dates show checkout
- **32:** a created room appears in both booking-page and availability catalogs
- **33:** a room rename follows future bookings and public availability
- **34:** a room with a live future booking cannot be deleted
- **35:** an unused room is removed from both catalogs

## Still requires a device

- **17:** one literal Safari refresh/Back pass to verify browser presentation
- **19–31:** login, APNs, notification actions, deep links, offline/slow network,
  and multi-property behavior
- **32–35:** one iPhone pass confirming the changed room renders immediately
  without restarting the app
- **36–38:** image appearance, long keyboard conversations, and safe-area/modal
  layout with the real iOS keyboard
