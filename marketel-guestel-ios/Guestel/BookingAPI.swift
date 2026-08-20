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
        var image: URL? {
            imageUrls?.first.flatMap { URL(string: $0, relativeTo: BookingAPI.base)?.absoluteURL }
        }
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

    struct SetupInfo {
        let clientSecret: String
        let ephemeralKey: String
        let customerId: String
        let customerToken: String
    }

    struct SavedCard: Identifiable, Decodable, Hashable {
        let id: String
        let brand: String
        let last4: String
        let expMonth: Int?
        let expYear: Int?
    }

    enum Failure: LocalizedError {
        case message(String)
        var errorDescription: String? { if case let .message(m) = self { return m }; return "Something went wrong." }
    }

    // MARK: - Calls

    static func hotel(_ hotelId: String) async throws -> HotelPublic {
        let url = base.appendingPathComponent("api/hotel/\(hotelId)/public")
        let data = try await request(URLRequest(url: url))
        return try JSONDecoder().decode(HotelPublic.self, from: data)
    }

    /// Resolves a branded booking domain (e.g. jacksinn.mktel.co) to its hotelId.
    /// Used by the App Clip, which is invoked from the hotel's own subdomain.
    static func hotelId(forDomain domain: String) async throws -> String {
        var comps = URLComponents(url: base.appendingPathComponent("api/hotel-context"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "domain", value: domain)]
        let data = try await request(URLRequest(url: comps.url!))
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

    // MARK: - Stripe (guest)

    /// The publishable key for THIS backend's Stripe account. See StripeConfig.
    static func stripeConfig() async throws -> String {
        let url = base.appendingPathComponent("api/stripe-config")
        let data = try await request(URLRequest(url: url))
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let key = obj?["publishableKey"] as? String,
              key.hasPrefix("pk_test_") || key.hasPrefix("pk_live_") else {
            throw Failure.message("Payments aren't set up on the server yet.")
        }
        return key
    }

    /// Starts an add-a-card (SetupIntent) flow tied to the guest's customer.
    static func setupIntent(email: String, name: String, apiVersion: String, customerToken: String?) async throws -> SetupInfo {
        let json = try await post(
            "api/guest/setup-intent",
            ["email": email, "name": name, "apiVersion": apiVersion],
            bearerToken: customerToken
        )
        guard
            let cs = json["setupIntentClientSecret"] as? String,
            let ek = json["ephemeralKeySecret"] as? String,
            let cust = json["customerId"] as? String,
            let token = json["customerToken"] as? String
        else { throw Failure.message((json["message"] as? String) ?? "Could not start card setup.") }
        return SetupInfo(clientSecret: cs, ephemeralKey: ek, customerId: cust, customerToken: token)
    }

    static func paymentMethods(customerToken: String) async throws -> [SavedCard] {
        var req = URLRequest(url: base.appendingPathComponent("api/guest/payment-methods"))
        req.setValue("Bearer \(customerToken)", forHTTPHeaderField: "Authorization")
        let data = try await request(req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let arr = obj?["cards"] as? [[String: Any]] ?? []
        let jsonData = try JSONSerialization.data(withJSONObject: arr)
        return try JSONDecoder().decode([SavedCard].self, from: jsonData)
    }

    static func detachPaymentMethod(_ id: String, customerToken: String) async throws {
        _ = try await post(
            "api/guest/detach-payment-method",
            ["paymentMethodId": id],
            bearerToken: customerToken
        )
    }

    // MARK: - Helpers

    private static func post(_ path: String, _ body: [String: Any], bearerToken: String? = nil) async throws -> [String: Any] {
        var request = URLRequest(url: base.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let bearerToken, !bearerToken.isEmpty {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let data = try await self.request(request)
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw Failure.message("The server returned an invalid response.")
        }
        return object
    }

    private static func request(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw Failure.message("The server returned an invalid response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let nested = object?["error"] as? [String: Any]
            let message = (object?["message"] as? String)
                ?? (nested?["message"] as? String)
                ?? "The request failed (\(http.statusCode))."
            throw Failure.message(message)
        }
        return data
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
