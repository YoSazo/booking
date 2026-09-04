import SwiftUI
import StoreKit

struct ClipRootView: View {
    let invocation: ClipInvocation?

    @State private var hotel: BookingAPI.HotelPublic?
    @State private var bookingDomain: String?
    @State private var loading = true
    @State private var showingBooking = false
    @State private var capturedHandoff: String?
    @State private var hasAutomaticallyPresentedInstall = false

    private var intent: ClipIntent {
        capturedHandoff == nil ? (invocation?.intent ?? .book) : .stay
    }

    var body: some View {
        ZStack {
            Theme.canvas.ignoresSafeArea()
            if loading {
                ProgressView().tint(Theme.green)
            } else if let hotel {
                if hotel.subscribed == false {
                    inactiveContent(hotel)
                } else {
                    content(hotel)
                }
            } else {
                ContentUnavailableView(
                    "Property unavailable",
                    systemImage: "building.2",
                    description: Text("Open Guestel from a property’s Add button or Guestel code.")
                )
            }
        }
        .task(id: invocation) { await load() }
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

    private func inactiveContent(_ hotel: BookingAPI.HotelPublic) -> some View {
        ContentUnavailableView(
            "\(hotel.name) is unavailable",
            systemImage: "calendar.badge.exclamationmark",
            description: Text("This property is not accepting new direct booking requests right now.")
        )
    }

    private func bookingURL(for hotel: BookingAPI.HotelPublic) -> URL {
        if let domain = bookingDomain, let url = URL(string: "https://\(domain)/") { return url }
        return URL(string: "https://bookmarketel.com/?hotelId=\(hotel.id)")!
    }

    private func content(_ hotel: BookingAPI.HotelPublic) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                hero(hotel)
                if let room = hotel.rooms.first?.name {
                    Text(room)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 22)
                        .padding(.top, 12)
                }
                VStack(alignment: .leading, spacing: 20) {
                    message(hotel)
                    benefits(hotel)
                    actions(hotel)
                }
                .padding(22)
                .padding(.bottom, intent == .book ? 0 : 96)
            }
        }
        .scrollIndicators(.hidden)
        .background(Theme.canvas)
    }

    // A clean rounded photo — no text overlay (the name is the headline just below,
    // and the room name is a caption under the image, both far more legible).
    private func hero(_ hotel: BookingAPI.HotelPublic) -> some View {
        ZStack {
            Theme.gradient(for: hotel.name.count)
            if let url = hotel.rooms.first?.image {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: { Color.clear }
            }
        }
        .frame(height: 210)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 22)
        .padding(.top, 14)
    }

    @ViewBuilder
    private func message(_ hotel: BookingAPI.HotelPublic) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(eyebrow(hotel))
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

    private func benefits(_ hotel: BookingAPI.HotelPublic) -> some View {
        VStack(spacing: 0) {
            benefit(
                "banknote.fill",
                intent == .book ? "Book without a middleman" : "See \(hotel.name)’s direct rates"
            )
            Divider().padding(.leading, 44)
            benefit("bubble.left.and.bubble.right.fill", "Message the property directly")
            Divider().padding(.leading, 44)
            benefit(
                intent == .stay ? "bell.badge.fill" : "arrow.uturn.forward.circle.fill",
                intent == .stay ? "Keep confirmation and stay updates together" : "Return and book direct without searching"
            )
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

    private func actions(_ hotel: BookingAPI.HotelPublic) -> some View {
        VStack(spacing: 11) {
            if intent == .book {
                primaryButton("Book direct", systemImage: "calendar.badge.plus") { showingBooking = true }
                secondaryButton("Keep this property in Guestel", action: presentGetFullApp)
            } else {
                Text("Use Apple’s Guestel install button below.")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity)
                secondaryButton("Show the install button again", action: presentGetFullApp)
                secondaryButton(intent == .stay ? "View my booking without Guestel" : "Not now — continue with \(hotel.name)") {
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
        switch intent {
        case .book:
            return "Book directly with \(hotel.name)"
        case .add:
            return "\(hotel.name) wants to stay connected with you"
        case .stay:
            return "Keep your \(hotel.name) stay in Guestel"
        }
    }

    private func eyebrow(_ hotel: BookingAPI.HotelPublic) -> String {
        switch intent {
        case .book:
            return "BOOK WITH THE PROPERTY"
        case .add, .stay:
            return "AN INVITATION FROM \(hotel.name.uppercased())"
        }
    }

    private var subtitle: String {
        switch intent {
        case .book:
            return "Skip the booking-site middleman and reserve with the property."
        case .add:
            return "Booking through Guestel helps the property avoid third-party commissions. You get its direct rates, a direct line to the property, and an easier way back."
        case .stay:
            return "You booked directly with the property. Guestel keeps your reservation, messages, and next direct booking together."
        }
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
        if invocation.intent != .book, !hasAutomaticallyPresentedInstall {
            hasAutomaticallyPresentedInstall = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) { presentGetFullApp() }
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
