'use strict';
// Marketel Payoff, the tool a buyer opens after paying. Their numbers live in
// this browser only (localStorage); the server only ever sees the access link,
// the Stripe session id after payment, or an email asking for the link again.
(() => {
  const E = window.PayoffEngine;
  const $ = id => document.getElementById(id);
  const DATA = 'payoff.v1', ACCESS = 'payoff.access', EXTRAS = 'payoff.extras', TAB = 'payoff.tab';
  const CASHFLOW = 'payoff.cashflow.v1', RESET = 'payoff.reset.v1';
  const EXTRA_NAMES = { cashflow: 'cash-flow calendar', reset: 'spending reset' };
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* Kept in memory for this visit. */ } },
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const money = cents => usd.format(cents / 100);
  const moneyWhole = cents => usdWhole.format(Math.round(cents / 100));
  const monthName = date => `${MONTHS[date.month]} ${date.year}`;
  const shortMonth = date => `${MONTHS[date.month].slice(0, 3)} ${date.year}`;
  const now = new Date();
  const start = { year: now.getFullYear(), month: now.getMonth() };
  // "$1,234.50" → 123450 cents; anything else → NaN.
  const parseMoney = text => {
    const clean = String(text || '').replace(/[$,\s]/g, '');
    if (!/^\d*\.?\d{0,2}$/.test(clean) || clean === '' || clean === '.') return NaN;
    return Math.round(Number(clean) * 100);
  };
  const parseRate = text => {
    const clean = String(text || '').replace(/[%\s]/g, '');
    if (!/^\d*\.?\d*$/.test(clean) || clean === '' || clean === '.') return NaN;
    const rate = Number(clean);
    return rate <= 100 ? rate : NaN;
  };
  const span = (className, text) => Object.assign(document.createElement('span'), { className, textContent: text });
  const duration = months => {
    const years = Math.floor(months / 12), rest = months % 12;
    return [years && `${years} year${years > 1 ? 's' : ''}`, rest && `${rest} month${rest > 1 ? 's' : ''}`].filter(Boolean).join(' ');
  };

  let state = { debts: [], extra: 0, plan: null, seen: false };
  let access = store.get(ACCESS);
  let extras = [], view = null;
  try { extras = JSON.parse(store.get(EXTRAS) || '[]').filter(id => EXTRA_NAMES[id]); } catch { extras = []; }
  const owns = id => extras.includes(id);
  let more = 0, oneTime = 0, result = null, base = null, editing = null, sheetType = 'card', clearArmed = null, toastTimer = null;
  const canUse = () => !!access;
  const save = () => store.set(DATA, JSON.stringify(state));
  function load() {
    try {
      const saved = JSON.parse(store.get(DATA) || 'null');
      if (saved && Array.isArray(saved.debts)) state = { debts: E.clean(saved.debts), extra: Math.max(0, Number(saved.extra) || 0), plan: saved.plan || null, seen: !!saved.seen };
    } catch { /* Start fresh. */ }
  }
  const nameOf = id => state.debts.find(debt => debt.id === id)?.name || 'Debt';

  function show(next) {
    view = next;
    for (const id of ['opening', 'gate', 'debts', 'result', 'cashflow', 'reset']) $(id).hidden = id !== next;
    syncTabs();
    window.scrollTo(0, 0);
  }
  function toast(text) {
    const box = $('toast');
    box.textContent = text; box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 5000);
  }

  // Your debts
  function renderDebts() {
    const list = $('debt-list');
    list.replaceChildren();
    for (const debt of state.debts) {
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'debt-row';
      const who = span('who', '');
      who.append(Object.assign(document.createElement('strong'), { textContent: debt.name }),
        span('', `${debt.type === 'loan' ? 'Loan' : 'Card'} · ${debt.apr}% · ${money(debt.minimum)}/mo`));
      row.append(who, span('amount', money(debt.balance)), span('edit', 'Edit'));
      row.addEventListener('click', () => openSheet(debt));
      const item = document.createElement('li'); item.append(row); list.append(item);
    }
    const any = state.debts.length > 0;
    $('totals').hidden = !any; $('monthly').hidden = !any;
    $('add-first').hidden = any; $('add-more').hidden = !any || state.debts.length >= E.MAX_DEBTS;
    $('debts-intro').hidden = any;
    if (!any) return;
    const minimums = state.debts.reduce((sum, debt) => sum + debt.minimum, 0);
    $('total-owed').textContent = money(state.debts.reduce((sum, debt) => sum + debt.balance, 0));
    $('total-minimums').textContent = money(minimums);
    $('monthly-total').textContent = state.extra > 0
      ? `You’ll put ${money(minimums + state.extra)} a month toward debt: ${money(minimums)} of minimums plus ${money(state.extra)} extra.`
      : `You’ll put ${money(minimums)} a month toward debt, the minimums you pay today.`;
  }

  // Add or edit a debt
  function setType(type) {
    sheetType = type;
    for (const button of document.querySelectorAll('.segmented button')) button.setAttribute('aria-checked', String(button.dataset.type === type));
    $('type-hint').textContent = type === 'loan' ? 'A loan’s payment stays the same until it’s paid off.' : 'A card’s minimum shrinks as you pay it down.';
    $('minimum-label').textContent = type === 'loan' ? 'Monthly payment' : 'Minimum payment a month';
    checkSheet(false);
  }
  function openSheet(debt = null) {
    editing = debt;
    $('sheet-title').textContent = debt ? 'Edit debt' : 'Add a debt';
    $('debt-name').value = debt && !/^Debt \d+$/.test(debt.name) ? debt.name : '';
    $('debt-balance').value = debt ? (debt.balance / 100).toFixed(2).replace(/\.00$/, '') : '';
    $('debt-apr').value = debt ? String(debt.apr) : '';
    $('debt-minimum').value = debt ? (debt.minimum / 100).toFixed(2).replace(/\.00$/, '') : '';
    $('sheet-delete').hidden = !debt;
    $('sheet-delete').textContent = 'Delete';
    for (const input of document.querySelectorAll('#debt-form input')) input.classList.remove('invalid');
    setType(debt?.type || 'card');
    $('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('sheet').hidden = true;
    document.body.style.overflow = '';
    editing = null;
  }
  // Reads the form; marks problems only when asked (on save).
  function checkSheet(mark) {
    const balance = parseMoney($('debt-balance').value), apr = parseRate($('debt-apr').value), minimum = parseMoney($('debt-minimum').value);
    const problems = [];
    if (!(balance > 0)) problems.push(['debt-balance', 'Enter the balance.']);
    if (!Number.isFinite(apr)) problems.push(['debt-apr', 'Enter the interest rate (0 if there is none).']);
    if (!(minimum > 0)) problems.push(['debt-minimum', sheetType === 'loan' ? 'Enter the monthly payment.' : 'Enter the minimum payment.']);
    if (mark) for (const id of ['debt-balance', 'debt-apr', 'debt-minimum']) $(id).classList.toggle('invalid', problems.some(([bad]) => bad === id));
    let note = mark && problems.length ? problems[0][1] : '';
    if (!note && balance > 0 && Number.isFinite(apr) && minimum > 0) {
      const interest = E.monthlyInterest(balance, apr);
      if (minimum <= interest) note = `This payment doesn’t cover the ${money(interest)} of interest a month, so on its own the balance won’t go down.`;
      else if (minimum > balance + interest) note = 'The payment is more than the balance, so this one is paid off next month.';
    }
    $('sheet-warning').textContent = note;
    return { ok: !problems.length, balance, apr, minimum };
  }
  function saveSheet(submit) {
    submit.preventDefault();
    const { ok, balance, apr, minimum } = checkSheet(true);
    if (!ok) return;
    const debt = { id: editing?.id || `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: $('debt-name').value.trim() || `Debt ${editing ? state.debts.indexOf(editing) + 1 : state.debts.length + 1}`,
      type: sheetType, balance, apr, minimum };
    if (editing) state.debts = state.debts.map(old => old.id === editing.id ? debt : old);
    else state.debts.push(debt);
    save(); closeSheet(); renderDebts();
  }
  function deleteDebt() {
    const button = $('sheet-delete');
    if (button.textContent === 'Delete') { button.textContent = 'Tap again to delete'; return; }
    state.debts = state.debts.filter(debt => debt.id !== editing.id);
    save(); closeSheet(); renderDebts();
  }

  // The result
  function compute() {
    const extra = state.extra + more;
    result = E.plan(state.debts, { extra, oneTime, start });
    base = more || oneTime ? E.plan(state.debts, { extra: state.extra, start }) : result;
    if (!result.plans.some(plan => plan.key === state.plan)) state.plan = result.fastest || 'avalanche';
  }
  const planOf = key => result.plans.find(plan => plan.key === key);
  function renderResult() {
    compute();
    const fastest = planOf(result.fastest), minimums = result.minimums;
    const whatIf = more || oneTime;
    const labelBits = [more && `+${moneyWhole(more)} a month`, oneTime && `${moneyWhole(oneTime)} once`].filter(Boolean);
    $('date-label').textContent = whatIf ? `Debt-free with ${labelBits.join(' and ')}` : 'Debt-free';
    $('date-big').textContent = fastest ? monthName(fastest.date) : 'Not within 50 years';
    $('date-plan').textContent = fastest ? `${fastest.name} · ${duration(fastest.months)} · ${moneyWhole(fastest.totalInterest)} interest` : 'Try paying a little more each month to see a date.';
    const baseFastest = base.plans.find(plan => plan.key === base.fastest);
    const sooner = whatIf && fastest && baseFastest ? baseFastest.months - fastest.months : 0;
    $('date-was').hidden = !whatIf || !fastest;
    $('date-was').textContent = sooner > 0 ? `${duration(sooner)} sooner than ${monthName(baseFastest.date)}` : baseFastest ? `Same month as without it (${monthName(baseFastest.date)})` : 'Without it: not within 50 years';
    const neverOnMinimums = result.warnings.some(warning => warning.kind === 'below-interest');
    $('date-minimums').textContent = minimums.months
      ? `Paying only the minimums: ${monthName(minimums.date)}`
      : `Paying only the minimums: ${neverOnMinimums ? 'never' : 'not within 50 years'}`;
    const win = $('date-win');
    if (fastest && minimums.months && minimums.months > fastest.months) {
      win.hidden = false;
      win.textContent = `${duration(minimums.months - fastest.months)} sooner · ${moneyWhole(Math.max(0, minimums.totalInterest - fastest.totalInterest))} less interest`;
    } else if (fastest && !minimums.months) {
      win.hidden = false; win.textContent = 'Your plan gets you out. Minimums alone wouldn’t.';
    } else win.hidden = true;

    const plans = $('plans');
    plans.replaceChildren();
    for (const plan of result.plans) {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'plan'; card.dataset.plan = plan.key;
      card.setAttribute('aria-pressed', String(plan.key === state.plan));
      card.append(Object.assign(document.createElement('strong'), { textContent: plan.name }),
        span('when', plan.months ? shortMonth(plan.date) : (plan.key === 'minimums' && neverOnMinimums ? 'Never' : '50+ years')),
        span('note', plan.key === 'minimums' ? `${money(plan.monthly)} a month, shrinking` : plan.note),
        span('cost', `${moneyWhole(plan.totalInterest)} interest`));
      if (plan.key === result.fastest) card.append(span('tag', 'Fastest'));
      card.addEventListener('click', () => { state.plan = plan.key; save(); renderPlan(); });
      plans.append(card);
    }
    renderPlan();
    renderWarnings();
  }
  function renderPlan() {
    const plan = planOf(state.plan);
    for (const card of document.querySelectorAll('.plan')) card.setAttribute('aria-pressed', String(card.dataset.plan === plan.key));
    $('order-title').textContent = `Payoff order · ${plan.name}`;
    const list = $('payoff-order');
    list.replaceChildren();
    const ids = [...plan.order].sort((a, b) => (plan.payoffMonth[a] ?? Infinity) - (plan.payoffMonth[b] ?? Infinity));
    for (const id of ids) {
      const debt = state.debts.find(item => item.id === id);
      const item = document.createElement('li');
      const who = span('who', debt.name);
      who.append(span('', `${money(debt.balance)} at ${debt.apr}%`));
      const month = plan.payoffMonth[id];
      item.append(who, span('gone', month ? `Gone ${shortMonth(E.addMonths(start, month))}` : 'Not paid off'));
      list.append(item);
    }
    renderSchedule(plan);
  }
  // Grouped by year; a year's months are drawn only when it is opened.
  function renderSchedule(plan, all = false) {
    const box = $('schedule');
    box.replaceChildren();
    $('schedule-intro').textContent = plan.key === 'minimums'
      ? 'What to pay on each debt if you pay only the minimums.'
      : `What to pay on each debt. ${money(plan.monthly)} a month in total${oneTime ? `, plus ${money(oneTime)} in the first month` : ''}.`;
    const years = new Map();
    for (const row of plan.rows) {
      const date = E.addMonths(start, row.month);
      if (!years.has(date.year)) years.set(date.year, []);
      years.get(date.year).push({ row, date });
    }
    let first = true;
    for (const [year, rows] of years) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.append(document.createTextNode(String(year)), span('', `${money(rows.reduce((sum, { row }) => sum + Object.values(row.payments).reduce((a, b) => a + b, 0), 0))} paid`));
      details.append(summary);
      const fill = () => {
        if (details.dataset.filled) return;
        details.dataset.filled = '1';
        for (const { row, date } of rows) {
          const month = document.createElement('div');
          month.className = 'month';
          const head = document.createElement('div');
          head.className = 'month-head';
          head.append(span('', monthName(date)), span('', money(Object.values(row.payments).reduce((a, b) => a + b, 0))));
          month.append(head);
          for (const [id, amount] of Object.entries(row.payments)) {
            if (!amount) continue;
            const line = document.createElement('div');
            line.className = 'month-line';
            const paidOff = plan.payoffMonth[id] === row.month;
            line.append(span(paidOff ? 'done' : '', paidOff ? `${nameOf(id)} · paid off` : nameOf(id)), span('', money(amount)));
            month.append(line);
          }
          details.append(month);
        }
      };
      details.addEventListener('toggle', () => { if (details.open) fill(); });
      if (first || all) { details.open = true; fill(); }
      first = false;
      box.append(details);
    }
    if (!plan.rows.length) box.append(span('muted', 'Nothing to pay.'));
  }
  function renderWarnings() {
    const box = $('warnings');
    box.replaceChildren();
    for (const warning of result.warnings) {
      const text = warning.kind === 'below-interest'
        ? `${nameOf(warning.id)}: the minimum doesn’t cover its ${money(warning.interest)} of monthly interest. On minimums alone this balance grows.`
        : `${nameOf(warning.id)} is at 0%. Promotional rates usually end; when yours does, update the rate here.`;
      box.append(Object.assign(document.createElement('p'), { className: 'warning', textContent: text }));
    }
  }

  // Tabs: Plan, plus the extras this order includes.
  function syncTabs() {
    const inTool = ['debts', 'result', 'cashflow', 'reset'].includes(view);
    $('tabs').hidden = !inTool || !extras.length;
    const current = view === 'debts' || view === 'result' ? 'plan' : view;
    for (const button of document.querySelectorAll('#tabs button')) {
      button.hidden = button.dataset.tab !== 'plan' && !owns(button.dataset.tab);
      if (button.dataset.tab === current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
  }
  function setExtras(list) {
    if (!Array.isArray(list)) return;
    extras = list.filter(id => EXTRA_NAMES[id]);
    store.set(EXTRAS, JSON.stringify(extras));
    syncTabs();
  }
  function openTab(name) {
    if (name !== 'plan' && !owns(name)) name = 'plan';
    store.set(TAB, name);
    if (name === 'cashflow') {
      $('cf-balance').value = cf.balance ? (cf.balance / 100).toFixed(2).replace(/\.00$/, '') : '';
      $('cf-debts').checked = cf.debts; $('cf-debt-day').value = String(cf.debtDay);
      cfMonth = 0; cfPicked = null;
      renderCashflow(); show('cashflow');
    } else if (name === 'reset') { resetPicked = null; renderReset(); show('reset'); }
    else if (state.debts.length && state.seen) { renderResult(); show('result'); }
    else { renderDebts(); show('debts'); }
  }

  // Cash-flow calendar
  const iso = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayIso = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
  const dayLabel = date => new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const shortDay = date => new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const compact = cents => {
    const dollars = Math.abs(cents) / 100;
    const text = dollars >= 10000 ? Math.round(dollars / 1000) + 'k' : dollars >= 1000 ? (dollars / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(dollars));
    return (cents < 0 ? '-$' : '$') + text;
  };
  const REPEAT_TEXT = { once: 'Once', weekly: 'Every week', biweekly: 'Every 2 weeks', 'twice-monthly': '1st and 15th', monthly: 'Every month' };
  let cf = { balance: 0, items: [], ahead: 3, debts: false, debtDay: 1 };
  let cfMonth = 0, cfPicked = null, cfEditing = null, cfKind = 'income';
  try {
    const saved = JSON.parse(store.get(CASHFLOW) || 'null');
    if (saved && Array.isArray(saved.items)) cf = { ...cf, ...saved, items: saved.items.filter(item => item && item.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) };
  } catch { /* Start fresh. */ }
  const saveCf = () => store.set(CASHFLOW, JSON.stringify(cf));
  // The plan's payment for each month, on the day the buyer picked.
  function debtItems() {
    if (!cf.debts || !state.debts.length) return [];
    const planned = E.plan(state.debts, { extra: state.extra, start });
    const plan = planned.plans.find(item => item.key === (state.plan || planned.fastest)) || planned.plans.find(item => item.key === 'avalanche');
    const items = [];
    for (let i = 0; i <= cf.ahead; i += 1) {
      const row = plan.rows[Math.max(0, i - 1)];
      if (!row || (i > 0 && i - 1 >= plan.rows.length)) break;
      const { year, month } = E.addMonths(start, i);
      const day = Math.min(cf.debtDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
      items.push({ id: 'debts', name: 'Debt payments', kind: 'bill', repeat: 'once', date: iso(year, month, day),
        amount: Object.values(row.payments).reduce((sum, value) => sum + value, 0) });
    }
    return items;
  }
  function renderCashflow() {
    const today = todayIso();
    const items = [...cf.items, ...debtItems()];
    const result = E.cashflow({ today, balance: cf.balance, items, months: cf.ahead });
    for (const chip of document.querySelectorAll('[data-ahead]')) chip.setAttribute('aria-pressed', String(Number(chip.dataset.ahead) === cf.ahead));
    const alert = $('cf-alert');
    alert.hidden = !items.length;
    alert.replaceChildren();
    if (items.length) {
      const short = result.shortfalls[0];
      const words = cf.ahead === 1 ? 'month' : `${cf.ahead} months`;
      alert.className = 'cf-alert ' + (short ? 'is-short' : 'is-ok');
      alert.append(Object.assign(document.createElement('strong'), { textContent: short
        ? `Short by ${money(-short.balance)} on ${dayLabel(short.date)}`
        : `You stay above $0 for the next ${words}` }),
      document.createTextNode(short
        ? `${short.event ? `That’s when ${short.event.name} (${money(-short.event.amount)}) comes out. ` : ''}Set aside ${money(-short.balance)} before then, or move a bill.${result.shortfalls.length > 1 ? ` It happens ${result.shortfalls.length} times in the next ${words}.` : ''}`
        : `Lowest point: ${money(result.lowest.balance)} on ${dayLabel(result.lowest.date)}.`));
    }
    // One month at a time, within the look-ahead.
    const byDate = new Map(result.daily.map(day => [day.date, day]));
    const last = result.daily.at(-1).date;
    const maxMonth = (+last.slice(0, 4) - start.year) * 12 + (+last.slice(5, 7) - 1 - start.month);
    cfMonth = Math.min(Math.max(0, cfMonth), maxMonth);
    const { year, month } = E.addMonths(start, cfMonth);
    $('cf-month-title').textContent = `${MONTHS[month]} ${year}`;
    $('cf-prev').disabled = cfMonth === 0; $('cf-next').disabled = cfMonth >= maxMonth;
    const grid = $('cf-grid');
    grid.replaceChildren(...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(letter => span('dow', letter)));
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay(), length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let i = 0; i < first; i += 1) grid.append(span('', ''));
    for (let d = 1; d <= length; d += 1) {
      const date = iso(year, month, d), day = byDate.get(date);
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = 'cf-day'; cell.textContent = String(d);
      if (!day) { cell.classList.add('is-past'); cell.disabled = true; } else {
        cell.append(span('', compact(day.balance)));
        if (day.balance < 0) cell.classList.add('is-low');
        if (day.events.length) cell.classList.add('has-event');
        if (cfPicked === date) cell.classList.add('is-picked');
        cell.setAttribute('aria-label', `${dayLabel(date)}: balance ${money(day.balance)}${day.events.length ? `, ${day.events.length} in or out` : ''}`);
        cell.addEventListener('click', () => { cfPicked = cfPicked === date ? null : date; renderCashflow(); });
      }
      grid.append(cell);
    }
    const agenda = $('cf-agenda');
    agenda.replaceChildren();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    for (const day of result.daily) {
      if (!day.date.startsWith(prefix) || !day.events.length || (cfPicked && cfPicked !== day.date)) continue;
      day.events.forEach((event, index) => {
        const item = document.createElement('li');
        item.append(span('when', shortDay(day.date)), span('', event.name),
          span('amt' + (event.amount > 0 ? ' in' : ''), (event.amount > 0 ? '+' : '−') + money(Math.abs(event.amount))));
        if (index === day.events.length - 1) item.append(span('bal' + (day.balance < 0 ? ' low' : ''), `Balance after: ${money(day.balance)}`));
        agenda.append(item);
      });
    }
    if (!agenda.children.length) {
      const item = document.createElement('li');
      item.append(span('empty', cfPicked ? `Nothing in or out on ${dayLabel(cfPicked)}. Balance: ${money(byDate.get(cfPicked).balance)}.` : 'Nothing coming in or out this month.'));
      agenda.append(item);
    }
    const list = $('cf-items');
    list.replaceChildren();
    const rows = [...cf.items].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1) || a.date.localeCompare(b.date));
    for (const entry of rows) {
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'debt-row';
      const who = span('who', '');
      who.append(Object.assign(document.createElement('strong'), { textContent: entry.name }),
        span('', `${REPEAT_TEXT[entry.repeat] || 'Once'} · ${entry.repeat === 'once' ? '' : 'from '}${shortDay(entry.date)}`));
      row.append(who, span('amount', (entry.kind === 'income' ? '+' : '−') + money(entry.amount)), span('edit', 'Edit'));
      row.addEventListener('click', () => openCfSheet(entry));
      const item = document.createElement('li'); item.append(row); list.append(item);
    }
    $('cf-debts-row').hidden = !state.debts.length;
    $('cf-intro').hidden = cf.items.length > 0;
  }
  function setCfKind(kind) {
    cfKind = kind;
    for (const button of document.querySelectorAll('[data-kind]')) button.setAttribute('aria-checked', String(button.dataset.kind === kind));
    $('cf-name').placeholder = kind === 'income' ? 'e.g. Paycheck' : 'e.g. Rent';
  }
  function openCfSheet(entry = null, kind = 'income') {
    cfEditing = entry;
    $('cf-sheet-title').textContent = entry ? 'Edit' : kind === 'income' ? 'Add income' : 'Add a bill';
    setCfKind(entry?.kind || kind);
    $('cf-name').value = entry?.name || '';
    $('cf-amount').value = entry ? (entry.amount / 100).toFixed(2).replace(/\.00$/, '') : '';
    $('cf-repeat').value = entry?.repeat || (kind === 'income' ? 'biweekly' : 'monthly');
    $('cf-date').value = entry?.date || todayIso();
    $('cf-warning').textContent = '';
    $('cf-delete').hidden = !entry; $('cf-delete').textContent = 'Delete';
    $('cf-amount').classList.remove('invalid');
    $('cf-sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeCfSheet() { $('cf-sheet').hidden = true; document.body.style.overflow = ''; cfEditing = null; }
  function saveCfSheet(submit) {
    submit.preventDefault();
    const amount = parseMoney($('cf-amount').value), date = $('cf-date').value;
    $('cf-amount').classList.toggle('invalid', !(amount > 0));
    if (!(amount > 0)) { $('cf-warning').textContent = 'Enter the amount.'; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $('cf-warning').textContent = 'Pick the date.'; return; }
    const entry = { id: cfEditing?.id || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: $('cf-name').value.trim() || (cfKind === 'income' ? 'Income' : 'Bill'), kind: cfKind, amount, repeat: $('cf-repeat').value, date };
    cf.items = cfEditing ? cf.items.map(old => old.id === cfEditing.id ? entry : old) : [...cf.items, entry];
    saveCf(); closeCfSheet(); renderCashflow();
  }

  // Spending reset
  const ESSENTIALS = ['Rent or mortgage', 'Groceries', 'Utilities', 'Debt payments', 'Gas', 'Phone', 'Insurance', 'Medicine', 'Childcare'];
  const PAUSABLE = ['Takeout', 'Coffee out', 'Online shopping', 'Clothes', 'Alcohol', 'Subscriptions', 'Impulse buys', 'Beauty', 'Games and apps', 'Other spending'];
  const RULE_IDEAS = ['Wait 48 hours before buying anything not on my list', 'Groceries from a list only', 'Delete shopping apps until it’s over', 'Unsubscribe from store emails', 'Cook at home, even simple meals'];
  let reset = { active: false, length: 14, essentials: ['Rent or mortgage', 'Groceries', 'Utilities', 'Debt payments'], paused: [], rules: [], start: null, log: {} };
  let resetPicked = null;
  try {
    const saved = JSON.parse(store.get(RESET) || 'null');
    if (saved && Array.isArray(saved.paused)) reset = { ...reset, ...saved, log: saved.log || {} };
  } catch { /* Start fresh. */ }
  const saveReset = () => store.set(RESET, JSON.stringify(reset));
  function toggleChip(label, on, onTap, extraClass = '') {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'chip ' + extraClass; chip.textContent = label;
    chip.setAttribute('aria-pressed', String(on));
    chip.addEventListener('click', onTap);
    return chip;
  }
  function renderReset() {
    const tracking = reset.active && reset.start;
    $('reset-setup').hidden = !!tracking; $('reset-track').hidden = !tracking;
    if (!tracking) return renderResetSetup();
    const today = todayIso();
    const summary = E.resetSummary(reset, today);
    const picked = resetPicked || (summary.done ? null : today);
    $('reset-dates').textContent = `${shortDay(reset.start)} – ${shortDay(summary.end)}`;
    $('reset-title').textContent = summary.done ? 'Your reset is done' : `Day ${summary.day} of ${summary.length}`;
    $('reset-saved').textContent = moneyWhole(summary.saved);
    $('reset-streak').textContent = `${summary.streak} day${summary.streak === 1 ? '' : 's'}`;
    $('reset-today').hidden = !picked;
    if (picked) {
      const entry = reset.log[picked];
      $('reset-question').textContent = picked === today ? 'Today: did you stick to it?' : `${dayLabel(picked)}: did you stick to it?`;
      $('reset-kept').setAttribute('aria-pressed', String(entry?.kept === true));
      $('reset-slipped').setAttribute('aria-pressed', String(entry?.kept === false));
      $('reset-spent-row').hidden = entry?.kept !== false;
      if (document.activeElement !== $('reset-spent')) $('reset-spent').value = entry?.spent ? (entry.spent / 100).toFixed(2).replace(/\.00$/, '') : '';
      $('reset-logged').textContent = !entry ? '' : entry.kept ? 'Logged: you stuck to it. Nice.' : 'Logged: a slip. It happens. Tomorrow counts just as much.';
    }
    const days = $('reset-days');
    days.replaceChildren();
    summary.days.forEach((day, index) => {
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = `reset-day ${day.status}`; cell.textContent = String(index + 1);
      if (day.date === picked) cell.classList.add('is-picked');
      cell.setAttribute('aria-label', `Day ${index + 1}, ${dayLabel(day.date)}: ${{ kept: 'stuck to it', slipped: 'slipped', missed: 'not logged', today: 'today', ahead: 'ahead' }[day.status]}`);
      if (day.status === 'ahead') cell.disabled = true;
      else cell.addEventListener('click', () => { resetPicked = day.date; renderReset(); });
      days.append(cell);
    });
    const review = $('reset-review');
    review.replaceChildren(Object.assign(document.createElement('h2'), { textContent: summary.done ? 'What changed' : 'So far' }));
    const logged = summary.kept + summary.slipped;
    const lines = [
      `You stuck to it ${summary.kept} of ${logged || 0} logged day${logged === 1 ? '' : 's'}${summary.missed ? ` (${summary.missed} not logged)` : ''}.`,
      summary.perDay ? `About ${moneyWhole(summary.saved)} not spent on ${reset.paused.map(item => item.name.toLowerCase()).join(', ')}.` : 'Add what the paused things usually cost to see what you saved.',
    ];
    if (summary.spent) lines.push(`${money(summary.spent)} went on paused things anyway.`);
    for (const line of lines) review.append(Object.assign(document.createElement('p'), { textContent: line }));
    if (summary.saved > 0 && state.debts.length && state.seen) {
      const toward = document.createElement('button');
      toward.type = 'button'; toward.className = 'big'; toward.textContent = `Put ${moneyWhole(summary.saved)} toward my debt`;
      toward.addEventListener('click', () => {
        oneTime = summary.saved;
        $('one-time').value = (summary.saved / 100).toFixed(2).replace(/\.00$/, '');
        openTab('plan');
        toast(`Added ${moneyWhole(summary.saved)} as a one-time payment. Here’s your new date.`);
      });
      review.append(toward);
    }
    const rules = $('reset-rules-view');
    rules.replaceChildren(...(reset.rules.length ? reset.rules : ['No rules set']).map(rule => Object.assign(document.createElement('li'), { textContent: rule })));
    $('reset-paused-view').textContent = reset.paused.map(item => item.weekly ? `${item.name} (~${moneyWhole(item.weekly)}/wk)` : item.name).join(', ');
    $('reset-essentials-view').textContent = reset.essentials.join(', ') || 'Nothing listed';
    $('reset-new').hidden = !summary.done;
    $('reset-end').hidden = summary.done;
  }
  function renderResetSetup() {
    for (const chip of document.querySelectorAll('[data-length]')) chip.setAttribute('aria-pressed', String(Number(chip.dataset.length) === reset.length));
    $('reset-essentials').replaceChildren(...ESSENTIALS.map(name => toggleChip(name, reset.essentials.includes(name), () => {
      reset.essentials = reset.essentials.includes(name) ? reset.essentials.filter(item => item !== name) : [...reset.essentials, name];
      saveReset(); renderResetSetup();
    })));
    const pausedNames = reset.paused.map(item => item.name);
    $('reset-paused-chips').replaceChildren(...PAUSABLE.map(name => toggleChip(name, pausedNames.includes(name), () => {
      reset.paused = pausedNames.includes(name) ? reset.paused.filter(item => item.name !== name) : [...reset.paused, { name, weekly: 0 }];
      saveReset(); renderResetSetup();
    })));
    const costs = $('reset-paused-costs');
    costs.replaceChildren();
    for (const item of reset.paused) {
      const row = document.createElement('li');
      const box = span('money-input', '');
      const input = Object.assign(document.createElement('input'), { inputMode: 'decimal', autocomplete: 'off', placeholder: '0',
        value: item.weekly ? (item.weekly / 100).toFixed(2).replace(/\.00$/, '') : '' });
      input.setAttribute('aria-label', `${item.name}, usual cost a week`);
      input.addEventListener('input', () => { const value = parseMoney(input.value); item.weekly = value > 0 ? value : 0; saveReset(); });
      box.append(Object.assign(document.createElement('b'), { textContent: '$' }), input, span('', '/wk'));
      row.append(span('', item.name), box);
      costs.append(row);
    }
    $('reset-rule-ideas').replaceChildren(...RULE_IDEAS.filter(rule => !reset.rules.includes(rule)).map(rule => toggleChip('+ ' + rule, false, () => {
      reset.rules = [...reset.rules, rule].slice(0, 8); saveReset(); renderResetSetup();
    }, 'is-add')));
    const rules = $('reset-rules');
    rules.replaceChildren();
    for (const rule of reset.rules) {
      const row = document.createElement('li');
      const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: '×' });
      remove.setAttribute('aria-label', `Remove rule: ${rule}`);
      remove.addEventListener('click', () => { reset.rules = reset.rules.filter(item => item !== rule); saveReset(); renderResetSetup(); });
      row.append(span('', rule), remove);
      rules.append(row);
    }
  }
  function logDay(kept) {
    const date = resetPicked || todayIso();
    const before = reset.log[date];
    reset.log[date] = { kept, spent: kept ? 0 : before?.spent || 0 };
    saveReset(); renderReset();
    if (!kept) $('reset-spent').focus();
  }

  function enter() {
    load();
    renderDebts();
    openTab(store.get(TAB) || 'plan');
  }
  // Which extras the order includes can change (an older link, a refund), so
  // ask again quietly on every visit; only the link travels, never numbers.
  function refreshExtras() {
    post('/api/payoff/access', { token: access }).then(reply => { if (reply.ok) setExtras(reply.body.extras); }).catch(() => {});
  }
  const paidToast = (emailSent, owned) => {
    const names = owned.map(id => EXTRA_NAMES[id]);
    return `Payment confirmed.${names.length ? ` Your ${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} in the tabs at the top.` : ''}${emailSent ? ' We emailed you this link too.' : ''}`;
  };
  function grant(token) {
    access = token;
    store.set(ACCESS, token);
    history.replaceState(null, '', '/payoff/app');
  }
  const post = (route, body) => fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async response => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }));

  async function openFromLink(token) {
    show('opening');
    $('opening-status').textContent = 'Checking your link.';
    try {
      const reply = await post('/api/payoff/access', { token });
      if (!reply.ok) throw Object.assign(new Error(reply.body.message || 'This link is not valid.'), { refused: true });
      grant(token); setExtras(reply.body.extras); enter();
    } catch (error) {
      if (!error.refused && canUse()) { history.replaceState(null, '', '/payoff/app'); return enter(); }
      history.replaceState(null, '', '/payoff/app');
      show('gate');
      $('resend-status').textContent = error.refused ? error.message : 'We couldn’t check your link. Check your connection and open it again.';
    }
  }
  // `order` is { sessionId } after Stripe's hosted page, or { paymentIntent }
  // after the order page's own form (or a wallet or bank that redirected).
  async function openAfterPayment(order, tries = 0) {
    show('opening');
    $('opening-title').textContent = 'Opening your plan…';
    $('opening-status').textContent = 'Checking your payment with Stripe.';
    $('opening-retry').hidden = true; $('opening-help').hidden = true; $('opening-back').hidden = true;
    try {
      const reply = await post('/api/payoff/confirm', order);
      if (reply.status === 402 && order.paymentIntent) {
        $('opening-title').textContent = 'Your payment didn’t go through';
        $('opening-status').textContent = reply.body.message || 'You weren’t charged. Go back to checkout to try again.';
        $('opening-back').hidden = false;
        return;
      }
      if (!reply.ok || !reply.body.access) throw Object.assign(new Error(reply.body.message || 'We couldn’t confirm your payment yet.'), { processing: reply.body.processing });
      try { sessionStorage.removeItem('payoff.attempt'); } catch { /* Optional. */ }
      grant(reply.body.access); setExtras(reply.body.extras || []); enter();
      toast(paidToast(reply.body.emailSent, extras));
    } catch (error) {
      if (tries < 2 && !error.processing) return setTimeout(() => openAfterPayment(order, tries + 1), 1500);
      $('opening-title').textContent = 'Your payment is still confirming';
      $('opening-status').textContent = error.message;
      $('opening-retry').hidden = false; $('opening-help').hidden = false;
    }
  }
  const paymentReference = () => {
    const params = new URLSearchParams(location.search);
    return params.get('payment_intent') ? { paymentIntent: params.get('payment_intent') } : { sessionId: params.get('session_id') };
  };

  // Wiring
  document.addEventListener('touchstart', () => {}, { passive: true });
  $('add-first').addEventListener('click', () => openSheet());
  $('add-more').addEventListener('click', () => openSheet());
  $('debt-form').addEventListener('submit', saveSheet);
  $('debt-form').addEventListener('input', () => checkSheet(false));
  $('sheet-cancel').addEventListener('click', closeSheet);
  $('sheet-delete').addEventListener('click', deleteDebt);
  $('sheet').addEventListener('click', event => { if (event.target === $('sheet')) closeSheet(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  for (const button of document.querySelectorAll('.segmented button')) button.addEventListener('click', () => setType(button.dataset.type));
  $('extra').addEventListener('input', () => {
    const value = parseMoney($('extra').value);
    state.extra = value > 0 ? value : 0;
    save(); renderDebts();
  });
  $('show-result').addEventListener('click', () => {
    state.seen = true; state.plan = null; save();
    renderResult(); show('result');
  });
  $('edit-debts').addEventListener('click', () => {
    $('extra').value = state.extra ? (state.extra / 100).toFixed(2).replace(/\.00$/, '') : '';
    renderDebts(); show('debts');
  });
  for (const chip of document.querySelectorAll('.chip')) chip.addEventListener('click', () => {
    const value = Number(chip.dataset.more);
    more = more === value ? 0 : value;
    for (const other of document.querySelectorAll('.chip')) other.setAttribute('aria-pressed', String(Number(other.dataset.more) === more));
    renderResult();
  });
  $('one-time').addEventListener('input', () => {
    const value = parseMoney($('one-time').value);
    oneTime = value > 0 ? value : 0;
    renderResult();
  });
  $('save-pdf').addEventListener('click', () => {
    const plan = planOf(state.plan);
    $('print-head').textContent = `Marketel Payoff · ${plan.name} plan · made ${monthName(start)}`;
    renderSchedule(plan, true);
    window.print();
  });
  $('clear').addEventListener('click', () => {
    const button = $('clear');
    if (!clearArmed) {
      button.textContent = 'Tap again to clear everything';
      clearArmed = setTimeout(() => { clearArmed = null; button.textContent = 'Clear my numbers'; }, 4000);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null; button.textContent = 'Clear my numbers';
    state = { debts: [], extra: 0, plan: null, seen: false };
    more = 0; oneTime = 0; $('one-time').value = ''; $('extra').value = '';
    for (const chip of document.querySelectorAll('.chip')) chip.setAttribute('aria-pressed', 'false');
    save(); renderDebts(); show('debts');
    toast('Cleared. Your numbers are gone from this phone.');
  });
  $('opening-retry').addEventListener('click', () => openAfterPayment(paymentReference()));
  $('resend-form').addEventListener('submit', async submit => {
    submit.preventDefault();
    const email = $('resend-email').value.trim(), button = $('resend-button');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('resend-status').textContent = 'Enter the email you used at checkout.'; return; }
    button.disabled = true; button.textContent = 'Sending…';
    try {
      const reply = await post('/api/payoff/resend', { email });
      $('resend-status').textContent = reply.ok ? 'If that email bought Payoff, your link is on its way. Check spam too.' : (reply.body.message || 'Please try again.');
    } catch { $('resend-status').textContent = 'We couldn’t send it. Check your connection and try again.'; }
    button.disabled = false; button.textContent = 'Email me my link';
  });

  for (const button of document.querySelectorAll('#tabs button')) button.addEventListener('click', () => openTab(button.dataset.tab));
  $('cf-balance').addEventListener('input', () => { const value = parseMoney($('cf-balance').value.replace(/^-/, '')); cf.balance = (value > 0 ? value : 0) * ($('cf-balance').value.trim().startsWith('-') ? -1 : 1); saveCf(); renderCashflow(); });
  for (const chip of document.querySelectorAll('[data-ahead]')) chip.addEventListener('click', () => { cf.ahead = Number(chip.dataset.ahead); saveCf(); renderCashflow(); });
  $('cf-prev').addEventListener('click', () => { cfMonth -= 1; cfPicked = null; renderCashflow(); });
  $('cf-next').addEventListener('click', () => { cfMonth += 1; cfPicked = null; renderCashflow(); });
  $('cf-add-income').addEventListener('click', () => openCfSheet(null, 'income'));
  $('cf-add-bill').addEventListener('click', () => openCfSheet(null, 'bill'));
  for (const button of document.querySelectorAll('[data-kind]')) button.addEventListener('click', () => setCfKind(button.dataset.kind));
  $('cf-form').addEventListener('submit', saveCfSheet);
  $('cf-cancel').addEventListener('click', closeCfSheet);
  $('cf-sheet').addEventListener('click', event => { if (event.target === $('cf-sheet')) closeCfSheet(); });
  $('cf-delete').addEventListener('click', () => {
    if ($('cf-delete').textContent === 'Delete') { $('cf-delete').textContent = 'Tap again to delete'; return; }
    cf.items = cf.items.filter(item => item.id !== cfEditing.id); saveCf(); closeCfSheet(); renderCashflow();
  });
  $('cf-debts').addEventListener('change', () => { cf.debts = $('cf-debts').checked; saveCf(); renderCashflow(); });
  $('cf-debt-day').addEventListener('input', () => { const day = Math.round(Number($('cf-debt-day').value)); if (day >= 1 && day <= 31) { cf.debtDay = day; saveCf(); renderCashflow(); } });
  let cfClearArmed = null;
  $('cf-clear').addEventListener('click', () => {
    if (!cfClearArmed) { $('cf-clear').textContent = 'Tap again to clear cash flow'; cfClearArmed = setTimeout(() => { cfClearArmed = null; $('cf-clear').textContent = 'Clear cash flow'; }, 4000); return; }
    clearTimeout(cfClearArmed); cfClearArmed = null; $('cf-clear').textContent = 'Clear cash flow';
    cf = { balance: 0, items: [], ahead: 3, debts: false, debtDay: 1 }; saveCf(); openTab('cashflow');
  });
  for (const chip of document.querySelectorAll('[data-length]')) chip.addEventListener('click', () => { reset.length = Number(chip.dataset.length); saveReset(); renderResetSetup(); });
  $('reset-rule').addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const rule = $('reset-rule').value.trim();
    if (rule && !reset.rules.includes(rule)) { reset.rules = [...reset.rules, rule].slice(0, 8); saveReset(); renderResetSetup(); }
    $('reset-rule').value = '';
  });
  $('reset-start').addEventListener('click', () => {
    const rule = $('reset-rule').value.trim();
    if (rule && !reset.rules.includes(rule)) reset.rules = [...reset.rules, rule].slice(0, 8);
    $('reset-rule').value = '';
    if (!reset.paused.length) { toast('Pick at least one thing to pause.'); return; }
    reset = { ...reset, active: true, start: todayIso(), log: {} };
    resetPicked = null; saveReset(); renderReset(); window.scrollTo(0, 0);
  });
  $('reset-kept').addEventListener('click', () => logDay(true));
  $('reset-slipped').addEventListener('click', () => logDay(false));
  $('reset-spent').addEventListener('input', () => {
    const date = resetPicked || todayIso(), value = parseMoney($('reset-spent').value);
    if (reset.log[date]) { reset.log[date].spent = value > 0 ? value : 0; saveReset(); renderReset(); }
  });
  const newReset = () => { reset = { ...reset, active: false, start: null, log: {} }; resetPicked = null; saveReset(); renderReset(); window.scrollTo(0, 0); };
  $('reset-new').addEventListener('click', newReset);
  let resetEndArmed = null;
  $('reset-end').addEventListener('click', () => {
    if (!resetEndArmed) { $('reset-end').textContent = 'Tap again to end it'; resetEndArmed = setTimeout(() => { resetEndArmed = null; $('reset-end').textContent = 'End this reset'; }, 4000); return; }
    clearTimeout(resetEndArmed); resetEndArmed = null; $('reset-end').textContent = 'End this reset';
    newReset();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('cf-sheet').hidden) closeCfSheet(); });

  const params = new URLSearchParams(location.search);
  if (params.get('access')) openFromLink(params.get('access'));
  else if (params.get('session_id') || params.get('payment_intent')) openAfterPayment(paymentReference());
  else if (canUse()) { enter(); refreshExtras(); }
  else show('gate');
})();
