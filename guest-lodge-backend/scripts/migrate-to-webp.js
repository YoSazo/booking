require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Cloudflare R2 setup (fallback to environment variables)
const r2 = process.env.R2_ENDPOINT ? new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
}) : null;

const R2_BUCKET = process.env.R2_BUCKET || 'marketel-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function uploadToR2(buffer, key, contentType) {
    if (!r2) throw new Error("R2 is not configured");
    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    return `${R2_PUBLIC_URL}/${key}`;
}

async function run() {
    console.log("🚀 Starting WebP image migration...");
    
    // 1. Migrate Room Images
    const roomImages = await prisma.roomImage.findMany();
    let convertedCount = 0;

    for (const image of roomImages) {
        if (image.url.endsWith('.webp')) continue; // Already converted

        console.log(`Processing room image: ${image.url}`);
        try {
            // Fetch the image buffer
            let imageBuffer;
            if (image.url.startsWith('http')) {
                const response = await axios.get(image.url, { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(response.data, 'binary');
            } else {
                // Local file
                const filePath = path.join(__dirname, '..', 'public', image.url);
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️ Local file not found: ${filePath}, skipping...`);
                    continue;
                }
                imageBuffer = fs.readFileSync(filePath);
            }

            // Convert to WebP
            const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
            const keyBase = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
            let newUrl;

            // Upload the new image
            if (R2_PUBLIC_URL && r2) {
                // We extract the hotelId from the room by querying it
                const room = await prisma.room.findUnique({ where: { id: image.roomId } });
                const key = `${room.hotelId}/${keyBase}.webp`;
                newUrl = await uploadToR2(webpBuffer, key, 'image/webp');
            } else {
                // Save locally
                const room = await prisma.room.findUnique({ where: { id: image.roomId } });
                const dir = path.join(__dirname, '..', 'public', 'uploads', room.hotelId);
                fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, `${keyBase}.webp`), webpBuffer);
                newUrl = `/uploads/${room.hotelId}/${keyBase}.webp`;
            }

            // Update database
            await prisma.roomImage.update({
                where: { id: image.id },
                data: { url: newUrl }
            });

            console.log(`✅ Converted to: ${newUrl}`);
            convertedCount++;
        } catch (e) {
            console.error(`❌ Failed to convert ${image.url}:`, e.message);
        }
    }

    console.log(`🎉 Migration complete! Successfully converted ${convertedCount} room images to WebP.`);
    process.exit(0);
}

run().catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
});
