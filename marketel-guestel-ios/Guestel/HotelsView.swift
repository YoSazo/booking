import SwiftUI

struct HotelsView: View {
    @Environment(GuestStore.self) private var store
    @State private var showingAdd = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                Theme.canvas.ignoresSafeArea()

                if store.hotels.isEmpty {
                    EmptyHotelsView { showingAdd = true }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            if let stay = store.upcomingReservation {
                                UpcomingStayCard(stay: stay, hotelName: store.hotelName(for: stay.hotelId))
                            }
                            ForEach(Array(store.hotels.enumerated()), id: \.element.id) { index, hotel in
                                NavigationLink(value: hotel) {
                                    HotelCard(hotel: hotel, seed: index)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 96)
                    }
                }

                AddButton { showingAdd = true }
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
            .navigationTitle("Your hotels")
            .navigationDestination(for: Hotel.self) { HotelDetailView(hotel: $0) }
            .sheet(isPresented: $showingAdd) {
                AddHotelView().presentationDetents([.medium])
            }
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

private struct HotelCard: View {
    let hotel: Hotel
    let seed: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                Theme.gradient(for: seed)
                    .frame(height: 132)
                    .overlay(alignment: .topTrailing) {
                        Text("\(hotel.stays) \(hotel.stays == 1 ? "stay" : "stays")")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(.ultraThinMaterial, in: Capsule())
                            .padding(12)
                    }
                Text(hotel.name)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(16)
            }
            HStack(spacing: 6) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.green)
                Text(hotel.location)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.inkSoft)
                Spacer()
                Text("Last stay \(hotel.lastStayed)")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.inkSoft)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.06), radius: 12, x: 0, y: 6)
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

// The real, paid, upcoming stay — read from the booking engine after checkout.
private struct UpcomingStayCard: View {
    let stay: Reservation
    let hotelName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 13))
                Text("UPCOMING STAY")
                    .font(.system(size: 12, weight: .heavy))
                    .kerning(0.8)
                Spacer()
                Text("#\(stay.code)")
                    .font(.system(size: 12, weight: .semibold))
                    .opacity(0.9)
            }
            .foregroundStyle(.white.opacity(0.95))

            Text(hotelName)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)

            HStack(spacing: 8) {
                Image(systemName: "calendar")
                    .font(.system(size: 14))
                Text(dateRange)
                    .font(.system(size: 15, weight: .semibold))
                Spacer()
                Text("Paid · Confirmed")
                    .font(.system(size: 12, weight: .semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
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
