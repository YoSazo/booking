import SwiftUI
import UIKit

private enum MarketelMessageTheme {
    static let green = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
    static let ink = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
    static let inkSoft = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255).opacity(0.55)
    static let canvas = Color(red: 244 / 255, green: 247 / 255, blue: 245 / 255)
    static let card = Color.white
    static let amber = Color(red: 216 / 255, green: 153 / 255, blue: 38 / 255)
}

private enum MarketelNativeMessageError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let value): return value
        }
    }
}

private struct MarketelGuestMessage: Decodable, Identifiable {
    let id: String
    let createdAt: String
    let bookingId: String?
    let reservationCode: String?
    let bookingStatus: String?
    let checkin: String?
    let checkout: String?
    let cancellationReason: String?
    let guestName: String?
    let guestEmail: String?
    let guestPhone: String?
    let roomName: String?
    let body: String?
    let requests: [String]?
    let sender: String?
    var read: Bool?

    var isFromOwner: Bool { sender == "hotel" }
    var isUnreadGuestMessage: Bool { !isFromOwner && read != true }
    var displayBody: String {
        let cleanBody = (body ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanBody.isEmpty { return cleanBody }
        return (requests ?? []).joined(separator: ", ")
    }
}

private struct MarketelGuestConversation: Identifiable {
    let id: String
    let code: String
    let guestName: String
    let guestEmail: String
    let guestPhone: String
    let roomName: String
    let bookingStatus: String
    let checkin: String?
    let checkout: String?
    let cancellationReason: String
    let messages: [MarketelGuestMessage]

    var latest: MarketelGuestMessage? { messages.last }
    var unreadCount: Int { messages.filter(\.isUnreadGuestMessage).count }
}

private struct MarketelSupportMessage: Decodable, Identifiable {
    let id: String
    let sender: String
    let body: String
    let createdAt: String
}

private struct MarketelSupportThread: Decodable {
    let id: String
    let status: String
    let unread: Int
    let messages: [MarketelSupportMessage]
}

private struct MarketelGuestMessagesEnvelope: Decodable {
    let success: Bool
    let messages: [MarketelGuestMessage]
    let unread: Int?
}

private struct MarketelGuestReplyEnvelope: Decodable {
    let success: Bool
    let message: MarketelGuestMessage
}

private struct MarketelSupportEnvelope: Decodable {
    let success: Bool
    let thread: MarketelSupportThread?
}

private struct MarketelEmptyEnvelope: Decodable {
    let success: Bool
}

private struct MarketelNativeMessageClient {
    let origin: URL
    let hotelId: String
    let authToken: String

    private func endpoint(_ path: String) throws -> URL {
        guard let baseURL = URL(string: path, relativeTo: origin)?.absoluteURL,
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw MarketelNativeMessageError.message("Could not create the request.")
        }
        var query = components.queryItems ?? []
        query.removeAll { $0.name == "hotelId" }
        query.append(URLQueryItem(name: "hotelId", value: hotelId))
        components.queryItems = query
        guard let url = components.url else {
            throw MarketelNativeMessageError.message("Could not create the request.")
        }
        return url
    }

    private func request<Response: Decodable>(
        _ path: String,
        method: String = "GET",
        body: [String: Any]? = nil
    ) async throws -> Response {
        var request = URLRequest(url: try endpoint(path))
        request.httpMethod = method
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(authToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw MarketelNativeMessageError.message("Front Desk did not return a response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let serverMessage = object?["message"] as? String
            throw MarketelNativeMessageError.message(
                serverMessage ?? (http.statusCode == 401 ? "Your Front Desk session expired. Sign in again." : "Could not load messages.")
            )
        }
        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw MarketelNativeMessageError.message("Front Desk returned an unreadable response.")
        }
    }

    func guestMessages() async throws -> [MarketelGuestMessage] {
        let envelope: MarketelGuestMessagesEnvelope = try await request("/api/crm/messages")
        guard envelope.success else { throw MarketelNativeMessageError.message("Could not load guest messages.") }
        return envelope.messages
    }

    func markGuestMessagesRead(_ messages: [MarketelGuestMessage]) async {
        for message in messages where message.isUnreadGuestMessage {
            let encoded = message.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? message.id
            let _: MarketelEmptyEnvelope? = try? await request(
                "/api/crm/messages/\(encoded)/read",
                method: "POST",
                body: [:]
            )
        }
    }

    func markAllGuestMessagesRead() async throws {
        let envelope: MarketelEmptyEnvelope = try await request(
            "/api/crm/messages/read-all",
            method: "POST",
            body: [:]
        )
        guard envelope.success else { throw MarketelNativeMessageError.message("Could not mark messages as read.") }
    }

    func reply(to reservationCode: String, body: String) async throws -> MarketelGuestMessage {
        let encoded = reservationCode.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? reservationCode
        let envelope: MarketelGuestReplyEnvelope = try await request(
            "/api/crm/messages/\(encoded)/reply",
            method: "POST",
            body: ["body": body]
        )
        guard envelope.success else { throw MarketelNativeMessageError.message("Could not send that message.") }
        return envelope.message
    }

    func supportThread(markRead: Bool) async throws -> MarketelSupportThread? {
        let envelope: MarketelSupportEnvelope = try await request("/api/crm/support")
        guard envelope.success else { throw MarketelNativeMessageError.message("Could not load support.") }
        if markRead, (envelope.thread?.unread ?? 0) > 0 {
            let _: MarketelEmptyEnvelope? = try? await request(
                "/api/crm/support/read",
                method: "POST",
                body: [:]
            )
        }
        return envelope.thread
    }

    func sendSupportMessage(_ message: String) async throws -> MarketelSupportThread? {
        let envelope: MarketelSupportEnvelope = try await request(
            "/api/crm/support",
            method: "POST",
            body: [
                "message": message,
                "surface": "frontdesk-ios-native",
                "pagePath": "/frontdesk/native-support",
            ]
        )
        guard envelope.success else { throw MarketelNativeMessageError.message("Could not send that message.") }
        return envelope.thread
    }
}

@MainActor
private final class MarketelGuestMessagesModel: ObservableObject {
    @Published var messages: [MarketelGuestMessage] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    let client: MarketelNativeMessageClient

    init(client: MarketelNativeMessageClient) {
        self.client = client
    }

    var conversations: [MarketelGuestConversation] {
        let grouped = Dictionary(grouping: messages) { message in
            let code = (message.reservationCode ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            return code.isEmpty ? message.id : code
        }
        return grouped.map { key, rawMessages in
            let sorted = rawMessages.sorted { $0.createdAt < $1.createdAt }
            let representative = sorted.last ?? rawMessages[0]
            return MarketelGuestConversation(
                id: key,
                code: (representative.reservationCode ?? key),
                guestName: clean(representative.guestName, fallback: "Guest"),
                guestEmail: clean(representative.guestEmail),
                guestPhone: clean(representative.guestPhone),
                roomName: clean(representative.roomName, fallback: "Booked guest"),
                bookingStatus: clean(representative.bookingStatus),
                checkin: representative.checkin,
                checkout: representative.checkout,
                cancellationReason: clean(representative.cancellationReason),
                messages: sorted
            )
        }.sorted { left, right in
            if left.unreadCount != right.unreadCount { return left.unreadCount > right.unreadCount }
            return (left.latest?.createdAt ?? "") > (right.latest?.createdAt ?? "")
        }
    }

    func conversation(id: String) -> MarketelGuestConversation? {
        conversations.first { $0.id == id }
    }

    func load(silent: Bool = false) async {
        if !silent { isLoading = messages.isEmpty }
        do {
            messages = try await client.guestMessages()
            errorMessage = nil
        } catch {
            if !silent { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func markRead(conversationID: String) async {
        guard let conversation = conversation(id: conversationID) else { return }
        let unreadIDs = Set(conversation.messages.filter(\.isUnreadGuestMessage).map(\.id))
        guard !unreadIDs.isEmpty else { return }
        for index in messages.indices where unreadIDs.contains(messages[index].id) {
            messages[index].read = true
        }
        await client.markGuestMessagesRead(conversation.messages)
    }

    func markAllRead() async {
        messages.indices.forEach { messages[$0].read = true }
        try? await client.markAllGuestMessagesRead()
    }

    func send(_ body: String, conversationID: String) async throws {
        guard let conversation = conversation(id: conversationID) else {
            throw MarketelNativeMessageError.message("That conversation is no longer available.")
        }
        _ = try await client.reply(to: conversation.code, body: body)
        await load(silent: true)
    }

    private func clean(_ value: String?, fallback: String = "") -> String {
        let clean = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return clean.isEmpty ? fallback : clean
    }
}

@MainActor
private final class MarketelSupportMessagesModel: ObservableObject {
    @Published var thread: MarketelSupportThread?
    @Published var isLoading = true
    @Published var errorMessage: String?

    let client: MarketelNativeMessageClient

    init(client: MarketelNativeMessageClient) {
        self.client = client
    }

    func load(silent: Bool = false) async {
        if !silent { isLoading = thread == nil }
        do {
            thread = try await client.supportThread(markRead: true)
            errorMessage = nil
        } catch {
            if !silent { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func send(_ message: String) async throws {
        thread = try await client.sendSupportMessage(message)
        errorMessage = nil
    }
}

struct MarketelNativeGuestMessagesView: View {
    @Environment(\.presentationMode) private var presentationMode
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: MarketelGuestMessagesModel
    let onClose: () -> Void

    init(origin: URL, hotelId: String, authToken: String, onClose: @escaping () -> Void) {
        let client = MarketelNativeMessageClient(origin: origin, hotelId: hotelId, authToken: authToken)
        _model = StateObject(wrappedValue: MarketelGuestMessagesModel(client: client))
        self.onClose = onClose
    }

    var body: some View {
        NavigationView {
            Group {
                if model.isLoading && model.messages.isEmpty {
                    ProgressView()
                        .tint(MarketelMessageTheme.green)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = model.errorMessage, model.messages.isEmpty {
                    nativeErrorState(error) { Task { await model.load() } }
                } else if model.conversations.isEmpty {
                    nativeEmptyState(
                        title: "No conversations yet",
                        message: "After a guest books, every message and reply stays with that reservation.",
                        symbol: "bubble.left.and.bubble.right"
                    )
                } else {
                    List {
                        ForEach(model.conversations) { conversation in
                            NavigationLink {
                                MarketelNativeGuestThreadView(
                                    conversationID: conversation.id,
                                    model: model
                                )
                            } label: {
                                MarketelNativeConversationRow(conversation: conversation)
                            }
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                    .refreshable { await model.load() }
                }
            }
            .background(MarketelMessageTheme.canvas.ignoresSafeArea())
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.large)
            .navigationBarItems(
                leading: Button("Done") {
                    onClose()
                    presentationMode.wrappedValue.dismiss()
                },
                trailing: Group {
                    if model.conversations.contains(where: { $0.unreadCount > 0 }) {
                        Button("Read all") { Task { await model.markAllRead() } }
                            .font(.system(size: 13, weight: .semibold))
                    }
                }
            )
        }
        .navigationViewStyle(.stack)
        .tint(MarketelMessageTheme.green)
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
    }
}

private struct MarketelNativeConversationRow: View {
    let conversation: MarketelGuestConversation

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(MarketelMessageTheme.green.opacity(0.12))
                Text(String(conversation.guestName.first ?? "G"))
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(MarketelMessageTheme.green)
            }
            .frame(width: 52, height: 52)

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text(conversation.guestName)
                        .font(.system(size: 16, weight: conversation.unreadCount > 0 ? .bold : .semibold))
                        .foregroundStyle(MarketelMessageTheme.ink)
                        .lineLimit(1)
                    Spacer()
                    if let latest = conversation.latest {
                        Text(nativeMessageTime(latest.createdAt))
                            .font(.system(size: 11, weight: conversation.unreadCount > 0 ? .bold : .regular))
                            .foregroundStyle(conversation.unreadCount > 0 ? MarketelMessageTheme.green : MarketelMessageTheme.inkSoft)
                    }
                }
                Text(nativeConversationPreview(conversation))
                    .font(.system(size: 14, weight: conversation.unreadCount > 0 ? .semibold : .regular))
                    .foregroundStyle(conversation.unreadCount > 0 ? MarketelMessageTheme.ink : MarketelMessageTheme.inkSoft)
                    .lineLimit(1)
                Text(nativeConversationContext(conversation))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(MarketelMessageTheme.inkSoft)
                    .lineLimit(1)
            }

            if conversation.unreadCount > 0 {
                Text("\(min(conversation.unreadCount, 99))")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(minWidth: 22, minHeight: 22)
                    .background(MarketelMessageTheme.green, in: Capsule())
            }
        }
        .padding(16)
        .background(MarketelMessageTheme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct MarketelNativeGuestThreadView: View {
    let conversationID: String
    @ObservedObject var model: MarketelGuestMessagesModel
    @State private var draft = ""
    @State private var sending = false
    @State private var sendError: String?

    var body: some View {
        Group {
            if let conversation = model.conversation(id: conversationID) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            MarketelNativeBookingContext(conversation: conversation)
                            ForEach(conversation.messages) { message in
                                nativeMessageBubble(
                                    text: message.displayBody,
                                    mine: message.isFromOwner,
                                    id: message.id
                                )
                            }
                        }
                        .padding(16)
                    }
                    .background(MarketelMessageTheme.canvas)
                    .onAppear { scrollToLatest(conversation, proxy: proxy, animated: false) }
                    .onChange(of: conversation.messages.count) { _ in
                        scrollToLatest(conversation, proxy: proxy, animated: true)
                    }
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        nativeComposer(
                            draft: $draft,
                            sending: sending,
                            placeholder: "Message \(conversation.guestName)",
                            error: sendError,
                            send: { send(conversation) }
                        )
                    }
                    .navigationTitle(conversation.guestName)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            MarketelNativeContactMenu(conversation: conversation)
                        }
                    }
                    .task { await model.markRead(conversationID: conversationID) }
                }
            } else {
                nativeEmptyState(
                    title: "Conversation unavailable",
                    message: "Pull down on Messages and try again.",
                    symbol: "bubble.left"
                )
            }
        }
        .background(MarketelMessageTheme.canvas.ignoresSafeArea())
    }

    private func send(_ conversation: MarketelGuestConversation) {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !sending else { return }
        draft = ""
        sending = true
        sendError = nil
        Task {
            do {
                try await model.send(text, conversationID: conversation.id)
                sending = false
            } catch {
                draft = text
                sendError = error.localizedDescription
                sending = false
            }
        }
    }

    private func scrollToLatest(
        _ conversation: MarketelGuestConversation,
        proxy: ScrollViewProxy,
        animated: Bool
    ) {
        guard let last = conversation.messages.last else { return }
        DispatchQueue.main.async {
            if animated {
                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(last.id, anchor: .bottom) }
            } else {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }
}

private struct MarketelNativeBookingContext: View {
    let conversation: MarketelGuestConversation

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 7) {
                Text(conversation.roomName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MarketelMessageTheme.ink)
                if !conversation.bookingStatus.isEmpty {
                    Text(nativeBookingStatus(conversation.bookingStatus))
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(nativeBookingStatusColor(conversation.bookingStatus))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(nativeBookingStatusColor(conversation.bookingStatus).opacity(0.12), in: Capsule())
                }
                Spacer()
            }
            if let dates = nativeStayDates(conversation.checkin, conversation.checkout) {
                Text(dates)
                    .font(.system(size: 12))
                    .foregroundStyle(MarketelMessageTheme.inkSoft)
            }
            if ["pending"].contains(conversation.bookingStatus.lowercased()) {
                Text("This room request is still waiting for a keep or release decision.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(red: 118 / 255, green: 89 / 255, blue: 31 / 255))
            } else if ["released", "cancelled", "canceled"].contains(conversation.bookingStatus.lowercased()) {
                Text(conversation.cancellationReason.isEmpty
                     ? "This reservation is no longer active."
                     : conversation.cancellationReason)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(red: 121 / 255, green: 81 / 255, blue: 81 / 255))
            }
        }
        .padding(13)
        .background(MarketelMessageTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.bottom, 5)
    }
}

private struct MarketelNativeContactMenu: View {
    let conversation: MarketelGuestConversation

    var body: some View {
        Menu {
            if let phoneURL = nativePhoneURL(conversation.guestPhone, scheme: "tel") {
                Link(destination: phoneURL) { Label("Call guest", systemImage: "phone") }
            }
            if let textURL = nativePhoneURL(conversation.guestPhone, scheme: "sms") {
                Link(destination: textURL) { Label("Text guest", systemImage: "message") }
            }
            if let emailURL = nativeEmailURL(conversation.guestEmail) {
                Link(destination: emailURL) { Label("Email guest", systemImage: "envelope") }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .font(.system(size: 18, weight: .semibold))
        }
        .accessibilityLabel("Guest contact options")
    }
}

struct MarketelNativeSupportView: View {
    @Environment(\.presentationMode) private var presentationMode
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: MarketelSupportMessagesModel
    @State private var draft = ""
    @State private var sending = false
    @State private var sendError: String?
    let onClose: () -> Void

    init(origin: URL, hotelId: String, authToken: String, onClose: @escaping () -> Void) {
        let client = MarketelNativeMessageClient(origin: origin, hotelId: hotelId, authToken: authToken)
        _model = StateObject(wrappedValue: MarketelSupportMessagesModel(client: client))
        self.onClose = onClose
    }

    var body: some View {
        NavigationView {
            Group {
                if model.isLoading && model.thread == nil {
                    ProgressView()
                        .tint(MarketelMessageTheme.green)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = model.errorMessage, model.thread == nil {
                    nativeErrorState(error) { Task { await model.load() } }
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                if (model.thread?.messages ?? []).isEmpty {
                                    nativeEmptyState(
                                        title: "Talk directly with Marketel",
                                        message: "Ask a question, report a problem, or share feedback. Your conversation stays here.",
                                        symbol: "questionmark.bubble"
                                    )
                                    .frame(minHeight: 420)
                                }
                                ForEach(model.thread?.messages ?? []) { message in
                                    nativeMessageBubble(
                                        text: message.body,
                                        mine: message.sender == "owner",
                                        id: message.id
                                    )
                                }
                            }
                            .padding(16)
                        }
                        .background(MarketelMessageTheme.canvas)
                        .onAppear { scrollSupport(proxy: proxy, animated: false) }
                        .onChange(of: model.thread?.messages.count ?? 0) { _ in
                            scrollSupport(proxy: proxy, animated: true)
                        }
                        .safeAreaInset(edge: .bottom, spacing: 0) {
                            nativeComposer(
                                draft: $draft,
                                sending: sending,
                                placeholder: "Message Marketel",
                                error: sendError,
                                send: send
                            )
                        }
                    }
                }
            }
            .background(MarketelMessageTheme.canvas.ignoresSafeArea())
            .navigationTitle("Marketel")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Done") {
                    onClose()
                    presentationMode.wrappedValue.dismiss()
                },
                trailing: Text(model.thread?.status == "resolved" ? "Resolved" : "Replies here")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MarketelMessageTheme.green)
            )
        }
        .navigationViewStyle(.stack)
        .tint(MarketelMessageTheme.green)
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
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !sending else { return }
        draft = ""
        sending = true
        sendError = nil
        Task {
            do {
                try await model.send(text)
                sending = false
            } catch {
                draft = text
                sendError = error.localizedDescription
                sending = false
            }
        }
    }

    private func scrollSupport(proxy: ScrollViewProxy, animated: Bool) {
        guard let last = model.thread?.messages.last else { return }
        DispatchQueue.main.async {
            if animated {
                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(last.id, anchor: .bottom) }
            } else {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }
}

@ViewBuilder
private func nativeMessageBubble(text: String, mine: Bool, id: String) -> some View {
    HStack {
        if mine { Spacer(minLength: 54) }
        Text(text)
            .font(.system(size: 15))
            .foregroundStyle(mine ? Color.white : MarketelMessageTheme.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                mine ? MarketelMessageTheme.green : MarketelMessageTheme.card,
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
        if !mine { Spacer(minLength: 54) }
    }
    .id(id)
}

@ViewBuilder
private func nativeComposer(
    draft: Binding<String>,
    sending: Bool,
    placeholder: String,
    error: String?,
    send: @escaping () -> Void
) -> some View {
    VStack(spacing: 5) {
        if let error {
            Text(error)
                .font(.system(size: 11))
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
        }
        HStack(alignment: .center, spacing: 10) {
            TextField(placeholder, text: draft)
                .submitLabel(.send)
                .onSubmit(send)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(MarketelMessageTheme.card, in: Capsule())
            Button(action: send) {
                Group {
                    if sending { ProgressView().tint(.white) }
                    else { Image(systemName: "arrow.up").font(.system(size: 16, weight: .bold)) }
                }
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(MarketelMessageTheme.green, in: Circle())
            }
            .disabled(sending || draft.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
    .padding(.horizontal, 12)
    .padding(.top, 8)
    .padding(.bottom, 8)
    .background(.ultraThinMaterial)
}

@ViewBuilder
private func nativeEmptyState(title: String, message: String, symbol: String) -> some View {
    VStack(spacing: 12) {
        Image(systemName: symbol)
            .font(.system(size: 30, weight: .medium))
            .foregroundStyle(MarketelMessageTheme.green)
        Text(title)
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(MarketelMessageTheme.ink)
        Text(message)
            .font(.system(size: 14))
            .foregroundStyle(MarketelMessageTheme.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 30)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
}

@ViewBuilder
private func nativeErrorState(_ message: String, retry: @escaping () -> Void) -> some View {
    VStack(spacing: 14) {
        Image(systemName: "wifi.exclamationmark")
            .font(.system(size: 28, weight: .medium))
            .foregroundStyle(MarketelMessageTheme.green)
        Text("Messages couldn’t load")
            .font(.system(size: 18, weight: .bold))
            .foregroundStyle(MarketelMessageTheme.ink)
        Text(message)
            .font(.system(size: 13))
            .foregroundStyle(MarketelMessageTheme.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 30)
        Button("Try Again", action: retry)
            .buttonStyle(.borderedProminent)
            .tint(MarketelMessageTheme.green)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
}

private func nativeConversationPreview(_ conversation: MarketelGuestConversation) -> String {
    guard let message = conversation.latest else { return "Message this guest" }
    let prefix = message.isFromOwner ? "You: " : ""
    return prefix + (message.displayBody.isEmpty ? "Message" : message.displayBody)
}

private func nativeConversationContext(_ conversation: MarketelGuestConversation) -> String {
    if let dates = nativeStayDates(conversation.checkin, conversation.checkout) {
        return "\(conversation.roomName) · \(dates)"
    }
    return conversation.roomName
}

private func nativeDate(_ raw: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let value = fractional.date(from: raw) { return value }
    return ISO8601DateFormatter().date(from: raw)
}

private func nativeMessageTime(_ raw: String) -> String {
    guard let date = nativeDate(raw) else { return "" }
    if Calendar.current.isDateInToday(date) {
        return date.formatted(date: .omitted, time: .shortened)
    }
    return date.formatted(.dateTime.month(.abbreviated).day())
}

private func nativeStayDates(_ checkin: String?, _ checkout: String?) -> String? {
    func day(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: String(raw.prefix(10)))
    }
    guard let start = day(checkin) else { return nil }
    let startText = start.formatted(.dateTime.month(.abbreviated).day())
    guard let end = day(checkout) else { return startText }
    return "\(startText)–\(end.formatted(.dateTime.month(.abbreviated).day()))"
}

private func nativeBookingStatus(_ status: String) -> String {
    switch status.lowercased() {
    case "pending": return "Awaiting decision"
    case "released": return "Released"
    case "cancelled", "canceled": return "Cancelled"
    case "confirmed": return "Confirmed"
    default: return status.capitalized
    }
}

private func nativeBookingStatusColor(_ status: String) -> Color {
    switch status.lowercased() {
    case "pending": return MarketelMessageTheme.amber
    case "released", "cancelled", "canceled": return .red
    default: return MarketelMessageTheme.green
    }
}

private func nativePhoneURL(_ raw: String, scheme: String) -> URL? {
    let digits = raw.filter(\.isNumber)
    guard digits.count >= 7 else { return nil }
    return URL(string: "\(scheme):\(digits)")
}

private func nativeEmailURL(_ raw: String) -> URL? {
    let clean = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard clean.contains("@"), let encoded = clean.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
        return nil
    }
    return URL(string: "mailto:\(encoded)")
}
