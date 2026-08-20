import SwiftUI
import UserNotifications
import StripePaymentSheet

// MARK: - Personal info

struct PersonalInfoView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var guest = GuestInfo()
    @State private var savedTick = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text("This prefills your bookings so rebooking is one tap.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.inkSoft)

                VStack(spacing: 0) {
                    AccountField(label: "Name", text: $guest.name, keyboard: .default)
                    Divider().padding(.leading, 16)
                    AccountField(label: "Email", text: $guest.email, keyboard: .emailAddress)
                    Divider().padding(.leading, 16)
                    AccountField(label: "Phone", text: $guest.phone, keyboard: .phonePad)
                }
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                Button {
                    store.saveGuest(guest)
                    withAnimation { savedTick = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
                } label: {
                    Text(savedTick ? "Saved ✓" : "Save")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(!guest.isComplete)
                .opacity(guest.isComplete ? 1 : 0.5)
            }
            .padding(20)
        }
        .background(Theme.canvas)
        .navigationTitle("Personal info")
        .navigationBarTitleDisplayMode(.large)
        .task { guest = store.guest }
    }
}

// MARK: - Notifications

struct NotificationsView: View {
    @AppStorage("guestel.notif.stayUpdates") private var stayUpdates = true
    @AppStorage("guestel.notif.messages") private var messages = true
    @AppStorage("guestel.notif.deals") private var deals = false
    @State private var systemDenied = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if systemDenied {
                    Text("Notifications are off in iOS Settings. Turn them on for Guestel to receive these.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.amber)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.amber.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                VStack(spacing: 0) {
                    ToggleRow(title: "Stay updates", subtitle: "Check-in reminders, room readiness", isOn: $stayUpdates)
                    Divider().padding(.leading, 16)
                    ToggleRow(title: "Messages", subtitle: "Replies from the front desk", isOn: $messages)
                    Divider().padding(.leading, 16)
                    ToggleRow(title: "Deals", subtitle: "Direct-booking offers from your hotels", isOn: $deals)
                }
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(20)
        }
        .background(Theme.canvas)
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.large)
        .onChange(of: stayUpdates) { _, on in if on { requestPush() } }
        .onChange(of: messages) { _, on in if on { requestPush() } }
        .onChange(of: deals) { _, on in if on { requestPush() } }
        .task { refreshStatus() }
    }

    private func requestPush() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in
            refreshStatus()
        }
    }

    private func refreshStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                systemDenied = settings.authorizationStatus == .denied
            }
        }
    }
}

// MARK: - Help

struct HelpView: View {
    @State private var showContact = false

    private let faqs: [(String, String)] = [
        ("What is the $1 hold?", "We place a $1 authorization to confirm your room. You pay the rest at the property. The hold is released automatically."),
        ("How do I rebook a hotel?", "Open a hotel card in your wallet and tap Book again — your details are prefilled."),
        ("Is my card saved?", "Only if you add one under Payment methods. It's stored securely with Stripe, never on your phone."),
        ("How do I message a hotel?", "Open the hotel card and tap Message to reach that property's front desk."),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(spacing: 0) {
                    ForEach(Array(faqs.enumerated()), id: \.offset) { idx, item in
                        FAQRow(question: item.0, answer: item.1)
                        if idx < faqs.count - 1 { Divider().padding(.leading, 16) }
                    }
                }
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                Button { showContact = true } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "envelope.fill")
                        Text("Contact support")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
            .padding(20)
        }
        .background(Theme.canvas)
        .navigationTitle("Help")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showContact) {
            SimpleWebSheet(url: URL(string: "https://bookmarketel.com/support")!, title: "Support")
        }
    }
}

// MARK: - Payment methods

struct PaymentMethodsView: View {
    @Environment(GuestStore.self) private var store

    @State private var cards: [BookingAPI.SavedCard] = []
    @State private var loading = true
    @State private var error: String?
    @State private var addSheet: PaymentSheet?
    @State private var busy = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if !store.guest.email.contains("@") {
                    infoBanner("Add your email in Personal info to save a card.")
                }

                if loading {
                    ProgressView().tint(Theme.green).frame(maxWidth: .infinity).padding(.vertical, 30)
                } else if cards.isEmpty {
                    Text("No saved cards yet.")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(cards.enumerated()), id: \.element.id) { idx, card in
                            CardRow(card: card) { Task { await remove(card) } }
                            if idx < cards.count - 1 { Divider().padding(.leading, 16) }
                        }
                    }
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                if let error {
                    Text(error).font(.system(size: 13)).foregroundStyle(.red)
                }

                Button(action: addCard) {
                    HStack(spacing: 8) {
                        if busy { ProgressView().tint(.white) }
                        else { Image(systemName: "plus"); Text("Add card") }
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(busy || !store.guest.email.contains("@"))
                .opacity(store.guest.email.contains("@") ? 1 : 0.5)
            }
            .padding(20)
        }
        .background(Theme.canvas)
        .navigationTitle("Payment methods")
        .navigationBarTitleDisplayMode(.large)
        .task { await load() }
    }

    private func infoBanner(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13))
            .foregroundStyle(Theme.inkSoft)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.green.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func load() async {
        loading = true
        cards = (try? await BookingAPI.paymentMethods(email: store.guest.email)) ?? []
        loading = false
    }

    private func remove(_ card: BookingAPI.SavedCard) async {
        try? await BookingAPI.detachPaymentMethod(card.id)
        await load()
    }

    private func addCard() {
        error = nil
        guard store.guest.email.contains("@") else { error = "Add your email in Personal info first."; return }
        busy = true
        Task {
            guard await StripeConfig.ensureLoaded() else {
                await MainActor.run { error = "Payments aren't available right now."; busy = false }
                return
            }
            do {
                let info = try await BookingAPI.setupIntent(
                    email: store.guest.email, name: store.guest.name, apiVersion: STPAPIClient.apiVersion)
                await MainActor.run {
                    var config = PaymentSheet.Configuration()
                    config.merchantDisplayName = "Guestel"
                    config.customer = .init(id: info.customerId, ephemeralKeySecret: info.ephemeralKey)
                    let sheet = PaymentSheet(setupIntentClientSecret: info.clientSecret, configuration: config)
                    addSheet = sheet
                    busy = false
                    guard let vc = UIApplication.shared.topViewController() else { return }
                    sheet.present(from: vc) { result in
                        switch result {
                        case .completed: Task { await load() }
                        case .failed(let e): error = e.localizedDescription
                        case .canceled: break
                        }
                    }
                }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; busy = false }
            }
        }
    }
}

// MARK: - Shared bits

struct AccountField: View {
    let label: String
    @Binding var text: String
    let keyboard: UIKeyboardType

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .frame(width: 70, alignment: .leading)
            TextField(label, text: $text)
                .font(.system(size: 16))
                .foregroundStyle(Theme.ink)
                .keyboardType(keyboard)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
    }
}

private struct ToggleRow: View {
    let title: String
    let subtitle: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 16, weight: .medium)).foregroundStyle(Theme.ink)
                Text(subtitle).font(.system(size: 12)).foregroundStyle(Theme.inkSoft)
            }
        }
        .tint(Theme.green)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private struct FAQRow: View {
    let question: String
    let answer: String
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation(.easeInOut(duration: 0.2)) { open.toggle() } } label: {
                HStack {
                    Text(question).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Image(systemName: open ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.inkSoft)
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if open {
                Text(answer)
                    .font(.system(size: 14)).foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 16).padding(.bottom, 14)
            }
        }
    }
}

private struct CardRow: View {
    let card: BookingAPI.SavedCard
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "creditcard.fill").font(.system(size: 18)).foregroundStyle(Theme.green).frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(card.brand.capitalized) •••• \(card.last4)")
                    .font(.system(size: 16, weight: .medium)).foregroundStyle(Theme.ink)
                if let m = card.expMonth, let y = card.expYear {
                    Text(String(format: "Expires %02d/%d", m, y % 100))
                        .font(.system(size: 12)).foregroundStyle(Theme.inkSoft)
                }
            }
            Spacer()
            Button(action: onRemove) {
                Image(systemName: "trash").font(.system(size: 15)).foregroundStyle(.red.opacity(0.8))
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }
}
