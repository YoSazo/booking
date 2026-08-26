import AppIntents
import Foundation
import ActivityKit

// One-tap Keep / Release straight from the Lock Screen (iOS 17+).
//
// These run inside the widget extension, which has no access to the webview's
// localStorage, so credentials are handed over through an App Group that the
// app writes on login. Both targets need the same App Group entitlement —
// see LIVE-ACTIVITIES.md.
//
// The intent calls the same endpoint the in-app buttons use, so a Lock Screen
// tap is indistinguishable from any other decision: same idempotency, same
// terminal state, same guest email. It deliberately does not mutate anything
// locally — the activity is ended by the server push that follows.

@available(iOS 17.0, *)
enum MarketelSharedStore {
    /// Must match the App Group id configured on both targets.
    static let appGroup = "group.com.bookmarketel.frontdesk"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static var backendOrigin: String {
        defaults?.string(forKey: "backendOrigin") ?? "https://guest-lodge-backend.onrender.com"
    }
    static var crmToken: String? { defaults?.string(forKey: "crmToken") }
    static var hotelId: String? { defaults?.string(forKey: "hotelId") }
}

@available(iOS 17.0, *)
enum BookingDecisionError: Error, CustomLocalizedStringResourceConvertible {
    case notSignedIn
    case requestFailed(String)

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notSignedIn:
            return "Open Marketel and sign in first."
        case .requestFailed(let message):
            return "\(message)"
        }
    }
}

@available(iOS 17.0, *)
struct BookingDecisionService {
    static func submit(bookingId: String, action: String) async throws -> String {
        guard
            let token = MarketelSharedStore.crmToken, !token.isEmpty,
            let hotelId = MarketelSharedStore.hotelId, !hotelId.isEmpty,
            var components = URLComponents(
                string: "\(MarketelSharedStore.backendOrigin)/api/crm/bookings/\(bookingId)/approval"
            )
        else { throw BookingDecisionError.notSignedIn }

        components.queryItems = [URLQueryItem(name: "hotelId", value: hotelId)]
        guard let url = components.url else { throw BookingDecisionError.notSignedIn }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(token, forHTTPHeaderField: "x-crm-token")
        // The server gates native routes on this header; without it the request
        // is treated as a browser session and rejected.
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        request.httpBody = try JSONSerialization.data(
            withJSONObject: ["action": action, "hotelId": hotelId]
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]

        guard status == 200, (json?["success"] as? Bool) == true else {
            throw BookingDecisionError.requestFailed(
                (json?["message"] as? String) ?? "Could not reach Marketel."
            )
        }

        // Pressing an old card after the sweep already ran must not read as a
        // second change.
        if (json?["alreadyDecided"] as? Bool) == true {
            return "Already handled."
        }
        return action == "confirm" ? "Booking kept." : "Request released."
    }
}

// A push-to-start card is launched while the app is closed, so its update token
// is never registered and the server has no way to end it. The decision runs
// here in the widget process, which can reach the activity directly, so end it
// locally the moment the owner taps.
@available(iOS 17.0, *)
private func endLiveActivity(bookingId: String) async {
    for activity in Activity<BookingDecisionAttributes>.activities
    where activity.attributes.bookingId == bookingId {
        await activity.end(nil, dismissalPolicy: .immediate)
    }
}

@available(iOS 17.0, *)
struct KeepBookingIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Keep booking"
    static var description = IntentDescription("Keep this direct booking and hold the room.")

    @Parameter(title: "Booking")
    var bookingId: String

    init() {}
    init(bookingId: String) { self.bookingId = bookingId }

    func perform() async throws -> some IntentResult {
        _ = try await BookingDecisionService.submit(bookingId: bookingId, action: "confirm")
        await endLiveActivity(bookingId: bookingId)
        return .result()
    }
}

@available(iOS 17.0, *)
struct ReleaseBookingIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Release request"
    static var description = IntentDescription("Release this request and return the room to availability.")

    @Parameter(title: "Booking")
    var bookingId: String

    init() {}
    init(bookingId: String) { self.bookingId = bookingId }

    func perform() async throws -> some IntentResult {
        _ = try await BookingDecisionService.submit(bookingId: bookingId, action: "release")
        await endLiveActivity(bookingId: bookingId)
        return .result()
    }
}
