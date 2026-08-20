import Foundation

// Warm the room photos into URLCache at launch so they are instant when a card opens.
// (Main app only — kept out of BookingAPI so the App Clip can share BookingAPI cleanly.)
enum ImagePrefetch {
    static func warm(hotels: [Hotel]) {
        Task.detached(priority: .utility) {
            for hotel in hotels {
                guard let data = try? await BookingAPI.hotel(hotel.hotelId) else { continue }
                for room in data.rooms {
                    for string in room.imageUrls ?? [] {
                        if let url = URL(string: string) {
                            _ = try? await URLSession.shared.data(from: url)
                        }
                    }
                }
            }
        }
    }
}
