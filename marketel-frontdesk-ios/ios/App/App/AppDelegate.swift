import UIKit
import Capacitor
import WebKit

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

    override func draw(_ rect: CGRect) {
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
}

/// Native navigation chrome around the hosted Front Desk.
///
/// The web application remains the source of truth for page content. UIKit
/// owns top-level navigation so iOS 26 can render the real Liquid Glass tab
/// and navigation treatments, while older iOS versions receive the standard
/// system appearance automatically.
final class MarketelBridgeViewController: CAPBridgeViewController, UITabBarDelegate, WKScriptMessageHandler {
    private let statusBarBackdrop = UIView()
    private let topBar = UIVisualEffectView()
    private let tabBar = UITabBar()
    private let propertyHeaderControl = UIControl()
    private let propertyNameLabel = UILabel()
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
    private let revenueTabItem = UITabBarItem(
        title: "Revenue",
        image: UIImage(systemName: "chart.line.uptrend.xyaxis"),
        tag: 3
    )
    private let guestAppTabItem = UITabBarItem(
        title: "Guest App",
        image: UIImage(systemName: "iphone"),
        tag: 4
    )
    private var bookingTabItem: UITabBarItem?
    private var revenueEnabled = false
    private var shellVisible = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.configuration.userContentController.add(self, name: "marketelShell")
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.verticalScrollIndicatorInsets = .zero
        webView?.scrollView.alwaysBounceVertical = true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 238 / 255, green: 242 / 255, blue: 239 / 255, alpha: 1)
        view.tintColor = UIColor(red: 46 / 255, green: 125 / 255, blue: 91 / 255, alpha: 1)
        configureTopBar()
        configureTabBar()
        setShellVisible(false, animated: false)
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
        topBar.frame = CGRect(
            x: 8,
            y: safeInsets.top + 6,
            width: bounds.width - 16,
            height: 64
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

        view.bringSubviewToFront(statusBarBackdrop)
        view.bringSubviewToFront(topBar)
        view.bringSubviewToFront(tabBar)
    }

    private func configureTopBar() {
        let shellBackground = UIColor(
            red: 238 / 255,
            green: 242 / 255,
            blue: 239 / 255,
            alpha: 1
        )
        statusBarBackdrop.backgroundColor = shellBackground
        statusBarBackdrop.isUserInteractionEnabled = false
        view.addSubview(statusBarBackdrop)

        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: .regular)
            glass.tintColor = UIColor(
                red: 238 / 255,
                green: 242 / 255,
                blue: 239 / 255,
                alpha: 0.12
            )
            topBar.effect = glass
        } else {
            topBar.effect = UIBlurEffect(style: .systemThinMaterial)
            topBar.layer.cornerRadius = 22
            topBar.clipsToBounds = true
        }
        topBar.isUserInteractionEnabled = true

        let logo = MarketelMarkView()
        logo.translatesAutoresizingMaskIntoConstraints = false

        let frontDeskLabel = UILabel()
        frontDeskLabel.text = "Front Desk"
        frontDeskLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        frontDeskLabel.textColor = .label

        propertyNameLabel.text = "Your property"
        propertyNameLabel.font = .systemFont(ofSize: 11.5, weight: .medium)
        propertyNameLabel.textColor = .secondaryLabel
        propertyNameLabel.lineBreakMode = .byTruncatingTail
        propertyNameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let chevron = UIImageView(image: UIImage(systemName: "chevron.down"))
        chevron.translatesAutoresizingMaskIntoConstraints = false
        chevron.tintColor = .secondaryLabel
        chevron.contentMode = .scaleAspectFit

        let propertyRow = UIStackView(arrangedSubviews: [propertyNameLabel, chevron])
        propertyRow.axis = .horizontal
        propertyRow.alignment = .center
        propertyRow.spacing = 4

        let labels = UIStackView(arrangedSubviews: [frontDeskLabel, propertyRow])
        labels.axis = .vertical
        labels.alignment = .leading
        labels.spacing = 0
        labels.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let brandRow = UIStackView(arrangedSubviews: [logo, labels])
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
        propertyHeaderControl.accessibilityLabel = "Switch property"
        propertyHeaderControl.accessibilityTraits = .button

        NSLayoutConstraint.activate([
            logo.widthAnchor.constraint(equalToConstant: 23),
            logo.heightAnchor.constraint(equalToConstant: 25),
            chevron.widthAnchor.constraint(equalToConstant: 9),
            chevron.heightAnchor.constraint(equalToConstant: 9),
            brandRow.leadingAnchor.constraint(equalTo: propertyHeaderControl.leadingAnchor),
            brandRow.trailingAnchor.constraint(equalTo: propertyHeaderControl.trailingAnchor),
            brandRow.topAnchor.constraint(equalTo: propertyHeaderControl.topAnchor),
            brandRow.bottomAnchor.constraint(equalTo: propertyHeaderControl.bottomAnchor),
            propertyHeaderControl.heightAnchor.constraint(equalToConstant: 48)
        ])
        propertyHeaderControl.setContentHuggingPriority(.defaultLow, for: .horizontal)
        propertyHeaderControl.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let qrButton = UIButton(type: .system)
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
        let tourAction = UIAction(
            title: "How it works",
            image: UIImage(systemName: "questionmark.circle")
        ) { [weak self] _ in
            self?.sendWebAction("tour")
        }
        let switchAction = UIAction(
            title: "Switch property",
            image: UIImage(systemName: "building.2")
        ) { [weak self] _ in
            self?.sendWebAction("properties")
        }
        let signOutAction = UIAction(
            title: "Sign out",
            image: UIImage(systemName: "rectangle.portrait.and.arrow.right"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.sendWebAction("signout")
        }
        let menuButton = UIButton(type: .system)
        var menuConfiguration = UIButton.Configuration.plain()
        menuConfiguration.image = UIImage(systemName: "ellipsis")
        menuConfiguration.baseForegroundColor = .label
        menuConfiguration.contentInsets = .zero
        menuButton.configuration = menuConfiguration
        menuButton.menu = UIMenu(children: [refreshAction, tourAction, switchAction, signOutAction])
        menuButton.showsMenuAsPrimaryAction = true
        menuButton.accessibilityLabel = "Front Desk menu"

        let actions = UIStackView(arrangedSubviews: [qrButton, menuButton])
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
            menuButton.widthAnchor.constraint(equalToConstant: 40),
            menuButton.heightAnchor.constraint(equalToConstant: 44),
            headerRow.leadingAnchor.constraint(equalTo: topBar.contentView.leadingAnchor, constant: 14),
            headerRow.trailingAnchor.constraint(equalTo: topBar.contentView.trailingAnchor, constant: -8),
            headerRow.topAnchor.constraint(equalTo: topBar.contentView.topAnchor, constant: 6),
            headerRow.bottomAnchor.constraint(equalTo: topBar.contentView.bottomAnchor, constant: -6)
        ])

        view.addSubview(topBar)
    }

    private func configureTabBar() {
        let bookings = UITabBarItem(
            title: "Bookings",
            image: UIImage(systemName: "tray"),
            tag: 1
        )

        bookingTabItem = bookings
        tabBar.delegate = self
        updateVisibleTabs()
        tabBar.selectedItem = yourPageTabItem
        tabBar.isTranslucent = true
        tabBar.accessibilityIdentifier = "marketel.native.tabs"
        view.addSubview(tabBar)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let filter: String
        switch item.tag {
        case 1: filter = "bookings"
        case 2: filter = "availability"
        case 3: filter = "revenue"
        case 4: filter = "apps"
        default: filter = "settings"
        }
        callWeb(function: "marketelNativeSelectTab", argument: filter)
    }

    @objc private func openPropertyPicker() {
        sendWebAction("properties")
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

    private func updatePropertyName(_ name: String) {
        let propertyName = name.isEmpty ? "Your property" : name
        propertyNameLabel.text = propertyName
        propertyHeaderControl.accessibilityLabel = "Switch property, \(propertyName)"
    }

    private func updateSelectedTab(_ identifier: String) {
        let tag: Int
        switch identifier {
        case "bookings": tag = 1
        case "availability": tag = 2
        case "revenue": tag = 3
        case "apps": tag = 4
        default: tag = 0
        }
        tabBar.selectedItem = tabBar.items?.first(where: { $0.tag == tag })
    }

    private func updateVisibleTabs() {
        guard let bookings = bookingTabItem else {
            return
        }
        var items = [yourPageTabItem, bookings, availabilityTabItem]
        if revenueEnabled {
            items.append(revenueTabItem)
        }
        items.append(guestAppTabItem)
        tabBar.items = items
    }

    private func updateRevenueVisibility(_ enabled: Bool) {
        guard revenueEnabled != enabled else {
            return
        }
        let selectedTag = tabBar.selectedItem?.tag ?? 0
        revenueEnabled = enabled
        updateVisibleTabs()
        tabBar.selectedItem = tabBar.items?.first(where: { $0.tag == selectedTag })
            ?? yourPageTabItem
    }

    private func updateBookingBadge(_ count: Int) {
        if count <= 0 {
            bookingTabItem?.badgeValue = nil
        } else {
            bookingTabItem?.badgeValue = count > 99 ? "99+" : String(count)
        }
    }

    private func setShellVisible(_ visible: Bool, animated: Bool) {
        shellVisible = visible
        let changes = {
            self.statusBarBackdrop.alpha = visible ? 1 : 0
            self.topBar.alpha = visible ? 1 : 0
            self.tabBar.alpha = visible ? 1 : 0
        }
        statusBarBackdrop.isHidden = false
        topBar.isHidden = false
        tabBar.isHidden = false
        topBar.isUserInteractionEnabled = visible
        tabBar.isUserInteractionEnabled = visible
        if animated {
            UIView.animate(withDuration: 0.2, animations: changes) { _ in
                self.statusBarBackdrop.isHidden = !visible
                self.topBar.isHidden = !visible
                self.tabBar.isHidden = !visible
            }
        } else {
            changes()
            statusBarBackdrop.isHidden = !visible
            topBar.isHidden = !visible
            tabBar.isHidden = !visible
        }
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
            setShellVisible(payload["visible"] as? Bool ?? false, animated: shellVisible)
        case "state":
            updatePropertyName(payload["hotelName"] as? String ?? "Front Desk")
            updateRevenueVisibility(payload["revenueEnabled"] as? Bool ?? false)
            updateSelectedTab(payload["selectedTab"] as? String ?? "settings")
            updateBookingBadge(payload["bookingBadge"] as? Int ?? 0)
            setShellVisible(payload["visible"] as? Bool ?? true, animated: shellVisible)
        default:
            break
        }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
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
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
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
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
