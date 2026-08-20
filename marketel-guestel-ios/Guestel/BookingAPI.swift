import Foundation

// Talks to the same public booking endpoints the web engine uses. The server is
// authoritative on price and inventory, so native just sends room + dates and
// lets the backend quote and validate.
enum BookingAPI {
    static let base = URL(string: "https://guest-lodge-backend.onrender.com")!

    struct APIRoom: Identifiable, Decodable, Hashable {
        let id: Int
        let roomId: String?
        let name: String
        let description: String?
        let amenities: String?
        let maxOccupancy: Int?
        let imageUrls: [String]?
        var image: URL? { imageUrls?.first.flatMap { URL(string: $0) } }
    }

    struct Rates: Decodable, Hashable {
        let nightly: Double
        let weekly: Double
        let monthly: Double
        let taxRate: Double
        enum CodingKeys: String, CodingKey {
            case nightly = "NIGHTLY", weekly = "WEEKLY", monthly = "MONTHLY", taxRate
        }
    }

    struct HotelPublic: Decodable {
        let id: String
        let name: String
        let subscribed: Bool?
        let rates: Rates?
        let rooms: [APIRoom]
    }

    struct Hold { let clientSecret: String; let paymentIntentId: String }

    enum Failure: LocalizedError {
        case message(String)
        var errorDescription: String? { if case let .message(m) = self { return m }; return "Something went wrong." }
    }

    // MARK: - Calls

    static func hotel(_ hotelId: String) async throws -> HotelPublic {
        let url = base.appendingPathComponent("api/hotel/\(hotelId)/public")
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(HotelPublic.self, from: data)
    }

    /// Resolves a branded booking domain (e.g. jacksinn.mktel.co) to its hotelId.
    /// Used by the App Clip, which is invoked from the hotel's own subdomain.
    static func hotelId(forDomain domain: String) async throws -> String {
        var comps = URLComponents(url: base.appendingPathComponent("api/hotel-context"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "domain", value: domain)]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let d = obj?["data"] as? [String: Any], let id = d["hotelId"] as? String, !id.isEmpty {
            return id
        }
        throw Failure.message((obj?["message"] as? String) ?? "Unknown hotel for \(domain).")
    }

    /// Returns the names of rooms available for the range.
    static func availability(hotelId: String, checkin: String, checkout: String) async throws -> [String] {
        let json = try await post("api/availability", ["hotelId": hotelId, "checkin": checkin, "checkout": checkout])
        let rooms = (json["data"] as? [[String: Any]]) ?? []
        return rooms.compactMap { $0["name"] as? String ?? $0["roomName"] as? String }
    }

    static func createHold(hotelId: String, bookingDetails: [String: Any], guestInfo: [String: Any]) async throws -> Hold {
        let json = try await post("api/create-preauth-hold", [
            "hotelId": hotelId, "bookingDetails": bookingDetails, "guestInfo": guestInfo,
        ])
        guard
            let secret = json["clientSecret"] as? String,
            let intentId = json["paymentIntentId"] as? String
        else { throw Failure.message((json["message"] as? String) ?? "Could not start payment.") }
        return Hold(clientSecret: secret, paymentIntentId: intentId)
    }

    static func book(hotelId: String, bookingDetails: [String: Any], guestInfo: [String: Any], paymentIntentId: String) async throws -> String {
        let json = try await post("api/book", [
            "hotelId": hotelId, "bookingDetails": bookingDetails, "guestInfo": guestInfo, "paymentIntentId": paymentIntentId,
        ])
        if let code = json["reservationCode"] as? String, !code.isEmpty { return code }
        throw Failure.message((json["message"] as? String) ?? "Could not confirm the booking.")
    }

    // MARK: - Helpers

    private static func post(_ path: String, _ body: [String: Any]) async throws -> [String: Any] {
        var request = URLRequest(url: base.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: request)
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
    }

    // Tiered price: nightly < 7, then monthly/weekly blocks (mirrors priceCalculator.js).
    static func subtotal(nights: Int, rates: Rates) -> Double {
        guard nights > 0 else { return 0 }
        if nights < 7 { return Double(nights) * rates.nightly }
        let weekNight = (rates.weekly / 7 * 100).rounded() / 100
        var rem = nights
        var total = 0.0
        total += Double(rem / 28) * rates.monthly; rem %= 28
        total += Double(rem / 7) * rates.weekly; rem %= 7
        total += Double(rem) * weekNight
        return (total * 100).rounded() / 100
    }

    static func reservationCode() -> String {
        let chars = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        return String((0..<9).map { _ in chars.randomElement()! })
    }

    static let apiDate: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}
