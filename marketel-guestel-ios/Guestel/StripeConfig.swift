import Foundation
import StripePaymentSheet

// Loads the publishable key from OUR backend so the app's Stripe account always
// matches the account that creates the PaymentIntents. Hardcoding it was the bug:
// the app used a different account than the backend, so every hold failed with
// "unexpected error". Fetching it also makes test→live a backend env change.
enum StripeConfig {
    private static var loaded = false

    static var isReady: Bool {
        !(STPAPIClient.shared.publishableKey ?? "").isEmpty
    }

    /// Idempotent: fetches and installs the publishable key once. Safe to call
    /// before any payment; no-ops if already configured.
    @discardableResult
    static func ensureLoaded() async -> Bool {
        if loaded, isReady { return true }
        guard let key = try? await BookingAPI.stripeConfig(), !key.isEmpty else { return isReady }
        await MainActor.run { STPAPIClient.shared.publishableKey = key }
        loaded = true
        return true
    }
}
