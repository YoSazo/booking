import UIKit
import Capacitor
import WebKit

/// Native navigation chrome around the hosted Front Desk.
///
/// The web application remains the source of truth for page content. UIKit
/// owns top-level navigation so iOS 26 can render the real Liquid Glass tab
/// and navigation treatments, while older iOS versions receive the standard
/// system appearance automatically.
final class MarketelBridgeViewController: CAPBridgeViewController, UITabBarDelegate, WKScriptMessageHandler {
    private let topBar = UINavigationBar()
    private let tabBar = UITabBar()
    private let navigationItemState = UINavigationItem()
    private let propertyButton = UIButton(type: .system)
    private var bookingTabItem: UITabBarItem?
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

        topBar.frame = CGRect(
            x: 0,
            y: 0,
            width: bounds.width,
            height: safeInsets.top + 52
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

        view.bringSubviewToFront(topBar)
        view.bringSubviewToFront(tabBar)
    }

    private func configureTopBar() {
        topBar.isTranslucent = true
        topBar.prefersLargeTitles = false
        topBar.isUserInteractionEnabled = true

        var titleConfiguration = UIButton.Configuration.plain()
        titleConfiguration.title = "Front Desk"
        titleConfiguration.image = UIImage(systemName: "chevron.down")
        titleConfiguration.imagePlacement = .trailing
        titleConfiguration.imagePadding = 6
        titleConfiguration.baseForegroundColor = .label
        propertyButton.configuration = titleConfiguration
        propertyButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        propertyButton.titleLabel?.lineBreakMode = .byTruncatingTail
        propertyButton.accessibilityLabel = "Switch property"
        propertyButton.addTarget(self, action: #selector(openPropertyPicker), for: .touchUpInside)
        propertyButton.widthAnchor.constraint(lessThanOrEqualToConstant: 250).isActive = true
        navigationItemState.titleView = propertyButton

        let qrButton = UIBarButtonItem(
            image: UIImage(systemName: "qrcode.viewfinder"),
            style: .plain,
            target: self,
            action: #selector(showGuestQR)
        )
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
        let menuButton = UIBarButtonItem(
            image: UIImage(systemName: "ellipsis"),
            style: .plain,
            target: nil,
            action: nil
        )
        menuButton.menu = UIMenu(children: [refreshAction, tourAction, switchAction, signOutAction])
        menuButton.accessibilityLabel = "Front Desk menu"
        navigationItemState.rightBarButtonItems = [menuButton, qrButton]
        topBar.setItems([navigationItemState], animated: false)
        view.addSubview(topBar)
    }

    private func configureTabBar() {
        let yourPage = UITabBarItem(
            title: "Your Page",
            image: UIImage(systemName: "globe"),
            tag: 0
        )
        let bookings = UITabBarItem(
            title: "Bookings",
            image: UIImage(systemName: "tray"),
            tag: 1
        )
        let availability = UITabBarItem(
            title: "Availability",
            image: UIImage(systemName: "door.left.hand.open"),
            tag: 2
        )
        let guestApp = UITabBarItem(
            title: "Guest App",
            image: UIImage(systemName: "iphone"),
            tag: 3
        )

        bookingTabItem = bookings
        tabBar.delegate = self
        tabBar.items = [yourPage, bookings, availability, guestApp]
        tabBar.selectedItem = yourPage
        tabBar.isTranslucent = true
        tabBar.accessibilityIdentifier = "marketel.native.tabs"
        view.addSubview(tabBar)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let filter: String
        switch item.tag {
        case 1: filter = "bookings"
        case 2: filter = "availability"
        case 3: filter = "apps"
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
        var configuration = propertyButton.configuration ?? UIButton.Configuration.plain()
        configuration.title = name.isEmpty ? "Front Desk" : name
        propertyButton.configuration = configuration
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

    private func setShellVisible(_ visible: Bool, animated: Bool) {
        shellVisible = visible
        let changes = {
            self.topBar.alpha = visible ? 1 : 0
            self.tabBar.alpha = visible ? 1 : 0
        }
        topBar.isHidden = false
        tabBar.isHidden = false
        topBar.isUserInteractionEnabled = visible
        tabBar.isUserInteractionEnabled = visible
        if animated {
            UIView.animate(withDuration: 0.2, animations: changes) { _ in
                self.topBar.isHidden = !visible
                self.tabBar.isHidden = !visible
            }
        } else {
            changes()
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
