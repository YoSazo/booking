import SwiftUI
import StripePaymentSheet

// Guestel — the guest super app. Lean, native SwiftUI. Same design language as
// Marketel Front Desk (green / ink / soft canvas), a calm travel wallet. See
// GUESTEL.md for the full plan.
@main
struct GuestelApp: App {
    @State private var store = GuestStore()

    init() {
        // Test-mode publishable key (safe to embed). Swap to the live key later.
        STPAPIClient.shared.publishableKey =
            "pk_test_51NymOIBFnVCGiXwe5qo3pFsbKbuL84uZ5ahta4eRKJMWTNI0KwlJhQ9e4u7JC7mVIp8j7W7xXk5sY9662TWxfuk7006WZCxWYa"
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.green)
        }
    }
}
