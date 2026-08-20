import SwiftUI

struct NativeMessagesView: View {
    let hotel: Hotel
    let stay: Reservation

    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var messages: [BookingAPI.GuestMessage] = []
    @State private var draft = ""
    @State private var loading = true
    @State private var sending = false
    @State private var error: String?

    private var accessToken: String? {
        let reservation = stay.accessToken?.trimmingCharacters(in: .whitespacesAndNewlines)
        return reservation?.isEmpty == false ? reservation : GuestIdentityAccess.token
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if loading && messages.isEmpty {
                    ProgressView().tint(Theme.green).frame(maxHeight: .infinity)
                } else if accessToken == nil {
                    ContentUnavailableView(
                        "Restore this stay",
                        systemImage: "lock.shield",
                        description: Text("Restore your stays from Account before messaging the property.")
                    )
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                if messages.isEmpty {
                                    Text("Ask about check-in, arrival, or anything you need for this stay.")
                                        .font(.system(size: 14))
                                        .foregroundStyle(Theme.inkSoft)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 36)
                                        .padding(.top, 44)
                                }
                                ForEach(messages) { message in
                                    bubble(message)
                                        .id(message.id)
                                }
                            }
                            .padding(16)
                        }
                        .scrollDismissesKeyboard(.interactively)
                        .onChange(of: messages.count) { _, _ in
                            if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                        }
                    }
                }

                if let error {
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 16)
                        .padding(.top, 6)
                }

                if accessToken != nil {
                    HStack(alignment: .bottom, spacing: 10) {
                        TextField("Message Front Desk", text: $draft, axis: .vertical)
                            .lineLimit(1...5)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 11)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        Button(action: send) {
                            Group {
                                if sending { ProgressView().tint(.white) }
                                else { Image(systemName: "arrow.up").font(.system(size: 16, weight: .bold)) }
                            }
                            .foregroundStyle(.white)
                            .frame(width: 42, height: 42)
                            .background(Theme.green, in: Circle())
                        }
                        .disabled(sending || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
                    .padding(.bottom, 8)
                    .background(.ultraThinMaterial)
                }
            }
            .background(Theme.canvas)
            .navigationTitle(hotel.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Done") { dismiss() } } }
        }
        .task { await load() }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15))
                if scenePhase == .active { await load(silent: true) }
            }
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await load(silent: true) } } }
    }

    private func bubble(_ message: BookingAPI.GuestMessage) -> some View {
        let mine = message.sender == "guest"
        return HStack {
            if mine { Spacer(minLength: 54) }
            Text(message.body.isEmpty ? message.requests.joined(separator: ", ") : message.body)
                .font(.system(size: 15))
                .foregroundStyle(mine ? .white : Theme.ink)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(mine ? Theme.green : Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            if !mine { Spacer(minLength: 54) }
        }
    }

    private func load(silent: Bool = false) async {
        guard let accessToken else { loading = false; return }
        if !silent { loading = true }
        do {
            let rows = try await BookingAPI.messages(hotelId: hotel.hotelId, code: stay.code, accessToken: accessToken)
            await MainActor.run {
                messages = rows
                loading = false
                error = nil
                store.markConversationRead(stay)
            }
        } catch {
            await MainActor.run { if !silent { self.error = error.localizedDescription }; loading = false }
        }
    }

    private func send() {
        guard let accessToken else { return }
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        draft = ""
        sending = true
        error = nil
        Task {
            do {
                let message = try await BookingAPI.sendMessage(hotelId: hotel.hotelId, code: stay.code, body: text, accessToken: accessToken)
                await MainActor.run { messages.append(message); sending = false }
            } catch {
                await MainActor.run { draft = text; self.error = error.localizedDescription; sending = false }
            }
        }
    }
}
