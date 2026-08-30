import SwiftUI

struct MessagesView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @State private var selected: ConversationDestination?
    @State private var deletionError: String?

    private var stays: [Reservation] {
        store.reservations.filter { stay in
            store.conversation(for: stay) != nil
        }.sorted {
            ($0.checkinDate ?? .distantPast) > ($1.checkinDate ?? .distantPast)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if stays.isEmpty {
                    ContentUnavailableView {
                        Label("No conversations yet", systemImage: "bubble.left.and.bubble.right")
                    } description: {
                        Text("After you book, message the property’s Front Desk here and keep every reply with your stay.")
                    }
                } else {
                    List {
                        ForEach(stays) { stay in
                            conversationRow(stay)
                                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                .listRowSeparator(.hidden)
                                .listRowBackground(Color.clear)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        deleteConversation(stay)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable { await store.refreshConversations() }
                }
            }
            .background(Theme.canvas)
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.large)
        }
        .task {
            await store.refreshConversations()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(45))
                if scenePhase == .active { await store.refreshConversations() }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await store.refreshConversations() } }
        }
        .sheet(item: $selected, onDismiss: {
            Task { await store.refreshConversations() }
        }) { destination in
            NativeMessagesView(hotel: destination.hotel, stay: destination.stay)
        }
        .alert("Conversation Not Deleted", isPresented: Binding(
            get: { deletionError != nil },
            set: { if !$0 { deletionError = nil } }
        )) {
            Button("OK", role: .cancel) { deletionError = nil }
        } message: {
            Text(deletionError ?? "Please try again.")
        }
    }

    private func conversationRow(_ stay: Reservation) -> some View {
        let hotel = store.hotels.first { $0.hotelId == stay.hotelId }
            ?? Hotel(hotelId: stay.hotelId, domain: "", name: store.hotelName(for: stay.hotelId), location: "Direct booking", stays: 1, lastStayed: "—")
        let preview = store.conversation(for: stay)
        let last = preview?.latestMessage
        let unread = preview?.unreadCount ?? 0
        // The reservation receives the APNs status immediately; the inbox
        // summary may still contain its pre-push value for one network round
        // trip, so prefer the live reservation state.
        let status = normalizedStatus(stay.status ?? preview?.status)

        return Button {
            store.markConversationRead(stay)
            selected = ConversationDestination(hotel: hotel, stay: stay)
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(Theme.green.opacity(0.12))
                    if let imageURL = hotel.imageURL {
                        CachedRemoteImage(url: imageURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: { propertyInitial(hotel.name) }
                        .clipShape(Circle())
                    } else {
                        propertyInitial(hotel.name)
                    }
                }
                .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 8) {
                        Text(hotel.name)
                            .font(.system(size: 16, weight: unread > 0 ? .bold : .semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        statusBadge(status)
                        Spacer()
                        if let last {
                            Text(shortTime(last.createdAt))
                                .font(.system(size: 11, weight: unread > 0 ? .bold : .regular))
                                .foregroundStyle(unread > 0 ? Theme.green : Theme.inkSoft)
                        }
                    }
                    Text(conversationSummary(status: status, latest: last))
                        .font(.system(size: 14, weight: unread > 0 ? .semibold : .regular))
                        .foregroundStyle(isInactive(status) ? Color.red.opacity(0.78) : (unread > 0 ? Theme.ink : Theme.inkSoft))
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        Text(stay.roomName?.isEmpty == false ? stay.roomName! : "Your stay")
                        Text("·")
                        Text(dateRange(stay))
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
                }

                if unread > 0 {
                    Text("\(min(unread, 99))")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(minWidth: 22, minHeight: 22)
                        .background(Theme.green, in: Capsule())
                } else {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft.opacity(0.55))
                }
            }
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func deleteConversation(_ stay: Reservation) {
        let token = stay.accessToken?.trimmingCharacters(in: .whitespacesAndNewlines)
        let accessToken = token?.isEmpty == false ? token : GuestIdentityAccess.token
        guard let accessToken else {
            deletionError = "Restore this stay from Account, then try again."
            return
        }

        // A destructive swipe is the confirmation. Remove the row in the same
        // transaction as the swipe action so the next conversation moves once,
        // rather than moving up, back down for an alert, then up again.
        withAnimation(.snappy(duration: 0.22)) {
            store.removeConversation(stay)
        }
        Task {
            do {
                try await BookingAPI.deleteConversation(
                    hotelId: stay.hotelId,
                    code: stay.code,
                    accessToken: accessToken
                )
            } catch {
                await store.refreshConversations()
                await MainActor.run {
                    deletionError = error.localizedDescription
                }
            }
        }
    }

    private func propertyInitial(_ name: String) -> some View {
        Text(String(name.trimmingCharacters(in: .whitespacesAndNewlines).first ?? "H"))
            .font(.system(size: 19, weight: .bold))
            .foregroundStyle(Theme.green)
    }

    private func messagePreview(_ message: BookingAPI.GuestMessage) -> String {
        let body = message.body.trimmingCharacters(in: .whitespacesAndNewlines)
        let text = body.isEmpty ? message.requests.joined(separator: ", ") : body
        return message.sender == "guest" ? "You: \(text)" : text
    }

    private func normalizedStatus(_ raw: String?) -> String {
        raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
    }

    private func isInactive(_ status: String) -> Bool {
        ["released", "cancelled", "canceled", "declined"].contains(status)
    }

    private func conversationSummary(status: String, latest: BookingAPI.GuestMessage?) -> String {
        switch status {
        case "released", "declined":
            return "This room request was released"
        case "cancelled", "canceled":
            return "This reservation was cancelled"
        case "pending":
            return latest.map(messagePreview) ?? "Front Desk is checking your room"
        default:
            return latest.map(messagePreview) ?? "Message the Front Desk about this stay"
        }
    }

    @ViewBuilder
    private func statusBadge(_ status: String) -> some View {
        let label: String? = switch status {
        case "pending": "Pending"
        case "confirmed": "Confirmed"
        case "released", "declined": "Released"
        case "cancelled", "canceled": "Cancelled"
        default: nil
        }
        if let label {
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(isInactive(status) ? Color.red : (status == "pending" ? Color.orange : Theme.green))
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(
                    (isInactive(status) ? Color.red : (status == "pending" ? Color.orange : Theme.green)).opacity(0.1),
                    in: Capsule()
                )
                .fixedSize()
        }
    }

    private func dateRange(_ stay: Reservation) -> String {
        guard let start = stay.checkinDate, let end = stay.checkoutDate else { return "Reservation #\(stay.code)" }
        return "\(start.formatted(.dateTime.month(.abbreviated).day()))–\(end.formatted(.dateTime.month(.abbreviated).day()))"
    }

    private func shortTime(_ raw: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: raw) else { return "" }
        if Calendar.current.isDateInToday(date) { return date.formatted(.dateTime.hour().minute()) }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }
}

private struct ConversationDestination: Identifiable {
    let hotel: Hotel
    let stay: Reservation
    var id: String { stay.id }
}
