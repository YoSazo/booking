import SwiftUI
import Combine

private enum MarketelPropertyTheme {
    static let green = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
    static let canvas = Color(red: 239 / 255, green: 244 / 255, blue: 240 / 255)
    static let ink = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
    static let inkSoft = Color(red: 75 / 255, green: 93 / 255, blue: 82 / 255)
}

@MainActor
final class MarketelNativeSession: ObservableObject {
    @Published var hotelId = ""
    @Published var hotelName = "Front Desk"
    @Published var domain = ""
    @Published var authToken = ""
    @Published var appIconURL = ""

    var isReady: Bool { !hotelId.isEmpty && !authToken.isEmpty }

    func configure(
        hotelId: String,
        hotelName: String,
        domain: String,
        authToken: String,
        appIconURL: String,
        walletImageURL _: String,
        walletSubtitle _: String,
        isManualPMS _: Bool
    ) {
        self.hotelId = hotelId
        self.hotelName = hotelName.isEmpty ? "Front Desk" : hotelName
        self.domain = domain
        self.authToken = authToken
        self.appIconURL = appIconURL
    }

    func clear() {
        hotelId = ""
        hotelName = "Front Desk"
        domain = ""
        authToken = ""
        appIconURL = ""
    }
}

private enum MarketelPropertyAPIError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let message): return message
        }
    }
}

private struct MarketelPropertyAPI {
    let origin: URL
    let hotelId: String
    let authToken: String

    func properties() async throws -> [MarketelProperty] {
        guard let endpoint = URL(string: "/api/crm/properties", relativeTo: origin)?.absoluteURL,
              var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: false) else {
            throw MarketelPropertyAPIError.message("Could not create the request.")
        }
        components.queryItems = [URLQueryItem(name: "hotelId", value: hotelId)]
        guard let url = components.url else {
            throw MarketelPropertyAPIError.message("Could not create the request.")
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(authToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw MarketelPropertyAPIError.message("Front Desk did not return a response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = object?["message"] as? String
            if http.statusCode == 401 || http.statusCode == 403 {
                throw MarketelPropertyAPIError.message(message ?? "Your Front Desk session expired. Sign in again.")
            }
            throw MarketelPropertyAPIError.message(message ?? "Could not load your properties.")
        }

        let envelope = try JSONDecoder().decode(MarketelPropertiesEnvelope.self, from: data)
        guard envelope.success else {
            throw MarketelPropertyAPIError.message(envelope.message ?? "Could not load your properties.")
        }
        return envelope.properties
    }
}

private struct MarketelPropertiesEnvelope: Decodable {
    let success: Bool
    let properties: [MarketelProperty]
    let message: String?
}

private struct MarketelProperty: Decodable, Identifiable, Equatable {
    let id: String
    let name: String
    let appIconUrl: String?
    let domain: String?
}

@MainActor
private final class MarketelPropertyPickerModel: ObservableObject {
    @Published var properties: [MarketelProperty] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    private let api: MarketelPropertyAPI

    init(session: MarketelNativeSession, origin: URL) {
        api = MarketelPropertyAPI(
            origin: origin,
            hotelId: session.hotelId,
            authToken: session.authToken
        )
    }

    func load() async {
        isLoading = true
        do {
            properties = try await api.properties()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
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
                    HStack {
                        Spacer()
                        ProgressView("Loading properties…")
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                } else if let error = model.errorMessage {
                    VStack(spacing: 10) {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(.red)
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
                                    Text(property.name)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(MarketelPropertyTheme.ink)
                                    if let domain = property.domain, !domain.isEmpty {
                                        Text(domain)
                                            .font(.system(size: 11))
                                            .foregroundStyle(MarketelPropertyTheme.inkSoft)
                                    }
                                }
                                Spacer()
                                if property.id == session.hotelId {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(MarketelPropertyTheme.green)
                                } else {
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 5)
                        }
                    }
                }
            }
            .background(MarketelPropertyTheme.canvas.ignoresSafeArea())
            .navigationTitle("Properties")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { presentationMode.wrappedValue.dismiss() }
                }
            }
            .task { await model.load() }
        }
    }
}

private struct MarketelPropertyAvatar: View {
    let property: MarketelProperty
    let origin: URL

    var body: some View {
        AsyncImage(url: imageURL) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Text(String(property.name.prefix(1)).uppercased())
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(MarketelPropertyTheme.green)
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var imageURL: URL? {
        let clean = property.appIconUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !clean.isEmpty else { return nil }
        if let absolute = URL(string: clean), absolute.scheme != nil { return absolute }
        return URL(string: clean, relativeTo: origin)?.absoluteURL
    }
}
