import SwiftUI
import UserNotifications

struct GuestelWelcomeView: View {
    @Environment(GuestStore.self) private var store
    let arrival: GuestelArrival
    let onDone: () -> Void
    @State private var authorizationStatus: UNAuthorizationStatus = .notDetermined

    private var pending: Bool {
        arrival.stay?.status?.lowercased() == "pending"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(arrival.stay == nil
                             ? "SAVED TO GUESTEL"
                             : (pending ? "YOUR REQUEST IS IN GUESTEL" : "YOUR STAY IS IN GUESTEL"))
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(0.8)
                            .foregroundStyle(Theme.green)
                        Text(arrival.hotel.name)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                    }
                    Spacer(minLength: 8)
                    propertyIcon
                }

                Text(arrival.stay == nil
                     ? "The property invited you to stay connected directly—without a booking-site middleman."
                     : (authorizationStatus == .denied
                        ? "Notifications are off in iOS Settings. Turn them on to receive confirmation and Front Desk replies."
                        : pending
                        ? "Turn on updates so Guestel can tell you when the property confirms and when Front Desk replies."
                        : "Your reservation, Front Desk messages, and future direct bookings now live together."))
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                if let stay = arrival.stay {
                    VStack(alignment: .leading, spacing: 11) {
                        HStack {
                            Label(
                                pending ? "Being reviewed" : "Confirmed",
                                systemImage: pending ? "clock.fill" : "checkmark.circle.fill"
                            )
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(pending ? Color.orange : Theme.green)
                            Spacer()
                            Text("#\(stay.code)")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        if let room = stay.roomName, !room.isEmpty {
                            stayLine("bed.double.fill", room)
                        }
                        if !stay.checkin.isEmpty, !stay.checkout.isEmpty {
                            stayLine("calendar", stayDateRange(stay))
                        }
                    }
                    .padding(16)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }

                VStack(spacing: 0) {
                    benefit("banknote.fill", arrival.stay == nil ? "Direct rates and property offers" : "Confirmation and stay updates")
                    Divider().padding(.leading, 44)
                    benefit("bubble.left.and.bubble.right.fill", "Message the Front Desk")
                    Divider().padding(.leading, 44)
                    benefit("creditcard.fill", "Faster direct rebooking")
                }
                .padding(.horizontal, 16)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                Button {
                    if arrival.stay == nil {
                        UserDefaults.standard.set(true, forKey: "guestel.notif.deals")
                    }
                    if authorizationStatus == .denied {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    } else {
                        GuestPushManager.requestAuthorization()
                    }
                    Task { await GuestPushManager.registerIfAuthorized(store: store) }
                    onDone()
                } label: {
                    Text(authorizationStatus == .denied
                         ? "Open Notification Settings"
                         : (arrival.stay == nil ? "Allow direct updates" : "Turn on booking updates"))
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(GuestelPressButtonStyle())

                Button("Not now", action: onDone)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity)
            }
            .padding(22)
        }
        .background(Theme.canvas)
        .task {
            authorizationStatus = await GuestPushManager.authorizationStatus()
            // The sheet can race with a system-settings change. If permission
            // is already active, don't make a repeat guest dismiss onboarding.
            if GuestPushManager.isAuthorized(authorizationStatus) {
                await GuestPushManager.registerIfAuthorized(store: store)
                onDone()
            }
        }
    }

    private var propertyIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Theme.green.opacity(0.12))
            if let url = arrival.hotel.imageURL {
                CachedRemoteImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: { initial }
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            } else {
                initial
            }
        }
        .frame(width: 58, height: 58)
    }

    private var initial: some View {
        Text(String(arrival.hotel.name.first ?? "H"))
            .font(.system(size: 22, weight: .bold))
            .foregroundStyle(Theme.green)
    }

    private func benefit(_ symbol: String, _ label: String) -> some View {
        HStack(spacing: 13) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.green)
                .frame(width: 28)
            Text(label)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Spacer()
            Image(systemName: "checkmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.green)
        }
        .padding(.vertical, 13)
    }

    private func stayLine(_ symbol: String, _ value: String) -> some View {
        HStack(spacing: 9) {
            Image(systemName: symbol)
                .foregroundStyle(Theme.green)
                .frame(width: 20)
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.ink)
        }
    }

    private func stayDateRange(_ stay: Reservation) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d, yyyy"
        guard let checkin = stay.checkinDate, let checkout = stay.checkoutDate else {
            return "\(stay.checkin) – \(stay.checkout)"
        }
        return "\(formatter.string(from: checkin)) – \(formatter.string(from: checkout))"
    }
}
