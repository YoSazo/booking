import SwiftUI

// Three jobs, three native destinations. On iOS 26 the tab bar renders as
// Liquid Glass automatically.
struct RootView: View {
    @Environment(GuestStore.self) private var store
    @State private var messageDestination: MessageDestination?
    @State private var selectedTab: GuestelTab = .hotels

    var body: some View {
        TabView(selection: $selectedTab) {
            HotelsView()
                .tag(GuestelTab.hotels)
                .tabItem { Label("Hotels", systemImage: "door.left.hand.open") }
            MessagesView()
                .tag(GuestelTab.messages)
                .tabItem { Label("Messages", systemImage: "bubble.left.and.bubble.right") }
                .badge(store.unreadMessageCount)
            AccountView()
                .tag(GuestelTab.account)
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
        .onReceive(NotificationCenter.default.publisher(for: .guestelOpenMessages)) { notification in
            let hotelId = notification.userInfo?["hotelId"] as? String ?? ""
            let requestedCode = notification.userInfo?["code"] as? String ?? ""
            openMessages(hotelId: hotelId, requestedCode: requestedCode)
        }
        .onAppear { openPendingMessages() }
        .onChange(of: store.reservations) { _, _ in openPendingMessages() }
        .sheet(item: $messageDestination) { destination in
            NativeMessagesView(hotel: destination.hotel, stay: destination.stay)
        }
        .sheet(
            isPresented: Binding(
                get: { store.arrival != nil },
                set: { if !$0 { store.arrival = nil } }
            )
        ) {
            if let arrival = store.arrival {
                GuestelWelcomeView(arrival: arrival) { store.arrival = nil }
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private func openPendingMessages() {
        guard let route = GuestMessageRoute.pending else { return }
        openMessages(hotelId: route.hotelId, requestedCode: route.code)
    }

    private func openMessages(hotelId: String, requestedCode: String) {
        guard let hotel = store.hotels.first(where: { $0.hotelId == hotelId }) else { return }
        let stays = store.reservations.filter { $0.hotelId == hotelId }
        guard let stay = stays.first(where: { requestedCode.isEmpty || $0.code == requestedCode }) ?? stays.first else { return }
        GuestMessageRoute.clear()
        store.arrival = nil
        selectedTab = .messages
        messageDestination = MessageDestination(hotel: hotel, stay: stay)
        Task { await store.refreshConversations() }
    }
}

private enum GuestelTab: Hashable {
    case hotels
    case messages
    case account
}

private struct MessageDestination: Identifiable {
    let id = UUID()
    let hotel: Hotel
    let stay: Reservation
}
