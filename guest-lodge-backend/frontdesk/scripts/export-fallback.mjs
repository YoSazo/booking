#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const builtIndex = path.join(root, 'public', 'frontdesk', 'index.html');
const fallbackHtml = path.join(root, 'simple-crm.html');
const banner = '<!-- GENERATED from public/frontdesk/index.html. Edit frontdesk/src and run `npm run build:frontdesk`. -->';

if (!fs.existsSync(builtIndex)) {
  console.error(`Built frontdesk index not found: ${builtIndex}`);
  process.exit(1);
}

let html = fs.readFileSync(builtIndex, 'utf8');
if (html.includes(banner)) {
  html = html.replace(banner + '\n', '');
}

if (/^<!DOCTYPE html>/i.test(html)) {
  html = html.replace(/^<!DOCTYPE html>/i, (match) => `${match}\n${banner}`);
} else {
  html = `${banner}\n${html}`;
}

fs.writeFileSync(fallbackHtml, html);
console.log(`Wrote ${path.relative(root, fallbackHtml)} from ${path.relative(root, builtIndex)}`);
