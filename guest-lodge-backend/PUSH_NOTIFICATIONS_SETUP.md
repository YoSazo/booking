# Push Notifications Setup Complete! 🎉

## What Was Built

A complete push notification system that sends you real-time alerts when bookings come in, even when the app is closed!

## Features Implemented

✅ **Push notification infrastructure** using Web Push API
✅ **Service worker** for background notifications
✅ **PWA manifest** for installable app
✅ **Database table** for storing push subscriptions
✅ **API endpoints** for subscribing and testing
✅ **Notification UI** in funnel.html with 🔔 button
✅ **Automatic notifications** when bookings succeed via Stripe webhook

## Environment Variables Needed

Add these to your `.env` file:

```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=YOUR_GENERATED_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_GENERATED_VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:notifications@example.com
```

## How to Use

### 1. Deploy to Production
Generate a fresh VAPID keypair and add it to your Render environment variables.

### 2. Open the Funnel Dashboard
Navigate to: `https://your-domain.com/funnel`

### 3. Sign In
Use your configured `CRM_PASSWORD`

### 4. Enable Notifications
Click the **🔔 Notify** button in the header
- Grant permission when prompted
- Button will turn green and show "🔔 On" when active

### 5. Test It!
You can test the notification system by calling:
```
POST /api/push/test
Headers: x-crm-token: YOUR_CRM_PASSWORD
```

Or just wait for a real booking to come in!

## Browser Support

✅ **Chrome** (Desktop & Android) - Full support
✅ **Edge** (Desktop & Android) - Full support
✅ **Firefox** (Desktop & Android) - Full support
❌ **Safari iOS** - No push support (Apple limitation)
✅ **Safari macOS** - Supported with user permission

## Files Created/Modified

### New Files:
- `push-notifications.js` - Push notification helper functions
- `public/sw.js` - Service worker for background notifications
- `public/manifest.json` - PWA manifest
- `generate-vapid-keys.js` - VAPID key generator script

### Modified Files:
- `server.js` - Added push notification integration
- `funnel.html` - Added notification UI and subscription logic
- `prisma/schema.prisma` - Added PushSubscription model

## API Endpoints

### GET `/api/push/vapid-public`
Returns the VAPID public key for client subscription

### POST `/api/push/subscribe` (Requires Auth)
Subscribes a device to push notifications
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "base64-encoded-key",
  "auth": "base64-encoded-key",
  "source": "funnel"
}
```

### POST `/api/push/test` (Requires Auth)
Sends a test notification to all subscribed devices

## Notification Trigger

Notifications are automatically sent when:
- A booking payment succeeds (via Stripe webhook)
- Shows: Guest name, room type, and total amount
- Links back to /funnel when clicked

## Troubleshooting

**"Push notifications not supported on this device"**
- You're on iOS Safari (not supported by Apple)
- Try Chrome on Android or desktop instead

**Notifications not showing up**
- Check browser notification settings
- Make sure the 🔔 button shows "On" (green)
- Check browser console for errors
- Verify VAPID keys are set in environment

**Service worker not registering**
- Check `/sw.js` is accessible
- Must be served over HTTPS (or localhost)
- Clear browser cache and try again

## Next Steps

1. Add the VAPID keys to your production environment
2. Deploy the changes
3. Enable notifications on your devices
4. Enjoy real-time booking alerts! 🎉

---

**Note:** Keep your VAPID_PRIVATE_KEY secret! Don't commit it to git.
