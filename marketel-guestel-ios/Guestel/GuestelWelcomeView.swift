import SwiftUI

struct GuestelWelcomeView: View {
    let arrival: GuestelArrival
    let onDone: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 14) {
                    propertyIcon
                    VStack(alignment: .leading, spacing: 4) {
                        Text(arrival.stay == nil ? "SAVED TO GUESTEL" : "YOUR STAY CAME WITH YOU")
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(0.8)
                            .foregroundStyle(Theme.green)
                        Text(arrival.hotel.name)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                    }
                }

                Text(arrival.stay == nil
                     ? "Book direct from your hotel wallet and return without searching again."
                     : "Your reservation, Front Desk messages, and future direct bookings now live together.")
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(spacing: 0) {
                    benefit("bell.badge.fill", "Stay updates on your phone")
                    Divider().padding(.leading, 44)
                    benefit("bubble.left.and.bubble.right.fill", "Message the Front Desk")
                    Divider().padding(.leading, 44)
                    benefit("creditcard.fill", "Faster direct rebooking")
                }
                .padding(.horizontal, 16)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                Button {
                    if arrival.stay != nil { GuestPushManager.requestAuthorization() }
                    onDone()
                } label: {
                    Text(arrival.stay == nil ? "View in Guestel" : "Turn on stay updates")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                if arrival.stay != nil {
                    Button("Not now", action: onDone)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(22)
        }
        .background(Theme.canvas)
    }

    private var propertyIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Theme.green.opacity(0.12))
            if let url = arrival.hotel.imageURL {
                AsyncImage(url: url) { image in
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
}
