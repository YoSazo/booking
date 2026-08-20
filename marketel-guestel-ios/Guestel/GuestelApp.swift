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
                    if let handoff = GuestelHandoff.consume() {
                        await addHandoffHotel(handoff)
                    }
                    await store.syncVerifiedWallet()
                    await GuestPushManager.registerIfAuthorized(store: store)
                }
                .onReceive(NotificationCenter.default.publisher(for: .guestelDeviceTokenChanged)) { _ in
                    Task { await GuestPushManager.sync(store: store) }
                }
                .onOpenURL { url in
                    guard url.scheme == "guestel", url.host == "messages" else { return }
                    let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
                    let hotelId = components?.queryItems?.first(where: { $0.name == "hotelId" })?.value ?? ""
                    let code = components?.queryItems?.first(where: { $0.name == "code" })?.value ?? ""
                    NotificationCenter.default.post(name: .guestelOpenMessages, object: nil, userInfo: ["hotelId": hotelId, "code": code])
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    guard let url = activity.webpageURL else { return }
                    Task { await addHotel(from: url) }
                }
        }
    }

    @MainActor
    private func addHandoffHotel(_ target: GuestelHandoff.Target) async {
        guard let data = try? await BookingAPI.hotel(target.hotelId) else { return }
        store.add(Hotel(
            hotelId: data.id,
            domain: target.domain.isEmpty ? (data.domain ?? "") : target.domain,
            name: data.name,
            location: "Direct booking",
            stays: 0,
            lastStayed: "—",
            imageURL: data.rooms.lazy.compactMap(\.image).first
        ))
    }

    @MainActor
    private func addHotel(from url: URL) async {
        let parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
        let queryId = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
            .first(where: { $0.name == "hotelId" })?.value
        let hotelId = queryId ?? (parts.count >= 2 && parts[0].lowercased() == "clip" ? parts[1] : "")
        guard !hotelId.isEmpty else { return }
        await addHandoffHotel(.init(hotelId: hotelId, domain: ""))
    }
}
