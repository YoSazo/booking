import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      out[arg.slice(2)] = 'true';
    } else {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return out;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function insertIntoObjectLiteral(source, objectName, snippet) {
  const startToken = `const ${objectName} = {`;
  const start = source.indexOf(startToken);
  if (start === -1) throw new Error(`Could not find ${objectName} object literal`);

  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`Could not find end of ${objectName}`);

  const prefix = source.slice(0, end).replace(/\s*$/, '');
  return `${prefix}${snippet}\n${source.slice(end)}`;
}

const args = parseArgs(process.argv.slice(2));

const hotelId = args.hotelId ? slugify(args.hotelId) : '';
const name = String(args.name || '').trim();
const domain = String(args.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
const pms = String(args.pms || 'manual').trim().toLowerCase();

if (!hotelId) {
  console.error('Missing --hotelId=<slug>');
  process.exit(1);
}
if (!name) {
  console.error('Missing --name="Hotel Name"');
  process.exit(1);
}
if (!['manual', 'cloudbeds', 'bookingcenter'].includes(pms)) {
  console.error('Invalid --pms. Use manual|cloudbeds|bookingcenter');
  process.exit(1);
}

const root = process.cwd();
const hotelDataPath = path.join(root, 'src', 'hotelData.js');
const getHotelIdPath = path.join(root, 'src', 'utils', 'getHotelId.js');

let hotelData = fs.readFileSync(hotelDataPath, 'utf8');
if (hotelData.includes(`'${hotelId}': {`)) {
  console.error(`Hotel '${hotelId}' already exists in hotelData.js`);
  process.exit(1);
}

const urlValue = domain ? `https://${domain}` : '';
const hotelBlock = `\n\n  // --- ${escapeJs(name)} ---\n  '${hotelId}': {\n    name: '${escapeJs(name)}',\n    url: '${escapeJs(urlValue)}',\n    subtitle: 'No Deposits. No Leases. No Credit Checks. Just Simple Extended Living.',\n    phone: 'TBD',\n    address: 'TBD',\n    pms: '${pms}',\n    propertyCode: 'TBD',\n    rates: {\n      NIGHTLY: 69,\n      WEEKLY: 299,\n      MONTHLY: 999,\n    },\n    reviews: [],\n    rooms: [],\n  },\n`;

hotelData = hotelData.replace(/\n\s*};\s*$/m, `${hotelBlock}\n};\n`);
fs.writeFileSync(hotelDataPath, hotelData, 'utf8');

let getHotelId = fs.readFileSync(getHotelIdPath, 'utf8');
if (domain && !getHotelId.includes(`'${domain}': '${hotelId}'`)) {
  const domainSnippet = `\n\n  '${domain}': '${hotelId}',`;
  getHotelId = insertIntoObjectLiteral(getHotelId, 'domainMap', domainSnippet);
}

const pathRoute = `/${hotelId}`;
if (!getHotelId.includes(`'${pathRoute}': '${hotelId}'`)) {
  const pathSnippet = `\n\n  '${pathRoute}': '${hotelId}',`;
  getHotelId = insertIntoObjectLiteral(getHotelId, 'pathMap', pathSnippet);
}

fs.writeFileSync(getHotelIdPath, getHotelId, 'utf8');

console.log(`Scaffolded hotel '${hotelId}' in hotelData.js${domain ? ' and domain map' : ''}.`);
