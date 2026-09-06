import SwiftUI

// Guestel — the guest super app. Lean, native SwiftUI. Same design language as
// Marketel Front Desk (green / ink / soft canvas), a calm travel wallet. See
// GUESTEL.md for the full plan.
@main
struct GuestelApp: App {
    @UIApplicationDelegateAdaptor(GuestelAppDelegate.self) private var appDelegate
    @State private var store = GuestStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.green)
                // Pull the publishable key from OUR backend so Stripe always uses
                // the same account that creates the holds. See StripeConfig.
                .task {
                    await StripeConfig.ensureLoaded()
                    if let handoff = GuestelHandoff.pending(), await addHandoffHotel(handoff) {
                        GuestelHandoff.clear()
                    }
                    await store.syncVerifiedWallet()
                    await store.refreshConversations()
                    await GuestPushManager.registerIfAuthorized(store: store)
                }
                .onReceive(NotificationCenter.default.publisher(for: .guestelDeviceTokenChanged)) { _ in
                    Task { await GuestPushManager.sync(store: store) }
                }
                .onOpenURL { url in
                    guard url.scheme == "guestel" else { return }
                    let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
                    let hotelId = components?.queryItems?.first(where: { $0.name == "hotelId" })?.value ?? ""
                    if url.host == "hotel", !hotelId.isEmpty {
                        GuestHotelRoute.save(hotelId: hotelId)
                        NotificationCenter.default.post(name: .guestelOpenHotels, object: nil, userInfo: ["hotelId": hotelId])
                        return
                    }
                    guard url.host == "messages" else { return }
                    let code = components?.queryItems?.first(where: { $0.name == "code" })?.value ?? ""
                    GuestMessageRoute.save(hotelId: hotelId, code: code)
                    NotificationCenter.default.post(name: .guestelOpenMessages, object: nil, userInfo: ["hotelId": hotelId, "code": code])
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    guard let url = activity.webpageURL else { return }
                    Task { await addHotel(from: url) }
                }
        }
    }

    @MainActor
    private func addHandoffHotel(_ target: GuestelHandoff.Target) async -> Bool {
        guard let data = try? await BookingAPI.hotel(target.hotelId) else { return false }
        let hotel = Hotel(
            hotelId: data.id,
            domain: target.domain.isEmpty ? (data.domain ?? "") : target.domain,
            name: data.name,
            location: data.guestelWalletSubtitle ?? "Direct booking",
            stays: 0,
            lastStayed: "—",
            imageURL: data.walletImage ?? data.rooms.lazy.compactMap(\.image).first
        )
        store.cacheHotelDetails(data)
        store.add(hotel)
        var transferredStay: Reservation?
        if let handoff = target.handoffToken, !handoff.isEmpty {
            do {
                let stay = try await BookingAPI.claimHandoff(handoff)
                store.ingest(stay)
                transferredStay = store.reservations.first { $0.hotelId == stay.hotelId && $0.code == stay.code }
                await GuestPushManager.sync(store: store)
            } catch {
                let message = error.localizedDescription.lowercased()
                // An expired/consumed bridge cannot become valid on retry. The
                // hotel remains saved and email Restore Stays is still available.
                return message.contains("expired") || message.contains("already used")
            }
        }
        if await GuestPushManager.shouldShowPermissionContext() {
            store.arrival = GuestelArrival(hotel: hotel, stay: transferredStay)
        } else {
            await GuestPushManager.registerIfAuthorized(store: store)
        }
        return true
    }

    // Mirrors the App Clip's own resolution (GuestelClip/AppClipApp.swift,
    // `invocation(from:)`). The Add button builds Apple's hosted link, and for a
    // branded booking page it identifies the property with `domain=` rather than
    // `hotelId=` — the one form this handler never read. With Guestel already
    // installed the link opened the app, found no id, and returned without
    // adding anything: a flicker and no card. A direct visit to a branded host
    // is resolved the same way, so every invocation surface agrees.
    @MainActor
    private func addHotel(from url: URL) async {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        let handoff = items?.first(where: { $0.name == "handoff" })?.value
        let parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }

        var hotelId = items?.first(where: { $0.name == "hotelId" })?.value ?? ""
        var domain = items?.first(where: { $0.name == "domain" })?.value ?? ""
        if hotelId.isEmpty, domain.isEmpty {
            if parts.count >= 2, parts[0].lowercased() == "clip" {
                hotelId = parts[1]
            } else if let host = url.host, host.hasSuffix("mktel.co") {
                domain = host
            }
        }
        if hotelId.isEmpty, !domain.isEmpty {
            hotelId = (try? await BookingAPI.hotelId(forDomain: domain)) ?? ""
        }
        guard !hotelId.isEmpty else { return }

        let target = GuestelHandoff.Target(hotelId: hotelId, domain: domain, handoffToken: handoff)
        // Saved before the network call so a failure here is retried later
        // rather than losing the property the guest just asked to add.
        GuestelHandoff.save(hotelId: hotelId, domain: domain, handoffToken: handoff)
        if await addHandoffHotel(target) { GuestelHandoff.clear() }
    }
}
