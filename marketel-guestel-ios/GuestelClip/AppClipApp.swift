import SwiftUI

// The Guestel App Clip. Launches instantly from a hotel's code/link with the
// hotel already in context — no full install, no Add to Home Screen.
@main
struct GuestelClipApp: App {
    @State private var hotelId: String?

    init() {
        STPStub.configure()
    }

    var body: some Scene {
        WindowGroup {
            ClipRootView(hotelId: hotelId)
                .tint(Theme.green)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL, let id = Self.hotelId(from: url) {
                        hotelId = id
                    }
                }
        }
    }

    // Invocation URL forms: /clip?hotelId=<id>  or  /clip/<id>
    static func hotelId(from url: URL) -> String? {
        if let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let id = comps.queryItems?.first(where: { $0.name == "hotelId" })?.value,
           !id.isEmpty {
            return id
        }
        let parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
        if parts.count >= 2, parts[0].lowercased() == "clip" { return parts[1] }
        return nil
    }
}

// The clip books through the web engine (no Stripe SDK in the clip = stays tiny),
// so nothing to configure yet. Placeholder kept for symmetry with the full app.
enum STPStub { static func configure() {} }
