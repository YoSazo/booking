import SwiftUI
import StripePaymentSheet

// A deliberately short native repeat-booking flow. First-time guests still
// meet the property's full branded engine through the App Clip. Once a hotel
// lives in Guestel, this sheet optimizes the return visit without weakening the
// important decisions: dates + party, a genuinely available room, an exact
// server quote, terms, then Stripe's $1 verification.
struct HotelSheet: View {
    let hotel: Hotel
    let maxDetent: PresentationDetent
    @Binding var detent: PresentationDetent
    var onBooked: (_ result: BookingAPI.BookingResult, _ checkin: String, _ checkout: String, _ roomName: String) -> Void

    @Environment(GuestStore.self) private var store

    private enum Mode { case actions, dates, rooms, review }

    @State private var mode: Mode = .actions
    @State private var hotelData: BookingAPI.HotelPublic?
    @State private var rooms: [BookingAPI.APIRoom] = []
    @State private var rates: BookingAPI.Rates?
    @State private var availableRooms: [BookingAPI.AvailableRoom] = []
    @State private var room: BookingAPI.APIRoom?
    @State private var availableRoom: BookingAPI.AvailableRoom?
    @State private var quote: BookingAPI.BookingQuote?
    @State private var preferredRoomID: Int?
    @State private var checkin = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
    @State private var checkout = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400 * 3))
    @State private var adults = 1
    @State private var pets = 0
    @State private var guest = GuestInfo()
    @State private var isLoading = false
    @State private var quotingRoomID: String?
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var paymentSheet: PaymentSheet?
    @State private var messageStay: Reservation?

    init(
        hotel: Hotel,
        preloadedData: BookingAPI.HotelPublic?,
        maxDetent: PresentationDetent,
        detent: Binding<PresentationDetent>,
        onBooked: @escaping (_ result: BookingAPI.BookingResult, _ checkin: String, _ checkout: String, _ roomName: String) -> Void
    ) {
        self.hotel = hotel
        self.maxDetent = maxDetent
        self._detent = detent
        self.onBooked = onBooked
        self._hotelData = State(initialValue: preloadedData)
        self._rooms = State(initialValue: preloadedData?.rooms ?? [])
        self._rates = State(initialValue: preloadedData?.rates)
    }

    private var nights: Int {
        max(0, Calendar.current.dateComponents([.day], from: checkin, to: checkout).day ?? 0)
    }
    private var anim: Animation { .interactiveSpring(response: 0.5, dampingFraction: 0.82) }
    private var checkoutFloor: Date { Calendar.current.date(byAdding: .day, value: 1, to: checkin)! }
    private var acceptsBookings: Bool { hotelData?.subscribed != false }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                switch mode {
                case .actions: actions.transition(.opacity)
                case .dates: dates.transition(.move(edge: .bottom).combined(with: .opacity))
                case .rooms: chooseRoom.transition(.move(edge: .trailing).combined(with: .opacity))
                case .review: review.transition(.move(edge: .trailing).combined(with: .opacity))
                }
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .task {
            guest = store.guest
            if let cached = store.details(for: hotel.hotelId) {
                hotelData = cached
                rooms = cached.rooms
                rates = cached.rates
            }
            do {
                let data = try await BookingAPI.hotel(hotel.hotelId)
                await MainActor.run {
                    store.cacheHotelDetails(data)
                    hotelData = data
                    rooms = data.rooms
                    rates = data.rates
                }
            } catch {
                if rooms.isEmpty {
                    errorMessage = "This property's rooms couldn't load. Pull down or try again in a moment."
                }
            }
        }
        .sheet(item: $messageStay) { stay in
            NativeMessagesView(hotel: hotel, stay: stay)
        }
    }

    // MARK: - Wallet actions

    private var actions: some View {
        VStack(spacing: 12) {
            if acceptsBookings {
                Button { beginBooking(preferred: nil) } label: { primaryLabel("Book another stay") }
                    .buttonStyle(GuestelPressButtonStyle())
            } else {
                notice("This property is not accepting new direct booking requests right now. Your saved stays and messages remain here.", symbol: "calendar.badge.exclamationmark", color: .orange)
            }
            HStack(spacing: 12) {
                Button { messageStay = currentStay } label: {
                    secondaryLabel("Message hotel", "bubble.left")
                }
                .disabled(currentStay == nil)
                .opacity(currentStay == nil ? 0.58 : 1)

                ShareLink(item: hotel.bookingURL,
                          subject: Text(hotel.name),
                          message: Text("Book \(hotel.name) direct")) {
                    secondaryLabel("Share", "square.and.arrow.up")
                }
            }

            if currentStay == nil {
                Text("Message \(hotel.name) after your first booking. The conversation stays securely attached to your stay.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let errorMessage {
                notice(errorMessage, symbol: "exclamationmark.triangle.fill", color: .orange)
            }

            if !rooms.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("ROOMS")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Theme.inkSoft)
                    ForEach(rooms) { candidate in
                        RoomCard(room: candidate, rates: rates, nights: nil, roomsAvailable: nil)
                            .opacity(acceptsBookings ? 1 : 0.64)
                            .onTapGesture { if acceptsBookings { beginBooking(preferred: candidate) } }
                    }
                }
                .padding(.top, 10)
            }
        }
    }

    private func beginBooking(preferred: BookingAPI.APIRoom?) {
        guard acceptsBookings else {
            errorMessage = "This property is not accepting new direct booking requests right now."
            return
        }
        preferredRoomID = preferred?.id
        errorMessage = nil
        withAnimation(anim) {
            detent = maxDetent
            mode = .dates
        }
    }

    // MARK: - Dates and party

    private var dates: some View {
        VStack(alignment: .leading, spacing: 16) {
            backButton("Hotel") { mode = .actions }
            sectionTitle("When are you staying?", detail: "We'll only show rooms available for your whole stay.")

            VStack(spacing: 0) {
                DatePicker("Check-in", selection: $checkin, in: Date()..., displayedComponents: .date)
                    .padding(16)
                Divider().padding(.leading, 16)
                DatePicker("Check-out", selection: $checkout, in: checkoutFloor..., displayedComponents: .date)
                    .padding(16)
            }
            .tint(Theme.green)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            VStack(spacing: 0) {
                stepper("Guests", value: $adults, range: 1...12, symbol: "person.2.fill")
                Divider().padding(.leading, 50)
                stepper("Pets", value: $pets, range: 0...4, symbol: "pawprint.fill")
            }
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            if let errorMessage { notice(errorMessage, symbol: "exclamationmark.circle.fill", color: .red) }

            Button(action: searchAvailability) {
                primaryLabel(isLoading ? "Checking rooms…" : "See available rooms", loading: isLoading)
            }
            .buttonStyle(GuestelPressButtonStyle())
            .disabled(isLoading || nights < 1)
            .opacity(nights < 1 ? 0.5 : 1)
        }
        .onChange(of: checkin) { _, _ in
            if checkout <= checkin { checkout = checkoutFloor }
        }
    }

    private func searchAvailability() {
        guard acceptsBookings else {
            errorMessage = "This property is not accepting new direct booking requests right now."
            return
        }
        guard nights > 0 else { return }
        isLoading = true
        errorMessage = nil
        let ci = BookingAPI.apiDate.string(from: checkin)
        let co = BookingAPI.apiDate.string(from: checkout)
        Task {
            do {
                var found = try await BookingAPI.availability(hotelId: hotel.hotelId, checkin: ci, checkout: co)
                found = found.filter { candidate in
                    guard let catalog = catalogRoom(for: candidate), let max = catalog.maxOccupancy else { return true }
                    return adults <= max
                }
                if let preferredRoomID,
                   let preferred = rooms.first(where: { $0.id == preferredRoomID }) {
                    found.sort { left, right in
                        let l = roomMatches(left, preferred)
                        let r = roomMatches(right, preferred)
                        return l && !r
                    }
                }
                await MainActor.run {
                    availableRooms = found
                    isLoading = false
                    if found.isEmpty {
                        errorMessage = adults > 1
                            ? "No room fits \(adults) guests for all of those nights. Try different dates or fewer guests."
                            : "No rooms are available for all of those nights. Try different dates."
                    } else {
                        withAnimation(anim) { mode = .rooms }
                    }
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription; isLoading = false }
            }
        }
    }

    // MARK: - Available rooms

    private var chooseRoom: some View {
        VStack(alignment: .leading, spacing: 14) {
            backButton("Dates") { mode = .dates }
            sectionTitle(
                "Choose your room",
                detail: "\(day(checkin)) – \(day(checkout)) · \(nights) night\(nights == 1 ? "" : "s") · \(adults) guest\(adults == 1 ? "" : "s")"
            )

            ForEach(availableRooms, id: \.self) { availability in
                if let catalog = catalogRoom(for: availability) {
                    Button { select(catalog, availability: availability) } label: {
                        RoomCard(
                            room: catalog,
                            rates: rates,
                            nights: nights,
                            roomsAvailable: availability.roomsAvailable,
                            loading: quotingRoomID == availability.roomTypeID
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(quotingRoomID != nil)
                }
            }

            if let errorMessage { notice(errorMessage, symbol: "exclamationmark.circle.fill", color: .red) }
        }
    }

    private func select(_ candidate: BookingAPI.APIRoom, availability: BookingAPI.AvailableRoom) {
        quotingRoomID = availability.roomTypeID
        errorMessage = nil
        let ci = BookingAPI.apiDate.string(from: checkin)
        let co = BookingAPI.apiDate.string(from: checkout)
        Task {
            do {
                let exact = try await BookingAPI.quote(
                    hotelId: hotel.hotelId,
                    roomName: candidate.name,
                    roomId: availability.roomId.isEmpty ? candidate.roomId : availability.roomId,
                    roomTypeID: availability.roomTypeID,
                    rateID: availability.rateID,
                    checkin: ci,
                    checkout: co
                )
                await MainActor.run {
                    room = candidate
                    availableRoom = availability
                    quote = exact
                    quotingRoomID = nil
                    withAnimation(anim) { mode = .review }
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription; quotingRoomID = nil }
            }
        }
    }

    // MARK: - Review and payment

    private var review: some View {
        VStack(alignment: .leading, spacing: 16) {
            backButton("Rooms") { mode = .rooms }
            sectionTitle("Review your request", detail: "Nothing is charged today.")

            VStack(alignment: .leading, spacing: 11) {
                Text(hotel.name)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.ink)
                label("bed.double.fill", room?.name ?? "")
                label("calendar", "\(day(checkin)) – \(day(checkout)) · \(nights) night\(nights == 1 ? "" : "s")")
                label("person.2.fill", partyDescription)
                if let address = hotelData?.address, !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    label("mappin.and.ellipse", address)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            if let quote {
                VStack(spacing: 10) {
                    priceRow("Room · \(quote.nights) night\(quote.nights == 1 ? "" : "s")", quote.subtotal)
                    priceRow("Taxes & fees", quote.taxes)
                    Divider()
                    HStack {
                        Text("Due at property").font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.ink)
                        Spacer()
                        Text(money(quote.total)).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.ink)
                    }
                }
                .padding(16)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }

            VStack(spacing: 0) {
                field("Name", $guest.name, .default)
                Divider().padding(.leading, 16)
                field("Email", $guest.email, .emailAddress)
                Divider().padding(.leading, 16)
                field("Phone", $guest.phone, .phonePad)
            }
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            terms

            if let errorMessage { notice(errorMessage, symbol: "exclamationmark.circle.fill", color: .red) }

            Button(action: confirmAndPay) {
                primaryLabel(isSubmitting ? "Opening secure payment…" : "Verify card & send request", loading: isSubmitting)
            }
            .buttonStyle(GuestelPressButtonStyle())
            .disabled(isSubmitting || !guest.isComplete || quote == nil)
            .opacity(guest.isComplete && quote != nil ? 1 : 0.5)

            HStack(spacing: 6) {
                Image(systemName: "lock.fill")
                Text("Secure $1 temporary card verification · processed by Stripe")
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Theme.inkSoft)
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }

    private var terms: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("HOW THIS WORKS")
                .font(.system(size: 11, weight: .heavy))
                .tracking(0.8)
                .foregroundStyle(Theme.green)
            term("creditcard.fill", "$1 verification only", "A temporary $1 authorization verifies the card. It isn't the room payment.")
            term("building.2.fill", "Pay at the property", "The stay total is due directly to \(hotel.name).")
            term("checkmark.message.fill", "The property confirms", "Guestel will show whether the request is confirmed and keep Front Desk replies with your stay.")

            if let policy = hotelData?.cancellationPolicy?.trimmingCharacters(in: .whitespacesAndNewlines), !policy.isEmpty {
                Divider()
                Text("Good to know")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ink)
                Text(policy)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }

            let checkIn = hotelData?.checkInTime?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let checkOut = hotelData?.checkOutTime?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !checkIn.isEmpty || !checkOut.isEmpty {
                Divider()
                Text([!checkIn.isEmpty ? "Check-in \(checkIn)" : nil, !checkOut.isEmpty ? "Check-out \(checkOut)" : nil]
                    .compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.inkSoft)
            }
        }
        .padding(16)
        .background(Theme.green.opacity(0.075), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    // MARK: - Payment

    private func confirmAndPay() {
        guard acceptsBookings else {
            errorMessage = "This property is not accepting new direct booking requests right now."
            return
        }
        guard let room, availableRoom != nil, quote != nil else { return }
        isSubmitting = true
        errorMessage = nil
        store.saveGuest(guest)

        let ci = BookingAPI.apiDate.string(from: checkin)
        let co = BookingAPI.apiDate.string(from: checkout)
        let code = BookingAPI.reservationCode()

        Task {
            guard await StripeConfig.ensureLoaded() else {
                await MainActor.run {
                    errorMessage = "Payments aren't available right now. Try again in a moment."
                    isSubmitting = false
                }
                return
            }
            do {
                // Availability and price are both refreshed immediately before
                // the hold. The backend still performs the transactional final
                // inventory check when the booking is written.
                let available = try await BookingAPI.availability(hotelId: hotel.hotelId, checkin: ci, checkout: co)
                guard let match = available.first(where: { roomMatches($0, room) }) else {
                    await MainActor.run {
                        errorMessage = "\(room.name) was just taken for one of those nights. Choose another room or dates."
                        isSubmitting = false
                        mode = .rooms
                    }
                    return
                }
                let freshQuote = try await BookingAPI.quote(
                    hotelId: hotel.hotelId,
                    roomName: room.name,
                    roomId: match.roomId.isEmpty ? room.roomId : match.roomId,
                    roomTypeID: match.roomTypeID,
                    rateID: match.rateID,
                    checkin: ci,
                    checkout: co
                )
                if let displayed = quote, displayed.totalCents != freshQuote.totalCents {
                    await MainActor.run {
                        quote = freshQuote
                        availableRoom = match
                        errorMessage = "The property updated this stay's price. Review the new total before continuing."
                        isSubmitting = false
                    }
                    return
                }

                let details: [String: Any] = [
                    "roomName": room.name,
                    "roomId": match.roomId.isEmpty ? (room.roomId ?? "") : match.roomId,
                    "roomTypeID": match.roomTypeID,
                    "rateID": match.rateID,
                    "checkin": ci,
                    "checkout": co,
                    "nights": freshQuote.nights,
                    "reservationCode": code,
                    "adults": adults,
                    "guests": adults,
                    "pets": pets,
                    "rooms": 1,
                    "subtotal": freshQuote.subtotal,
                    "taxes": freshQuote.taxes,
                    "total": freshQuote.total,
                    "totalCents": freshQuote.totalCents,
                ]
                let savedCardToken = GuestPaymentAccess.token
                let hold = try await BookingAPI.createHold(
                    hotelId: hotel.hotelId,
                    bookingDetails: details,
                    guestInfo: guest.dictionary,
                    stripeApiVersion: STPAPIClient.apiVersion,
                    customerToken: savedCardToken
                )
                if savedCardToken != nil, hold.paymentCustomer == nil { GuestPaymentAccess.clear() }
                await MainActor.run {
                    present(hold: hold, details: details, ci: ci, co: co, customer: hold.paymentCustomer)
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription; isSubmitting = false }
            }
        }
    }

    private var currentStay: Reservation? {
        store.reservation(for: hotel.hotelId)
    }

    private func present(
        hold: BookingAPI.Hold,
        details: [String: Any],
        ci: String,
        co: String,
        customer: BookingAPI.PaymentCustomer?
    ) {
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = hotel.name
        if let customer {
            config.customer = .init(id: customer.customerId, ephemeralKeySecret: customer.ephemeralKey)
        }
        let sheet = PaymentSheet(paymentIntentClientSecret: hold.clientSecret, configuration: config)
        paymentSheet = sheet
        guard let vc = UIApplication.shared.topViewController() else { isSubmitting = false; return }
        sheet.present(from: vc) { result in
            switch result {
            case .completed:
                Task {
                    do {
                        let result = try await BookingAPI.completePayLater(
                            hotelId: hotel.hotelId,
                            bookingDetails: details,
                            guestInfo: guest.dictionary,
                            paymentIntentId: hold.paymentIntentId
                        )
                        await MainActor.run {
                            isSubmitting = false
                            onBooked(result, ci, co, room?.name ?? "")
                        }
                    } catch {
                        await MainActor.run {
                            errorMessage = "Card verified, but the booking could not finish: \(error.localizedDescription)"
                            isSubmitting = false
                        }
                    }
                }
            case .canceled:
                isSubmitting = false
            case .failed(let error):
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }

    // MARK: - Helpers

    private var partyDescription: String {
        let guestPart = "\(adults) guest\(adults == 1 ? "" : "s")"
        return pets > 0 ? "\(guestPart) · \(pets) pet\(pets == 1 ? "" : "s")" : guestPart
    }

    private func catalogRoom(for availability: BookingAPI.AvailableRoom) -> BookingAPI.APIRoom? {
        rooms.first { roomMatches(availability, $0) }
    }

    private func roomMatches(_ availability: BookingAPI.AvailableRoom, _ catalog: BookingAPI.APIRoom) -> Bool {
        if !availability.roomId.isEmpty, let id = catalog.roomId, !id.isEmpty {
            return availability.roomId == id
        }
        return availability.name.caseInsensitiveCompare(catalog.name) == .orderedSame
    }

    private func primaryLabel(_ title: String, loading: Bool = false) -> some View {
        HStack(spacing: 9) {
            if loading { ProgressView().tint(.white) }
            Text(title)
        }
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

    private func backButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button {
            errorMessage = nil
            withAnimation(anim) { action() }
        } label: {
            HStack(spacing: 4) { Image(systemName: "chevron.left"); Text(title) }
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.green)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func sectionTitle(_ title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.system(size: 24, weight: .bold)).foregroundStyle(Theme.ink)
            Text(detail).font(.system(size: 14)).foregroundStyle(Theme.inkSoft)
        }
    }

    private func stepper(_ title: String, value: Binding<Int>, range: ClosedRange<Int>, symbol: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).foregroundStyle(Theme.green).frame(width: 22)
            Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink)
            Spacer()
            Stepper("", value: value, in: range)
                .labelsHidden()
            Text("\(value.wrappedValue)")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Theme.ink)
                .frame(width: 22)
        }
        .padding(16)
    }

    private func label(_ icon: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon).foregroundStyle(Theme.green).frame(width: 18)
            Text(text).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
        }
        .font(.system(size: 14))
    }

    private func term(_ icon: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.green).frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.ink)
                Text(detail).font(.system(size: 12)).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func notice(_ text: String, symbol: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: symbol).foregroundStyle(color)
            Text(text).font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.ink)
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func priceRow(_ title: String, _ amount: Double) -> some View {
        HStack {
            Text(title).font(.system(size: 14)).foregroundStyle(Theme.inkSoft)
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
                .textContentType(keyboard == .emailAddress ? .emailAddress : (keyboard == .phonePad ? .telephoneNumber : .name))
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }

    private func money(_ value: Double) -> String { "$" + String(format: "%.2f", value) }

    private func day(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

private struct RoomCard: View {
    let room: BookingAPI.APIRoom
    let rates: BookingAPI.Rates?
    let nights: Int?
    let roomsAvailable: Int?
    var loading = false

    private var estimatedTotal: Double? {
        guard let nights, let rates else { return nil }
        let subtotal = BookingAPI.subtotal(nights: nights, rates: rates)
        return ((subtotal + subtotal * rates.taxRate) * 100).rounded() / 100
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            gallery
                .frame(height: 166)
                .clipped()

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(room.name).font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.ink)
                    Spacer()
                    if loading { ProgressView().tint(Theme.green) }
                }

                if let description = room.description?.trimmingCharacters(in: .whitespacesAndNewlines), !description.isEmpty {
                    Text(description)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(spacing: 10) {
                    if let max = room.maxOccupancy {
                        detail("person.2.fill", "Up to \(max)")
                    }
                    if let roomsAvailable {
                        detail("door.left.hand.open", "\(roomsAvailable) left")
                    }
                }

                if let amenities = room.amenities?.trimmingCharacters(in: .whitespacesAndNewlines), !amenities.isEmpty {
                    Text(amenities)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(2)
                }

                if let estimatedTotal, let nights {
                    HStack {
                        Text("\(nights) night\(nights == 1 ? "" : "s"), taxes included")
                            .font(.system(size: 12)).foregroundStyle(Theme.inkSoft)
                        Spacer()
                        Text("\(money(estimatedTotal)) total")
                            .font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.green)
                    }
                } else if let rates {
                    Text("From $\(Int(rates.nightly)) / night")
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.green)
                }
            }
            .padding(16)
        }
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.06), radius: 10, x: 0, y: 5)
    }

    @ViewBuilder
    private var gallery: some View {
        if room.images.isEmpty {
            ZStack {
                Theme.green.opacity(0.10)
                Image(systemName: "bed.double.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(Theme.green.opacity(0.55))
            }
        } else {
            TabView {
                ForEach(room.images, id: \.absoluteString) { url in
                    CachedRemoteImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Theme.green.opacity(0.10)
                    }
                }
            }
            .tabViewStyle(.page(indexDisplayMode: room.images.count > 1 ? .automatic : .never))
        }
    }

    private func detail(_ symbol: String, _ title: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: symbol)
            Text(title)
        }
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(Theme.inkSoft)
    }

    private func money(_ value: Double) -> String { "$" + String(format: "%.2f", value) }
}
