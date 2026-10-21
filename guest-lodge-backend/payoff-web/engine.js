'use strict';
// Debt payoff maths for Marketel Payoff. Pure: no DOM, no network. Money is in
// whole cents; monthly interest is balance × APR ÷ 12, rounded to the cent.
// Shared by the browser (window.PayoffEngine) and Node tests (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PayoffEngine = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const MAX_MONTHS = 600;
  const MAX_DEBTS = 50;
  const CARD_FLOOR = 2500;
  const PLANS = Object.freeze([
    { key: 'snowball', name: 'Snowball', note: 'Smallest balance first' },
    { key: 'avalanche', name: 'Avalanche', note: 'Highest rate first' },
    { key: 'cashflow', name: 'Cash-flow first', note: 'Frees up monthly money fastest' },
    { key: 'cost', name: 'Biggest interest cost first', note: 'Balance × rate, largest first' },
    { key: 'minimums', name: 'Minimums only', note: 'No extra, nothing rolls over' },
  ]);
  const monthlyInterest = (balance, apr) => Math.round(balance * apr / 1200);

  // Debts as entered: balance and minimum in cents, apr in percent.
  function clean(debts) {
    return (Array.isArray(debts) ? debts : []).slice(0, MAX_DEBTS).map((debt, index) => ({
      id: String(debt.id ?? index),
      name: String(debt.name || '').trim() || `Debt ${index + 1}`,
      type: debt.type === 'loan' ? 'loan' : 'card',
      balance: Math.max(0, Math.round(Number(debt.balance) || 0)),
      apr: Math.min(100, Math.max(0, Number(debt.apr) || 0)),
      minimum: Math.max(0, Math.round(Number(debt.minimum) || 0)),
    })).filter(debt => debt.balance > 0);
  }

  // A card's minimum follows its balance down: interest plus the share of the
  // balance the entered minimum implies (at least 1%), never above what was
  // entered and never below $25 (or the entered minimum, if that is smaller).
  // A minimum that does not cover the interest stays as entered.
  function minimumRule(debt) {
    const interest = monthlyInterest(debt.balance, debt.apr);
    if (debt.type === 'loan' || debt.minimum <= interest) return () => debt.minimum;
    const share = Math.max(0.01, (debt.minimum - interest) / debt.balance);
    const floor = Math.min(CARD_FLOOR, debt.minimum);
    return (balance, interestNow) => Math.min(debt.minimum, Math.max(floor, Math.round(interestNow + share * balance)));
  }

  function order(debts, key) {
    const by = {
      snowball: (a, b) => a.balance - b.balance || b.apr - a.apr,
      avalanche: (a, b) => b.apr - a.apr || a.balance - b.balance,
      cashflow: (a, b) => a.balance / (a.minimum || 1) - b.balance / (b.minimum || 1) || b.apr - a.apr,
      cost: (a, b) => b.balance * b.apr - a.balance * a.apr || a.balance - b.balance,
    }[key];
    return by ? debts.slice().sort(by).map(debt => debt.id) : [];
  }

  function addMonths(start, months) {
    const total = start.year * 12 + start.month + months;
    return { year: Math.floor(total / 12), month: total % 12 };
  }

  // A promotional rate (a 0% balance transfer, say) applies for its first
  // `promoMonths` months, then `afterApr`.
  const aprIn = (debt, month) => (debt.promoMonths && month > debt.promoMonths ? debt.afterApr ?? debt.apr : debt.apr);

  function simulate(debts, plan, { extra = 0, oneTime = 0, start, budget: fixedBudget = null } = {}) {
    const rules = new Map(debts.map(debt => [debt.id, minimumRule(debt)]));
    const balances = new Map(debts.map(debt => [debt.id, debt.balance]));
    const budget = Math.max(fixedBudget ?? 0, debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0, Math.round(extra)));
    const targets = order(debts, plan);
    const payoffMonth = {};
    const rows = [];
    let totalInterest = 0, totalPaid = 0, month = 0;
    while ([...balances.values()].some(balance => balance > 0) && month < MAX_MONTHS) {
      month += 1;
      const payments = {}, due = new Map();
      for (const debt of debts) {
        const balance = balances.get(debt.id);
        if (balance <= 0) continue;
        const interest = monthlyInterest(balance, aprIn(debt, month));
        totalInterest += interest;
        balances.set(debt.id, balance + interest);
        const owed = month === 1 ? debt.minimum : rules.get(debt.id)(balance, interest);
        due.set(debt.id, Math.min(owed, balance + interest));
      }
      let left = plan === 'minimums' ? 0
        : budget + (month === 1 ? Math.max(0, Math.round(oneTime)) : 0) - [...due.values()].reduce((sum, value) => sum + value, 0);
      for (const [id, amount] of due) payments[id] = amount;
      // Whatever the minimums leave goes down the plan's order, so a debt
      // paid off this month passes the rest to the next one straight away.
      for (const id of targets) {
        if (left <= 0) break;
        const room = balances.get(id) - (payments[id] || 0);
        if (room <= 0) continue;
        const add = Math.min(room, left);
        payments[id] = (payments[id] || 0) + add;
        left -= add;
      }
      const row = { month, payments, balances: {} };
      for (const [id, paid] of Object.entries(payments)) {
        const after = balances.get(id) - paid;
        balances.set(id, after);
        totalPaid += paid;
        row.balances[id] = after;
        if (after <= 0 && payoffMonth[id] === undefined) payoffMonth[id] = month;
      }
      rows.push(row);
    }
    const done = [...balances.values()].every(balance => balance <= 0);
    return {
      key: plan,
      months: done ? month : null,
      date: done && start ? addMonths(start, month) : null,
      totalInterest,
      totalPaid,
      monthly: plan === 'minimums' ? debts.reduce((sum, debt) => sum + debt.minimum, 0) : budget,
      order: plan === 'minimums' ? debts.slice().sort((a, b) => (payoffMonth[a.id] ?? Infinity) - (payoffMonth[b.id] ?? Infinity)).map(debt => debt.id) : targets,
      payoffMonth,
      rows,
    };
  }

  // Every plan for these debts, plus which strategy finishes first (ties go
  // to the least interest) and plain warnings about the inputs.
  function plan(input, { extra = 0, oneTime = 0, start = null } = {}) {
    const debts = clean(input);
    const results = PLANS.map(info => ({ ...info, ...simulate(debts, info.key, { extra, oneTime, start }) }));
    const finishing = results.filter(result => result.key !== 'minimums' && result.months);
    const fastest = finishing.sort((a, b) => a.months - b.months || a.totalInterest - b.totalInterest)[0] || null;
    const warnings = [];
    for (const debt of debts) {
      const interest = monthlyInterest(debt.balance, debt.apr);
      if (debt.minimum <= interest) warnings.push({ id: debt.id, kind: 'below-interest', interest });
      if (debt.apr === 0) warnings.push({ id: debt.id, kind: 'zero-rate' });
    }
    return { debts, plans: results, fastest: fastest && fastest.key, minimums: results.find(result => result.key === 'minimums'), warnings };
  }

  // Interest Cutter: the same monthly budget with some debts moved to a 0%
  // balance transfer or a consolidation loan, against the plan as it is.
  // Fees are counted on their own, so "cost" is interest plus fees, and the
  // answer can honestly be that the current plan costs less.
  //   transfer: { kind: 'transfer', moves: [{ id, amount }], feePercent, promoApr, promoMonths, afterApr, limit }
  //   loan:     { kind: 'loan', moves: [{ id, amount }], apr, termMonths, feePercent }
  const PAYING = PLANS.filter(info => info.key !== 'minimums').map(info => info.key);
  const cheapest = runs => runs.filter(run => run.months).sort((a, b) => a.cost - b.cost || a.months - b.months)[0] || null;
  function loanPayment(principal, apr, months) {
    const rate = apr / 1200;
    return Math.ceil(rate ? principal * rate / (1 - (1 + rate) ** -months) : principal / months);
  }
  function compareLowerRate(input, scenario = {}, { extra = 0, start = null } = {}) {
    const debts = clean(input);
    const budget = debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0, Math.round(extra));
    const best = (list, fees, fixed) => cheapest(PAYING.map(key => {
      const run = simulate(list, key, { start, budget: fixed });
      return { ...run, fees, cost: run.totalInterest + fees };
    }));
    const current = best(debts, 0, budget);
    const loan = scenario.kind === 'loan';
    const feeRate = Math.min(20, Math.max(0, Number(scenario.feePercent) || 0)) / 100;
    // How much of each debt moves, never more than it owes or the new card's limit allows.
    const limit = !loan && Number(scenario.limit) > 0 ? Math.round(Number(scenario.limit)) : Infinity;
    let room = loan ? Infinity : Math.floor(limit / (1 + feeRate));
    const moved = new Map();
    for (const move of Array.isArray(scenario.moves) ? scenario.moves : []) {
      const debt = debts.find(item => item.id === String(move.id));
      if (!debt || moved.has(debt.id)) continue;
      const amount = Math.min(debt.balance, Math.max(0, Math.round(Number(move.amount) || 0)), room);
      if (amount > 0) { moved.set(debt.id, amount); room -= amount; }
    }
    const total = [...moved.values()].reduce((sum, amount) => sum + amount, 0);
    if (!total) return { current, option: null, budget, moved: 0, fees: 0, savings: 0, monthsSooner: 0, cheaper: false };
    // What stays on each original debt keeps its share of the minimum.
    const remaining = debts.map(debt => {
      const left = debt.balance - (moved.get(debt.id) || 0);
      return left > 0 ? { ...debt, balance: left, minimum: Math.max(Math.min(debt.minimum, left), Math.round(debt.minimum * left / debt.balance)) } : null;
    }).filter(Boolean);
    let fees, added;
    if (loan) {
      const months = Math.min(120, Math.max(6, Math.round(Number(scenario.termMonths) || 36)));
      const apr = Math.min(100, Math.max(0, Number(scenario.apr) || 0));
      // An origination fee comes out of the loan, so it borrows enough to clear the debts after the fee.
      const principal = Math.round(total / (1 - feeRate));
      fees = principal - total;
      added = { id: 'cutter-loan', name: 'Consolidation loan', type: 'loan', balance: principal, apr, minimum: loanPayment(principal, apr, months) };
    } else {
      fees = Math.round(total * feeRate);
      const balance = total + fees;
      const promoApr = Math.min(100, Math.max(0, Number(scenario.promoApr) || 0));
      added = { id: 'cutter-transfer', name: 'Balance transfer card', type: 'card', balance, apr: promoApr,
        promoMonths: Math.min(60, Math.max(0, Math.round(Number(scenario.promoMonths) || 0))),
        afterApr: Math.min(100, Math.max(0, Number(scenario.afterApr ?? promoApr) || 0)),
        minimum: Math.max(Math.min(CARD_FLOOR, balance), Math.round(balance * 0.02)) };
    }
    const option = best([...remaining, added], fees, budget);
    const promoEnds = !loan && added.promoMonths && start ? addMonths(start, added.promoMonths) : null;
    // What would still sit on the transfer card when its promotional rate ends.
    const promoLeft = option && !loan && added.promoMonths
      ? (option.rows[added.promoMonths - 1]?.balances[added.id] ?? 0) : null;
    const savings = current && option ? current.cost - option.cost : 0;
    return {
      current, option, budget, budgetRaised: option ? option.monthly > budget : false,
      moved: total, fees, promoEnds, promoLeft, added,
      savings, monthsSooner: current && option ? current.months - option.months : 0, cheaper: savings > 0,
    };
  }

  // Cash-flow calendar. Dates are 'YYYY-MM-DD' and handled as UTC day numbers,
  // so a time zone never moves a bill to another day.
  const toDay = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
  const fromDay = day => new Date(day * 86400000).toISOString().slice(0, 10);
  const daysIn = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const REPEATS = Object.freeze(['once', 'weekly', 'biweekly', 'twice-monthly', 'monthly']);

  // Every day in [from, to] that an item lands on.
  function occurrences(item, from, to) {
    const first = toDay(item.date), days = [];
    if (item.repeat === 'weekly' || item.repeat === 'biweekly') {
      const step = item.repeat === 'weekly' ? 7 : 14;
      for (let day = first + Math.max(0, Math.ceil((from - first) / step)) * step; day <= to; day += step) days.push(day);
    } else if (item.repeat === 'monthly' || item.repeat === 'twice-monthly') {
      const date = new Date(first * 86400000);
      let year = date.getUTCFullYear(), month = date.getUTCMonth();
      const want = item.repeat === 'monthly' ? [date.getUTCDate()] : [1, 15];
      for (;;) {
        const monthStart = Date.UTC(year, month, 1) / 86400000;
        if (monthStart > to) break;
        for (const dayOfMonth of want) {
          const day = monthStart + Math.min(dayOfMonth, daysIn(year, month)) - 1;
          if (day >= first && day >= from && day <= to) days.push(day);
        }
        month += 1;
        if (month === 12) { month = 0; year += 1; }
      }
    } else if (first >= from && first <= to) days.push(first);
    return days;
  }

  // Projected balance for every day from today through `months` ahead.
  // Items: { id, name, kind: 'income' | 'bill', amount (cents), repeat, date }.
  // On a day with both, income lands first.
  function cashflow({ today, balance = 0, items = [], months = 3 }) {
    const from = toDay(today);
    const start = new Date(from * 86400000);
    const to = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + Math.min(18, Math.max(1, months)), start.getUTCDate()) / 86400000 - 1;
    const byDay = new Map();
    for (const item of items) {
      if (!(item.amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) continue;
      const signed = item.kind === 'income' ? item.amount : -item.amount;
      for (const day of occurrences(item, from, to)) {
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push({ id: item.id, name: item.name, kind: item.kind === 'income' ? 'income' : 'bill', amount: signed });
      }
    }
    const daily = [], shortfalls = [];
    let running = Math.round(balance), lowest = null, short = false, totalIn = 0, totalOut = 0;
    for (let day = from; day <= to; day += 1) {
      const events = (byDay.get(day) || []).sort((a, b) => b.amount - a.amount);
      for (const event of events) {
        running += event.amount;
        if (event.amount > 0) totalIn += event.amount; else totalOut -= event.amount;
      }
      const date = fromDay(day);
      daily.push({ date, balance: running, events });
      if (!lowest || running < lowest.balance) lowest = { date, balance: running };
      if (running < 0 && !short) shortfalls.push({ date, balance: running, event: events.filter(event => event.amount < 0).at(-1) || null });
      short = running < 0;
    }
    return { daily, lowest, shortfalls, end: running, totalIn, totalOut };
  }

  // Spending reset: { start, days, paused: [{ name, weekly (cents) }], log: { date: { kept, spent } } }.
  // Saved is what the paused things usually cost on the logged days, minus
  // whatever was spent on them anyway.
  function resetSummary(reset, today) {
    const length = Math.max(1, Math.round(reset.days) || 7);
    const first = toDay(reset.start), now = toDay(today);
    const perDay = (reset.paused || []).reduce((sum, item) => sum + Math.max(0, Math.round(item.weekly) || 0), 0) / 7;
    let kept = 0, slipped = 0, spent = 0, streak = 0, missed = 0;
    const days = [];
    for (let i = 0; i < length; i += 1) {
      const date = fromDay(first + i), entry = reset.log?.[date];
      const status = entry ? (entry.kept ? 'kept' : 'slipped') : first + i < now ? 'missed' : first + i === now ? 'today' : 'ahead';
      days.push({ date, status, spent: entry?.spent || 0 });
      if (status === 'kept') { kept += 1; streak += 1; }
      if (status === 'slipped') { slipped += 1; streak = 0; }
      if (status === 'missed') { missed += 1; streak = 0; }
      if (entry) spent += Math.max(0, Math.round(entry.spent) || 0);
    }
    const day = Math.min(length, Math.max(1, now - first + 1));
    return { length, day, done: now - first + 1 > length, kept, slipped, missed, streak, spent,
      saved: Math.max(0, Math.round(perDay * (kept + slipped)) - spent), perDay: Math.round(perDay), days, end: fromDay(first + length - 1) };
  }

  return { plan, simulate, compareLowerRate, loanPayment, clean, order, addMonths, monthlyInterest, PLANS, MAX_MONTHS, MAX_DEBTS,
    cashflow, occurrences, resetSummary, toDay, fromDay, REPEATS };
});
