'use strict';
// Marketel Payoff, the tool a buyer opens after paying. Their numbers live in
// this browser only (localStorage); the server only ever sees the access link,
// the Stripe session id after payment, or an email asking for the link again.
(() => {
  const E = window.PayoffEngine;
  const $ = id => document.getElementById(id);
  const DATA = 'payoff.v1', ACCESS = 'payoff.access';
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

  function show(view) {
    for (const id of ['opening', 'gate', 'debts', 'result']) $(id).hidden = id !== view;
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

  function enter() {
    load();
    renderDebts();
    if (state.debts.length && state.seen) { renderResult(); show('result'); } else show('debts');
  }
  function grant(token) {
    access = token;
    store.set(ACCESS, token);
    history.replaceState(null, '', '/payoff/app');
  }
  const post = (route, body) => fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async response => ({ ok: response.ok, body: await response.json().catch(() => ({})) }));

  async function openFromLink(token) {
    show('opening');
    $('opening-status').textContent = 'Checking your link.';
    try {
      const reply = await post('/api/payoff/access', { token });
      if (!reply.ok) throw Object.assign(new Error(reply.body.message || 'This link is not valid.'), { refused: true });
      grant(token); enter();
    } catch (error) {
      if (!error.refused && canUse()) { history.replaceState(null, '', '/payoff/app'); return enter(); }
      history.replaceState(null, '', '/payoff/app');
      show('gate');
      $('resend-status').textContent = error.refused ? error.message : 'We couldn’t check your link. Check your connection and open it again.';
    }
  }
  async function openAfterPayment(sessionId, tries = 0) {
    show('opening');
    $('opening-title').textContent = 'Opening your plan…';
    $('opening-status').textContent = 'Checking your payment with Stripe.';
    $('opening-retry').hidden = true; $('opening-help').hidden = true;
    try {
      const reply = await post('/api/payoff/confirm', { sessionId });
      if (!reply.ok || !reply.body.access) throw new Error(reply.body.message || 'We couldn’t confirm your payment yet.');
      try { sessionStorage.removeItem('payoff.attempt'); } catch { /* Optional. */ }
      grant(reply.body.access); enter();
      toast(reply.body.emailSent ? 'Payment confirmed. We emailed you this link too, so you can open your plan on any device.' : 'Payment confirmed. You’re in.');
    } catch (error) {
      if (tries < 2) return setTimeout(() => openAfterPayment(sessionId, tries + 1), 1500);
      $('opening-title').textContent = 'Your payment is still confirming';
      $('opening-status').textContent = error.message;
      $('opening-retry').hidden = false; $('opening-help').hidden = false;
    }
  }

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
  $('opening-retry').addEventListener('click', () => openAfterPayment(new URLSearchParams(location.search).get('session_id')));
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

  const params = new URLSearchParams(location.search);
  if (params.get('access')) openFromLink(params.get('access'));
  else if (params.get('session_id')) openAfterPayment(params.get('session_id'));
  else if (canUse()) enter();
  else show('gate');
})();
