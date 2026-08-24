import SwiftUI

private struct MarketelAvailabilityDay: Identifiable {
    let id: String
    let date: Date
    let day: Int
    let available: Int
    let total: Int
    let booked: Int
    let closed: Bool
    let isPast: Bool
}

@MainActor
private final class MarketelAvailabilityModel: ObservableObject {
    @Published var data = MarketelAvailabilityData(rooms: [], overrides: [:])
    @Published var bookings: [MarketelBooking] = []
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var isSaving = false

    let api: MarketelNativeAPI
    let onDataChanged: () -> Void

    init(api: MarketelNativeAPI, onDataChanged: @escaping () -> Void) {
        self.api = api
        self.onDataChanged = onDataChanged
    }

    func load(silent: Bool = false) async {
        if !silent { isLoading = data.rooms.isEmpty }
        do {
            async let availabilityRequest: MarketelAvailabilityEnvelope = api.request("/api/crm/manual-availability")
            async let bookingRequest: MarketelBookingEnvelope = api.request("/api/crm/bookings")
            let (availability, bookings) = try await (availabilityRequest, bookingRequest)
            guard availability.success, bookings.success else {
                throw MarketelNativeAPIError.message(availability.message ?? bookings.message ?? "Could not load availability.")
            }
            data = availability.data
            self.bookings = bookings.data
            errorMessage = nil
        } catch {
            if !silent || data.rooms.isEmpty { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func addRoom(name: String, units: Int) async throws {
        try await mutateRoom(path: "/api/crm/manual-availability/rooms", method: "POST", body: [
            "roomName": name,
            "totalUnits": units,
        ])
    }

    func editRoom(current: String, name: String, units: Int) async throws {
        try await mutateRoom(path: "/api/crm/manual-availability/rooms", method: "PUT", body: [
            "currentRoomName": current,
            "newRoomName": name,
            "totalUnits": units,
        ])
    }

    func deleteRoom(_ room: MarketelManualRoom) async throws {
        try await mutateRoom(path: "/api/crm/manual-availability/rooms", method: "DELETE", body: ["roomName": room.name])
    }

    func saveRange(room: MarketelManualRoom, start: Date, end: Date, units: Int, closed: Bool) async throws {
        isSaving = true
        defer { isSaving = false }
        let first = min(start, end)
        let second = max(start, end)
        let response: MarketelAvailabilityEnvelope = try await api.request(
            "/api/crm/manual-availability/range",
            method: "POST",
            body: [
                "roomName": room.name,
                "startDate": MarketelNativeFormat.apiDay.string(from: first),
                "endDate": MarketelNativeFormat.apiDay.string(from: second),
                "availableUnits": max(0, min(room.totalUnits, units)),
                "closed": closed,
            ]
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not update availability.")
        }
        data = response.data
        onDataChanged()
    }

    func effective(room: MarketelManualRoom, date: Date) -> MarketelAvailabilityDay {
        let iso = MarketelNativeFormat.apiDay.string(from: date)
        let key = "\(room.name)|\(iso)"
        let override = data.overrides[key]
        let booked = bookedCount(room: room.name, date: date)
        let closed = override?.closed == true
        let automatic = max(0, room.totalUnits - booked)
        let available = closed ? 0 : max(0, override?.availableUnits ?? automatic)
        return MarketelAvailabilityDay(
            id: key,
            date: date,
            day: Calendar.current.component(.day, from: date),
            available: available,
            total: room.totalUnits,
            booked: booked,
            closed: closed,
            isPast: date < Calendar.current.startOfDay(for: Date())
        )
    }

    private func mutateRoom(path: String, method: String, body: [String: Any]) async throws {
        isSaving = true
        defer { isSaving = false }
        let response: MarketelAvailabilityEnvelope = try await api.request(path, method: method, body: body)
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not update that room.")
        }
        data = response.data
        onDataChanged()
    }

    private func bookedCount(room: String, date: Date) -> Int {
        let target = Calendar.current.startOfDay(for: date)
        return bookings.filter { booking in
            guard booking.roomName == room,
                  booking.paymentDeclined != true,
                  !["cancelled", "canceled", "released"].contains(booking.normalizedStatus),
                  let start = MarketelNativeFormat.date(booking.checkinDate),
                  let end = MarketelNativeFormat.date(booking.checkoutDate) else { return false }
            return target >= Calendar.current.startOfDay(for: start) && target < Calendar.current.startOfDay(for: end)
        }.count
    }
}

struct MarketelNativeAvailabilityView: View {
    @ObservedObject var session: MarketelNativeSession
    @StateObject private var model: MarketelAvailabilityModel
    @State private var selectedRoomName = ""
    @State private var month = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date()))!
    @State private var selectedDay: MarketelAvailabilityDay?
    @State private var roomEditor: MarketelRoomEditorTarget?
    @State private var deletingRoom: MarketelManualRoom?
    @State private var actionError: String?
    let onOpenWebFallback: () -> Void

    init(
        session: MarketelNativeSession,
        origin: URL,
        onDataChanged: @escaping () -> Void,
        onOpenWebFallback: @escaping () -> Void
    ) {
        self.session = session
        self.onOpenWebFallback = onOpenWebFallback
        _model = StateObject(wrappedValue: MarketelAvailabilityModel(
            api: MarketelNativeAPI(origin: origin, hotelId: session.hotelId, authToken: session.authToken),
            onDataChanged: onDataChanged
        ))
    }

    private var selectedRoom: MarketelManualRoom? {
        model.data.rooms.first { $0.name == selectedRoomName } ?? model.data.rooms.first
    }

    var body: some View {
        Group {
            if model.isLoading && model.data.rooms.isEmpty {
                ProgressView("Loading availability…")
                    .tint(MarketelNativeTheme.green)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = model.errorMessage, model.data.rooms.isEmpty {
                MarketelNativeErrorView(message: error, retry: { Task { await model.load() } }, openWeb: onOpenWebFallback)
            } else {
                content
            }
        }
        .background(MarketelNativeTheme.canvas)
        .task {
            await model.load()
            repairSelection()
        }
        .task(id: session.refreshGeneration) {
            await model.load(silent: !model.data.rooms.isEmpty)
            repairSelection()
        }
        .sheet(item: $selectedDay) { day in
            if let room = selectedRoom {
                MarketelAvailabilityDayEditor(day: day, room: room, isSaving: model.isSaving) { start, end, units, closed in
                    try await model.saveRange(room: room, start: start, end: end, units: units, closed: closed)
                }
            }
        }
        .sheet(item: $roomEditor) { target in
            MarketelRoomEditorView(target: target, isSaving: model.isSaving) { name, units in
                if let room = target.room {
                    try await model.editRoom(current: room.name, name: name, units: units)
                    selectedRoomName = name
                } else {
                    try await model.addRoom(name: name, units: units)
                    selectedRoomName = name
                }
            }
        }
        .alert("Delete room?", isPresented: Binding(
            get: { deletingRoom != nil },
            set: { if !$0 { deletingRoom = nil } }
        )) {
            Button("Delete", role: .destructive) {
                guard let room = deletingRoom else { return }
                Task {
                    do { try await model.deleteRoom(room); deletingRoom = nil; repairSelection() }
                    catch { actionError = error.localizedDescription; deletingRoom = nil }
                }
            }
            Button("Cancel", role: .cancel) { deletingRoom = nil }
        } message: {
            Text("Saved availability for this room will be removed. Rooms with active bookings cannot be deleted.")
        }
        .alert("Front Desk", isPresented: Binding(
            get: { actionError != nil },
            set: { if !$0 { actionError = nil } }
        )) {
            Button("OK", role: .cancel) { actionError = nil }
        } message: { Text(actionError ?? "") }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 14) {
                HStack {
                    Text("Availability")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(MarketelNativeTheme.ink)
                    Spacer()
                    Button { roomEditor = MarketelRoomEditorTarget(room: nil) } label: {
                        Label("Add room", systemImage: "plus")
                            .font(.system(size: 14, weight: .bold))
                    }
                }

                if model.data.rooms.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "door.left.hand.open")
                            .font(.system(size: 38))
                            .foregroundStyle(MarketelNativeTheme.green)
                        Text("Add your first room")
                            .font(.system(size: 19, weight: .bold))
                        Text("A room opens the calendar so you can control how many units are available each night.")
                            .font(.system(size: 13))
                            .foregroundStyle(MarketelNativeTheme.inkSoft)
                            .multilineTextAlignment(.center)
                        Button("Add room") { roomEditor = MarketelRoomEditorTarget(room: nil) }
                            .buttonStyle(MarketelPrimaryButtonStyle())
                    }
                    .padding(30)
                } else if let room = selectedRoom {
                    roomControls(room)
                    monthHeader
                    calendar(room)
                    legend
                }
            }
            .padding(14)
            .padding(.bottom, 28)
        }
        .refreshable {
            await model.load()
            repairSelection()
        }
    }

    private func roomControls(_ room: MarketelManualRoom) -> some View {
        HStack(spacing: 10) {
            Menu {
                ForEach(model.data.rooms) { candidate in
                    Button {
                        selectedRoomName = candidate.name
                    } label: {
                        if candidate.name == room.name { Label(candidate.name, systemImage: "checkmark") }
                        else { Text(candidate.name) }
                    }
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(room.name).font(.system(size: 15, weight: .bold))
                        Text("\(room.totalUnits) unit\(room.totalUnits == 1 ? "" : "s")")
                            .font(.system(size: 11)).foregroundStyle(MarketelNativeTheme.inkSoft)
                    }
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold))
                }
                .foregroundStyle(MarketelNativeTheme.ink)
                .padding(14)
                .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            }
            Menu {
                Button("Edit room") { roomEditor = MarketelRoomEditorTarget(room: room) }
                Button("Delete room", role: .destructive) { deletingRoom = room }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .bold))
                    .frame(width: 48, height: 48)
                    .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            }
        }
    }

    private var monthHeader: some View {
        HStack {
            Button { changeMonth(-1) } label: { Image(systemName: "chevron.left").frame(width: 42, height: 42) }
            Spacer()
            Text(month.formatted(.dateTime.month(.wide).year()))
                .font(.system(size: 17, weight: .bold))
            Spacer()
            Button { changeMonth(1) } label: { Image(systemName: "chevron.right").frame(width: 42, height: 42) }
        }
        .foregroundStyle(MarketelNativeTheme.ink)
        .padding(.horizontal, 4)
    }

    private func calendar(_ room: MarketelManualRoom) -> some View {
        let calendar = Calendar.current
        let interval = calendar.dateInterval(of: .month, for: month)!
        let days = calendar.range(of: .day, in: .month, for: month)!
        let firstWeekday = calendar.component(.weekday, from: interval.start) - 1
        let columns = Array(repeating: GridItem(.flexible(), spacing: 5), count: 7)
        return VStack(spacing: 8) {
            LazyVGrid(columns: columns, spacing: 5) {
                ForEach(["S", "M", "T", "W", "T", "F", "S"], id: \.self) { day in
                    Text(day).font(.system(size: 10, weight: .bold)).foregroundStyle(MarketelNativeTheme.inkSoft)
                }
                ForEach(0..<firstWeekday, id: \.self) { _ in Color.clear.frame(height: 52) }
                ForEach(Array(days), id: \.self) { number in
                    let date = calendar.date(byAdding: .day, value: number - 1, to: interval.start)!
                    let value = model.effective(room: room, date: date)
                    MarketelAvailabilityDayCell(day: value)
                        .onTapGesture { if !value.isPast { selectedDay = value } }
                        .allowsHitTesting(!value.isPast)
                }
            }
        }
        .padding(12)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
    }

    private var legend: some View {
        HStack(spacing: 14) {
            legendItem("Open", MarketelNativeTheme.green)
            legendItem("Low", MarketelNativeTheme.amber)
            legendItem("Full", MarketelNativeTheme.red)
            legendItem("Closed", .gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 2)
    }

    private func legendItem(_ text: String, _ color: Color) -> some View {
        HStack(spacing: 4) { Circle().fill(color).frame(width: 7, height: 7); Text(text).font(.system(size: 10)) }
            .foregroundStyle(MarketelNativeTheme.inkSoft)
    }

    private func changeMonth(_ value: Int) {
        month = Calendar.current.date(byAdding: .month, value: value, to: month) ?? month
    }

    private func repairSelection() {
        if !model.data.rooms.contains(where: { $0.name == selectedRoomName }) {
            selectedRoomName = model.data.rooms.first?.name ?? ""
        }
    }
}

private struct MarketelAvailabilityDayCell: View {
    let day: MarketelAvailabilityDay
    private var color: Color {
        if day.closed { return .gray }
        if day.available <= 0 { return MarketelNativeTheme.red }
        if day.available < day.total { return MarketelNativeTheme.amber }
        return MarketelNativeTheme.green
    }
    var body: some View {
        VStack(spacing: 4) {
            Text(String(day.day)).font(.system(size: 13, weight: .bold))
            Text(day.closed ? "—" : String(day.available)).font(.system(size: 12, weight: .heavy)).foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, minHeight: 50)
        .foregroundStyle(day.isPast ? MarketelNativeTheme.inkSoft.opacity(0.45) : MarketelNativeTheme.ink)
        .background(color.opacity(day.isPast ? 0.025 : 0.08), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous).stroke(color.opacity(day.isPast ? 0.06 : 0.18)))
    }
}

private struct MarketelRoomEditorTarget: Identifiable {
    let id = UUID()
    let room: MarketelManualRoom?
}

private struct MarketelRoomEditorView: View {
    let target: MarketelRoomEditorTarget
    let isSaving: Bool
    let save: (String, Int) async throws -> Void
    @Environment(\.presentationMode) private var presentationMode
    @State private var name: String
    @State private var units: Int
    @State private var errorMessage: String?

    init(target: MarketelRoomEditorTarget, isSaving: Bool, save: @escaping (String, Int) async throws -> Void) {
        self.target = target
        self.isSaving = isSaving
        self.save = save
        _name = State(initialValue: target.room?.name ?? "")
        _units = State(initialValue: target.room?.totalUnits ?? 1)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Room type") {
                    TextField("Room name", text: $name)
                    Stepper("\(units) unit\(units == 1 ? "" : "s")", value: $units, in: 1...100)
                }
                if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
            }
            .navigationTitle(target.room == nil ? "Add room" : "Edit room")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { presentationMode.wrappedValue.dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isSaving ? "Saving…" : "Save") { submit() }
                        .disabled(isSaving || name.marketelTrimmed.isEmpty)
                }
            }
        }
    }

    private func submit() {
        errorMessage = nil
        Task {
            do { try await save(name.marketelTrimmed, units); presentationMode.wrappedValue.dismiss() }
            catch { errorMessage = error.localizedDescription }
        }
    }
}

private struct MarketelAvailabilityDayEditor: View {
    let day: MarketelAvailabilityDay
    let room: MarketelManualRoom
    let isSaving: Bool
    let save: (Date, Date, Int, Bool) async throws -> Void
    @Environment(\.presentationMode) private var presentationMode
    @State private var endDate: Date
    @State private var units: Int
    @State private var closed: Bool
    @State private var errorMessage: String?

    init(day: MarketelAvailabilityDay, room: MarketelManualRoom, isSaving: Bool, save: @escaping (Date, Date, Int, Bool) async throws -> Void) {
        self.day = day
        self.room = room
        self.isSaving = isSaving
        self.save = save
        _endDate = State(initialValue: day.date)
        _units = State(initialValue: day.closed ? room.totalUnits : day.available)
        _closed = State(initialValue: day.closed)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Room night") {
                    HStack { Text("Starts"); Spacer(); Text(MarketelNativeFormat.shortDate.string(from: day.date)).foregroundStyle(.secondary) }
                    DatePicker("Apply through", selection: $endDate, in: day.date..., displayedComponents: .date)
                    Toggle("Closed", isOn: $closed).tint(MarketelNativeTheme.red)
                    Stepper("\(units) available", value: $units, in: 0...max(1, room.totalUnits))
                        .disabled(closed)
                }
                if day.booked > 0 {
                    Section { Label("\(day.booked) live booking\(day.booked == 1 ? "" : "s") already use this room-night.", systemImage: "person.2.fill") }
                }
                if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
            }
            .navigationTitle(room.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { presentationMode.wrappedValue.dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isSaving ? "Saving…" : "Save") { submit() }.disabled(isSaving)
                }
            }
        }
    }

    private func submit() {
        errorMessage = nil
        Task {
            do { try await save(day.date, endDate, units, closed); presentationMode.wrappedValue.dismiss() }
            catch { errorMessage = error.localizedDescription }
        }
    }
}
