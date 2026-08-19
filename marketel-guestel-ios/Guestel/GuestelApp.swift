import SwiftUI

// Guestel — the guest super app. Lean, native SwiftUI. Same design language as
// Marketel Front Desk (green / ink / soft canvas), but a calm travel wallet, not
// an ops cockpit. v1 is a shell: hold your hotels, view them; booking/payments/
// scanning land later. See GUESTEL.md for the full plan.
@main
struct GuestelApp: App {
    @State private var store = GuestStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.green)
        }
    }
}
