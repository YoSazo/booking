function normalizePaymentMethodDomain(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .split(',')[0]
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.$/, '');
}

function isPublicPaymentMethodDomain(value) {
    const domain = normalizePaymentMethodDomain(value);
    if (!domain || domain.length > 253 || !domain.includes('.')) return false;
    if (domain.includes('*') || domain === 'localhost' || domain.endsWith('.localhost')) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return false;
    return domain.split('.').every(label => (
        label.length > 0
        && label.length <= 63
        && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ));
}

function walletStatuses(domain) {
    return {
        applePay: domain?.apple_pay?.status || null,
        googlePay: domain?.google_pay?.status || null,
        link: domain?.link?.status || null,
    };
}

async function ensurePaymentMethodDomain(stripe, value, options = {}) {
    const domainName = normalizePaymentMethodDomain(value);
    if (!isPublicPaymentMethodDomain(domainName)) {
        return { ok: false, skipped: true, domain: domainName, reason: 'not_public_domain' };
    }
    if (!stripe?.paymentMethodDomains) {
        return { ok: false, skipped: true, domain: domainName, reason: 'stripe_unavailable' };
    }

    const existing = await stripe.paymentMethodDomains.list({
        domain_name: domainName,
        limit: 1,
    });
    let paymentDomain = (existing.data || []).find(row => row.domain_name === domainName) || null;
    let created = false;

    if (!paymentDomain) {
        try {
            paymentDomain = await stripe.paymentMethodDomains.create({
                domain_name: domainName,
                enabled: true,
            });
            created = true;
        } catch (error) {
            // Two setup requests can discover the same missing domain together.
            // Stripe rejects the second create, so re-read before treating the
            // harmless race as a provisioning failure.
            const raced = await stripe.paymentMethodDomains.list({
                domain_name: domainName,
                limit: 1,
            });
            paymentDomain = (raced.data || []).find(row => row.domain_name === domainName) || null;
            if (!paymentDomain) throw error;
        }
    } else if (paymentDomain.enabled === false) {
        paymentDomain = await stripe.paymentMethodDomains.update(paymentDomain.id, { enabled: true });
    }

    const statuses = walletStatuses(paymentDomain);
    const needsValidation = paymentDomain
        && options.validate !== false
        && typeof stripe.paymentMethodDomains.validate === 'function'
        && Object.values(statuses).some(status => status && status !== 'active');
    if (needsValidation) {
        try {
            paymentDomain = await stripe.paymentMethodDomains.validate(paymentDomain.id);
        } catch (_) {
            // Domain DNS can take a moment after Vercel provisioning. Keeping the
            // Stripe object lets the startup reconciliation validate it later.
        }
    }

    return {
        ok: true,
        skipped: false,
        created,
        domain: domainName,
        id: paymentDomain?.id || null,
        enabled: paymentDomain?.enabled !== false,
        statuses: walletStatuses(paymentDomain),
    };
}

async function listAllPaymentMethodDomains(stripe) {
    const rows = [];
    let startingAfter = '';
    do {
        const page = await stripe.paymentMethodDomains.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        rows.push(...(page.data || []));
        if (!page.has_more || !page.data?.length) break;
        startingAfter = page.data[page.data.length - 1].id;
    } while (startingAfter);
    return rows;
}

async function syncPaymentMethodDomains(stripe, values, options = {}) {
    const domains = [...new Set((values || [])
        .map(normalizePaymentMethodDomain)
        .filter(isPublicPaymentMethodDomain))];
    if (!stripe?.paymentMethodDomains || !domains.length) {
        return { requested: domains.length, registered: 0, created: 0, failed: [] };
    }

    const existingRows = await listAllPaymentMethodDomains(stripe);
    const existing = new Map(existingRows.map(row => [row.domain_name, row]));
    const results = [];
    const failed = [];

    // Keep provider pressure restrained. Startup reconciliation is repair work,
    // never part of serving a guest request.
    for (let index = 0; index < domains.length; index += 4) {
        const batch = domains.slice(index, index + 4);
        const settled = await Promise.all(batch.map(async domain => {
            try {
                const current = existing.get(domain);
                if (current && current.enabled !== false && Object.values(walletStatuses(current)).every(status => !status || status === 'active')) {
                    return { ok: true, domain, created: false, existing: true };
                }
                return ensurePaymentMethodDomain(stripe, domain, options);
            } catch (error) {
                return { ok: false, domain, error: error.message || String(error) };
            }
        }));
        for (const result of settled) {
            results.push(result);
            if (!result.ok) failed.push({ domain: result.domain, error: result.error || result.reason });
        }
    }

    return {
        requested: domains.length,
        registered: results.filter(result => result.ok).length,
        created: results.filter(result => result.ok && result.created).length,
        failed,
    };
}

module.exports = {
    ensurePaymentMethodDomain,
    isPublicPaymentMethodDomain,
    normalizePaymentMethodDomain,
    syncPaymentMethodDomains,
};
