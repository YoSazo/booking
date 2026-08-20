import SwiftUI

// Apple Wallet card stack, ported from Balaji Venkatesh's AWCAnimation technique:
// a .visualEffect pushes/scales each card by its scroll-relative frame, and the
// detail rides a .sheet whose detents dock right under the pinned card.
struct HotelsView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.colorScheme) private var colorScheme
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
                    if let stay = store.upcomingReservation, !isSelected {
                        UpcomingStayCard(stay: stay, hotelName: store.hotelName(for: stay.hotelId))
                    }
                    VStack(spacing: -overlap) {
                        ForEach(store.hotels) { hotel in
                            cardView(hotel)
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
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
            .sheet(isPresented: $showingAdd) {
                AddHotelView().presentationDetents([.medium])
            }
        }
        .sheet(item: $selectedHotel) { hotel in
            HotelSheet(
                hotel: hotel,
                maxDetent: .height(maxSheetHeight),
                detent: $sheetDetent,
                onBooked: { code, checkin, checkout in
                    store.addReservation(code: code, hotelId: hotel.hotelId, checkin: checkin, checkout: checkout)
                    withAnimation(animation) { selectedHotel = nil }
                }
            )
            .presentationDetents([.height(minSheetHeight), .height(maxSheetHeight)], selection: $sheetDetent)
            .presentationBackgroundInteraction(.enabled(upThrough: .height(maxSheetHeight)))
            .interactiveDismissDisabled()
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

    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.gradient(for: seed)
            VStack(alignment: .leading, spacing: 3) {
                Text(hotel.name)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                Text(hotel.location)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(20)
        }
        .frame(height: height)
        .frame(maxWidth: .infinity)
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
                Text("Paid · Confirmed")
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
