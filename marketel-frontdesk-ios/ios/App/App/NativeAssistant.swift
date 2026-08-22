import SwiftUI
import UIKit

private enum MarketelAssistantTheme {
    static let green = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
    static let ink = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
    static let inkSoft = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255).opacity(0.58)
    static let canvas = Color(red: 244 / 255, green: 247 / 255, blue: 245 / 255)
    static let card = Color.white
    static let amber = Color(red: 197 / 255, green: 132 / 255, blue: 24 / 255)
    static let red = Color(red: 178 / 255, green: 70 / 255, blue: 64 / 255)
}

private enum MarketelAssistantError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let value): return value
        }
    }
}

private struct MarketelAssistantConfig: Decodable {
    let enabled: Bool?
    let checkFrequency: String?
    let dailyCheckTime: String?
    let quietHoursStart: String?
    let quietHoursEnd: String?
    let timeZone: String?
    let notifyNewBookings: Bool?
    let lastCheckAt: String?
    let nextCheckAt: String?
}

private struct MarketelAssistantHotel: Decodable {
    let id: String?
    let name: String?
    let pms: String?
    let subscribed: Bool?
}

private struct MarketelAssistantRecipient: Decodable, Identifiable {
    let id: String
    let name: String
    let role: String?
    let phone: String
    let maskedPhone: String?
    let active: Bool
    let verified: Bool
    let lastInboundAt: String?
    let lastOutboundAt: String?
}

private struct MarketelAssistantActivity: Decodable, Identifiable {
    let id: String
    let direction: String?
    let type: String?
    let summary: String?
    let status: String?
    let createdAt: String?
}

private struct MarketelAssistantCapabilities: Decodable {
    let smsConfigured: Bool?
    let aiConfigured: Bool?
    let manualAvailability: Bool?
    let maxRecipients: Int?
    let assistantPhone: String?
}

private struct MarketelAssistantApproval: Decodable {
    let enabled: Bool?
    let windowMinutes: Int?
    let noResponseAction: String?
    let policyChosen: Bool?
}

private struct MarketelAssistantData: Decodable {
    let config: MarketelAssistantConfig?
    let hotel: MarketelAssistantHotel?
    let recipients: [MarketelAssistantRecipient]?
    let activities: [MarketelAssistantActivity]?
    let latestResult: MarketelAssistantActivity?
    let capabilities: MarketelAssistantCapabilities?
    let bookingApproval: MarketelAssistantApproval?
}

private struct MarketelAssistantEnvelope: Decodable {
    let success: Bool
    let message: String?
    let data: MarketelAssistantData?
}

private struct MarketelAssistantClient {
    let origin: URL
    let hotelId: String
    let authToken: String

    private func endpoint(_ path: String) throws -> URL {
        guard let baseURL = URL(string: path, relativeTo: origin)?.absoluteURL,
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw MarketelAssistantError.message("Could not create the request.")
        }
        var query = components.queryItems ?? []
        query.removeAll { $0.name == "hotelId" }
        query.append(URLQueryItem(name: "hotelId", value: hotelId))
        components.queryItems = query
        guard let url = components.url else {
            throw MarketelAssistantError.message("Could not create the request.")
        }
        return url
    }

    private func requestData(
        _ path: String,
        method: String = "GET",
        body: [String: Any]? = nil
    ) async throws -> Data {
        var request = URLRequest(url: try endpoint(path))
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(authToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw MarketelAssistantError.message("Front Desk did not return a response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let serverMessage = object?["message"] as? String
            throw MarketelAssistantError.message(
                serverMessage ?? (http.statusCode == 401
                    ? "Your Front Desk session expired. Sign in again."
                    : "Front Desk could not complete that action.")
            )
        }
        return data
    }

    private func mutate(_ path: String, method: String = "POST", body: [String: Any] = [:]) async throws {
        let data = try await requestData(path, method: method, body: body)
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              object["success"] as? Bool == true else {
            throw MarketelAssistantError.message("Front Desk could not complete that action.")
        }
    }

    func load() async throws -> MarketelAssistantData {
        let data = try await requestData("/api/crm/frontdesk-assistant")
        let envelope = try JSONDecoder().decode(MarketelAssistantEnvelope.self, from: data)
        guard envelope.success, let assistant = envelope.data else {
            throw MarketelAssistantError.message(envelope.message ?? "Could not load Front Desk Assistant.")
        }
        return assistant
    }

    func saveAssistant(_ body: [String: Any]) async throws {
        try await mutate("/api/crm/frontdesk-assistant", method: "PUT", body: body)
    }

    func saveApproval(_ body: [String: Any]) async throws {
        try await mutate("/api/crm/booking-approval", body: body)
    }

    func addRecipient(name: String, role: String, phone: String) async throws {
        try await mutate("/api/crm/frontdesk-assistant/recipients", body: [
            "name": name,
            "role": role,
            "phone": phone,
        ])
    }

    func verifyRecipient(id: String, code: String) async throws {
        try await mutate("/api/crm/frontdesk-assistant/recipients/\(path(id))/verify", body: ["code": code])
    }

    func resendRecipient(id: String) async throws {
        try await mutate("/api/crm/frontdesk-assistant/recipients/\(path(id))/resend")
    }

    func removeRecipient(id: String) async throws {
        try await mutate("/api/crm/frontdesk-assistant/recipients/\(path(id))", method: "DELETE")
    }

    func sendTest() async throws {
        try await mutate("/api/crm/frontdesk-assistant/test")
    }

    func checkNow() async throws {
        try await mutate("/api/crm/frontdesk-assistant/check-now")
    }

    private func path(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }
}

@MainActor
private final class MarketelNativeAssistantModel: ObservableObject {
    @Published var data: MarketelAssistantData?
    @Published var isLoading = true
    @Published var busyAction: String?
    @Published var errorMessage: String?
    @Published var notice: String?

    @Published var enabled = false
    @Published var approvalEnabled = false
    @Published var approvalMinutes = 20
    @Published var noResponseAction = "confirm"
    @Published var checkFrequency = "smart"
    @Published var dailyCheckTime = "18:00"
    @Published var quietHoursEnabled = false
    @Published var quietHoursStart = "22:00"
    @Published var quietHoursEnd = "07:00"
    @Published var timeZone = TimeZone.current.identifier
    @Published var notifyNewBookings = true

    let client: MarketelAssistantClient

    init(client: MarketelAssistantClient) {
        self.client = client
    }

    var recipients: [MarketelAssistantRecipient] {
        (data?.recipients ?? []).filter(\.active)
    }

    var verifiedRecipients: [MarketelAssistantRecipient] {
        recipients.filter(\.verified)
    }

    var activities: [MarketelAssistantActivity] { data?.activities ?? [] }
    var subscribed: Bool { data?.hotel?.subscribed == true }
    var manualAvailability: Bool { data?.capabilities?.manualAvailability == true }
    var smsConfigured: Bool { data?.capabilities?.smsConfigured == true }
    var maxRecipients: Int { data?.capabilities?.maxRecipients ?? 3 }
    var assistantPhone: String { data?.capabilities?.assistantPhone ?? "" }
    var canOperate: Bool { subscribed && manualAvailability && smsConfigured }

    func load(silent: Bool = false) async {
        if !silent { isLoading = data == nil }
        do {
            let assistant = try await client.load()
            apply(assistant)
            errorMessage = nil
        } catch {
            if !silent { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func saveSettings() async {
        _ = await perform("save", success: "Front Desk settings saved.") {
            try await self.client.saveAssistant([
                "enabled": self.enabled,
                "checkFrequency": self.checkFrequency,
                "dailyCheckTime": self.dailyCheckTime,
                "quietHoursStart": self.quietHoursEnabled ? self.quietHoursStart : "",
                "quietHoursEnd": self.quietHoursEnabled ? self.quietHoursEnd : "",
                "timeZone": self.timeZone,
                "notifyNewBookings": self.notifyNewBookings,
            ])
            try await self.client.saveApproval([
                "enabled": self.approvalEnabled,
                "windowMinutes": self.approvalMinutes,
                "noResponseAction": self.noResponseAction,
            ])
        }
    }

    func addRecipient(name: String, role: String, phone: String) async -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, !cleanPhone.isEmpty else {
            errorMessage = "Enter a name and mobile number."
            return false
        }
        return await perform("add-recipient", success: "Verification code sent.") {
            try await self.client.addRecipient(name: cleanName, role: role, phone: cleanPhone)
        }
    }

    func verifyRecipient(id: String, code: String) async -> Bool {
        let digits = code.filter(\.isNumber)
        guard digits.count == 6 else {
            errorMessage = "Enter the six-digit verification code."
            return false
        }
        return await perform("verify-\(id)", success: "Phone connected to Front Desk.") {
            try await self.client.verifyRecipient(id: id, code: digits)
        }
    }

    func resendRecipient(id: String) async {
        _ = await perform("resend-\(id)", success: "A new code was sent.") {
            try await self.client.resendRecipient(id: id)
        }
    }

    func removeRecipient(id: String) async {
        _ = await perform("remove-\(id)", success: "Phone removed.") {
            try await self.client.removeRecipient(id: id)
        }
    }

    func sendTest() async {
        _ = await perform("test", success: "Test text sent.") { try await self.client.sendTest() }
    }

    func checkNow() async {
        _ = await perform("check", success: "Front Desk asked connected phones for an update.") {
            try await self.client.checkNow()
        }
    }

    private func perform(
        _ action: String,
        success: String,
        operation: @escaping () async throws -> Void
    ) async -> Bool {
        guard busyAction == nil else { return false }
        busyAction = action
        errorMessage = nil
        notice = nil
        do {
            try await operation()
            let assistant = try await client.load()
            apply(assistant)
            notice = success
            busyAction = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            busyAction = nil
            return false
        }
    }

    private func apply(_ assistant: MarketelAssistantData) {
        data = assistant
        let config = assistant.config
        enabled = config?.enabled ?? false
        checkFrequency = config?.checkFrequency ?? "smart"
        dailyCheckTime = validClock(config?.dailyCheckTime) ?? "18:00"
        quietHoursEnabled = config?.quietHoursStart != nil && config?.quietHoursEnd != nil
        quietHoursStart = validClock(config?.quietHoursStart) ?? "22:00"
        quietHoursEnd = validClock(config?.quietHoursEnd) ?? "07:00"
        timeZone = config?.timeZone ?? TimeZone.current.identifier
        notifyNewBookings = config?.notifyNewBookings ?? true
        approvalEnabled = assistant.bookingApproval?.enabled ?? false
        approvalMinutes = assistant.bookingApproval?.windowMinutes ?? 20
        noResponseAction = assistant.bookingApproval?.noResponseAction == "release" ? "release" : "confirm"
    }

    private func validClock(_ value: String?) -> String? {
        guard let value, value.range(of: #"^\d{2}:\d{2}$"#, options: .regularExpression) != nil else { return nil }
        return value
    }
}

struct MarketelNativeAssistantView: View {
    @Environment(\.presentationMode) private var presentationMode
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: MarketelNativeAssistantModel
    let onClose: () -> Void
    let onSaveContact: (String) -> Void

    init(
        origin: URL,
        hotelId: String,
        authToken: String,
        onClose: @escaping () -> Void,
        onSaveContact: @escaping (String) -> Void
    ) {
        let client = MarketelAssistantClient(origin: origin, hotelId: hotelId, authToken: authToken)
        _model = StateObject(wrappedValue: MarketelNativeAssistantModel(client: client))
        self.onClose = onClose
        self.onSaveContact = onSaveContact
    }

    var body: some View {
        NavigationView {
            Group {
                if model.isLoading && model.data == nil {
                    ProgressView()
                        .tint(MarketelAssistantTheme.green)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = model.errorMessage, model.data == nil {
                    assistantError(error)
                } else {
                    dashboard
                }
            }
            .background(MarketelAssistantTheme.canvas.ignoresSafeArea())
            .navigationTitle("Front Desk")
            .navigationBarTitleDisplayMode(.large)
            .navigationBarItems(leading: Button("Done") { close() })
        }
        .navigationViewStyle(.stack)
        .tint(MarketelAssistantTheme.green)
        .task {
            await model.load()
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                if !Task.isCancelled, scenePhase == .active { await model.load(silent: true) }
            }
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active { Task { await model.load(silent: true) } }
        }
        .alert("Front Desk", isPresented: Binding(
            get: { model.errorMessage != nil && model.data != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "Please try again.")
        }
    }

    private var dashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                statusCard
                if let notice = model.notice {
                    Label(notice, systemImage: "checkmark.circle.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MarketelAssistantTheme.green)
                        .padding(13)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MarketelAssistantTheme.green.opacity(0.10), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                quickActions
                navigationCard
                recentActivity
            }
            .padding(18)
        }
        .refreshable { await model.load() }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 13) {
                Image(systemName: statusSymbol)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(statusColor)
                    .frame(width: 42, height: 42)
                    .background(statusColor.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text(statusTitle)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(MarketelAssistantTheme.ink)
                    Text(statusDetail)
                        .font(.system(size: 13))
                        .foregroundStyle(MarketelAssistantTheme.inkSoft)
                }
                Spacer(minLength: 0)
            }
            if let latest = model.data?.latestResult {
                Divider()
                VStack(alignment: .leading, spacing: 5) {
                    Text("LATEST ACTION")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(0.7)
                        .foregroundStyle(MarketelAssistantTheme.inkSoft)
                    Text(clean(latest.summary, fallback: "Front Desk activity recorded"))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(MarketelAssistantTheme.ink)
                    Text(assistantTime(latest.createdAt))
                        .font(.system(size: 11))
                        .foregroundStyle(MarketelAssistantTheme.inkSoft)
                }
            }
        }
        .padding(17)
        .background(MarketelAssistantTheme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var quickActions: some View {
        VStack(spacing: 10) {
            if let sms = assistantSMSURL(model.assistantPhone) {
                Link(destination: sms) {
                    assistantActionLabel("Text Front Desk", symbol: "message.fill", primary: true)
                }
            }
            Button { Task { await model.checkNow() } } label: {
                assistantActionLabel(
                    model.busyAction == "check" ? "Asking…" : "Ask for an update now",
                    symbol: "arrow.triangle.2.circlepath",
                    primary: false
                )
            }
            .disabled(model.busyAction != nil || model.verifiedRecipients.isEmpty || !model.smsConfigured)
        }
    }

    private var navigationCard: some View {
        VStack(spacing: 0) {
            NavigationLink {
                MarketelNativeBookingRuleView(model: model)
            } label: {
                assistantNavigationRow(
                    title: "Booking rule",
                    detail: model.approvalEnabled
                        ? "No answer \(model.noResponseAction == "release" ? "releases" : "keeps") after \(model.approvalMinutes) min"
                        : "New bookings confirm immediately",
                    symbol: "checkmark.shield"
                )
            }
            Divider().padding(.leading, 56)
            NavigationLink {
                MarketelNativePeopleView(model: model, onSaveContact: onSaveContact)
            } label: {
                assistantNavigationRow(
                    title: "People and texting",
                    detail: "\(model.verifiedRecipients.count) connected of \(model.maxRecipients)",
                    symbol: "person.2"
                )
            }
            Divider().padding(.leading, 56)
            NavigationLink {
                MarketelNativeCheckInView(model: model)
            } label: {
                assistantNavigationRow(
                    title: "Check-ins and alerts",
                    detail: scheduleLabel(model.checkFrequency),
                    symbol: "clock.badge.checkmark"
                )
            }
            Divider().padding(.leading, 56)
            NavigationLink {
                MarketelNativeActivityView(model: model)
            } label: {
                assistantNavigationRow(
                    title: "Activity",
                    detail: "Every alert and availability change",
                    symbol: "clock.arrow.circlepath"
                )
            }
        }
        .background(MarketelAssistantTheme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    @ViewBuilder private var recentActivity: some View {
        if !model.activities.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("RECENT")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.8)
                    .foregroundStyle(MarketelAssistantTheme.inkSoft)
                ForEach(Array(model.activities.prefix(3))) { activity in
                    assistantActivityRow(activity)
                }
            }
        }
    }

    private var statusTitle: String {
        if !model.subscribed { return "Front Desk is locked" }
        if !model.smsConfigured { return "Texting needs attention" }
        if !model.manualAvailability { return "Availability is not connected" }
        if model.enabled && !model.verifiedRecipients.isEmpty { return "Front Desk is watching" }
        return "Finish connecting Front Desk"
    }

    private var statusDetail: String {
        if !model.subscribed { return "Activate Marketel before connecting Assistant texting." }
        if !model.smsConfigured { return "Marketel’s texting number is not configured yet." }
        if !model.manualAvailability { return "Assistant updates require Marketel-managed Availability." }
        if model.enabled && !model.verifiedRecipients.isEmpty {
            return "Booking alerts and proactive room checks are active."
        }
        return "Connect a phone and choose when Front Desk should check in."
    }

    private var statusColor: Color {
        model.enabled && model.canOperate && !model.verifiedRecipients.isEmpty
            ? MarketelAssistantTheme.green
            : MarketelAssistantTheme.amber
    }

    private var statusSymbol: String {
        model.enabled && model.canOperate && !model.verifiedRecipients.isEmpty
            ? "checkmark.shield.fill"
            : "exclamationmark.triangle.fill"
    }

    private func close() {
        onClose()
        presentationMode.wrappedValue.dismiss()
    }

    private func assistantError(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundStyle(MarketelAssistantTheme.amber)
            Text("Assistant could not connect")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(MarketelAssistantTheme.ink)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(MarketelAssistantTheme.inkSoft)
                .multilineTextAlignment(.center)
            Button("Try again") { Task { await model.load() } }
                .buttonStyle(.borderedProminent)
                .tint(MarketelAssistantTheme.green)
        }
        .padding(30)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct MarketelNativeBookingRuleView: View {
    @ObservedObject var model: MarketelNativeAssistantModel

    var body: some View {
        Form {
            Section {
                Toggle("Review new bookings", isOn: $model.approvalEnabled)
            } footer: {
                Text("Front Desk holds a new request while it asks connected phones whether the room is still free.")
            }

            if model.approvalEnabled {
                Section("Time to answer") {
                    Picker("Review window", selection: $model.approvalMinutes) {
                        ForEach([5, 10, 15, 20, 30, 45, 60], id: \.self) { minutes in
                            Text("\(minutes) minutes").tag(minutes)
                        }
                    }
                }

                Section("If nobody answers") {
                    assistantPolicyOption(
                        title: "Keep the booking",
                        detail: "Confirm automatically. Best when saving the sale matters most.",
                        value: "confirm",
                        selection: $model.noResponseAction
                    )
                    assistantPolicyOption(
                        title: "Release the request",
                        detail: "Void the $1 hold and notify the guest. Best when availability must be certain.",
                        value: "release",
                        selection: $model.noResponseAction
                    )
                }
            }

            Section {
                assistantSaveButton(model: model)
            } footer: {
                Text(model.approvalEnabled
                     ? "No answer after \(model.approvalMinutes) minutes \(model.noResponseAction == "release" ? "releases the request" : "keeps the booking")."
                     : "New direct bookings confirm immediately.")
            }
        }
        .navigationTitle("Booking rule")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MarketelNativePeopleView: View {
    @ObservedObject var model: MarketelNativeAssistantModel
    let onSaveContact: (String) -> Void
    @State private var name = ""
    @State private var role = ""
    @State private var phone = ""
    @State private var codes: [String: String] = [:]
    @State private var pendingRemoval: MarketelAssistantRecipient?

    var body: some View {
        Form {
            Section("Connected people") {
                if model.recipients.isEmpty {
                    Text("No phones connected yet.")
                        .foregroundStyle(MarketelAssistantTheme.inkSoft)
                }
                ForEach(model.recipients) { recipient in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(recipient.name).font(.system(size: 16, weight: .semibold))
                                Text([clean(recipient.role), clean(recipient.maskedPhone, fallback: recipient.phone)]
                                    .filter { !$0.isEmpty }.joined(separator: " · "))
                                    .font(.system(size: 12))
                                    .foregroundStyle(MarketelAssistantTheme.inkSoft)
                            }
                            Spacer()
                            Label(recipient.verified ? "Connected" : "Verify", systemImage: recipient.verified ? "checkmark.circle.fill" : "clock.fill")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(recipient.verified ? MarketelAssistantTheme.green : MarketelAssistantTheme.amber)
                                .labelStyle(.titleAndIcon)
                        }
                        if !recipient.verified {
                            HStack(spacing: 8) {
                                TextField("6-digit code", text: codeBinding(recipient.id))
                                    .keyboardType(.numberPad)
                                    .textContentType(.oneTimeCode)
                                Button("Verify") {
                                    Task {
                                        if await model.verifyRecipient(id: recipient.id, code: codes[recipient.id] ?? "") {
                                            codes[recipient.id] = ""
                                        }
                                    }
                                }
                                .disabled(model.busyAction != nil)
                            }
                            Button("Send a new code") { Task { await model.resendRecipient(id: recipient.id) } }
                                .font(.system(size: 13, weight: .semibold))
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) { pendingRemoval = recipient } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                }
            }

            if model.recipients.count < model.maxRecipients {
                Section("Add a phone") {
                    TextField("Name", text: $name)
                        .textContentType(.name)
                    TextField("Role (optional)", text: $role)
                    TextField("Mobile number", text: $phone)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                    Button {
                        Task {
                            if await model.addRecipient(name: name, role: role, phone: phone) {
                                name = ""; role = ""; phone = ""
                            }
                        }
                    } label: {
                        Label(model.busyAction == "add-recipient" ? "Sending…" : "Send verification code", systemImage: "paperplane.fill")
                    }
                    .disabled(model.busyAction != nil || name.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }

            if !model.assistantPhone.isEmpty {
                Section {
                    Button { onSaveContact(model.assistantPhone) } label: {
                        Label("Save Marketel Front Desk to Contacts", systemImage: "person.crop.circle.badge.plus")
                    }
                    if let sms = assistantSMSURL(model.assistantPhone) {
                        Link(destination: sms) { Label("Text Front Desk", systemImage: "message.fill") }
                    }
                } footer: {
                    Text("Verification records consent and prevents a mistyped number from receiving property messages. Reply STOP anytime to disconnect.")
                }
            }

            if !model.verifiedRecipients.isEmpty {
                Section {
                    Button { Task { await model.sendTest() } } label: {
                        Label(model.busyAction == "test" ? "Sending…" : "Send test text", systemImage: "paperplane")
                    }
                    .disabled(model.busyAction != nil)
                }
            }
        }
        .navigationTitle("People and texting")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Remove this phone from Front Desk?",
            isPresented: Binding(
                get: { pendingRemoval != nil },
                set: { if !$0 { pendingRemoval = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Remove phone", role: .destructive) {
                guard let recipient = pendingRemoval else { return }
                pendingRemoval = nil
                Task { await model.removeRecipient(id: recipient.id) }
            }
            Button("Cancel", role: .cancel) { pendingRemoval = nil }
        }
    }

    private func codeBinding(_ id: String) -> Binding<String> {
        Binding(
            get: { codes[id] ?? "" },
            set: { codes[id] = String($0.filter(\.isNumber).prefix(6)) }
        )
    }
}

private struct MarketelNativeCheckInView: View {
    @ObservedObject var model: MarketelNativeAssistantModel

    var body: some View {
        Form {
            Section {
                Toggle("Front Desk Assistant", isOn: $model.enabled)
            } footer: {
                Text("When on, connected phones receive booking alerts and the proactive checks you choose below.")
            }

            Section("Check-in schedule") {
                Picker("Ask about outside bookings", selection: $model.checkFrequency) {
                    Text("Evening check — recommended").tag("smart")
                    Text("Every 2 hours").tag("2h")
                    Text("Every 4 hours").tag("4h")
                    Text("Once daily").tag("daily")
                    Text("Only on new bookings").tag("booking_only")
                    Text("Never").tag("off")
                }
                if ["smart", "daily"].contains(model.checkFrequency) {
                    DatePicker(
                        "Daily check time",
                        selection: clockBinding($model.dailyCheckTime, fallbackHour: 18),
                        displayedComponents: .hourAndMinute
                    )
                }
                HStack {
                    Text("Time zone")
                    Spacer()
                    Text(model.timeZone)
                        .foregroundStyle(MarketelAssistantTheme.inkSoft)
                        .multilineTextAlignment(.trailing)
                }
                Button("Use this iPhone’s time zone") { model.timeZone = TimeZone.current.identifier }
                    .font(.system(size: 13, weight: .semibold))
            }

            Section("Quiet hours") {
                Toggle("Silence proactive checks", isOn: $model.quietHoursEnabled)
                if model.quietHoursEnabled {
                    DatePicker(
                        "Start",
                        selection: clockBinding($model.quietHoursStart, fallbackHour: 22),
                        displayedComponents: .hourAndMinute
                    )
                    DatePicker(
                        "End",
                        selection: clockBinding($model.quietHoursEnd, fallbackHour: 7),
                        displayedComponents: .hourAndMinute
                    )
                }
            }

            Section {
                Toggle("Text phones when a booking arrives", isOn: $model.notifyNewBookings)
            }

            Section {
                assistantSaveButton(model: model)
                Button { Task { await model.checkNow() } } label: {
                    Label(model.busyAction == "check" ? "Asking…" : "Ask for an update now", systemImage: "arrow.triangle.2.circlepath")
                }
                .disabled(model.busyAction != nil || model.verifiedRecipients.isEmpty)
            } footer: {
                if !model.canOperate {
                    Text("Assistant controls require an active subscription, Marketel-managed Availability, and configured texting.")
                }
            }
        }
        .navigationTitle("Check-ins and alerts")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MarketelNativeActivityView: View {
    @ObservedObject var model: MarketelNativeAssistantModel

    var body: some View {
        List {
            if model.activities.isEmpty {
                Text("Booking alerts and availability updates will appear here.")
                    .foregroundStyle(MarketelAssistantTheme.inkSoft)
                    .listRowBackground(Color.clear)
            }
            ForEach(model.activities) { activity in
                assistantActivityRow(activity)
                    .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            }
        }
        .listStyle(.plain)
        .refreshable { await model.load() }
        .background(MarketelAssistantTheme.canvas.ignoresSafeArea())
        .navigationTitle("Activity")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private func assistantPolicyOption(
    title: String,
    detail: String,
    value: String,
    selection: Binding<String>
) -> some View {
    Button { selection.wrappedValue = value } label: {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: selection.wrappedValue == value ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(selection.wrappedValue == value ? MarketelAssistantTheme.green : MarketelAssistantTheme.inkSoft)
                .font(.system(size: 19))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(MarketelAssistantTheme.ink)
                Text(detail).font(.system(size: 12)).foregroundStyle(MarketelAssistantTheme.inkSoft)
            }
        }
    }
    .buttonStyle(.plain)
}

@MainActor
private func assistantSaveButton(model: MarketelNativeAssistantModel) -> some View {
    Button { Task { await model.saveSettings() } } label: {
        HStack {
            Spacer()
            if model.busyAction == "save" { ProgressView().tint(.white) }
            Text(model.busyAction == "save" ? "Saving…" : "Save settings")
                .font(.system(size: 16, weight: .bold))
            Spacer()
        }
        .foregroundStyle(.white)
        .padding(.vertical, 12)
        .background(MarketelAssistantTheme.green, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
    .buttonStyle(.plain)
    .disabled(model.busyAction != nil || !model.subscribed)
    .opacity(model.subscribed ? 1 : 0.5)
}

private func assistantNavigationRow(title: String, detail: String, symbol: String) -> some View {
    HStack(spacing: 13) {
        Image(systemName: symbol)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(MarketelAssistantTheme.green)
            .frame(width: 34, height: 34)
            .background(MarketelAssistantTheme.green.opacity(0.11), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(MarketelAssistantTheme.ink)
            Text(detail).font(.system(size: 12)).foregroundStyle(MarketelAssistantTheme.inkSoft).lineLimit(2)
        }
        Spacer(minLength: 4)
        Image(systemName: "chevron.right")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(MarketelAssistantTheme.inkSoft)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 13)
}

private func assistantActionLabel(_ title: String, symbol: String, primary: Bool) -> some View {
    Label(title, systemImage: symbol)
        .font(.system(size: 16, weight: .bold))
        .foregroundStyle(primary ? Color.white : MarketelAssistantTheme.green)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            primary ? MarketelAssistantTheme.green : MarketelAssistantTheme.card,
            in: RoundedRectangle(cornerRadius: 15, style: .continuous)
        )
}

private func assistantActivityRow(_ activity: MarketelAssistantActivity) -> some View {
    HStack(alignment: .top, spacing: 12) {
        Image(systemName: assistantActivitySymbol(activity.type))
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(assistantActivityColor(activity.status))
            .frame(width: 30, height: 30)
            .background(assistantActivityColor(activity.status).opacity(0.11), in: Circle())
        VStack(alignment: .leading, spacing: 4) {
            Text(clean(activity.summary, fallback: "Front Desk activity"))
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(MarketelAssistantTheme.ink)
            Text(assistantTime(activity.createdAt))
                .font(.system(size: 11))
                .foregroundStyle(MarketelAssistantTheme.inkSoft)
        }
        Spacer(minLength: 0)
    }
    .padding(13)
    .background(MarketelAssistantTheme.card, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
}

private func assistantActivitySymbol(_ type: String?) -> String {
    switch type {
    case "booking_alert": return "bell.fill"
    case "booking_decision": return "checkmark.shield.fill"
    case "availability_update": return "calendar.badge.checkmark"
    case "availability_warning": return "exclamationmark.triangle.fill"
    case "inventory_check": return "arrow.triangle.2.circlepath"
    case "verification": return "person.badge.key.fill"
    default: return "clock.fill"
    }
}

private func assistantActivityColor(_ status: String?) -> Color {
    ["failed", "attention"].contains((status ?? "").lowercased())
        ? MarketelAssistantTheme.red
        : MarketelAssistantTheme.green
}

private func assistantSMSURL(_ raw: String) -> URL? {
    let allowed = raw.filter { $0.isNumber || $0 == "+" }
    guard allowed.filter(\.isNumber).count >= 10 else { return nil }
    return URL(string: "sms:\(allowed)")
}

private func scheduleLabel(_ value: String) -> String {
    switch value {
    case "smart": return "Evening check"
    case "2h": return "Every 2 hours"
    case "4h": return "Every 4 hours"
    case "daily": return "Once daily"
    case "booking_only": return "Only when a booking arrives"
    case "off": return "Proactive checks are off"
    default: return "Choose a schedule"
    }
}

private func clockBinding(_ value: Binding<String>, fallbackHour: Int) -> Binding<Date> {
    Binding(
        get: { clockDate(value.wrappedValue, fallbackHour: fallbackHour) },
        set: { value.wrappedValue = clockString($0) }
    )
}

private func clockDate(_ value: String, fallbackHour: Int) -> Date {
    let parts = value.split(separator: ":").compactMap { Int($0) }
    var components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
    components.hour = parts.count > 0 ? parts[0] : fallbackHour
    components.minute = parts.count > 1 ? parts[1] : 0
    return Calendar.current.date(from: components) ?? Date()
}

private func clockString(_ date: Date) -> String {
    let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
    return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
}

private func assistantTime(_ raw: String?) -> String {
    guard let raw, let date = assistantISODate(raw) else { return "Recently" }
    let relative = RelativeDateTimeFormatter()
    relative.unitsStyle = .short
    return relative.localizedString(for: date, relativeTo: Date())
}

private func assistantISODate(_ raw: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractional.date(from: raw) { return date }
    let basic = ISO8601DateFormatter()
    basic.formatOptions = [.withInternetDateTime]
    return basic.date(from: raw)
}

private func clean(_ value: String?, fallback: String = "") -> String {
    let cleanValue = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return cleanValue.isEmpty ? fallback : cleanValue
}
