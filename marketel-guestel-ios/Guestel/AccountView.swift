import SwiftUI

struct AccountView: View {
    @Environment(GuestStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    // Big, left-aligned name — no profile picture.
                    VStack(alignment: .leading, spacing: 5) {
                        Text(store.guestName)
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                        if !store.guest.email.isEmpty {
                            Text(store.guest.email)
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.inkSoft)
                        } else {
                            Text("Finish setting up your profile")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    VStack(spacing: 14) {
                        NavigationLink { RestoreStaysView() } label: {
                            AccountRow(icon: "arrow.clockwise.icloud.fill", title: "Restore stays",
                                       subtitle: "Bring bookings onto this phone")
                        }
                        NavigationLink { PaymentMethodsView() } label: {
                            AccountRow(icon: "creditcard.fill", title: "Payment methods",
                                       subtitle: "Save a card for one-tap booking")
                        }
                        NavigationLink { PersonalInfoView() } label: {
                            AccountRow(icon: "person.fill", title: "Personal info",
                                       subtitle: "Name, email, phone")
                        }
                        NavigationLink { NotificationsView() } label: {
                            AccountRow(icon: "bell.fill", title: "Notifications",
                                       subtitle: "Stay, message, and property updates")
                        }
                        NavigationLink { HelpView() } label: {
                            AccountRow(icon: "questionmark.circle.fill", title: "Help",
                                       subtitle: "FAQs and contact")
                        }
                        NavigationLink { GuestPrivacyView() } label: {
                            AccountRow(icon: "hand.raised.fill", title: "Privacy & this device",
                                       subtitle: "Notifications and saved data")
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 44)
            }
            .background(Theme.canvas)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// Taller, card-style rows with a filled icon tile — bigger tap targets per design.
private struct AccountRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .fill(Theme.green.opacity(0.12))
                    .frame(width: 46, height: 46)
                Image(systemName: icon)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(Theme.green)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.inkSoft.opacity(0.6))
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.05), radius: 8, x: 0, y: 3)
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
