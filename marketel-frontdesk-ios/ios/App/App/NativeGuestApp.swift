import SwiftUI
import PhotosUI
import UIKit

@MainActor
private final class MarketelGuestAppModel: ObservableObject {
    @Published var rooms: [MarketelRoom] = []
    @Published var stats: MarketelGuestStatsEnvelope?
    @Published var subtitle: String
    @Published var imageURL: String
    @Published var isLoading = true
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var successMessage: String?

    let api: MarketelNativeAPI
    let onDataChanged: () -> Void

    init(session: MarketelNativeSession, origin: URL, onDataChanged: @escaping () -> Void) {
        api = MarketelNativeAPI(origin: origin, hotelId: session.hotelId, authToken: session.authToken)
        subtitle = session.walletSubtitle
        imageURL = session.walletImageURL
        self.onDataChanged = onDataChanged
    }

    func load(silent: Bool = false) async {
        if !silent { isLoading = rooms.isEmpty && stats == nil }
        do {
            async let roomsRequest: MarketelRoomsEnvelope = api.request("/api/crm/rooms")
            async let statsRequest: MarketelGuestStatsEnvelope = api.request("/api/crm/guest-install-stats")
            let (roomResult, statsResult) = try await (roomsRequest, statsRequest)
            rooms = roomResult.success ? roomResult.rooms : []
            stats = statsResult.success ? statsResult : nil
            errorMessage = nil
        } catch {
            if !silent || stats == nil { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func saveCard() async {
        await perform("Guestel card updated") {
            let response: MarketelWalletCardEnvelope = try await api.request(
                "/api/crm/guestel-wallet-card",
                method: "POST",
                body: ["subtitle": subtitle.marketelTrimmed]
            )
            guard response.success else {
                throw MarketelNativeAPIError.message(response.message ?? "Could not save the Guestel card.")
            }
            subtitle = response.subtitle ?? subtitle
            if let value = response.imageUrl { imageURL = value }
        }
    }

    func upload(_ image: UIImage) async {
        guard let data = image.jpegData(compressionQuality: 0.86) else {
            errorMessage = "Could not prepare that photo."
            return
        }
        await perform("Guestel cover updated") {
            imageURL = try await api.uploadImage(data)
        }
    }

    func removeCover() async {
        await perform("Guestel cover removed") {
            let response: MarketelEmptyEnvelope = try await api.request(
                "/api/crm/guestel-wallet-image",
                method: "DELETE"
            )
            guard response.success else {
                throw MarketelNativeAPIError.message(response.message ?? "Could not remove that cover.")
            }
            imageURL = ""
        }
    }

    func broadcast(title: String, body: String) async throws -> Int {
        isSaving = true
        defer { isSaving = false }
        let response: MarketelBroadcastEnvelope = try await api.request(
            "/api/crm/guest-broadcast",
            method: "POST",
            body: ["title": title.marketelTrimmed, "body": body.marketelTrimmed]
        )
        guard response.success else {
            throw MarketelNativeAPIError.message(response.message ?? "Could not notify guests.")
        }
        await load(silent: true)
        return response.sent ?? 0
    }

    private func perform(_ success: String, operation: () async throws -> Void) async {
        isSaving = true
        errorMessage = nil
        successMessage = nil
        defer { isSaving = false }
        do {
            try await operation()
            successMessage = success
            onDataChanged()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct MarketelNativeGuestAppView: View {
    @ObservedObject var session: MarketelNativeSession
    @StateObject private var model: MarketelGuestAppModel
    @State private var showingPhotoPicker = false
    @State private var showingBroadcast = false
    @State private var showingQR = false
    let origin: URL
    let onDataChanged: () -> Void
    let onOpenMessages: () -> Void
    let onOpenWebFallback: () -> Void

    init(
        session: MarketelNativeSession,
        origin: URL,
        onDataChanged: @escaping () -> Void,
        onOpenMessages: @escaping () -> Void,
        onOpenWebFallback: @escaping () -> Void
    ) {
        self.session = session
        self.origin = origin
        self.onDataChanged = onDataChanged
        self.onOpenMessages = onOpenMessages
        self.onOpenWebFallback = onOpenWebFallback
        _model = StateObject(wrappedValue: MarketelGuestAppModel(
            session: session,
            origin: origin,
            onDataChanged: onDataChanged
        ))
    }

    var body: some View {
        Group {
            if model.isLoading && model.stats == nil {
                ProgressView("Loading Guestel…")
                    .tint(MarketelNativeTheme.green)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = model.errorMessage, model.stats == nil {
                MarketelNativeErrorView(
                    message: error,
                    retry: { Task { await model.load() } },
                    openWeb: onOpenWebFallback
                )
            } else {
                content
            }
        }
        .background(MarketelNativeTheme.canvas)
        .task { await model.load() }
        .task(id: session.refreshGeneration) { await model.load(silent: model.stats != nil) }
        .sheet(isPresented: $showingPhotoPicker) {
            MarketelPhotoPicker { image in
                showingPhotoPicker = false
                Task { await model.upload(image) }
            }
        }
        .sheet(isPresented: $showingBroadcast) {
            MarketelGuestBroadcastView(
                propertyName: session.hotelName,
                subscriberCount: model.stats?.guestelBroadcastSubscribers ?? 0,
                send: model.broadcast
            )
        }
        .sheet(isPresented: $showingQR) {
            MarketelNativeQRView(session: session, origin: origin)
        }
        .alert("Front Desk", isPresented: Binding(
            get: { model.errorMessage != nil || model.successMessage != nil },
            set: {
                if !$0 {
                    model.errorMessage = nil
                    model.successMessage = nil
                }
            }
        )) {
            Button("OK", role: .cancel) {
                model.errorMessage = nil
                model.successMessage = nil
            }
        } message: {
            Text(model.errorMessage ?? model.successMessage ?? "")
        }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 15) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Guestel")
                        .font(.system(size: 25, weight: .bold))
                        .foregroundStyle(MarketelNativeTheme.ink)
                    Text("Your property stays on guests’ phones for direct rebooking, stay updates, and messages.")
                        .font(.system(size: 13))
                        .foregroundStyle(MarketelNativeTheme.inkSoft)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                MarketelWalletCardPreview(
                    propertyName: session.hotelName,
                    subtitle: model.subtitle,
                    imageURL: model.imageURL,
                    fallbackImageURL: model.rooms.first?.imageUrl ?? session.appIconURL,
                    origin: origin
                )

                walletEditor
                reachCard
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 30)
        }
        .refreshable { await model.load() }
    }

    private var walletEditor: some View {
        VStack(alignment: .leading, spacing: 13) {
            Text("WHAT GUESTS SAVE")
                .font(.system(size: 11, weight: .heavy))
                .tracking(0.7)
                .foregroundStyle(MarketelNativeTheme.inkSoft)
            TextField("Direct rates · Book again anytime", text: $model.subtitle)
                .textInputAutocapitalization(.sentences)
                .padding(13)
                .background(MarketelNativeTheme.canvas, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            HStack(spacing: 10) {
                Button { showingPhotoPicker = true } label: {
                    Label(model.imageURL.isEmpty ? "Choose cover" : "Change cover", systemImage: "photo")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                if !model.imageURL.isEmpty {
                    Button(role: .destructive) { Task { await model.removeCover() } } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.bordered)
                    .accessibilityLabel("Remove Guestel cover")
                }
            }
            Button(model.isSaving ? "Saving…" : "Save Guestel card") {
                Task { await model.saveCard() }
            }
            .buttonStyle(MarketelPrimaryButtonStyle())
            .disabled(model.isSaving)
        }
        .padding(17)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 19, style: .continuous).stroke(MarketelNativeTheme.border))
    }

    private var reachCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reach guests again")
                        .font(.system(size: 18, weight: .bold))
                    Text("Guests who keep your property in Guestel can receive an iPhone notification from you.")
                        .font(.system(size: 12))
                        .foregroundStyle(MarketelNativeTheme.inkSoft)
                }
                Spacer()
                Text(String(model.stats?.guestelBroadcastSubscribers ?? 0))
                    .font(.system(size: 25, weight: .bold))
                    .foregroundStyle(MarketelNativeTheme.green)
            }

            HStack(spacing: 10) {
                Button { showingBroadcast = true } label: {
                    Label("Notify guests", systemImage: "bell.badge.fill")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(.white)
                        .background(MarketelNativeTheme.green, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                Button(action: onOpenMessages) {
                    Label("Messages", systemImage: "message.fill")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(MarketelNativeTheme.mint, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
            }
            Button { showingQR = true } label: {
                Label("Show Guestel QR", systemImage: "qrcode.viewfinder")
                    .font(.system(size: 14, weight: .semibold))
            }

            if let stats = model.stats {
                Divider()
                HStack(spacing: 10) {
                    stat("Saved", stats.guestelSavedDevices ?? 0)
                    stat("Reachable", stats.guestelBroadcastSubscribers ?? 0)
                    stat("30-day bookings", stats.recentBookings ?? 0)
                }
            }
        }
        .padding(17)
        .foregroundStyle(MarketelNativeTheme.ink)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 19, style: .continuous).stroke(MarketelNativeTheme.border))
    }

    private func stat(_ label: String, _ value: Int) -> some View {
        VStack(spacing: 3) {
            Text(String(value)).font(.system(size: 18, weight: .bold))
            Text(label).font(.system(size: 9, weight: .semibold)).foregroundStyle(MarketelNativeTheme.inkSoft)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct MarketelWalletCardPreview: View {
    let propertyName: String
    let subtitle: String
    let imageURL: String
    let fallbackImageURL: String
    let origin: URL

    private var chosenURL: URL? {
        MarketelNativeFormat.url(
            imageURL.marketelTrimmed.isEmpty ? fallbackImageURL : imageURL,
            relativeTo: origin
        )
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: chosenURL) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    LinearGradient(
                        colors: [MarketelNativeTheme.green, MarketelNativeTheme.greenDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            }
            .frame(height: 208)
            .frame(maxWidth: .infinity)
            .clipped()

            LinearGradient(
                colors: [.clear, .black.opacity(0.76)],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(propertyName)
                    .font(.system(size: 23, weight: .bold))
                Text(subtitle.marketelTrimmed.isEmpty ? "Direct rates · Book again anytime" : subtitle)
                    .font(.system(size: 13, weight: .medium))
                    .opacity(0.9)
            }
            .foregroundStyle(.white)
            .padding(18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 23, style: .continuous))
        .shadow(color: .black.opacity(0.13), radius: 16, y: 8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Guestel card for \(propertyName)")
    }
}

private struct MarketelGuestBroadcastView: View {
    let propertyName: String
    let subscriberCount: Int
    let send: (String, String) async throws -> Int
    @Environment(\.presentationMode) private var presentationMode
    @State private var title: String
    @State private var message = ""
    @State private var errorMessage: String?
    @State private var isSending = false

    init(propertyName: String, subscriberCount: Int, send: @escaping (String, String) async throws -> Int) {
        self.propertyName = propertyName
        self.subscriberCount = subscriberCount
        self.send = send
        _title = State(initialValue: propertyName)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    notificationPreview
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Notification title").font(.system(size: 12, weight: .bold))
                        TextField(propertyName, text: $title)
                            .padding(13)
                            .background(MarketelNativeTheme.canvas, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        Text("Message").font(.system(size: 12, weight: .bold))
                        TextEditor(text: $message)
                            .frame(minHeight: 110)
                            .padding(8)
                            .background(MarketelNativeTheme.canvas, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        Text("\(subscriberCount) Guestel device\(subscriberCount == 1 ? "" : "s") can receive this.")
                            .font(.system(size: 11))
                            .foregroundStyle(MarketelNativeTheme.inkSoft)
                    }
                    .padding(17)
                    .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 19, style: .continuous))

                    if let errorMessage { Text(errorMessage).font(.system(size: 13)).foregroundStyle(.red) }
                    Button(isSending ? "Sending…" : "Send notification") { submit() }
                        .buttonStyle(MarketelPrimaryButtonStyle())
                        .disabled(isSending || subscriberCount <= 0 || title.marketelTrimmed.isEmpty || message.marketelTrimmed.isEmpty)
                }
                .padding(16)
            }
            .background(MarketelNativeTheme.canvas.ignoresSafeArea())
            .navigationTitle("Notify guests")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { presentationMode.wrappedValue.dismiss() } }
            }
        }
    }

    private var notificationPreview: some View {
        HStack(alignment: .top, spacing: 11) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(MarketelNativeTheme.green)
                .frame(width: 40, height: 40)
                .overlay(Image(systemName: "building.2.fill").foregroundStyle(.white))
            VStack(alignment: .leading, spacing: 3) {
                HStack { Text(title.marketelTrimmed.isEmpty ? propertyName : title).font(.system(size: 13, weight: .bold)); Spacer(); Text("now").font(.system(size: 10)).foregroundStyle(.secondary) }
                Text(message.marketelTrimmed.isEmpty ? "Your message will appear here as you type." : message)
                    .font(.system(size: 12))
                    .foregroundStyle(MarketelNativeTheme.inkSoft)
                    .lineLimit(3)
            }
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(.white.opacity(0.7)))
    }

    private func submit() {
        errorMessage = nil
        isSending = true
        Task {
            do {
                let sent = try await send(title, message)
                if sent > 0 { presentationMode.wrappedValue.dismiss() }
                else { errorMessage = "No Guestel devices are ready to receive property updates yet." }
            } catch { errorMessage = error.localizedDescription }
            isSending = false
        }
    }
}

private struct MarketelPhotoPicker: UIViewControllerRepresentable {
    let onPick: (UIImage) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPick: onPick) }

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration(photoLibrary: .shared())
        configuration.filter = .images
        configuration.selectionLimit = 1
        let controller = PHPickerViewController(configuration: configuration)
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let onPick: (UIImage) -> Void
        init(onPick: @escaping (UIImage) -> Void) { self.onPick = onPick }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            guard let provider = results.first?.itemProvider,
                  provider.canLoadObject(ofClass: UIImage.self) else {
                picker.dismiss(animated: true)
                return
            }
            provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
                guard let image = object as? UIImage else { return }
                DispatchQueue.main.async { self?.onPick(image) }
            }
        }
    }
}
