require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

// Inspect (and optionally set) the Front Desk PIN for a hotel.
//
//   node scripts/hotel-pin.js <hotelId>            → show hotel + domains + PIN status
//   node scripts/hotel-pin.js <hotelId> <newPin>   → also set a known active PIN
//
// PINs are stored hashed, so existing PINs cannot be read back — only set.

function hash(pin) {
  return crypto.createHash('sha256').update(String(pin || '').trim()).digest('hex');
}

async function main() {
  const hotelId = (process.argv[2] || '').trim();
  const newPin = (process.argv[3] || '').trim();

  if (!hotelId) {
    console.error('Usage: node scripts/hotel-pin.js <hotelId> [newPin]');
    process.exit(1);
  }

  const hotel = await p.hotelConfig.findUnique({
    where: { id: hotelId },
    include: { domains: { orderBy: { domain: 'asc' } } },
  });

  if (!hotel) {
    console.error(`No hotel found with id: ${hotelId}`);
    await p.$disconnect();
    process.exit(1);
  }

  console.log(`Hotel:  ${hotel.name || '(unnamed)'} (${hotel.id})`);
  console.log(`Active: ${hotel.active}`);
  console.log(`Domains:${hotel.domains.length ? '' : ' (none — login by domain will not resolve this hotel)'}`);
  hotel.domains.forEach(d => console.log(`  - ${d.domain}${d.isPrimary ? ' [primary]' : ''}`));

  const pins = await p.crmPin.findMany({
    where: { hotelId },
    select: { label: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const activeCount = pins.filter(x => x.active).length;
  console.log(`PINs:   ${pins.length} total, ${activeCount} active`);
  pins.forEach(x => console.log(`  - ${x.active ? 'ACTIVE  ' : 'inactive'} ${x.label || ''} (${x.createdAt.toISOString().slice(0, 10)})`));

  if (newPin) {
    await p.crmPin.upsert({
      where: { hotelId_pinHash: { hotelId, pinHash: hash(newPin) } },
      create: { hotelId, pinHash: hash(newPin), label: 'Manual reset', active: true },
      update: { active: true },
    });
    console.log(`\n✅ PIN set for ${hotelId}: ${newPin}`);
  } else {
    console.log('\n(No newPin provided — nothing changed. Pass a second arg to set one.)');
  }

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  await p.$disconnect();
  process.exit(1);
});
