const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('guest reservation APIs expose one full lifecycle contract', () => {
    assert.match(server, /function guestBookingPayload\(booking, suppliedCode = ''\)/);
    for (const field of [
        'pendingUntil',
        'approvalNoResponseAction',
        'approvalOutcome',
        'cancelledAt',
        'cancellationReason',
        'holdStatus',
        'fulfillmentStatus',
        'updatedAt',
    ]) {
        assert.match(server, new RegExp(`${field}: booking\\.${field}`));
    }
    assert.match(server, /app\.post\('\/api\/booking\/stays'/);
});

test('every Front Desk booking decision pushes its resulting state to the guest', () => {
    assert.match(server, /async function notifyGuestBookingStateChanged/);
    assert.match(server, /notifyGuestBookingStateChanged\(decided, decided\.status\)/);
    assert.match(server, /notifyGuestBookingStateChanged\(cancelled, 'cancelled'/);
    assert.match(server, /url: `\/guest\/home\?stay=/);
});

test('repeat guests receive one lightweight unread-count request', () => {
    assert.match(server, /app\.post\('\/api\/guest-messages\/unread'/);
    assert.match(server, /guestReadAt: null/);
    assert.match(server, /sender: 'hotel'/);
});

test('the legacy delete route preserves the booking and uses cancellation side effects', () => {
    assert.match(server, /app\.delete\('\/api\/crm\/bookings\/:id'[\s\S]*?cancelBookingByOwner\(id, hotelId, 'Removed in Front Desk'\)/);
});

test('guest polling buckets isolate one device rather than one property', () => {
    // Rate-limit keys are IP-based, so scoping on hotelId alone collides behind
    // the property's wifi NAT: two in-stay guests would exhaust a hotel-wide
    // bucket and everyone else would sit on stale reservation state.
    assert.match(server, /function guestStaySyncScope/);
    assert.match(server, /'guest-unread-sync',[\s\S]*?scope: guestStaySyncScope/);
    assert.match(server, /'guest-booking-sync',[\s\S]*?scope: guestStaySyncScope/);
    // Guard the regression specifically for the 15s pollers. Low-frequency
    // manual routes (support messages) may still share a property bucket.
    assert.doesNotMatch(server, /'guest-(unread|booking)-sync',[\s\S]{0,160}?scope: \(req\) => req\.body\?\.hotelId/);
});

test('single reservation lookup echoes the requested code like the batch endpoint', () => {
    // Without this a PMS alias resolves to a canonical code the client never
    // asked for, and the deep-link surface can never confirm it resolved.
    assert.match(server, /requestedCode: code/);
});

test('account deletion stays owner-only except for the synthetic review property', () => {
    // A shared front-desk PIN must never be able to delete a real business, so
    // the exception has to stay keyed on the seeded App Review marker and
    // nothing broader.
    assert.match(server, /function isAppReviewDemoProperty\(hotel\)[\s\S]{0,220}app_review/);
    assert.match(server, /function hasAccountOwnerSession\(req, hotel\)[\s\S]{0,120}isAppReviewDemoProperty\(hotel\)/);
    assert.match(server, /function hasAccountOwnerSession[\s\S]{0,400}crmIsNativeSession[\s\S]{0,160}sessionEmail === ownerEmail/);

    // Both the gate and the button state must read the same predicate, or the
    // control can appear without the request succeeding.
    assert.match(server, /function requireNativeOwnerSession[\s\S]{0,120}hasAccountOwnerSession\(req, hotel\)/);
    assert.match(server, /ownerSession: hasAccountOwnerSession\(req, hotel\)/);

    // The predicate reads a field the deletion queries must actually select.
    assert.match(server, /select: \{ ownerEmail: true, marketelSubscriptionStatus: true \}/);
});

test('only the seed writes the App Review subscription marker', () => {
    const seed = fs.readFileSync(
        path.join(__dirname, '..', 'scripts', 'seed-app-review-property.js'),
        'utf8'
    );
    assert.match(seed, /marketelSubscriptionStatus: 'app_review'/);
    // server.js may read the marker but must never assign it.
    assert.doesNotMatch(server, /marketelSubscriptionStatus: 'app_review'/);
});

test('Guestel Help links to a dedicated support page instead of a dead route', () => {
    const accountScreens = fs.readFileSync(
        path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel', 'AccountScreens.swift'),
        'utf8'
    );
    assert.match(server, /app\.get\('\/guest-support'/);
    assert.match(accountScreens, /guest-lodge-backend\.onrender\.com\/guest-support/);
    assert.doesNotMatch(accountScreens, /bookmarketel\.com\/support/);
});

test('Guestel hotel actions use live data instead of placeholder dead ends', () => {
    const guestelRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const addHotel = fs.readFileSync(path.join(guestelRoot, 'AddHotelView.swift'), 'utf8');
    const hotelSheet = fs.readFileSync(path.join(guestelRoot, 'HotelSheet.swift'), 'utf8');
    const nativeMessages = fs.readFileSync(path.join(guestelRoot, 'NativeMessagesView.swift'), 'utf8');
    const hotels = fs.readFileSync(path.join(guestelRoot, 'HotelsView.swift'), 'utf8');

    assert.match(addHotel, /BookingAPI\.hotelId\(forDomain: domain\)/);
    assert.doesNotMatch(addHotel, /hotelId: "new-hotel"/);
    assert.match(hotelSheet, /NativeMessagesView\(hotel: hotel, stay: stay\)/);
    assert.match(nativeMessages, /BookingAPI\.messages\(hotelId: hotel\.hotelId/);
    assert.doesNotMatch(hotelSheet, /SimpleWebSheet/);
    assert.match(hotels, /CachedRemoteImage\(url: imageURL\)/);
    assert.doesNotMatch(hotels, /Paid · Confirmed/);
});

test('App Clip handoff is one-use and becomes a verified native stay', () => {
    const root = path.join(__dirname, '..', '..');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'hotel-booking-app', 'src', 'App.jsx'), 'utf8');
    const confirmation = fs.readFileSync(path.join(root, 'hotel-booking-app', 'src', 'ConfirmationPage.jsx'), 'utf8');
    const clip = fs.readFileSync(path.join(root, 'marketel-guestel-ios', 'GuestelClip', 'ClipWebView.swift'), 'utf8');
    const guestel = fs.readFileSync(path.join(root, 'marketel-guestel-ios', 'Guestel', 'GuestelApp.swift'), 'utf8');

    assert.match(schema, /model GuestAppHandoff/);
    assert.match(server, /crypto\.randomBytes\(24\)/);
    assert.match(server, /claimedAt: null, expiresAt: \{ gt: new Date\(\) \}/);
    assert.match(server, /handoffToken: await issueGuestAppHandoff\(outcome\.booking\)/);
    assert.match(app, /reservationToken: completionResult\?\.reservationToken/);
    assert.match(app, /handoffToken: completionResult\?\.handoffToken/);
    assert.match(confirmation, /handoffToken=\{bookingDetails\?\.handoffToken/);
    assert.match(clip, /marketel_guest_stays/);
    assert.match(clip, /guestelClip\.postMessage\(\{ type: 'handoff'/);
    assert.match(guestel, /BookingAPI\.claimHandoff\(handoff\)/);
});

test('Guestel booking webviews opt out of website advertising analytics', () => {
    const root = path.join(__dirname, '..', '..');
    const fullApp = fs.readFileSync(
        path.join(root, 'marketel-guestel-ios', 'Guestel', 'BookingWebView.swift'),
        'utf8'
    );
    const clip = fs.readFileSync(
        path.join(root, 'marketel-guestel-ios', 'GuestelClip', 'ClipWebView.swift'),
        'utf8'
    );
    const tracking = fs.readFileSync(
        path.join(root, 'hotel-booking-app', 'src', 'trackingService.js'),
        'utf8'
    );
    const nativeContext = fs.readFileSync(
        path.join(root, 'hotel-booking-app', 'src', 'nativeGuestelContext.js'),
        'utf8'
    );
    const main = fs.readFileSync(
        path.join(root, 'hotel-booking-app', 'src', 'main.jsx'),
        'utf8'
    );
    const installTracking = fs.readFileSync(
        path.join(root, 'hotel-booking-app', 'src', 'guestInstallTracking.js'),
        'utf8'
    );
    const bookingHtml = fs.readFileSync(
        path.join(root, 'hotel-booking-app', 'index.html'),
        'utf8'
    );

    for (const webview of [fullApp, clip]) {
        assert.match(webview, /URLQueryItem\(name: "guestelNative", value: "1"\)/);
        assert.match(webview, /window\.__GUESTEL_NATIVE__ = true/);
    }
    assert.match(nativeContext, /params\.get\('guestelNative'\) === '1'/);
    assert.match(nativeContext, /window\.__GUESTEL_NATIVE__ === true/);
    assert.match(tracking, /isNativeGuestelContext\(\)/);
    assert.match(main, /!isNativeGuestelContext\(\)/);
    assert.match(installTracking, /if \(isNativeGuestelContext\(\)\) return;/);
    assert.match(bookingHtml, /if \(isNativeGuestel\) return;/);
    assert.doesNotMatch(bookingHtml, /<script[^>]+src="https:\/\/www\.googletagmanager\.com/);
});

test('Guestel privacy manifest matches native booking and Stripe data', () => {
    const manifest = fs.readFileSync(
        path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel', 'PrivacyInfo.xcprivacy'),
        'utf8'
    );
    for (const type of [
        'Name',
        'EmailAddress',
        'PhoneNumber',
        'PhysicalAddress',
        'PaymentInfo',
        'PurchaseHistory',
        'UserID',
        'DeviceID',
        'EmailsOrTextMessages',
        'ProductInteraction',
    ]) {
        assert.match(manifest, new RegExp(`NSPrivacyCollectedDataType${type}`));
    }
    assert.match(manifest, /NSPrivacyCollectedDataTypePurposeAnalytics/);
    assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
});

test('Guestel messaging is a first-class native inbox', () => {
    const guestelRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const rootView = fs.readFileSync(path.join(guestelRoot, 'RootView.swift'), 'utf8');
    const messages = fs.readFileSync(path.join(guestelRoot, 'MessagesView.swift'), 'utf8');
    const nativeThread = fs.readFileSync(path.join(guestelRoot, 'NativeMessagesView.swift'), 'utf8');

    assert.match(server, /app\.post\('\/api\/guest\/native\/conversations'/);
    assert.match(server, /guestReadAt/);
    assert.match(rootView, /Label\("Messages", systemImage:/);
    assert.match(rootView, /badge\(store\.unreadMessageCount\)/);
    assert.match(messages, /NativeMessagesView\(hotel: destination\.hotel, stay: destination\.stay\)/);
    assert.match(nativeThread, /TextField\("Message Front Desk"/);
    assert.doesNotMatch(messages, /WKWebView|SimpleWebSheet/);
});

test('Guestel conversation deletion is guest-only, durable, and native', () => {
    const guestelRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
    const api = fs.readFileSync(path.join(guestelRoot, 'BookingAPI.swift'), 'utf8');
    const messages = fs.readFileSync(path.join(guestelRoot, 'MessagesView.swift'), 'utf8');

    assert.match(schema, /guestMessagesHiddenBefore\s+DateTime\?/);
    assert.match(server, /app\.delete\('\/api\/guest\/native\/conversation'/);
    assert.match(server, /data: \{ guestMessagesHiddenBefore: hiddenBefore \}/);
    assert.match(server, /createdAt: \{ gt: booking\.guestMessagesHiddenBefore \}/);
    assert.doesNotMatch(server, /Guestel conversation delete[\s\S]{0,1400}guestMessage\.deleteMany/);
    assert.match(api, /static func deleteConversation/);
    assert.match(messages, /\.swipeActions\(edge: \.trailing/);
    assert.match(messages, /Button\(role: \.destructive\)/);
    assert.match(messages, /The property keeps its copy/);
});

test('Guestel offers in-app account deletion without cancelling hotel records', () => {
    const guestelRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
    const account = fs.readFileSync(path.join(guestelRoot, 'AccountScreens.swift'), 'utf8');
    const api = fs.readFileSync(path.join(guestelRoot, 'BookingAPI.swift'), 'utf8');

    assert.match(schema, /model GuestelAccountDeletion/);
    assert.match(schema, /guestAccessRevokedAt\s+DateTime\?/);
    assert.match(server, /app\.delete\('\/api\/guest\/native\/account'/);
    assert.match(server, /guestNativePushDevice\.deleteMany/);
    assert.match(server, /stripe\.customers\.del/);
    assert.match(server, /retainedReservationRecords/);
    assert.doesNotMatch(server, /Guestel account deletion[\s\S]{0,4000}prisma\.booking\.delete/);
    assert.match(api, /static func deleteAccount/);
    assert.match(account, /Delete Guestel account/);
    assert.match(account, /It does not cancel your hotel reservations/);
});

test('Front Desk edits the same property card Guestel renders', () => {
    const root = path.join(__dirname, '..', '..');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
    const apps = fs.readFileSync(path.join(__dirname, '..', 'frontdesk', 'src', 'apps.js'), 'utf8');
    const api = fs.readFileSync(path.join(root, 'marketel-guestel-ios', 'Guestel', 'BookingAPI.swift'), 'utf8');
    const store = fs.readFileSync(path.join(root, 'marketel-guestel-ios', 'Guestel', 'Store.swift'), 'utf8');
    const hotelsView = fs.readFileSync(path.join(root, 'marketel-guestel-ios', 'Guestel', 'HotelsView.swift'), 'utf8');

    assert.match(schema, /guestelWalletImageUrl\s+String\?/);
    assert.match(schema, /guestelWalletSubtitle\s+String\?/);
    assert.match(server, /app\.post\('\/api\/crm\/guestel-wallet-card'/);
    assert.match(server, /app\.post\('\/api\/crm\/guestel-wallet-image'/);
    assert.match(server, /app\.delete\('\/api\/crm\/guestel-wallet-image'/);
    assert.match(server, /location: hotel\.guestelWalletSubtitle \|\| hotel\.address/);
    assert.match(server, /imageURL: hotel\.guestelWalletImageUrl \|\| hotel\.rooms/);
    assert.match(apps, /Save Guestel card/);
    assert.doesNotMatch(apps, /Your Guestel icon/);
    assert.doesNotMatch(apps, /Guestel uses this square image for your conversation and notification identity/);
    assert.match(api, /let guestelWalletImageUrl: String\?/);
    assert.match(api, /let guestelWalletSubtitle: String\?/);
    assert.match(store, /hotels\[index\]\.location = data\.guestelWalletSubtitle/);
    assert.match(store, /hotels\[index\]\.imageURL = data\.walletImage/);
    assert.match(hotelsView, /\.refreshable \{ await refreshHotelCards\(\) \}/);
    assert.match(hotelsView, /phase == \.active[\s\S]{0,120}refreshHotelCards\(\)/);
});

test('shared booking links never expose the retired client identity', () => {
    const root = path.join(__dirname, '..', '..');
    const engineHTML = fs.readFileSync(path.join(root, 'hotel-booking-app', 'index.html'), 'utf8');
    const engineApp = fs.readFileSync(path.join(root, 'hotel-booking-app', 'src', 'App.jsx'), 'utf8');

    assert.doesNotMatch(engineHTML, /logo\.jpg|Click Hospitality/i);
    assert.match(engineHTML, /rel="icon"[^>]+marketellogo\.svg/);
    assert.match(engineApp, /favicon\.href = guestIconUrl/);
    assert.equal(fs.existsSync(path.join(root, 'hotel-booking-app', 'public', 'logo.jpg')), false);
    assert.equal(fs.existsSync(path.join(root, 'guest-lodge-backend', 'public', 'logo.jpg')), false);
});

test('Marketel opens real native SwiftUI message surfaces on iPhone', () => {
    const root = path.join(__dirname, '..', '..');
    const nativeMessages = fs.readFileSync(
        path.join(root, 'marketel-frontdesk-ios', 'ios', 'App', 'App', 'NativeMessages.swift'),
        'utf8'
    );
    const appDelegate = fs.readFileSync(
        path.join(root, 'marketel-frontdesk-ios', 'ios', 'App', 'App', 'AppDelegate.swift'),
        'utf8'
    );
    const core = fs.readFileSync(path.join(__dirname, '..', 'frontdesk', 'src', 'core.js'), 'utf8');

    assert.match(appDelegate, /UIHostingController\(rootView: messages\)/);
    assert.match(appDelegate, /case "openGuestMessages"/);
    assert.match(appDelegate, /case "openSupport"/);
    assert.match(core, /nativeShellPost\(\{ type: 'openGuestMessages' \}\)/);
    assert.match(core, /nativeShellPost\(\{ type: 'openSupport' \}\)/);
    assert.match(nativeMessages, /struct MarketelNativeGuestMessagesView: View/);
    assert.match(nativeMessages, /struct MarketelNativeSupportView: View/);
    assert.match(nativeMessages, /safeAreaInset\(edge: \.bottom/);
    assert.match(nativeMessages, /Task\.sleep\(nanoseconds: 15_000_000_000\)/);
});
