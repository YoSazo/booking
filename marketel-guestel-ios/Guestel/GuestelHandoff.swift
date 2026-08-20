import Foundation

// Apple transfers an App Group container from an App Clip to its full app. The
// handoff is deliberately tiny: one hotel identity, no guest PII or card data.
enum GuestelHandoff {
    static let group = "group.com.bookmarketel.guestel"
    private static let key = "guestel.pendingHotel.v1"

    struct Target: Codable {
        let hotelId: String
        let domain: String
    }

    static func save(hotelId: String, domain: String) {
        guard !hotelId.isEmpty else { return }
        let target = Target(hotelId: hotelId, domain: domain)
        guard let data = try? JSONEncoder().encode(target) else { return }
        UserDefaults(suiteName: group)?.set(data, forKey: key)
    }

    static func consume() -> Target? {
        guard let defaults = UserDefaults(suiteName: group),
              let data = defaults.data(forKey: key),
              let target = try? JSONDecoder().decode(Target.self, from: data) else { return nil }
        defaults.removeObject(forKey: key)
        return target
    }
}
