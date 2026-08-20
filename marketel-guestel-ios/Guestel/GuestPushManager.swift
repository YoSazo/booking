import Foundation
import UIKit
import UserNotifications

extension Notification.Name {
    static let guestelDeviceTokenChanged = Notification.Name("guestelDeviceTokenChanged")
    static let guestelOpenMessages = Notification.Name("guestelOpenMessages")
}

final class GuestelAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: GuestPushManager.deviceTokenKey)
        NotificationCenter.default.post(name: .guestelDeviceTokenChanged, object: token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Guestel APNs registration failed: \(error.localizedDescription)")
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        Self.route(response.notification.request.content.userInfo)
    }

    static func route(_ userInfo: [AnyHashable: Any]) {
        let nested = userInfo["data"] as? [String: Any]
        let hotelId = (userInfo["hotelId"] as? String) ?? nested?["hotelId"] as? String ?? ""
        let code = nested?["reservationCode"] as? String ?? ""
        guard !hotelId.isEmpty else { return }
        NotificationCenter.default.post(
            name: .guestelOpenMessages,
            object: nil,
            userInfo: ["hotelId": hotelId, "code": code]
        )
    }
}

enum GuestPushManager {
    static let deviceTokenKey = "guestel.apns.deviceToken"

    static func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    @MainActor
    static func registerIfAuthorized(store: GuestStore) async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
        await sync(store: store)
    }

    @MainActor
    static func sync(store: GuestStore) async {
        guard let token = UserDefaults.standard.string(forKey: deviceTokenKey), !token.isEmpty else { return }
        let defaults = UserDefaults.standard
        let stayUpdates = defaults.object(forKey: "guestel.notif.stayUpdates") == nil
            ? true : defaults.bool(forKey: "guestel.notif.stayUpdates")
        let messages = defaults.object(forKey: "guestel.notif.messages") == nil
            ? true : defaults.bool(forKey: "guestel.notif.messages")
        let reservationTokens = store.reservations.compactMap(\.accessToken).filter { !$0.isEmpty }
        guard GuestIdentityAccess.token != nil || !reservationTokens.isEmpty else { return }
        try? await BookingAPI.registerPush(
            deviceToken: token,
            environment: "production",
            reservationTokens: reservationTokens,
            identityToken: GuestIdentityAccess.token,
            preferences: [
                "stayUpdates": stayUpdates,
                "messages": messages,
                "deals": defaults.bool(forKey: "guestel.notif.deals"),
            ]
        )
    }

    @MainActor
    static func unregister(store: GuestStore) async {
        guard let token = UserDefaults.standard.string(forKey: deviceTokenKey), !token.isEmpty else { return }
        let reservationTokens = store.reservations.compactMap(\.accessToken).filter { !$0.isEmpty }
        try? await BookingAPI.unregisterPush(
            deviceToken: token,
            reservationTokens: reservationTokens,
            identityToken: GuestIdentityAccess.token
        )
        UserDefaults.standard.removeObject(forKey: deviceTokenKey)
        UIApplication.shared.unregisterForRemoteNotifications()
    }
}
