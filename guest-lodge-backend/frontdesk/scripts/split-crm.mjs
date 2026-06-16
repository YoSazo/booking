#!/usr/bin/env node
/**
 * Splits simple-crm.html into Vite source files.
 * Run: node frontdesk/scripts/split-crm.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const src = path.join(root, 'simple-crm.html');
const out = path.resolve(__dirname, '../src');

const html = fs.readFileSync(src, 'utf8');
const lines = html.split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function lineAt(marker) {
  const idx = lines.findIndex((l) => l.includes(marker));
  if (idx < 0) throw new Error(`Section marker not found: ${marker}`);
  return idx + 1;
}

function extractFunctions(code) {
  const names = new Set();
  const re = /^(?:async )?function (\w+)\s*\(/gm;
  let m;
  while ((m = re.exec(code)) !== null) names.add(m[1]);
  return [...names].sort();
}

/** Rewrite bare state identifiers to fd.* (mutable shared state). */
const STATE_KEYS = [
  'token', 'bookings', 'guestMessages', 'currentFilter', 'manualAvailability', 'manualSelectedRoom',
  'availabilityYear', 'availabilityMonth', 'availabilityEditingDay', 'availabilityDaySaving',
  'editingRoomName', 'pendingDeleteRoomName', 'currentHotelPms', 'revenueEnabled', 'hotelSubscribed',
  'revenuePeriod', 'revenueCache', 'revenueLoading', 'revenueError', 'activeHotelId', 'activeHotelName',
  'activeHotelAppIcon', 'appsViewPlatform', 'activeHotelDomain', 'activeHotelContext', 'bootInFlight',
  'deferredInstallPrompt', 'frontdeskInstalled', '_magicLoginPending', 'editRooms',
  'messageUnreadCount', 'bookingsVirtualList', 'bookingsVirtualRaf',
  'messagesInboxOpen', 'messagesThreadPickerOpen', 'selectedMessageThread',
  'CRM_HOTEL_BY_HOST', 'CRM_HOTEL_LABELS', 'ALLOWED_REVENUE_PERIODS', 'OTA_COMMISSION_RATE',
];

function isRegexStart(prevChar) {
  return !prevChar || /[\(=\[{!&|?:;,\}\s]/.test(prevChar);
}

/** Mask comments and string/template literal segments so identifier rewrite skips them. */
function maskNonCode(code) {
  const parts = [];
  let result = '';
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    const c2 = code[i + 1];
    if (c === '/' && c2 === '/') {
      let j = i + 2;
      while (j < code.length && code[j] !== '\n') j++;
      parts.push(code.slice(i, j));
      result += `\0M${parts.length - 1}\0`;
      i = j;
      continue;
    }
    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < code.length - 1 && !(code[j] === '*' && code[j + 1] === '/')) j++;
      j = Math.min(j + 2, code.length);
      parts.push(code.slice(i, j));
      result += `\0M${parts.length - 1}\0`;
      i = j;
      continue;
    }
    if (c === '/' && c2 !== '/' && c2 !== '*') {
      const prev = result.replace(/\0M\d+\0/g, ' ').trimEnd().slice(-1);
      if (isRegexStart(prev)) {
        let j = i + 1;
        let inClass = false;
        while (j < code.length) {
          const ch = code[j];
          if (ch === '\\') { j += 2; continue; }
          if (ch === '[') { inClass = true; j++; continue; }
          if (ch === ']' && inClass) { inClass = false; j++; continue; }
          if (ch === '/' && !inClass) {
            j++;
            while (j < code.length && /[a-z]/i.test(code[j])) j++;
            break;
          }
          j++;
        }
        result += code.slice(i, j);
        i = j;
        continue;
      }
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        j++;
      }
      parts.push(code.slice(i, j));
      result += `\0M${parts.length - 1}\0`;
      i = j;
      continue;
    }
    if (c === '`') {
      result += '`';
      i++;
      while (i < code.length) {
        if (code[i] === '\\') {
          parts.push(code.slice(i, i + 2));
          result += `\0M${parts.length - 1}\0`;
          i += 2;
          continue;
        }
        if (code[i] === '$' && code[i + 1] === '{') {
          result += '${';
          i += 2;
          let depth = 1;
          while (i < code.length && depth > 0) {
            if (code[i] === '{') depth++;
            else if (code[i] === '}') depth--;
            result += code[i];
            i++;
          }
          continue;
        }
        if (code[i] === '`') {
          result += '`';
          i++;
          break;
        }
        let j = i;
        while (j < code.length && code[j] !== '\\' && code[j] !== '$' && code[j] !== '`') j++;
        if (j > i) {
          parts.push(code.slice(i, j));
          result += `\0M${parts.length - 1}\0`;
          i = j;
          continue;
        }
        parts.push(code[i]);
        result += `\0M${parts.length - 1}\0`;
        i++;
      }
      continue;
    }
    result += c;
    i++;
  }
  return { masked: result, parts };
}

function unmask(code, parts) {
  return code.replace(/\0M(\d+)\0/g, (_, n) => parts[Number(n)]);
}

function rewriteFd(code) {
  const FILTER_LITERALS = ['settings', 'bookings', 'revenue', 'apps', 'availability', 'needs-call', 'called'];
  const { masked, parts } = maskNonCode(code);
  let out = masked;
  for (const key of STATE_KEYS) {
    out = out.replace(new RegExp(`(?<!fd\\.)\\b${key}\\b`, 'g'), `fd.${key}`);
  }
  out = out.replace(/fd\.fd\./g, 'fd.');
  for (const v of FILTER_LITERALS) {
    out = out.replace(new RegExp(`'fd\\.${v}'`, 'g'), `'${v}'`);
    out = out.replace(new RegExp(`"fd\\.${v}"`, 'g'), `"${v}"`);
  }
  return unmask(out, parts);
}

const APPLY_FILTER_APPS_BLOCK = `if (currentFilter === 'apps') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl2 = document.getElementById('editView');
    if (editEl2) editEl2.style.display = 'none';
    if (msgPanel) msgPanel.style.display = 'none';
    const appsEl2 = document.getElementById('appsView');
    if (appsEl2) {
      appsEl2.style.display = 'block';
      if (!appsEl2.querySelector('.apps-page')) {
        appsEl2.innerHTML = '<div class="loading" style="padding:48px 0;"><div class="logo-sprite-bounce"></div></div>';
      }
    }
    closeAvailabilityDayPopover();
    loadAppsModule().then(() => {
      const appsTourOpen = !!document.getElementById('appsTourLightbox');
      if (!appsTourOpen) ensureAppsViewRendered();
      if (!localStorage.getItem('appsTourDone') && !appsTourOpen) {
        setTimeout(() => {
          if (!document.getElementById('appsTourLightbox')) startAppsTour();
        }, 500);
      }
    }).catch(() => {
      if (appsEl2) appsEl2.innerHTML = '<div class="empty-state"><div class="empty-text">Could not load Apps</div></div>';
    });
    return;
  }

  `;

function patchApplyFilterAppsBlock(code) {
  const fnStart = code.indexOf('function applyFilter()');
  if (fnStart < 0) throw new Error('applyFilter not found in core block');
  const appsStart = code.indexOf("if (currentFilter === 'apps')", fnStart);
  const tail = "if (bookingsEl) bookingsEl.style.display = '';";
  const tailAt = code.indexOf(tail, appsStart);
  if (appsStart < 0 || tailAt < 0) throw new Error('applyFilter apps block not found');
  return code.slice(0, appsStart) + APPLY_FILTER_APPS_BLOCK + code.slice(tailAt);
}

const styleCloseLine = lineAt('</style>');
const css = slice(16, styleCloseLine - 1);
fs.mkdirSync(path.join(out, 'styles'), { recursive: true });
fs.writeFileSync(path.join(out, 'styles', 'core.css'), css);

const PWA_START = lineAt('// ── PWA INSTALL');
const SETTINGS_START = lineAt('// ── SETTINGS TAB');
const APPS_START = lineAt('// ── APPS PAGE');
const INIT_START = lineAt('// ── INIT');
const HELPERS_START = lineAt('// ── HELPERS');
const TOAST_LINE = lines.findIndex((l) => /^function toast\(/.test(l)) + 1;
if (TOAST_LINE < 1) throw new Error('function toast not found');
if (PWA_START < 1) throw new Error('PWA marker not found');

let coreBlock = slice(PWA_START, HELPERS_START - 1) + '\n\n' + slice(TOAST_LINE, SETTINGS_START - 1);
coreBlock = coreBlock
  .replace(/^let deferredInstallPrompt = null;\n/m, '')
  .replace(/^let frontdeskInstalled = false;\n/m, '')
  .replace(/^let _magicLoginPending = false;\n/m, '')
  .replace(/^let bookingsVirtualList = \[\];\n/m, '')
  .replace(/^let bookingsVirtualRaf = 0;\n/m, '')
  .replace(
    /if \(currentFilter === 'settings'\) \{[\s\S]*?if \(!editRooms\.length\) loadEditRooms\(\);\n    return;\n  \}/,
    `if (currentFilter === 'settings') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl = document.getElementById('editView');
    if (editEl) editEl.style.display = 'block';
    closeAvailabilityDayPopover();
    loadSettingsModule().then(() => {
      if (!editRooms.length) loadEditRooms();
    });
    return;
  }`
  );
coreBlock = patchApplyFilterAppsBlock(coreBlock);
coreBlock = coreBlock
  .replace(
    /await Promise\.allSettled\(\[\n    loadManualAvailability\(\),\n    loadBookings\(\{ deferMessages: true \}\),\n  \]\);/,
    `await loadSettingsModule();
  await Promise.allSettled([
    loadManualAvailability(),
    loadBookings({ deferMessages: true }),
  ]);`
  );

coreBlock = rewriteFd(coreBlock);

const settingsBlock = slice(SETTINGS_START, APPS_START - 1).replace(/^let editRooms = \[\];\n?/m, '');
const appsBlock = slice(APPS_START, INIT_START - 1);
const initEndLine = lines.findIndex((l, i) => i >= INIT_START - 1 && l.trim() === '</script>');
if (initEndLine < 0) throw new Error('</script> not found after INIT');
const initBlock = slice(INIT_START, initEndLine);
if (!initBlock.includes('bootCrmApp()')) {
  throw new Error('init block is missing bootCrmApp() — check INIT / </script> slice bounds');
}

const stateJs = `/** Shared mutable Front Desk state */
export const fd = {
  token: '',
  bookings: [],
  guestMessages: [],
  currentFilter: 'settings',
  manualAvailability: { rooms: [], overrides: {} },
  manualSelectedRoom: '',
  availabilityYear: new Date().getFullYear(),
  availabilityMonth: new Date().getMonth(),
  availabilityEditingDay: '',
  availabilityDaySaving: false,
  editingRoomName: '',
  pendingDeleteRoomName: '',
  currentHotelPms: '',
  revenueEnabled: false,
  hotelSubscribed: false,
  revenuePeriod: '30d',
  revenueCache: {},
  revenueLoading: false,
  revenueError: '',
  ALLOWED_REVENUE_PERIODS: new Set(['today', '7d', '30d', 'all']),
  OTA_COMMISSION_RATE: 0.25,
  activeHotelId: '',
  activeHotelName: '',
  activeHotelAppIcon: '',
  appsViewPlatform: 'ios',
  activeHotelDomain: '',
  activeHotelContext: null,
  bootInFlight: false,
  CRM_HOTEL_BY_HOST: {
    'guestlodgeminot.clickinns.com': 'guest-lodge-minot',
    'booking-kappa-nine.vercel.app': 'guest-lodge-minot',
    'stcroix.clickinns.com': 'st-croix-wisconsin',
    'homeplacesuites.clickinns.com': 'home-place-suites',
    'myhomeplacesuites.com': 'home-place-suites',
    'www.myhomeplacesuites.com': 'home-place-suites',
    'suitestay.clickinns.com': 'suite-stay',
    'clickinns.com': 'suite-stay',
    'www.clickinns.com': 'suite-stay',
  },
  CRM_HOTEL_LABELS: {
    'guest-lodge-minot': 'Guest Lodge Minot',
    'st-croix-wisconsin': 'St. Croix Wisconsin',
    'home-place-suites': 'Home Place Suites',
    'suite-stay': 'Suite Stay',
  },
  deferredInstallPrompt: null,
  frontdeskInstalled: false,
  _magicLoginPending: false,
  editRooms: [],
  messageUnreadCount: 0,
  messagesInboxOpen: false,
  messagesThreadPickerOpen: false,
  selectedMessageThread: '',
  bookingsVirtualList: [],
  bookingsVirtualRaf: 0,
};
`;

const stateImport = `import { fd } from './state.js';\n`;

const utilsJs = `${stateImport}
let lucideLoadPromise = null;

function ensureLucideLoaded() {
  if (typeof lucide !== 'undefined') return Promise.resolve();
  if (lucideLoadPromise) return lucideLoadPromise;
  lucideLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('lucide load failed'));
    document.head.appendChild(s);
  });
  return lucideLoadPromise;
}

async function optimizeRoomPhotoForUpload(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/webp' && file.size < 400000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxW = 1600;
    const maxH = 1200;
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxW / w, maxH / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', 0.82);
    });
    const base = (file.name || 'room-photo').replace(/\\.[^.]+$/, '') || 'room-photo';
    return new File([blob], base + '.webp', { type: 'image/webp' });
  } catch (_) {
    return file;
  }
}

function scheduleDeferredMessagesLoad() {
  const run = () => {
    if (fd.currentFilter === 'bookings') loadMessages();
    else loadMessageBadges();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 600);
}

export function exposeToWindow(obj) {
  Object.assign(window, obj);
}

export { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad };
`;

const coreFns = extractFunctions(coreBlock);
const settingsFns = extractFunctions(rewriteFd(settingsBlock));
const appsFns = extractFunctions(rewriteFd(appsBlock));

const corePatched = coreBlock;

const coreJs = `${stateImport}
import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';

let settingsModulePromise = null;
let appsModulePromise = null;

export function loadSettingsModule() {
  if (!settingsModulePromise) {
    settingsModulePromise = import('./settings.js').then((m) => {
      m.install();
      return m;
    });
  }
  return settingsModulePromise;
}

export function loadAppsModule() {
  if (!appsModulePromise) {
    appsModulePromise = import('./apps.js').then((m) => {
      m.install();
      return m;
    });
  }
  return appsModulePromise;
}

${corePatched}

${rewriteFd(initBlock)}

exposeToWindow({
${[...coreFns, 'loadSettingsModule', 'loadAppsModule'].map((n) => `  ${n},`).join('\n')}
});
`;

const settingsJs = `${stateImport}
import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';

${rewriteFd(settingsBlock)}

const _settingsExports = {
${settingsFns.map((n) => `  ${n},`).join('\n')}
};

export function install() {
  exposeToWindow(_settingsExports);
}

export default _settingsExports;
`;

const appsJs = `${stateImport}
import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';

${rewriteFd(appsBlock)}

const _appsExports = {
${appsFns.map((n) => `  ${n},`).join('\n')}
};

export function install() {
  exposeToWindow(_appsExports);
}

export default _appsExports;
`;

fs.writeFileSync(path.join(out, 'state.js'), stateJs);
fs.writeFileSync(path.join(out, 'utils.js'), utilsJs);
fs.writeFileSync(path.join(out, 'core.js'), coreJs);
fs.writeFileSync(path.join(out, 'settings.js'), settingsJs);
fs.writeFileSync(path.join(out, 'apps.js'), appsJs);
fs.writeFileSync(path.join(out, 'main.js'), `import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './styles/core.css';
import './core.js';
`);

function assertNoBareState(filePath, code) {
  const { masked } = maskNonCode(code);
  const bare = [];
  for (const key of STATE_KEYS) {
    const re = new RegExp(`(?<!fd\\.)\\b${key}\\b`);
    if (re.test(masked)) bare.push(key);
  }
  if (bare.length) {
    throw new Error(`${path.basename(filePath)}: bare state refs: ${bare.join(', ')}`);
  }
}

for (const [name, code] of [['core.js', coreJs], ['settings.js', settingsJs], ['apps.js', appsJs]]) {
  assertNoBareState(path.join(out, name), code);
}

console.log('Split OK', {
  coreKb: Math.round(coreJs.length / 1024),
  settingsKb: Math.round(settingsJs.length / 1024),
  appsKb: Math.round(appsJs.length / 1024),
});
