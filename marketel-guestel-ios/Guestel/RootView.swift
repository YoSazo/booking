import SwiftUI

// Two tabs only. On iOS 26 the tab bar renders as Liquid Glass automatically.
struct RootView: View {
    @Environment(GuestStore.self) private var store
    @State private var messageDestination: MessageDestination?

    var body: some View {
        TabView {
            HotelsView()
                .tabItem { Label("Hotels", systemImage: "door.left.hand.open") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
        .onReceive(NotificationCenter.default.publisher(for: .guestelOpenMessages)) { notification in
            let hotelId = notification.userInfo?["hotelId"] as? String ?? ""
            let requestedCode = notification.userInfo?["code"] as? String ?? ""
            guard let hotel = store.hotels.first(where: { $0.hotelId == hotelId }) else { return }
            let stays = store.reservations.filter { $0.hotelId == hotelId }
            guard let stay = stays.first(where: { requestedCode.isEmpty || $0.code == requestedCode }) ?? stays.first else { return }
            messageDestination = MessageDestination(hotel: hotel, stay: stay)
        }
        .sheet(item: $messageDestination) { destination in
            NativeMessagesView(hotel: destination.hotel, stay: destination.stay)
        }
    }
}

private struct MessageDestination: Identifiable {
    let id = UUID()
    let hotel: Hotel
    let stay: Reservation
}
