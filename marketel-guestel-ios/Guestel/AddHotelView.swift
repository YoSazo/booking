import SwiftUI

// v1 placeholder. Real QR scanning (and the deep-link that installs Guestel with
// a hotel pre-loaded) lands later — see GUESTEL.md. For now it drops a stub hotel
// so the add flow is testable.
struct AddHotelView: View {
    @Environment(GuestStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 18) {
            Capsule()
                .fill(Color(white: 0.85))
                .frame(width: 40, height: 5)
                .padding(.top, 8)

            Spacer(minLength: 0)

            ZStack {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Theme.green.opacity(0.10))
                    .frame(width: 120, height: 120)
                Image(systemName: "qrcode.viewfinder")
                    .font(.system(size: 54, weight: .light))
                    .foregroundStyle(Theme.green)
            }

            Text("Add a hotel")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text("Scan the code at your hotel — at check-in, in the room, or on your confirmation — to keep it here and book direct next time.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer(minLength: 0)

            Button {
                store.add(Hotel(hotelId: "new-hotel", name: "New Hotel", location: "Added just now", stays: 0, lastStayed: "—"))
                dismiss()
            } label: {
                Text("Scan code")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Theme.green, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .background(Theme.canvas)
    }
}
