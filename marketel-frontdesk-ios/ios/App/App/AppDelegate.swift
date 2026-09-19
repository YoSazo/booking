import UIKit
import SwiftUI
import Capacitor
import WebKit
import Contacts
import ContactsUI
import UserNotifications
import SafariServices
import CoreText
import StoreKit
#if canImport(ActivityKit)
import ActivityKit
#endif

private extension Notification.Name {
    static let marketelDidRegisterForRemoteNotifications =
        Notification.Name("MarketelDidRegisterForRemoteNotifications")
    static let marketelDidFailToRegisterForRemoteNotifications =
        Notification.Name("MarketelDidFailToRegisterForRemoteNotifications")
    static let marketelOpenNotificationPath =
        Notification.Name("MarketelOpenNotificationPath")
    static let marketelRefreshFrontDesk =
        Notification.Name("MarketelRefreshFrontDesk")
    static let marketelOpenInspectHandoff =
        Notification.Name("MarketelOpenInspectHandoff")
}

private var marketelPendingNotificationDestination: [String: String]?
private var marketelPendingInspectHandoffToken: String?

/// DM Sans, the web's typeface, bundled as TTF next to the web assets so the
/// native banner and sign-in read in the same type as the page beneath them.
/// Falls back to the system font if the files are ever missing.
private enum MarketelFont {
    private static let registered: Void = {
        for file in ["DMSans-Regular", "DMSans-Medium", "DMSans-Bold"] {
            guard let url = Bundle.main.url(
                forResource: file,
                withExtension: "ttf",
                subdirectory: "public/native-fonts"
            ) else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }()

    static func dmSans(_ weight: UIFont.Weight, size: CGFloat) -> UIFont {
        _ = registered
        let name: String
        if weight.rawValue >= UIFont.Weight.semibold.rawValue {
            name = "DMSans-Bold"
        } else if weight.rawValue >= UIFont.Weight.medium.rawValue {
            name = "DMSans-Medium"
        } else {
            name = "DMSans-Regular"
        }
        return UIFont(name: name, size: size) ?? .systemFont(ofSize: size, weight: weight)
    }
}

private enum MarketelShellProduct: Equatable {
    case frontDesk
    case inspect
    /// The app's tool chooser: the glass bar alone, with nothing to navigate yet.
    case chooser
}

private enum MarketelSharedCredentials {
    static let appGroup = "group.com.bookmarketel.frontdesk"

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    static func save(token: String, hotelId: String, backendOrigin: String) {
        guard let defaults else { return }
        defaults.set(token, forKey: "crmToken")
        defaults.set(hotelId, forKey: "hotelId")
        defaults.set(backendOrigin, forKey: "backendOrigin")
    }

    static func clear() {
        guard let defaults else { return }
        defaults.removeObject(forKey: "crmToken")
        defaults.removeObject(forKey: "hotelId")
    }
}

/// Compact vector version of the Marketel mark. Keeping it native means the
/// header stays sharp at every display scale without shipping another asset.
private final class MarketelMarkView: UIView {
    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        isUserInteractionEnabled = false
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        isOpaque = false
        isUserInteractionEnabled = false
    }

    static func drawMark(in rect: CGRect) {
        let green = UIColor(red: 46 / 255, green: 125 / 255, blue: 91 / 255, alpha: 1)
        let scale = min(rect.width / 69, rect.height / 72)
        let drawingSize = CGSize(width: 69 * scale, height: 72 * scale)
        let origin = CGPoint(
            x: rect.midX - drawingSize.width / 2,
            y: rect.midY - drawingSize.height / 2
        )

        func scaledRect(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat) -> CGRect {
            CGRect(
                x: origin.x + x * scale,
                y: origin.y + y * scale,
                width: width * scale,
                height: height * scale
            )
        }

        green.setFill()
        UIBezierPath(
            roundedRect: scaledRect(0, 0, 52.37, 71.49),
            cornerRadius: 15 * scale
        ).fill()

        UIColor.white.setFill()
        UIBezierPath(
            roundedRect: scaledRect(4.99, 4.99, 35.75, 61.52),
            cornerRadius: 15 * scale
        ).fill()

        green.setFill()
        UIBezierPath(
            roundedRect: scaledRect(16.63, 0, 52.37, 71.49),
            cornerRadius: 15 * scale
        ).fill()

        UIColor.white.setFill()
        UIBezierPath(ovalIn: scaledRect(26.6, 29.93, 9.98, 10.81)).fill()
    }

    override func draw(_ rect: CGRect) {
        Self.drawMark(in: rect)
    }
}

/// Native navigation chrome around the hosted Front Desk.
///
/// The web application remains the source of truth for page content. UIKit
/// owns top-level navigation so iOS 26 can render the real Liquid Glass tab
/// and navigation treatments, while older iOS versions receive the standard
/// system appearance automatically.
final class MarketelBridgeViewController: CAPBridgeViewController, UITabBarDelegate, WKScriptMessageHandler, CNContactViewControllerDelegate, SFSafariViewControllerDelegate, UITextFieldDelegate {
    private let backendOrigin = URL(string: "https://guest-lodge-backend.onrender.com")!
    private let bundledFrontDesk = URL(string: "capacitor://localhost/frontdesk/index.html")!
    private let statusBarBackdrop = UIView()
    private let topBar = UIVisualEffectView()
    private let tabBar = UITabBar()
    private let menuButton = UIButton(type: .system)
    private let propertyHeaderControl = UIControl()
    private let productNameLabel = UILabel()
    private let propertyNameLabel = UILabel()
    private let propertyChevron = UIImageView(image: UIImage(systemName: "chevron.down"))
    private let qrButton = UIButton(type: .system)
    private let trialStatusBadge = UIButton(type: .system)
    private let yourPageTabItem = UITabBarItem(
        title: "Your Page",
        image: UIImage(systemName: "globe"),
        tag: 0
    )
    private let availabilityTabItem = UITabBarItem(
        title: "Availability",
        image: UIImage(systemName: "door.left.hand.open"),
        tag: 2
    )
    private let guestAppTabItem = UITabBarItem(
        title: "Guest App",
        image: UIImage(systemName: "iphone"),
        tag: 3
    )
    private var bookingTabItem: UITabBarItem?
    private let inspectReportsTabItem = UITabBarItem(
        title: "Reports",
        image: UIImage(systemName: "doc.text"),
        tag: 10
    )
    private let inspectCurrentTabItem = UITabBarItem(
        title: "Current",
        image: UIImage(systemName: "square.and.pencil"),
        tag: 11
    )
    private let inspectPropertiesTabItem = UITabBarItem(
        title: "Properties",
        image: UIImage(systemName: "building.2"),
        tag: 12
    )
    private var shellProduct: MarketelShellProduct?
    private var frontDeskMenu: UIMenu?
    private var inspectMenu: UIMenu?
    private var shellVisible = false
    private var shellSuppressedByModal = false
    private let dictation = MarketelDictation()
    private var inspectAuthenticated = false
    private var pendingInspectHandoffToken: String?
    private var inspectHandoffDeliveryAttempts = 0
    private var nativeTourActive = false
    private var nativeAuthToken = ""
    private var activeHotelId = ""
    private var apnsDeviceToken = ""
    private let nativeSession = MarketelNativeSession()
    // Inspect sign-in lives inside the glass bar: it grows downward to reveal
    // the email and code steps, the way bookmarketel.com/inspect expands its
    // banner. The web layer still does the network work and owns the session.
    private let signInButton = UIButton(type: .system)
    private let authCloseButton = UIButton(type: .system)
    private let menuSlot = UIView()
    private let authDrawer = UIStackView()
    private let authTitleLabel = UILabel()
    private let authMessageLabel = UILabel()
    private let authEmailField = UITextField()
    private let authCodeField = UITextField()
    private let authSendButton = UIButton(type: .system)
    private let authErrorLabel = UILabel()
    private let authCodeActions = UIStackView()
    private let authResendButton = UIButton(type: .system)
    private let authChangeEmailButton = UIButton(type: .system)
    private var authDrawerOpen = false
    private var authEmail = ""
    private var authEmailTitle = ""
    private var authEmailMessage = ""
    private var authLastTriedCode = ""
    private var authVerifying = false
    private var inspectProductName = "Inspect"
    // The Inspect family's banner is the web header, natively: app icon, the
    // Marketel wordmark, then the tool's name in muted DM Sans.
    private let frontDeskBrandRow = UIStackView()
    private let inspectBrandRow = UIStackView()
    private let inspectWedgeLabel = UILabel()

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Capacitor 6+ does not auto-discover plugins that live in the app target
        // (only those shipped in packages). Register this one explicitly, or
        // window.Capacitor.Plugins.LiveActivity is undefined and the web half
        // never observes a push-to-start token.
        bridge?.registerPluginInstance(LiveActivityPlugin())
        webView?.configuration.userContentController.add(self, name: "marketelShell")
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.verticalScrollIndicatorInsets = .zero
        webView?.scrollView.alwaysBounceVertical = true
        webView?.scrollView.bounces = true
        webView?.scrollView.decelerationRate = .normal
        webView?.scrollView.scrollsToTop = true
        // Forms should scroll behind the keyboard without a drag implicitly
        // dismissing it. Messaging surfaces provide their own explicit
        // composer dismissal behavior in the web layer.
        webView?.scrollView.keyboardDismissMode = .none
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 239 / 255, green: 244 / 255, blue: 240 / 255, alpha: 1)
        view.tintColor = UIColor(red: 46 / 255, green: 125 / 255, blue: 91 / 255, alpha: 1)
        configureTopBar()
        configureTabBar()
        setShellProduct(.frontDesk)
        configureAssistantPill()
        setShellVisible(false, animated: false)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didRegisterForRemoteNotifications(_:)),
            name: .marketelDidRegisterForRemoteNotifications,
            object: nil
        )
        if let pendingDestination = marketelPendingNotificationDestination {
            DispatchQueue.main.async { [weak self] in
                self?.openNotificationDestination(pendingDestination)
            }
        }
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didFailToRegisterForRemoteNotifications(_:)),
            name: .marketelDidFailToRegisterForRemoteNotifications,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(openNotificationPath(_:)),
            name: .marketelOpenNotificationPath,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(refreshFrontDeskData(_:)),
            name: .marketelRefreshFrontDesk,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(openInspectHandoff(_:)),
            name: .marketelOpenInspectHandoff,
            object: nil
        )
        // A cold launch delivers the link before this controller exists, so the
        // token waits in a global until there is somewhere to hand it to.
        if let pendingHandoff = marketelPendingInspectHandoffToken {
            marketelPendingInspectHandoffToken = nil
            pendingInspectHandoffToken = pendingHandoff
            inspectHandoffDeliveryAttempts = 0
            DispatchQueue.main.async { [weak self] in
                self?.deliverInspectHandoff()
            }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let bounds = view.bounds
        let safeInsets = view.safeAreaInsets

        statusBarBackdrop.frame = CGRect(
            x: 0,
            y: 0,
            width: bounds.width,
            height: safeInsets.top
        )
        let topBarWidth = bounds.width - 16
        topBar.frame = CGRect(
            x: 8,
            y: safeInsets.top + 6,
            width: topBarWidth,
            height: topBarHeight(width: topBarWidth)
        )
        // The menu sits visually inside the glass header but outside its view
        // hierarchy. iOS can then animate the context menu's source button
        // without snapshotting or blanking the entire glass banner.
        menuButton.frame = CGRect(
            x: topBar.frame.maxX - 48,
            y: topBar.frame.minY + 10,
            width: 40,
            height: 44
        )

        let measuredTabHeight = tabBar.sizeThatFits(
            CGSize(width: bounds.width, height: bounds.height)
        ).height
        let tabHeight = max(measuredTabHeight, 50 + safeInsets.bottom)
        tabBar.frame = CGRect(
            x: 0,
            y: bounds.height - tabHeight,
            width: bounds.width,
            height: tabHeight
        )

        // Sits above the tab bar, centred, sized to its own content.
        let pillSize = assistantPillButton.systemLayoutSizeFitting(
            UIView.layoutFittingCompressedSize
        )
        let pillWidth = min(max(pillSize.width, 132), bounds.width - 48)
        let pillHeight = max(pillSize.height, 42)
        let pillFrame = CGRect(
            x: (bounds.width - pillWidth) / 2,
            y: tabBar.frame.minY - pillHeight - 12,
            width: pillWidth,
            height: pillHeight
        )
        assistantPill.frame = pillFrame
        assistantPillButton.frame = pillFrame
        if #unavailable(iOS 26.0) {
            assistantPill.layer.cornerRadius = pillHeight / 2
        }

        view.bringSubviewToFront(statusBarBackdrop)
        view.bringSubviewToFront(topBar)
        view.bringSubviewToFront(menuButton)
        view.bringSubviewToFront(tabBar)
        view.bringSubviewToFront(assistantPill)
        view.bringSubviewToFront(assistantPillButton)
    }

    private func configureTopBar() {
        let shellBackground = UIColor(
            red: 239 / 255,
            green: 244 / 255,
            blue: 240 / 255,
            alpha: 1
        )
        statusBarBackdrop.backgroundColor = shellBackground
        statusBarBackdrop.isUserInteractionEnabled = false
        view.addSubview(statusBarBackdrop)

        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: .regular)
            glass.tintColor = UIColor(
                red: 239 / 255,
                green: 244 / 255,
                blue: 240 / 255,
                alpha: 0.12
            )
            topBar.effect = glass
            topBar.cornerConfiguration = .capsule()
        } else {
            topBar.effect = UIBlurEffect(style: .systemThinMaterial)
            topBar.layer.cornerRadius = 32
            topBar.layer.cornerCurve = .continuous
        }
        topBar.clipsToBounds = true
        topBar.isUserInteractionEnabled = true

        let logoImage = Bundle.main.url(
            forResource: "marketel-frontdesk-icon",
            withExtension: "png",
            subdirectory: "public"
        ).flatMap { try? Data(contentsOf: $0) }.flatMap { UIImage(data: $0) }
        let logo = UIImageView(image: logoImage)
        logo.translatesAutoresizingMaskIntoConstraints = false
        logo.contentMode = .scaleAspectFit
        logo.layer.cornerRadius = 6
        logo.layer.cornerCurve = .continuous
        logo.clipsToBounds = true
        logo.accessibilityLabel = "Marketel"

        productNameLabel.text = "Front Desk"
        productNameLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        productNameLabel.textColor = .label

        var trialConfiguration = UIButton.Configuration.filled()
        trialConfiguration.title = "TRIAL"
        trialConfiguration.baseForegroundColor = UIColor(
            red: 26 / 255,
            green: 92 / 255,
            blue: 63 / 255,
            alpha: 1
        )
        trialConfiguration.baseBackgroundColor = UIColor(
            red: 211 / 255,
            green: 235 / 255,
            blue: 222 / 255,
            alpha: 1
        )
        trialConfiguration.cornerStyle = .capsule
        trialConfiguration.contentInsets = NSDirectionalEdgeInsets(
            top: 2,
            leading: 6,
            bottom: 2,
            trailing: 6
        )
        trialConfiguration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = .systemFont(ofSize: 9, weight: .bold)
            return outgoing
        }
        trialStatusBadge.configuration = trialConfiguration
        trialStatusBadge.isUserInteractionEnabled = false
        trialStatusBadge.isHidden = true
        trialStatusBadge.accessibilityTraits = .staticText

        let frontDeskRow = UIStackView(arrangedSubviews: [productNameLabel, trialStatusBadge])
        frontDeskRow.axis = .horizontal
        frontDeskRow.alignment = .center
        frontDeskRow.spacing = 6

        propertyNameLabel.text = "Your property"
        propertyNameLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        propertyNameLabel.textColor = .secondaryLabel
        propertyNameLabel.lineBreakMode = .byTruncatingTail
        propertyNameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        propertyChevron.translatesAutoresizingMaskIntoConstraints = false
        propertyChevron.tintColor = .secondaryLabel
        propertyChevron.contentMode = .scaleAspectFit

        let propertyRow = UIStackView(arrangedSubviews: [propertyNameLabel, propertyChevron])
        propertyRow.axis = .horizontal
        propertyRow.alignment = .center
        propertyRow.spacing = 4

        let labels = UIStackView(arrangedSubviews: [frontDeskRow, propertyRow])
        labels.axis = .vertical
        labels.alignment = .leading
        labels.spacing = 0
        labels.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let brandRow = frontDeskBrandRow
        brandRow.addArrangedSubview(logo)
        brandRow.addArrangedSubview(labels)
        brandRow.translatesAutoresizingMaskIntoConstraints = false
        brandRow.axis = .horizontal
        brandRow.alignment = .center
        brandRow.spacing = 8
        brandRow.isUserInteractionEnabled = false

        propertyHeaderControl.addSubview(brandRow)
        propertyHeaderControl.addTarget(
            self,
            action: #selector(openPropertyPicker),
            for: .touchUpInside
        )
        propertyHeaderControl.addTarget(
            self,
            action: #selector(propertyHeaderTouchDown),
            for: [.touchDown, .touchDragEnter]
        )
        propertyHeaderControl.addTarget(
            self,
            action: #selector(propertyHeaderTouchUp),
            for: [.touchUpInside, .touchUpOutside, .touchCancel, .touchDragExit]
        )
        propertyHeaderControl.layer.cornerRadius = 18
        propertyHeaderControl.layer.cornerCurve = .continuous
        propertyHeaderControl.accessibilityLabel = "Switch property"
        propertyHeaderControl.accessibilityTraits = .button

        NSLayoutConstraint.activate([
            logo.widthAnchor.constraint(equalToConstant: 28),
            logo.heightAnchor.constraint(equalToConstant: 28),
            propertyChevron.widthAnchor.constraint(equalToConstant: 9),
            propertyChevron.heightAnchor.constraint(equalToConstant: 9),
            brandRow.leadingAnchor.constraint(equalTo: propertyHeaderControl.leadingAnchor),
            brandRow.trailingAnchor.constraint(equalTo: propertyHeaderControl.trailingAnchor),
            brandRow.topAnchor.constraint(equalTo: propertyHeaderControl.topAnchor),
            brandRow.bottomAnchor.constraint(equalTo: propertyHeaderControl.bottomAnchor),
            propertyHeaderControl.heightAnchor.constraint(equalToConstant: 48)
        ])
        propertyHeaderControl.setContentHuggingPriority(.defaultLow, for: .horizontal)
        propertyHeaderControl.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        var qrConfiguration = UIButton.Configuration.plain()
        qrConfiguration.image = UIImage(systemName: "qrcode.viewfinder")
        qrConfiguration.baseForegroundColor = .label
        qrConfiguration.contentInsets = .zero
        qrButton.configuration = qrConfiguration
        qrButton.addTarget(self, action: #selector(showGuestQR), for: .touchUpInside)
        qrButton.accessibilityLabel = "Show guest QR"

        let refreshAction = UIAction(
            title: "Refresh",
            image: UIImage(systemName: "arrow.clockwise")
        ) { [weak self] _ in
            self?.sendWebAction("refresh")
        }
        let notificationSettingsAction = UIAction(
            title: "Notification settings",
            image: UIImage(systemName: "bell")
        ) { _ in
            guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
            UIApplication.shared.open(url)
        }
        let supportAction = UIAction(
            title: "Message Marketel",
            image: UIImage(systemName: "questionmark.bubble")
        ) { [weak self] _ in
            self?.presentNativeSupportMessages()
        }
        let tourAction = UIAction(
            title: "Replay app tour",
            image: UIImage(systemName: "questionmark.circle")
        ) { [weak self] _ in
            self?.sendWebAction("tour")
        }
        let accountAction = UIAction(
            title: "Privacy & account",
            image: UIImage(systemName: "person.crop.circle")
        ) { [weak self] _ in
            self?.sendWebAction("account")
        }
        let inspectAction = UIAction(
            title: "Open Marketel Inspect",
            image: UIImage(systemName: "checklist")
        ) { [weak self] _ in
            self?.setShellVisible(false, animated: false)
            self?.webView?.evaluateJavaScript(
                "localStorage.setItem('marketel.product','inspect');location.href='../inspect/index.html'"
            )
        }
        let signOutAction = UIAction(
            title: "Sign out",
            image: UIImage(systemName: "rectangle.portrait.and.arrow.right"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.sendWebAction("signout")
        }
        var menuConfiguration = UIButton.Configuration.plain()
        menuConfiguration.image = UIImage(systemName: "ellipsis")
        menuConfiguration.baseForegroundColor = .label
        menuConfiguration.contentInsets = .zero
        menuButton.configuration = menuConfiguration
        frontDeskMenu = UIMenu(
            children: [
                supportAction,
                notificationSettingsAction,
                refreshAction,
                tourAction,
                inspectAction,
                accountAction,
                signOutAction,
            ]
        )
        let inspectRefreshAction = UIAction(
            title: "Refresh",
            image: UIImage(systemName: "arrow.clockwise")
        ) { [weak self] _ in
            self?.callWeb(function: "marketelInspectNativeAction", argument: "refresh")
        }
        let inspectAccountAction = UIAction(
            title: "Inspect account",
            image: UIImage(systemName: "person.crop.circle")
        ) { [weak self] _ in
            self?.callWeb(function: "marketelInspectNativeAction", argument: "account")
        }
        let frontDeskAction = UIAction(
            title: "Open booking Front Desk",
            image: UIImage(systemName: "bed.double")
        ) { [weak self] _ in
            self?.callWeb(function: "marketelInspectNativeAction", argument: "frontdesk")
        }
        inspectMenu = UIMenu(children: [inspectRefreshAction, inspectAccountAction, frontDeskAction])
        menuButton.menu = frontDeskMenu
        menuButton.showsMenuAsPrimaryAction = true
        menuButton.changesSelectionAsPrimaryAction = false
        menuButton.automaticallyUpdatesConfiguration = false
        menuButton.accessibilityLabel = "Front Desk menu"

        // Reserve the trailing space inside the header for the independently
        // hosted menu button.
        let actions = UIStackView(arrangedSubviews: [qrButton, signInButton, authCloseButton, menuSlot])
        actions.axis = .horizontal
        actions.alignment = .center
        actions.spacing = 2
        actions.setContentHuggingPriority(.required, for: .horizontal)
        actions.setContentCompressionResistancePriority(.required, for: .horizontal)

        let headerRow = UIStackView(arrangedSubviews: [propertyHeaderControl, actions])
        headerRow.translatesAutoresizingMaskIntoConstraints = false
        headerRow.axis = .horizontal
        headerRow.alignment = .center
        headerRow.spacing = 8

        topBar.contentView.addSubview(headerRow)
        NSLayoutConstraint.activate([
            qrButton.widthAnchor.constraint(equalToConstant: 40),
            qrButton.heightAnchor.constraint(equalToConstant: 44),
            menuSlot.widthAnchor.constraint(equalToConstant: 40),
            menuSlot.heightAnchor.constraint(equalToConstant: 44),
            headerRow.leadingAnchor.constraint(equalTo: topBar.contentView.leadingAnchor, constant: 14),
            headerRow.trailingAnchor.constraint(equalTo: topBar.contentView.trailingAnchor, constant: -8),
            headerRow.topAnchor.constraint(equalTo: topBar.contentView.topAnchor, constant: 6),
            // Fixed rather than pinned to the bottom, so the bar can grow
            // under the header row when sign-in opens.
            headerRow.heightAnchor.constraint(equalToConstant: 52),
            authCloseButton.widthAnchor.constraint(equalToConstant: 40),
            authCloseButton.heightAnchor.constraint(equalToConstant: 44)
        ])

        view.addSubview(topBar)
        view.addSubview(menuButton)
        configureInspectBrand()
        configureAuthDrawer()
    }

    private func configureInspectBrand() {
        let icon = Bundle.main.url(
            forResource: "marketel-frontdesk-icon",
            withExtension: "png",
            subdirectory: "public"
        ).flatMap { try? Data(contentsOf: $0) }.flatMap { UIImage(data: $0) }
        let logo = UIImageView(image: icon)
        logo.translatesAutoresizingMaskIntoConstraints = false
        logo.contentMode = .scaleAspectFit
        logo.layer.cornerRadius = 8
        logo.layer.cornerCurve = .continuous
        logo.clipsToBounds = true

        // The same vector the web header draws, from the asset catalog, so it
        // stays sharp at every scale.
        let wordmark = UIImageView(image: UIImage(named: "MarketelWordmark"))
        wordmark.translatesAutoresizingMaskIntoConstraints = false
        wordmark.contentMode = .scaleAspectFit
        wordmark.isAccessibilityElement = true
        wordmark.accessibilityLabel = "Marketel"

        inspectWedgeLabel.font = MarketelFont.dmSans(.medium, size: 16)
        inspectWedgeLabel.textColor = UIColor(red: 107 / 255, green: 125 / 255, blue: 114 / 255, alpha: 1)
        inspectWedgeLabel.text = inspectProductName
        inspectWedgeLabel.lineBreakMode = .byTruncatingTail
        inspectWedgeLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        for item in [logo, wordmark, inspectWedgeLabel] as [UIView] {
            inspectBrandRow.addArrangedSubview(item)
        }
        inspectBrandRow.axis = .horizontal
        inspectBrandRow.alignment = .center
        inspectBrandRow.spacing = 8
        inspectBrandRow.isUserInteractionEnabled = false
        inspectBrandRow.translatesAutoresizingMaskIntoConstraints = false
        inspectBrandRow.isHidden = true
        propertyHeaderControl.addSubview(inspectBrandRow)
        NSLayoutConstraint.activate([
            logo.widthAnchor.constraint(equalToConstant: 28),
            logo.heightAnchor.constraint(equalToConstant: 28),
            // 296 x 53 artwork at the web's 104px phone width.
            wordmark.widthAnchor.constraint(equalToConstant: 104),
            wordmark.heightAnchor.constraint(equalToConstant: 19),
            inspectBrandRow.leadingAnchor.constraint(equalTo: propertyHeaderControl.leadingAnchor),
            inspectBrandRow.centerYAnchor.constraint(equalTo: propertyHeaderControl.centerYAnchor),
            inspectBrandRow.trailingAnchor.constraint(lessThanOrEqualTo: propertyHeaderControl.trailingAnchor)
        ])
    }

    private func configureAuthDrawer() {
        let green = UIColor(red: 46 / 255, green: 125 / 255, blue: 91 / 255, alpha: 1)
        func font(_ size: CGFloat, _ weight: UIFont.Weight) -> UIConfigurationTextAttributesTransformer {
            UIConfigurationTextAttributesTransformer { incoming in
                var outgoing = incoming
                outgoing.font = MarketelFont.dmSans(weight, size: size)
                return outgoing
            }
        }

        // The web header's quiet button: green DM Sans on nothing, with the
        // pale green press state instead of a filled pill.
        var signInConfiguration = UIButton.Configuration.plain()
        signInConfiguration.title = "Sign in"
        signInConfiguration.baseForegroundColor = green
        signInConfiguration.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 12, bottom: 10, trailing: 12)
        signInConfiguration.background.cornerRadius = 12
        signInConfiguration.titleTextAttributesTransformer = font(16, .bold)
        signInButton.configuration = signInConfiguration
        signInButton.configurationUpdateHandler = { button in
            var configuration = button.configuration
            configuration?.background.backgroundColor = button.isHighlighted
                ? UIColor(red: 228 / 255, green: 239 / 255, blue: 232 / 255, alpha: 1)
                : .clear
            button.configuration = configuration
        }
        signInButton.accessibilityLabel = "Sign in"
        signInButton.isHidden = true
        signInButton.addTarget(self, action: #selector(nativeSignInTapped), for: .touchUpInside)

        var closeConfiguration = UIButton.Configuration.plain()
        closeConfiguration.image = UIImage(systemName: "xmark")
        closeConfiguration.baseForegroundColor = .secondaryLabel
        closeConfiguration.contentInsets = .zero
        authCloseButton.configuration = closeConfiguration
        authCloseButton.accessibilityLabel = "Close sign in"
        authCloseButton.isHidden = true
        authCloseButton.addTarget(self, action: #selector(closeAuthDrawerTapped), for: .touchUpInside)

        authTitleLabel.font = MarketelFont.dmSans(.bold, size: 22)
        authTitleLabel.textColor = .label
        authTitleLabel.numberOfLines = 0
        authMessageLabel.font = MarketelFont.dmSans(.regular, size: 15)
        authMessageLabel.textColor = .secondaryLabel
        authMessageLabel.numberOfLines = 0
        authErrorLabel.font = MarketelFont.dmSans(.medium, size: 14)
        authErrorLabel.textColor = UIColor(red: 170 / 255, green: 56 / 255, blue: 43 / 255, alpha: 1)
        authErrorLabel.numberOfLines = 0
        authErrorLabel.isHidden = true

        for field in [authEmailField, authCodeField] {
            field.borderStyle = .none
            field.backgroundColor = UIColor.white.withAlphaComponent(0.92)
            field.layer.cornerRadius = 14
            field.layer.cornerCurve = .continuous
            field.layer.borderWidth = 1
            field.layer.borderColor = UIColor(red: 216 / 255, green: 228 / 255, blue: 220 / 255, alpha: 1).cgColor
            field.font = MarketelFont.dmSans(.regular, size: 17)
            field.textColor = .label
            // Neither keyboard has a way down on its own (the number pad has no
            // return key), so both get the same Done bar the web fields show.
            let toolbar = UIToolbar(frame: CGRect(x: 0, y: 0, width: 320, height: 44))
            toolbar.items = [
                UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
                UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(dismissAuthKeyboard))
            ]
            toolbar.sizeToFit()
            field.inputAccessoryView = toolbar
            field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
            field.leftViewMode = .always
            field.delegate = self
            field.heightAnchor.constraint(equalToConstant: 50).isActive = true
        }
        authEmailField.placeholder = "Email"
        authEmailField.keyboardType = .emailAddress
        authEmailField.textContentType = .username
        authEmailField.autocapitalizationType = .none
        authEmailField.autocorrectionType = .no
        authEmailField.spellCheckingType = .no
        authEmailField.returnKeyType = .send
        authEmailField.accessibilityLabel = "Email"
        authCodeField.placeholder = "6-digit code"
        authCodeField.keyboardType = .numberPad
        authCodeField.textContentType = .oneTimeCode
        authCodeField.font = .monospacedDigitSystemFont(ofSize: 22, weight: .semibold)
        authCodeField.accessibilityLabel = "Six-digit code"
        authCodeField.addTarget(self, action: #selector(authCodeChanged), for: .editingChanged)

        var sendConfiguration = UIButton.Configuration.filled()
        sendConfiguration.title = "Send sign-in code"
        sendConfiguration.baseBackgroundColor = green
        sendConfiguration.baseForegroundColor = .white
        sendConfiguration.cornerStyle = .large
        sendConfiguration.titleTextAttributesTransformer = font(16, .semibold)
        authSendButton.configuration = sendConfiguration
        authSendButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
        authSendButton.addTarget(self, action: #selector(authSendTapped), for: .touchUpInside)

        for (button, title) in [(authResendButton, "Send a new code"), (authChangeEmailButton, "\u{2190} Change email")] {
            var configuration = UIButton.Configuration.plain()
            configuration.title = title
            configuration.baseForegroundColor = green
            configuration.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0)
            configuration.titleTextAttributesTransformer = font(14, .semibold)
            button.configuration = configuration
        }
        authResendButton.addTarget(self, action: #selector(authResendTapped), for: .touchUpInside)
        authChangeEmailButton.addTarget(self, action: #selector(authChangeEmailTapped), for: .touchUpInside)
        authCodeActions.axis = .horizontal
        authCodeActions.distribution = .equalSpacing
        authCodeActions.addArrangedSubview(authResendButton)
        authCodeActions.addArrangedSubview(authChangeEmailButton)

        for item in [authTitleLabel, authMessageLabel, authEmailField, authCodeField, authSendButton, authErrorLabel, authCodeActions] as [UIView] {
            authDrawer.addArrangedSubview(item)
        }
        authDrawer.axis = .vertical
        authDrawer.spacing = 10
        authDrawer.setCustomSpacing(6, after: authTitleLabel)
        authDrawer.setCustomSpacing(14, after: authMessageLabel)
        authDrawer.translatesAutoresizingMaskIntoConstraints = false
        authDrawer.isHidden = true
        authDrawer.alpha = 0
        topBar.contentView.addSubview(authDrawer)
        NSLayoutConstraint.activate([
            authDrawer.topAnchor.constraint(equalTo: topBar.contentView.topAnchor, constant: 64),
            authDrawer.leadingAnchor.constraint(equalTo: topBar.contentView.leadingAnchor, constant: 18),
            authDrawer.trailingAnchor.constraint(equalTo: topBar.contentView.trailingAnchor, constant: -18)
        ])
    }

    /// 64pt collapsed; open, it is the header row plus whatever the current
    /// sign-in step needs, measured rather than guessed so a wrapped title or
    /// an error line never gets clipped.
    private func topBarHeight(width: CGFloat) -> CGFloat {
        guard authDrawerOpen else { return 64 }
        let fitting = authDrawer.systemLayoutSizeFitting(
            CGSize(width: max(width - 36, 0), height: UIView.layoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        )
        return 64 + ceil(fitting.height) + 20
    }

    private func openAuthDrawer(title: String, message: String) {
        guard shellProduct == .inspect, !inspectAuthenticated else { return }
        authEmailTitle = title.isEmpty ? "Sign in" : title
        authEmailMessage = message
        showAuthStep(code: false)
        shellSuppressedByModal = false
        setShellVisible(true, animated: shellVisible)
        setAuthDrawerOpen(true)
        authEmailField.becomeFirstResponder()
    }

    private func setAuthDrawerOpen(_ open: Bool) {
        guard open != authDrawerOpen else { return }
        authDrawerOpen = open
        // The page behind cannot be touched while the banner is a form, the same
        // way the web makes its report inert under the expanded header. Only
        // the scroll view: Capacitor makes the web view this controller's root
        // view, so disabling the web view itself disabled the glass bar inside
        // it too, which is why neither Send nor the close button responded.
        webView?.scrollView.isUserInteractionEnabled = !open
        if open {
            authDrawer.isHidden = false
            authDrawer.alpha = 0
            authDrawer.transform = CGAffineTransform(translationX: 0, y: -12)
            // A capsule would round a tall bar into an oval. At 64pt a 32pt
            // radius is the same capsule, so the swap itself is invisible.
            if #available(iOS 26.0, *) {
                topBar.cornerConfiguration = .corners(radius: .fixed(32))
            }
        } else {
            authVerifying = false
            view.endEditing(true)
        }
        setShellVisible(shellVisible, animated: true)
        UIView.animate(
            withDuration: 0.42,
            delay: 0,
            usingSpringWithDamping: 0.86,
            initialSpringVelocity: 0,
            options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
            self.view.setNeedsLayout()
            self.view.layoutIfNeeded()
            self.authDrawer.alpha = open ? 1 : 0
            self.authDrawer.transform = open ? .identity : CGAffineTransform(translationX: 0, y: -12)
        } completion: { _ in
            guard !self.authDrawerOpen else { return }
            self.authDrawer.isHidden = true
            if #available(iOS 26.0, *) {
                self.topBar.cornerConfiguration = .capsule()
            }
        }
    }

    /// Grows or shrinks the open bar to fit a new step or an error line.
    private func refitAuthDrawer() {
        guard authDrawerOpen else { return }
        UIView.animate(
            withDuration: 0.36,
            delay: 0,
            usingSpringWithDamping: 0.9,
            initialSpringVelocity: 0,
            options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
            self.view.setNeedsLayout()
            self.view.layoutIfNeeded()
        }
    }

    private func showAuthStep(code: Bool) {
        authErrorLabel.isHidden = true
        authEmailField.isHidden = code
        authSendButton.isHidden = code
        authCodeField.isHidden = !code
        authCodeActions.isHidden = !code
        authVerifying = false
        authLastTriedCode = ""
        if code {
            authTitleLabel.text = "Enter your code."
            authMessageLabel.text = "Sent to \(authEmail)"
            authCodeField.text = ""
        } else {
            authTitleLabel.text = authEmailTitle
            authMessageLabel.text = authEmailMessage
            authEmailField.text = authEmail
        }
    }

    private func showAuthError(_ message: String) {
        authErrorLabel.text = message
        authErrorLabel.isHidden = false
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        refitAuthDrawer()
    }

    private func submitAuthEmail() {
        let email = (authEmailField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard email.contains("@"), email.count >= 3 else {
            showAuthError("Enter the email you signed up with.")
            return
        }
        authEmail = email
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        // Same order as the web: the code step appears at once and the request
        // follows, so the number pad is already up when the email lands.
        showAuthStep(code: true)
        refitAuthDrawer()
        authCodeField.becomeFirstResponder()
        callWeb(function: "marketelInspectAuthRequest", argument: email)
    }

    private func handleInspectAuthResult(_ payload: [String: Any]) {
        guard authDrawerOpen else { return }
        switch payload["step"] as? String ?? "" {
        case "verified":
            setAuthDrawerOpen(false)
        case "error":
            authVerifying = false
            showAuthError(payload["message"] as? String ?? "That did not work. Please try again.")
            // Left selected, so the next digit typed replaces the wrong code.
            if !authCodeField.isHidden { authCodeField.selectAll(nil) }
        default:
            break
        }
    }

    @objc private func nativeSignInTapped() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        callWeb(function: "marketelInspectNativeAction", argument: "signin")
    }

    @objc private func closeAuthDrawerTapped() {
        setAuthDrawerOpen(false)
        callWeb(function: "marketelInspectAuthClosed", argument: "")
    }

    @objc private func authSendTapped() {
        submitAuthEmail()
    }

    @objc private func authCodeChanged() {
        let digits = String((authCodeField.text ?? "").filter { $0.isASCII && $0.isNumber }.prefix(6))
        if authCodeField.text != digits { authCodeField.text = digits }
        if !authErrorLabel.isHidden {
            authErrorLabel.isHidden = true
            refitAuthDrawer()
        }
        guard digits.count == 6, !authVerifying, digits != authLastTriedCode else { return }
        authVerifying = true
        authLastTriedCode = digits
        callWeb(function: "marketelInspectAuthVerify", argument: digits)
    }

    @objc private func authResendTapped() {
        authCodeField.text = ""
        authLastTriedCode = ""
        authCodeField.becomeFirstResponder()
        callWeb(function: "marketelInspectAuthRequest", argument: authEmail)
    }

    @objc private func authChangeEmailTapped() {
        showAuthStep(code: false)
        refitAuthDrawer()
        authEmailField.becomeFirstResponder()
    }

    @objc private func dismissAuthKeyboard() {
        view.endEditing(true)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField === authEmailField { submitAuthEmail() }
        return false
    }

    /// Renames the bar in place when the tool changes. Only the brand
    /// cross-fades; the glass itself never re-renders, so the banner reads as
    /// one object staying put while the page underneath changes.
    private func showInspectProduct(_ name: String) {
        let product = name.isEmpty ? inspectProductName : name
        guard shellProduct != .inspect || product != inspectProductName else { return }
        UIView.transition(
            with: propertyHeaderControl,
            duration: 0.25,
            options: [.transitionCrossDissolve, .allowUserInteraction]
        ) {
            self.inspectProductName = product
            self.setShellProduct(.inspect)
            self.inspectWedgeLabel.text = product
            self.propertyHeaderControl.accessibilityLabel = "Switch tool, \(product)"
        }
    }

    // Floating Assistant pill. Native because it has to sit beside the tab bar
    // and read as the same material: UIGlassEffect samples the real screen and
    // does its own specular and edge work, none of which a CSS backdrop-filter
    // inside the web view can see or reproduce. A web pill was always going to
    // look like a different component next to this.
    private let assistantPill = UIVisualEffectView()
    private let assistantPillButton = UIButton(type: .system)
    private var assistantPillVisible = false
    private var assistantPillLabel = "Front Desk"

    private func configureAssistantPill() {
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: .regular)
            glass.tintColor = UIColor(red: 239 / 255, green: 244 / 255, blue: 240 / 255, alpha: 0.12)
            assistantPill.effect = glass
            assistantPill.cornerConfiguration = .capsule()
        } else {
            assistantPill.effect = UIBlurEffect(style: .systemThinMaterial)
            assistantPill.layer.cornerCurve = .continuous
        }
        assistantPill.clipsToBounds = true
        assistantPill.isUserInteractionEnabled = false
        assistantPill.isHidden = true
        view.addSubview(assistantPill)

        // Same arrangement as the menu button: the control lives outside the
        // effect view so iOS can animate it without snapshotting the glass.
        var config = UIButton.Configuration.plain()
        config.image = UIImage(systemName: "phone.fill")
        config.imagePadding = 7
        config.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 18)
        config.baseForegroundColor = .label
        assistantPillButton.configuration = config
        assistantPillButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        assistantPillButton.isHidden = true
        assistantPillButton.alpha = 0
        assistantPillButton.addTarget(self, action: #selector(openAssistantFromPill), for: .touchUpInside)
        view.addSubview(assistantPillButton)
        applyAssistantPillTitle()
    }

    private func applyAssistantPillTitle() {
        var config = assistantPillButton.configuration
        var title = AttributedString(assistantPillLabel)
        title.font = .systemFont(ofSize: 14, weight: .semibold)
        config?.attributedTitle = title
        assistantPillButton.configuration = config
        assistantPillButton.accessibilityLabel = assistantPillLabel
    }

    @objc private func openAssistantFromPill() {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        presentNativeAssistant()
    }

    // Driven by the same `state` message that already reports the selected tab,
    // so the pill follows the app rather than keeping its own idea of where the
    // owner is.
    private func updateAssistantPill(visible: Bool, label: String) {
        if !label.isEmpty && label != assistantPillLabel {
            assistantPillLabel = label
            applyAssistantPillTitle()
            view.setNeedsLayout()
        }
        guard visible != assistantPillVisible else { return }
        assistantPillVisible = visible

        // Never fade the effect view through partial alpha — same reason as the
        // rest of the shell: it forces an offscreen render and flashes an empty
        // white material. Visibility is swapped atomically and only the scale
        // is animated, which the compositor handles without re-rendering glass.
        if visible {
            assistantPill.isHidden = false
            assistantPillButton.isHidden = false
            assistantPill.transform = CGAffineTransform(scaleX: 0.92, y: 0.92)
            assistantPillButton.transform = assistantPill.transform
            assistantPillButton.alpha = 0
        }
        UIView.animate(
            withDuration: 0.28,
            delay: 0,
            usingSpringWithDamping: 0.88,
            initialSpringVelocity: 0.2,
            options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
            let scale: CGFloat = visible ? 1 : 0.92
            self.assistantPill.transform = CGAffineTransform(scaleX: scale, y: scale)
            self.assistantPillButton.transform = self.assistantPill.transform
            self.assistantPillButton.alpha = visible ? 1 : 0
        } completion: { finished in
            // Switching tabs quickly starts a second animation before this one
            // finishes. Deciding from the captured value would hide a pill that
            // has since been asked to show again, which is what made it vanish
            // until the owner navigated away and back slowly. Read the current
            // state instead, and ignore interrupted runs entirely.
            guard finished, !self.assistantPillVisible else { return }
            self.assistantPill.isHidden = true
            self.assistantPillButton.isHidden = true
        }
    }

    private func configureTabBar() {
        let bookings = UITabBarItem(
            title: "Bookings",
            image: UIImage(systemName: "tray"),
            tag: 1
        )

        bookingTabItem = bookings
        tabBar.delegate = self
        tabBar.items = [yourPageTabItem, bookings, availabilityTabItem, guestAppTabItem]
        tabBar.selectedItem = yourPageTabItem
        tabBar.isTranslucent = true
        tabBar.accessibilityIdentifier = "marketel.native.tabs"
        view.addSubview(tabBar)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        if shellProduct == .inspect {
            let destination: String
            switch item.tag {
            case 10: destination = "reports"
            case 12: destination = "properties"
            default: destination = "current"
            }
            callWeb(function: "marketelInspectNativeSelectTab", argument: destination)
            return
        }
        let filter: String
        switch item.tag {
        case 1: filter = "bookings"
        case 2: filter = "availability"
        case 3: filter = "apps"
        default: filter = "settings"
        }
        callWeb(function: "marketelNativeSelectTab", argument: filter)
    }

    private func setShellProduct(_ product: MarketelShellProduct) {
        guard shellProduct != product else { return }
        shellProduct = product
        switch product {
        case .frontDesk:
            productNameLabel.text = "Front Desk"
            frontDeskBrandRow.isHidden = false
            inspectBrandRow.isHidden = true
            propertyNameLabel.isHidden = false
            propertyChevron.isHidden = false
            propertyHeaderControl.isUserInteractionEnabled = true
            qrButton.isHidden = false
            menuButton.menu = frontDeskMenu
            menuButton.accessibilityLabel = "Front Desk menu"
            if let bookingTabItem {
                tabBar.items = [
                    yourPageTabItem,
                    bookingTabItem,
                    availabilityTabItem,
                    guestAppTabItem,
                ]
            }
            if tabBar.selectedItem == nil || (tabBar.selectedItem?.tag ?? 10) >= 10 {
                tabBar.selectedItem = yourPageTabItem
            }
        case .inspect:
            // The brand leads back to the tool chooser, like the web header's
            // brand link; it switches property in Front Desk.
            frontDeskBrandRow.isHidden = true
            inspectBrandRow.isHidden = false
            inspectWedgeLabel.text = inspectProductName
            inspectWedgeLabel.isHidden = false
            propertyHeaderControl.accessibilityLabel = "Switch tool, \(inspectProductName)"
            qrButton.isHidden = true
            trialStatusBadge.isHidden = true
            menuButton.menu = inspectMenu
            menuButton.accessibilityLabel = "Inspect menu"
            tabBar.items = [inspectReportsTabItem, inspectCurrentTabItem, inspectPropertiesTabItem]
            tabBar.selectedItem = inspectCurrentTabItem
        case .chooser:
            frontDeskBrandRow.isHidden = true
            inspectBrandRow.isHidden = false
            inspectWedgeLabel.isHidden = true
            propertyHeaderControl.accessibilityLabel = "Marketel"
            qrButton.isHidden = true
            trialStatusBadge.isHidden = true
        }
        view.setNeedsLayout()
    }

    // Presented at the medium detent so the room card stays in view behind it,
    // and left open after each shot so a walkthrough is one continuous motion.
    // No view controller: the web sheet stays on screen and the shell only
    // supplies the audio and the live text, so one UI serves both surfaces.
    private func presentInspectDictation() {
        guard !dictation.isRunning else { return }
        dictation.start(onText: { [weak self] text in
            self?.sendDictation(function: "marketelInspectDictationText", payload: ["text": text])
        }, onFinish: { [weak self] dataUrl in
            self?.sendDictation(function: "marketelInspectAudioCaptured", payload: ["dataUrl": dataUrl ?? ""])
        })
    }

    private func sendDictation(function: String, payload: [String: Any]) {
        guard
            let json = try? JSONSerialization.data(withJSONObject: payload),
            let text = String(data: json, encoding: .utf8)
        else { return }
        callWeb(function: function, argument: text)
    }

    private func presentInspectCamera(room: Int) {
        guard presentedViewController == nil else { return }
        let camera = MarketelInspectCameraViewController { [weak self] dataUrl in
            guard let self else { return }
            let payload: [String: Any] = ["room": room, "dataUrl": dataUrl]
            guard
                let json = try? JSONSerialization.data(withJSONObject: payload),
                let text = String(data: json, encoding: .utf8)
            else { return }
            self.callWeb(function: "marketelInspectPhotoCaptured", argument: text)
        }
        camera.modalPresentationStyle = .pageSheet
        if let sheet = camera.sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 28
        }
        present(camera, animated: true)
    }

    @objc private func openInspectHandoff(_ notification: Notification) {
        guard let token = notification.object as? String, !token.isEmpty else { return }
        // Claimed here, so a later controller cannot replay an already-spent token.
        marketelPendingInspectHandoffToken = nil
        pendingInspectHandoffToken = token
        inspectHandoffDeliveryAttempts = 0
        setShellProduct(.inspect)
        deliverInspectHandoff()
    }

    // The web layer owns redemption; this only carries the token across and
    // forgets it immediately, so the value never lingers in native state.
    private func deliverInspectHandoff() {
        guard let token = pendingInspectHandoffToken else { return }
        guard let webView, webView.url != nil else {
            scheduleInspectHandoffRetry()
            return
        }
        webView.evaluateJavaScript("typeof window.marketelInspectOpenHandoff === 'function'") { [weak self] ready, _ in
            guard let self else { return }
            if (ready as? Bool) == true {
                self.pendingInspectHandoffToken = nil
                self.inspectHandoffDeliveryAttempts = 0
                self.callWeb(function: "marketelInspectOpenHandoff", argument: token)
            } else {
                self.scheduleInspectHandoffRetry()
            }
        }
    }

    private func scheduleInspectHandoffRetry() {
        guard pendingInspectHandoffToken != nil else { return }
        inspectHandoffDeliveryAttempts += 1
        guard inspectHandoffDeliveryAttempts <= 25 else {
            pendingInspectHandoffToken = nil
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.deliverInspectHandoff()
        }
    }

    private func updateInspectSelectedTab(_ identifier: String, hasDraft: Bool) {
        inspectCurrentTabItem.title = hasDraft ? "In Progress" : "New Report"
        inspectCurrentTabItem.image = UIImage(systemName: hasDraft ? "square.and.pencil" : "plus.square")
        let tag: Int
        switch identifier {
        case "reports": tag = 10
        case "properties": tag = 12
        default: tag = 11
        }
        tabBar.selectedItem = tabBar.items?.first(where: { $0.tag == tag })
    }

    @objc private func openPropertyPicker() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        if shellProduct == .inspect {
            callWeb(function: "marketelInspectNativeAction", argument: "choose")
            return
        }
        guard nativeSession.isReady, presentedViewController == nil else {
            sendWebAction("properties")
            return
        }
        let picker = MarketelNativePropertyPickerView(
            session: nativeSession,
            origin: backendOrigin
        ) { [weak self] hotelId in
            guard let self else { return }
            self.nativeSession.clear()
            self.callWeb(function: "marketelNativeSwitchProperty", argument: hotelId)
        }
        let controller = UIHostingController(rootView: picker)
        controller.modalPresentationStyle = .pageSheet
        if let sheet = controller.sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 28
        }
        present(controller, animated: true)
    }

    @objc private func propertyHeaderTouchDown() {
        UIView.animate(
            withDuration: 0.09,
            delay: 0,
            options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
            self.propertyHeaderControl.transform = CGAffineTransform(scaleX: 0.975, y: 0.975)
            self.propertyHeaderControl.backgroundColor = UIColor.label.withAlphaComponent(0.07)
        }
    }

    @objc private func propertyHeaderTouchUp() {
        UIView.animate(
            withDuration: 0.28,
            delay: 0,
            usingSpringWithDamping: 0.72,
            initialSpringVelocity: 0.4,
            options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
            self.propertyHeaderControl.transform = .identity
            self.propertyHeaderControl.backgroundColor = .clear
        }
    }

    @objc private func showGuestQR() {
        sendWebAction("qr")
    }

    private func sendWebAction(_ action: String) {
        callWeb(function: "marketelNativeAction", argument: action)
    }

    private func callWeb(function: String, argument: String) {
        guard let data = try? JSONEncoder().encode(argument),
              let literal = String(data: data, encoding: .utf8) else {
            return
        }
        webView?.evaluateJavaScript(
            "if (window.\(function)) { window.\(function)(\(literal)); }"
        )
    }

    private func sendNotificationState(_ state: String) {
        callWeb(function: "marketelNativeNotificationState", argument: state)
    }

    private func requestNativeNotifications() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            guard let self else { return }
            switch settings.authorizationStatus {
            case .notDetermined:
                UNUserNotificationCenter.current().requestAuthorization(
                    options: [.alert, .badge, .sound]
                ) { granted, _ in
                    DispatchQueue.main.async {
                        self.sendNotificationState(granted ? "authorized" : "denied")
                        if granted {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
                }
            case .authorized, .provisional, .ephemeral:
                DispatchQueue.main.async {
                    self.sendNotificationState("authorized")
                    UIApplication.shared.registerForRemoteNotifications()
                }
            case .denied:
                DispatchQueue.main.async {
                    self.sendNotificationState("denied")
                }
            @unknown default:
                DispatchQueue.main.async {
                    self.sendNotificationState("unavailable")
                }
            }
        }
    }

    private func postNativeDeviceRegistration(unregister: Bool = false) {
        guard !nativeAuthToken.isEmpty,
              !activeHotelId.isEmpty,
              !apnsDeviceToken.isEmpty else {
            return
        }
        let endpoint = unregister ? "/api/push/native/unregister" : "/api/push/native/register"
        guard let endpointURL = URL(string: endpoint, relativeTo: backendOrigin)?.absoluteURL,
              var components = URLComponents(
            url: endpointURL,
            resolvingAgainstBaseURL: false
        ) else {
            return
        }
        components.queryItems = [URLQueryItem(name: "hotelId", value: activeHotelId)]
        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(nativeAuthToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
#if DEBUG
        let environment = "sandbox"
#else
        let environment = "production"
#endif
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "hotelId": activeHotelId,
            "deviceToken": apnsDeviceToken,
            "environment": environment,
            "all": unregister,
        ])

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard !unregister else {
                return
            }
            guard error == nil,
                  let status = (response as? HTTPURLResponse)?.statusCode,
                  (200..<300).contains(status) else {
                DispatchQueue.main.async {
                    self?.sendNotificationState("unavailable")
                }
                return
            }
            let responseObject = data.flatMap { payload -> [String: Any]? in
                guard let object = try? JSONSerialization.jsonObject(with: payload) else {
                    return nil
                }
                return object as? [String: Any]
            }
            let pushConfigured = responseObject?["pushConfigured"] as? Bool ?? false
            DispatchQueue.main.async {
                self?.sendNotificationState(pushConfigured ? "registered" : "unavailable")
            }
        }.resume()
    }

    @objc private func didRegisterForRemoteNotifications(_ notification: Notification) {
        guard let token = notification.object as? String, !token.isEmpty else { return }
        apnsDeviceToken = token
        postNativeDeviceRegistration()
    }

    @objc private func didFailToRegisterForRemoteNotifications(_ notification: Notification) {
        sendNotificationState("unavailable")
    }

    @objc private func openNotificationPath(_ notification: Notification) {
        if let destination = notification.object as? [String: String] {
            openNotificationDestination(destination)
        } else if let path = notification.object as? String {
            openNotificationDestination(["path": path])
        }
    }

    @objc private func refreshFrontDeskData(_ notification: Notification) {
        sendWebAction("refresh")
    }

    private func openNotificationDestination(_ destination: [String: String]) {
        marketelPendingNotificationDestination = nil
        let path = destination["path"] ?? "/frontdesk?tab=bookings"
        let notificationHotelId = destination["hotelId"] ?? ""
        if !notificationHotelId.isEmpty {
            activeHotelId = notificationHotelId
        }
        let relative = path.hasPrefix("/") ? path : "/frontdesk"
        guard let payloadURL = URL(string: relative, relativeTo: backendOrigin)?.absoluteURL,
              let payloadComponents = URLComponents(
                url: payloadURL,
                resolvingAgainstBaseURL: false
              ),
              var components = URLComponents(
            url: bundledFrontDesk,
            resolvingAgainstBaseURL: false
        ) else {
            return
        }
        var queryItems = payloadComponents.queryItems ?? []
        queryItems.removeAll { $0.name == "native" || $0.name == "hotelId" }
        queryItems.append(URLQueryItem(name: "native", value: "ios"))
        let destinationHotelId = notificationHotelId.isEmpty ? activeHotelId : notificationHotelId
        if !destinationHotelId.isEmpty {
            queryItems.append(URLQueryItem(name: "hotelId", value: destinationHotelId))
        }
        components.queryItems = queryItems
        guard let url = components.url else { return }
        webView?.load(URLRequest(url: url))
    }

    private func updatePropertyName(_ name: String) {
        guard shellProduct == .frontDesk else { return }
        let propertyName = name.isEmpty ? "Your property" : name
        propertyNameLabel.text = propertyName
        propertyHeaderControl.accessibilityLabel = "Switch property, \(propertyName)"
    }

    private func updateTrialStatus(trialing: Bool, daysLeft: Int) {
        guard shellProduct == .frontDesk else {
            trialStatusBadge.isHidden = true
            return
        }
        trialStatusBadge.isHidden = !trialing
        guard trialing else { return }
        let days = max(0, daysLeft)
        var configuration = trialStatusBadge.configuration
        configuration?.title = days == 1 ? "TRIAL · 1D" : "TRIAL · \(days)D"
        trialStatusBadge.configuration = configuration
        trialStatusBadge.accessibilityLabel = days == 1
            ? "Free trial, 1 day left"
            : "Free trial, \(days) days left"
    }

    private func updateSelectedTab(_ identifier: String) {
        let tag: Int
        switch identifier {
        case "bookings": tag = 1
        case "availability": tag = 2
        case "apps": tag = 3
        default: tag = 0
        }
        tabBar.selectedItem = tabBar.items?.first(where: { $0.tag == tag })
    }

    private func updateBookingBadge(_ count: Int) {
        if count <= 0 {
            bookingTabItem?.badgeValue = nil
        } else {
            bookingTabItem?.badgeValue = count > 99 ? "99+" : String(count)
        }
    }

    private func updateGuestAppBadge(_ count: Int) {
        if count <= 0 {
            guestAppTabItem.badgeValue = nil
        } else {
            guestAppTabItem.badgeValue = count > 99 ? "99+" : String(count)
        }
    }

    private func marketelContactImage() -> UIImage {
        // Prefer the real Front Desk app icon so the Contacts entry matches what
        // the owner already recognises on their home screen. It ships in the
        // Capacitor public directory (see the build:native copy list in
        // frontdesk/vite.config.js). The drawn mark below stays as a fallback so
        // an unsynced asset degrades to the previous behaviour rather than to no
        // image at all.
        if let url = Bundle.main.url(
            forResource: "marketel-frontdesk-icon",
            withExtension: "png",
            subdirectory: "public"
        ), let data = try? Data(contentsOf: url), let icon = UIImage(data: data) {
            return icon
        }

        // Render a deterministic 1024 px contact photo directly from the
        // vector mark so Contacts never has to enlarge a softer bitmap.
        let size = CGSize(width: 1024, height: 1024)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: size, format: format)

        return renderer.image { context in
            UIColor(
                red: 239 / 255,
                green: 244 / 255,
                blue: 240 / 255,
                alpha: 1
            ).setFill()
            context.fill(CGRect(origin: .zero, size: size))

            let markSize = CGSize(width: 456, height: 488)
            let markRect = CGRect(
                x: (size.width - markSize.width) / 2,
                y: (size.height - markSize.height) / 2,
                width: markSize.width,
                height: markSize.height
            )
            MarketelMarkView.drawMark(in: markRect)
        }
    }

    private func presentMarketelContact(phone rawPhone: String) {
        let digits = rawPhone.filter(\.isNumber)
        guard (10...15).contains(digits.count) else {
            let alert = UIAlertController(
                title: "Front Desk number unavailable",
                message: "Marketel messaging has not been connected for this account yet.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return
        }
        let phone = rawPhone

        let contact = CNMutableContact()
        contact.contactType = .person
        contact.givenName = "Marketel"
        contact.familyName = "Front Desk"
        contact.organizationName = "Marketel"
        contact.imageData = marketelContactImage().pngData()
        contact.phoneNumbers = [
            CNLabeledValue(
                label: CNLabelPhoneNumberMobile,
                value: CNPhoneNumber(stringValue: phone)
            )
        ]

        let controller = CNContactViewController(forNewContact: contact)
        controller.delegate = self
        controller.allowsEditing = true
        controller.allowsActions = false

        let navigationController = UINavigationController(rootViewController: controller)
        navigationController.modalPresentationStyle = .formSheet
        navigationController.navigationBar.tintColor = UIColor(
            red: 46 / 255,
            green: 125 / 255,
            blue: 91 / 255,
            alpha: 1
        )
        // The Assistant itself is a native sheet. Present the contact editor
        // from whichever controller is currently visible instead of asking the
        // bridge controller to present over an existing modal.
        let presenter = presentedViewController ?? self
        presenter.present(navigationController, animated: true)
    }

    func contactViewController(
        _ viewController: CNContactViewController,
        didCompleteWith contact: CNContact?
    ) {
        let saved = contact != nil
        let completion = { [weak self] in
            let script = """
            if (typeof window.marketelNativeContactResult === 'function') {
              window.marketelNativeContactResult(\(saved ? "true" : "false"));
            }
            """
            self?.webView?.evaluateJavaScript(script)
        }
        if let navigationController = viewController.navigationController {
            navigationController.dismiss(animated: true, completion: completion)
        } else {
            viewController.dismiss(animated: true, completion: completion)
        }
    }

    private func setShellVisible(_ visible: Bool, animated _: Bool) {
        shellVisible = visible
        // UIVisualEffectView should not be faded through partial alpha: doing
        // that forces an offscreen render and briefly exposes an empty white
        // material after a context menu closes. Swap visibility atomically.
        statusBarBackdrop.alpha = 1
        topBar.alpha = 1
        menuButton.alpha = 1
        tabBar.alpha = 1
        // Signed-out tool pages and the chooser get the floating glass bar on
        // its own: there is no account yet for tabs or a menu to point at.
        let signedOutInspect = shellProduct == .inspect && !inspectAuthenticated
        let barOnly = shellProduct == .chooser || signedOutInspect
        // Only Front Desk paints a flat strip behind the status bar. Inspect
        // pages carry their own glow up under it; a flat strip over that read
        // as a white band at the top of the screen.
        statusBarBackdrop.isHidden = !visible || shellProduct != .frontDesk
        topBar.isHidden = !visible
        menuButton.isHidden = !visible || barOnly
        menuSlot.isHidden = barOnly
        signInButton.isHidden = !visible || !signedOutInspect || authDrawerOpen
        authCloseButton.isHidden = !visible || !authDrawerOpen
        qrButton.isHidden = !visible || shellProduct != .frontDesk
        tabBar.isHidden = !visible || barOnly
        assistantPill.isHidden = !visible || !assistantPillVisible || shellProduct != .frontDesk
        assistantPillButton.isHidden = assistantPill.isHidden
        topBar.isUserInteractionEnabled = visible && !nativeTourActive
        menuButton.isUserInteractionEnabled = visible && !nativeTourActive && !barOnly
        propertyHeaderControl.isUserInteractionEnabled = visible && !nativeTourActive && !authDrawerOpen && shellProduct != .chooser
        tabBar.isUserInteractionEnabled = visible && !nativeTourActive && !barOnly
        assistantPillButton.isUserInteractionEnabled = visible && !nativeTourActive
    }

    private func presentInAppBrowser(_ rawURL: String) {
        guard let url = URL(string: rawURL),
              let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "http" else {
            return
        }
        let browser = SFSafariViewController(url: url)
        browser.delegate = self
        browser.dismissButtonStyle = .close
        browser.preferredControlTintColor = UIColor(
            red: 46 / 255,
            green: 125 / 255,
            blue: 91 / 255,
            alpha: 1
        )
        present(browser, animated: true)
    }

    private func sendInspectStorefront() {
        Task { @MainActor [weak self] in
            let country = await Storefront.current?.countryCode ?? ""
            self?.callWeb(function: "marketelInspectStorefront", argument: country)
        }
    }

    private func exportInspectPDF(reportId: String, token: String) {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "_-"))
        let validId = reportId.count <= 64
            && reportId.unicodeScalars.allSatisfy { allowed.contains($0) }
        let validToken = token.count == 43
            && token.unicodeScalars.allSatisfy { allowed.contains($0) }
        guard validId, validToken,
              let url = URL(string: "/api/inspect/reports/\(reportId)/pdf", relativeTo: backendOrigin) else {
            callWeb(function: "marketelInspectExportResult", argument: "invalid")
            return
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        URLSession.shared.downloadTask(with: request) { [weak self] temporary, response, error in
            guard let self else { return }
            guard error == nil,
                  let temporary,
                  let http = response as? HTTPURLResponse,
                  http.statusCode == 200,
                  http.mimeType == "application/pdf" else {
                DispatchQueue.main.async {
                    self.callWeb(function: "marketelInspectExportResult", argument: "failed")
                }
                return
            }
            let values = try? temporary.resourceValues(forKeys: [.fileSizeKey])
            guard let fileSize = values?.fileSize,
                  fileSize > 0,
                  fileSize <= 100 * 1024 * 1024 else {
                DispatchQueue.main.async {
                    self.callWeb(function: "marketelInspectExportResult", argument: "failed")
                }
                return
            }
            let destination = FileManager.default.temporaryDirectory
                .appendingPathComponent("Marketel-Inspection-\(UUID().uuidString).pdf")
            do {
                try FileManager.default.moveItem(at: temporary, to: destination)
            } catch {
                DispatchQueue.main.async {
                    self.callWeb(function: "marketelInspectExportResult", argument: "failed")
                }
                return
            }
            DispatchQueue.main.async {
                guard self.presentedViewController == nil else {
                    try? FileManager.default.removeItem(at: destination)
                    self.callWeb(function: "marketelInspectExportResult", argument: "busy")
                    return
                }
                let share = UIActivityViewController(activityItems: [destination], applicationActivities: nil)
                if let popover = share.popoverPresentationController {
                    popover.sourceView = self.view
                    popover.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.midY, width: 1, height: 1)
                }
                share.completionWithItemsHandler = { [weak self] _, _, _, _ in
                    try? FileManager.default.removeItem(at: destination)
                    self?.callWeb(function: "marketelInspectExportResult", argument: "complete")
                }
                self.present(share, animated: true)
            }
        }.resume()
    }

    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        sendWebAction("browserClosed")
    }

    private func requireNativeMessagingSession() -> Bool {
        guard !nativeAuthToken.isEmpty, !activeHotelId.isEmpty else {
            let alert = UIAlertController(
                title: "Front Desk is reconnecting",
                message: "Wait a moment for this property to finish loading, then try again.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            return false
        }
        return true
    }

    private func presentNativeGuestMessages() {
        guard requireNativeMessagingSession(), presentedViewController == nil else { return }
        let messages = MarketelNativeGuestMessagesView(
            origin: backendOrigin,
            hotelId: activeHotelId,
            authToken: nativeAuthToken
        ) { [weak self] in
            self?.sendWebAction("refresh")
        }
        let controller = UIHostingController(rootView: messages)
        controller.view.backgroundColor = UIColor(
            red: 244 / 255,
            green: 247 / 255,
            blue: 245 / 255,
            alpha: 1
        )
        controller.modalPresentationStyle = .fullScreen
        present(controller, animated: true)
    }

    private func presentNativeSupportMessages() {
        guard requireNativeMessagingSession(), presentedViewController == nil else { return }
        let messages = MarketelNativeSupportView(
            origin: backendOrigin,
            hotelId: activeHotelId,
            authToken: nativeAuthToken
        ) { [weak self] in
            self?.sendWebAction("refresh")
        }
        let controller = UIHostingController(rootView: messages)
        controller.view.backgroundColor = UIColor(
            red: 244 / 255,
            green: 247 / 255,
            blue: 245 / 255,
            alpha: 1
        )
        controller.modalPresentationStyle = .fullScreen
        present(controller, animated: true)
    }

    private func presentNativeAssistant() {
        guard requireNativeMessagingSession(), presentedViewController == nil else { return }
        let assistant = MarketelNativeAssistantView(
            origin: backendOrigin,
            hotelId: activeHotelId,
            authToken: nativeAuthToken,
            onClose: { [weak self] in
                self?.sendWebAction("refresh")
            },
            onSaveContact: { [weak self] phone in
                self?.presentMarketelContact(phone: phone)
            }
        )
        let controller = UIHostingController(rootView: assistant)
        controller.view.backgroundColor = UIColor(
            red: 244 / 255,
            green: 247 / 255,
            blue: 245 / 255,
            alpha: 1
        )
        controller.modalPresentationStyle = .pageSheet
        if let sheet = controller.sheetPresentationController {
            // Open as the compact surface suggested by the Front Desk pill.
            // The owner can pull the same surface to full height without
            // leaving Assistant or losing their place.
            sheet.detents = [.medium(), .large()]
            sheet.selectedDetentIdentifier = .medium
            sheet.prefersGrabberVisible = true
            sheet.prefersScrollingExpandsWhenScrolledToEdge = true
            sheet.preferredCornerRadius = 28
        }
        present(controller, animated: true)
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "marketelShell",
              let payload = message.body as? [String: Any],
              let type = payload["type"] as? String else {
            return
        }

        switch type {
        case "visibility":
            let visible = payload["visible"] as? Bool ?? false
            shellSuppressedByModal = !visible
            setShellVisible(visible, animated: shellVisible)
        case "state":
            setShellProduct(.frontDesk)
            updatePropertyName(payload["hotelName"] as? String ?? "Front Desk")
            updateSelectedTab(payload["selectedTab"] as? String ?? "settings")
            updateBookingBadge(payload["bookingBadge"] as? Int ?? 0)
            updateGuestAppBadge(payload["guestAppBadge"] as? Int ?? 0)
            let trialDaysLeft = (payload["trialDaysLeft"] as? NSNumber)?.intValue ?? 0
            updateTrialStatus(
                trialing: payload["trialing"] as? Bool ?? false,
                daysLeft: trialDaysLeft
            )
            updateAssistantPill(
                visible: payload["assistantPill"] as? Bool ?? false,
                label: payload["assistantPillLabel"] as? String ?? ""
            )
            let requestedVisible = payload["visible"] as? Bool ?? true
            setShellVisible(requestedVisible && !shellSuppressedByModal, animated: shellVisible)
        case "inspectState":
            showInspectProduct(payload["product"] as? String ?? "")
            shellSuppressedByModal = !(payload["visible"] as? Bool ?? true)
            inspectAuthenticated = payload["authenticated"] as? Bool ?? false
            updateInspectSelectedTab(
                payload["selectedTab"] as? String ?? "current",
                hasDraft: payload["hasUnfinishedDraft"] as? Bool ?? false
            )
            if authDrawerOpen && (inspectAuthenticated || shellSuppressedByModal) {
                setAuthDrawerOpen(false)
            }
            // Signed out, the glass bar still floats over the page with Sign in
            // in it; Reports and Properties wait until there is an account.
            setShellVisible(!shellSuppressedByModal, animated: shellVisible)
        case "chooserState":
            if authDrawerOpen { setAuthDrawerOpen(false) }
            UIView.transition(
                with: propertyHeaderControl,
                duration: 0.25,
                options: [.transitionCrossDissolve, .allowUserInteraction]
            ) {
                self.setShellProduct(.chooser)
            }
            shellSuppressedByModal = false
            setShellVisible(true, animated: shellVisible)
        case "shellProduct":
            // Sent by the chooser just before it navigates, so the bar has
            // already renamed itself when the tool page arrives beneath it.
            showInspectProduct(payload["product"] as? String ?? "")
            setShellVisible(!shellSuppressedByModal, animated: shellVisible)
        case "inspectAuth":
            openAuthDrawer(
                title: payload["title"] as? String ?? "",
                message: payload["message"] as? String ?? ""
            )
        case "inspectAuthResult":
            handleInspectAuthResult(payload)
        case "saveContact":
            presentMarketelContact(phone: payload["phone"] as? String ?? "")
        case "openBrowser":
            presentInAppBrowser(payload["url"] as? String ?? "")
        case "inspectStorefront":
            sendInspectStorefront()
        case "inspectExportPDF":
            exportInspectPDF(
                reportId: payload["reportId"] as? String ?? "",
                token: payload["token"] as? String ?? ""
            )
        case "inspectDictate":
            presentInspectDictation()
        case "inspectDictateStop":
            dictation.stop()
        case "inspectCamera":
            presentInspectCamera(room: payload["room"] as? Int ?? 0)
        case "inspectHaptic":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "inspectSignOut":
            // Inspect owns a separate bearer session in web storage. Do not
            // clear Front Desk credentials when only Inspect signs out.
            break
        case "openGuestMessages":
            presentNativeGuestMessages()
        case "openSupport":
            presentNativeSupportMessages()
        case "openAssistant":
            presentNativeAssistant()
        case "tourMode":
            nativeTourActive = payload["active"] as? Bool ?? false
            setShellVisible(shellVisible, animated: false)
        case "requestNotifications":
            requestNativeNotifications()
        case "authenticated":
            let hotelId = String(describing: payload["hotelId"] ?? "")
            let authToken = String(describing: payload["authToken"] ?? "")
            guard payload["subscribed"] as? Bool == true,
                  !hotelId.isEmpty,
                  !authToken.isEmpty else {
                return
            }
            activeHotelId = hotelId
            nativeAuthToken = authToken
            nativeSession.configure(
                hotelId: hotelId,
                hotelName: payload["hotelName"] as? String ?? "Front Desk",
                domain: payload["domain"] as? String ?? "",
                authToken: authToken,
                appIconURL: payload["appIconUrl"] as? String ?? "",
                walletImageURL: payload["guestelWalletImageUrl"] as? String ?? "",
                walletSubtitle: payload["guestelWalletSubtitle"] as? String ?? "",
                isManualPMS: payload["isManualPms"] as? Bool ?? true
            )
            // Notification actions and Live Activity intents run outside the
            // webview. Mirror the session here as well as through the
            // ActivityKit plugin so Confirm/Release never depends on which
            // bridge finished first during launch.
            MarketelSharedCredentials.save(
                token: authToken,
                hotelId: hotelId,
                backendOrigin: backendOrigin.absoluteString
            )
            if payload["deferNotifications"] as? Bool != true {
                requestNativeNotifications()
            }
            if !apnsDeviceToken.isEmpty {
                postNativeDeviceRegistration()
            }
        case "signedOut":
            postNativeDeviceRegistration(unregister: true)
            nativeAuthToken = ""
            activeHotelId = ""
            nativeSession.clear()
            MarketelSharedCredentials.clear()
        case "notificationSettings":
            guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else { return }
            UIApplication.shared.open(settingsURL)
        default:
            break
        }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let confirm = UNNotificationAction(
            identifier: "MARKETEL_CONFIRM_BOOKING",
            title: "Confirm",
            options: []
        )
        let release = UNNotificationAction(
            identifier: "MARKETEL_RELEASE_BOOKING",
            title: "Release",
            options: [.destructive]
        )
        let review = UNNotificationAction(
            identifier: "MARKETEL_REVIEW_BOOKING",
            title: "Review room",
            options: [.foreground]
        )
        UNUserNotificationCenter.current().setNotificationCategories([
            UNNotificationCategory(
                identifier: "MARKETEL_BOOKING_APPROVAL",
                actions: [confirm, release],
                intentIdentifiers: [],
                options: []
            ),
            UNNotificationCategory(
                identifier: "MARKETEL_BOOKING_REVIEW",
                actions: [review],
                intentIdentifiers: [],
                options: []
            ),
            UNNotificationCategory(
                identifier: "MARKETEL_GENERAL",
                actions: [],
                intentIdentifiers: [],
                options: []
            ),
        ])
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(
            name: .marketelDidRegisterForRemoteNotifications,
            object: token
        )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationCenter.default.post(
            name: .marketelDidFailToRegisterForRemoteNotifications,
            object: error.localizedDescription
        )
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        NotificationCenter.default.post(name: .marketelRefreshFrontDesk, object: nil)
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .list, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let path = userInfo["url"] as? String ?? "/frontdesk?tab=bookings"
        let data = userInfo["data"] as? [AnyHashable: Any]
        let hotelId = stringValue(userInfo["hotelId"])
            ?? stringValue(data?["hotelId"])
            ?? ""
        let bookingId = stringValue(data?["bookingId"])
            ?? stringValue(userInfo["bookingId"])
            ?? ""
        // APNs normally preserves our nested `data.token`, but notification
        // dictionaries are bridged through Objective-C and older builds have
        // surfaced it at the top level. The URL is the final signed fallback.
        let token = stringValue(data?["token"])
            ?? stringValue(userInfo["token"])
            ?? approvalToken(from: path)
            ?? ""

        let action: String?
        switch response.actionIdentifier {
        case "MARKETEL_CONFIRM_BOOKING", "confirm":
            action = "confirm"
        case "MARKETEL_RELEASE_BOOKING", "release":
            action = "release"
        default:
            action = nil
        }

        guard let action else {
            let destination = ["path": path, "hotelId": hotelId]
            marketelPendingNotificationDestination = destination
            NotificationCenter.default.post(name: .marketelOpenNotificationPath, object: destination)
            completionHandler()
            return
        }

        guard let request = bookingDecisionRequest(
            action: action,
            token: token,
            bookingId: bookingId,
            notificationHotelId: hotelId
        ) else {
            // Do not pretend the tap succeeded. Open the signed review surface
            // when possible so the owner can still complete the decision.
            openBookingDecisionFallback(path: path, hotelId: hotelId)
            completionHandler()
            return
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json: [String: Any]? = data.flatMap { raw in
                (try? JSONSerialization.jsonObject(with: raw)) as? [String: Any]
            }
            let succeeded = error == nil
                && (200..<300).contains(status)
                && (json?["success"] as? Bool) == true
            DispatchQueue.main.async {
                if succeeded {
                    self?.endLiveActivity(bookingId: bookingId)
                    let destination = [
                        "path": "/frontdesk?tab=bookings",
                        "hotelId": hotelId,
                    ]
                    marketelPendingNotificationDestination = destination
                    NotificationCenter.default.post(name: .marketelRefreshFrontDesk, object: nil)
                    NotificationCenter.default.post(name: .marketelOpenNotificationPath, object: destination)
                } else {
                    self?.openBookingDecisionFallback(path: path, hotelId: hotelId)
                }
                completionHandler()
            }
        }.resume()
    }

    private func stringValue(_ value: Any?) -> String? {
        guard let value else { return nil }
        let string = String(describing: value).trimmingCharacters(in: .whitespacesAndNewlines)
        return string.isEmpty ? nil : string
    }

    private func approvalToken(from path: String) -> String? {
        guard let components = URLComponents(string: path) else { return nil }
        return components.queryItems?.first(where: { $0.name == "approve" })?.value
    }

    private func bookingDecisionRequest(
        action: String,
        token: String,
        bookingId: String,
        notificationHotelId: String
    ) -> URLRequest? {
        let fallbackOrigin = "https://guest-lodge-backend.onrender.com"
        let storedOrigin = MarketelSharedCredentials.defaults?.string(forKey: "backendOrigin")
        let origin = URL(string: storedOrigin ?? "").flatMap { $0.scheme == "https" ? $0 : nil }
            ?? URL(string: fallbackOrigin)!

        if !token.isEmpty {
            let url = origin
                .appendingPathComponent("api")
                .appendingPathComponent("booking-approval")
                .appendingPathComponent("act")
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.timeoutInterval = 12
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: [
                "token": token,
                "action": action,
            ])
            return request
        }

        // A signed notification token should always be present, but the
        // authenticated route makes the buttons self-healing if an APNs bridge
        // strips nested custom data. It is scoped to the signed-in property.
        guard
            !bookingId.isEmpty,
            let defaults = MarketelSharedCredentials.defaults,
            let crmToken = defaults.string(forKey: "crmToken"), !crmToken.isEmpty,
            let storedHotelId = defaults.string(forKey: "hotelId"), !storedHotelId.isEmpty,
            notificationHotelId.isEmpty || notificationHotelId == storedHotelId
        else { return nil }

        let url = origin
            .appendingPathComponent("api")
            .appendingPathComponent("crm")
            .appendingPathComponent("bookings")
            .appendingPathComponent(bookingId)
            .appendingPathComponent("approval")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(crmToken, forHTTPHeaderField: "x-crm-token")
        request.setValue("ios", forHTTPHeaderField: "x-marketel-client")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "action": action,
            "hotelId": storedHotelId,
        ])
        return request
    }

    private func openBookingDecisionFallback(path: String, hotelId: String) {
        let destination = [
            "path": path.contains("approve=") ? path : "/frontdesk?tab=bookings",
            "hotelId": hotelId,
        ]
        marketelPendingNotificationDestination = destination
        NotificationCenter.default.post(name: .marketelOpenNotificationPath, object: destination)
    }

    private func endLiveActivity(bookingId: String) {
        guard !bookingId.isEmpty else { return }
#if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<BookingDecisionAttributes>.activities
                where activity.attributes.bookingId == bookingId {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
#endif
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0)
        } else {
            application.applicationIconBadgeNumber = 0
        }
        NotificationCenter.default.post(name: .marketelRefreshFrontDesk, object: nil)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // An Inspect handoff is claimed here rather than being forwarded to the
        // web layer as a URL, so the single-use token never lands in page history.
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL,
           url.path == "/inspect/open",
           let token = URLComponents(url: url, resolvingAgainstBaseURL: false)?
               .queryItems?.first(where: { $0.name == "handoff" })?.value,
           !token.isEmpty {
            marketelPendingInspectHandoffToken = token
            NotificationCenter.default.post(name: .marketelOpenInspectHandoff, object: token)
            return true
        }
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
