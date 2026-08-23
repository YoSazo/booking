import SwiftUI

struct MessagesView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @State private var selected: ConversationDestination?
    @State private var pendingDeletion: Reservation?
    @State private var deletingConversationID: String?
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
                                        pendingDeletion = stay
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
        .confirmationDialog(
            "Delete this conversation?",
            isPresented: Binding(
                get: { pendingDeletion != nil },
                set: { if !$0 { pendingDeletion = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete Conversation", role: .destructive) {
                guard let stay = pendingDeletion else { return }
                pendingDeletion = nil
                deleteConversation(stay)
            }
            Button("Cancel", role: .cancel) { pendingDeletion = nil }
        } message: {
            Text("This removes the conversation from Guestel. The property keeps its copy.")
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
                        Spacer()
                        if let last {
                            Text(shortTime(last.createdAt))
                                .font(.system(size: 11, weight: unread > 0 ? .bold : .regular))
                                .foregroundStyle(unread > 0 ? Theme.green : Theme.inkSoft)
                        }
                    }
                    Text(last.map(messagePreview) ?? "Message the Front Desk about this stay")
                        .font(.system(size: 14, weight: unread > 0 ? .semibold : .regular))
                        .foregroundStyle(unread > 0 ? Theme.ink : Theme.inkSoft)
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
        .opacity(deletingConversationID == stay.id ? 0.45 : 1)
        .disabled(deletingConversationID == stay.id)
    }

    private func deleteConversation(_ stay: Reservation) {
        let token = stay.accessToken?.trimmingCharacters(in: .whitespacesAndNewlines)
        let accessToken = token?.isEmpty == false ? token : GuestIdentityAccess.token
        guard let accessToken else {
            deletionError = "Restore this stay from Account, then try again."
            return
        }
        deletingConversationID = stay.id
        Task {
            do {
                try await BookingAPI.deleteConversation(
                    hotelId: stay.hotelId,
                    code: stay.code,
                    accessToken: accessToken
                )
                await MainActor.run {
                    store.removeConversation(stay)
                    deletingConversationID = nil
                }
            } catch {
                await MainActor.run {
                    deletionError = error.localizedDescription
                    deletingConversationID = nil
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
