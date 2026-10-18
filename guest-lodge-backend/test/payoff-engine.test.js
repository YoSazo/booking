'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../payoff-web/engine');

const start = { year: 2026, month: 9 }; // October 2026
const byKey = (result, key) => result.plans.find(plan => plan.key === key);

test('the sales page example: avalanche saves a month and $153.25 over snowball', () => {
  const result = E.plan([
    { id: 'zero', type: 'loan', balance: 100000, apr: 0, minimum: 5000 },
    { id: 'card', type: 'loan', balance: 500000, apr: 24, minimum: 15000 },
  ], { extra: 5000, start });
  assert.equal(byKey(result, 'snowball').months, 33);
  assert.equal(byKey(result, 'snowball').totalInterest, 205993);
  assert.equal(byKey(result, 'avalanche').months, 32);
  assert.equal(byKey(result, 'avalanche').totalInterest, 190668);
  assert.equal(result.fastest, 'avalanche');
  assert.deepEqual(byKey(result, 'avalanche').date, { year: 2029, month: 5 });
  assert.deepEqual(result.warnings, [{ id: 'zero', kind: 'zero-rate' }]);
});

test('one card on its minimum: the minimum shrinks with the balance, never below $25', () => {
  const result = E.plan([{ id: 'c', type: 'card', balance: 500000, apr: 24, minimum: 15000 }], { start });
  const minimums = result.minimums;
  assert.equal(minimums.rows[0].payments.c, 15000);
  assert.ok(minimums.rows[1].payments.c < 15000);
  assert.ok(minimums.rows.every(row => row.payments.c >= 2500 || row.balances.c === 0));
  // The fixed-total plans keep paying $150 and finish far sooner.
  assert.equal(byKey(result, 'avalanche').months, 56);
  assert.ok(minimums.months > 200);
  assert.ok(minimums.totalInterest > byKey(result, 'avalanche').totalInterest);
});

test('a loan payment stays fixed until the last month', () => {
  const result = E.plan([{ id: 'l', type: 'loan', balance: 120000, apr: 6, minimum: 10000 }], { start });
  const rows = result.minimums.rows;
  assert.ok(rows.slice(0, -1).every(row => row.payments.l === 10000));
  assert.ok(rows.at(-1).payments.l < 10000);
  assert.equal(result.minimums.months, byKey(result, 'snowball').months);
});

test('snowball and avalanche go after different debts first', () => {
  const debts = [
    { id: 'small', type: 'card', balance: 80000, apr: 12, minimum: 3000 },
    { id: 'pricey', type: 'card', balance: 400000, apr: 29.99, minimum: 12000 },
  ];
  const result = E.plan(debts, { extra: 20000, start });
  const snowball = byKey(result, 'snowball'), avalanche = byKey(result, 'avalanche');
  assert.deepEqual(snowball.order, ['small', 'pricey']);
  assert.deepEqual(avalanche.order, ['pricey', 'small']);
  assert.ok(snowball.payoffMonth.small < avalanche.payoffMonth.small);
  assert.ok(avalanche.totalInterest < snowball.totalInterest);
  assert.equal(E.order(E.clean(debts), 'cashflow')[0], 'small');
  assert.equal(E.order(E.clean(debts), 'cost')[0], 'pricey');
});

test('money freed by a finished debt rolls to the next one in the same month', () => {
  const result = E.plan([
    { id: 'a', type: 'loan', balance: 1000, apr: 0, minimum: 5000 },
    { id: 'b', type: 'loan', balance: 100000, apr: 0, minimum: 5000 },
  ], { start });
  const first = byKey(result, 'snowball').rows[0];
  assert.equal(first.payments.a, 1000);
  assert.equal(first.payments.b, 9000);
  assert.equal(Object.values(first.payments).reduce((x, y) => x + y, 0), 10000);
});

test('0% debts cost no interest', () => {
  const result = E.plan([{ id: 'z', type: 'loan', balance: 60000, apr: 0, minimum: 10000 }], { start });
  assert.equal(byKey(result, 'avalanche').totalInterest, 0);
  assert.equal(byKey(result, 'avalanche').months, 6);
  assert.deepEqual(byKey(result, 'avalanche').date, { year: 2027, month: 3 });
});

test('a minimum below the interest never pays off on minimums, but the plan with extra does', () => {
  const debts = [{ id: 'grow', type: 'card', balance: 1000000, apr: 24, minimum: 15000 }];
  const result = E.plan(debts, { extra: 20000, start });
  assert.equal(result.minimums.months, null);
  assert.equal(result.minimums.date, null);
  assert.deepEqual(result.warnings, [{ id: 'grow', kind: 'below-interest', interest: 20000 }]);
  assert.ok(byKey(result, 'avalanche').months > 0);
  assert.equal(E.plan(debts, { start }).fastest, null);
});

test('a one-time amount goes to the target debt in month 1 and brings the date forward', () => {
  const debts = [
    { id: 'a', type: 'card', balance: 300000, apr: 22, minimum: 9000 },
    { id: 'b', type: 'card', balance: 150000, apr: 18, minimum: 4500 },
  ];
  const without = byKey(E.plan(debts, { extra: 5000, start }), 'snowball');
  const withRefund = byKey(E.plan(debts, { extra: 5000, oneTime: 100000, start }), 'snowball');
  assert.equal(withRefund.rows[0].payments.b - without.rows[0].payments.b, 100000);
  assert.ok(withRefund.months < without.months);
  assert.ok(withRefund.totalInterest < without.totalInterest);
});

test('50 debts compute quickly and extra debts are ignored', () => {
  const debts = Array.from({ length: 60 }, (_, i) => ({ id: 'd' + i, type: i % 3 ? 'card' : 'loan', balance: 50000 + i * 7919, apr: (i * 37) % 30, minimum: 4000 + i * 50 }));
  const began = performance.now();
  const result = E.plan(debts, { extra: 10000, start });
  assert.ok(performance.now() - began < 1500);
  assert.equal(result.debts.length, 50);
  assert.ok(result.plans.filter(plan => plan.key !== 'minimums').every(plan => plan.months > 0));
});

test('nothing runs past 600 months', () => {
  const result = E.plan([{ id: 'x', type: 'loan', balance: 10000000, apr: 11.99, minimum: 100000 }], { start });
  assert.equal(result.minimums.months, null);
  assert.equal(result.minimums.rows.length, E.MAX_MONTHS);
});

test('dates roll over year ends', () => {
  assert.deepEqual(E.addMonths({ year: 2026, month: 9 }, 3), { year: 2027, month: 0 });
  assert.deepEqual(E.addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(E.addMonths({ year: 2026, month: 0 }, 24), { year: 2028, month: 0 });
});

test('bad inputs are cleaned, not trusted', () => {
  const debts = E.clean([{ balance: -5, apr: 10, minimum: 100 }, { name: '  ', balance: '12345', apr: 500, minimum: 'x', type: 'weird' }]);
  assert.equal(debts.length, 1);
  assert.equal(debts[0].name, 'Debt 2');
  assert.equal(debts[0].apr, 100);
  assert.equal(debts[0].type, 'card');
  assert.equal(E.plan([]).fastest, null);
});
