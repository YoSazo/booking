/**
 * One-time recovery for legacy owners who completed setup before automatic
 * preview email existed.
 *
 * Dry run: node send-comeback-emails.js
 * Send:    node send-comeback-emails.js --send
 */
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const prisma = new PrismaClient();
const shouldSend = process.argv.includes('--send');
const secret = String(process.env.MAGIC_LINK_SECRET || process.env.SESSION_SECRET || '').trim();
const origin = String(process.env.MARKETEL_FRONTDESK_ORIGIN || 'https://bookmarketel.com').replace(/\/$/, '');
const expiryMs = 7 * 24 * 60 * 60 * 1000;

function magicToken(email, hotelId) {
  if (secret.length < 32) throw new Error('Set a stable 32+ character MAGIC_LINK_SECRET before generating recovery links.');
  const payload = Buffer.from(JSON.stringify({
    purpose: 'frontdesk-magic',
    email: String(email || '').trim().toLowerCase(),
    hotelId: String(hotelId || '').trim(),
    exp: Date.now() + expiryMs,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function main() {
  if (secret.length < 32) throw new Error('MAGIC_LINK_SECRET is missing or too short. No email was sent.');
  const smtpPassword = process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP;
  if (shouldSend && (!process.env.BREVO_SMTP_HOST || !process.env.BREVO_SMTP_LOGIN || !smtpPassword)) {
    throw new Error('Brevo SMTP is incomplete. No email was sent.');
  }
  const transporter = shouldSend ? nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: process.env.BREVO_SMTP_LOGIN, pass: smtpPassword },
  }) : null;

  const hotels = await prisma.hotelConfig.findMany({
    where: { setupComplete: true, subscribed: false, ownerEmail: { not: null } },
    include: {
      domains: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  const priorEvents = hotels.length ? await prisma.funnelEvent.findMany({
    where: { eventName: 'LegacyComebackEmailSent', hotelId: { in: hotels.map(hotel => hotel.id) } },
    select: { hotelId: true },
  }) : [];
  const sentHotelIds = new Set(priorEvents.map(event => event.hotelId));
  const pending = hotels.filter(hotel => !sentHotelIds.has(hotel.id));
  console.log(`${shouldSend ? 'Sending to' : 'Dry run:'} ${pending.length} eligible properties (${hotels.length - pending.length} already sent).`);

  let sent = 0;
  for (const hotel of pending) {
    const email = String(hotel.ownerEmail || '').trim().toLowerCase();
    if (!email) continue;
    const name = hotel.name || 'Your property';
    const domain = hotel.domains[0]?.domain || '';
    const params = new URLSearchParams({
      hotelId: hotel.id,
      magic: magicToken(email, hotel.id),
      reveal: 'resume',
    });
    const resumeUrl = `${origin}/frontdesk?${params.toString()}`;
    console.log(`- ${hotel.id} / ${email}`);
    if (!shouldSend) continue;

    await transporter.sendMail({
      from: '"Marketel" <support@bookmarketel.com>',
      to: email,
      subject: `${name} is still saved in Marketel`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:38px 20px;color:#19231d">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2e7d5b">Your work is saved</div>
        <h1 style="font-size:23px;line-height:1.25;margin:8px 0 11px">Continue ${escapeHtml(name)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#5d6a62;margin:0 0 22px">Your Marketel preview is waiting. The secure button returns to the exact walkthrough stage you left—no PIN and no need to rebuild anything.</p>
        <a href="${escapeHtml(resumeUrl)}" style="display:block;padding:15px 18px;border-radius:11px;background:#2e7d5b;color:#fff;text-decoration:none;font-size:15px;font-weight:750;text-align:center">Continue my walkthrough</a>
        ${domain ? `<p style="font-size:12px;color:#89938d;margin:18px 0 0">Booking-page preview: ${escapeHtml(domain)}</p>` : ''}
        <p style="font-size:12px;color:#89938d;margin:10px 0 0">This is a preview, not a payment confirmation. Reply if you need help.</p>
      </div>`,
      text: `Your Marketel preview is saved. Continue here: ${resumeUrl}\n\nThis is a preview, not a payment confirmation.`,
    });
    await prisma.funnelEvent.create({
      data: {
        hotelId: hotel.id,
        eventName: 'LegacyComebackEmailSent',
        eventId: `marketel-legacy-comeback.${hotel.id}`,
        guestEmail: email,
        surface: 'email',
        pagePath: '/frontdesk',
      },
    });
    sent += 1;
  }
  console.log(shouldSend ? `Sent ${sent}.` : 'Nothing sent. Re-run with --send after reviewing the list.');
}

main()
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
