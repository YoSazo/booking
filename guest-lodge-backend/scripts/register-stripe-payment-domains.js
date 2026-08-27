#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { syncPaymentMethodDomains } = require('../stripe-payment-domains');

const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
if (!/^sk_(?:test|live)_/.test(secretKey)) {
    console.error('STRIPE_SECRET_KEY is not configured.');
    process.exit(1);
}

const stripe = require('stripe')(secretKey);
const prisma = new PrismaClient();

async function run() {
    const rows = await prisma.hotelDomain.findMany({ select: { domain: true } });
    const result = await syncPaymentMethodDomains(stripe, rows.map(row => row.domain));
    console.log(JSON.stringify(result, null, 2));
    if (result.failed.length) process.exitCode = 1;
}

run()
    .catch(error => {
        console.error(error.message || error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
