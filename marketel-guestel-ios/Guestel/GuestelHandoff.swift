import Foundation

// Apple transfers an App Group container from an App Clip to its full app. The
// handoff is deliberately tiny: one hotel identity, no guest PII or card data.
enum GuestelHandoff {
    static let group = "group.com.bookmarketel.guestel"
    private static let key = "guestel.pendingHotel.v1"

    struct Target: Codable {
        let hotelId: String
        let domain: String
        let handoffToken: String?
    }

    static func save(hotelId: String, domain: String, handoffToken: String? = nil) {
        guard !hotelId.isEmpty else { return }
        let defaults = UserDefaults(suiteName: group)
        let existing = defaults?.data(forKey: key).flatMap { try? JSONDecoder().decode(Target.self, from: $0) }
        let target = Target(
            hotelId: hotelId,
            domain: domain,
            handoffToken: handoffToken?.isEmpty == false
                ? handoffToken
                : (existing?.hotelId == hotelId ? existing?.handoffToken : nil)
        )
        guard let data = try? JSONEncoder().encode(target) else { return }
        defaults?.set(data, forKey: key)
    }

    static func pending() -> Target? {
        guard let defaults = UserDefaults(suiteName: group),
              let data = defaults.data(forKey: key),
              let target = try? JSONDecoder().decode(Target.self, from: data) else { return nil }
        return target
    }

    static func clear() {
        UserDefaults(suiteName: group)?.removeObject(forKey: key)
    }
}
