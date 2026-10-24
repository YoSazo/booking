'use strict';

// Texts the owner's own phone (OWNER_ALERT_PHONE, in +1… form) from the Front
// Desk Twilio sender. Returns null, and nothing is texted, until both are set.
const twilio = require('twilio');

function ownerTexter(env = process.env, client = null) {
  const to = String(env.OWNER_ALERT_PHONE || '').trim();
  const sid = String(env.TWILIO_ACCOUNT_SID || '').trim(), token = String(env.TWILIO_AUTH_TOKEN || '').trim();
  const service = String(env.TWILIO_MESSAGING_SERVICE_SID || '').trim(), from = String(env.TWILIO_PHONE_NUMBER || '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(to) || !sid || !token || !(service || from)) return null;
  const messages = (client || twilio(sid, token)).messages;
  return body => messages.create({ to, body, ...(service ? { messagingServiceSid: service } : { from }) });
}

module.exports = { ownerTexter };
