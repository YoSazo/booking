import SwiftUI
import StripePaymentSheet

// Native rebooking: room → dates → review → $1 hold via Stripe → confirmed.
// First bookings can still use the web engine; this is the fast repeat path.
struct RebookView: View {
    let hotel: Hotel
    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private enum Stage { case loading, rooms, dates, review, done }

    @State private var stage: Stage = .loading
    @State private var data: BookingAPI.HotelPublic?
    @State private var room: BookingAPI.APIRoom?
    @State private var checkin = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
    @State private var checkout = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400 * 3))
    @State private var guest = GuestInfo()
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var confirmationCode: String?
    @State private var bookingResult: BookingAPI.BookingResult?
    @State private var pendingIntentId: String?
    @State private var paymentSheet: PaymentSheet?

    private var nights: Int {
        max(0, Calendar.current.dateComponents([.day], from: checkin, to: checkout).day ?? 0)
    }

    // The returning-guest rate for this property, when the owner has a live offer.
    private var returnNightly: Double? {
        guard let rates = data?.rates else { return nil }
        return data?.returnRate(nightly: rates.nightly)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.canvas.ignoresSafeArea()
                switch stage {
                case .loading: ProgressView().tint(Theme.green)
                case .rooms:   roomsStage
                case .dates:   datesStage
                case .review:  reviewStage
                case .done:    doneStage
                }
            }
            .navigationTitle(navTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if stage == .dates { Button("Rooms") { stage = .rooms } }
                    else if stage == .review { Button("Dates") { stage = .dates } }
                    else if stage != .done { Button("Cancel") { dismiss() } }
                }
            }
        }
        .task { await load() }
    }

    private var navTitle: String {
        switch stage {
        case .rooms: return "Choose a room"
        case .dates: return "Your dates"
        case .review: return "Review"
        case .done: return ""
        default: return hotel.name
        }
    }

    // MARK: Rooms

    private var roomsStage: some View {
        ScrollView {
            VStack(spacing: 16) {
                if data?.subscribed == false {
                    ContentUnavailableView(
                        "Direct booking unavailable",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("This property is not accepting new direct booking requests right now. Your saved stay and messages remain in Guestel.")
                    )
                } else {
                    ForEach(data?.rooms ?? []) { r in
                        Button { room = r; stage = .dates } label: { RoomCard(room: r, rates: data?.rates) }
                            .buttonStyle(.plain)
                    }
                }
            }
            .padding(20)
        }
    }

    // MARK: Dates

    private var datesStage: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(spacing: 4) {
                    DatePicker("Check-in", selection: $checkin, in: Date()..., displayedComponents: .date)
                        .padding(.vertical, 6)
                    Divider()
                    DatePicker("Check-out", selection: $checkout, in: checkoutFloor..., displayedComponents: .date)
                        .padding(.vertical, 6)
                }
                .tint(Theme.green)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                Text("\(nights) night\(nights == 1 ? "" : "s")")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.inkSoft)

                Button { stage = .review } label: { primaryLabel("Continue") }
                    .disabled(nights < 1)
                    .opacity(nights < 1 ? 0.5 : 1)
            }
            .padding(20)
        }
        .onChange(of: checkin) { _, _ in
            if checkout <= checkin { checkout = Calendar.current.date(byAdding: .day, value: 1, to: checkin)! }
        }
    }

    private var checkoutFloor: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: checkin)!
    }

    // MARK: Review

    private var reviewStage: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                summaryCard
                if let returnNightly, let rates = data?.rates {
                    returnOfferBadge(returnNightly: returnNightly, normalNightly: rates.nightly)
                }
                priceCard
                guestCard
                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 13))
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                Button(action: confirmAndPay) {
                    if isSubmitting { ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.vertical, 16) }
                    else { primaryLabel("Confirm · $1 hold") }
                }
                .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .disabled(isSubmitting || !guest.isComplete)
                .opacity(guest.isComplete ? 1 : 0.5)

                Text("Places a $1 hold to confirm the room. You pay the rest at the property.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(20)
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(hotel.name).font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.ink)
            HStack(spacing: 6) {
                Image(systemName: "bed.double").foregroundStyle(Theme.green)
                Text(room?.name ?? "").foregroundStyle(Theme.inkSoft)
            }.font(.system(size: 14))
            HStack(spacing: 6) {
                Image(systemName: "calendar").foregroundStyle(Theme.green)
                Text("\(dayLabel(checkin)) → \(dayLabel(checkout)) · \(nights) night\(nights == 1 ? "" : "s")")
                    .foregroundStyle(Theme.inkSoft)
            }.font(.system(size: 14))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func returnOfferBadge(returnNightly: Double, normalNightly: Double) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles").font(.system(size: 16)).foregroundStyle(Theme.green)
            VStack(alignment: .leading, spacing: 2) {
                Text("Returning-guest rate")
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.ink)
                Text("$\(Int(returnNightly.rounded()))/night · normally $\(Int(normalNightly.rounded()))")
                    .font(.system(size: 12)).foregroundStyle(Theme.inkSoft)
                Text("This offer is attached to your request. \(hotel.name) applies it when you pay at the property.")
                    .font(.system(size: 11)).foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.green.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Theme.green.opacity(0.25), lineWidth: 1)
        )
    }

    @ViewBuilder private var priceCard: some View {
        if let rates = data?.rates {
            let subtotal = BookingAPI.subtotal(nights: nights, rates: rates)
            let tax = (subtotal * rates.taxRate * 100).rounded() / 100
            VStack(spacing: 10) {
                priceRow("Room", subtotal)
                priceRow("Taxes & fees", tax)
                Divider()
                HStack {
                    Text("Total at property").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                    Spacer()
                    Text(money(subtotal + tax)).font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                }
            }
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    private var guestCard: some View {
        VStack(spacing: 0) {
            field("Name", text: $guest.name, keyboard: .default)
            Divider().padding(.leading, 16)
            field("Email", text: $guest.email, keyboard: .emailAddress)
            Divider().padding(.leading, 16)
            field("Phone", text: $guest.phone, keyboard: .phonePad)
        }
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func field(_ label: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
        HStack {
            Text(label).font(.system(size: 15)).foregroundStyle(Theme.inkSoft).frame(width: 68, alignment: .leading)
            TextField(label, text: text)
                .font(.system(size: 15))
                .foregroundStyle(Theme.ink)
                .keyboardType(keyboard)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    // MARK: Done

    private var doneStage: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 56)).foregroundStyle(Theme.green)
            Text(bookingResult?.pending == true ? "Request received" : "You're booked")
                .font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.ink)
            Text("\(hotel.name) · \(dayLabel(checkin)) → \(dayLabel(checkout))")
                .font(.system(size: 15)).foregroundStyle(Theme.inkSoft).multilineTextAlignment(.center)
            if let bookingResult, !bookingResult.message.isEmpty {
                Text(bookingResult.message)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
            }
            if let confirmationCode {
                Text("#\(confirmationCode)").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.green)
            }
            Button { dismiss() } label: { primaryLabel("Done").background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous)) }
                .padding(.top, 8)
                .padding(.horizontal, 40)
        }
        .padding(30)
    }

    // MARK: Actions

    private func load() async {
        guest = store.guest
        do {
            let d = try await BookingAPI.hotel(hotel.hotelId)
            await MainActor.run {
                store.cacheHotelDetails(d)
                data = d
                stage = .rooms
            }
        } catch {
            await MainActor.run { errorMessage = "Couldn't load rooms."; stage = .rooms }
        }
    }

    private func confirmAndPay() {
        guard data?.subscribed != false, let room else {
            errorMessage = "This property is not accepting new direct booking requests right now."
            return
        }
        isSubmitting = true
        errorMessage = nil
        store.saveGuest(guest)

        let ci = BookingAPI.apiDate.string(from: checkin)
        let co = BookingAPI.apiDate.string(from: checkout)
        let code = BookingAPI.reservationCode()
        let baseDetails: [String: Any] = [
            "roomName": room.name, "roomId": room.roomId ?? "",
            "checkin": ci, "checkout": co, "nights": nights,
            "reservationCode": code, "adults": 1, "rooms": 1,
            // Attribute the Guestel rebooking loop + record offer redemption.
            "source": "rebook", "returnOfferApplied": returnNightly != nil,
        ]

        Task {
            guard await StripeConfig.ensureLoaded() else {
                await MainActor.run { errorMessage = "Payments aren't available right now. Try again in a moment."; isSubmitting = false }
                return
            }
            do {
                let available = try await BookingAPI.availability(hotelId: hotel.hotelId, checkin: ci, checkout: co)
                guard let match = available.first(where: { $0.name.caseInsensitiveCompare(room.name) == .orderedSame }) else {
                    await MainActor.run { errorMessage = "\(room.name) isn't available for those dates."; isSubmitting = false }
                    return
                }
                var details = baseDetails
                details["roomId"] = match.roomId.isEmpty ? (room.roomId ?? "") : match.roomId
                details["roomTypeID"] = match.roomTypeID
                details["rateID"] = match.rateID
                let savedCardToken = GuestPaymentAccess.token
                let hold = try await BookingAPI.createHold(
                    hotelId: hotel.hotelId,
                    bookingDetails: details,
                    guestInfo: guest.dictionary,
                    stripeApiVersion: STPAPIClient.apiVersion,
                    customerToken: savedCardToken
                )
                if savedCardToken != nil, hold.paymentCustomer == nil {
                    GuestPaymentAccess.clear()
                }
                await MainActor.run {
                    presentPayment(
                        clientSecret: hold.clientSecret,
                        intentId: hold.paymentIntentId,
                        details: details,
                        code: code,
                        ci: ci,
                        co: co,
                        customer: hold.paymentCustomer
                    )
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription; isSubmitting = false }
            }
        }
    }

    private func presentPayment(clientSecret: String, intentId: String, details: [String: Any], code: String, ci: String, co: String, customer: BookingAPI.PaymentCustomer?) {
        pendingIntentId = intentId
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = hotel.name
        if let customer {
            config.customer = .init(id: customer.customerId, ephemeralKeySecret: customer.ephemeralKey)
        }
        let sheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config)
        paymentSheet = sheet
        guard let vc = UIApplication.shared.topViewController() else { isSubmitting = false; return }
        sheet.present(from: vc) { result in
            switch result {
            case .completed:
                Task {
                    do {
                        let result = try await BookingAPI.completePayLater(hotelId: hotel.hotelId, bookingDetails: details, guestInfo: guest.dictionary, paymentIntentId: intentId)
                        await MainActor.run {
                            store.addReservation(
                                code: result.reservationCode,
                                hotelId: hotel.hotelId,
                                checkin: ci,
                                checkout: co,
                                status: result.pending ? "pending" : "confirmed",
                                accessToken: result.reservationToken
                            )
                            confirmationCode = result.reservationCode
                            bookingResult = result
                            isSubmitting = false
                            stage = .done
                        }
                    } catch {
                        await MainActor.run { errorMessage = "Card held, but confirming failed: \(error.localizedDescription)"; isSubmitting = false }
                    }
                }
            case .canceled:
                isSubmitting = false
            case .failed(let err):
                errorMessage = err.localizedDescription
                isSubmitting = false
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

    private func priceRow(_ label: String, _ amount: Double) -> some View {
        HStack {
            Text(label).font(.system(size: 14)).foregroundStyle(Theme.inkSoft)
            Spacer()
            Text(money(amount)).font(.system(size: 14)).foregroundStyle(Theme.ink)
        }
    }

    private func money(_ v: Double) -> String { "$" + String(format: "%.2f", v) }

    private func dayLabel(_ d: Date) -> String {
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
                    CachedRemoteImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: { Color.clear }
                }
            }
            .frame(height: 150)
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
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.06), radius: 12, x: 0, y: 6)
    }
}

extension UIApplication {
    func topViewController() -> UIViewController? {
        let window = connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
        var top = window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
