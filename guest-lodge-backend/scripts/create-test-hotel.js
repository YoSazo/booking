require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    const token = crypto.randomBytes(16).toString('hex');
    
    // Delete if exists from previous test
    try { await prisma.hotelConfig.delete({ where: { id: 'demo-test-hotel' } }); } catch (e) {}
    
    await prisma.hotelConfig.create({
        data: {
            id: 'demo-test-hotel',
            name: 'Demo Hotel',
            pms: 'manual',
            setupToken: token,
            active: false,
        }
    });
    
    console.log('✅ Test hotel created!');
    console.log('Setup URL: http://localhost:3001/setup/' + token);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
