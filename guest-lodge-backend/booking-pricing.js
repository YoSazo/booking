'use strict';

const MAX_STAY_NIGHTS = 180;

function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.round(number * 100) / 100;
}

function isoDate(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';
    const normalized = `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized
        ? ''
        : normalized;
}

function stayNights(checkin, checkout) {
    const start = isoDate(checkin);
    const end = isoDate(checkout);
    if (!start || !end) return 0;
    const nights = Math.round(
        (new Date(`${end}T00:00:00.000Z`).getTime()
            - new Date(`${start}T00:00:00.000Z`).getTime()) / 86400000
    );
    return nights > 0 && nights <= MAX_STAY_NIGHTS ? nights : 0;
}

// This deliberately mirrors hotel-booking-app/src/priceCalculator.js. Once a
// stay reaches seven nights, leftover nights use the weekly per-night rate.
function tieredSubtotal(nights, rates = {}) {
    const count = Number.parseInt(nights, 10);
    const nightly = money(rates.nightly ?? rates.NIGHTLY);
    const weekly = money(rates.weekly ?? rates.WEEKLY);
    const monthly = money(rates.monthly ?? rates.MONTHLY);
    if (!Number.isInteger(count) || count < 1 || count > MAX_STAY_NIGHTS) return null;
    if (nightly === null || weekly === null || monthly === null) return null;
    if (nightly <= 0 || weekly <= 0 || monthly <= 0) return null;

    if (count < 7) return money(count * nightly);

    const weeklyNight = money(weekly / 7);
    let remaining = count;
    let subtotal = 0;
    subtotal += Math.floor(remaining / 28) * monthly;
    remaining %= 28;
    subtotal += Math.floor(remaining / 7) * weekly;
    remaining %= 7;
    subtotal += remaining * weeklyNight;
    return money(subtotal);
}

function buildBookingQuote({ checkin, checkout, rates = {} } = {}) {
    const nights = stayNights(checkin, checkout);
    if (!nights) return null;
    const subtotal = tieredSubtotal(nights, rates);
    const taxRate = Number(rates.taxRate);
    if (subtotal === null || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) return null;
    const taxes = money(subtotal * taxRate);
    const total = money(subtotal + taxes);
    return {
        nights,
        subtotal,
        taxes,
        total,
        totalCents: Math.round(total * 100),
    };
}

module.exports = {
    MAX_STAY_NIGHTS,
    buildBookingQuote,
    stayNights,
    tieredSubtotal,
};
