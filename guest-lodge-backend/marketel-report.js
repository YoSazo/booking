// Marketel acquisition report: Meta delivery + privacy-conscious DB outcomes.
// Read-only. Run from guest-lodge-backend: node marketel-report.js [days]
try { require('dotenv').config(); } catch (_) {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const QA_HOTEL_IDS = [
  'hotel-a39be0df',
  'hotel-app-review',
  'marketel-review-inn',
  'hotel-9dbf11ec',
];
const QA_OWNER_EMAILS = [
  'bro2theno@gmail.com',
];
const ANGLES = ['direct', 'guest_app', 'assistant'];
const DEMAND_FITS = [
  'ota_leakage',
  'direct_guest_relationships',
  'existing_online_demand',
  'new_traveler_demand',
  'pms_channel_sync',
  'not_answered',
];
const DEMAND_FIT_ALIASES = {
  online_ota_leakage: 'ota_leakage',
  ota_marketplaces: 'ota_leakage',
  branded_ota_leakage: 'ota_leakage',
  existing_online_traffic: 'existing_online_demand',
  google_website: 'existing_online_demand',
  social_ads: 'existing_online_demand',
  direct_calls_messages: 'direct_guest_relationships',
  repeat_guests: 'direct_guest_relationships',
  repeat_guest_leakage: 'direct_guest_relationships',
  building_demand: 'new_traveler_demand',
  referrals_offline: 'new_traveler_demand',
  low_online_demand: 'new_traveler_demand',
};
const DEMAND_FIT_LABELS = {
  ota_leakage: 'existing guests finish on OTAs',
  direct_guest_relationships: 'callers, walk-ins and past guests',
  existing_online_demand: 'existing online traffic (legacy)',
  new_traveler_demand: 'expects new traveler demand',
  pms_channel_sync: 'expects PMS / OTA synchronization',
  not_answered: 'question not answered',
};
const DAYS = Math.max(1, Math.min(180, Number(process.argv[2]) || 7));
const TOKEN = process.env.MARKETEL_META_ADS_READ_TOKEN || process.env.MARKETEL_META_ACCESS_TOKEN;
const ACCOUNT_ID = String(process.env.MARKETEL_META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const configuredGraphVersion = String(process.env.MARKETEL_META_GRAPH_API_VERSION || 'v26.0').trim();
const normalizedGraphVersion = configuredGraphVersion.startsWith('v')
  ? configuredGraphVersion
  : `v${configuredGraphVersion}`;
const GRAPH_VERSION = /^v\d{1,2}\.\d{1,2}$/.test(normalizedGraphVersion)
  ? normalizedGraphVersion
  : 'v26.0';

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function pct(numerator, denominator) {
  return denominator ? `${(100 * numerator / denominator).toFixed(1)}%` : '—';
}

function normalizeAngle(value) {
  const angle = String(value || '').trim().toLowerCase();
  return ANGLES.includes(angle) ? angle : 'direct';
}

function normalizeDemandFit(value) {
  const clean = String(value || '').trim().toLowerCase();
  const normalized = DEMAND_FIT_ALIASES[clean] || clean;
  return DEMAND_FITS.includes(normalized) && normalized !== 'not_answered'
    ? normalized
    : 'not_answered';
}

function actionValue(actions, preferredTypes) {
  for (const actionType of preferredTypes) {
    const match = (actions || []).find((action) => action.action_type === actionType);
    if (match) return Number(match.value) || 0;
  }
  return 0;
}

function qualifiedLeadCount(actions) {
  // Do not use `/lead/`: Meta action names such as
  // `offsite_complete_registration_add_meta_leads` are registrations, not Leads.
  return actionValue(actions, [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'onsite_web_lead',
    'omni_lead',
  ]);
}

function registrationCount(actions) {
  return actionValue(actions, [
    'complete_registration',
    'offsite_conversion.fb_pixel_complete_registration',
    'omni_complete_registration',
  ]);
}

async function graph(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  }
  url.searchParams.set('access_token', TOKEN);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      throw new Error(body.error?.message || `Meta request failed with HTTP ${response.status}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function graphAll(path, params = {}) {
  const rows = [];
  let body = await graph(path, params);
  while (body) {
    rows.push(...(body.data || []));
    const next = body.paging?.next;
    if (!next) break;
    const response = await fetch(next);
    body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      throw new Error(body.error?.message || `Meta pagination failed with HTTP ${response.status}`);
    }
  }
  return rows;
}

async function marketelAdAccount() {
  if (ACCOUNT_ID) return { account_id: ACCOUNT_ID, name: 'Marketel' };
  const accounts = await graphAll('me/adaccounts', { fields: 'name,account_id', limit: 100 });
  return accounts.find((account) => /marketel/i.test(account.name || '')) || accounts[0] || null;
}

async function metaWindow(account, preset) {
  const rows = await graphAll(`act_${account.account_id}/insights`, {
    level: 'ad',
    date_preset: preset,
    limit: 500,
    fields: [
      'campaign_name',
      'adset_name',
      'ad_name',
      'spend',
      'impressions',
      'inline_link_clicks',
      'actions',
    ].join(','),
  });
  return rows.filter((row) => Number(row.spend) > 0);
}

function renderMetaRows(rows) {
  if (!rows.length) return ['    (no spend)'];
  const out = [];
  const total = { spend: 0, impressions: 0, links: 0, leads: 0, registrations: 0 };
  for (const row of rows) {
    const spend = Number(row.spend) || 0;
    const impressions = Number(row.impressions) || 0;
    const links = Number(row.inline_link_clicks) || 0;
    const leads = qualifiedLeadCount(row.actions);
    const registrations = registrationCount(row.actions);
    total.spend += spend;
    total.impressions += impressions;
    total.links += links;
    total.leads += leads;
    total.registrations += registrations;
    const name = String(row.ad_name || '?').slice(0, 30).padEnd(30);
    out.push(
      `    ${name} ${money(spend).padStart(8)} | ${String(impressions).padStart(5)} imp | ` +
      `${String(links).padStart(3)} links | link CTR ${pct(links, impressions).padStart(6)} | ` +
      `link CPC ${(links ? money(spend / links) : '—').padStart(7)} | ` +
      `${leads} Lead${leads === 1 ? '' : 's'} @ ${(leads ? money(spend / leads) : '—').padStart(7)} | ` +
      `${registrations} registration${registrations === 1 ? '' : 's'}`
    );
  }
  out.push(
    `    ── total ${money(total.spend)} | ${total.impressions} imp | ${total.links} links | ` +
    `link CTR ${pct(total.links, total.impressions)} | link CPC ${total.links ? money(total.spend / total.links) : '—'} | ` +
    `${total.leads} Leads (email) | CPL ${total.leads ? money(total.spend / total.leads) : '—'} | ` +
    `${total.registrations} registrations`
  );
  return out;
}

async function metaSection() {
  if (!TOKEN) return 'META: set MARKETEL_META_ADS_READ_TOKEN (preferred) or MARKETEL_META_ACCESS_TOKEN';
  try {
    const account = await marketelAdAccount();
    if (!account) return 'META: no accessible ad account';
    const [today, last7d] = await Promise.all([
      metaWindow(account, 'today'),
      metaWindow(account, 'last_7d'),
    ]);
    return [
      `META ADS — act_${account.account_id} (${account.name || 'Marketel'})`,
      '  [today — ad-account timezone]',
      ...renderMetaRows(today),
      '',
      '  [Meta last_7d — separate from today; do not add rows blindly]',
      ...renderMetaRows(last7d),
    ].join('\n');
  } catch (error) {
    return `META: ${error.message}`;
  }
}

function attributionTouch(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const attribution = metadata.attribution && typeof metadata.attribution === 'object'
    ? metadata.attribution
    : metadata;
  return attribution.firstTouch || attribution.latestTouch || {};
}

function dimensions(metadata, fallbackAngle) {
  const touch = attributionTouch(metadata);
  return {
    angle: normalizeAngle(touch.angle || fallbackAngle),
    source: String(touch.utm_source || 'unknown').trim().toLowerCase() || 'unknown',
    campaign: String(touch.utm_campaign || 'unlabeled').trim() || 'unlabeled',
    content: String(touch.utm_content || 'unlabeled').trim() || 'unlabeled',
  };
}

function emptyGroup(label) {
  return {
    label,
    landingViews: 0,
    started: 0,
    leads: 0,
    qualified: 0,
    completed: 0,
    revealEntered: 0,
    revealEngaged: 0,
    offerViewed: 0,
    checkoutStarted: 0,
    mismatchContinued: 0,
    trialsStarted: 0,
    trialAppsOpened: 0,
    trialLinksPlaced: 0,
    trialBookings: 0,
    trialsConverted: 0,
    trialsCanceled: 0,
    paid: 0,
    revenue: 0,
  };
}

function addProperty(group, property) {
  group.started += 1;
  if (property.events.has('Lead')) group.leads += 1;
  if (property.events.has('QualifiedLead')) group.qualified += 1;
  if (property.events.has('SetupCompleted')) group.completed += 1;
  if (property.events.has('ValueRevealStarted')) group.revealEntered += 1;
  if (property.events.has('JourneyRevealStageCompleted')) group.revealEngaged += 1;
  if (property.events.has('ActivationOfferViewed')) group.offerViewed += 1;
  if (property.events.has('CheckoutStarted')) group.checkoutStarted += 1;
  if (property.events.has('FitMismatchContinued')) group.mismatchContinued += 1;
  if (property.events.has('TrialStarted')) group.trialsStarted += 1;
  if (property.events.has('TrialNativeAppActivated')) group.trialAppsOpened += 1;
  if (property.events.has('TrialLinkPlacementConfirmed')) group.trialLinksPlaced += 1;
  if (property.events.has('TrialFirstBookingReceived')) group.trialBookings += 1;
  if (property.events.has('TrialConverted')) group.trialsConverted += 1;
  if (property.events.has('TrialCanceled')) group.trialsCanceled += 1;
  if (property.events.has('PaymentSucceeded')) group.paid += 1;
  group.revenue += property.revenue;
}

function visibleWhere(base, excludedSessionIds, excludedHotelIds) {
  const filters = [base, { hotelId: { notIn: excludedHotelIds } }];
  if (excludedSessionIds.length) {
    filters.push({ OR: [{ sessionId: null }, { sessionId: { notIn: excludedSessionIds } }] });
  }
  return { AND: filters };
}

async function dbSection() {
  const until = new Date();
  const since = new Date(until.getTime() - DAYS * 86_400_000);
  const testHotels = await prisma.hotelConfig.findMany({
    where: {
      OR: QA_OWNER_EMAILS.map((email) => ({
        ownerEmail: { equals: email, mode: 'insensitive' },
      })),
    },
    select: { id: true },
  });
  const excludedHotelIds = Array.from(new Set([
    ...QA_HOTEL_IDS,
    ...testHotels.map((hotel) => hotel.id),
  ]));
  const qaSessions = await prisma.funnelEvent.findMany({
    where: {
      OR: [
        { hotelId: { in: excludedHotelIds } },
        ...QA_OWNER_EMAILS.map((email) => ({
          guestEmail: { equals: email, mode: 'insensitive' },
        })),
      ],
      sessionId: { not: null },
    },
    distinct: ['sessionId'],
    select: { sessionId: true },
  });
  const excludedSessionIds = qaSessions.map((row) => row.sessionId).filter(Boolean);
  const events = await prisma.funnelEvent.findMany({
    where: visibleWhere({ createdAt: { gte: since, lte: until } }, excludedSessionIds, excludedHotelIds),
    select: {
      id: true,
      hotelId: true,
      eventName: true,
      eventId: true,
      sessionId: true,
      contentName: true,
      metadata: true,
      value: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const acquisition = new Map();
  for (const event of events) {
    if (event.eventName === 'AcquisitionAngle' && !acquisition.has(event.hotelId)) {
      acquisition.set(event.hotelId, event);
    }
  }
  const properties = new Map();
  for (const [hotelId, event] of acquisition) {
    properties.set(hotelId, {
      hotelId,
      dimensions: dimensions(event.metadata, event.contentName),
      demandFit: 'not_answered',
      events: new Set(),
      paymentIds: new Set(),
      revenue: 0,
    });
  }
  for (const event of events) {
    const property = properties.get(event.hotelId);
    if (!property) continue;
    property.events.add(event.eventName);
    if (event.eventName === 'QualityAnswer') {
      property.demandFit = normalizeDemandFit(event.contentName);
    }
    if (event.eventName === 'PaymentSucceeded') {
      const paymentId = event.eventId || event.id;
      if (!property.paymentIds.has(paymentId)) {
        property.paymentIds.add(paymentId);
        property.revenue += Number(event.value) || 0;
      }
    }
  }

  const angleGroups = new Map(ANGLES.map((angle) => [angle, emptyGroup(angle)]));
  const demandFitGroups = new Map(DEMAND_FITS.map((fit) => [fit, emptyGroup(DEMAND_FIT_LABELS[fit])]));
  const campaignGroups = new Map();
  const getCampaignGroup = (d) => {
    const key = `${d.angle}\u001f${d.source}\u001f${d.campaign}\u001f${d.content}`;
    if (!campaignGroups.has(key)) {
      campaignGroups.set(key, emptyGroup(`${d.angle} | ${d.source} | ${d.campaign} | ${d.content}`));
    }
    return campaignGroups.get(key);
  };
  for (const property of properties.values()) {
    addProperty(angleGroups.get(property.dimensions.angle), property);
    addProperty(demandFitGroups.get(property.demandFit), property);
    addProperty(getCampaignGroup(property.dimensions), property);
  }

  const seenLandings = new Set();
  for (const event of events) {
    if (event.eventName !== 'LandingPageView') continue;
    const identity = event.sessionId || event.eventId || event.id;
    if (seenLandings.has(identity)) continue;
    seenLandings.add(identity);
    const d = dimensions(event.metadata, event.contentName);
    angleGroups.get(d.angle).landingViews += 1;
    if (Object.keys(attributionTouch(event.metadata)).length) getCampaignGroup(d).landingViews += 1;
  }

  const paymentRows = events.filter((event) => event.eventName === 'PaymentSucceeded');
  const seenPayments = new Set();
  let cashCollected = 0;
  for (const payment of paymentRows) {
    const key = payment.eventId || payment.id;
    if (seenPayments.has(key)) continue;
    seenPayments.add(key);
    cashCollected += Number(payment.value) || 0;
  }
  const activeAccounts = await prisma.hotelConfig.count({
    where: {
      id: { notIn: excludedHotelIds },
      marketelSubscriptionStatus: 'active',
    },
  });
  const trialingAccounts = await prisma.hotelConfig.count({
    where: {
      id: { notIn: excludedHotelIds },
      marketelSubscriptionStatus: 'trialing',
    },
  });

  const renderGroup = (group) =>
    `  ${group.label.padEnd(44).slice(0, 44)} ` +
    `${String(group.landingViews).padStart(3)} land | ${String(group.started).padStart(3)} start | ` +
    `${String(group.leads).padStart(3)} Lead | ${String(group.qualified).padStart(3)} qual | ` +
    `${String(group.completed).padStart(3)} setup | ` +
    `${String(group.revealEntered).padStart(3)} reveal | ${String(group.revealEngaged).padStart(3)} engaged | ` +
    `${String(group.offerViewed).padStart(3)} offer | ${String(group.mismatchContinued).padStart(3)} override | ` +
    `${String(group.checkoutStarted).padStart(3)} checkout | ` +
    `${String(group.trialsStarted).padStart(3)} trial | ${String(group.trialsConverted).padStart(3)} convert | ` +
    `${String(group.paid).padStart(3)} paid | ${money(group.revenue)}`;

  const out = [
    `DB FUNNEL — rolling ${DAYS}d, first-touch cohorts (QA sessions excluded)`,
    '  by acquisition angle:',
    ...ANGLES.map((angle) => renderGroup(angleGroups.get(angle))),
    '',
    '  by demand already present:',
    ...DEMAND_FITS.map((fit) => renderGroup(demandFitGroups.get(fit))),
  ];
  const nonemptyCampaigns = [...campaignGroups.values()]
    .filter((group) => group.landingViews || group.started)
    .sort((a, b) => b.paid - a.paid || b.started - a.started || b.landingViews - a.landingViews);
  if (nonemptyCampaigns.length) {
    out.push('', '  by first-touch campaign/content:', ...nonemptyCampaigns.map(renderGroup));
  }
  out.push(
    '',
    `  cash collected during window: ${money(cashCollected)} (${seenPayments.size} Stripe-confirmed payment${seenPayments.size === 1 ? '' : 's'})`,
    `  currently paid non-QA accounts: ${activeAccounts} | currently trialing: ${trialingAccounts}`,
    `  trial launch milestones: ${events.filter((e) => e.eventName === 'TrialNativeAppActivated').length} app opened | ${events.filter((e) => e.eventName === 'TrialLinkPlacementConfirmed').length} link placed (self-reported) | ${events.filter((e) => e.eventName === 'TrialFirstBookingReceived').length} first booking`,
    '  Note: “engaged” means at least one reveal-stage completion, not the raw number of carousel events.'
  );
  return out.join('\n');
}

async function main() {
  console.log('='.repeat(112));
  console.log(`MARKETEL ACQUISITION REPORT  ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  console.log('='.repeat(112));
  console.log(`\n${await metaSection()}`);
  console.log(`\n${'-'.repeat(112)}\n`);
  console.log(await dbSection());
  console.log(`\n${'='.repeat(112)}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('REPORT ERROR:', error.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { qualifiedLeadCount, registrationCount, actionValue };
