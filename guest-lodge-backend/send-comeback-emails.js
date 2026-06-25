/**
 * Send "come back" emails to hotel owners who completed setup but haven't subscribed.
 * Run with: node send-comeback-emails.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const prisma = new PrismaClient();

const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || process.env.SESSION_SECRET || 'marketel-magic-link-fallback-secret';
const MAGIC_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for comeback emails

function generateMagicToken(email, hotelId) {
  const payload = JSON.stringify({ email, hotelId, exp: Date.now() + MAGIC_LINK_EXPIRY_MS });
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(MAGIC_LINK_SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  // Setup email transporter (Brevo SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP,
    },
  });

  // Find all hotels that completed setup but haven't subscribed
  const hotels = await prisma.hotelConfig.findMany({
    where: {
      setupComplete: true,
      subscribed: false,
      ownerEmail: { not: null },
    },
    include: {
      domains: { where: { isPrimary: true }, take: 1 },
    },
  });

  console.log(`Found ${hotels.length} hotels to email.`);

  let sent = 0;
  let skipped = 0;

  for (const hotel of hotels) {
    const email = hotel.ownerEmail;
    if (!email) { skipped++; continue; }

    const domain = hotel.domains[0]?.domain || (hotel.id + '.mktel.co');
    const baseUrl = 'https://' + domain;
    const token = generateMagicToken(email, hotel.id);
    const magicUrl = baseUrl + '/frontdesk?magic=' + encodeURIComponent(token);
    const hotelName = hotel.name || 'Your Hotel';

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 16px;">Hey ${hotelName} 👋</h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Your booking engine is live and ready for guests. We've made some updates to make everything smoother — your dashboard is waiting.</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">All you need to do is share your booking link. Add it to your Google Business Profile, text it to a guest, or put it on your website. That's it.</p>
      
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Booking Page</div>
        <div style="font-size:15px;font-weight:700;color:#2E7D5B;word-break:break-all;">${domain}</div>
      </div>

      <a href="${magicUrl}" style="display:block;text-align:center;padding:16px 24px;background:#2E7D5B;color:white;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;margin-bottom:16px;">Open My Dashboard →</a>
      
      <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;text-align:center;">This link logs you in automatically — no PIN needed.</p>
      
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">Marketel — Direct booking engines for hotels.<br>Reply to this email if you need help.</p>
    </div>`;

    try {
      await transporter.sendMail({
        from: '"Marketel" <support@bookmarketel.com>',
        to: email,
        subject: `${hotelName} — your booking page is ready for guests`,
        html,
        text: `Hey ${hotelName}!\n\nYour booking engine is live and ready for guests. We've made some updates to make everything smoother.\n\nYour booking page: ${domain}\n\nOpen your dashboard: ${magicUrl}\n\nAll you need to do is share your booking link. Add it to your Google Business Profile, text it to a guest, or put it on your website.\n\n— Marketel`,
      });
      sent++;
      console.log(`✅ Sent to ${email} (${hotelName})`);
    } catch (e) {
      console.error(`❌ Failed for ${email}: ${e.message}`);
      skipped++;
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! Sent: ${sent}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
