import ActivityKit
import SwiftUI
import WidgetKit

// Lock Screen + Dynamic Island presentation for a booking awaiting a decision.
//
// The card's job is to answer one question at a glance — "is this room still
// free?" — and let the owner answer without unlocking. Everything else is
// secondary, so the countdown and the two buttons get the visual weight.

private let marketelGreen = Color(red: 46 / 255, green: 125 / 255, blue: 91 / 255)
private let marketelInk = Color(red: 26 / 255, green: 43 / 255, blue: 34 / 255)
private let marketelAmber = Color(red: 216 / 255, green: 153 / 255, blue: 38 / 255)

@available(iOS 16.1, *)
struct MarketelActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BookingDecisionAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color.white.opacity(0.94))
                .activitySystemActionForegroundColor(marketelInk)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.guestName)
                            .font(.system(size: 15, weight: .bold))
                            .lineLimit(1)
                        Text(context.attributes.roomName)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    StackedCountdown(state: context.state, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.isPending {
                        DecisionButtons(bookingId: context.attributes.bookingId)
                    } else {
                        Text(context.state.headline)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(context.state.isKept ? marketelGreen : .secondary)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPending ? "bell.badge.fill" : statusIcon(context.state))
                    .foregroundStyle(context.state.isPending ? marketelAmber : marketelGreen)
            } compactTrailing: {
                CompactCountdown(state: context.state)
            } minimal: {
                Image(systemName: context.state.isPending ? "bell.badge.fill" : statusIcon(context.state))
                    .foregroundStyle(context.state.isPending ? marketelAmber : marketelGreen)
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
        VStack(alignment: .leading, spacing: 9) {
            // Property and price: the two things scanned first.
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(context.attributes.propertyName.uppercased())
                    .font(.system(size: 10, weight: .heavy))
                    .kerning(0.6)
                    .foregroundStyle(marketelGreen)
                    .lineLimit(1)
                Spacer(minLength: 6)
                if !context.attributes.amountLabel.isEmpty {
                    Text(context.attributes.amountLabel)
                        .font(.system(size: 17, weight: .bold, design: .monospaced))
                        .foregroundStyle(marketelInk)
                        .lineLimit(1)
                }
            }

            Text(context.attributes.guestName)
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(marketelInk)
                .lineLimit(1)

            // Full width on its own row. Sharing a row with the countdown cost
            // this line most of the card: Text(timerInterval:) reserves space
            // for the widest time it could ever display and never gives it
            // back, so the stay dates were truncated to make room a timer was
            // not using.
            Text("\(context.attributes.roomName) · \(context.attributes.stayLabel)")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, alignment: .leading)

            // The countdown belongs with the instruction it qualifies, not
            // stranded in a column of its own.
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                CountdownLabel(state: context.state)
                Text(context.state.headline)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(context.state.isPending
                        ? .secondary
                        : (context.state.isKept ? marketelGreen : .secondary))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
            }

            if context.state.isPending {
                DecisionButtons(bookingId: context.attributes.bookingId)
            }
        }
        .padding(16)
        // The card always draws on its own near-white background, so pin it to
        // light mode: otherwise `.secondary` text resolves against the device's
        // dark appearance and renders almost invisible on the Lock Screen.
        .environment(\.colorScheme, .light)
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
                    Text("Keep it")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity)
                }
                .tint(marketelGreen)

                Button(intent: ReleaseBookingIntent(bookingId: bookingId)) {
                    Text("Release")
                        .font(.system(size: 14, weight: .bold))
                        .frame(maxWidth: .infinity)
                }
                .tint(Color(white: 0.92))
                .foregroundStyle(marketelInk)
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
