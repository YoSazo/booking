const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const h = await prisma.hotelDomain.findMany({ where: { domain: 'sunsetinn1.mktel.co' } });
  console.log('Domain records:', h);
  const p = await prisma.crmPin.findMany({ where: { hotelId: 'hotel-26f0edca' } });
  console.log('PINs:', p);
}
main().catch(console.error).finally(() => prisma.$disconnect());
