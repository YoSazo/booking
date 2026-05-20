require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

async function main() {
    // Set a known PIN for hotel-cd588cf6
    const pin = 'test1234';
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    
    try {
        await p.crmPin.upsert({
            where: { hotelId_pinHash: { hotelId: 'hotel-cd588cf6', pinHash } },
            create: { hotelId: 'hotel-cd588cf6', pinHash, label: 'Test PIN' },
            update: { active: true },
        });
        console.log('PIN set for hotel-cd588cf6: test1234');
    } catch (e) {
        console.error(e.message);
    }
    await p.$disconnect();
}
main();
