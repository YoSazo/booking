const crypto = require('crypto');
const express = require('express');
const twilio = require('twilio');
const OpenAIModule = require('openai');

const OpenAI = OpenAIModule.default || OpenAIModule;

const ASSISTANT_FREQUENCIES = new Set(['smart', '2h', '4h', 'daily', 'booking_only', 'off']);
const DEAD_BOOKING_STATUSES = ['cancelled', 'canceled', 'released'];
const MAX_RECIPIENTS = 3;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_MS = 60 * 1000;
const ACTION_UNDO_TTL_MS = 10 * 60 * 1000;
const BOOKING_ACTION_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_SMS_BODY = 1200;

function addIsoDays(iso, days) {
    const date = new Date(`${iso}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
}

// Short replies only have meaning in the context of the message they answer.
// In particular, "NO" after an inventory check means nothing changed, while
// "NO" after a booking alert means the room is not available.
function classifyDeterministicIntent(body, rooms = [], todayIso = '', contextType = '') {
    const text = String(body || '').trim();
    const lower = text.toLowerCase();
    if (/^(help|\?)$/.test(lower)) return { intent: 'help' };
    if (/^(undo|undo that|revert|revert that)$/.test(lower)) return { intent: 'undo' };
    if (/^(cancel|cancel it|cancel booking)$/.test(lower)) return { intent: 'cancel_booking' };
    if (/^(keep|keep it|do not cancel|don't cancel)$/.test(lower)) return { intent: 'keep_booking' };
    if (/^(yes|y|available|still available|it is available)$/.test(lower)) {
        return contextType === 'inventory_check'
            ? { intent: 'no_change' }
            : { intent: 'booking_available' };
    }
    if (/^(no change|no changes|nothing changed|nothing|none|all good)$/.test(lower)) {
        return { intent: 'no_change' };
    }
    if (/^(no|n|nope)$/.test(lower)) {
        if (contextType === 'inventory_check') return { intent: 'no_change' };
        if (contextType === 'booking_alert') return { intent: 'booking_taken' };
        return {
            intent: 'unknown',
            clarification: 'Are you replying to a booking alert, or saying nothing changed? Include the room name so I can act safely.',
        };
    }
    if (/^(not available|room taken|it's taken|it is taken)$/.test(lower)) {
        return { intent: 'booking_taken' };
    }

    const room = rooms.find((entry) => lower.includes(String(entry.name || '').toLowerCase()));
    const walkInLanguage = /\b(walk[- ]?in|took|taken|gave|sold|occupied|checked in|booked outside|outside booking)\b/.test(lower);
    if (room && walkInLanguage) {
        const startDate = /\btomorrow\b/.test(lower) ? addIsoDays(todayIso, 1) : todayIso;
        return {
            intent: 'block_room',
            roomName: room.name,
            startDate,
            endDate: startDate,
            units: 1,
            clarification: '',
        };
    }
    return null;
}

function createFrontDeskAssistant({
    prisma,
    withRetry,
    normalizeIsoDate,
    enumerateDatesInclusive,
    manualBookingStayDates,
    cancelBookingByOwner,
    applyBookingApprovalDecision,
    maybeNotifyRoomSoldOutToday,
    reportTimeZone = 'America/Chicago',
}) {
    const twilioAccountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
    const twilioAuthToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
    const twilioPhoneNumber = String(process.env.TWILIO_PHONE_NUMBER || '').trim();
    const twilioMessagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
    const twilioInboundWebhookUrl = String(process.env.TWILIO_INBOUND_WEBHOOK_URL || '').trim();
    const twilioStatusCallbackUrl = String(process.env.TWILIO_STATUS_CALLBACK_URL || '').trim();
    const shouldValidateTwilio = process.env.TWILIO_VALIDATE_SIGNATURES !== 'false';
    const smsDryRun = process.env.FRONTDESK_ASSISTANT_SMS_DRY_RUN === 'true';
    const assistantSecret = String(
        process.env.FRONTDESK_ASSISTANT_SECRET
        || process.env.SESSION_SECRET
        || 'frontdesk-assistant-local-secret'
    );
    const openaiApiKey = String(process.env.OPENAI_API_KEY || '').trim();
    const openaiModel = String(process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5.6-luna').trim();

    const twilioReady = !!(
        twilioAccountSid
        && twilioAuthToken
        && (twilioPhoneNumber || twilioMessagingServiceSid)
    );
    const twilioClient = twilioReady ? twilio(twilioAccountSid, twilioAuthToken) : null;
    const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

    function normalizePhone(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('+')) {
            const digits = raw.slice(1).replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : '';
        }
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 10) return `+1${digits}`;
        if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
        return '';
    }

    function maskedPhone(phone) {
        const clean = String(phone || '');
        return clean.length > 4 ? `••• ••• ${clean.slice(-4)}` : clean;
    }

    function verificationHash(recipientId, code) {
        return crypto
            .createHmac('sha256', assistantSecret)
            .update(`${recipientId}:${code}`)
            .digest('hex');
    }

    function safeEqual(left, right) {
        const a = Buffer.from(String(left || ''));
        const b = Buffer.from(String(right || ''));
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    function clampText(value, max = MAX_SMS_BODY) {
        return String(value || '').trim().slice(0, max);
    }

    function localParts(date, timeZone) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone || reportTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(date || new Date());
        return Object.fromEntries(parts.map((part) => [part.type, part.value]));
    }

    function localTodayIso(timeZone, date = new Date()) {
        const parts = localParts(date, timeZone);
        return `${parts.year}-${parts.month}-${parts.day}`;
    }

    function addDaysIso(iso, days) {
        return addIsoDays(iso, days);
    }

    function zonedDateTimeToUtc(dateIso, time, timeZone) {
        const normalizedDate = normalizeIsoDate(dateIso);
        const match = String(time || '').match(/^(\d{2}):(\d{2})$/);
        if (!normalizedDate || !match) return null;
        const hour = Math.min(23, Number(match[1]));
        const minute = Math.min(59, Number(match[2]));
        const targetMs = Date.parse(`${normalizedDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
        let guess = new Date(targetMs);

        // Two passes account for DST boundaries without adding another runtime
        // dependency. Intl supplies the zone's actual offset at each guess.
        for (let pass = 0; pass < 2; pass += 1) {
            const parts = localParts(guess, timeZone);
            const shownMs = Date.parse(
                `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00.000Z`
            );
            guess = new Date(guess.getTime() + (targetMs - shownMs));
        }
        return guess;
    }

    function minutesFromClock(value) {
        const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
        if (!match) return null;
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour > 23 || minute > 59) return null;
        return hour * 60 + minute;
    }

    function inQuietHours(config, now = new Date()) {
        const start = minutesFromClock(config?.quietHoursStart);
        const end = minutesFromClock(config?.quietHoursEnd);
        if (start === null || end === null || start === end) return false;
        const parts = localParts(now, config?.timeZone);
        const current = Number(parts.hour) * 60 + Number(parts.minute);
        return start < end
            ? current >= start && current < end
            : current >= start || current < end;
    }

    function computeNextCheckAt(config, now = new Date()) {
        const frequency = ASSISTANT_FREQUENCIES.has(config?.checkFrequency)
            ? config.checkFrequency
            : 'smart';
        if (frequency === 'off' || frequency === 'booking_only') return null;
        if (frequency === '2h') return new Date(now.getTime() + 2 * 60 * 60 * 1000);
        if (frequency === '4h') return new Date(now.getTime() + 4 * 60 * 60 * 1000);

        const timeZone = config?.timeZone || reportTimeZone;
        const checkTime = config?.dailyCheckTime || '18:00';
        const today = localTodayIso(timeZone, now);
        let next = zonedDateTimeToUtc(today, checkTime, timeZone);
        if (!next || next.getTime() <= now.getTime() + 60 * 1000) {
            next = zonedDateTimeToUtc(addDaysIso(today, 1), checkTime, timeZone);
        }
        return next;
    }

    async function ensureConfig(hotelId) {
        return withRetry(() => prisma.frontDeskAssistantConfig.upsert({
            where: { hotelId },
            update: {},
            create: {
                hotelId,
                timeZone: reportTimeZone,
                nextCheckAt: null,
            },
        }));
    }

    async function createActivity({
        hotelId,
        recipientId = null,
        direction,
        type,
        body = '',
        summary = '',
        status = 'recorded',
        providerMessageId = null,
        metadata = undefined,
    }) {
        return prisma.frontDeskAssistantActivity.create({
            data: {
                hotelId,
                recipientId,
                direction,
                type,
                body: clampText(body, 2000) || null,
                summary: clampText(summary, 500) || null,
                status,
                providerMessageId,
                ...(metadata === undefined ? {} : { metadata }),
            },
        }).catch((error) => {
            console.error('frontdesk-assistant activity:', error.message);
            return null;
        });
    }

    function twilioMessageOptions(recipient, body) {
        const options = {
            to: recipient.phoneE164,
            body: clampText(body),
        };
        if (twilioMessagingServiceSid) options.messagingServiceSid = twilioMessagingServiceSid;
        else options.from = twilioPhoneNumber;
        if (twilioStatusCallbackUrl) options.statusCallback = twilioStatusCallbackUrl;
        return options;
    }

    async function sendSms(recipient, body, {
        type = 'assistant',
        summary = '',
        metadata = undefined,
    } = {}) {
        if (!recipient?.hotelId || !recipient?.phoneE164) {
            throw new Error('A valid Front Desk recipient is required.');
        }
        if (!twilioReady && !smsDryRun) {
            throw new Error('Text messaging is not configured yet.');
        }

        let providerMessageId = null;
        let status = 'queued';
        if (smsDryRun) {
            providerMessageId = `dry_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            status = 'sent';
            console.log(`📱 [assistant dry-run] to=${recipient.phoneE164} ${clampText(body)}`);
        } else {
            const message = await twilioClient.messages.create(twilioMessageOptions(recipient, body));
            providerMessageId = message.sid || null;
            status = message.status || 'queued';
        }

        await Promise.all([
            prisma.frontDeskAssistantRecipient.update({
                where: { id: recipient.id },
                data: { lastOutboundAt: new Date() },
            }).catch(() => {}),
            createActivity({
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                direction: 'outbound',
                type,
                body,
                summary,
                status,
                providerMessageId,
                metadata,
            }),
        ]);
        return { providerMessageId, status };
    }

    async function sendToVerifiedRecipients(hotel, body, options = {}) {
        const recipients = await prisma.frontDeskAssistantRecipient.findMany({
            where: {
                hotelId: hotel.id,
                active: true,
                verifiedAt: { not: null },
                consentAt: { not: null },
            },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            take: MAX_RECIPIENTS,
        });
        const results = await Promise.allSettled(
            recipients.map((recipient) => sendSms(recipient, body, options))
        );
        return {
            recipients,
            sent: results.filter((result) => result.status === 'fulfilled').length,
        };
    }

    async function serializeAssistant(hotelId) {
        const [config, recipients, activities, latestResult, hotel] = await Promise.all([
            ensureConfig(hotelId),
            prisma.frontDeskAssistantRecipient.findMany({
                where: { hotelId },
                orderBy: [{ active: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
            }),
            prisma.frontDeskAssistantActivity.findMany({
                where: { hotelId },
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
            prisma.frontDeskAssistantActivity.findFirst({
                where: {
                    hotelId,
                    type: { in: ['availability_update', 'booking_decision', 'availability_warning'] },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: {
                    id: true,
                    name: true,
                    pms: true,
                    subscribed: true,
                    bookingApprovalEnabled: true,
                    bookingApprovalWindowMinutes: true,
                    bookingApprovalNoResponseAction: true,
                    bookingApprovalPolicyChosenAt: true,
                },
            }),
        ]);
        return {
            config,
            hotel,
            recipients: recipients.map((recipient) => ({
                id: recipient.id,
                name: recipient.name,
                role: recipient.role || '',
                phone: recipient.phoneE164,
                maskedPhone: maskedPhone(recipient.phoneE164),
                priority: recipient.priority,
                active: recipient.active,
                verified: !!recipient.verifiedAt && !!recipient.consentAt,
                verifiedAt: recipient.verifiedAt,
                lastInboundAt: recipient.lastInboundAt,
                lastOutboundAt: recipient.lastOutboundAt,
            })),
            activities: activities.map((activity) => ({
                id: activity.id,
                recipientId: activity.recipientId,
                direction: activity.direction,
                type: activity.type,
                summary: activity.summary || activity.body || '',
                status: activity.status,
                createdAt: activity.createdAt,
            })),
            latestResult: latestResult ? {
                id: latestResult.id,
                recipientId: latestResult.recipientId,
                direction: latestResult.direction,
                type: latestResult.type,
                summary: latestResult.summary || latestResult.body || '',
                status: latestResult.status,
                createdAt: latestResult.createdAt,
            } : null,
            capabilities: {
                smsConfigured: twilioReady || smsDryRun,
                aiConfigured: !!openai,
                manualAvailability: String(hotel?.pms || '').toLowerCase() === 'manual',
                maxRecipients: MAX_RECIPIENTS,
                assistantPhone: twilioPhoneNumber || '',
            },
            bookingApproval: {
                enabled: hotel?.bookingApprovalEnabled === true,
                windowMinutes: Math.min(60, Math.max(5, Number(hotel?.bookingApprovalWindowMinutes) || 20)),
                noResponseAction: String(hotel?.bookingApprovalNoResponseAction || '').toLowerCase() === 'release'
                    ? 'release'
                    : 'confirm',
                policyChosen: !!hotel?.bookingApprovalPolicyChosenAt,
            },
        };
    }

    async function countReachableBookingRecipients(hotelId) {
        if ((!twilioReady && !smsDryRun) || !hotelId) return 0;
        const [config, hotel] = await Promise.all([
            ensureConfig(hotelId).catch(() => null),
            prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: { subscribed: true, pms: true },
            }).catch(() => null),
        ]);
        if (!hotel?.subscribed || String(hotel.pms || '').toLowerCase() !== 'manual') return 0;
        if (!config?.enabled || config.notifyNewBookings === false) return 0;
        return prisma.frontDeskAssistantRecipient.count({
            where: {
                hotelId,
                active: true,
                verifiedAt: { not: null },
                consentAt: { not: null },
            },
        });
    }

    function verificationCode() {
        return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    }

    async function sendVerification(recipient) {
        const recent = await prisma.frontDeskAssistantActivity.findFirst({
            where: {
                recipientId: recipient.id,
                type: 'verification',
                direction: 'outbound',
                createdAt: { gte: new Date(Date.now() - VERIFICATION_RESEND_MS) },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (recent) {
            const error = new Error('Wait a minute before requesting another code.');
            error.statusCode = 429;
            throw error;
        }

        const code = verificationCode();
        await prisma.frontDeskAssistantRecipient.update({
            where: { id: recipient.id },
            data: {
                verificationCodeHash: verificationHash(recipient.id, code),
                verificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
                verificationAttempts: 0,
                verifiedAt: null,
                consentAt: null,
            },
        });
        await sendSms(
            recipient,
            `Marketel Front Desk verification code: ${code}. Enter it in Front Desk to connect this phone. Reply STOP anytime to opt out.`,
            { type: 'verification', summary: `Verification sent to ${maskedPhone(recipient.phoneE164)}` }
        );
        return code;
    }

    function webhookUrl(req, configuredUrl = '') {
        if (configuredUrl) return configuredUrl;
        const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
        const protocol = forwardedProto || req.protocol || 'https';
        return `${protocol}://${req.get('host')}${req.originalUrl}`;
    }

    function validateTwilioWebhook(req, configuredUrl = '') {
        if (!shouldValidateTwilio) return true;
        if (!twilioAuthToken) return false;
        const signature = String(req.get('x-twilio-signature') || '');
        if (!signature) return false;
        return twilio.validateRequest(
            twilioAuthToken,
            signature,
            webhookUrl(req, configuredUrl),
            req.body || {}
        );
    }

    function xmlEscape(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function twimlMessage(body) {
        if (!body) return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
        return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(clampText(body))}</Message></Response>`;
    }

    async function resolveInboundRecipient(phone, body) {
        const matches = await prisma.frontDeskAssistantRecipient.findMany({
            where: {
                phoneE164: phone,
                active: true,
                verifiedAt: { not: null },
                consentAt: { not: null },
            },
            include: {
                hotel: {
                    select: { id: true, name: true, pms: true, subscribed: true },
                },
            },
        });
        if (matches.length <= 1) return { recipient: matches[0] || null, ambiguous: false };

        const lowerBody = String(body || '').toLowerCase();
        const named = matches.filter((entry) => {
            const name = String(entry.hotel?.name || '').trim().toLowerCase();
            return name && lowerBody.includes(name);
        });
        if (named.length === 1) return { recipient: named[0], ambiguous: false };

        const recent = await prisma.frontDeskAssistantActivity.findFirst({
            where: {
                recipientId: { in: matches.map((entry) => entry.id) },
                direction: 'outbound',
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (recent) {
            const recipient = matches.find((entry) => entry.id === recent.recipientId);
            if (recipient) return { recipient, ambiguous: false };
        }
        return { recipient: null, ambiguous: true, matches };
    }

    async function getRecentBookingAction(hotelId, recipientId = '') {
        if (recipientId) {
            const lastAlert = await prisma.frontDeskAssistantActivity.findFirst({
                where: {
                    hotelId,
                    recipientId,
                    direction: 'outbound',
                    type: 'booking_alert',
                    createdAt: { gte: new Date(Date.now() - BOOKING_ACTION_TTL_MS) },
                },
                orderBy: { createdAt: 'desc' },
            });
            const actionId = String(lastAlert?.metadata?.actionId || '');
            if (actionId) {
                const linked = await prisma.frontDeskAssistantPendingAction.findFirst({
                    where: {
                        id: actionId,
                        hotelId,
                        kind: 'review_booking',
                        status: { in: ['pending', 'applied'] },
                        expiresAt: { gt: new Date() },
                    },
                });
                if (linked) return linked;
            }
        }
        const actions = await prisma.frontDeskAssistantPendingAction.findMany({
            where: {
                hotelId,
                kind: 'review_booking',
                status: { in: ['pending', 'applied'] },
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        return actions[0] || null;
    }

    async function getPendingCancelAction(hotelId) {
        return prisma.frontDeskAssistantPendingAction.findFirst({
            where: {
                hotelId,
                kind: 'cancel_booking',
                status: 'pending',
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    function fulfillmentFinished(outcome) {
        return String(outcome?.fulfillment?.status || '').toLowerCase() === 'completed';
    }

    function fulfillmentNeedsAttention(outcome) {
        return String(outcome?.fulfillment?.status || '').toLowerCase() === 'attention';
    }

    function bookingOutcomeActivityStatus(outcome) {
        if (fulfillmentNeedsAttention(outcome)) return 'attention';
        return fulfillmentFinished(outcome) ? 'completed' : 'processing';
    }

    async function markBookingAvailable(action) {
        const bookingId = String(action?.payload?.bookingId || '');
        if (!bookingId) return { ok: false, message: 'I could not identify that booking.' };
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, hotelId: action.hotelId },
        });
        if (!booking) return { ok: false, message: 'That booking no longer exists.' };
        if (DEAD_BOOKING_STATUSES.includes(String(booking.status || '').toLowerCase())) {
            return { ok: false, message: 'That booking has already been cancelled.' };
        }
        if (String(booking.status || '').toLowerCase() === 'pending' && applyBookingApprovalDecision) {
            const decision = await applyBookingApprovalDecision(booking.id, 'confirm', 'assistant');
            await prisma.frontDeskAssistantPendingAction.update({
                where: { id: action.id },
                data: { status: 'applied', appliedAt: new Date() },
            }).catch(() => {});
            if (decision?.ok) {
                await createActivity({
                    hotelId: action.hotelId,
                    recipientId: action.recipientId || null,
                    direction: 'system',
                    type: 'booking_decision',
                    summary: `${booking.roomName} confirmed from your reply`,
                    status: bookingOutcomeActivityStatus(decision),
                    metadata: { bookingId: booking.id, outcome: 'owner_confirmed' },
                });
            }
            return decision?.ok
                ? {
                    ok: true,
                    message: fulfillmentFinished(decision)
                        ? `Confirmed — ${booking.roomName} is booked and the guest has been emailed.`
                        : `Confirmed — ${booking.roomName} is booked. I’m finishing the guest email and will keep retrying if needed.`,
                    booking: decision.booking || booking,
                }
                : { ok: false, message: 'I could not safely confirm that booking. Open Front Desk to review it.' };
        }
        await Promise.all([
            prisma.booking.update({
                where: { id: booking.id },
                data: {
                    ownerReviewStatus: 'available',
                    ownerReviewedAt: new Date(),
                    ownerReviewNextReminderAt: null,
                },
            }),
            prisma.frontDeskAssistantPendingAction.update({
                where: { id: action.id },
                data: { status: 'applied', appliedAt: new Date() },
            }),
        ]);
        await createActivity({
            hotelId: action.hotelId,
            recipientId: action.recipientId || null,
            direction: 'system',
            type: 'booking_decision',
            summary: `${booking.roomName} marked available from your reply`,
            status: 'completed',
            metadata: { bookingId: booking.id, outcome: 'owner_marked_available' },
        });
        return {
            ok: true,
            message: `Perfect — ${booking.roomName} is confirmed as available for this booking.`,
            booking,
        };
    }

    function dateRangeLabel(startDate, endDate) {
        if (startDate === endDate) {
            return new Date(`${startDate}T12:00:00Z`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        }
        const start = new Date(`${startDate}T12:00:00Z`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        const end = new Date(`${endDate}T12:00:00Z`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        return `${start}–${end}`;
    }

    async function consumeWalkInInventory({
        hotelId,
        recipientId,
        roomName,
        startDate,
        endDate,
        units = 1,
        createUndo = true,
    }) {
        const normalizedStart = normalizeIsoDate(startDate);
        const normalizedEnd = normalizeIsoDate(endDate);
        const dates = enumerateDatesInclusive(normalizedStart, normalizedEnd, 180);
        const safeUnits = Math.min(20, Math.max(1, parseInt(units, 10) || 1));
        if (!dates.length) return { ok: false, code: 'invalid_dates' };

        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hotelId}), hashtext(${roomName}))`;
            const room = await tx.manualRoom.findUnique({
                where: { hotelId_name: { hotelId, name: roomName } },
                include: { overrides: { where: { date: { in: dates } } } },
            });
            if (!room) return { ok: false, code: 'room_not_found' };

            const dayStart = new Date(`${dates[0]}T00:00:00.000Z`);
            const dayEnd = new Date(`${addDaysIso(dates[dates.length - 1], 1)}T00:00:00.000Z`);
            const bookings = await tx.booking.findMany({
                where: {
                    hotelId,
                    roomName,
                    status: { notIn: DEAD_BOOKING_STATUSES },
                    checkinDate: { lt: dayEnd },
                    checkoutDate: { gt: dayStart },
                },
                select: {
                    id: true,
                    bookingType: true,
                    status: true,
                    guestFirstName: true,
                    guestLastName: true,
                    roomName: true,
                    checkinDate: true,
                    checkoutDate: true,
                    createdAt: true,
                },
            });
            const bookedByDate = {};
            for (const booking of bookings) {
                for (const date of manualBookingStayDates(booking.checkinDate, booking.checkoutDate)) {
                    bookedByDate[date] = (bookedByDate[date] || 0) + 1;
                }
            }
            const overrideByDate = Object.fromEntries(
                (room.overrides || []).map((override) => [override.date, override])
            );
            const before = [];
            const after = [];
            const insufficientDates = [];

            for (const date of dates) {
                const override = overrideByDate[date];
                const currentAvailable = override?.closed
                    ? 0
                    : (override && override.availableUnits !== null
                        ? Math.max(0, Number(override.availableUnits))
                        : Math.max(0, Number(room.totalUnits || 0) - Number(bookedByDate[date] || 0)));
                if (currentAvailable < safeUnits) insufficientDates.push(date);
                before.push({
                    date,
                    exists: !!override,
                    availableUnits: override?.availableUnits ?? null,
                    closed: !!override?.closed,
                });
                after.push({
                    date,
                    availableUnits: Math.max(0, currentAvailable - safeUnits),
                    closed: currentAvailable - safeUnits <= 0,
                });
            }

            if (insufficientDates.length) {
                const overlappingBookings = bookings.filter((booking) =>
                    manualBookingStayDates(booking.checkinDate, booking.checkoutDate)
                        .some((date) => insufficientDates.includes(date))
                );
                return {
                    ok: false,
                    code: 'conflict',
                    room,
                    dates,
                    bookings: overlappingBookings,
                };
            }

            for (const next of after) {
                await tx.manualOverride.upsert({
                    where: { roomId_date: { roomId: room.id, date: next.date } },
                    update: {
                        availableUnits: next.availableUnits,
                        closed: next.closed,
                    },
                    create: {
                        roomId: room.id,
                        date: next.date,
                        availableUnits: next.availableUnits,
                        closed: next.closed,
                    },
                });
            }

            let action = null;
            if (createUndo) {
                action = await tx.frontDeskAssistantPendingAction.create({
                    data: {
                        hotelId,
                        recipientId: recipientId || null,
                        kind: 'block_availability',
                        status: 'applied',
                        expiresAt: new Date(Date.now() + ACTION_UNDO_TTL_MS),
                        appliedAt: new Date(),
                        payload: {
                            roomName: room.name,
                            startDate: normalizedStart,
                            endDate: normalizedEnd,
                            units: safeUnits,
                            before,
                            after,
                        },
                    },
                });
            }

            return {
                ok: true,
                roomName: room.name,
                dates,
                units: safeUnits,
                action,
            };
        }, { maxWait: 5000, timeout: 15000 });
    }

    async function createCancellationQuestion({ recipient, conflict, reason }) {
        const booking = (conflict.bookings || [])[0];
        if (!booking) return null;
        const existing = await getPendingCancelAction(recipient.hotelId);
        if (existing && String(existing.payload?.bookingId || '') === booking.id) return existing;
        return prisma.frontDeskAssistantPendingAction.create({
            data: {
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                kind: 'cancel_booking',
                payload: {
                    bookingId: booking.id,
                    roomName: conflict.room?.name || booking.roomName,
                    startDate: conflict.dates?.[0],
                    endDate: conflict.dates?.[conflict.dates.length - 1],
                    units: 1,
                    reason: reason || 'Room was given to a walk-in',
                },
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
    }

    async function createBookingCancellationQuestion(reviewAction, recipient) {
        const bookingId = String(reviewAction?.payload?.bookingId || '');
        if (!bookingId) return null;
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, hotelId: recipient.hotelId },
        });
        if (!booking || DEAD_BOOKING_STATUSES.includes(String(booking.status || '').toLowerCase())) {
            return null;
        }
        const existing = await getPendingCancelAction(recipient.hotelId);
        if (existing && String(existing.payload?.bookingId || '') === booking.id) {
            return { action: existing, booking };
        }
        const stayDates = manualBookingStayDates(booking.checkinDate, booking.checkoutDate);
        const action = await prisma.frontDeskAssistantPendingAction.create({
            data: {
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                kind: 'cancel_booking',
                payload: {
                    bookingId: booking.id,
                    roomName: booking.roomName,
                    startDate: stayDates[0] || null,
                    endDate: stayDates[stayDates.length - 1] || null,
                    units: 1,
                    reason: 'Room was given to a walk-in',
                },
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
        return { action, booking };
    }

    async function cancelBookingAndReplaceWithWalkIn(action, recipient) {
        const payload = action?.payload || {};
        const booking = await prisma.booking.findFirst({
            where: {
                id: String(payload.bookingId || ''),
                hotelId: action.hotelId,
            },
        });
        if (!booking) return { ok: false, message: 'That booking no longer exists.' };
        if (DEAD_BOOKING_STATUSES.includes(String(booking.status || '').toLowerCase())) {
            await prisma.frontDeskAssistantPendingAction.update({
                where: { id: action.id },
                data: { status: 'applied', appliedAt: new Date() },
            }).catch(() => {});
            return { ok: true, message: 'That booking was already cancelled.' };
        }

        const outcome = await cancelBookingByOwner(
            booking.id,
            booking.hotelId,
            String(payload.reason || 'Room was given to a walk-in')
        );
        if (!outcome?.ok) return { ok: false, message: 'I could not cancel that booking.' };

        const stayDates = manualBookingStayDates(booking.checkinDate, booking.checkoutDate);
        let inventoryResult = { ok: true };
        if (stayDates.length) {
            inventoryResult = await consumeWalkInInventory({
                hotelId: booking.hotelId,
                recipientId: recipient?.id || null,
                roomName: booking.roomName,
                startDate: stayDates[0],
                endDate: stayDates[stayDates.length - 1],
                units: 1,
                createUndo: false,
            }).catch(() => ({ ok: false, code: 'update_failed' }));
        }
        await prisma.frontDeskAssistantPendingAction.update({
            where: { id: action.id },
            data: { status: 'applied', appliedAt: new Date() },
        }).catch(() => {});

        const guest = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'the guest';
        const guestAction = fulfillmentFinished(outcome)
            ? 'The card hold is released and the guest was notified.'
            : (fulfillmentNeedsAttention(outcome)
                ? 'The booking is cancelled, but the card or guest notification needs attention in Front Desk.'
                : 'The booking is cancelled; I’m finishing the card release and guest notification.');
        if (!inventoryResult?.ok) {
            await createActivity({
                hotelId: booking.hotelId,
                recipientId: recipient?.id || null,
                direction: 'system',
                type: 'availability_warning',
                summary: `Cancelled ${guest}, but ${booking.roomName} needs an availability review`,
                status: 'attention',
                metadata: { bookingId: booking.id, inventoryCode: inventoryResult?.code || 'unknown' },
            });
            return {
                ok: true,
                message: `I cancelled ${guest}'s booking. ${guestAction} Availability changed at the same time, so open Availability and make sure ${booking.roomName} is closed for the walk-in.`,
            };
        }
        await createActivity({
            hotelId: booking.hotelId,
            recipientId: recipient?.id || null,
            direction: 'system',
            type: 'booking_decision',
            summary: `Cancelled ${guest}'s ${booking.roomName} booking and kept the dates unavailable`,
            status: bookingOutcomeActivityStatus(outcome),
            metadata: { bookingId: booking.id, outcome: 'owner_cancelled_for_walk_in' },
        });
        return {
            ok: true,
            message: `Done — I cancelled ${guest}'s ${booking.roomName} booking and kept those dates unavailable for the walk-in. ${guestAction}`,
        };
    }

    async function undoLastAvailabilityChange(recipient) {
        const action = await prisma.frontDeskAssistantPendingAction.findFirst({
            where: {
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                kind: 'block_availability',
                status: 'applied',
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!action) return { ok: false, message: 'There is no recent availability change to undo.' };
        const payload = action.payload || {};
        const dates = Array.isArray(payload.after) ? payload.after.map((entry) => entry.date) : [];
        if (!payload.roomName || !dates.length) {
            return { ok: false, message: 'That availability change cannot be undone automatically.' };
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${recipient.hotelId}), hashtext(${payload.roomName}))`;
            const room = await tx.manualRoom.findUnique({
                where: { hotelId_name: { hotelId: recipient.hotelId, name: payload.roomName } },
                include: { overrides: { where: { date: { in: dates } } } },
            });
            if (!room) return { ok: false, code: 'room_missing' };

            const currentByDate = Object.fromEntries((room.overrides || []).map((entry) => [entry.date, entry]));
            const afterByDate = Object.fromEntries((payload.after || []).map((entry) => [entry.date, entry]));
            const unchanged = dates.every((date) => {
                const current = currentByDate[date];
                const expected = afterByDate[date];
                return current
                    && Number(current.availableUnits) === Number(expected.availableUnits)
                    && !!current.closed === !!expected.closed;
            });
            const newBookingCount = await tx.booking.count({
                where: {
                    hotelId: recipient.hotelId,
                    roomName: payload.roomName,
                    status: { notIn: DEAD_BOOKING_STATUSES },
                    createdAt: { gt: action.appliedAt || action.createdAt },
                    checkinDate: { lt: new Date(`${addDaysIso(dates[dates.length - 1], 1)}T00:00:00.000Z`) },
                    checkoutDate: { gt: new Date(`${dates[0]}T00:00:00.000Z`) },
                },
            });
            if (!unchanged || newBookingCount > 0) return { ok: false, code: 'inventory_changed' };

            for (const previous of payload.before || []) {
                if (previous.exists) {
                    await tx.manualOverride.upsert({
                        where: { roomId_date: { roomId: room.id, date: previous.date } },
                        update: {
                            availableUnits: previous.availableUnits,
                            closed: !!previous.closed,
                        },
                        create: {
                            roomId: room.id,
                            date: previous.date,
                            availableUnits: previous.availableUnits,
                            closed: !!previous.closed,
                        },
                    });
                } else {
                    await tx.manualOverride.deleteMany({
                        where: { roomId: room.id, date: previous.date },
                    });
                }
            }
            await tx.frontDeskAssistantPendingAction.update({
                where: { id: action.id },
                data: { status: 'undone', undoneAt: new Date() },
            });
            return { ok: true };
        }, { maxWait: 5000, timeout: 15000 });

        if (!result.ok) {
            return {
                ok: false,
                message: result.code === 'inventory_changed'
                    ? 'Inventory changed after that message, so I did not risk overwriting it. Open Availability to review it.'
                    : 'I could not safely undo that change.',
            };
        }
        maybeNotifyRoomSoldOutToday(recipient.hotelId, payload.roomName).catch(() => {});
        return {
            ok: true,
            message: `Undone — ${payload.roomName} is back to its previous availability for ${dateRangeLabel(payload.startDate, payload.endDate)}.`,
        };
    }

    function deterministicIntent(body, rooms, todayIso, contextType) {
        return classifyDeterministicIntent(body, rooms, todayIso, contextType);
    }

    async function getRecentOutboundContext(recipient) {
        const activity = await prisma.frontDeskAssistantActivity.findFirst({
            where: {
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                direction: 'outbound',
                type: { in: ['booking_alert', 'inventory_check'] },
                createdAt: { gte: new Date(Date.now() - BOOKING_ACTION_TTL_MS) },
            },
            select: { type: true },
            orderBy: { createdAt: 'desc' },
        });
        return activity?.type || '';
    }

    async function extractIntentWithOpenAI({ body, rooms, timeZone, recipientId }) {
        if (!openai) return null;
        const todayIso = localTodayIso(timeZone);
        const roomNames = rooms.map((room) => room.name);
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: {
                intent: {
                    type: 'string',
                    enum: ['no_change', 'block_room', 'unknown', 'help'],
                },
                roomName: {
                    type: ['string', 'null'],
                    enum: [...roomNames, null],
                },
                startDate: { type: ['string', 'null'] },
                endDate: { type: ['string', 'null'] },
                units: { type: ['integer', 'null'], minimum: 1, maximum: 20 },
                clarification: { type: 'string' },
            },
            required: ['intent', 'roomName', 'startDate', 'endDate', 'units', 'clarification'],
        };
        const response = await openai.responses.create({
            model: openaiModel,
            store: false,
            reasoning: { effort: 'low' },
            max_output_tokens: 350,
            safety_identifier: crypto
                .createHash('sha256')
                .update(`frontdesk-assistant:${recipientId}`)
                .digest('hex'),
            input: [
                {
                    role: 'system',
                    content: [
                        'Extract one safe hotel inventory intent from an owner or staff text.',
                        `Today is ${todayIso} in ${timeZone}.`,
                        `Valid room names: ${roomNames.join(', ') || 'none'}.`,
                        'block_room means an unrecorded walk-in or outside booking consumed one or more sellable rooms.',
                        'Dates are occupied nights, inclusive. Resolve tonight/today/tomorrow to ISO dates.',
                        'Never infer cancellation of an existing guest. Never invent a room or date.',
                        'If room or dates are missing, use unknown and write one short clarification question.',
                    ].join('\n'),
                },
                { role: 'user', content: clampText(body, 1000) },
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: 'frontdesk_assistant_intent',
                    strict: true,
                    schema,
                },
            },
        });
        const raw = response.output_text || '';
        if (!raw) return null;
        return JSON.parse(raw);
    }

    async function understandInbound(recipient, body) {
        const [rooms, config, contextType] = await Promise.all([
            prisma.manualRoom.findMany({
                where: { hotelId: recipient.hotelId },
                select: { name: true, totalUnits: true },
                orderBy: { name: 'asc' },
            }),
            ensureConfig(recipient.hotelId),
            getRecentOutboundContext(recipient),
        ]);
        const todayIso = localTodayIso(config.timeZone || reportTimeZone);
        const deterministic = deterministicIntent(body, rooms, todayIso, contextType);
        if (deterministic) return { ...deterministic, todayIso, rooms };

        try {
            const extracted = await extractIntentWithOpenAI({
                body,
                rooms,
                timeZone: config.timeZone || reportTimeZone,
                recipientId: recipient.id,
            });
            return extracted ? { ...extracted, todayIso, rooms } : {
                intent: 'unknown',
                clarification: 'Tell me which room was taken and which night.',
                todayIso,
                rooms,
            };
        } catch (error) {
            console.error('frontdesk-assistant extraction:', error.message);
            return {
                intent: 'unknown',
                clarification: 'Tell me which room was taken and which night.',
                todayIso,
                rooms,
            };
        }
    }

    async function handleInbound(recipient, body) {
        const intent = await understandInbound(recipient, body);
        if (intent.intent === 'help') {
            return 'Tell me what changed, for example: “A walk-in took the Queen Room tonight.” Reply YES or NO to a booking check, or UNDO after an availability update.';
        }
        if (intent.intent === 'undo') {
            return (await undoLastAvailabilityChange(recipient)).message;
        }
        if (intent.intent === 'cancel_booking') {
            const action = await getPendingCancelAction(recipient.hotelId);
            if (!action) return 'There is no booking waiting to be cancelled.';
            return (await cancelBookingAndReplaceWithWalkIn(action, recipient)).message;
        }
        if (intent.intent === 'keep_booking') {
            const action = await getPendingCancelAction(recipient.hotelId);
            if (!action) return 'There is no booking waiting for that decision.';
            await prisma.frontDeskAssistantPendingAction.update({
                where: { id: action.id },
                data: { status: 'cancelled' },
            });
            return 'Kept — I did not cancel the online booking or change its inventory.';
        }
        if (intent.intent === 'booking_available') {
            const action = await getRecentBookingAction(recipient.hotelId, recipient.id);
            if (!action) return 'I do not have a recent booking waiting for an availability answer.';
            return (await markBookingAvailable(action)).message;
        }
        if (intent.intent === 'booking_taken') {
            const action = await getRecentBookingAction(recipient.hotelId, recipient.id);
            if (!action) {
                return 'Tell me which room was taken and the dates, for example: “Queen Room tonight.”';
            }
            const bookingId = String(action?.payload?.bookingId || '');
            const booking = bookingId
                ? await prisma.booking.findFirst({ where: { id: bookingId, hotelId: recipient.hotelId } })
                : null;
            if (String(booking?.status || '').toLowerCase() === 'pending' && applyBookingApprovalDecision) {
                const decision = await applyBookingApprovalDecision(booking.id, 'release', 'assistant');
                await prisma.frontDeskAssistantPendingAction.update({
                    where: { id: action.id },
                    data: { status: 'applied', appliedAt: new Date() },
                }).catch(() => {});
                if (decision?.ok) {
                    await createActivity({
                        hotelId: recipient.hotelId,
                        recipientId: recipient.id,
                        direction: 'system',
                        type: 'booking_decision',
                        summary: `${booking.roomName} released from your reply`,
                        status: bookingOutcomeActivityStatus(decision),
                        metadata: { bookingId: booking.id, outcome: 'owner_released' },
                    });
                }
                return decision?.ok
                    ? (fulfillmentFinished(decision)
                        ? `Handled — I freed ${booking.roomName}, released the $1 hold, and notified the guest.`
                        : `Released — I freed ${booking.roomName}. I’m finishing the $1 hold and guest notification now.`)
                    : 'I could not safely release that booking. Open Front Desk to review it.';
            }
            const pending = await createBookingCancellationQuestion(action, recipient);
            if (!pending) return 'That booking is no longer available to review.';
            const guest = [pending.booking.guestFirstName, pending.booking.guestLastName]
                .filter(Boolean).join(' ') || 'the guest';
            return `${pending.booking.roomName} is marked as taken. Reply CANCEL to cancel ${guest}'s online booking, notify them, release the payment hold, and keep the dates unavailable. Reply KEEP to leave it unchanged.`;
        }
        if (intent.intent === 'no_change') {
            return 'Got it — no availability changes recorded.';
        }
        if (intent.intent !== 'block_room') {
            return intent.clarification || 'Tell me which room was taken and which night.';
        }

        const room = intent.rooms.find((entry) =>
            String(entry.name).toLowerCase() === String(intent.roomName || '').toLowerCase()
        );
        const startDate = normalizeIsoDate(intent.startDate);
        const endDate = normalizeIsoDate(intent.endDate || intent.startDate);
        if (!room) return 'I could not match that room. Send the room name exactly as it appears in Availability.';
        if (!startDate || !endDate || endDate < startDate) {
            return 'Which night was taken? You can say “tonight,” “tomorrow,” or send the dates.';
        }

        const result = await consumeWalkInInventory({
            hotelId: recipient.hotelId,
            recipientId: recipient.id,
            roomName: room.name,
            startDate,
            endDate,
            units: intent.units || 1,
        });
        if (result.ok) {
            maybeNotifyRoomSoldOutToday(recipient.hotelId, room.name).catch(() => {});
            await createActivity({
                hotelId: recipient.hotelId,
                recipientId: recipient.id,
                direction: 'system',
                type: 'availability_update',
                summary: `${room.name} reduced by ${result.units} for ${dateRangeLabel(startDate, endDate)}`,
                metadata: { roomName: room.name, startDate, endDate, units: result.units },
            });
            return `Done — I removed ${result.units} ${result.units === 1 ? 'room' : 'rooms'} from ${room.name} for ${dateRangeLabel(startDate, endDate)}. Reply UNDO within 10 minutes if that was wrong.`;
        }
        if (result.code === 'conflict' && result.bookings?.length) {
            const action = await createCancellationQuestion({
                recipient,
                conflict: result,
                reason: 'Room was given to a walk-in',
            });
            const booking = result.bookings[0];
            const guest = [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'an online guest';
            return action
                ? `That room already overlaps ${guest}'s confirmed booking. Reply CANCEL to cancel and notify the guest, or KEEP to leave the booking unchanged.`
                : 'That room already has a confirmed online booking. Open Bookings to review the conflict.';
        }
        if (result.code === 'conflict') {
            return `${room.name} is already unavailable for those dates, so I made no change.`;
        }
        return result.code === 'room_not_found'
            ? 'I could not find that room in Availability.'
            : 'I could not safely update availability from that message.';
    }

    async function notifyNewBooking(bookingOrId) {
        const booking = typeof bookingOrId === 'string'
            ? await prisma.booking.findUnique({ where: { id: bookingOrId } }).catch(() => null)
            : bookingOrId;
        if (!booking?.hotelId) return { sent: 0 };
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            include: { frontDeskAssistant: true },
        }).catch(() => null);
        const config = hotel?.frontDeskAssistant;
        if (!hotel || !hotel.subscribed || !config?.enabled || !config.notifyNewBookings) return { sent: 0 };
        if (String(hotel.pms || '').toLowerCase() !== 'manual') return { sent: 0 };

        const recent = await prisma.frontDeskAssistantPendingAction.findMany({
            where: {
                hotelId: booking.hotelId,
                kind: 'review_booking',
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        let action = recent.find((entry) => String(entry.payload?.bookingId || '') === booking.id);
        if (!action) {
            action = await prisma.frontDeskAssistantPendingAction.create({
                data: {
                    hotelId: booking.hotelId,
                    kind: 'review_booking',
                    payload: { bookingId: booking.id },
                    expiresAt: new Date(Date.now() + BOOKING_ACTION_TTL_MS),
                },
            });
        }

        const stayDates = manualBookingStayDates(booking.checkinDate, booking.checkoutDate);
        const stay = stayDates.length
            ? dateRangeLabel(stayDates[0], stayDates[stayDates.length - 1])
            : 'upcoming stay';
        const amount = Number(booking.grandTotal || 0).toFixed(2);
        const isPending = String(booking.status || '').toLowerCase() === 'pending';
        const dueMs = new Date(booking.pendingUntil || 0).getTime() - Date.now();
        const minutes = Math.max(1, Math.round(dueMs / 60000));
        const fallbackRelease = String(booking.approvalNoResponseAction || '').toLowerCase() === 'release';
        const fallbackLine = fallbackRelease
            ? `No reply releases the request in ${minutes} min.`
            : `No reply keeps the booking in ${minutes} min.`;
        const body = isPending
            ? `Marketel Front Desk — ${hotel.name || 'Your property'}\nNew request: ${booking.roomName}, ${stay}, $${amount}.\nStill free? Reply YES to keep it or NO to release it. ${fallbackLine}`
            : `Marketel Front Desk — ${hotel.name || 'Your property'}\nNew booking: ${booking.roomName}, ${stay}, $${amount}.\nIs the room still available? Reply YES or NO.`;
        return sendToVerifiedRecipients(hotel, body, {
            type: 'booking_alert',
            summary: `New ${booking.roomName} booking · ${stay}`,
            metadata: {
                bookingId: booking.id,
                actionId: action.id,
            },
        });
    }

    async function notifyBookingDecision(bookingOrId, outcome) {
        const bookingId = typeof bookingOrId === 'string' ? bookingOrId : bookingOrId?.id;
        const booking = bookingId
            ? await prisma.booking.findUnique({ where: { id: bookingId } }).catch(() => bookingOrId)
            : bookingOrId;
        if (!booking?.hotelId) return { sent: 0 };
        const hotel = await prisma.hotelConfig.findUnique({
            where: { id: booking.hotelId },
            include: { frontDeskAssistant: true },
        }).catch(() => null);
        const config = hotel?.frontDeskAssistant;
        if (!hotel || !hotel.subscribed || !config?.enabled || config.notifyNewBookings === false) return { sent: 0 };
        const released = outcome === 'auto_released';
        const finished = String(booking.fulfillmentStatus || '').toLowerCase() === 'completed';
        const body = released
            ? (finished
                ? `Marketel Front Desk — ${hotel.name || 'Your property'}\nNobody answered, so I followed your rule: ${booking.roomName} was released, the $1 hold was voided, and the guest was notified.`
                : `Marketel Front Desk — ${hotel.name || 'Your property'}\nNobody answered, so I released ${booking.roomName}. I’m finishing the card release and guest notification now.`)
            : (finished
                ? `Marketel Front Desk — ${hotel.name || 'Your property'}\nNobody answered, so I followed your rule: ${booking.roomName} was confirmed and the guest was emailed.`
                : `Marketel Front Desk — ${hotel.name || 'Your property'}\nNobody answered, so I confirmed ${booking.roomName}. I’m finishing the guest email now.`);
        return sendToVerifiedRecipients(hotel, body, {
            type: 'booking_decision',
            summary: released ? `${booking.roomName} auto-released` : `${booking.roomName} auto-confirmed`,
            metadata: { bookingId: booking.id, outcome },
        });
    }

    async function sendInventoryCheck(hotel, config) {
        const body = `Marketel Front Desk — ${hotel.name || 'Your property'}\nAny walk-ins or outside bookings since our last check? Reply NO if nothing changed, or tell me the room and dates.`;
        const result = await sendToVerifiedRecipients(hotel, body, {
            type: 'inventory_check',
            summary: 'Availability check sent',
        });
        await createActivity({
            hotelId: hotel.id,
            direction: 'system',
            type: 'inventory_check',
            summary: result.sent
                ? `Availability check sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}`
                : 'Availability check had no verified recipients',
        });
        return result;
    }

    async function runScheduledChecks() {
        const now = new Date();
        await prisma.frontDeskAssistantPendingAction.updateMany({
            where: { status: 'pending', expiresAt: { lte: now } },
            data: { status: 'expired' },
        }).catch(() => {});

        const due = await prisma.frontDeskAssistantConfig.findMany({
            where: {
                enabled: true,
                nextCheckAt: { lte: now },
                checkFrequency: { in: ['smart', '2h', '4h', 'daily'] },
            },
            include: {
                hotel: {
                    select: { id: true, name: true, pms: true, subscribed: true },
                },
            },
            orderBy: { nextCheckAt: 'asc' },
            take: 50,
        });
        let sent = 0;
        for (const config of due) {
            const nextCheckAt = computeNextCheckAt(config, now);
            const claimed = await prisma.frontDeskAssistantConfig.updateMany({
                where: {
                    hotelId: config.hotelId,
                    enabled: true,
                    nextCheckAt: config.nextCheckAt,
                },
                data: {
                    nextCheckAt,
                    lastCheckAt: inQuietHours(config, now) ? config.lastCheckAt : now,
                },
            });
            if (claimed.count !== 1) continue;
            if (!config.hotel?.subscribed) {
                await prisma.frontDeskAssistantConfig.update({
                    where: { hotelId: config.hotelId },
                    data: { enabled: false, nextCheckAt: null },
                }).catch(() => {});
                continue;
            }
            if (inQuietHours(config, now)) {
                await prisma.frontDeskAssistantConfig.update({
                    where: { hotelId: config.hotelId },
                    data: { nextCheckAt: new Date(now.getTime() + 60 * 60 * 1000) },
                });
                continue;
            }
            if (String(config.hotel?.pms || '').toLowerCase() !== 'manual') continue;
            const result = await sendInventoryCheck(config.hotel, config).catch((error) => {
                console.error('frontdesk-assistant scheduled check:', error.message);
                return { sent: 0 };
            });
            sent += result.sent || 0;
        }
        return { due: due.length, sent };
    }

    function registerRoutes(app, { crmAuth, requireScopedHotelId }) {
        async function requireActiveSubscription(req, res, hotelId) {
            if (req.crmIsMasterPin) return true;
            const hotel = await prisma.hotelConfig.findUnique({
                where: { id: hotelId },
                select: { subscribed: true },
            });
            if (hotel?.subscribed) return true;
            res.status(402).json({
                success: false,
                message: 'Activate Marketel to connect Front Desk Assistant texting.',
            });
            return false;
        }

        app.get('/api/crm/frontdesk-assistant', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                res.json({ success: true, data: await serializeAssistant(hotelId) });
            } catch (error) {
                console.error('frontdesk-assistant:get:', error.message);
                res.status(500).json({ success: false, message: 'Could not load Front Desk Assistant.' });
            }
        });

        app.put('/api/crm/frontdesk-assistant', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                const current = await ensureConfig(hotelId);
                const frequency = ASSISTANT_FREQUENCIES.has(req.body?.checkFrequency)
                    ? req.body.checkFrequency
                    : current.checkFrequency;
                const enabled = req.body?.enabled === undefined ? current.enabled : !!req.body.enabled;
                if (enabled && !(await requireActiveSubscription(req, res, hotelId))) return;
                const dailyCheckTime = minutesFromClock(req.body?.dailyCheckTime) === null
                    ? current.dailyCheckTime
                    : req.body.dailyCheckTime;
                const quietHoursStart = req.body?.quietHoursStart === ''
                    ? null
                    : (minutesFromClock(req.body?.quietHoursStart) === null
                        ? current.quietHoursStart
                        : req.body.quietHoursStart);
                const quietHoursEnd = req.body?.quietHoursEnd === ''
                    ? null
                    : (minutesFromClock(req.body?.quietHoursEnd) === null
                        ? current.quietHoursEnd
                        : req.body.quietHoursEnd);
                const timeZone = String(req.body?.timeZone || current.timeZone || reportTimeZone).slice(0, 80);

                const hotel = await prisma.hotelConfig.findUnique({
                    where: { id: hotelId },
                    select: { pms: true, subscribed: true },
                });
                if (enabled && String(hotel?.pms || '').toLowerCase() !== 'manual') {
                    return res.status(409).json({
                        success: false,
                        message: 'Front Desk Assistant availability updates currently require Marketel-managed availability.',
                    });
                }
                const verifiedCount = await prisma.frontDeskAssistantRecipient.count({
                    where: {
                        hotelId,
                        active: true,
                        verifiedAt: { not: null },
                        consentAt: { not: null },
                    },
                });
                if (enabled && verifiedCount < 1) {
                    return res.status(409).json({
                        success: false,
                        message: 'Verify at least one phone before turning on Front Desk Assistant.',
                    });
                }
                if (enabled && !twilioReady && !smsDryRun) {
                    return res.status(503).json({
                        success: false,
                        message: 'Text messaging has not been configured for Marketel yet.',
                    });
                }

                const nextShape = {
                    ...current,
                    enabled,
                    checkFrequency: frequency,
                    dailyCheckTime,
                    quietHoursStart,
                    quietHoursEnd,
                    timeZone,
                    notifyNewBookings: req.body?.notifyNewBookings === undefined
                        ? current.notifyNewBookings
                        : !!req.body.notifyNewBookings,
                };
                const config = await prisma.frontDeskAssistantConfig.update({
                    where: { hotelId },
                    data: {
                        enabled,
                        checkFrequency: frequency,
                        dailyCheckTime,
                        quietHoursStart,
                        quietHoursEnd,
                        timeZone,
                        notifyNewBookings: nextShape.notifyNewBookings,
                        nextCheckAt: enabled ? computeNextCheckAt(nextShape) : null,
                    },
                });
                await createActivity({
                    hotelId,
                    direction: 'system',
                    type: 'settings',
                    summary: enabled ? 'Front Desk Assistant turned on' : 'Front Desk Assistant turned off',
                });
                res.json({ success: true, data: { ...(await serializeAssistant(hotelId)), config } });
            } catch (error) {
                console.error('frontdesk-assistant:save:', error.message);
                res.status(500).json({ success: false, message: 'Could not save Front Desk Assistant.' });
            }
        });

        app.post('/api/crm/frontdesk-assistant/recipients', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                if (!(await requireActiveSubscription(req, res, hotelId))) return;
                const name = clampText(req.body?.name, 80);
                const role = clampText(req.body?.role, 80);
                const phoneE164 = normalizePhone(req.body?.phone);
                if (!name) return res.status(400).json({ success: false, message: 'Enter this person’s name.' });
                if (!phoneE164) {
                    return res.status(400).json({
                        success: false,
                        message: 'Enter a valid US or international mobile number.',
                    });
                }
                const existing = await prisma.frontDeskAssistantRecipient.findUnique({
                    where: { hotelId_phoneE164: { hotelId, phoneE164 } },
                });
                if (!existing) {
                    const count = await prisma.frontDeskAssistantRecipient.count({
                        where: { hotelId, active: true },
                    });
                    if (count >= MAX_RECIPIENTS) {
                        return res.status(409).json({
                            success: false,
                            message: `Front Desk can text up to ${MAX_RECIPIENTS} people.`,
                        });
                    }
                }
                const recipient = await prisma.frontDeskAssistantRecipient.upsert({
                    where: { hotelId_phoneE164: { hotelId, phoneE164 } },
                    update: {
                        name,
                        role: role || null,
                        active: true,
                        verifiedAt: existing?.active && existing?.consentAt ? existing.verifiedAt : null,
                        consentAt: existing?.active && existing?.consentAt ? existing.consentAt : null,
                    },
                    create: {
                        hotelId,
                        name,
                        role: role || null,
                        phoneE164,
                        priority: existing?.priority || 0,
                    },
                });
                const code = recipient.verifiedAt ? null : await sendVerification(recipient);
                res.json({
                    success: true,
                    recipientId: recipient.id,
                    verificationSent: !recipient.verifiedAt,
                    ...(smsDryRun && process.env.NODE_ENV !== 'production' ? { developmentCode: code } : {}),
                    data: await serializeAssistant(hotelId),
                });
            } catch (error) {
                console.error('frontdesk-assistant:recipient:', error.message);
                res.status(error.statusCode || 500).json({
                    success: false,
                    message: error.message || 'Could not add that phone.',
                });
            }
        });

        app.post('/api/crm/frontdesk-assistant/recipients/:id/resend', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                if (!(await requireActiveSubscription(req, res, hotelId))) return;
                const recipient = await prisma.frontDeskAssistantRecipient.findFirst({
                    where: { id: String(req.params.id || ''), hotelId, active: true },
                });
                if (!recipient) return res.status(404).json({ success: false, message: 'Phone not found.' });
                const code = await sendVerification(recipient);
                res.json({
                    success: true,
                    ...(smsDryRun && process.env.NODE_ENV !== 'production' ? { developmentCode: code } : {}),
                });
            } catch (error) {
                res.status(error.statusCode || 500).json({
                    success: false,
                    message: error.message || 'Could not resend the code.',
                });
            }
        });

        app.post('/api/crm/frontdesk-assistant/recipients/:id/verify', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                if (!(await requireActiveSubscription(req, res, hotelId))) return;
                const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
                const recipient = await prisma.frontDeskAssistantRecipient.findFirst({
                    where: { id: String(req.params.id || ''), hotelId, active: true },
                });
                if (!recipient) return res.status(404).json({ success: false, message: 'Phone not found.' });
                if (
                    code.length !== 6
                    || !recipient.verificationCodeHash
                    || !recipient.verificationExpiresAt
                    || recipient.verificationExpiresAt.getTime() <= Date.now()
                ) {
                    return res.status(400).json({ success: false, message: 'That code is invalid or expired.' });
                }
                if (recipient.verificationAttempts >= 5) {
                    return res.status(429).json({ success: false, message: 'Request a new verification code.' });
                }
                const valid = safeEqual(
                    recipient.verificationCodeHash,
                    verificationHash(recipient.id, code)
                );
                if (!valid) {
                    await prisma.frontDeskAssistantRecipient.update({
                        where: { id: recipient.id },
                        data: { verificationAttempts: { increment: 1 } },
                    });
                    return res.status(400).json({ success: false, message: 'That code is incorrect.' });
                }
                await prisma.frontDeskAssistantRecipient.update({
                    where: { id: recipient.id },
                    data: {
                        verifiedAt: new Date(),
                        consentAt: new Date(),
                        verificationCodeHash: null,
                        verificationExpiresAt: null,
                        verificationAttempts: 0,
                    },
                });
                await createActivity({
                    hotelId,
                    recipientId: recipient.id,
                    direction: 'system',
                    type: 'verification',
                    summary: `${recipient.name} connected`,
                });
                res.json({ success: true, data: await serializeAssistant(hotelId) });
            } catch (error) {
                res.status(500).json({ success: false, message: 'Could not verify that phone.' });
            }
        });

        app.delete('/api/crm/frontdesk-assistant/recipients/:id', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                const recipient = await prisma.frontDeskAssistantRecipient.findFirst({
                    where: { id: String(req.params.id || ''), hotelId },
                });
                if (!recipient) return res.status(404).json({ success: false, message: 'Phone not found.' });
                await prisma.frontDeskAssistantRecipient.update({
                    where: { id: recipient.id },
                    data: { active: false, consentAt: null },
                });
                const verifiedRemaining = await prisma.frontDeskAssistantRecipient.count({
                    where: {
                        hotelId,
                        active: true,
                        verifiedAt: { not: null },
                        consentAt: { not: null },
                    },
                });
                if (verifiedRemaining === 0) {
                    await prisma.frontDeskAssistantConfig.update({
                        where: { hotelId },
                        data: { enabled: false, nextCheckAt: null },
                    }).catch(() => {});
                }
                res.json({ success: true, data: await serializeAssistant(hotelId) });
            } catch (error) {
                res.status(500).json({ success: false, message: 'Could not remove that phone.' });
            }
        });

        app.post('/api/crm/frontdesk-assistant/test', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                if (!(await requireActiveSubscription(req, res, hotelId))) return;
                const hotel = await prisma.hotelConfig.findUnique({
                    where: { id: hotelId },
                    select: { id: true, name: true },
                });
                const result = await sendToVerifiedRecipients(
                    hotel,
                    `Marketel Front Desk is connected to ${hotel?.name || 'your property'}. Reply HELP anytime to see what I can do.`,
                    { type: 'test', summary: 'Test text sent' }
                );
                if (!result.sent) {
                    return res.status(409).json({
                        success: false,
                        message: 'Verify at least one phone before sending a test.',
                    });
                }
                res.json({ success: true, sent: result.sent, data: await serializeAssistant(hotelId) });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message || 'Could not send the test.' });
            }
        });

        app.post('/api/crm/frontdesk-assistant/check-now', crmAuth, async (req, res) => {
            try {
                const hotelId = requireScopedHotelId(req, res);
                if (!hotelId) return;
                if (!(await requireActiveSubscription(req, res, hotelId))) return;
                const [hotel, config] = await Promise.all([
                    prisma.hotelConfig.findUnique({
                        where: { id: hotelId },
                        select: { id: true, name: true, pms: true },
                    }),
                    ensureConfig(hotelId),
                ]);
                const result = await sendInventoryCheck(hotel, config);
                res.json({ success: true, sent: result.sent, data: await serializeAssistant(hotelId) });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message || 'Could not send that check.' });
            }
        });

        app.post(
            '/api/twilio/frontdesk/inbound',
            express.urlencoded({ extended: false }),
            async (req, res) => {
                res.type('text/xml');
                try {
                    if (!validateTwilioWebhook(req, twilioInboundWebhookUrl)) {
                        return res.status(403).send(twimlMessage(''));
                    }
                    const from = normalizePhone(req.body?.From);
                    const body = clampText(req.body?.Body, 2000);
                    const providerMessageId = clampText(req.body?.MessageSid, 80) || null;
                    if (!from || !body) return res.send(twimlMessage(''));

                    const resolved = await resolveInboundRecipient(from, body);
                    if (resolved.ambiguous) {
                        const names = (resolved.matches || []).map((entry) => entry.hotel?.name).filter(Boolean);
                        return res.send(twimlMessage(
                            `This phone is connected to multiple properties. Include the property name: ${names.join(', ')}.`
                        ));
                    }
                    const recipient = resolved.recipient;
                    if (!recipient) return res.send(twimlMessage('This number is not connected to Marketel Front Desk.'));

                    const upper = body.trim().toUpperCase();
                    if (upper === 'STOP' || upper === 'UNSUBSCRIBE' || upper === 'CANCEL SMS') {
                        await prisma.frontDeskAssistantRecipient.update({
                            where: { id: recipient.id },
                            data: { active: false, consentAt: null, lastInboundAt: new Date() },
                        });
                        await prisma.frontDeskAssistantConfig.update({
                            where: { hotelId: recipient.hotelId },
                            data: { enabled: false, nextCheckAt: null },
                        }).catch(() => {});
                        return res.send(twimlMessage('You are unsubscribed from Marketel Front Desk texts.'));
                    }

                    await Promise.all([
                        prisma.frontDeskAssistantRecipient.update({
                            where: { id: recipient.id },
                            data: { lastInboundAt: new Date() },
                        }),
                        createActivity({
                            hotelId: recipient.hotelId,
                            recipientId: recipient.id,
                            direction: 'inbound',
                            type: 'reply',
                            body,
                            summary: body,
                            providerMessageId,
                        }),
                    ]);
                    const reply = await handleInbound(recipient, body);
                    await createActivity({
                        hotelId: recipient.hotelId,
                        recipientId: recipient.id,
                        direction: 'outbound',
                        type: 'assistant_reply',
                        body: reply,
                        summary: reply,
                        status: 'queued',
                    });
                    return res.send(twimlMessage(reply));
                } catch (error) {
                    console.error('frontdesk-assistant inbound:', error.message);
                    return res.status(200).send(twimlMessage(
                        'I could not safely apply that message. Open Front Desk or try again with the room name and dates.'
                    ));
                }
            }
        );

        app.post(
            '/api/twilio/frontdesk/status',
            express.urlencoded({ extended: false }),
            async (req, res) => {
                try {
                    if (!validateTwilioWebhook(req, twilioStatusCallbackUrl)) {
                        return res.sendStatus(403);
                    }
                    const sid = clampText(req.body?.MessageSid, 80);
                    const status = clampText(req.body?.MessageStatus, 40).toLowerCase();
                    if (sid && status) {
                        await prisma.frontDeskAssistantActivity.updateMany({
                            where: { providerMessageId: sid },
                            data: { status },
                        });
                    }
                    res.sendStatus(204);
                } catch (error) {
                    res.sendStatus(204);
                }
            }
        );
    }

    return {
        registerRoutes,
        notifyNewBooking,
        notifyBookingDecision,
        runScheduledChecks,
        countReachableBookingRecipients,
        isMessagingConfigured: () => twilioReady || smsDryRun,
    };
}

module.exports = {
    createFrontDeskAssistant,
    classifyDeterministicIntent,
};
