import SwiftUI
import Combine
import UIKit

enum MarketelNativeTab: String {
    case settings
    case bookings
    case availability
    case guestApp
}

enum MarketelNativeTheme {
    static let green = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
    static let greenDark = Color(red: 36 / 255, green: 95 / 255, blue: 70 / 255)
    static let mint = Color(red: 232 / 255, green: 245 / 255, blue: 238 / 255)
    static let canvas = Color(red: 239 / 255, green: 244 / 255, blue: 240 / 255)
    static let card = Color(uiColor: .secondarySystemBackground)
    static let ink = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
    static let inkSoft = Color(red: 75 / 255, green: 93 / 255, blue: 82 / 255)
    static let border = Color(red: 216 / 255, green: 228 / 255, blue: 220 / 255)
    static let red = Color(red: 196 / 255, green: 54 / 255, blue: 54 / 255)
    static let amber = Color(red: 216 / 255, green: 145 / 255, blue: 32 / 255)
}

@MainActor
final class MarketelNativeSession: ObservableObject {
    @Published var hotelId = ""
    @Published var hotelName = "Front Desk"
    @Published var domain = ""
    @Published var authToken = ""
    @Published var appIconURL = ""
    @Published var walletImageURL = ""
    @Published var walletSubtitle = ""
    @Published var isManualPMS = true
    @Published var currentTab: MarketelNativeTab = .settings
    @Published var refreshGeneration = 0

    var isReady: Bool { !hotelId.isEmpty && !authToken.isEmpty }

    func configure(
        hotelId: String,
        hotelName: String,
        domain: String,
        authToken: String,
        appIconURL: String,
        walletImageURL: String,
        walletSubtitle: String,
        isManualPMS: Bool
    ) {
        let propertyChanged = self.hotelId != hotelId || self.authToken != authToken
        self.hotelId = hotelId
        self.hotelName = hotelName.isEmpty ? "Front Desk" : hotelName
        self.domain = domain
        self.authToken = authToken
        self.appIconURL = appIconURL
        self.walletImageURL = walletImageURL
        self.walletSubtitle = walletSubtitle
        self.isManualPMS = isManualPMS
        if propertyChanged { refreshGeneration &+= 1 }
    }

    func requestRefresh() {
        refreshGeneration &+= 1
    }

    func clear() {
        hotelId = ""
        hotelName = "Front Desk"
        domain = ""
        authToken = ""
        appIconURL = ""
        walletImageURL = ""
        walletSubtitle = ""
        currentTab = .settings
        refreshGeneration &+= 1
    }
}

enum MarketelNativeAPIError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let message): return message
        }
    }
}

struct MarketelNativeAPI {
    let origin: URL
    let hotelId: String
    let authToken: String

    private func endpoint(_ path: String) throws -> URL {
        guard let base = URL(string: path, relativeTo: origin)?.absoluteURL,
              var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else {
            throw MarketelNativeAPIError.message("Could not create the request.")
        }
        var items = components.queryItems ?? []
        items.removeAll { $0.name == "hotelId" }
        items.append(URLQueryItem(name: "hotelId", value: hotelId))
        components.queryItems = items
        guard let url = components.url else {
            throw MarketelNativeAPIError.message("Could not create the request.")
        }
        return url
    }

    func request<Response: Decodable>(
        _ path: String,
        method: String = "GET",
        body: [String: Any]? = nil
    ) async throws -> Response {
        var request = URLRequest(url: try endpoint(path))
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(authToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.validate(response: response, data: data)
        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw MarketelNativeAPIError.message("Front Desk returned an unreadable response.")
        }
    }

    func uploadImage(_ data: Data, filename: String = "guestel-cover.jpg") async throws -> String {
        let boundary = "MarketelBoundary\(UUID().uuidString)"
        var request = URLRequest(url: try endpoint("/api/crm/guestel-wallet-image"))
        request.httpMethod = "POST"
        request.timeoutInterval = 45
        request.setValue(authToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var payload = Data()
        payload.append("--\(boundary)\r\n".data(using: .utf8)!)
        payload.append("Content-Disposition: form-data; name=\"image\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        payload.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        payload.append(data)
        payload.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = payload
        let (responseData, response) = try await URLSession.shared.data(for: request)
        try Self.validate(response: response, data: responseData)
        let result = try JSONDecoder().decode(MarketelWalletImageEnvelope.self, from: responseData)
        guard result.success, let imageURL = result.imageUrl, !imageURL.isEmpty else {
            throw MarketelNativeAPIError.message(result.message ?? "Could not update the Guestel cover.")
        }
        return imageURL
    }

    private static func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw MarketelNativeAPIError.message("Front Desk did not return a response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = object?["message"] as? String
            if http.statusCode == 401 || http.statusCode == 403 {
                throw MarketelNativeAPIError.message(message ?? "Your Front Desk session expired. Sign in again.")
            }
            throw MarketelNativeAPIError.message(message ?? "Front Desk could not complete that request.")
        }
    }
}

// MARK: - Shared API models

struct MarketelEmptyEnvelope: Decodable { let success: Bool; let message: String? }

struct MarketelBookingEnvelope: Decodable {
    let success: Bool
    let data: [MarketelBooking]
    let message: String?
}

struct MarketelBooking: Decodable, Identifiable, Equatable {
    let id: String
    let createdAt: String?
    let guestFirstName: String?
    let guestLastName: String?
    let guestEmail: String?
    let guestPhone: String?
    let roomName: String?
    let checkinDate: String?
    let checkoutDate: String?
    let nights: Int?
    let grandTotal: Double?
    let bookingType: String?
    let callStatus: String?
    let notes: String?
    let status: String?
    let pendingUntil: String?
    let approvalNoResponseAction: String?
    let approvalOutcome: String?
    let fulfillmentStatus: String?
    let fulfillmentLastError: String?
    let fulfillmentUpdatedAt: String?
    let ownerReviewStatus: String?
    let ownerReviewedAt: String?
    let ownerReviewReminderCount: Int?
    let ownerReviewNextReminderAt: String?
    let ourReservationCode: String?
    let pmsConfirmationCode: String?
    let paymentDeclined: Bool?

    var guestName: String {
        let joined = [guestFirstName, guestLastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return joined.isEmpty ? "Guest" : joined
    }
    var normalizedStatus: String { (status ?? "confirmed").lowercased() }
    var isPending: Bool { normalizedStatus == "pending" }
    var isManual: Bool { (bookingType ?? "").lowercased() == "manual" }
    var reservationCode: String {
        let pms = pmsConfirmationCode?.marketelTrimmed ?? ""
        if !pms.isEmpty { return pms }
        return ourReservationCode?.marketelTrimmed ?? ""
    }
}

struct MarketelAvailabilityEnvelope: Decodable {
    let success: Bool
    let data: MarketelAvailabilityData
    let message: String?
}

struct MarketelAvailabilityData: Decodable, Equatable {
    let rooms: [MarketelManualRoom]
    let overrides: [String: MarketelAvailabilityOverride]

    private enum CodingKeys: String, CodingKey { case rooms, overrides, availability }

    init(rooms: [MarketelManualRoom], overrides: [String: MarketelAvailabilityOverride]) {
        self.rooms = rooms
        self.overrides = overrides
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        rooms = try container.decodeIfPresent([MarketelManualRoom].self, forKey: .rooms) ?? []
        let current = try container.decodeIfPresent([String: MarketelAvailabilityOverride].self, forKey: .overrides)
        let legacy = try container.decodeIfPresent([String: MarketelAvailabilityOverride].self, forKey: .availability)
        overrides = current ?? legacy ?? [:]
    }
}

struct MarketelManualRoom: Decodable, Identifiable, Equatable {
    var id: String { name }
    let name: String
    let totalUnits: Int
}

struct MarketelAvailabilityOverride: Decodable, Equatable {
    let availableUnits: Int?
    let closed: Bool
    let updatedAt: String?
}

struct MarketelRoomsEnvelope: Decodable {
    let success: Bool
    let rooms: [MarketelRoom]
    let rates: MarketelRates?
    let message: String?
}

struct MarketelRoom: Decodable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String?
    let amenities: String?
    let maxOccupancy: Int?
    let totalUnits: Int?
    let imageUrl: String?
    let images: [MarketelRoomImage]?
}

struct MarketelRoomImage: Decodable, Identifiable, Equatable {
    let id: String
    let url: String
}

struct MarketelRates: Decodable, Equatable {
    let nightly: Double
    let weekly: Double
    let monthly: Double
    let taxRate: Double?
}

struct MarketelRevenueEnvelope: Decodable {
    let success: Bool
    let data: MarketelRevenue?
    let message: String?
}

struct MarketelRevenue: Decodable, Equatable {
    let period: String?
    let range: MarketelRevenueRange?
    let rev: Double
    let bookings: Int
    let avg: Double?
    let rooms: [MarketelRevenueRoom]
}

struct MarketelRevenueRange: Decodable, Equatable {
    let start: String?
    let end: String?
    let label: String?
}

struct MarketelRevenueRoom: Decodable, Identifiable, Equatable {
    var id: String { name }
    let name: String
    let rev: Double
}

struct MarketelPropertiesEnvelope: Decodable {
    let success: Bool
    let properties: [MarketelProperty]
    let message: String?
}

struct MarketelProperty: Decodable, Identifiable, Equatable {
    let id: String
    let name: String
    let appIconUrl: String?
    let domain: String?
}

struct MarketelConflictsEnvelope: Decodable {
    let success: Bool
    let conflicts: [MarketelConflict]
}

struct MarketelConflict: Decodable, Identifiable {
    var id: String { "\(roomName)-\(date)" }
    let roomName: String
    let date: String
    let totalUnits: Int?
    let liveBookings: Int?
}

struct MarketelGuestStatsEnvelope: Decodable {
    let success: Bool
    let periodDays: Int?
    let installedBookings: Int?
    let recentBookings: Int?
    let installRatePercent: Int?
    let guestPushSubscribers: Int?
    let guestelSavedDevices: Int?
    let guestelBroadcastSubscribers: Int?
    let message: String?
}

struct MarketelReviewSettingsEnvelope: Decodable {
    let success: Bool
    let data: MarketelReviewSettings?
    let message: String?
}

struct MarketelReviewSettings: Decodable {
    let reminderMinutes: Int
    let maxReminders: Int?
}

struct MarketelBroadcastEnvelope: Decodable {
    let success: Bool
    let sent: Int?
    let message: String?
}

struct MarketelWalletCardEnvelope: Decodable {
    let success: Bool
    let subtitle: String?
    let fallbackSubtitle: String?
    let imageUrl: String?
    let message: String?
}

struct MarketelWalletImageEnvelope: Decodable {
    let success: Bool
    let imageUrl: String?
    let message: String?
}

struct MarketelHandoffEnvelope: Decodable {
    let success: Bool
    let handoffToken: String?
    let expiresInHours: Int?
    let message: String?
}

struct MarketelActionEnvelope: Decodable {
    let success: Bool
    let message: String?
}

// MARK: - Native content host

struct MarketelNativeCoreView: View {
    @ObservedObject var session: MarketelNativeSession
    let origin: URL
    let onDataChanged: () -> Void
    let onOpenMessages: () -> Void
    let onAssistantVisibility: (Bool) -> Void
    let onOpenWebFallback: () -> Void

    var body: some View {
        Group {
            if !session.isReady {
                ProgressView("Connecting to property…")
                    .tint(MarketelNativeTheme.green)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                switch session.currentTab {
                case .bookings:
                    MarketelNativeBookingsView(
                        session: session,
                        origin: origin,
                        onDataChanged: onDataChanged,
                        onAssistantVisibility: onAssistantVisibility,
                        onOpenWebFallback: onOpenWebFallback
                    )
                    .id("bookings-\(session.hotelId)")
                case .availability:
                    MarketelNativeAvailabilityView(
                        session: session,
                        origin: origin,
                        onDataChanged: onDataChanged,
                        onOpenWebFallback: onOpenWebFallback
                    )
                    .id("availability-\(session.hotelId)")
                case .guestApp:
                    MarketelNativeGuestAppView(
                        session: session,
                        origin: origin,
                        onDataChanged: onDataChanged,
                        onOpenMessages: onOpenMessages,
                        onOpenWebFallback: onOpenWebFallback
                    )
                    .id("guest-app-\(session.hotelId)")
                case .settings:
                    EmptyView()
                }
            }
        }
        .background(MarketelNativeTheme.canvas.ignoresSafeArea())
        .tint(MarketelNativeTheme.green)
    }
}

struct MarketelNativeErrorView: View {
    let message: String
    let retry: () -> Void
    let openWeb: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(MarketelNativeTheme.green)
            Text("Couldn’t load Front Desk")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(MarketelNativeTheme.ink)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(MarketelNativeTheme.inkSoft)
                .multilineTextAlignment(.center)
            Button("Try again", action: retry)
                .buttonStyle(MarketelPrimaryButtonStyle())
            Button("Open web Front Desk", action: openWeb)
                .font(.system(size: 14, weight: .semibold))
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MarketelPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(MarketelNativeTheme.green.opacity(configuration.isPressed ? 0.82 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
    }
}

extension String {
    var marketelTrimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

enum MarketelNativeFormat {
    static let iso = ISO8601DateFormatter()
    static let apiDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
    static let shortDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
    static let money: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static func date(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        if raw.count >= 10 { return apiDay.date(from: String(raw.prefix(10))) }
        if let value = iso.date(from: raw) { return value }
        return nil
    }

    static func instant(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        return iso.date(from: raw)
    }

    static func day(_ raw: String?) -> String {
        guard let date = date(raw) else { return "—" }
        return shortDate.string(from: date)
    }

    static func currency(_ value: Double?) -> String {
        money.string(from: NSNumber(value: value ?? 0)) ?? "$0"
    }

    static func url(_ raw: String?, relativeTo origin: URL) -> URL? {
        let clean = raw?.marketelTrimmed ?? ""
        guard !clean.isEmpty else { return nil }
        if let absolute = URL(string: clean), absolute.scheme != nil { return absolute }
        return URL(string: clean, relativeTo: origin)?.absoluteURL
    }
}
