import SwiftUI

struct Hotel: Identifiable, Hashable, Codable {
    let id: UUID
    var hotelId: String     // backend id — matches the stay the engine stores
    var domain: String      // the hotel's own branded booking domain
    var name: String
    var location: String
    var stays: Int
    var lastStayed: String
    var imageURL: URL?

    // The hotel's OWN direct booking site (e.g. jacksinn.mktel.co) opens inside
    // Guestel (WKWebView) — the guest books on the hotel's brand, not bookmarketel.
    var bookingURL: URL {
        if !domain.isEmpty, let url = URL(string: "https://\(domain)") { return url }
        return URL(string: "https://bookmarketel.com/?hotelId=\(hotelId)")!
    }
    var slug: String { domain.replacingOccurrences(of: ".mktel.co", with: "") }

    init(id: UUID = UUID(), hotelId: String, domain: String, name: String, location: String, stays: Int, lastStayed: String, imageURL: URL? = nil) {
        self.id = id
        self.hotelId = hotelId
        self.domain = domain
        self.name = name
        self.location = location
        self.stays = stays
        self.lastStayed = lastStayed
        self.imageURL = imageURL
    }
}

// A real reservation, read out of the booking engine's own localStorage after a
// completed checkout — so an upcoming, paid stay is genuine, not mocked.
struct Reservation: Identifiable, Hashable, Codable {
    var code: String
    var hotelId: String
    var checkin: String
    var checkout: String
    var status: String?
    var roomName: String?
    var accessToken: String?

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

// Kept locally so rebooking is near one-tap: entered once, prefilled after.
struct GuestInfo: Codable, Equatable {
    var name = ""
    var email = ""
    var phone = ""

    var isComplete: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && email.contains("@") && phone.count >= 7
    }
    var dictionary: [String: Any] {
        let parts = name.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace })
            .map(String.init)
        return [
            "name": name,
            "firstName": parts.first ?? "Guest",
            "lastName": parts.dropFirst().joined(separator: " "),
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "phone": phone,
        ]
    }
}

struct GuestelArrival: Identifiable, Hashable {
    let hotel: Hotel
    let stay: Reservation?
    var id: String { "\(hotel.hotelId):\(stay?.code ?? "property")" }
}

@Observable
final class GuestStore {
    var hotels: [Hotel]
    var reservations: [Reservation]
    var guest: GuestInfo
    var conversations: [BookingAPI.ConversationPreview] = []
    var arrival: GuestelArrival? = nil

    var guestName: String { guest.name.isEmpty ? "Guest" : guest.name }
    var unreadMessageCount: Int { conversations.reduce(0) { $0 + $1.unreadCount } }

    private static let reservationsKey = "guestel.reservations.v1"
    private static let guestKey = "guestel.guest.v1"
    private static let hotelsKey = "guestel.hotels.v1"

    init(hotels: [Hotel]? = nil) {
        self.hotels = hotels ?? GuestStore.loadHotels()
        self.reservations = GuestStore.loadReservations()
        self.guest = GuestStore.loadGuest()
    }

    func hotelName(for hotelId: String) -> String {
        hotels.first { $0.hotelId == hotelId || $0.slug == hotelId }?.name ?? "Your hotel"
    }

    func saveGuest(_ g: GuestInfo) {
        guest = g
        if let data = try? JSONEncoder().encode(g) {
            UserDefaults.standard.set(data, forKey: Self.guestKey)
        }
    }

    @MainActor
    func clearDeviceData() {
        hotels = []
        reservations = []
        guest = GuestInfo()
        conversations = []
        UserDefaults.standard.removeObject(forKey: Self.hotelsKey)
        UserDefaults.standard.removeObject(forKey: Self.reservationsKey)
        UserDefaults.standard.removeObject(forKey: Self.guestKey)
        GuestIdentityAccess.clear()
        GuestPaymentAccess.clear()
    }

    func addReservation(code: String, hotelId: String, checkin: String, checkout: String, status: String? = nil, roomName: String? = nil, accessToken: String? = nil) {
        var item: [String: Any] = ["code": code, "hotelId": hotelId, "checkin": checkin, "checkout": checkout]
        if let status { item["status"] = status }
        if let roomName, !roomName.isEmpty { item["roomName"] = roomName }
        if let accessToken, !accessToken.isEmpty { item["accessToken"] = accessToken }
        ingest([item])
        Task { @MainActor in await GuestPushManager.sync(store: self) }
    }

    private static func loadGuest() -> GuestInfo {
        guard
            let data = UserDefaults.standard.data(forKey: guestKey),
            let g = try? JSONDecoder().decode(GuestInfo.self, from: data)
        else { return GuestInfo() }
        return g
    }

    // The next stay whose checkout hasn't passed — shown prominently up top.
    var upcomingReservation: Reservation? {
        let today = Calendar.current.startOfDay(for: Date())
        let inactive = Set(["released", "cancelled", "canceled", "declined"])
        return reservations
            .filter {
                ($0.checkoutDate ?? .distantPast) >= today
                && !inactive.contains(($0.status ?? "confirmed").lowercased())
            }
            .sorted { ($0.checkinDate ?? .distantFuture) < ($1.checkinDate ?? .distantFuture) }
            .first
    }

    func add(_ hotel: Hotel) {
        hotels.removeAll { $0.hotelId == hotel.hotelId || $0.domain == hotel.domain }
        hotels.insert(hotel, at: 0)
        persistHotels()
    }

    /// Refreshes display data from the backend without replacing the guest's
    /// wallet ordering or locally retained stay history.
    @MainActor
    func refreshHotels() async {
        let identifiers = hotels.map(\.hotelId)
        for hotelId in identifiers {
            guard let data = try? await BookingAPI.hotel(hotelId),
                  let index = hotels.firstIndex(where: { $0.hotelId == hotelId }) else { continue }
            hotels[index].name = data.name
            hotels[index].location = data.guestelWalletSubtitle ?? hotels[index].location
            hotels[index].imageURL = data.walletImage ?? data.rooms.lazy.compactMap(\.image).first
        }
        persistHotels()
    }

    @MainActor
    func syncVerifiedWallet() async {
        await refreshVerifiedStays()
        guard let token = GuestIdentityAccess.token else { return }
        do {
            let wallet = try await BookingAPI.wallet(identityToken: token)
            apply(wallet)
        } catch {
            if case BookingAPI.Failure.message(let message) = error,
               message.localizedCaseInsensitiveContains("sign in") {
                GuestIdentityAccess.clear()
            }
        }
    }

    @MainActor
    private func refreshVerifiedStays() async {
        let tokens = reservations.compactMap(\.accessToken).filter { !$0.isEmpty }
        guard !tokens.isEmpty, let remote = try? await BookingAPI.refreshStays(reservationTokens: tokens) else { return }
        for stay in remote {
            ingest([[
                "code": stay.code,
                "hotelId": stay.hotelId,
                "checkin": stay.checkin,
                "checkout": stay.checkout,
                "status": stay.status ?? "",
                "roomName": stay.roomName ?? "",
                "accessToken": stay.reservationToken ?? "",
            ]])
        }
    }

    @MainActor
    func restoreWallet(identityToken: String) async throws {
        let wallet = try await BookingAPI.wallet(identityToken: identityToken)
        GuestIdentityAccess.save(identityToken)
        apply(wallet)
    }

    @MainActor
    private func apply(_ wallet: BookingAPI.WalletResponse) {
        saveGuest(GuestInfo(name: wallet.guest.name, email: wallet.guest.email, phone: wallet.guest.phone))
        for remote in wallet.hotels {
            add(Hotel(
                hotelId: remote.hotelId,
                domain: remote.domain,
                name: remote.name,
                location: remote.location,
                stays: wallet.reservations.filter { $0.hotelId == remote.hotelId }.count,
                lastStayed: "Direct booking",
                imageURL: remote.imageURL.flatMap { URL(string: $0, relativeTo: BookingAPI.base)?.absoluteURL }
            ))
        }
        for remote in wallet.reservations {
            ingest([[
                "code": remote.code,
                "hotelId": remote.hotelId,
                "checkin": remote.checkin,
                "checkout": remote.checkout,
                "status": remote.status ?? "",
                "roomName": remote.roomName ?? "",
                "accessToken": remote.reservationToken ?? "",
            ]])
        }
    }

    func reservation(for hotelId: String) -> Reservation? {
        reservations
            .filter { $0.hotelId == hotelId }
            .sorted {
                ($0.checkinDate ?? .distantPast) > ($1.checkinDate ?? .distantPast)
            }
            .first
    }

    func conversation(for reservation: Reservation) -> BookingAPI.ConversationPreview? {
        conversations.first { $0.hotelId == reservation.hotelId && $0.code == reservation.code }
    }

    @MainActor
    func refreshConversations() async {
        let tokens = reservations.compactMap(\.accessToken).filter { !$0.isEmpty }
        guard GuestIdentityAccess.token != nil || !tokens.isEmpty else {
            conversations = []
            return
        }
        if let rows = try? await BookingAPI.conversations(
            reservationTokens: tokens,
            identityToken: GuestIdentityAccess.token
        ) {
            conversations = rows
        }
    }

    @MainActor
    func markConversationRead(_ reservation: Reservation) {
        guard let index = conversations.firstIndex(where: {
            $0.hotelId == reservation.hotelId && $0.code == reservation.code
        }) else { return }
        let row = conversations[index]
        conversations[index] = BookingAPI.ConversationPreview(
            code: row.code,
            hotelId: row.hotelId,
            roomName: row.roomName,
            checkin: row.checkin,
            checkout: row.checkout,
            status: row.status,
            latestMessage: row.latestMessage,
            unreadCount: 0
        )
    }

    @MainActor
    func removeConversation(_ reservation: Reservation) {
        conversations.removeAll {
            $0.hotelId == reservation.hotelId && $0.code == reservation.code
        }
    }

    func ingest(_ stay: BookingAPI.WalletReservation) {
        ingest([[
            "code": stay.code,
            "hotelId": stay.hotelId,
            "checkin": stay.checkin,
            "checkout": stay.checkout,
            "status": stay.status ?? "",
            "roomName": stay.roomName ?? "",
            "accessToken": stay.reservationToken ?? "",
        ]])
    }

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
            let res = Reservation(
                code: code,
                hotelId: hotelId,
                checkin: checkin,
                checkout: checkout,
                status: item["status"] as? String,
                roomName: item["roomName"] as? String,
                accessToken: item["accessToken"] as? String ?? item["reservationToken"] as? String
            )
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

    private func persistHotels() {
        if let data = try? JSONEncoder().encode(hotels) {
            UserDefaults.standard.set(data, forKey: Self.hotelsKey)
        }
    }

    private static func loadHotels() -> [Hotel] {
        guard
            let data = UserDefaults.standard.data(forKey: hotelsKey),
            let decoded = try? JSONDecoder().decode([Hotel].self, from: data),
            !decoded.isEmpty
        else { return [] }
        return decoded
    }

    private static func loadReservations() -> [Reservation] {
        guard
            let data = UserDefaults.standard.data(forKey: reservationsKey),
            let decoded = try? JSONDecoder().decode([Reservation].self, from: data)
        else { return [] }
        return decoded
    }

    // Debug previews may opt into these explicitly; production never invents
    // hotels or stays for a real guest.
    static let sample: [Hotel] = [
        Hotel(hotelId: "hotel-9dbf11ec", domain: "studios17.mktel.co", name: "Studios 17", location: "Direct booking", stays: 0, lastStayed: "—"),
        Hotel(hotelId: "hotel-a39be0df", domain: "jacksinn.mktel.co", name: "Jack's Inn", location: "St. Croix, WI", stays: 2, lastStayed: "Aug 2026"),
        Hotel(hotelId: "marketel-review-inn", domain: "marketel-review-inn.mktel.co", name: "Marketel Review Inn", location: "Direct booking", stays: 1, lastStayed: "Jul 2026"),
    ]
}
