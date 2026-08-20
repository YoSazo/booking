import SwiftUI
import StoreKit

struct ClipRootView: View {
    let target: ClipTarget?

    @State private var hotel: BookingAPI.HotelPublic?
    @State private var bookingDomain: String?
    @State private var loading = true
    @State private var showingBooking = false

    var body: some View {
        ZStack {
            Theme.canvas.ignoresSafeArea()
            if loading {
                ProgressView().tint(Theme.green)
            } else if let hotel {
                content(hotel)
            } else {
                Text("Open this from a hotel's Guestel code.")
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.inkSoft)
                    .padding(40)
                    .multilineTextAlignment(.center)
            }
        }
        .task(id: target) { await load() }
        .onAppear(perform: presentGetFullApp)
        .sheet(isPresented: $showingBooking) {
            if let hotel {
                ClipWebView(url: bookingURL(for: hotel))
                    .ignoresSafeArea()
            }
        }
    }

    // Prefer the hotel's own branded engine (jacksinn.mktel.co) when we arrived
    // from it; fall back to the central engine with an explicit hotelId.
    private func bookingURL(for hotel: BookingAPI.HotelPublic) -> URL {
        if let d = bookingDomain, let url = URL(string: "https://\(d)/") { return url }
        return URL(string: "https://bookmarketel.com/?hotelId=\(hotel.id)")!
    }

    private func content(_ hotel: BookingAPI.HotelPublic) -> some View {
        VStack(spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                Theme.gradient(for: hotel.name.count)
                if let url = hotel.rooms.first?.image {
                    AsyncImage(url: url) { img in img.resizable().aspectRatio(contentMode: .fill) } placeholder: { Color.clear }
                }
                LinearGradient(colors: [.clear, .black.opacity(0.45)], startPoint: .center, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 4) {
                    Text(hotel.name).font(.system(size: 30, weight: .bold)).foregroundStyle(.white)
                    if let room = hotel.rooms.first { Text(room.name).font(.system(size: 15)).foregroundStyle(.white.opacity(0.9)) }
                }
                .padding(20)
            }
            .frame(height: 280)
            .clipped()
            .ignoresSafeArea(edges: .top)

            VStack(spacing: 14) {
                Button { showingBooking = true } label: {
                    Text("Book direct")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                Text("Book straight from here — or get the Guestel app to keep this hotel and rebook in one tap.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
            }
            .padding(20)

            Spacer(minLength: 0)
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let target else { return }
        var id: String?
        switch target {
        case .hotelId(let hid):
            id = hid
        case .domain(let domain):
            bookingDomain = domain
            id = try? await BookingAPI.hotelId(forDomain: domain)
        }
        if let id, let h = try? await BookingAPI.hotel(id) { hotel = h }
    }

    // The system "Get the full app" overlay, from inside the clip.
    private func presentGetFullApp() {
        guard let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else { return }
        let config = SKOverlay.AppClipConfiguration(position: .bottom)
        SKOverlay(configuration: config).present(in: scene)
    }
}
