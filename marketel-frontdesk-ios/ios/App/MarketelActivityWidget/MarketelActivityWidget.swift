import ActivityKit
import SwiftUI
import WidgetKit

// Lock Screen + Dynamic Island presentation for a booking awaiting a decision.
// One calm Front Desk surface, one question, two actions. It deliberately does
// not try to reproduce the full reservation card on the Lock Screen.

private let marketelGreen = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
private let marketelInk = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
private let marketelCanvas = Color(red: 239 / 255, green: 244 / 255, blue: 240 / 255)
private let marketelAmber = Color(red: 216 / 255, green: 153 / 255, blue: 38 / 255)
private let marketelRed = Color(red: 183 / 255, green: 58 / 255, blue: 58 / 255)

@available(iOS 16.1, *)
struct MarketelActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BookingDecisionAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(marketelCanvas)
                .activitySystemActionForegroundColor(marketelInk)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 7) {
                        MarketelActivityMark(size: 23)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("FRONT DESK")
                                .font(.system(size: 9, weight: .heavy))
                                .tracking(0.5)
                                .foregroundStyle(marketelGreen)
                            Text(context.attributes.propertyName)
                                .font(.system(size: 13, weight: .semibold))
                                .lineLimit(1)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ActivityStateLabel(state: context.state)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.isPending {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Is \(context.attributes.roomName) still free?")
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                            DecisionButtons(bookingId: context.attributes.bookingId)
                        }
                    } else {
                        Label(context.state.headline, systemImage: statusIcon(context.state))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                    }
                }
            } compactLeading: {
                MarketelActivityMark(size: 18)
            } compactTrailing: {
                Text(context.state.isPending ? "DECIDE" : (context.state.isKept ? "KEPT" : "ENDED"))
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(context.state.isPending ? marketelAmber : (context.state.isKept ? marketelGreen : marketelRed))
            } minimal: {
                Image(systemName: context.state.isPending ? "bell.fill" : statusIcon(context.state))
                    .foregroundStyle(context.state.isPending ? marketelGreen : (context.state.isKept ? marketelGreen : marketelRed))
            }
            .keylineTint(marketelGreen)
        }
    }
}

@available(iOS 16.1, *)
private func statusIcon(_ state: BookingDecisionAttributes.ContentState) -> String {
    switch state.status {
    case "confirmed": return "checkmark.circle.fill"
    case "released", "cancelled": return "xmark.circle.fill"
    default: return "clock.fill"
    }
}

@available(iOS 16.1, *)
private struct LockScreenView: View {
    let context: ActivityViewContext<BookingDecisionAttributes>

    var body: some View {
        // Apple caps the Lock Screen presentation at 160pt. Keep the pending
        // card deliberately below that limit (about 136pt including padding),
        // so iOS never preserves the header while truncating the decision.
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 9) {
                MarketelActivityMark(size: 24)
                VStack(alignment: .leading, spacing: 1) {
                    Text("FRONT DESK")
                        .font(.system(size: 8, weight: .heavy))
                        .tracking(0.7)
                        .foregroundStyle(marketelGreen)
                    Text(context.attributes.propertyName)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(marketelInk)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if context.state.isPending {
                    Text("ACTION NEEDED")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.3)
                        .foregroundStyle(marketelAmber)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(marketelAmber.opacity(0.12), in: Capsule())
                } else {
                    Image(systemName: statusIcon(context.state))
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                }
            }

            if context.state.isPending {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Is \(context.attributes.roomName) still free?")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(marketelInk)
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                        Text(detailLine)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(marketelInk.opacity(0.68))
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                    }
                    Spacer(minLength: 4)
                    Text(context.state.noResponseAction == "release" ? "No reply: release" : "No reply: keep")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(marketelInk.opacity(0.62))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(marketelInk.opacity(0.06), in: Capsule())
                        .fixedSize()
                }
                DecisionButtons(bookingId: context.attributes.bookingId)
            } else {
                HStack(spacing: 9) {
                    Image(systemName: statusIcon(context.state))
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(context.state.headline)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                            .lineLimit(1)
                        Text("\(context.attributes.guestName) · \(context.attributes.roomName) · \(context.attributes.stayLabel)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(marketelInk.opacity(0.65))
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .environment(\.colorScheme, .light)
    }

    private var detailLine: String {
        [
            context.attributes.guestName,
            context.attributes.stayLabel,
            context.attributes.amountLabel,
        ].filter { !$0.isEmpty }.joined(separator: " · ")
    }
}

@available(iOS 16.1, *)
private struct MarketelActivityMark: View {
    let size: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
                .fill(marketelGreen)
            RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                .fill(Color.white)
                .frame(width: size * 0.42, height: size * 0.76)
                .offset(x: -size * 0.12)
            RoundedRectangle(cornerRadius: size * 0.25, style: .continuous)
                .fill(marketelGreen)
                .frame(width: size * 0.55, height: size)
                .offset(x: size * 0.18)
            Circle()
                .fill(Color.white)
                .frame(width: size * 0.13, height: size * 0.13)
                .offset(x: size * 0.08)
        }
        .frame(width: size, height: size)
    }
}

@available(iOS 16.1, *)
private struct ActivityStateLabel: View {
    let state: BookingDecisionAttributes.ContentState

    var body: some View {
        Text(state.isPending ? "DECIDE" : (state.isKept ? "KEPT" : "ENDED"))
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(state.isPending ? marketelAmber : (state.isKept ? marketelGreen : marketelRed))
    }
}

// Buttons live behind iOS 17: before that a tap opens the app instead, which is
// still a decision, just one tap further away.
@available(iOS 16.1, *)
private struct DecisionButtons: View {
    let bookingId: String

    var body: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: 8) {
                Button(intent: KeepBookingIntent(bookingId: bookingId)) {
                    Label("Confirm", systemImage: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                }
                .buttonStyle(MarketelDecisionButtonStyle(color: marketelGreen, filled: true))

                Button(intent: ReleaseBookingIntent(bookingId: bookingId)) {
                    Label("Release", systemImage: "xmark")
                        .font(.system(size: 12, weight: .bold))
                }
                .buttonStyle(MarketelDecisionButtonStyle(color: marketelRed, filled: false))
            }
        } else {
            Text("Open Marketel to decide")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}

@available(iOS 17.0, *)
private struct MarketelDecisionButtonStyle: ButtonStyle {
    let color: Color
    let filled: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(filled ? Color.white : color)
            .frame(maxWidth: .infinity, minHeight: 32)
            .background(filled ? color : color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}

@available(iOS 16.1, *)
@main
struct MarketelActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        MarketelActivityWidget()
    }
}
