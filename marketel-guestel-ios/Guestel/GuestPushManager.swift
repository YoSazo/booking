import Foundation
import UIKit
import UserNotifications

extension Notification.Name {
    static let guestelDeviceTokenChanged = Notification.Name("guestelDeviceTokenChanged")
    static let guestelOpenMessages = Notification.Name("guestelOpenMessages")
    static let guestelOpenHotels = Notification.Name("guestelOpenHotels")
    static let guestelRefreshData = Notification.Name("guestelRefreshData")
}

final class GuestelAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        // iOS can retain the badge/delivered alerts for the same bundle across
        // a reinstall, and every Guestel push intentionally raises the badge.
        // The app is now open, so any old attention marker is stale.
        center.removeAllDeliveredNotifications()
        Self.clearBadge(application)
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        Self.clearBadge(application)
        NotificationCenter.default.post(name: .guestelRefreshData, object: nil)
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
        Self.captureBookingStatus(notification.request.content.userInfo)
        NotificationCenter.default.post(
            name: .guestelRefreshData,
            object: nil,
            userInfo: notification.request.content.userInfo
        )
        // Keep the useful banner and sound while Guestel is visible, but don't
        // leave a red badge for an alert the guest is already looking at.
        return [.banner, .sound]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        Self.clearBadge(UIApplication.shared)
        Self.captureBookingStatus(response.notification.request.content.userInfo)
        Self.route(response.notification.request.content.userInfo)
        NotificationCenter.default.post(
            name: .guestelRefreshData,
            object: nil,
            userInfo: response.notification.request.content.userInfo
        )
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        let changed = Self.captureBookingStatus(userInfo)
        NotificationCenter.default.post(name: .guestelRefreshData, object: nil, userInfo: userInfo)
        completionHandler(changed ? .newData : .noData)
    }

    private static func clearBadge(_ application: UIApplication) {
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0)
        } else {
            application.applicationIconBadgeNumber = 0
        }
    }

    static func route(_ userInfo: [AnyHashable: Any]) {
        let nested = userInfo["data"] as? [String: Any]
        let hotelId = (userInfo["hotelId"] as? String) ?? nested?["hotelId"] as? String ?? ""
        let code = nested?["reservationCode"] as? String ?? ""
        let type = nested?["type"] as? String ?? ""
        guard !hotelId.isEmpty else { return }
        if type == "guest_broadcast" {
            GuestHotelRoute.save(hotelId: hotelId)
            NotificationCenter.default.post(
                name: .guestelOpenHotels,
                object: nil,
                userInfo: ["hotelId": hotelId]
            )
            return
        }
        GuestMessageRoute.save(hotelId: hotelId, code: code)
        NotificationCenter.default.post(
            name: .guestelOpenMessages,
            object: nil,
            userInfo: ["hotelId": hotelId, "code": code]
        )
    }

    @discardableResult
    static func captureBookingStatus(_ userInfo: [AnyHashable: Any]) -> Bool {
        let nested = userInfo["data"] as? [AnyHashable: Any]
        guard (nested?["type"] as? String) == "guest_booking_status" else { return false }
        let hotelId = (userInfo["hotelId"] as? String) ?? nested?["hotelId"] as? String ?? ""
        let code = nested?["reservationCode"] as? String ?? ""
        let status = nested?["status"] as? String ?? ""
        return GuestBookingStatusInbox.save(hotelId: hotelId, code: code, status: status)
    }
}

enum GuestBookingStatusInbox {
    struct Update: Codable, Hashable {
        let hotelId: String
        let code: String
        let status: String
    }

    private static let key = "guestel.pendingBookingStatuses.v1"

    @discardableResult
    static func save(hotelId: String, code: String, status: String) -> Bool {
        let update = Update(
            hotelId: hotelId.trimmingCharacters(in: .whitespacesAndNewlines),
            code: code.trimmingCharacters(in: .whitespacesAndNewlines),
            status: status.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        )
        guard !update.hotelId.isEmpty, !update.code.isEmpty, !update.status.isEmpty else { return false }
        var updates = pending
        updates.removeAll { $0.hotelId == update.hotelId && $0.code == update.code }
        updates.append(update)
        if let data = try? JSONEncoder().encode(updates) {
            UserDefaults.standard.set(data, forKey: key)
        }
        return true
    }

    static var pending: [Update] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let updates = try? JSONDecoder().decode([Update].self, from: data)
        else { return [] }
        return updates
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}

enum GuestHotelRoute {
    private static let hotelKey = "guestel.pendingHotel.hotel"

    static func save(hotelId: String) {
        UserDefaults.standard.set(hotelId, forKey: hotelKey)
    }

    static var pendingHotelId: String? {
        guard let hotelId = UserDefaults.standard.string(forKey: hotelKey), !hotelId.isEmpty else { return nil }
        return hotelId
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: hotelKey)
    }
}

enum GuestMessageRoute {
    private static let hotelKey = "guestel.pendingMessage.hotel"
    private static let codeKey = "guestel.pendingMessage.code"

    static func save(hotelId: String, code: String) {
        UserDefaults.standard.set(hotelId, forKey: hotelKey)
        UserDefaults.standard.set(code, forKey: codeKey)
    }

    static var pending: (hotelId: String, code: String)? {
        guard let hotelId = UserDefaults.standard.string(forKey: hotelKey), !hotelId.isEmpty else { return nil }
        return (hotelId, UserDefaults.standard.string(forKey: codeKey) ?? "")
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: hotelKey)
        UserDefaults.standard.removeObject(forKey: codeKey)
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
        let hotelIds = Array(Set(store.hotels.map(\.hotelId).filter { !$0.isEmpty }))
        guard GuestIdentityAccess.token != nil || !reservationTokens.isEmpty || !hotelIds.isEmpty else { return }
        try? await BookingAPI.registerPush(
            deviceToken: token,
            environment: "production",
            reservationTokens: reservationTokens,
            hotelIds: hotelIds,
            identityToken: GuestIdentityAccess.token,
            preferences: [
                "stayUpdates": stayUpdates,
                "messages": messages,
                "propertyUpdates": defaults.bool(forKey: "guestel.notif.deals"),
            ]
        )
    }

    @MainActor
    static func unregister(store: GuestStore) async {
        guard let token = UserDefaults.standard.string(forKey: deviceTokenKey), !token.isEmpty else { return }
        let reservationTokens = store.reservations.compactMap(\.accessToken).filter { !$0.isEmpty }
        let hotelIds = Array(Set(store.hotels.map(\.hotelId).filter { !$0.isEmpty }))
        try? await BookingAPI.unregisterPush(
            deviceToken: token,
            reservationTokens: reservationTokens,
            hotelIds: hotelIds,
            identityToken: GuestIdentityAccess.token
        )
        UserDefaults.standard.removeObject(forKey: deviceTokenKey)
        UIApplication.shared.unregisterForRemoteNotifications()
    }

    @MainActor
    static func clearLocalRegistration() {
        UserDefaults.standard.removeObject(forKey: deviceTokenKey)
        UIApplication.shared.unregisterForRemoteNotifications()
    }
}
