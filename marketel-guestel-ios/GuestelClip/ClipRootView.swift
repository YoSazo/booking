import SwiftUI
import StoreKit

struct ClipRootView: View {
    let invocation: ClipInvocation?

    @State private var hotel: BookingAPI.HotelPublic?
    @State private var bookingDomain: String?
    @State private var loading = true
    @State private var showingBooking = false
    @State private var capturedHandoff: String?

    private var intent: ClipIntent {
        capturedHandoff == nil ? (invocation?.intent ?? .book) : .stay
    }

    var body: some View {
        ZStack {
            Theme.canvas.ignoresSafeArea()
            if loading {
                ProgressView().tint(Theme.green)
            } else if let hotel {
                content(hotel)
            } else {
                ContentUnavailableView(
                    "Property unavailable",
                    systemImage: "building.2",
                    description: Text("Open Guestel from a property’s Add button or Guestel code.")
                )
            }
        }
        .task(id: invocation) { await load() }
        .onAppear {
            guard intent != .book else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) { presentGetFullApp() }
        }
        .sheet(isPresented: $showingBooking) {
            if let hotel {
                ClipWebView(
                    url: bookingURL(for: hotel),
                    onHandoff: captureHandoff,
                    onInstallRequested: presentGetFullApp
                )
                .ignoresSafeArea()
            }
        }
    }

    private func bookingURL(for hotel: BookingAPI.HotelPublic) -> URL {
        if let domain = bookingDomain, let url = URL(string: "https://\(domain)/") { return url }
        return URL(string: "https://bookmarketel.com/?hotelId=\(hotel.id)")!
    }

    private func content(_ hotel: BookingAPI.HotelPublic) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                hero(hotel)
                VStack(alignment: .leading, spacing: 20) {
                    message(hotel)
                    benefits
                    actions
                }
                .padding(22)
            }
        }
        .scrollIndicators(.hidden)
        .background(Theme.canvas)
    }

    private func hero(_ hotel: BookingAPI.HotelPublic) -> some View {
        ZStack(alignment: .bottomLeading) {
            Theme.gradient(for: hotel.name.count)
            if let url = hotel.rooms.first?.image {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: { Color.clear }
            }
            LinearGradient(colors: [.clear, .black.opacity(0.56)], startPoint: .center, endPoint: .bottom)
            VStack(alignment: .leading, spacing: 5) {
                Text(hotel.name)
                    .font(.system(size: 29, weight: .bold))
                    .foregroundStyle(.white)
                if let room = hotel.rooms.first?.name {
                    Text(room)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                }
            }
            .padding(22)
        }
        .frame(height: 250)
        .clipped()
        .ignoresSafeArea(edges: .top)
    }

    @ViewBuilder
    private func message(_ hotel: BookingAPI.HotelPublic) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(intent == .stay ? "YOUR STAY, IN ONE PLACE" : "KEEP THIS PROPERTY CLOSE")
                .font(.system(size: 11, weight: .heavy))
                .tracking(0.8)
                .foregroundStyle(Theme.green)
            Text(headline(hotel))
                .font(.system(size: 27, weight: .bold))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(subtitle)
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var benefits: some View {
        VStack(spacing: 0) {
            benefit("bell.badge.fill", intent == .stay ? "Confirmation and stay updates" : "Stay updates on your phone")
            Divider().padding(.leading, 44)
            benefit("bubble.left.and.bubble.right.fill", "Message the Front Desk")
            Divider().padding(.leading, 44)
            benefit("creditcard.fill", "Faster direct rebooking")
        }
        .padding(.horizontal, 16)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func benefit(_ symbol: String, _ label: String) -> some View {
        HStack(spacing: 13) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.green)
                .frame(width: 28)
            Text(label)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Spacer()
            Image(systemName: "checkmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.green)
        }
        .padding(.vertical, 14)
    }

    private var actions: some View {
        VStack(spacing: 11) {
            if intent == .book {
                primaryButton("Book direct", systemImage: "calendar.badge.plus") { showingBooking = true }
                secondaryButton("Keep this property in Guestel", action: presentGetFullApp)
            } else {
                primaryButton(intent == .stay ? "Keep this stay in Guestel" : "Get Guestel", systemImage: "arrow.down.app.fill", action: presentGetFullApp)
                secondaryButton(intent == .stay ? "View booking without the app" : "Continue booking without the app") {
                    showingBooking = true
                }
            }
            Text("Guestel is free for guests.")
                .font(.system(size: 12))
                .foregroundStyle(Theme.inkSoft)
                .frame(maxWidth: .infinity)
        }
    }

    private func primaryButton(_ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func secondaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.green)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
    }

    private func headline(_ hotel: BookingAPI.HotelPublic) -> String {
        intent == .stay ? "Keep your \(hotel.name) stay in Guestel" : "Keep \(hotel.name) on your phone"
    }

    private var subtitle: String {
        intent == .stay
            ? "See your stay, hear from the Front Desk, and return to book direct again."
            : "Book direct, message the Front Desk after booking, and return without searching again."
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let invocation else { return }
        var hotelId: String?
        switch invocation.target {
        case .hotelId(let id):
            hotelId = id
        case .domain(let domain):
            bookingDomain = domain
            hotelId = try? await BookingAPI.hotelId(forDomain: domain)
        }
        guard let hotelId, let loadedHotel = try? await BookingAPI.hotel(hotelId) else { return }
        hotel = loadedHotel
        if bookingDomain == nil, let domain = loadedHotel.domain, !domain.isEmpty { bookingDomain = domain }

        let handoff = invocation.handoffToken
        capturedHandoff = handoff
        GuestelHandoff.save(hotelId: loadedHotel.id, domain: bookingDomain ?? loadedHotel.domain ?? "", handoffToken: handoff)
        if invocation.intent != .book {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) { presentGetFullApp() }
        }
    }

    private func captureHandoff(_ token: String) {
        guard let hotel else { return }
        capturedHandoff = token
        GuestelHandoff.save(hotelId: hotel.id, domain: bookingDomain ?? hotel.domain ?? "", handoffToken: token)
        presentGetFullApp()
    }

    private func presentGetFullApp() {
        guard let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else { return }
        SKOverlay(configuration: SKOverlay.AppClipConfiguration(position: .bottom)).present(in: scene)
    }
}
