import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

// Shared between the app target and the widget extension — add this file to
// BOTH targets in Xcode or the widget cannot decode what the app starts.
//
// Every property name here must match the JSON produced by
// guest-lodge-backend/live-activities.js exactly. APNs delivers `attributes`
// and `content-state` as raw JSON and ActivityKit decodes them with Codable, so
// a rename on either side silently drops the activity rather than erroring.

@available(iOS 16.1, *)
public struct BookingDecisionAttributes: ActivityAttributes {

    /// The half that changes while the card is on screen.
    public struct ContentState: Codable, Hashable {
        /// pending | confirmed | released | cancelled
        public var status: String
        /// Absolute epoch seconds. Absolute rather than a remaining duration so
        /// the widget keeps counting between pushes. Nil once decided.
        public var deadline: Int?
        /// confirm | release — what silence will do, shown so the owner knows
        /// the cost of ignoring the card.
        public var noResponseAction: String
        public var decidedBy: String
        public var headline: String
        public var updatedAt: Int

        public init(
            status: String,
            deadline: Int? = nil,
            noResponseAction: String = "confirm",
            decidedBy: String = "",
            headline: String = "",
            updatedAt: Int = Int(Date().timeIntervalSince1970)
        ) {
            self.status = status
            self.deadline = deadline
            self.noResponseAction = noResponseAction
            self.decidedBy = decidedBy
            self.headline = headline
            self.updatedAt = updatedAt
        }

        public var isPending: Bool { status == "pending" }

        public var deadlineDate: Date? {
            guard let deadline else { return nil }
            return Date(timeIntervalSince1970: TimeInterval(deadline))
        }

        /// Drives the terminal card's tint.
        public var isKept: Bool { status == "confirmed" }
    }

    // Fixed for the life of the activity. ActivityKit will not let these change,
    // so nothing derived from booking state belongs here.
    public var bookingId: String
    public var hotelId: String
    public var propertyName: String
    public var guestName: String
    public var roomName: String
    public var checkIn: Int?
    public var checkOut: Int?
    public var nights: Int?
    public var amountLabel: String

    public init(
        bookingId: String,
        hotelId: String,
        propertyName: String,
        guestName: String,
        roomName: String,
        checkIn: Int? = nil,
        checkOut: Int? = nil,
        nights: Int? = nil,
        amountLabel: String = ""
    ) {
        self.bookingId = bookingId
        self.hotelId = hotelId
        self.propertyName = propertyName
        self.guestName = guestName
        self.roomName = roomName
        self.checkIn = checkIn
        self.checkOut = checkOut
        self.nights = nights
        self.amountLabel = amountLabel
    }

    public var stayLabel: String {
        guard let checkIn, let checkOut else { return roomName }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let start = formatter.string(from: Date(timeIntervalSince1970: TimeInterval(checkIn)))
        let end = formatter.string(from: Date(timeIntervalSince1970: TimeInterval(checkOut)))
        return "\(start) – \(end)"
    }
}
