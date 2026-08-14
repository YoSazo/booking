const LEGACY_STORAGE_KEY = 'marketel_guest_stay';
const STAYS_STORAGE_KEY = 'marketel_guest_stays';
const SELECTED_STORAGE_KEY = 'marketel_guest_stay_selected';

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isUpcomingStay(stay) {
  if (!stay?.code || !stay?.hotelId || !(stay.checkout || stay.checkoutDate)) return false;
  const checkout = new Date(stay.checkout || stay.checkoutDate);
  return !Number.isNaN(checkout.getTime()) && checkout >= startOfToday();
}

function sortStays(stays) {
  return [...stays].sort((left, right) => {
    const leftDate = new Date(left.checkin || left.checkinDate || left.checkout || left.checkoutDate).getTime();
    const rightDate = new Date(right.checkin || right.checkinDate || right.checkout || right.checkoutDate).getTime();
    return (Number.isNaN(leftDate) ? Number.MAX_SAFE_INTEGER : leftDate)
      - (Number.isNaN(rightDate) ? Number.MAX_SAFE_INTEGER : rightDate);
  });
}

function readSelectedMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SELECTED_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeSelectedMap(selected) {
  try { localStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(selected)); }
  catch (_) { /* storage is a convenience; confirmation emails remain authoritative */ }
}

function readAllStays() {
  let stored = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STAYS_STORAGE_KEY) || '[]');
    if (Array.isArray(parsed)) stored = parsed;
  } catch (_) { /* fall through to the legacy reservation */ }

  // Seamlessly promote the pre-multi-stay record on the guest's first return.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    if (legacy?.code && legacy?.hotelId) {
      const alreadyStored = stored.some((stay) => (
        stay.hotelId === legacy.hotelId && stay.code === legacy.code
      ));
      if (!alreadyStored) stored.push(legacy);
    }
  } catch (_) { /* ignore malformed legacy data */ }

  const deduped = new Map();
  stored.filter(isUpcomingStay).forEach((stay) => {
    deduped.set(`${stay.hotelId}:${stay.code}`, stay);
  });
  return sortStays([...deduped.values()]);
}

function persistAllStays(stays) {
  try { localStorage.setItem(STAYS_STORAGE_KEY, JSON.stringify(stays)); }
  catch (_) { /* ignore quota/private-mode failures */ }
}

/** Every active or upcoming stay belonging to this property. */
export function readGuestStays(hotelId) {
  if (!hotelId) return [];
  const allStays = readAllStays();
  persistAllStays(allStays);
  return allStays.filter((stay) => stay.hotelId === hotelId);
}

/** The reservation currently open inside Your Stay. */
export function readGuestStay(hotelId) {
  const stays = readGuestStays(hotelId);
  if (!stays.length) return null;
  const selectedCode = readSelectedMap()[hotelId];
  return stays.find((stay) => stay.code === selectedCode) || stays[0];
}

/** Add/update a reservation and make it the currently open stay. */
export function writeGuestStay(stay) {
  if (!stay) return;
  if (!isUpcomingStay(stay)) return;

  const allStays = readAllStays();
  const matchIndex = allStays.findIndex((existing) => (
    existing.hotelId === stay.hotelId && existing.code === stay.code
  ));
  if (matchIndex >= 0) allStays[matchIndex] = { ...allStays[matchIndex], ...stay };
  else allStays.push(stay);
  persistAllStays(sortStays(allStays.filter(isUpcomingStay)));

  const selected = readSelectedMap();
  selected[stay.hotelId] = stay.code;
  writeSelectedMap(selected);
  try { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(stay)); }
  catch (_) { /* legacy mirror is best effort */ }
}

export function selectGuestStay(hotelId, code) {
  const stay = readGuestStays(hotelId).find((candidate) => candidate.code === code);
  if (!stay) return null;
  const selected = readSelectedMap();
  selected[hotelId] = stay.code;
  writeSelectedMap(selected);
  try { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(stay)); }
  catch (_) { /* legacy mirror is best effort */ }
  return stay;
}

export function clearGuestStay(hotelId) {
  if (!hotelId) {
    try {
      localStorage.removeItem(STAYS_STORAGE_KEY);
      localStorage.removeItem(SELECTED_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_) { /* ignore */ }
    return;
  }

  persistAllStays(readAllStays().filter((stay) => stay.hotelId !== hotelId));
  const selected = readSelectedMap();
  delete selected[hotelId];
  writeSelectedMap(selected);
  try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch (_) { /* ignore */ }
}
