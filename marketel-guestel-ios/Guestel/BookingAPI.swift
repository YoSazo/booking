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
        let totalUnits: Int?
        let imageUrls: [String]?
        var image: URL? {
            imageUrls?.first.flatMap { URL(string: $0, relativeTo: BookingAPI.base)?.absoluteURL }
        }
        var images: [URL] {
            (imageUrls ?? []).compactMap { URL(string: $0, relativeTo: BookingAPI.base)?.absoluteURL }
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
        let domain: String?
        let name: String
        let phone: String?
        let address: String?
        let subtitle: String?
        let guestelWalletImageUrl: String?
        let guestelWalletSubtitle: String?
        let checkInTime: String?
        let checkOutTime: String?
        let cancellationPolicy: String?
        let subscribed: Bool?
        let rates: Rates?
        let rooms: [APIRoom]
        var walletImage: URL? {
            guestelWalletImageUrl.flatMap { URL(string: $0, relativeTo: BookingAPI.base)?.absoluteURL }
        }
    }

    struct Hold {
        let clientSecret: String
        let paymentIntentId: String
        let paymentCustomer: PaymentCustomer?
    }

    struct AvailableRoom: Hashable {
        let name: String
        let roomId: String
        let roomTypeID: String
        let rateID: String
        let roomsAvailable: Int
    }

    struct BookingQuote: Hashable {
        let nights: Int
        let subtotal: Double
        let taxes: Double
        let total: Double
        let totalCents: Int
    }

    struct BookingResult: Hashable {
        let reservationCode: String
        let pending: Bool
        let reviewWindowMinutes: Int
        let noResponseAction: String
        let message: String
        let reservationToken: String
    }

    struct PaymentCustomer {
        let ephemeralKey: String
        let customerId: String
    }

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

    struct WalletGuest: Decodable {
        let name: String
        let email: String
        let phone: String
    }

    struct WalletHotel: Decodable {
        let hotelId: String
        let domain: String
        let name: String
        let location: String
        let imageURL: String?
    }

    struct WalletReservation: Decodable {
        let code: String
        let hotelId: String
        let checkin: String
        let checkout: String
        let status: String?
        let roomName: String?
        let reservationToken: String?
    }

    struct WalletResponse: Decodable {
        let guest: WalletGuest
        let hotels: [WalletHotel]
        let reservations: [WalletReservation]
    }

    struct GuestMessage: Identifiable, Decodable, Hashable {
        let id: String
        let body: String
        let sender: String
        let createdAt: String
        let requests: [String]
    }

    struct ConversationPreview: Identifiable, Decodable, Hashable {
        let code: String
        let hotelId: String
        let roomName: String?
        let checkin: String
        let checkout: String
        let status: String?
        let latestMessage: GuestMessage?
        let unreadCount: Int
        var id: String { "\(hotelId):\(code)" }
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

    /// Returns the server-owned room/rate identifiers for rooms that can still
    /// be booked across the entire stay. An empty response means sold out.
    static func availability(hotelId: String, checkin: String, checkout: String) async throws -> [AvailableRoom] {
        let json = try await post("api/availability", ["hotelId": hotelId, "checkin": checkin, "checkout": checkout])
        let rooms = (json["data"] as? [[String: Any]]) ?? []
        return rooms.compactMap { room in
            guard
                let name = (room["roomName"] as? String) ?? (room["name"] as? String),
                !name.isEmpty,
                let roomTypeID = room["roomTypeID"] as? String,
                !roomTypeID.isEmpty,
                let rateID = room["rateID"] as? String,
                !rateID.isEmpty
            else { return nil }
            return AvailableRoom(
                name: name,
                roomId: (room["roomId"] as? String) ?? "",
                roomTypeID: roomTypeID,
                rateID: rateID,
                roomsAvailable: (room["roomsAvailable"] as? Int) ?? 1
            )
        }
    }

    /// Returns the same quote the backend will stamp onto Stripe's $1
    /// authorization. This is display data only; createHold recalculates it.
    static func quote(
        hotelId: String,
        roomName: String,
        roomId: String?,
        roomTypeID: String,
        rateID: String,
        checkin: String,
        checkout: String
    ) async throws -> BookingQuote {
        let json = try await post("api/booking-quote", [
            "hotelId": hotelId,
            "bookingDetails": [
                "roomName": roomName,
                "roomId": roomId ?? "",
                "roomTypeID": roomTypeID,
                "rateID": rateID,
                "checkin": checkin,
                "checkout": checkout,
            ],
        ])
        guard let raw = json["quote"] as? [String: Any] else {
            throw Failure.message((json["message"] as? String) ?? "That stay could not be quoted.")
        }
        let nights = (raw["nights"] as? NSNumber)?.intValue ?? 0
        let subtotal = (raw["subtotal"] as? NSNumber)?.doubleValue ?? 0
        let taxes = (raw["taxes"] as? NSNumber)?.doubleValue ?? 0
        let total = (raw["total"] as? NSNumber)?.doubleValue ?? 0
        let totalCents = (raw["totalCents"] as? NSNumber)?.intValue ?? Int((total * 100).rounded())
        guard nights > 0, total > 0 else {
            throw Failure.message("That stay could not be quoted.")
        }
        return BookingQuote(nights: nights, subtotal: subtotal, taxes: taxes, total: total, totalCents: totalCents)
    }

    static func createHold(
        hotelId: String,
        bookingDetails: [String: Any],
        guestInfo: [String: Any],
        stripeApiVersion: String,
        customerToken: String?
    ) async throws -> Hold {
        let json = try await post(
            "api/create-preauth-hold",
            [
                "hotelId": hotelId,
                "bookingDetails": bookingDetails,
                "guestInfo": guestInfo,
                "stripeApiVersion": stripeApiVersion,
            ],
            bearerToken: customerToken
        )
        guard
            let secret = json["clientSecret"] as? String,
            let intentId = json["paymentIntentId"] as? String
        else { throw Failure.message((json["message"] as? String) ?? "Could not start payment.") }
        let rawCustomer = json["paymentCustomer"] as? [String: Any]
        let customer: PaymentCustomer?
        if let customerId = rawCustomer?["customerId"] as? String,
           let ephemeralKey = rawCustomer?["ephemeralKeySecret"] as? String,
           !customerId.isEmpty,
           !ephemeralKey.isEmpty {
            customer = PaymentCustomer(ephemeralKey: ephemeralKey, customerId: customerId)
        } else {
            customer = nil
        }
        return Hold(clientSecret: secret, paymentIntentId: intentId, paymentCustomer: customer)
    }

    static func completePayLater(hotelId: String, bookingDetails: [String: Any], guestInfo: [String: Any], paymentIntentId: String) async throws -> BookingResult {
        let json = try await post("api/complete-pay-later-booking", [
            "hotelId": hotelId, "bookingDetails": bookingDetails, "guestInfo": guestInfo, "paymentIntentId": paymentIntentId,
        ])
        if let code = json["reservationCode"] as? String, !code.isEmpty {
            return BookingResult(
                reservationCode: code,
                pending: (json["pending"] as? Bool) ?? false,
                reviewWindowMinutes: (json["reviewWindowMinutes"] as? Int) ?? 0,
                noResponseAction: (json["noResponseAction"] as? String) ?? "",
                message: (json["message"] as? String) ?? "Reservation received.",
                reservationToken: (json["reservationToken"] as? String) ?? ""
            )
        }
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

    static func paymentCustomer(apiVersion: String, customerToken: String) async throws -> PaymentCustomer {
        let json = try await post(
            "api/guest/payment-session",
            ["apiVersion": apiVersion],
            bearerToken: customerToken
        )
        guard
            let ephemeralKey = json["ephemeralKeySecret"] as? String,
            let customerId = json["customerId"] as? String
        else { throw Failure.message((json["message"] as? String) ?? "Could not load saved cards.") }
        return PaymentCustomer(ephemeralKey: ephemeralKey, customerId: customerId)
    }

    static func detachPaymentMethod(_ id: String, customerToken: String) async throws {
        _ = try await post(
            "api/guest/detach-payment-method",
            ["paymentMethodId": id],
            bearerToken: customerToken
        )
    }

    // MARK: - Verified guest wallet

    static func requestGuestCode(email: String) async throws {
        _ = try await post("api/guest/auth/code/request", ["email": email])
    }

    static func verifyGuestCode(email: String, code: String) async throws -> String {
        let json = try await post("api/guest/auth/code/verify", ["email": email, "code": code])
        guard let token = json["sessionToken"] as? String, !token.isEmpty else {
            throw Failure.message((json["message"] as? String) ?? "Could not verify that code.")
        }
        return token
    }

    static func wallet(identityToken: String) async throws -> WalletResponse {
        var request = URLRequest(url: base.appendingPathComponent("api/guest/wallet"))
        request.setValue("Bearer \(identityToken)", forHTTPHeaderField: "Authorization")
        let data = try await self.request(request)
        return try JSONDecoder().decode(WalletResponse.self, from: data)
    }

    static func refreshStays(reservationTokens: [String]) async throws -> [WalletReservation] {
        let json = try await post("api/guest/native/stays", ["reservationTokens": reservationTokens])
        let raw = json["reservations"] as? [[String: Any]] ?? []
        return try JSONDecoder().decode([WalletReservation].self, from: JSONSerialization.data(withJSONObject: raw))
    }

    static func claimHandoff(_ handoffToken: String) async throws -> WalletReservation {
        let json = try await post("api/guest/native/handoff", ["handoffToken": handoffToken])
        guard let raw = json["reservation"] as? [String: Any] else {
            throw Failure.message((json["message"] as? String) ?? "Could not bring this stay into Guestel.")
        }
        return try JSONDecoder().decode(WalletReservation.self, from: JSONSerialization.data(withJSONObject: raw))
    }

    static func conversations(reservationTokens: [String], identityToken: String?) async throws -> [ConversationPreview] {
        let json = try await post(
            "api/guest/native/conversations",
            ["reservationTokens": reservationTokens],
            bearerToken: identityToken
        )
        let raw = json["conversations"] as? [[String: Any]] ?? []
        return try JSONDecoder().decode([ConversationPreview].self, from: JSONSerialization.data(withJSONObject: raw))
    }

    static func messages(hotelId: String, code: String, accessToken: String) async throws -> [GuestMessage] {
        var components = URLComponents(url: base.appendingPathComponent("api/guest/native/messages"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "hotelId", value: hotelId),
            URLQueryItem(name: "code", value: code),
        ]
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let data = try await self.request(request)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let raw = object?["messages"] as? [[String: Any]] ?? []
        return try JSONDecoder().decode([GuestMessage].self, from: JSONSerialization.data(withJSONObject: raw))
    }

    static func sendMessage(hotelId: String, code: String, body: String, accessToken: String) async throws -> GuestMessage {
        let json = try await post(
            "api/guest/native/messages",
            ["hotelId": hotelId, "reservationCode": code, "body": body],
            bearerToken: accessToken
        )
        guard let raw = json["message"] as? [String: Any] else {
            throw Failure.message((json["message"] as? String) ?? "Could not send message.")
        }
        return try JSONDecoder().decode(GuestMessage.self, from: JSONSerialization.data(withJSONObject: raw))
    }

    static func deleteConversation(hotelId: String, code: String, accessToken: String) async throws {
        var components = URLComponents(url: base.appendingPathComponent("api/guest/native/conversation"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "hotelId", value: hotelId),
            URLQueryItem(name: "code", value: code),
        ]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        _ = try await self.request(request)
    }

    static func deleteAccount(
        accessToken: String,
        reservationTokens: [String],
        deviceToken: String?,
        paymentToken: String?
    ) async throws {
        var request = URLRequest(url: base.appendingPathComponent("api/guest/native/account"))
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "reservationTokens": reservationTokens,
            "deviceToken": deviceToken ?? "",
            "paymentToken": paymentToken ?? "",
        ])
        _ = try await self.request(request)
    }

    static func registerPush(deviceToken: String, environment: String, reservationTokens: [String], hotelIds: [String], identityToken: String?, preferences: [String: Bool]) async throws {
        _ = try await post(
            "api/guest/native/push/register",
            [
                "deviceToken": deviceToken,
                "environment": environment,
                "reservationTokens": reservationTokens,
                "hotelIds": hotelIds,
                "preferences": preferences,
            ],
            bearerToken: identityToken
        )
    }

    static func unregisterPush(deviceToken: String, reservationTokens: [String], hotelIds: [String], identityToken: String?) async throws {
        _ = try await post(
            "api/guest/native/push/unregister",
            ["deviceToken": deviceToken, "reservationTokens": reservationTokens, "hotelIds": hotelIds],
            bearerToken: identityToken
        )
    }

    static func testPush(deviceToken: String, hotelId: String, code: String, accessToken: String) async throws {
        _ = try await post(
            "api/guest/native/push/test",
            [
                "deviceToken": deviceToken,
                "hotelId": hotelId,
                "reservationCode": code,
            ],
            bearerToken: accessToken
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
