import SwiftUI

// Apple Wallet card stack, ported from Balaji Venkatesh's AWCAnimation technique:
// a .visualEffect pushes/scales each card by its scroll-relative frame, and the
// detail rides a .sheet whose detents dock right under the pinned card.
struct HotelsView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedHotel: Hotel?
    @State private var info = Info()
    @State private var sheetDetent: PresentationDetent = .large
    @State private var showingAdd = false

    private let cardHeight: CGFloat = 220
    private let overlap: CGFloat = 150

    private var minSheetHeight: CGFloat {
        max(info.containerSize.height - info.minY - (cardHeight + 20), 220)
    }
    private var maxSheetHeight: CGFloat {
        max(info.containerSize.height - info.minY + (info.safeArea.bottom > 0 ? 15 : 10), minSheetHeight + 80)
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical) {
                VStack(spacing: 16) {
                    if store.hotels.isEmpty, !isSelected {
                        emptyWallet
                    }
                    if let stay = store.upcomingReservation, !isSelected {
                        UpcomingStayCard(stay: stay, hotelName: store.hotelName(for: stay.hotelId))
                    }
                    VStack(spacing: -overlap) {
                        ForEach(store.hotels) { hotel in
                            cardView(hotel)
                        }
                    }
                }
                // Inset the cards from the screen edges (on top of safeAreaPadding)
                // so they don't run edge-to-edge. Horizontal only — the Wallet
                // push/scale math is vertical, so this doesn't affect it.
                .padding(.horizontal, 12)
                // A little breathing room under the title so cards don't sit so high.
                .padding(.top, 12)
            }
            .scrollIndicators(.hidden)
            .refreshable { await refreshHotelCards() }
            .safeAreaPadding(15)
            .scrollDisabled(isSelected)
            .navigationTitle(navigationTitleHidden ? "" : "Your hotels")
            .toolbarTitleDisplayMode(.inlineLarge)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if isSelected {
                        Button("Close", systemImage: "xmark") {
                            withAnimation(animation) { selectedHotel = nil }
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if !isSelected {
                        Button("Add", systemImage: "plus") { showingAdd = true }
                    }
                }
            }
            .onScrollGeometryChange(for: CGFloat.self) { $0.contentOffset.y + $0.contentInsets.top } action: { _, newValue in
                info.scrollOffset = newValue
            }
            .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).minY } action: { newValue in
                info.minY = newValue - info.safeArea.top
            }
            .background(Theme.canvas)
            .overlay {
                // Tap the pinned card or the gap above the sheet to close, like ✕.
                if isSelected {
                    Color.clear
                        .contentShape(.rect)
                        .onTapGesture { withAnimation(animation) { selectedHotel = nil } }
                }
            }
            .task {
                await refreshHotelCards()
            }
            .onChange(of: scenePhase) { _, phase in
                // A property owner can change this card from Marketel while the
                // guest keeps Guestel installed. Refresh when Guestel returns to
                // the foreground so the Wallet never remains stuck on a room
                // photo merely because this tab was already alive.
                guard phase == .active else { return }
                Task { await refreshHotelCards() }
            }
            .sheet(isPresented: $showingAdd) {
                AddHotelView().presentationDetents([.medium])
            }
        }
        .sheet(item: animatedHotelSelection) { hotel in
            HotelSheet(
                hotel: hotel,
                maxDetent: .height(maxSheetHeight),
                detent: $sheetDetent,
                onBooked: { result, checkin, checkout, roomName in
                    store.addReservation(
                        code: result.reservationCode,
                        hotelId: hotel.hotelId,
                        checkin: checkin,
                        checkout: checkout,
                        status: result.pending ? "pending" : "confirmed",
                        roomName: roomName,
                        accessToken: result.reservationToken
                    )
                    withAnimation(animation) { selectedHotel = nil }
                    // A booking made wholly inside Guestel used to close back to
                    // the wallet without ever explaining or requesting alerts.
                    // Ask at the moment the value is concrete, after the booking
                    // sheet has finished dismissing, so confirmations and Front
                    // Desk replies can actually reach this iPhone.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                        let stay = store.reservations.first {
                            $0.hotelId == hotel.hotelId && $0.code == result.reservationCode
                        }
                        store.arrival = GuestelArrival(hotel: hotel, stay: stay)
                    }
                }
            )
            .presentationDetents([.height(minSheetHeight), .height(maxSheetHeight)], selection: $sheetDetent)
            .presentationBackgroundInteraction(.enabled(upThrough: .height(maxSheetHeight)))
            .presentationBackground(colorScheme == .dark ? Color.black : Theme.canvas)
        }
        .onGeometryChange(for: CGSize.self) { $0.size } action: { info.containerSize = $0 }
        .onGeometryChange(for: EdgeInsets.self) { $0.safeAreaInsets } action: { info.safeArea = $0 }
    }

    @ViewBuilder
    private func cardView(_ hotel: Hotel) -> some View {
        let currentIndex = store.hotels.firstIndex(of: hotel) ?? 0
        let selectedIndex = store.hotels.firstIndex(where: { $0.id == selectedHotel?.id }) ?? 0
        let isCurrent = hotel.id == selectedHotel?.id

        WalletCard(hotel: hotel, seed: currentIndex, height: cardHeight)
            .opacity(isSelected && !isCurrent ? 0 : 1)
            .contentShape(.rect)
            .onTapGesture {
                sheetDetent = .height(minSheetHeight)
                withAnimation(animation) { selectedHotel = hotel }
            }
            .visualEffect { [info, isSelected] content, proxy in
                let rect = proxy.frame(in: .scrollView)
                let bounds = info.containerSize
                // Selected card + those above go to the top; cards below push off-screen.
                let pushOffset = selectedIndex < currentIndex ? (bounds.height - rect.minY) : -rect.minY
                let scale = selectedIndex < currentIndex ? 1.0 : 0.95
                return content
                    .scaleEffect(isSelected ? (isCurrent ? 1 : scale) : 1, anchor: .top)
                    .offset(y: isSelected ? pushOffset : 0)
            }
            .allowsHitTesting(isSelected ? isCurrent : true)
    }

    private var isSelected: Bool { selectedHotel != nil }
    private var navigationTitleHidden: Bool { info.scrollOffset > 1 || isSelected }

    private var animation: Animation { .interactiveSpring(response: 0.55, dampingFraction: 0.8) }

    // SwiftUI clears a sheet's item binding when an interactive swipe finishes.
    // Route that system mutation through the same spring used by the close and
    // background-tap paths, so the pinned Wallet card never snaps back abruptly.
    private var animatedHotelSelection: Binding<Hotel?> {
        Binding(
            get: { selectedHotel },
            set: { value in
                withAnimation(animation) { selectedHotel = value }
            }
        )
    }

    @MainActor
    private func refreshHotelCards() async {
        await store.refreshHotels()
        ImagePrefetch.warm(hotels: store.hotels)
    }

    private var emptyWallet: some View {
        VStack(spacing: 14) {
            Image(systemName: "building.2.crop.circle")
                .font(.system(size: 58, weight: .light))
                .foregroundStyle(Theme.green)
            Text("Your hotels live here")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text("Open a hotel’s Guestel link, or add its direct-booking link. Already booked? Restore your stays from Account.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
            Button { showingAdd = true } label: {
                Text("Add a hotel")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.top, 4)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.top, 30)
    }

    struct Info {
        var scrollOffset: CGFloat = 0
        var containerSize: CGSize = .zero
        var safeArea: EdgeInsets = .init()
        var minY: CGFloat = 0
    }
}

struct WalletCard: View {
    let hotel: Hotel
    let seed: Int
    let height: CGFloat

    // Show a real city/state; hide the "Direct booking" placeholder.
    private var locationLine: String? {
        let loc = hotel.location.trimmingCharacters(in: .whitespaces)
        guard !loc.isEmpty, loc.caseInsensitiveCompare("Direct booking") != .orderedSame else { return nil }
        return loc
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(hotel.name)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.45), radius: 6, x: 0, y: 1)
            if let locationLine {
                Text(locationLine)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .shadow(color: .black.opacity(0.4), radius: 5, x: 0, y: 1)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        // Pin the text to the TOP-left so the name is visible where the card
        // peeks out behind another in the stack.
        .frame(height: height, alignment: .topLeading)
        // Photo in the background so a large scaledToFill image can't widen the
        // card past its frame; a top-anchored scrim keeps the name legible over
        // bright photos and in the peeking sliver.
        .background {
            ZStack {
                Theme.gradient(for: seed)
                if let imageURL = hotel.imageURL {
                    AsyncImage(url: imageURL) { phase in
                        if case let .success(image) = phase {
                            image.resizable().scaledToFill()
                        }
                    }
                }
                LinearGradient(
                    colors: [.black.opacity(0.60), .black.opacity(0.12), .clear],
                    startPoint: .top,
                    endPoint: .center
                )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.18), radius: 14, x: 0, y: 8)
    }
}

private struct UpcomingStayCard: View {
    let stay: Reservation
    let hotelName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.seal.fill").font(.system(size: 13))
                Text("UPCOMING STAY").font(.system(size: 12, weight: .heavy)).kerning(0.8)
                Spacer()
                Text("#\(stay.code)").font(.system(size: 12, weight: .semibold)).opacity(0.9)
            }
            .foregroundStyle(.white.opacity(0.95))

            Text(hotelName).font(.system(size: 24, weight: .bold)).foregroundStyle(.white)

            HStack(spacing: 8) {
                Image(systemName: "calendar").font(.system(size: 14))
                Text(dateRange).font(.system(size: 15, weight: .semibold))
                Spacer()
                Text(stay.status?.lowercased() == "pending" ? "Being reviewed" : "Confirmed")
                    .font(.system(size: 12, weight: .semibold))
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(.white.opacity(0.18), in: Capsule())
            }
            .foregroundStyle(.white.opacity(0.95))
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Theme.green, Color(red: 31 / 255, green: 92 / 255, blue: 66 / 255)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: Theme.green.opacity(0.30), radius: 16, x: 0, y: 8)
    }

    private var dateRange: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "MMM d"
        switch (stay.checkinDate, stay.checkoutDate) {
        case let (i?, o?): return "\(f.string(from: i)) → \(f.string(from: o))"
        case let (i?, nil): return f.string(from: i)
        default: return "Upcoming"
        }
    }
}
