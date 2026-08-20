import SwiftUI

// The Guestel App Clip. Launches instantly from a hotel's code/link with the
// hotel already in context — no full install, no Add to Home Screen.
@main
struct GuestelClipApp: App {
    @State private var invocation: ClipInvocation?

    var body: some Scene {
        WindowGroup {
            ClipRootView(invocation: invocation)
                .tint(Theme.green)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL {
                        invocation = Self.invocation(from: url)
                    }
                }
        }
    }

    // Resolves the hotel from the invocation URL. Two families of invocation:
    //  • Branded domain (jacksinn.mktel.co) — Smart App Banner / direct link / QR:
    //    the hotel is the host.
    //  • Apple default App Clip link (appclip.apple.com/id?p=<bundle>&domain=…):
    //    the host is Apple's, so the hotel rides in a `domain` (or `hotelId`) param.
    static func invocation(from url: URL) -> ClipInvocation? {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        let intent = ClipIntent(rawValue: items?.first(where: { $0.name == "intent" })?.value ?? "") ?? .book
        let handoff = items?.first(where: { $0.name == "handoff" })?.value
        let target: ClipTarget?
        if let d = items?.first(where: { $0.name == "domain" })?.value, !d.isEmpty {
            target = .domain(d)
        } else if let id = items?.first(where: { $0.name == "hotelId" })?.value, !id.isEmpty {
            target = .hotelId(id)
        } else {
            let parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
            if parts.count >= 2, parts[0].lowercased() == "clip" {
                target = .hotelId(parts[1])
            } else if let host = url.host, host.hasSuffix("mktel.co") {
                target = .domain(host)
            } else {
                target = nil
            }
        }
        guard let target else { return nil }
        return ClipInvocation(target: target, intent: intent, handoffToken: handoff)
    }
}

struct ClipInvocation: Hashable {
    let target: ClipTarget
    let intent: ClipIntent
    let handoffToken: String?
}

enum ClipIntent: String, Hashable {
    case book
    case add
    case stay
}

// What the invocation URL pointed at: a branded hotel domain (resolved to a hotel
// server-side) or an explicit hotel id.
enum ClipTarget: Hashable {
    case domain(String)
    case hotelId(String)
}
