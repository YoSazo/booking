import SwiftUI
import WebKit

// The hotel's direct booking engine, in the clip. No store dependency — the clip
// stays lean; the confirmed stay follows the guest once they get the full app.
struct ClipWebView: UIViewRepresentable {
    let url: URL
    let onHandoff: (String) -> Void
    let onInstallRequested: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onHandoff: onHandoff, onInstallRequested: onInstallRequested)
    }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "guestelClip")
        controller.addUserScript(WKUserScript(source: Self.bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: Self.nativeBookingURL(url)))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    private static let bridge = """
    (function () {
      window.__GUESTEL_NATIVE__ = true;
      window.__GUESTEL_APP_CLIP__ = true;
      var sent = '';
      function tick() {
        try {
          var stays = JSON.parse(localStorage.getItem('marketel_guest_stays') || '[]');
          if (!Array.isArray(stays)) stays = [];
          var latest = stays.filter(function (stay) { return stay && stay.handoffToken; }).pop();
          if (!latest || latest.handoffToken === sent) return;
          sent = latest.handoffToken;
          window.webkit.messageHandlers.guestelClip.postMessage({ type: 'handoff', token: sent });
        } catch (e) {}
      }
      setInterval(tick, 800);
      document.addEventListener('visibilitychange', tick);
      tick();
    })();
    """

    private static func nativeBookingURL(_ url: URL) -> URL {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return url }
        var items = components.queryItems ?? []
        if !items.contains(where: { $0.name == "guestelNative" }) {
            items.append(URLQueryItem(name: "guestelNative", value: "1"))
        }
        components.queryItems = items
        return components.url ?? url
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        let onHandoff: (String) -> Void
        let onInstallRequested: () -> Void

        init(onHandoff: @escaping (String) -> Void, onInstallRequested: @escaping () -> Void) {
            self.onHandoff = onHandoff
            self.onInstallRequested = onInstallRequested
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "guestelClip", let body = message.body as? [String: Any] else { return }
            switch body["type"] as? String {
            case "handoff":
                if let token = body["token"] as? String, !token.isEmpty { onHandoff(token) }
            case "requestInstall":
                onInstallRequested()
            default:
                break
            }
        }
    }
}
