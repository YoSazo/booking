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
                    StackedCountdown(state: context.state, alignment: .trailing)
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
                CompactCountdown(state: context.state)
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
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 9) {
                MarketelActivityMark(size: 29)
                VStack(alignment: .leading, spacing: 1) {
                    Text("FRONT DESK")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.7)
                        .foregroundStyle(marketelGreen)
                    Text(context.attributes.propertyName)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(marketelInk)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if context.state.isPending {
                    CountdownPill(state: context.state)
                } else {
                    Image(systemName: statusIcon(context.state))
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                }
            }

            if context.state.isPending {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Is \(context.attributes.roomName) still free?")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(marketelInk)
                        .lineLimit(1)
                        .minimumScaleFactor(0.82)
                    Text(detailLine)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(marketelInk.opacity(0.65))
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                    Label(fallbackLabel, systemImage: "clock")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(marketelInk.opacity(0.58))
                        .lineLimit(1)
                }
                DecisionButtons(bookingId: context.attributes.bookingId)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.headline)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(context.state.isKept ? marketelGreen : marketelRed)
                    Text("\(context.attributes.guestName) · \(context.attributes.roomName) · \(context.attributes.stayLabel)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(marketelInk.opacity(0.65))
                        .lineLimit(1)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .environment(\.colorScheme, .light)
    }

    private var detailLine: String {
        [
            context.attributes.guestName,
            context.attributes.stayLabel,
            context.attributes.amountLabel,
        ].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private var fallbackLabel: String {
        context.state.noResponseAction == "release"
            ? "No answer releases the request"
            : "No answer keeps the booking"
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
private struct CountdownLabel: View {
    let state: BookingDecisionAttributes.ContentState

    var body: some View {
        Group {
            if let deadline = state.deadlineDate, state.isPending {
                // A native timer keeps ticking with no further pushes, which is
                // what makes a five-minute window feel live rather than stale.
                //
                // fixedSize is what stops it eating the card: the view reserves
                // width for the widest time it could ever show, and without
                // this it keeps that reservation while rendering "4:17" — space
                // taken from the stay dates beside it and then left blank.
                Text(timerInterval: Date()...max(deadline, Date().addingTimeInterval(1)), countsDown: true)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundStyle(marketelAmber)
                    .monospacedDigit()
                    .lineLimit(1)
                    .fixedSize()
            } else {
                Image(systemName: statusIcon(state))
                    .font(.system(size: 15))
                    .foregroundStyle(state.isKept ? marketelGreen : .secondary)
            }
        }
    }
}

@available(iOS 16.1, *)
private struct CountdownPill: View {
    let state: BookingDecisionAttributes.ContentState

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock.fill")
                .font(.system(size: 10, weight: .bold))
            CountdownLabel(state: state)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .foregroundStyle(marketelAmber)
        .background(marketelAmber.opacity(0.12), in: Capsule())
    }
}

// The expanded Dynamic Island keeps the stacked form: there the trailing region
// is a column of its own, so "to decide" has somewhere to sit.
@available(iOS 16.1, *)
private struct StackedCountdown: View {
    let state: BookingDecisionAttributes.ContentState
    var alignment: HorizontalAlignment = .trailing

    var body: some View {
        VStack(alignment: alignment, spacing: 1) {
            CountdownLabel(state: state)
            if state.isPending, state.deadlineDate != nil {
                Text("to decide")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

@available(iOS 16.1, *)
private struct CompactCountdown: View {
    let state: BookingDecisionAttributes.ContentState

    var body: some View {
        if let deadline = state.deadlineDate, state.isPending {
            Text(timerInterval: Date()...max(deadline, Date().addingTimeInterval(1)), countsDown: true)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(marketelAmber)
                .monospacedDigit()
                .frame(maxWidth: 44)
        } else {
            EmptyView()
        }
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
                        .font(.system(size: 13, weight: .bold))
                        .frame(maxWidth: .infinity)
                }
                .tint(marketelGreen)

                Button(intent: ReleaseBookingIntent(bookingId: bookingId)) {
                    Label("Release", systemImage: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .frame(maxWidth: .infinity)
                }
                .tint(marketelRed.opacity(0.13))
                .foregroundStyle(marketelRed)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
        } else {
            Text("Open Marketel to decide")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}

@available(iOS 16.1, *)
@main
struct MarketelActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        MarketelActivityWidget()
    }
}
