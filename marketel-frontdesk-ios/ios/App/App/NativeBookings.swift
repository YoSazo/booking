import SwiftUI
import Combine
import UIKit

private enum MarketelBookingFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case pending = "Needs review"
    case upcoming = "Upcoming"
    var id: String { rawValue }
}

private enum MarketelBookingsSection: String, CaseIterable, Identifiable {
    case bookings = "Bookings"
    case revenue = "Revenue"
    var id: String { rawValue }
}

@MainActor
private final class MarketelBookingsModel: ObservableObject {
    @Published var bookings: [MarketelBooking] = []
    @Published var conflicts: [MarketelConflict] = []
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var workingBookingID: String?
    @Published var revenue: MarketelRevenue?
    @Published var revenueLoading = false
    @Published var revenueError: String?

    let api: MarketelNativeAPI
    let onDataChanged: () -> Void

    init(api: MarketelNativeAPI, onDataChanged: @escaping () -> Void) {
        self.api = api
        self.onDataChanged = onDataChanged
    }

    func load(silent: Bool = false) async {
        if !silent { isLoading = bookings.isEmpty }
        do {
            async let bookingRequest: MarketelBookingEnvelope = api.request("/api/crm/bookings")
            async let conflictRequest: MarketelConflictsEnvelope = api.request("/api/crm/conflicts")
            let (bookingResult, conflictResult) = try await (bookingRequest, conflictRequest)
            guard bookingResult.success else {
                throw MarketelNativeAPIError.message(bookingResult.message ?? "Could not load bookings.")
            }
            bookings = bookingResult.data
            conflicts = conflictResult.success ? conflictResult.conflicts : []
            errorMessage = nil
        } catch {
            if !silent || bookings.isEmpty { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func decide(_ booking: MarketelBooking, action: String) async throws {
        workingBookingID = booking.id
        defer { workingBookingID = nil }
        let encoded = booking.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? booking.id
        let response: MarketelActionEnvelope = try await api.request(
            "/api/crm/bookings/\(encoded)/approval",
            method: "POST",
            body: ["action": action]
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not apply that decision.")
        }
        await load(silent: true)
        onDataChanged()
    }

    func saveNote(_ booking: MarketelBooking, note: String) async throws {
        workingBookingID = booking.id
        defer { workingBookingID = nil }
        let encoded = booking.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? booking.id
        let response: MarketelActionEnvelope = try await api.request(
            "/api/crm/bookings/\(encoded)/note",
            method: "POST",
            body: ["note": note]
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not save that note.")
        }
        await load(silent: true)
        onDataChanged()
    }

    func cancel(_ booking: MarketelBooking, reason: String) async throws {
        workingBookingID = booking.id
        defer { workingBookingID = nil }
        let response: MarketelActionEnvelope = try await api.request(
            "/api/crm/bookings/cancel",
            method: "POST",
            body: ["id": booking.id, "reason": reason]
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not cancel that booking.")
        }
        await load(silent: true)
        onDataChanged()
    }

    func addWalkIn(_ payload: [String: Any]) async throws {
        let response: MarketelActionEnvelope = try await api.request(
            "/api/crm/bookings",
            method: "POST",
            body: payload
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not add that walk-in.")
        }
        await load(silent: true)
        onDataChanged()
    }

    func loadRevenue(period: String, start: Date?, end: Date?) async {
        revenueLoading = true
        revenueError = nil
        var path = "/api/crm/revenue?period=\(period)"
        if period == "custom", let start, let end {
            let first = min(start, end)
            let second = max(start, end)
            path += "&startDate=\(MarketelNativeFormat.apiDay.string(from: first))"
            path += "&endDate=\(MarketelNativeFormat.apiDay.string(from: second))"
        }
        do {
            let response: MarketelRevenueEnvelope = try await api.request(path)
            guard response.success, let value = response.data else {
                throw MarketelNativeAPIError.message(response.message ?? "Could not load revenue.")
            }
            revenue = value
        } catch {
            revenueError = error.localizedDescription
        }
        revenueLoading = false
    }
}

struct MarketelNativeBookingsView: View {
    @ObservedObject var session: MarketelNativeSession
    @StateObject private var model: MarketelBookingsModel
    @State private var section: MarketelBookingsSection = .bookings
    @State private var filter: MarketelBookingFilter = .all
    @State private var selectedBooking: MarketelBooking?
    @State private var showingWalkIn = false
    @State private var actionError: String?
    let onAssistantVisibility: (Bool) -> Void
    let onOpenWebFallback: () -> Void

    init(
        session: MarketelNativeSession,
        origin: URL,
        onDataChanged: @escaping () -> Void,
        onAssistantVisibility: @escaping (Bool) -> Void,
        onOpenWebFallback: @escaping () -> Void
    ) {
        self.session = session
        self.onAssistantVisibility = onAssistantVisibility
        self.onOpenWebFallback = onOpenWebFallback
        _model = StateObject(wrappedValue: MarketelBookingsModel(
            api: MarketelNativeAPI(origin: origin, hotelId: session.hotelId, authToken: session.authToken),
            onDataChanged: onDataChanged
        ))
    }

    private var filteredBookings: [MarketelBooking] {
        switch filter {
        case .all: return model.bookings
        case .pending:
            return model.bookings.filter { $0.isPending || ($0.ownerReviewStatus ?? "").lowercased() == "unreviewed" }
        case .upcoming:
            let today = Calendar.current.startOfDay(for: Date())
            return model.bookings.filter { booking in
                guard let checkin = MarketelNativeFormat.date(booking.checkinDate) else { return false }
                return checkin >= today && !booking.isPending
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Bookings section", selection: $section) {
                Text(MarketelBookingsSection.bookings.rawValue).tag(MarketelBookingsSection.bookings)
                if session.isManualPMS {
                    Text(MarketelBookingsSection.revenue.rawValue).tag(MarketelBookingsSection.revenue)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 10)

            if section == .bookings { bookingContent }
            else { MarketelRevenueView(model: model) }
        }
        .background(MarketelNativeTheme.canvas)
        .onChange(of: section) { value in onAssistantVisibility(value == .bookings) }
        .onAppear { onAssistantVisibility(section == .bookings) }
        .onDisappear { onAssistantVisibility(false) }
        .task { await model.load() }
        .task(id: session.refreshGeneration) { await model.load(silent: !model.bookings.isEmpty) }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 12_000_000_000)
                guard !Task.isCancelled else { return }
                await model.load(silent: true)
            }
        }
        .sheet(item: $selectedBooking) { booking in
            MarketelBookingDetailView(booking: booking, model: model, actionError: $actionError)
        }
        .sheet(isPresented: $showingWalkIn) {
            MarketelWalkInView(api: model.api) { payload in try await model.addWalkIn(payload) }
        }
        .alert("Front Desk", isPresented: Binding(
            get: { actionError != nil },
            set: { if !$0 { actionError = nil } }
        )) {
            Button("OK", role: .cancel) { actionError = nil }
        } message: { Text(actionError ?? "") }
    }

    @ViewBuilder
    private var bookingContent: some View {
        if model.isLoading && model.bookings.isEmpty {
            ProgressView("Loading bookings…")
                .tint(MarketelNativeTheme.green)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = model.errorMessage, model.bookings.isEmpty {
            MarketelNativeErrorView(message: error, retry: { Task { await model.load() } }, openWeb: onOpenWebFallback)
        } else {
            ScrollView {
                LazyVStack(spacing: 12) {
                    HStack {
                        Menu {
                            ForEach(MarketelBookingFilter.allCases) { item in
                                Button {
                                    filter = item
                                } label: {
                                    if filter == item { Label(item.rawValue, systemImage: "checkmark") }
                                    else { Text(item.rawValue) }
                                }
                            }
                        } label: {
                            Label(filter.rawValue, systemImage: "line.3.horizontal.decrease.circle")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        Spacer()
                        Button { showingWalkIn = true } label: {
                            Label("Walk-in", systemImage: "plus")
                                .font(.system(size: 14, weight: .bold))
                        }
                    }
                    .padding(.bottom, 2)

                    if !model.conflicts.isEmpty {
                        MarketelConflictBanner(conflicts: model.conflicts)
                    }

                    if filteredBookings.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "tray")
                                .font(.system(size: 34))
                                .foregroundStyle(MarketelNativeTheme.green)
                            Text(filter == .all ? "No bookings yet" : "Nothing in this view")
                                .font(.system(size: 18, weight: .bold))
                            Text("New direct bookings and walk-ins will appear here automatically.")
                                .font(.system(size: 13))
                                .foregroundStyle(MarketelNativeTheme.inkSoft)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 54)
                    } else {
                        ForEach(filteredBookings) { booking in
                            MarketelBookingCard(
                                booking: booking,
                                busy: model.workingBookingID == booking.id,
                                onOpen: { selectedBooking = booking },
                                onDecision: { action in
                                    Task {
                                        do { try await model.decide(booking, action: action) }
                                        catch { actionError = error.localizedDescription }
                                    }
                                }
                            )
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 4)
                .padding(.bottom, 24)
            }
            .refreshable { await model.load() }
        }
    }
}

private struct MarketelConflictBanner: View {
    let conflicts: [MarketelConflict]
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Label("Room conflict detected", systemImage: "exclamationmark.triangle.fill")
                .font(.system(size: 15, weight: .bold))
            Text("Front Desk found more live bookings than rooms on \(conflicts.count) room-night\(conflicts.count == 1 ? "" : "s").")
                .font(.system(size: 12))
            ForEach(conflicts.prefix(3)) { conflict in
                Text("• \(conflict.roomName) · \(MarketelNativeFormat.day(conflict.date))")
                    .font(.system(size: 12, weight: .semibold))
            }
        }
        .foregroundStyle(Color(red: 127 / 255, green: 29 / 255, blue: 29 / 255))
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.09), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.red.opacity(0.28)))
    }
}

private struct MarketelBookingCard: View {
    let booking: MarketelBooking
    let busy: Bool
    let onOpen: () -> Void
    let onDecision: (String) -> Void
    @State private var now = Date()
    private let timer = Timer.publish(every: 15, on: .main, in: .common).autoconnect()

    private var pendingCopy: String {
        guard let deadline = MarketelNativeFormat.instant(booking.pendingUntil) else { return "Waiting for your decision" }
        let minutes = max(0, Int(ceil(deadline.timeIntervalSince(now) / 60)))
        let action = booking.approvalNoResponseAction == "release" ? "releases" : "keeps"
        return "\(minutes) min left · no reply \(action) it"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: onOpen) {
                VStack(alignment: .leading, spacing: 9) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(booking.guestName)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(MarketelNativeTheme.ink)
                            Text(booking.roomName ?? "Room")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(MarketelNativeTheme.green)
                        }
                        Spacer()
                        Text(booking.isPending ? "REVIEW" : (booking.isManual ? "WALK-IN" : "DIRECT"))
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(0.5)
                            .foregroundStyle(booking.isPending ? MarketelNativeTheme.amber : MarketelNativeTheme.green)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background((booking.isPending ? MarketelNativeTheme.amber : MarketelNativeTheme.green).opacity(0.12), in: Capsule())
                    }
                    HStack(spacing: 8) {
                        Label(MarketelNativeFormat.day(booking.checkinDate), systemImage: "calendar")
                        Text("–")
                        Text(MarketelNativeFormat.day(booking.checkoutDate))
                        Spacer()
                        Text(MarketelNativeFormat.currency(booking.grandTotal))
                            .fontWeight(.bold)
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(MarketelNativeTheme.inkSoft)
                    if booking.isPending {
                        Label(pendingCopy, systemImage: "clock.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(MarketelNativeTheme.amber)
                            .onReceive(timer) { now = $0 }
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if booking.isPending {
                HStack(spacing: 10) {
                    Button { onDecision("confirm") } label: {
                        Group { if busy { ProgressView().tint(.white) } else { Text("Yes, keep it") } }
                            .font(.system(size: 14, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(MarketelNativeTheme.green, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .foregroundStyle(.white)
                    }
                    .disabled(busy)
                    Button(role: .destructive) { onDecision("release") } label: {
                        Text("Release")
                            .font(.system(size: 14, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.red.opacity(0.09), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .disabled(busy)
                }
            }
        }
        .padding(16)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 19, style: .continuous).stroke(booking.isPending ? MarketelNativeTheme.amber.opacity(0.45) : MarketelNativeTheme.border))
        .shadow(color: MarketelNativeTheme.green.opacity(0.055), radius: 10, y: 4)
    }
}

private struct MarketelBookingDetailView: View {
    let booking: MarketelBooking
    @ObservedObject var model: MarketelBookingsModel
    @Binding var actionError: String?
    @Environment(\.presentationMode) private var presentationMode
    @State private var note: String
    @State private var reason = "The room was already taken"
    @State private var confirmingCancel = false
    @State private var saving = false

    init(booking: MarketelBooking, model: MarketelBookingsModel, actionError: Binding<String?>) {
        self.booking = booking
        self.model = model
        _actionError = actionError
        _note = State(initialValue: booking.notes ?? "")
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Reservation") {
                    detail("Guest", booking.guestName)
                    detail("Room", booking.roomName ?? "—")
                    detail("Check-in", MarketelNativeFormat.day(booking.checkinDate))
                    detail("Check-out", MarketelNativeFormat.day(booking.checkoutDate))
                    detail("Total", MarketelNativeFormat.currency(booking.grandTotal))
                    detail("Status", booking.isPending ? "Waiting for decision" : booking.normalizedStatus.capitalized)
                }
                Section("Contact") {
                    if let phone = booking.guestPhone, !phone.marketelTrimmed.isEmpty {
                        Button { call(phone) } label: { Label(phone, systemImage: "phone.fill") }
                    }
                    if let email = booking.guestEmail, !email.marketelTrimmed.isEmpty {
                        Label(email, systemImage: "envelope.fill")
                    }
                }
                Section("Front desk note") {
                    TextEditor(text: $note).frame(minHeight: 90)
                    Button(saving ? "Saving…" : "Save note") {
                        saving = true
                        Task {
                            do { try await model.saveNote(booking, note: note); presentationMode.wrappedValue.dismiss() }
                            catch { actionError = error.localizedDescription }
                            saving = false
                        }
                    }.disabled(saving)
                }
                if !booking.isPending {
                    Section {
                        Button(role: .destructive) { confirmingCancel = true } label: {
                            Label("Cancel this booking", systemImage: "xmark.circle")
                        }
                    } footer: {
                        Text("The room goes back on sale, the card hold is voided, and the guest is emailed.")
                    }
                }
            }
            .navigationTitle(booking.guestName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { presentationMode.wrappedValue.dismiss() }
                }
            }
            .confirmationDialog("Cancel this booking?", isPresented: $confirmingCancel, titleVisibility: .visible) {
                Button("Room was already taken", role: .destructive) { cancel("The room was already taken") }
                Button("Room is out of service", role: .destructive) { cancel("The room is out of service") }
                Button("Double booking on our side", role: .destructive) { cancel("Double booking on our side") }
                Button("Keep booking", role: .cancel) {}
            } message: {
                Text("This cannot be undone from Front Desk.")
            }
        }
    }

    private func detail(_ label: String, _ value: String) -> some View {
        HStack { Text(label); Spacer(); Text(value).foregroundStyle(.secondary).multilineTextAlignment(.trailing) }
    }

    private func call(_ raw: String) {
        let digits = raw.filter { $0.isNumber || $0 == "+" }
        if let url = URL(string: "tel:\(digits)") { UIApplication.shared.open(url) }
    }

    private func cancel(_ reason: String) {
        Task {
            do { try await model.cancel(booking, reason: reason); presentationMode.wrappedValue.dismiss() }
            catch { actionError = error.localizedDescription }
        }
    }
}

private struct MarketelWalkInView: View {
    let api: MarketelNativeAPI
    let save: ([String: Any]) async throws -> Void
    @Environment(\.presentationMode) private var presentationMode
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var room = ""
    @State private var rooms: [MarketelRoom] = []
    @State private var checkin = Calendar.current.startOfDay(for: Date())
    @State private var checkout = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: Date()))!
    @State private var total = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section("Guest") {
                    TextField("Full name", text: $name).textContentType(.name)
                    TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                    TextField("Email (optional)", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress)
                }
                Section("Stay") {
                    Picker("Room", selection: $room) {
                        Text("Choose a room").tag("")
                        ForEach(rooms) { Text($0.name).tag($0.name) }
                    }
                    DatePicker("Check-in", selection: $checkin, displayedComponents: .date)
                    DatePicker("Check-out", selection: $checkout, in: Calendar.current.date(byAdding: .day, value: 1, to: checkin)!..., displayedComponents: .date)
                    TextField("Stay total", text: $total).keyboardType(.decimalPad)
                    TextField("Note (optional)", text: $notes)
                }
                if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
            }
            .navigationTitle("Add walk-in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { presentationMode.wrappedValue.dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isSaving ? "Adding…" : "Add") { submit() }
                        .disabled(isSaving || name.marketelTrimmed.isEmpty || phone.marketelTrimmed.isEmpty || room.isEmpty)
                }
            }
            .task {
                do {
                    let response: MarketelRoomsEnvelope = try await api.request("/api/crm/rooms")
                    rooms = response.rooms
                    if room.isEmpty { room = rooms.first?.name ?? "" }
                } catch { errorMessage = error.localizedDescription }
            }
        }
    }

    private func submit() {
        isSaving = true
        errorMessage = nil
        Task {
            do {
                try await save([
                    "name": name.marketelTrimmed,
                    "phone": phone.marketelTrimmed,
                    "email": email.marketelTrimmed,
                    "room": room,
                    "checkIn": MarketelNativeFormat.apiDay.string(from: checkin),
                    "checkOut": MarketelNativeFormat.apiDay.string(from: checkout),
                    "total": Double(total) ?? 0,
                    "notes": notes.marketelTrimmed,
                    "guests": 1,
                ])
                presentationMode.wrappedValue.dismiss()
            } catch { errorMessage = error.localizedDescription }
            isSaving = false
        }
    }
}

private struct MarketelRevenueView: View {
    @ObservedObject var model: MarketelBookingsModel
    @State private var period = "30d"
    @State private var start = Calendar.current.date(byAdding: .day, value: -29, to: Date())!
    @State private var end = Date()

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Picker("Revenue period", selection: $period) {
                    Text("Today").tag("today")
                    Text("7 days").tag("7d")
                    Text("30 days").tag("30d")
                    Text("All").tag("all")
                    Text("Custom").tag("custom")
                }
                .pickerStyle(.segmented)

                if period == "custom" {
                    VStack(spacing: 0) {
                        DatePicker("From", selection: $start, displayedComponents: .date).padding(14)
                        Divider().padding(.leading, 14)
                        DatePicker("To", selection: $end, displayedComponents: .date).padding(14)
                    }
                    .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                if model.revenueLoading && model.revenue == nil {
                    ProgressView("Loading revenue…").padding(.vertical, 40)
                } else if let error = model.revenueError, model.revenue == nil {
                    Text(error).font(.system(size: 13)).foregroundStyle(.red).padding(20)
                } else if let revenue = model.revenue {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("EST. OTA FEES AVOIDED")
                            .font(.system(size: 11, weight: .heavy)).tracking(0.7)
                        Text(MarketelNativeFormat.currency(revenue.rev * 0.15))
                            .font(.system(size: 32, weight: .bold))
                        Text(revenue.range?.label ?? "Selected period")
                            .font(.system(size: 12)).opacity(0.72)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(LinearGradient(colors: [MarketelNativeTheme.green, MarketelNativeTheme.greenDark], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 20, style: .continuous))

                    HStack(spacing: 12) {
                        metric("Booked revenue", MarketelNativeFormat.currency(revenue.rev))
                        metric("Bookings", String(revenue.bookings))
                    }

                    if !revenue.rooms.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("BY ROOM TYPE").font(.system(size: 11, weight: .heavy)).tracking(0.7).padding(16)
                            ForEach(Array(revenue.rooms.enumerated()), id: \.element.id) { index, room in
                                if index > 0 { Divider().padding(.leading, 16) }
                                HStack { Text(room.name); Spacer(); Text(MarketelNativeFormat.currency(room.rev)).fontWeight(.bold) }
                                    .font(.system(size: 14)).padding(16)
                            }
                        }
                        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                }
            }
            .padding(14)
            .padding(.bottom, 24)
        }
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: period) { _ in Task { await load() } }
        .onChange(of: start) { _ in if period == "custom" { Task { await load() } } }
        .onChange(of: end) { _ in if period == "custom" { Task { await load() } } }
    }

    private func load() async { await model.loadRevenue(period: period, start: start, end: end) }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label).font(.system(size: 12)).foregroundStyle(MarketelNativeTheme.inkSoft)
            Text(value).font(.system(size: 21, weight: .bold)).foregroundStyle(MarketelNativeTheme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 17, style: .continuous))
    }
}
