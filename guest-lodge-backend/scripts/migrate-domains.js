require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const vercelToken = process.env.VERCEL_TOKEN;
const vercelProjectId = process.env.VERCEL_PROJECT_ID;

if (!vercelToken || !vercelProjectId) {
    console.error('❌ VERCEL_TOKEN and VERCEL_PROJECT_ID must be set in your environment/.env file.');
    process.exit(1);
}

function getSlug(hotelName) {
    return (hotelName || 'hotel')
        .toLowerCase()
        .replace(/['\u2019]s\b/g, 's')
        .replace(/['\u2019]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

async function run() {
    console.log('🔍 Fetching active hotels from database...');
    const hotels = await prisma.hotelConfig.findMany({
        where: { active: true }
    });

    console.log(`Found ${hotels.length} active hotels. Starting domain migration to mktel.co...\n`);

    for (const hotel of hotels) {
        if (!hotel.name) {
            console.log(`⚠️ Skipping hotel ID ${hotel.id} because it has no name.`);
            continue;
        }

        const slug = getSlug(hotel.name);
        const assignedDomain = slug + '.mktel.co';
        console.log(`Processing: "${hotel.name}" (ID: ${hotel.id}) -> Domain: ${assignedDomain}`);

        // 1. Add to Vercel via API
        try {
            const vercelRes = await axios.post(
                `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
                { name: assignedDomain },
                { headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' } }
            );
            console.log(`  ✅ Vercel: Domain successfully linked or already exists: ${assignedDomain}`);
        } catch (vercelErr) {
            const errMsg = vercelErr.response?.data?.error?.message || vercelErr.message;
            console.log(`  ⚠️ Vercel: Warning/Error adding domain: ${errMsg}`);
        }

        // 2. Add HotelDomain record to DB if not exists
        try {
            const existing = await prisma.hotelDomain.findUnique({
                where: { domain: assignedDomain }
            });

            if (!existing) {
                await prisma.hotelDomain.create({
                    data: {
                        hotelId: hotel.id,
                        domain: assignedDomain,
                        isPrimary: true
                    }
                });
                console.log(`  ✅ DB: Created domain record for ${assignedDomain}`);
            } else {
                console.log(`  ℹ️ DB: Domain record already exists for ${assignedDomain}`);
            }
        } catch (dbErr) {
            console.error(`  ❌ DB Error: ${dbErr.message}`);
        }

        console.log('---');
    }

    console.log('\n🎉 Domain migration complete!');
    await prisma.$disconnect();
}

run().catch(async (e) => {
    console.error('❌ Migration script failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
