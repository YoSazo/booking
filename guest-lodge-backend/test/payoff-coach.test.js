'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../payoff-web/engine');
const { cleanPlan, callTool, summary, INSTRUCTIONS } = require('../payoff-coach');

const start = { year: 2026, month: 9 };
const plan = cleanPlan({ plan: 'avalanche', extra: 5000, debts: [
  { id: 'a', name: 'Store card', type: 'card', balance: 210000, apr: 29, minimum: 6300 },
  { id: 'b', name: 'Visa', type: 'card', balance: 640000, apr: 22.9, minimum: 19200 },
  { id: 'c', name: 'Car loan', type: 'loan', balance: 900000, apr: 7.5, minimum: 28000 },
] });
const ask = args => callTool({ name: 'run_plan', arguments: JSON.stringify({ strategy: 'current', extra_monthly: 50, one_time: 0, ...args }) }, plan, start);
const avalanche = options => E.plan(plan.debts, { start, ...options }).plans.find(item => item.key === 'avalanche');

test('the Coach’s tool works out months sooner and interest saved against their plan, so the model never subtracts', () => {
  const before = avalanche({ extra: 5000 }), after = avalanche({ extra: 5000, oneTime: 100000 });
  const result = ask({ one_time: 1000 });
  assert.equal(result.compared_with_their_plan.months_sooner, before.months - after.months);
  assert.ok(result.compared_with_their_plan.months_sooner > 0);
  assert.equal(result.compared_with_their_plan.in_words, `${before.months - after.months} months sooner`);
  assert.equal(result.compared_with_their_plan.interest_saved, `$${Math.round((before.totalInterest - after.totalInterest) / 100).toLocaleString('en-US')}`);
  assert.equal(result.compared_with_their_plan.interest_added, null);
  assert.equal(result.cents, undefined, 'raw cents never reach the model');
  // Paying less than now is later, and costs more.
  const less = ask({ extra_monthly: 0 });
  assert.match(less.compared_with_their_plan.in_words, /^\d+ months? later$/);
  assert.match(less.compared_with_their_plan.interest_added, /^\$[\d,]+$/);
  assert.equal(ask({}).compared_with_their_plan.in_words, 'the same month');
});

test('the Coach’s plan summary is the buyer’s debts in words, without raw cents, and its instructions keep answers short, plain and sourced', () => {
  const text = summary(plan, start);
  assert.match(text, /- Store card \(card\): \$2,100\.00 at 29%, \$63\.00 a month/);
  assert.match(text, /Their plan: .*debt-free [A-Z][a-z]+ 20\d\d/);
  assert.doesNotMatch(text, /cents|\{/);
  assert.match(INSTRUCTIONS, /under 60 words/);
  assert.match(INSTRUCTIONS, /never say avalanche, snowball, strategy, upfront, minimize, optimize, allocate or APR/);
  assert.match(INSTRUCTIONS, /quote its compared_with_their_plan/);
  assert.equal(callTool({ name: 'run_plan', arguments: '{nope' }, plan, start).error, 'Arguments were not valid JSON.');
  assert.equal(callTool({ name: 'other', arguments: '{}' }, plan, start).error, 'Unknown tool.');
  assert.deepEqual(cleanPlan({ debts: 'x', extra: -5, plan: 'nonsense' }), { debts: [], extra: 0, chosen: null });
});
