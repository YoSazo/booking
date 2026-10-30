'use strict';
// The funnel page's Ads and Test log: every ad of a product with its picture, its
// copy and its numbers (Meta's, and our own steps from the ad id its link
// carries), judged by the test rules. The rules, what each ad is testing and
// the log live in the database (FunnelNote), so the plan outlives any chat.
const { byAd, definitionFor } = require('./wedge-funnel');

// The user's rules (Oct 28): Purchase only; an ad that spends about $60 with
// no sale is turned off; two sales at or under the price each is a winner,
// which is never touched while testing moves to a new campaign.
const RULE_DEFAULTS = Object.freeze({
  killAt: 60, breakEven: 28.11, winnerSales: 2,
  text: Object.freeze([
    'Every campaign optimises for Purchase.',
    'An ad that spends $60 with no sale is turned off and replaced by the next creative.',
    'Two sales at or under $28.11 each is a winner. Winners are never touched; testing moves to a new campaign.',
    'Each new creative changes one thing from the current best, in this order: image, hook (first two lines), headline, body.',
    'Before launching a test, write what each result would mean and what goes up next.',
  ]),
});
// The booking engine's (Oct 30): $97 a sale, so an ad gets $100 to find one.
const ENGINE_RULES = Object.freeze({
  killAt: 100, breakEven: 97, winnerSales: 2,
  text: Object.freeze([
    'Every campaign optimises for Purchase.',
    'An ad that spends $100 with no sale is turned off and replaced by the next creative.',
    'Two sales at or under $97 each is a winner. Winners are never touched; testing moves to a new campaign.',
    'No Advantage+ creative enhancements or other automatic optimisations; everything is created paused.',
  ]),
});
const DEFAULT_RULES = Object.freeze({ payoff: RULE_DEFAULTS, engine: ENGINE_RULES });
const TOOLS = Object.freeze(['engine', 'payoff']);
// Which product an ad sells, from where its link goes.
const LINKS = Object.freeze({
  payoff: link => /\/payoff/.test(link),
  engine: link => /^https:\/\/(www\.)?bookmarketel\.com\/?(engine\/?)?([?#]|$)/.test(link),
});
const STATUSES = ['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'PENDING_REVIEW', 'IN_PROCESS', 'PREAPPROVED', 'DISAPPROVED', 'WITH_ISSUES'];
const RECENT_DAYS = 30;
const AD_FIELDS = 'id,name,created_time,effective_status,campaign{id,name},adset{id,name,promoted_object},'
  + 'creative.thumbnail_width(600).thumbnail_height(600){thumbnail_url,image_url,object_story_spec{link_data{message,name,description,link},video_data{message,title,link_description,call_to_action}}}';
// A picture ad keeps its words and link in link_data; a video ad in video_data.
const copyOf = ad => {
  const spec = ad.creative?.object_story_spec || {};
  if (spec.link_data) return spec.link_data;
  const video = spec.video_data || {};
  return { message: video.message, name: video.title, description: video.link_description, link: video.call_to_action?.value?.link, video: !!spec.video_data };
};
const EVENT_LABELS = { PURCHASE: 'Purchase', ADD_TO_CART: 'Add to cart', INITIATED_CHECKOUT: 'Checkout', LEAD: 'Lead', COMPLETE_REGISTRATION: 'Registration' };

function metaClient({ token, version, fetchImpl = fetch }) {
  return async (path, params = {}) => {
    if (!token) throw new Error('No Meta token on the server');
    const url = new URL(`https://graph.facebook.com/${version}/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) throw new Error(body.error?.message || `Meta answered ${response.status}`);
    return body;
  };
}

const number = value => (value === undefined || value === null || value === '' ? 0 : Number(value) || 0);
const action = (actions, type) => number((actions || []).find(item => item.action_type === type)?.value);
const short = name => String(name || '').split(' | ').pop() || 'Ad';
const statusOf = status => (status === 'ACTIVE' ? ['running', 'Running']
  : ['PENDING_REVIEW', 'IN_PROCESS', 'PREAPPROVED'].includes(status) ? ['review', 'In review']
    : ['DISAPPROVED', 'WITH_ISSUES'].includes(status) ? ['rejected', status === 'DISAPPROVED' ? 'Rejected' : 'Has issues'] : ['off', 'Off']);
const money = value => `$${value.toFixed(2)}`;
// "Today" is the ad account's day (US/Central), as Meta counts it.
const TIME_ZONE = 'America/Chicago';
function startOfDay(at, timeZone = TIME_ZONE) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(at).map(part => [part.type, part.value]));
  const offset = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - Math.floor(at.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offset);
}

// Where the ad stands by the rules. Sales are the higher of Meta's count and
// ours, so a sale either side saw counts.
function verdictOf({ status, event, spend, sales }, rules) {
  const each = sales ? spend / sales : null;
  if (event !== 'PURCHASE') return { key: 'old', label: `Optimised for ${EVENT_LABELS[event] || event || 'something else'}, so the rules don't judge it` };
  if (sales >= rules.winnerSales && each <= rules.breakEven) return { key: 'winner', label: `Winner: ${sales} sales at ${money(each)} each. Don't touch it.` };
  if (status === 'off') return { key: 'off', label: `Off after ${money(spend)}${sales ? `, ${sales} sale${sales === 1 ? '' : 's'}` : ', no sale'}` };
  if (sales) return { key: 'selling', label: `${sales} sale${sales === 1 ? '' : 's'} at ${money(each)} each${each > rules.breakEven ? ` (above ${money(rules.breakEven)})` : ''}. ${rules.winnerSales - sales > 0 ? `${rules.winnerSales - sales} more to call it.` : ''}`.trim() };
  if (spend >= rules.killAt) return { key: 'kill', label: `Turn it off: ${money(spend)} with no sale` };
  return { key: 'testing', label: `${money(spend)} of ${money(rules.killAt)}, no sale yet`, progress: Math.min(1, spend / rules.killAt) };
}

// Our own steps for each ad, since ads were tagged (Oct 27): everyone who
// clicked it, followed through to paying.
async function ourSteps(prisma, tool, ids, since = null) {
  const ads = definitionFor(tool).ads;
  if (!ads || !ids.length) return new Map();
  const tags = await prisma.inspectEvent.findMany({ where: { tool, name: ads.event, detail: { in: ids }, ...(since ? { createdAt: { gte: since } } : {}) },
    select: { name: true, detail: true, visitorId: true, createdAt: true } });
  const visitors = [...new Set(tags.map(tag => tag.visitorId).filter(Boolean))];
  const names = [...new Set(ads.steps.flatMap(([, list]) => list).map(name => name.split(':')[0]))];
  const events = visitors.length ? await prisma.inspectEvent.findMany({ where: { tool, visitorId: { in: visitors }, name: { in: [...names, ads.event] } },
    select: { id: true, name: true, detail: true, visitorId: true, accountId: true, createdAt: true } }) : [];
  return new Map(byAd(events, ads, tags, Infinity).map(row => [row.ad, row]));
}

const NOTE_LIMITS = { ad: ['image', 'copy', 'testing', 'verdict'], log: ['title', 'question', 'changed', 'result', 'date'] };
const text = (value, max) => String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);

function cleanNote(kind, data = {}, defaults = RULE_DEFAULTS) {
  if (kind === 'ad') return Object.fromEntries(NOTE_LIMITS.ad.map(field => [field, text(data[field], 600)]));
  if (kind === 'rules') {
    const bounded = (value, min, max, fallback) => (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback);
    return { killAt: bounded(data.killAt, 1, 10000, defaults.killAt), breakEven: bounded(data.breakEven, 0.01, 10000, defaults.breakEven),
      winnerSales: Math.round(bounded(data.winnerSales, 1, 50, defaults.winnerSales)),
      text: (Array.isArray(data.text) ? data.text : []).map(line => text(line, 400)).filter(Boolean).slice(0, 15) };
  }
  const entry = Object.fromEntries(NOTE_LIMITS.log.map(field => [field, text(data[field], field === 'result' || field === 'question' ? 3000 : 400)]));
  // 'guide' is the standing routine, kept at the top of the log.
  entry.status = ['guide', 'running', 'queued', 'done'].includes(data.status) ? data.status : 'running';
  entry.ads = (Array.isArray(data.ads) ? data.ads : []).map(String).filter(id => /^\d{6,25}$/.test(id)).slice(0, 12);
  entry.outcomes = (Array.isArray(data.outcomes) ? data.outcomes : []).map(row => ({ if: text(row?.if, 300), means: text(row?.means, 800), next: text(row?.next, 800) }))
    .filter(row => row.if || row.means || row.next).slice(0, 10);
  return entry;
}

function createAdsReport({ prisma, meta, accountId = '', cacheMs = 5 * 60 * 1000, now = () => Date.now() }) {
  let account = String(accountId || '').replace(/^act_/, '');
  let cached = null;

  async function metaAds() {
    if (cached && cached.until > now()) return cached.ads;
    if (!account) account = (await meta('me/adaccounts', { fields: 'account_id', limit: '2' })).data?.[0]?.account_id || '';
    if (!account) throw new Error('No ad account for this token');
    const listed = await meta(`act_${account}/ads`, { fields: AD_FIELDS, limit: '200', filtering: [{ field: 'effective_status', operator: 'IN', value: STATUSES }] });
    const since = now() - RECENT_DAYS * 86400000;
    const ads = (listed.data || []).filter(ad => TOOLS.some(tool => LINKS[tool](copyOf(ad).link || ''))
      && (ad.effective_status === 'ACTIVE' || new Date(ad.created_time).getTime() >= since));
    // Lifetime (what the verdict and Meta's rules use) and today, for the page's toggle.
    const byDay = async preset => new Map(((ads.length ? await meta(`act_${account}/insights`, { level: 'ad', date_preset: preset, limit: '200',
      fields: 'ad_id,spend,impressions,cpm,inline_link_clicks,inline_link_click_ctr,actions',
      filtering: [{ field: 'ad.id', operator: 'IN', value: ads.map(ad => ad.id) }] }) : { data: [] }).data || []).map(row => [row.ad_id, row]));
    const [stats, today] = await Promise.all([byDay('maximum'), byDay('today')]);
    const result = ads.map(ad => ({ ad, stats: stats.get(ad.id) || {}, today: today.get(ad.id) || {} }));
    cached = { ads: result, until: now() + cacheMs };
    return result;
  }

  async function notes(tool) {
    const rows = await prisma.funnelNote.findMany({ where: { tool }, orderBy: { createdAt: 'desc' } });
    const saved = rows.find(row => row.kind === 'rules')?.data, defaults = DEFAULT_RULES[tool] || RULE_DEFAULTS;
    const rules = { ...defaults, ...(saved || {}), text: saved?.text?.length ? saved.text : [...defaults.text] };
    return { rules, adNotes: new Map(rows.filter(row => row.kind === 'ad').map(row => [row.key, row.data])),
      log: rows.filter(row => row.kind === 'log').map(row => ({ id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt, ...row.data })) };
  }

  async function report(tool, { fresh = false } = {}) {
    if (!TOOLS.includes(tool)) return { tool, supported: false };
    if (fresh) cached = null;
    const { rules, adNotes, log } = await notes(tool);
    let metaError = null, listed = [];
    try { listed = (await metaAds()).filter(({ ad }) => LINKS[tool](copyOf(ad).link || '')); } catch (error) { metaError = error.message; }
    const ids = listed.map(({ ad }) => ad.id);
    const [ours, oursToday] = await Promise.all([ourSteps(prisma, tool, ids), ourSteps(prisma, tool, ids, startOfDay(new Date(now())))]);
    const numbers = stats => ({ spend: number(stats.spend), impressions: number(stats.impressions), cpm: number(stats.cpm), clicks: number(stats.inline_link_clicks),
      ctr: number(stats.inline_link_click_ctr), landingViews: action(stats.actions, 'landing_page_view'), purchases: action(stats.actions, 'offsite_conversion.fb_pixel_purchase') });
    const ads = listed.map(({ ad, stats, today = {} }) => {
      const link = copyOf(ad);
      const [status, statusLabel] = statusOf(ad.effective_status);
      const event = ad.adset?.promoted_object?.custom_event_type || null;
      const meta = numbers(stats), metaToday = numbers(today);
      const spend = meta.spend;
      const steps = ours.get(ad.id)?.steps || [], stepsToday = oursToday.get(ad.id)?.steps || [];
      const sales = Math.max(meta.purchases, steps.at(-1)?.people || 0);
      const body = String(link.message || '');
      return {
        id: ad.id, name: ad.name, short: short(ad.name), created: ad.created_time, campaign: ad.campaign?.name || '', adset: ad.adset?.name || '',
        status, statusLabel, event, eventLabel: EVENT_LABELS[event] || event || '—',
        image: ad.creative?.image_url || ad.creative?.thumbnail_url || null, thumb: ad.creative?.thumbnail_url || null,
        headline: link.name || '', description: link.description || '', body, words: body.split(/\s+/).filter(Boolean).length,
        meta, today: metaToday, steps, stepsToday, salesToday: Math.max(metaToday.purchases, stepsToday.at(-1)?.people || 0),
        sales, verdict: verdictOf({ status, event, spend, sales }, rules), note: adNotes.get(ad.id) || null,
      };
    }).sort((a, b) => (a.status === 'off') - (b.status === 'off') || new Date(b.created) - new Date(a.created));
    return { tool, supported: true, rules, ads, log, metaError, checkedAt: new Date(now()).toISOString() };
  }

  async function save(input = {}) {
    const tool = TOOLS.includes(input.tool) ? input.tool : null;
    const kind = ['ad', 'log', 'rules'].includes(input.kind) ? input.kind : null;
    if (!tool || !kind) throw Object.assign(new Error('Unknown note.'), { status: 400 });
    if (kind === 'log' && input.id && input.delete === true) {
      await prisma.funnelNote.deleteMany({ where: { id: String(input.id), tool, kind } });
      return { deleted: true };
    }
    const data = cleanNote(kind, input.data, DEFAULT_RULES[tool]);
    if (kind === 'log') {
      if (!data.title) throw Object.assign(new Error('A log entry needs a title.'), { status: 400 });
      if (input.id) {
        const updated = await prisma.funnelNote.updateMany({ where: { id: String(input.id), tool, kind }, data: { data } });
        if (!updated.count) throw Object.assign(new Error('That entry is gone.'), { status: 404 });
        return { id: String(input.id), data };
      }
      const row = await prisma.funnelNote.create({ data: { tool, kind, data } });
      return { id: row.id, data };
    }
    const key = kind === 'rules' ? 'current' : String(input.key || '');
    if (kind === 'ad' && !/^\d{6,25}$/.test(key)) throw Object.assign(new Error('Unknown ad.'), { status: 400 });
    const row = await prisma.funnelNote.upsert({ where: { tool_kind_key: { tool, kind, key } }, create: { tool, kind, key, data }, update: { data } });
    return { id: row.id, data };
  }

  return { report, save };
}

module.exports = { startOfDay, createAdsReport, metaClient, verdictOf, cleanNote, RULE_DEFAULTS, ENGINE_RULES, LINKS };
