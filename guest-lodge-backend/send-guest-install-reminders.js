/**
 * Send pre-check-in "add to home screen" reminder emails.
 * Run manually: node send-guest-install-reminders.js
 * Or schedule hourly on Render cron.
 */
require('dotenv').config();

// Re-use server helpers without starting HTTP
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

const emailTransporter = process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP
  ? nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: process.env.BREVO_SMTP_LOGIN, pass: process.env.BREVO_SMTP },
    })
  : null;

function guestInstallEmailBlockHtml({ hotelName, installUrl }) {
  const safeName = hotelName || 'your hotel';
  return `<div style="background:linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%);border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:6px;">📱 Add ${safeName} to your phone</div>
      <p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.55;">Message the front desk, get check-in updates, and book direct next time — like a real app, no app store.</p>
      <a href="${installUrl}" style="display:inline-block;background:#ffffff;color:#1a5c3f;text-decoration:none;font-size:14px;font-weight:700;padding:13px 24px;border-radius:10px;">Add to Home Screen →</a>
      <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:12px;line-height:1.5;">On iPhone: open the link in Safari → Share → Add to Home Screen</div>
    </div>`;
}

async function sendReminder({ guestEmail, guestName, hotelName, hotelPhone, roomName, checkin, installUrl, bookingUrl }) {
  const checkinStr = new Date(checkin).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const phoneStr = hotelPhone ? ` — ${hotelPhone}` : '.';
  const installBlock = guestInstallEmailBlockHtml({ hotelName, installUrl });
  const html = `<!DOCTYPE html><html><body style="margin:0;font-family:sans-serif;background:#f8f9fa;"><table width="100%"><tr><td align="center" style="padding:40px 20px;"><table width="100%" style="max-width:480px;background:#fff;border-radius:16px;"><tr><td style="background:#1a2b22;padding:24px;text-align:center;color:#fff;"><h1 style="margin:0;font-size:20px;">Check-in tomorrow at ${hotelName}</h1></td></tr><tr><td style="padding:28px;"><p>Hi ${guestName},</p><p>You're checking in <strong>${checkinStr}</strong>${roomName ? ` in <strong>${roomName}</strong>` : ''}.</p>${installBlock}${bookingUrl ? `<p style="text-align:center;"><a href="${bookingUrl}">View reservation</a></p>` : ''}<p style="font-size:13px;color:#6b7280;">Questions? Contact the hotel${phoneStr}</p></td></tr></table></td></tr></table></body></html>`;
  await emailTransporter.sendMail({
    from: `"${hotelName}" <support@bookmarketel.com>`,
    to: guestEmail,
    subject: `Add ${hotelName} to your phone before check-in`,
    html,
  });
}

async function main() {
  if (!emailTransporter) {
    console.log('Email not configured — exiting.');
    process.exit(0);
  }
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(windowStart.getHours() + 12);
  const windowEnd = new Date(now);
  windowEnd.setHours(windowEnd.getHours() + 36);

  const bookings = await prisma.booking.findMany({
    where: {
      guestInstallReminderSentAt: null,
      guestEmail: { not: '' },
      checkinDate: { gte: windowStart, lte: windowEnd },
      status: { not: 'cancelled' },
    },
    take: 100,
  });

  console.log(`Found ${bookings.length} bookings in reminder window.`);
  let sent = 0;

  for (const b of bookings) {
    const code = b.pmsConfirmationCode || b.ourReservationCode;
    const hasPush = await prisma.pushSubscription.findFirst({
      where: { hotelId: b.hotelId, reservationCode: code, source: 'guest' },
    });
    if (hasPush) {
      await prisma.booking.update({ where: { id: b.id }, data: { guestInstallReminderSentAt: new Date() } });
      continue;
    }

    const hotel = await prisma.hotelConfig.findUnique({ where: { id: b.hotelId }, select: { name: true, phone: true } });
    const domain = await prisma.hotelDomain.findFirst({ where: { hotelId: b.hotelId }, orderBy: { isPrimary: 'desc' } });
    if (!domain?.domain) continue;

    const base = `https://${domain.domain}`;
    try {
      await sendReminder({
        guestEmail: b.guestEmail,
        guestName: [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ') || 'there',
        hotelName: hotel?.name || 'Your Hotel',
        hotelPhone: hotel?.phone || '',
        roomName: b.roomName,
        checkin: b.checkinDate,
        installUrl: `${base}/install?code=${encodeURIComponent(code)}&ref=checkin-reminder`,
        bookingUrl: `${base}/booking/${encodeURIComponent(code)}`,
      });
      await prisma.booking.update({ where: { id: b.id }, data: { guestInstallReminderSentAt: new Date() } });
      sent++;
      console.log(`  ✓ ${b.guestEmail} (${hotel?.name})`);
    } catch (e) {
      console.error(`  ✗ ${b.guestEmail}:`, e.message);
    }
  }

  console.log(`Done. Sent ${sent} reminder(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
