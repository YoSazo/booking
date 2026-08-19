import SwiftUI

struct HotelDetailView: View {
    let hotel: Hotel
    @Environment(GuestStore.self) private var store
    @State private var showingBooking = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .bottomLeading) {
                    Theme.gradient(for: hotel.name.count)
                        .frame(height: 220)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(hotel.name)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                        Text(hotel.location)
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    .padding(20)
                }

                VStack(spacing: 12) {
                    Button { showingBooking = true } label: {
                        Text("Book again")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    HStack(spacing: 12) {
                        SecondaryButton(title: "Message", icon: "bubble.left")
                        SecondaryButton(title: "Share", icon: "square.and.arrow.up")
                    }
                }
                .padding(20)

                VStack(alignment: .leading, spacing: 12) {
                    Text("YOUR STAYS")
                        .font(.system(size: 12, weight: .heavy))
                        .kerning(0.6)
                        .foregroundStyle(Theme.inkSoft)
                    ForEach(0 ..< max(hotel.stays, 1), id: \.self) { i in
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundStyle(Theme.green)
                            Text("Stay \(max(hotel.stays, 1) - i)")
                                .foregroundStyle(Theme.ink)
                            Spacer()
                            Text(i == 0 ? hotel.lastStayed : "—")
                                .foregroundStyle(Theme.inkSoft)
                        }
                        .font(.system(size: 15))
                        .padding(.vertical, 6)
                        if i < max(hotel.stays, 1) - 1 { Divider() }
                    }
                }
                .padding(20)
            }
        }
        .background(Theme.canvas)
        .ignoresSafeArea(edges: .top)
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showingBooking) {
            BookingSheet(hotel: hotel, store: store)
        }
    }
}

private struct SecondaryButton: View {
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
