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

    // The clip is invoked from a hotel's own branded domain (e.g. jacksinn.mktel.co),
    // so the hotel is identified by the host. We still accept an explicit ?hotelId=
    // (or /clip/<id>) as a fallback for central bookmarketel.com links.
    static func target(from url: URL) -> ClipTarget? {
        let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if let id = comps?.queryItems?.first(where: { $0.name == "hotelId" })?.value, !id.isEmpty {
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
