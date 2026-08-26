import SwiftUI

// Marketel design tokens, shared with Front Desk.
enum Theme {
    static let green   = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
    static let ink     = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
    static let inkSoft = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255).opacity(0.55)
    static let canvas  = Color(red: 244 / 255, green: 247 / 255, blue: 245 / 255)
    static let card    = Color.white
    static let amber   = Color(red: 216 / 255, green: 153 / 255, blue: 38 / 255)

    // Soft brand gradients so a hotel card looks considered even before it has a photo.
    private static let cardGradients: [[Color]] = [
        [Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255), Color(red: 31 / 255, green: 92 / 255, blue: 66 / 255)],
        [Color(red: 58 / 255, green: 110 / 255, blue: 120 / 255), Color(red: 38 / 255, green: 74 / 255, blue: 84 / 255)],
        [Color(red: 120 / 255, green: 95 / 255, blue: 70 / 255), Color(red: 86 / 255, green: 66 / 255, blue: 47 / 255)],
        [Color(red: 92 / 255, green: 84 / 255, blue: 128 / 255), Color(red: 62 / 255, green: 55 / 255, blue: 92 / 255)],
        [Color(red: 168 / 255, green: 96 / 255, blue: 84 / 255), Color(red: 128 / 255, green: 68 / 255, blue: 58 / 255)],
    ]

    static func gradient(for seed: Int) -> LinearGradient {
        let pair = cardGradients[abs(seed) % cardGradients.count]
        return LinearGradient(colors: pair, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// Liquid Glass on iOS 26, a soft material fallback everywhere else.
struct GlassCircle: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.glassEffect(.regular.interactive(), in: Circle())
        } else {
            content.background(.ultraThinMaterial, in: Circle())
        }
    }
}

// Preserve Guestel's custom button surface while still giving a restrained,
// tactile response. SwiftUI's automatic style can temporarily wash a custom
// full-width label out during navigation, which reads like the CTA vanished.
struct GuestelPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
