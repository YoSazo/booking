import SwiftUI

struct Hotel: Identifiable, Hashable {
    let id: UUID
    var name: String
    var location: String
    var stays: Int
    var lastStayed: String

    init(id: UUID = UUID(), name: String, location: String, stays: Int, lastStayed: String) {
        self.id = id
        self.name = name
        self.location = location
        self.stays = stays
        self.lastStayed = lastStayed
    }
}

@Observable
final class GuestStore {
    var hotels: [Hotel]
    var guestName: String = "Guest"

    init(hotels: [Hotel] = GuestStore.sample) {
        self.hotels = hotels
    }

    func add(_ hotel: Hotel) {
        hotels.insert(hotel, at: 0)
    }

    // Seed data so the wallet shows the design. A real wallet starts empty and
    // fills as the guest scans hotels — the empty state is designed for too.
    static let sample: [Hotel] = [
        Hotel(name: "Jack's Inn", location: "St. Croix, WI", stays: 3, lastStayed: "Aug 2026"),
        Hotel(name: "The Cedar House", location: "Asheville, NC", stays: 1, lastStayed: "Jun 2026"),
        Hotel(name: "Marbella Villas", location: "Málaga, ES", stays: 2, lastStayed: "Apr 2026"),
    ]
}
