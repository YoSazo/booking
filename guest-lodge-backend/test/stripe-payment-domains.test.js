const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ensurePaymentMethodDomain,
    isPublicPaymentMethodDomain,
    normalizePaymentMethodDomain,
    syncPaymentMethodDomains,
} = require('../stripe-payment-domains');

function stripeMock(seed = []) {
    const rows = seed.map(row => ({
        enabled: true,
        apple_pay: { status: 'active' },
        google_pay: { status: 'active' },
        link: { status: 'active' },
        ...row,
    }));
    let sequence = rows.length;
    const calls = { create: [], update: [], validate: [] };
    return {
        calls,
        paymentMethodDomains: {
            async list(params) {
                const data = params.domain_name
                    ? rows.filter(row => row.domain_name === params.domain_name)
                    : rows;
                return { data, has_more: false };
            },
            async create(params) {
                calls.create.push(params);
                sequence += 1;
                const row = {
                    id: `pmd_${sequence}`,
                    domain_name: params.domain_name,
                    enabled: true,
                    apple_pay: { status: 'active' },
                    google_pay: { status: 'active' },
                    link: { status: 'active' },
                };
                rows.push(row);
                return row;
            },
            async update(id, params) {
                calls.update.push({ id, params });
                const row = rows.find(item => item.id === id);
                Object.assign(row, params);
                return row;
            },
            async validate(id) {
                calls.validate.push(id);
                const row = rows.find(item => item.id === id);
                row.apple_pay = { status: 'active' };
                row.google_pay = { status: 'active' };
                return row;
            },
        },
    };
}

test('normalizes a booking-page URL to its exact hostname', () => {
    assert.equal(normalizePaymentMethodDomain(' HTTPS://JacksInn.MKTEL.co/checkout '), 'jacksinn.mktel.co');
    assert.equal(isPublicPaymentMethodDomain('jacksinn.mktel.co'), true);
    assert.equal(isPublicPaymentMethodDomain('*.mktel.co'), false);
    assert.equal(isPublicPaymentMethodDomain('localhost:5173'), false);
});

test('creates a missing wallet domain once', async () => {
    const stripe = stripeMock();
    const result = await ensurePaymentMethodDomain(stripe, 'jacksinn.mktel.co');
    assert.equal(result.ok, true);
    assert.equal(result.created, true);
    assert.deepEqual(stripe.calls.create, [{ domain_name: 'jacksinn.mktel.co', enabled: true }]);
});

test('re-enables and validates an existing inactive wallet domain', async () => {
    const stripe = stripeMock([{
        id: 'pmd_existing',
        domain_name: 'jacksinn.mktel.co',
        enabled: false,
        apple_pay: { status: 'inactive' },
    }]);
    const result = await ensurePaymentMethodDomain(stripe, 'jacksinn.mktel.co');
    assert.equal(result.ok, true);
    assert.equal(result.created, false);
    assert.equal(result.enabled, true);
    assert.equal(stripe.calls.update.length, 1);
    assert.equal(stripe.calls.validate.length, 1);
});

test('reconciliation registers only domains that need work', async () => {
    const stripe = stripeMock([{
        id: 'pmd_existing',
        domain_name: 'jacksinn.mktel.co',
    }]);
    const result = await syncPaymentMethodDomains(stripe, [
        'jacksinn.mktel.co',
        'studios17.mktel.co',
        'https://studios17.mktel.co/guest-info',
        'localhost:5173',
    ]);
    assert.deepEqual(result, { requested: 2, registered: 2, created: 1, failed: [] });
    assert.deepEqual(stripe.calls.create, [{ domain_name: 'studios17.mktel.co', enabled: true }]);
});
