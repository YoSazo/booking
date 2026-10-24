'use strict';

// Texts the owner's own phone from the Front Desk Twilio sender. The number is
// OWNER_ALERT_PHONE (+1… form) when set; otherwise the owner's verified Front
// Desk phone at their own hotel, so it never has to live in this public repo.
// Returns null, and nothing is texted, until Twilio and a phone source exist.
const twilio = require('twilio');

const OWNER_HOTEL_ID = 'hotel-a39be0df'; // Jack's Inn, the owner's own hotel
const E164 = /^\+[1-9]\d{7,14}$/;

function ownerTexter(env = process.env, { client = null, prisma = null } = {}) {
  const fixed = String(env.OWNER_ALERT_PHONE || '').trim();
  const sid = String(env.TWILIO_ACCOUNT_SID || '').trim(), token = String(env.TWILIO_AUTH_TOKEN || '').trim();
  const service = String(env.TWILIO_MESSAGING_SERVICE_SID || '').trim(), from = String(env.TWILIO_PHONE_NUMBER || '').trim();
  if (!sid || !token || !(service || from) || !(E164.test(fixed) || prisma?.frontDeskAssistantRecipient)) return null;
  const messages = (client || twilio(sid, token)).messages;
  const ownerPhone = async () => E164.test(fixed) ? fixed : (await prisma.frontDeskAssistantRecipient.findFirst({
    where: { hotelId: OWNER_HOTEL_ID, role: { equals: 'owner', mode: 'insensitive' }, verifiedAt: { not: null }, consentAt: { not: null } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], select: { phoneE164: true },
  }))?.phoneE164;
  return async body => {
    const to = await ownerPhone();
    if (!E164.test(to || '')) throw new Error('No owner phone to text.');
    return messages.create({ to, body, ...(service ? { messagingServiceSid: service } : { from }) });
  };
}

module.exports = { ownerTexter, OWNER_HOTEL_ID };
