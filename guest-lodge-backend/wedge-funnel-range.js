'use strict';

const DEFAULT_TIME_ZONE = 'America/Chicago';
const DAY = 86400000;
const PERIODS = new Set(['today', 'yesterday', '24h', '7d', '30d', 'all', 'since-reset', 'custom']);
const bad = message => { throw Object.assign(new Error(message), { status: 400 }); };
const parts = (date, timeZone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
const wallStamp = p => Date.UTC(p.year, p.month - 1, p.day, p.hour || 0, p.minute || 0, p.second || 0);

// Convert wall time in an IANA zone, rather than relying on the server's zone or
// a fixed UTC offset. Reject nonexistent/ambiguous DST times instead of guessing.
function wallTime(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return bad('Use a date and time such as 2026-10-15T09:30.');
  const [, year, month, day, hour = '00', minute = '00'] = match;
  const p = { year: +year, month: +month, day: +day, hour: +hour, minute: +minute };
  const stamp = wallStamp(p), check = new Date(stamp);
  if (+year < 2000 || +year > 2100 || check.toISOString().slice(0, 16) !== `${year}-${month}-${day}T${hour}:${minute}`) return bad('Invalid date or time.');
  const offsets = new Set([-36, 0, 36].map(hours => {
    const sample = new Date(stamp + hours * 3600000);
    return wallStamp(parts(sample, timeZone)) - sample.getTime();
  }));
  const candidates = [...offsets].map(offset => new Date(stamp - offset))
    .filter(date => wallStamp(parts(date, timeZone)) === stamp);
  if (candidates.length !== 1) return bad('That time is skipped or repeated by daylight saving. Choose another time or use UTC.');
  return candidates[0];
}

function parseBound(value, timeZone, end = false) {
  if (typeof value !== 'string' || value.length > 40) return bad('Choose both a start and an end time.');
  if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value)) {
    const date = wallTime(value, timeZone);
    // A selected end minute is included in full; a date-only end includes the
    // whole calendar day, which may be 23 or 25 hours long.
    if (!end) return date;
    if (value.includes('T')) return new Date(date.getTime() + 59999);
    const p = parts(date, timeZone), next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
    return new Date(wallTime(next.toISOString().slice(0, 10), timeZone).getTime() - 1);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return bad('Invalid timestamp. Include a timezone offset or choose a local date and time.');
  wallTime(value.slice(0, 16), 'UTC');
  const date = new Date(value);
  if (isNaN(date)) return bad('Invalid date or time.');
  return date;
}

function wedgeFunnelRange(query = {}, clock = new Date()) {
  const timeZone = query.timezone || DEFAULT_TIME_ZONE;
  if (typeof timeZone !== 'string' || timeZone.length > 100) return bad('Invalid timezone.');
  try { parts(clock, timeZone); } catch { return bad('Unknown timezone.'); }
  let period = query.period;
  if (!period) period = query.from || query.to ? 'custom' : query.days === '1' ? 'today' : query.days === 'all' ? 'all' : 'legacy';
  if (period !== 'legacy' && !PERIODS.has(period)) return bad('Unknown date range.');
  const p = parts(clock, timeZone);
  const midnight = daysBack => {
    const day = new Date(Date.UTC(p.year, p.month - 1, p.day - daysBack)).toISOString().slice(0, 10);
    return wallTime(day, timeZone);
  };
  let since, until = new Date(clock);
  if (period === 'custom') {
    // Historical date-only API requests used UTC. Keep those callers stable;
    // the new dashboard always supplies its explicit display timezone.
    const zone = query.timezone ? timeZone : 'UTC';
    since = parseBound(query.from, zone);
    until = parseBound(query.to, zone, true);
  } else if (period === 'today') since = midnight(0);
  else if (period === 'yesterday') { since = midnight(1); until = new Date(midnight(0).getTime() - 1); }
  else if (period === '24h') since = new Date(clock.getTime() - DAY);
  else if (period === '7d' || period === '30d') since = midnight(period === '7d' ? 6 : 29);
  else if (period === 'all' || period === 'since-reset') since = new Date('2020-01-01T00:00:00Z');
  else since = new Date(clock.getTime() - Math.max(1, Math.min(365, parseInt(query.days, 10) || 7)) * DAY);
  if (since > until) return bad('The start must be before the end.');
  return { since, until, timeZone, period };
}

module.exports = { wedgeFunnelRange, DEFAULT_TIME_ZONE };
