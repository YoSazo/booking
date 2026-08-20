import SwiftUI

// The Guestel App Clip. Launches instantly from a hotel's code/link with the
// hotel already in context — no full install, no Add to Home Screen.
@main
struct GuestelClipApp: App {
    @State private var target: ClipTarget?

    var body: some Scene {
        WindowGroup {
            ClipRootView(target: target)
                .tint(Theme.green)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL {
                        target = Self.target(from: url)
                    }
                }
        }
    }

    // Resolves the hotel from the invocation URL. Two families of invocation:
    //  • Branded domain (jacksinn.mktel.co) — Smart App Banner / direct link / QR:
    //    the hotel is the host.
    //  • Apple default App Clip link (appclip.apple.com/id?p=<bundle>&domain=…):
    //    the host is Apple's, so the hotel rides in a `domain` (or `hotelId`) param.
    static func target(from url: URL) -> ClipTarget? {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        if let d = items?.first(where: { $0.name == "domain" })?.value, !d.isEmpty {
            return .domain(d)
        }
        if let id = items?.first(where: { $0.name == "hotelId" })?.value, !id.isEmpty {
            return .hotelId(id)
        }
        let parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
        if parts.count >= 2, parts[0].lowercased() == "clip" { return .hotelId(parts[1]) }
        if let host = url.host, host.hasSuffix("mktel.co") { return .domain(host) }
        return nil
    }
}

// What the invocation URL pointed at: a branded hotel domain (resolved to a hotel
// server-side) or an explicit hotel id.
enum ClipTarget: Hashable {
    case domain(String)
    case hotelId(String)
}
