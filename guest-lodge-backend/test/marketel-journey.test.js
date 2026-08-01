const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function storage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
    };
}

function trackerHarness() {
    const requests = [];
    const windowListeners = new Map();
    const documentListeners = new Map();
    const document = {
        title: 'Marketel',
        referrer: 'https://facebook.com/ads',
        cookie: '_fbp=fb.1.123.test; _fbc=fb.1.123.click',
        visibilityState: 'visible',
        readyState: 'loading',
        documentElement: { scrollHeight: 800 },
        addEventListener(name, handler) { documentListeners.set(name, handler); },
    };
    const browserSetTimeout = (callback, delay) => {
        const timer = setTimeout(callback, delay);
        if (delay > 1000 && timer.unref) timer.unref();
        return timer;
    };
    const window = {
        location: {
            href: 'https://bookmarketel.com/landing?utm_source=facebook&utm_campaign=owners&angle=assistant',
            origin: 'https://bookmarketel.com',
            hostname: 'bookmarketel.com',
            search: '?utm_source=facebook&utm_campaign=owners&angle=assistant',
        },
        localStorage: storage(),
        sessionStorage: storage(),
        crypto: { randomUUID: (() => { let id = 0; return () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`; })() },
        navigator: {
            language: 'en-US',
            onLine: true,
            hardwareConcurrency: 8,
            deviceMemory: 8,
            connection: { effectiveType: '4g', downlink: 10, saveData: false },
        },
        screen: { width: 390, height: 844 },
        innerWidth: 390,
        innerHeight: 760,
        devicePixelRatio: 3,
        scrollY: 0,
        setTimeout: browserSetTimeout,
        clearTimeout,
        requestAnimationFrame(callback) { callback(); },
        matchMedia() { return { matches: false }; },
        addEventListener(name, handler) { windowListeners.set(name, handler); },
        fetch(url, options) {
            requests.push({ url, options, body: JSON.parse(options.body) });
            return Promise.resolve({ ok: true });
        },
    };
    const performance = {
        now: () => 20,
        getEntriesByType: () => [{ type: 'navigate', responseStart: 25, domInteractive: 80, domContentLoadedEventEnd: 100, loadEventEnd: 130 }],
    };
    const context = vm.createContext({
        window,
        document,
        performance,
        URL,
        URLSearchParams,
        Intl,
        console,
        setTimeout,
        clearTimeout,
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'marketel-journey.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'marketel-journey.js' });
    return { tracker: window.MarketelJourney, requests, windowListeners, documentListeners };
}

test('journey tracker links attribution and strips sensitive metadata', async () => {
    const { tracker, requests } = trackerHarness();
    tracker.init({ surface: 'landing', context: { acquisitionAngle: 'assistant' } });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(requests.length, 1);
    const pageView = requests[0].body.events[0];
    assert.equal(pageView.eventName, 'JourneyPageViewed');
    assert.match(pageView.visitorId, /^mjv_/);
    assert.match(pageView.sessionId, /^mjs_/);
    assert.equal(pageView.metadata.firstTouch.utm_source, 'facebook');
    assert.equal(pageView.metadata.firstTouch.fbp, 'fb.1.123.test');
    assert.equal(pageView.metadata.context.acquisitionAngle, 'assistant');

    tracker.track('JourneyValidationFailed', {
        reason: 'invalid-email',
        email: 'owner@example.com',
        errorSummary: 'owner@example.com entered an invalid value',
    });
    await tracker.flush();
    const validation = requests[1].body.events[0];
    assert.equal(validation.metadata.reason, 'invalid-email');
    assert.equal(validation.metadata.email, undefined);
    assert.equal(validation.metadata.errorSummary, '[email] entered an invalid value');

    const linkage = tracker.linkage();
    assert.equal(linkage.journeyVisitorId, pageView.visitorId);
    assert.equal(linkage.journeySessionId, pageView.sessionId);
    assert.ok(linkage.journeySequence > validation.sequence);
    assert.equal(linkage.journeyPagePath, '/landing');
});
