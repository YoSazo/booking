import SwiftUI

struct Hotel: Identifiable, Hashable {
    let id: UUID
    var hotelId: String     // backend id / slug used by the booking engine
    var name: String
    var location: String
    var stays: Int
    var lastStayed: String

    // The real direct booking engine for this hotel. Opens BookingPage → GuestInfo
    // → Confirmation inside Guestel (WKWebView), never the browser.
    var bookingURL: URL { URL(string: "https://bookmarketel.com/?hotelId=\(hotelId)")! }

    init(id: UUID = UUID(), hotelId: String, name: String, location: String, stays: Int, lastStayed: String) {
        self.id = id
        self.hotelId = hotelId
        self.name = name
        self.location = location
        self.stays = stays
        self.lastStayed = lastStayed
    }
}

// A real reservation, read out of the booking engine's own localStorage after a
// completed checkout — so an upcoming, paid stay is genuine, not mocked.
struct Reservation: Identifiable, Hashable, Codable {
    var code: String
    var hotelId: String
    var checkin: String
    var checkout: String

    var id: String { "\(hotelId):\(code)" }

    var checkinDate: Date? { Self.parse(checkin) }
    var checkoutDate: Date? { Self.parse(checkout) }

    static func parse(_ raw: String) -> Date? {
        let dayOnly = DateFormatter()
        dayOnly.locale = Locale(identifier: "en_US_POSIX")
        dayOnly.dateFormat = "yyyy-MM-dd"
        dayOnly.timeZone = TimeZone(identifier: "UTC")
        if let d = dayOnly.date(from: String(raw.prefix(10))) { return d }
        return ISO8601DateFormatter().date(from: raw)
    }
}

@Observable
final class GuestStore {
    var hotels: [Hotel]
    var reservations: [Reservation]
    var guestName: String = "Guest"

    private static let reservationsKey = "guestel.reservations.v1"

    init(hotels: [Hotel] = GuestStore.sample) {
        self.hotels = hotels
        self.reservations = GuestStore.loadReservations()
    }

    func hotelName(for hotelId: String) -> String {
        hotels.first { $0.hotelId == hotelId }?.name ?? "Your hotel"
    }

    // The next stay whose checkout hasn't passed — shown prominently up top.
    var upcomingReservation: Reservation? {
        let today = Calendar.current.startOfDay(for: Date())
        return reservations
            .filter { ($0.checkoutDate ?? .distantPast) >= today }
            .sorted { ($0.checkinDate ?? .distantFuture) < ($1.checkinDate ?? .distantFuture) }
            .first
    }

    func add(_ hotel: Hotel) { hotels.insert(hotel, at: 0) }

    // Called from BookingWebView when the booking engine reports its stored stays.
    func ingest(_ raw: [[String: Any]]) {
        var merged = reservations
        for item in raw {
            guard
                let code = (item["code"] as? String), !code.isEmpty,
                let hotelId = (item["hotelId"] as? String), !hotelId.isEmpty
            else { continue }
            let checkin = (item["checkin"] as? String) ?? (item["checkinDate"] as? String) ?? ""
            let checkout = (item["checkout"] as? String) ?? (item["checkoutDate"] as? String) ?? ""
            let res = Reservation(code: code, hotelId: hotelId, checkin: checkin, checkout: checkout)
            if let idx = merged.firstIndex(where: { $0.id == res.id }) {
                merged[idx] = res
            } else {
                merged.append(res)
            }
        }
        if merged != reservations {
            reservations = merged
            persistReservations()
        }
    }

    private func persistReservations() {
        if let data = try? JSONEncoder().encode(reservations) {
            UserDefaults.standard.set(data, forKey: Self.reservationsKey)
        }
    }

    private static func loadReservations() -> [Reservation] {
        guard
            let data = UserDefaults.standard.data(forKey: reservationsKey),
            let decoded = try? JSONDecoder().decode([Reservation].self, from: data)
        else { return [] }
        return decoded
    }

    // The three hotels the wallet is seeded with.
    static let sample: [Hotel] = [
        Hotel(hotelId: "studios17", name: "Studios 17", location: "Direct booking", stays: 0, lastStayed: "—"),
        Hotel(hotelId: "hotel-a39be0df", name: "Jack's Inn", location: "St. Croix, WI", stays: 2, lastStayed: "Aug 2026"),
        Hotel(hotelId: "marketel-review-inn", name: "Marketel Review Inn", location: "Direct booking", stays: 1, lastStayed: "Jul 2026"),
    ]
}
