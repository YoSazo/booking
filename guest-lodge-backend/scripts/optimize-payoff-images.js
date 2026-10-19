'use strict';
// Regenerate web copies from the preserved testimonial PNGs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../payoff-web');
(async () => {
  const file = path.join(root, 'content.js');
  let source = fs.readFileSync(file, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  let before = 0, after = 0;
  for (const entry of Object.values(context.window.PAYOFF_CONTENT.proof).flat().filter(Boolean)) {
    const original = path.basename(entry.src).replace(/-[a-f0-9]{10}\.webp$/, '.png');
    const originalFile = path.join(root, 'assets', original);
    const { data, info } = await sharp(originalFile).resize({ width: 1080, withoutEnlargement: true })
      .webp({ quality: 88, effort: 6 }).toBuffer({ resolveWithObject: true });
    const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
    const name = original.replace(/\.png$/, `-${hash}.webp`);
    fs.writeFileSync(path.join(root, 'assets', name), data);
    source = source.replace(`src: '${entry.src}', width: ${entry.width}, height: ${entry.height}`,
      `src: '/payoff/assets/${name}', width: ${info.width}, height: ${info.height}`);
    const oldSize = fs.statSync(originalFile).size;
    before += oldSize; after += data.length;
    process.stdout.write(`${original}: ${oldSize} → ${data.length} bytes\n`);
  }
  fs.writeFileSync(file, source);
  process.stdout.write(`Total: ${before} → ${after} bytes (${(100 * (1 - after / before)).toFixed(1)}% smaller)\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
