import SwiftUI

struct AccountView: View {
    @Environment(GuestStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 10) {
                        ZStack {
                            Circle().fill(Theme.green.opacity(0.12)).frame(width: 84, height: 84)
                            Text(initials)
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(Theme.green)
                        }
                        Text(store.guestName)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(Theme.ink)
                    }
                    .padding(.top, 12)

                    VStack(spacing: 0) {
                        AccountRow(icon: "creditcard", title: "Payment methods", subtitle: "Add a card for one-tap booking")
                        Divider().padding(.leading, 58)
                        AccountRow(icon: "person", title: "Personal info", subtitle: nil)
                        Divider().padding(.leading, 58)
                        AccountRow(icon: "bell", title: "Notifications", subtitle: nil)
                        Divider().padding(.leading, 58)
                        AccountRow(icon: "questionmark.circle", title: "Help", subtitle: nil)
                    }
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 40)
            }
            .background(Theme.canvas)
            .navigationTitle("Account")
        }
    }

    private var initials: String {
        let letters = store.guestName.split(separator: " ").prefix(2).compactMap { $0.first }
        return letters.isEmpty ? "G" : String(letters).uppercased()
    }
}

private struct AccountRow: View {
    let icon: String
    let title: String
    let subtitle: String?

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Theme.green)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16))
                    .foregroundStyle(Theme.ink)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.inkSoft)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.inkSoft.opacity(0.6))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }
}
