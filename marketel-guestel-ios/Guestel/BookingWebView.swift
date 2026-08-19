import SwiftUI
import WebKit

// The hotel's real direct booking engine, in-app. Loads BookingPage → GuestInfo →
// Confirmation. A small injected script watches the engine's own localStorage and
// hands any completed stay back to native, so an upcoming paid booking shows up in
// the wallet without needing an account yet.
struct BookingWebView: UIViewRepresentable {
    let url: URL
    let store: GuestStore

    func makeCoordinator() -> Coordinator { Coordinator(store: store) }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "guestel")
        controller.addUserScript(
            WKUserScript(source: Self.reader, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )

        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.websiteDataStore = .default() // persist cookies/localStorage across sessions

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    // Polls the booking engine's stored stays and posts them to native when they change.
    private static let reader = """
    (function () {
      var last = '';
      function readStays() {
        try {
          var a = JSON.parse(localStorage.getItem('marketel_guest_stays') || '[]');
          if (!Array.isArray(a)) a = [];
          var legacy = JSON.parse(localStorage.getItem('marketel_guest_stay') || 'null');
          if (legacy && legacy.code && !a.some(function (s) { return s && s.code === legacy.code && s.hotelId === legacy.hotelId; })) {
            a.push(legacy);
          }
          return a;
        } catch (e) { return []; }
      }
      function tick() {
        var stays = readStays();
        if (!stays.length) return;
        var json = JSON.stringify(stays);
        if (json === last) return;
        last = json;
        try { window.webkit.messageHandlers.guestel.postMessage({ type: 'stays', stays: stays }); } catch (e) {}
      }
      setInterval(tick, 1500);
      tick();
    })();
    """

    final class Coordinator: NSObject, WKScriptMessageHandler {
        let store: GuestStore
        init(store: GuestStore) { self.store = store }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard
                message.name == "guestel",
                let body = message.body as? [String: Any],
                body["type"] as? String == "stays",
                let stays = body["stays"] as? [[String: Any]]
            else { return }
            store.ingest(stays)
        }
    }
}

// Full-screen booking flow with a Done button.
struct BookingSheet: View {
    let hotel: Hotel
    let store: GuestStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            BookingWebView(url: hotel.bookingURL, store: store)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(hotel.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}
