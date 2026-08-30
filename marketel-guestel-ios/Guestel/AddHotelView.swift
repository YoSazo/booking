import SwiftUI
import VisionKit
import AVFoundation

struct AddHotelView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var link = ""
    @State private var isAdding = false
    @State private var errorMessage: String?
    @State private var showingScanner = false

    var body: some View {
        VStack(spacing: 18) {
            Capsule()
                .fill(Color(white: 0.85))
                .frame(width: 40, height: 5)
                .padding(.top, 8)

            Spacer(minLength: 0)

            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(Theme.green)

            Text("Add a hotel")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text("Scan the property's Guestel QR, or paste its Marketel booking link.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                openScanner()
            } label: {
                Label("Scan Guestel QR", systemImage: "qrcode.viewfinder")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(GuestelPressButtonStyle())
            .disabled(isAdding)
            .padding(.horizontal, 20)

            HStack(spacing: 12) {
                Rectangle().fill(Theme.inkSoft.opacity(0.2)).frame(height: 1)
                Text("or paste a link")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize()
                Rectangle().fill(Theme.inkSoft.opacity(0.2)).frame(height: 1)
            }
            .padding(.horizontal, 24)

            TextField("jacksinn.mktel.co", text: $link)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(.horizontal, 20)

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 13))
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer(minLength: 0)

            Button {
                addHotel()
            } label: {
                Group {
                    if isAdding { ProgressView().tint(.white) }
                    else { Text("Add hotel") }
                }
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(GuestelPressButtonStyle())
            .disabled(isAdding || parsedTarget == nil)
            .opacity(parsedTarget == nil ? 0.5 : 1)
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .background(Theme.canvas)
        .fullScreenCover(isPresented: $showingScanner) {
            QRScannerScreen(
                onScanned: handleScannedCode,
                onCancel: { showingScanner = false }
            )
        }
    }

    private var parsedTarget: GuestelAddTarget? {
        GuestelAddTarget.parse(link)
    }

    private func openScanner() {
        guard DataScannerViewController.isSupported else {
            errorMessage = "QR scanning isn't available on this device. Paste the hotel's booking link instead."
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            presentScannerIfAvailable()
        case .notDetermined:
            Task {
                let granted = await AVCaptureDevice.requestAccess(for: .video)
                await MainActor.run {
                    if granted {
                        presentScannerIfAvailable()
                    } else {
                        errorMessage = "Camera access is needed to scan a Guestel QR. You can paste the booking link instead."
                    }
                }
            }
        case .denied, .restricted:
            errorMessage = "Camera access is off. Enable it in Settings, or paste the hotel's booking link instead."
        @unknown default:
            errorMessage = "QR scanning isn't available right now. Paste the hotel's booking link instead."
        }
    }

    private func presentScannerIfAvailable() {
        guard DataScannerViewController.isAvailable else {
            errorMessage = "QR scanning isn't available right now. Paste the hotel's booking link instead."
            return
        }
        errorMessage = nil
        showingScanner = true
    }

    private func handleScannedCode(_ code: String) {
        guard GuestelAddTarget.parse(code) != nil else {
            showingScanner = false
            errorMessage = "That isn't a Marketel Guestel QR code."
            return
        }
        link = code
        showingScanner = false
        // Let the camera finish its native dismissal before the Add Hotel
        // sheet closes. The hotel itself can load while that animation runs.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
            addHotel()
        }
    }

    private func addHotel() {
        guard let target = parsedTarget else { return }
        isAdding = true
        errorMessage = nil
        Task {
            do {
                let hotelId = if let hotelId = target.hotelId {
                    hotelId
                } else if let domain = target.domain {
                    try await BookingAPI.hotelId(forDomain: domain)
                } else {
                    throw BookingAPI.Failure.message("That Guestel QR code is missing its property.")
                }
                let data = try await BookingAPI.hotel(hotelId)
                let hotel = Hotel(
                    hotelId: hotelId,
                    domain: target.domain ?? data.domain ?? "",
                    name: data.name,
                    location: data.guestelWalletSubtitle ?? data.address ?? "Direct booking",
                    stays: 0,
                    lastStayed: "—",
                    imageURL: data.walletImage ?? data.rooms.lazy.compactMap(\.image).first
                )
                var transferredStay: BookingAPI.WalletReservation?
                if let handoff = target.handoffToken, !handoff.isEmpty {
                    transferredStay = try await BookingAPI.claimHandoff(handoff)
                }
                await MainActor.run {
                    store.cacheHotelDetails(data)
                    store.add(hotel)
                    if let transferredStay { store.ingest(transferredStay) }
                    isAdding = false
                    dismiss()
                }
                if transferredStay != nil {
                    await GuestPushManager.sync(store: store)
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isAdding = false
                }
            }
        }
    }
}

private struct GuestelAddTarget {
    let hotelId: String?
    let domain: String?
    let handoffToken: String?

    static func parse(_ value: String) -> GuestelAddTarget? {
        let raw = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return nil }
        let candidate = raw.contains("://") ? raw : "https://\(raw)"
        guard let components = URLComponents(string: candidate) else { return nil }
        let query = components.queryItems ?? []
        let queryHotelId = clean(query.first(where: { $0.name == "hotelId" })?.value)
        let handoff = clean(query.first(where: { $0.name == "handoff" })?.value)
        let parts = components.path.split(separator: "/").map(String.init)
        let pathHotelId = parts.count >= 2 && parts[0].lowercased() == "clip" ? clean(parts[1]) : nil
        if let hotelId = queryHotelId ?? pathHotelId {
            return GuestelAddTarget(hotelId: hotelId, domain: bookingDomain(in: components), handoffToken: handoff)
        }

        guard let domain = bookingDomain(in: components) else { return nil }
        return GuestelAddTarget(hotelId: nil, domain: domain, handoffToken: handoff)
    }

    private static func bookingDomain(in components: URLComponents) -> String? {
        let queryDomain = clean(components.queryItems?.first(where: { $0.name == "domain" })?.value)
        let rawHost = queryDomain ?? clean(components.host)
        guard var host = rawHost?.lowercased(), host.contains(".") else { return nil }
        if host.hasPrefix("www.") { host.removeFirst(4) }
        guard host.hasSuffix(".mktel.co") || host == "bookmarketel.com" else { return nil }
        // clip.mktel.co identifies the transport, not the property. A clip URL
        // must include its hotel ID in /clip/<hotelId>.
        guard host != "clip.mktel.co" || queryDomain != nil else { return nil }
        return host
    }

    private static func clean(_ value: String?) -> String? {
        let result = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return result.isEmpty ? nil : result
    }
}

private struct QRScannerScreen: View {
    let onScanned: (String) -> Void
    let onCancel: () -> Void

    var body: some View {
        ZStack {
            GuestelQRScanner(onScanned: onScanned)
                .ignoresSafeArea()

            LinearGradient(
                colors: [.black.opacity(0.5), .clear, .black.opacity(0.52)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack {
                HStack {
                    Button(action: onCancel) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    Spacer()
                }
                .padding(.horizontal, 18)

                Spacer()

                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(.white, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 252, height: 252)
                    .shadow(color: .black.opacity(0.28), radius: 12)

                Spacer()

                VStack(spacing: 7) {
                    Text("Scan the property's Guestel QR")
                        .font(.system(size: 20, weight: .bold))
                    Text("It opens the right hotel automatically.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.82))
                }
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(.bottom, 34)
            }
            .padding(.top, 8)
        }
    }
}

private struct GuestelQRScanner: UIViewControllerRepresentable {
    let onScanned: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onScanned: onScanned)
    }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let controller = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.qr])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: false,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        DispatchQueue.main.async { try? controller.startScanning() }
        return controller
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {
        if !controller.isScanning { try? controller.startScanning() }
    }

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        private let onScanned: (String) -> Void
        private var delivered = false

        init(onScanned: @escaping (String) -> Void) {
            self.onScanned = onScanned
        }

        func dataScanner(
            _ dataScanner: DataScannerViewController,
            didAdd addedItems: [RecognizedItem],
            allItems: [RecognizedItem]
        ) {
            guard !delivered else { return }
            for item in addedItems {
                guard case .barcode(let barcode) = item,
                      let value = barcode.payloadStringValue,
                      !value.isEmpty else { continue }
                delivered = true
                dataScanner.stopScanning()
                onScanned(value)
                return
            }
        }
    }
}
