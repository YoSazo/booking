import SwiftUI
import StripePaymentSheet

// The docked Wallet sheet. Starts showing the hotel's actions with its rooms
// peeking below. Tap Book again (or a room) and the sheet expands to full and
// becomes the booking flow: choose a room → it grows for dates → review → pay.
struct HotelSheet: View {
    let hotel: Hotel
    let maxDetent: PresentationDetent
    @Binding var detent: PresentationDetent
    var onBooked: (_ code: String, _ checkin: String, _ checkout: String) -> Void

    @Environment(GuestStore.self) private var store

    private enum Mode { case actions, chooseRoom, review }

    @State private var mode: Mode = .actions
    @State private var rooms: [BookingAPI.APIRoom] = []
    @State private var rates: BookingAPI.Rates?
    @State private var expandedRoomID: Int?
    @State private var room: BookingAPI.APIRoom?
    @State private var checkin = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
    @State private var checkout = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400 * 3))
    @State private var guest = GuestInfo()
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var paymentSheet: PaymentSheet?
    @State private var showMessaging = false

    private var nights: Int { max(0, Calendar.current.dateComponents([.day], from: checkin, to: checkout).day ?? 0) }
    private var anim: Animation { .interactiveSpring(response: 0.5, dampingFraction: 0.82) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                switch mode {
                case .actions: actions.transition(.opacity)
                case .chooseRoom: chooseRoom.transition(.move(edge: .bottom).combined(with: .opacity))
                case .review: review.transition(.move(edge: .trailing).combined(with: .opacity))
                }
            }
            .padding(20)
        }
        .task {
            guest = store.guest
            if let data = try? await BookingAPI.hotel(hotel.hotelId) {
                rooms = data.rooms
                rates = data.rates
            }
        }
        .sheet(isPresented: $showMessaging) {
            SimpleWebSheet(url: URL(string: "https://\(hotel.domain)/guest/messages")!, title: "Message \(hotel.name)")
        }
    }

    // MARK: Actions (docked)

    private var actions: some View {
        VStack(spacing: 12) {
            Button { goBooking(room: nil) } label: { primaryLabel("Book again") }
            HStack(spacing: 12) {
                Button { showMessaging = true } label: { secondaryLabel("Message", "bubble.left") }
                ShareLink(item: hotel.bookingURL,
                          subject: Text(hotel.name),
                          message: Text("Book \(hotel.name) direct")) {
                    secondaryLabel("Share", "square.and.arrow.up")
                }
            }
            if !rooms.isEmpty {
                VStack(spacing: 12) {
                    ForEach(rooms) { r in
                        RoomCard(room: r, rates: rates)
                            .onTapGesture { goBooking(room: r) }
                    }
                }
                .padding(.top, 10)
            }
        }
    }

    private func goBooking(room r: BookingAPI.APIRoom?) {
        withAnimation(anim) {
            detent = maxDetent
            mode = .chooseRoom
            if let r { expandedRoomID = r.id }
        }
    }

    // MARK: Choose a room → grows for dates

    private var chooseRoom: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Choose a room")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Theme.ink)

            ForEach(rooms) { r in
                VStack(spacing: 0) {
                    RoomCard(room: r, rates: rates)
                        .onTapGesture {
                            withAnimation(anim) { expandedRoomID = (expandedRoomID == r.id ? nil : r.id) }
                        }

                    if expandedRoomID == r.id {
                        VStack(spacing: 12) {
                            DatePicker("Check-in", selection: $checkin, in: Date()..., displayedComponents: .date)
                            Divider()
                            DatePicker("Check-out", selection: $checkout, in: checkoutFloor..., displayedComponents: .date)
                            Text("\(nights) night\(nights == 1 ? "" : "s")")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.inkSoft)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Button {
                                room = r
                                withAnimation(anim) { mode = .review }
                            } label: { primaryLabel("Continue") }
                                .disabled(nights < 1)
                                .opacity(nights < 1 ? 0.5 : 1)
                        }
                        .tint(Theme.green)
                        .padding(14)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.top, 10)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
            }
        }
        .onChange(of: checkin) { _, _ in
            if checkout <= checkin { checkout = Calendar.current.date(byAdding: .day, value: 1, to: checkin)! }
        }
    }

    private var checkoutFloor: Date { Calendar.current.date(byAdding: .day, value: 1, to: checkin)! }

    // MARK: Review + pay

    private var review: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button { withAnimation(anim) { mode = .chooseRoom } } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                    Text("Rooms")
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.green)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text("Review")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Theme.ink)

            VStack(alignment: .leading, spacing: 8) {
                label("bed.double", room?.name ?? "")
                label("calendar", "\(day(checkin)) → \(day(checkout)) · \(nights) night\(nights == 1 ? "" : "s")")
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            if let rates {
                let sub = BookingAPI.subtotal(nights: nights, rates: rates)
                let tax = (sub * rates.taxRate * 100).rounded() / 100
                VStack(spacing: 10) {
                    priceRow("Room", sub)
                    priceRow("Taxes & fees", tax)
                    Divider()
                    HStack {
                        Text("Total at property").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                        Spacer()
                        Text(money(sub + tax)).font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                    }
                }
                .padding(16)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            VStack(spacing: 0) {
                field("Name", $guest.name, .default)
                Divider().padding(.leading, 16)
                field("Email", $guest.email, .emailAddress)
                Divider().padding(.leading, 16)
                field("Phone", $guest.phone, .phonePad)
            }
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            if let errorMessage {
                Text(errorMessage).font(.system(size: 13)).foregroundStyle(.red)
            }

            Button(action: confirmAndPay) {
                if isSubmitting {
                    ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.vertical, 16)
                } else {
                    primaryLabel("Confirm · $1 hold")
                }
            }
            .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .disabled(isSubmitting || !guest.isComplete)
            .opacity(guest.isComplete ? 1 : 0.5)

            Text("Places a $1 hold to confirm the room. You pay the rest at the property.")
                .font(.system(size: 12)).foregroundStyle(Theme.inkSoft)
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }

    // MARK: Payment

    private func confirmAndPay() {
        guard let room else { return }
        isSubmitting = true
        errorMessage = nil
        store.saveGuest(guest)

        let ci = BookingAPI.apiDate.string(from: checkin)
        let co = BookingAPI.apiDate.string(from: checkout)
        let code = BookingAPI.reservationCode()
        let details: [String: Any] = [
            "roomName": room.name, "roomId": room.roomId ?? "",
            "checkin": ci, "checkout": co, "nights": nights,
            "reservationCode": code, "adults": 1, "rooms": 1,
        ]

        Task {
            // Make sure Stripe is keyed to the backend's account before we quote.
            guard await StripeConfig.ensureLoaded() else {
                await MainActor.run { errorMessage = "Payments aren't available right now. Try again in a moment."; isSubmitting = false }
                return
            }
            do {
                let available = try await BookingAPI.availability(hotelId: hotel.hotelId, checkin: ci, checkout: co)
                if !available.isEmpty, !available.contains(room.name) {
                    await MainActor.run { errorMessage = "\(room.name) isn't available for those dates."; isSubmitting = false }
                    return
                }
                let hold = try await BookingAPI.createHold(hotelId: hotel.hotelId, bookingDetails: details, guestInfo: guest.dictionary)
                await MainActor.run { present(hold: hold, details: details, code: code, ci: ci, co: co) }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription; isSubmitting = false }
            }
        }
    }

    private func present(hold: BookingAPI.Hold, details: [String: Any], code: String, ci: String, co: String) {
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = hotel.name
        let sheet = PaymentSheet(paymentIntentClientSecret: hold.clientSecret, configuration: config)
        paymentSheet = sheet
        guard let vc = UIApplication.shared.topViewController() else { isSubmitting = false; return }
        sheet.present(from: vc) { result in
            switch result {
            case .completed:
                Task {
                    do {
                        let confirmed = try await BookingAPI.book(hotelId: hotel.hotelId, bookingDetails: details, guestInfo: guest.dictionary, paymentIntentId: hold.paymentIntentId)
                        await MainActor.run { isSubmitting = false; onBooked(confirmed, ci, co) }
                    } catch {
                        await MainActor.run { errorMessage = "Card held, but confirming failed: \(error.localizedDescription)"; isSubmitting = false }
                    }
                }
            case .canceled:
                isSubmitting = false
            case .failed(let err):
                errorMessage = err.localizedDescription; isSubmitting = false
            }
        }
    }

    // MARK: Bits

    private func primaryLabel(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 17, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func secondaryLabel(_ title: String, _ icon: String) -> some View {
        HStack(spacing: 6) { Image(systemName: icon); Text(title) }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(white: 0.93), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func label(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).foregroundStyle(Theme.green)
            Text(text).foregroundStyle(Theme.inkSoft)
        }.font(.system(size: 14))
    }

    private func priceRow(_ label: String, _ amount: Double) -> some View {
        HStack {
            Text(label).font(.system(size: 14)).foregroundStyle(Theme.inkSoft)
            Spacer()
            Text(money(amount)).font(.system(size: 14)).foregroundStyle(Theme.ink)
        }
    }

    private func field(_ label: String, _ text: Binding<String>, _ keyboard: UIKeyboardType) -> some View {
        HStack {
            Text(label).font(.system(size: 15)).foregroundStyle(Theme.inkSoft).frame(width: 68, alignment: .leading)
            TextField(label, text: text)
                .font(.system(size: 15)).foregroundStyle(Theme.ink)
                .keyboardType(keyboard)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }

    private func money(_ v: Double) -> String { "$" + String(format: "%.2f", v) }

    private func day(_ d: Date) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "MMM d"
        return f.string(from: d)
    }
}

private struct RoomCard: View {
    let room: BookingAPI.APIRoom
    let rates: BookingAPI.Rates?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                Theme.green.opacity(0.10)
                if let url = room.image {
                    AsyncImage(url: url) { img in img.resizable().aspectRatio(contentMode: .fill) } placeholder: { Color.clear }
                }
            }
            .frame(height: 140)
            .clipped()

            VStack(alignment: .leading, spacing: 6) {
                Text(room.name).font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.ink)
                if let a = room.amenities {
                    Text(a).font(.system(size: 12)).foregroundStyle(Theme.inkSoft).lineLimit(2)
                }
                if let rates {
                    Text("from $\(Int(rates.nightly)) / night")
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.green)
                }
            }
            .padding(16)
        }
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.06), radius: 10, x: 0, y: 5)
    }
}
