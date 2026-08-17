import Capacitor
import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

// Bridges ActivityKit's token streams to the web layer.
//
// Deliberately thin: the plugin does not call the backend itself. It emits
// tokens as events and lets JS register them through the existing api() helper,
// which already carries auth, hotel scoping and the native origin rewrite.
// Duplicating that in Swift would be a second auth path to keep in sync.
//
// It does write credentials into the App Group, because the Lock Screen App
// Intents run in the widget process and cannot reach the webview.

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {

    private static let appGroup = "group.com.bookmarketel.frontdesk"
    private var observing = false

    /// Capability probe. Push-to-start is the one that matters: without it a
    /// card can only be raised while the app is already open, which defeats it.
    @objc func getCapabilities(_ call: CAPPluginCall) {
        var supported = false
        var pushToStart = false
        var enabled = false

        if #available(iOS 16.1, *) {
            supported = true
            enabled = ActivityAuthorizationInfo().areActivitiesEnabled
            if #available(iOS 17.2, *) { pushToStart = true }
        }
        call.resolve([
            "supported": supported,
            "pushToStart": pushToStart,
            "enabled": enabled,
        ])
    }

    /// Mirror the signed-in session into the App Group so Lock Screen buttons
    /// can act without opening the app.
    @objc func setCredentials(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App Group unavailable")
            return
        }
        if let token = call.getString("crmToken") { defaults.set(token, forKey: "crmToken") }
        if let hotelId = call.getString("hotelId") { defaults.set(hotelId, forKey: "hotelId") }
        if let origin = call.getString("backendOrigin") { defaults.set(origin, forKey: "backendOrigin") }
        call.resolve()
    }

    @objc func clearCredentials(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.resolve()
            return
        }
        ["crmToken", "hotelId"].forEach { defaults.removeObject(forKey: $0) }
        call.resolve()
    }

    /// Start observing token streams. Safe to call repeatedly.
    @objc func startObserving(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["observing": false])
            return
        }
        guard !observing else {
            call.resolve(["observing": true])
            return
        }
        observing = true

        // Push-to-start token (iOS 17.2+): one per install, re-issued by iOS.
        if #available(iOS 17.2, *) {
            Task { [weak self] in
                for await tokenData in Activity<BookingDecisionAttributes>.pushToStartTokenUpdates {
                    let token = tokenData.map { String(format: "%02x", $0) }.joined()
                    self?.notifyListeners("pushToStartToken", data: ["token": token])
                }
            }
        }

        // Existing activities plus any that start later. Each carries its own
        // update token, which is the only way to end that specific card.
        Task { [weak self] in
            guard let self else { return }
            for activity in Activity<BookingDecisionAttributes>.activities {
                self.observe(activity: activity)
            }
            for await activity in Activity<BookingDecisionAttributes>.activityUpdates {
                self.observe(activity: activity)
            }
        }

        call.resolve(["observing": true])
    }

    @available(iOS 16.1, *)
    private func observe(activity: Activity<BookingDecisionAttributes>) {
        Task { [weak self] in
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                self?.notifyListeners("activityToken", data: [
                    "activityId": activity.id,
                    "bookingId": activity.attributes.bookingId,
                    "token": token,
                ])
            }
        }
        Task { [weak self] in
            for await state in activity.activityStateUpdates {
                if state == .dismissed || state == .ended {
                    self?.notifyListeners("activityEnded", data: [
                        "activityId": activity.id,
                        "bookingId": activity.attributes.bookingId,
                    ])
                }
            }
        }
    }

    /// End every running card. Used on sign-out so a card cannot outlive the
    /// session that is allowed to act on it.
    @objc func endAll(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<BookingDecisionAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
