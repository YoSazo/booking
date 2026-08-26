import SwiftUI

// Three jobs, three native destinations. On iOS 26 the tab bar renders as
// Liquid Glass automatically.
struct RootView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
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
        .onReceive(NotificationCenter.default.publisher(for: .guestelOpenHotels)) { _ in
            openHotels()
        }
        .onReceive(NotificationCenter.default.publisher(for: .guestelRefreshData)) { _ in
            applyPendingBookingStatuses()
            Task { await refreshGuestState() }
        }
        .onAppear {
            applyPendingBookingStatuses()
            openPendingHotel()
            openPendingMessages()
        }
        .onChange(of: store.reservations) { _, _ in openPendingMessages() }
        .task(id: scenePhase) {
            guard scenePhase == .active else { return }
            applyPendingBookingStatuses()
            await refreshGuestState()
            while !Task.isCancelled {
                let hasPendingRequest = store.reservations.contains {
                    ($0.status ?? "").lowercased() == "pending"
                }
                try? await Task.sleep(for: .seconds(hasPendingRequest ? 10 : 60))
                guard !Task.isCancelled, scenePhase == .active else { return }
                applyPendingBookingStatuses()
                await refreshGuestState()
            }
        }
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
                    // This is a one-time, contextual permission explanation.
                    // A full-height sheet prevents the primary action from
                    // landing below the medium detent on smaller iPhones.
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private func openPendingMessages() {
        guard let route = GuestMessageRoute.pending else { return }
        openMessages(hotelId: route.hotelId, requestedCode: route.code)
    }

    private func openPendingHotel() {
        guard GuestHotelRoute.pendingHotelId != nil else { return }
        openHotels()
    }

    private func openHotels() {
        GuestHotelRoute.clear()
        GuestMessageRoute.clear()
        store.arrival = nil
        messageDestination = nil
        selectedTab = .hotels
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

    @MainActor
    private func applyPendingBookingStatuses() {
        let updates = GuestBookingStatusInbox.pending
        guard !updates.isEmpty else { return }
        for update in updates {
            store.applyReservationStatus(
                hotelId: update.hotelId,
                code: update.code,
                status: update.status
            )
        }
        GuestBookingStatusInbox.clear()
    }

    @MainActor
    private func refreshGuestState() async {
        await store.syncVerifiedWallet()
        await store.refreshConversations()
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
