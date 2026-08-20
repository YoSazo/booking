import SwiftUI

private struct GeometryInfo {
    var scrollOffset: CGFloat = 0
    var minY: CGFloat = 0
    var containerSize: CGSize = .zero
    var safeArea = EdgeInsets()
}

struct HotelsView: View {
    @Environment(GuestStore.self) private var store
    @State private var selectedHotel: Hotel?
    @State private var bookingHotel: Hotel?
    @State private var showingAdd = false
    @State private var info = GeometryInfo()

    private let cardHeight: CGFloat = 196
    private let peek: CGFloat = 74

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                Theme.canvas.ignoresSafeArea()

                if store.hotels.isEmpty {
                    EmptyHotelsView { showingAdd = true }
                } else {
                    walletScroll
                }

                AddButton { showingAdd = true }
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
            .navigationTitle("Your hotels")
            .sheet(isPresented: $showingAdd) {
                AddHotelView().presentationDetents([.medium])
            }
            .fullScreenCover(item: $bookingHotel) { RebookView(hotel: $0) }
        }
    }

    private var walletScroll: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 18) {
                    if let stay = store.upcomingReservation {
                        UpcomingStayCard(stay: stay, hotelName: store.hotelName(for: stay.hotelId))
                    }
                    // Overlapping stack: each card's header peeks above the next.
                    VStack(spacing: -(cardHeight - peek)) {
                        ForEach(Array(store.hotels.enumerated()), id: \.element.id) { index, hotel in
                            CardView(hotel: hotel, seed: index, height: cardHeight)
                                .id(hotel.id)
                                .zIndex(Double(index))
                                .onTapGesture {
                                    withAnimation(.smooth(duration: 0.4)) { proxy.scrollTo(hotel.id, anchor: .top) }
                                    selectedHotel = hotel
                                }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 420)
            }
            .onScrollGeometryChange(for: CGFloat.self) { $0.contentOffset.y + $0.contentInsets.top } action: { _, newValue in
                info.scrollOffset = newValue
            }
            .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).minY } action: { newValue in
                info.minY = newValue - info.safeArea.top
            }
            .onGeometryChange(for: CGSize.self) { $0.size } action: { newValue in
                info.containerSize = newValue
            }
            .onGeometryChange(for: EdgeInsets.self) { $0.safeAreaInsets } action: { newValue in
                info.safeArea = newValue
            }
            .sheet(item: $selectedHotel) { hotel in
                let gap: CGFloat = 30
                let minH = max(info.containerSize.height - info.minY - (cardHeight + gap), 180)
                let maxH = max(info.containerSize.height - info.minY + 15, minH + 60)
                HotelActionsSheet(hotel: hotel) {
                    selectedHotel = nil
                    bookingHotel = hotel
                }
                .presentationDetents([.height(minH), .height(maxH)])
                .presentationBackgroundInteraction(.enabled(upThrough: .height(maxH)))
                .presentationDragIndicator(.visible)
            }
        }
    }
}

private struct CardView: View {
    let hotel: Hotel
    let seed: Int
    let height: CGFloat

    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.gradient(for: seed)
            VStack(alignment: .leading, spacing: 3) {
                Text(hotel.name)
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(.white)
                Text(hotel.location)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(18)
        }
        .frame(height: height)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.18), radius: 14, x: 0, y: 8)
    }
}

private struct HotelActionsSheet: View {
    let hotel: Hotel
    var onBook: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Button(action: onBook) {
                Text("Book again")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            HStack(spacing: 12) {
                ActionButton(title: "Message", icon: "bubble.left")
                ActionButton(title: "Share", icon: "square.and.arrow.up")
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.canvas)
    }
}

private struct ActionButton: View {
    let title: String
    let icon: String

    var body: some View {
        Button {} label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(title)
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(white: 0.93), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }
}

private struct AddButton: View {
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(Theme.green)
                .frame(width: 60, height: 60)
                .modifier(GlassCircle())
        }
        .clipShape(Circle())
        .shadow(color: Theme.ink.opacity(0.18), radius: 12, x: 0, y: 6)
        .accessibilityLabel("Add a hotel")
    }
}

private struct EmptyHotelsView: View {
    var onAdd: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "door.left.hand.closed")
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(Theme.green)
            Text("No hotels yet")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text("Scan the code at a hotel you love to keep it here — and book direct every time after.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button(action: onAdd) {
                Text("Add a hotel")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 22)
                    .padding(.vertical, 12)
                    .background(Theme.green, in: Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
