import SwiftUI

// Guestel — the guest super app. Lean, native SwiftUI. Same design language as
// Marketel Front Desk (green / ink / soft canvas), a calm travel wallet. See
// GUESTEL.md for the full plan.
@main
struct GuestelApp: App {
    @State private var store = GuestStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.green)
                // Pull the publishable key from OUR backend so Stripe always uses
                // the same account that creates the holds. See StripeConfig.
                .task { await StripeConfig.ensureLoaded() }
        }
    }
}
