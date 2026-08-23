import SwiftUI

struct AddHotelView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var link = ""
    @State private var isAdding = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 18) {
            Capsule()
                .fill(Color(white: 0.85))
                .frame(width: 40, height: 5)
                .padding(.top, 8)

            Spacer(minLength: 0)

            Image(systemName: "link.badge.plus")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(Theme.green)

            Text("Add a hotel")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text("Paste the hotel’s Marketel booking link to keep it here and book direct next time.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

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
            .disabled(isAdding || normalizedDomain == nil)
            .opacity(normalizedDomain == nil ? 0.5 : 1)
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .background(Theme.canvas)
    }

    private var normalizedDomain: String? {
        let raw = link.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !raw.isEmpty else { return nil }
        let candidate = raw.contains("://") ? raw : "https://\(raw)"
        guard let host = URLComponents(string: candidate)?.host, host.contains(".") else { return nil }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    private func addHotel() {
        guard let domain = normalizedDomain else { return }
        isAdding = true
        errorMessage = nil
        Task {
            do {
                let hotelId = try await BookingAPI.hotelId(forDomain: domain)
                let data = try await BookingAPI.hotel(hotelId)
                let hotel = Hotel(
                    hotelId: hotelId,
                    domain: domain,
                    name: data.name,
                    location: data.guestelWalletSubtitle ?? "Direct booking",
                    stays: 0,
                    lastStayed: "—",
                    imageURL: data.walletImage ?? data.rooms.lazy.compactMap(\.image).first
                )
                await MainActor.run {
                    store.cacheHotelDetails(data)
                    store.add(hotel)
                    isAdding = false
                    dismiss()
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
