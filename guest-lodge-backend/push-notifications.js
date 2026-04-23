// Push notification helper functions
const webpush = require('web-push');

// Initialize with VAPID details (must be called after env is loaded)
function initializePush(vapidPublicKey, vapidPrivateKey, vapidSubject) {
    if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        console.log('✅ Push notifications initialized');
    } else {
        console.log('⚠️ Push notifications not configured (missing VAPID keys)');
    }
}

// Send push notification to all subscribed devices
async function sendPushNotification(prisma, title, body, data = {}) {
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.log('⚠️ Push notifications not configured (missing VAPID keys)');
        return;
    }

    try {
        const subscriptions = await prisma.pushSubscription.findMany();
        
        if (subscriptions.length === 0) {
            console.log('ℹ️ No push subscriptions found');
            return;
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: '/marketellogo.svg',
            badge: '/marketellogo.svg',
            data: {
                url: '/funnel',
                ...data
            }
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        },
                        payload
                    );
                    console.log(`✅ Push notification sent to ${sub.source || 'unknown'}`);
                } catch (error) {
                    // If subscription is invalid (410 Gone), remove it
                    if (error.statusCode === 410) {
                        console.log(`🗑️ Removing invalid subscription: ${sub.id}`);
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    } else {
                        console.error(`❌ Push notification failed for ${sub.id}:`, error.message);
                    }
                    throw error;
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`📊 Push notifications: ${successful} sent, ${failed} failed`);
    } catch (error) {
        console.error('❌ Error sending push notifications:', error);
    }
}

// Setup push notification routes
function setupPushRoutes(app, prisma, crmAuth) {
    // Get VAPID public key
    app.get('/api/push/vapid-public', (req, res) => {
        const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
        if (!VAPID_PUBLIC_KEY) {
            return res.status(500).json({ error: 'Push notifications not configured' });
        }
        res.json({ publicKey: VAPID_PUBLIC_KEY });
    });

    // Subscribe to push notifications
    app.post('/api/push/subscribe', crmAuth, async (req, res) => {
        const { endpoint, p256dh, auth, source } = req.body;

        if (!endpoint || !p256dh || !auth) {
            return res.status(400).json({ error: 'Missing subscription data' });
        }

        try {
            // Upsert: create or update based on unique endpoint
            await prisma.pushSubscription.upsert({
                where: { endpoint },
                update: { p256dh, auth, source },
                create: { endpoint, p256dh, auth, source }
            });

            res.json({ success: true, message: 'Subscription saved' });
        } catch (error) {
            console.error('Failed to save push subscription:', error);
            res.status(500).json({ error: 'Failed to save subscription' });
        }
    });

    // Test push notification
    app.post('/api/push/test', crmAuth, async (req, res) => {
        try {
            await sendPushNotification(
                prisma,
                '🔔 Test Notification',
                'Push notifications are working! You\'ll receive alerts when bookings come in.',
                { test: true }
            );
            res.json({ success: true, message: 'Test notification sent' });
        } catch (error) {
            console.error('Test notification failed:', error);
            res.status(500).json({ error: 'Failed to send test notification' });
        }
    });
}

module.exports = {
    initializePush,
    sendPushNotification,
    setupPushRoutes
};
