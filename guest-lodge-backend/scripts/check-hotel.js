require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const h = await p.hotelConfig.findUnique({ where: { id: 'guest-lodge-minot' } });
    if (h) {
        console.log('EXISTS:', h.name, '| active:', h.active, '| setupComplete:', h.setupComplete);
        if (!h.setupComplete) {
            await p.hotelConfig.update({ where: { id: 'guest-lodge-minot' }, data: { setupComplete: true } });
            console.log('Set setupComplete = true');
        }
    } else {
        console.log('NOT FOUND - creating...');
        await p.hotelConfig.create({
            data: { id: 'guest-lodge-minot', name: 'Guest Lodge Minot', pms: 'manual', active: true, setupComplete: true }
        });
        console.log('Created guest-lodge-minot');
    }
    await p.$disconnect();
}
main();
