import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

private enum MarketelQRMode: String, CaseIterable, Identifiable {
    case anyGuest = "Any guest"
    case thisGuest = "This guest"
    var id: String { rawValue }
}

@MainActor
private final class MarketelQRModel: ObservableObject {
    @Published var bookings: [MarketelBooking] = []
    @Published var mode: MarketelQRMode = .anyGuest
    @Published var selectedBookingID = ""
    @Published var handoffToken = ""
    @Published var isLoading = true
    @Published var errorMessage: String?

    let session: MarketelNativeSession
    let api: MarketelNativeAPI

    init(session: MarketelNativeSession, origin: URL) {
        self.session = session
        api = MarketelNativeAPI(origin: origin, hotelId: session.hotelId, authToken: session.authToken)
    }

    var arrivals: [MarketelBooking] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let limit = calendar.date(byAdding: .day, value: 2, to: today) ?? today
        return bookings.filter { booking in
            guard booking.paymentDeclined != true,
                  !["cancelled", "canceled", "released"].contains(booking.normalizedStatus),
                  !booking.reservationCode.isEmpty,
                  let checkin = MarketelNativeFormat.date(booking.checkinDate) else { return false }
            let day = calendar.startOfDay(for: checkin)
            return day >= today && day <= limit
        }
    }

    var selectedBooking: MarketelBooking? {
        arrivals.first { $0.id == selectedBookingID } ?? arrivals.first
    }

    var url: URL? {
        guard !session.hotelId.isEmpty else { return nil }
        var components = URLComponents()
        components.scheme = "https"
        components.host = "clip.mktel.co"
        components.path = "/clip/\(session.hotelId)"
        var items = [
            URLQueryItem(name: "intent", value: mode == .thisGuest && !handoffToken.isEmpty ? "stay" : "book"),
            URLQueryItem(name: "ref", value: mode == .thisGuest ? "frontdesk-qr-guest" : "frontdesk-qr-generic"),
        ]
        if mode == .thisGuest && !handoffToken.isEmpty {
            items.append(URLQueryItem(name: "handoff", value: handoffToken))
        }
        components.queryItems = items
        return components.url
    }

    func load() async {
        isLoading = true
        do {
            let result: MarketelBookingEnvelope = try await api.request("/api/crm/bookings")
            guard result.success else {
                throw MarketelNativeAPIError.message(result.message ?? "Could not load arriving guests.")
            }
            bookings = result.data
            if selectedBookingID.isEmpty { selectedBookingID = arrivals.first?.id ?? "" }
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
        isLoading = false
    }

    func updateMode(_ next: MarketelQRMode) async {
        mode = next
        handoffToken = ""
        if next == .thisGuest { await prepareHandoff() }
    }

    func selectBooking(_ id: String) async {
        selectedBookingID = id
        handoffToken = ""
        if mode == .thisGuest { await prepareHandoff() }
    }

    func prepareHandoff() async {
        guard let booking = selectedBooking else { return }
        do {
            let response: MarketelHandoffEnvelope = try await api.request(
                "/api/crm/guestel-handoff",
                method: "POST",
                body: ["reservationCode": booking.reservationCode]
            )
            guard response.success, let token = response.handoffToken, !token.isEmpty else {
                throw MarketelNativeAPIError.message(response.message ?? "Could not prepare this guest’s pass.")
            }
            handoffToken = token
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }
}

struct MarketelNativeQRView: View {
    @StateObject private var model: MarketelQRModel
    @Environment(\.presentationMode) private var presentationMode

    init(session: MarketelNativeSession, origin: URL) {
        _model = StateObject(wrappedValue: MarketelQRModel(session: session, origin: origin))
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 17) {
                    VStack(spacing: 6) {
                        Text("Guest scans this")
                            .font(.system(size: 11, weight: .heavy))
                            .tracking(0.8)
                            .foregroundStyle(.white.opacity(0.58))
                        Text("Keep \(model.session.hotelName) in Guestel")
                            .font(.system(size: 23, weight: .bold))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                        Text(model.mode == .thisGuest
                             ? "This one-use QR brings the selected reservation into Guestel."
                             : "Guests can save your property, book direct, and receive updates from you.")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.72))
                            .multilineTextAlignment(.center)
                    }

                    Picker("QR type", selection: Binding(
                        get: { model.mode },
                        set: { value in Task { await model.updateMode(value) } }
                    )) {
                        ForEach(MarketelQRMode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if model.mode == .thisGuest {
                        if model.arrivals.isEmpty && !model.isLoading {
                            Text("No guests are checking in today through the day after tomorrow.")
                                .font(.system(size: 12))
                                .foregroundStyle(.white.opacity(0.67))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        } else {
                            Picker("Checking in", selection: Binding(
                                get: { model.selectedBooking?.id ?? "" },
                                set: { value in Task { await model.selectBooking(value) } }
                            )) {
                                ForEach(model.arrivals) { booking in
                                    Text("\(booking.guestName) · \(MarketelNativeFormat.day(booking.checkinDate))")
                                        .tag(booking.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .padding(.horizontal, 12)
                            .frame(maxWidth: .infinity)
                            .background(.white, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        }
                    }

                    if model.isLoading {
                        ProgressView().tint(.white).frame(height: 280)
                    } else if let url = model.url,
                              model.mode == .anyGuest || !model.handoffToken.isEmpty {
                        MarketelQRCode(url: url)
                            .frame(width: 280, height: 280)
                            .padding(12)
                            .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        Text(model.mode == .thisGuest
                             ? "One-use reservation pass · expires in 24 hours"
                             : "Guestel booking link · ready for any guest")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.55))
                        Button {
                            UIPasteboard.general.url = url
                        } label: {
                            Label("Copy link", systemImage: "doc.on.doc")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 11)
                                .background(.white.opacity(0.12), in: Capsule())
                        }
                    }

                    if let errorMessage = model.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 12))
                            .foregroundStyle(Color(red: 1, green: 0.66, blue: 0.66))
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 22)
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 10 / 255, green: 15 / 255, blue: 13 / 255).ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { presentationMode.wrappedValue.dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .task { await model.load() }
        }
        .preferredColorScheme(.dark)
    }
}

private struct MarketelQRCode: View {
    let url: URL
    private let context = CIContext()
    private let filter = CIFilter.qrCodeGenerator()

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image).resizable().interpolation(.none)
            } else {
                Image(systemName: "qrcode").resizable().scaledToFit().padding(30)
            }
        }
        .accessibilityLabel("Guestel QR code")
    }

    private var image: UIImage? {
        filter.message = Data(url.absoluteString.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)),
              let cgImage = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

@MainActor
private final class MarketelPropertyPickerModel: ObservableObject {
    @Published var properties: [MarketelProperty] = []
    @Published var isLoading = true
    @Published var errorMessage: String?
    let api: MarketelNativeAPI

    init(session: MarketelNativeSession, origin: URL) {
        api = MarketelNativeAPI(origin: origin, hotelId: session.hotelId, authToken: session.authToken)
    }

    func load() async {
        isLoading = true
        do {
            let response: MarketelPropertiesEnvelope = try await api.request("/api/crm/properties")
            guard response.success else {
                throw MarketelNativeAPIError.message(response.message ?? "Could not load your properties.")
            }
            properties = response.properties
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
        isLoading = false
    }
}

struct MarketelNativePropertyPickerView: View {
    @ObservedObject var session: MarketelNativeSession
    @StateObject private var model: MarketelPropertyPickerModel
    @Environment(\.presentationMode) private var presentationMode
    let origin: URL
    let select: (String) -> Void

    init(session: MarketelNativeSession, origin: URL, select: @escaping (String) -> Void) {
        self.session = session
        self.origin = origin
        self.select = select
        _model = StateObject(wrappedValue: MarketelPropertyPickerModel(session: session, origin: origin))
    }

    var body: some View {
        NavigationView {
            List {
                if model.isLoading {
                    HStack { Spacer(); ProgressView("Loading properties…"); Spacer() }
                        .listRowBackground(Color.clear)
                } else if let error = model.errorMessage {
                    VStack(spacing: 10) {
                        Text(error).font(.system(size: 13)).foregroundStyle(.red)
                        Button("Try again") { Task { await model.load() } }
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(model.properties) { property in
                        Button {
                            presentationMode.wrappedValue.dismiss()
                            select(property.id)
                        } label: {
                            HStack(spacing: 13) {
                                MarketelPropertyAvatar(property: property, origin: origin)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(property.name).font(.system(size: 16, weight: .bold)).foregroundStyle(MarketelNativeTheme.ink)
                                    if let domain = property.domain, !domain.isEmpty {
                                        Text(domain).font(.system(size: 11)).foregroundStyle(MarketelNativeTheme.inkSoft)
                                    }
                                }
                                Spacer()
                                if property.id == session.hotelId {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(MarketelNativeTheme.green)
                                } else {
                                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 5)
                        }
                    }
                }
            }
            .background(MarketelNativeTheme.canvas.ignoresSafeArea())
            .navigationTitle("Properties")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { presentationMode.wrappedValue.dismiss() } }
            }
            .task { await model.load() }
        }
    }
}

private struct MarketelPropertyAvatar: View {
    let property: MarketelProperty
    let origin: URL
    var body: some View {
        AsyncImage(url: MarketelNativeFormat.url(property.appIconUrl, relativeTo: origin)) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Text(String(property.name.prefix(1)).uppercased())
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(MarketelNativeTheme.green)
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
