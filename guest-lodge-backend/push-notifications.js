// Push notification helper functions
const webpush = require('web-push');

// Initialize with VAPID details (must be called after env is loaded)
function initializePush(vapidPublicKey, vapidPrivateKey, vapidSubject) {
    if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        console.log('Push notifications initialized');
    } else {
        console.log('Push notifications not configured (missing VAPID keys)');
    }
}

// Send push notification to subscribed devices for one hotel
async function sendPushNotification(prisma, hotelId, title, body, data = {}) {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.log('Push notifications not configured (missing VAPID keys)');
        return;
    }

    const scopedHotelId = String(hotelId || '').trim();
    if (!scopedHotelId) {
        console.log('Push notification skipped (missing hotelId scope)');
        return;
    }

    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { hotelId: scopedHotelId },
        });

        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for ${scopedHotelId}`);
            return;
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: '/marketellogo.svg',
            badge: '/marketellogo.svg',
            data: {
                url: '/funnel',
                ...data,
            },
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        payload
                    );
                    console.log(`Push notification sent to ${sub.source || 'unknown'}`);
                } catch (error) {
                    // If subscription is invalid (410 Gone), remove it.
                    if (error.statusCode === 410) {
                        console.log(`Removing invalid subscription: ${sub.id}`);
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    } else {
                        console.error(`Push notification failed for ${sub.id}:`, error.message);
                    }
                    throw error;
                }
            })
        );

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;
        console.log(`Push notifications: ${successful} sent, ${failed} failed`);
    } catch (error) {
        console.error('Error sending push notifications:', error);
    }
}

// Setup push notification routes
function setupPushRoutes(app, prisma, crmAuth) {
    // Get VAPID public key
    app.get('/api/push/vapid-public', (req, res) => {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            return res.status(500).json({ error: 'Push notifications not configured' });
        }
        res.json({ publicKey: vapidPublicKey });
    });

    // Subscribe to push notifications
    app.post('/api/push/subscribe', crmAuth, async (req, res) => {
        const { endpoint, p256dh, auth, source } = req.body || {};
        const hotelId = String(req.body?.hotelId || req.query?.hotelId || '').trim();

        if (!endpoint || !p256dh || !auth) {
            return res.status(400).json({ error: 'Missing subscription data' });
        }
        if (!hotelId) {
            return res.status(400).json({ error: 'Missing hotelId scope' });
        }

        try {
            const existing = await prisma.pushSubscription.findFirst({ where: { endpoint } });
            if (existing) {
                await prisma.pushSubscription.update({
                    where: { id: existing.id },
                    data: { p256dh, auth, source, hotelId },
                });
            } else {
                await prisma.pushSubscription.create({
                    data: { endpoint, p256dh, auth, source, hotelId },
                });
            }

            res.json({ success: true, message: 'Subscription saved' });
        } catch (error) {
            console.error('Failed to save push subscription:', error);
            res.status(500).json({ error: 'Failed to save subscription' });
        }
    });

    // Test push notification
    app.post('/api/push/test', crmAuth, async (req, res) => {
        const hotelId = String(req.body?.hotelId || req.query?.hotelId || '').trim();
        if (!hotelId) {
            return res.status(400).json({ error: 'Missing hotelId scope' });
        }

        try {
            await sendPushNotification(
                prisma,
                hotelId,
                'Test Notification',
                'Push notifications are working! You will receive alerts when bookings come in.',
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
    setupPushRoutes,
};
