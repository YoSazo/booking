import SwiftUI
import WebKit

// The hotel's direct booking engine, in the clip. No store dependency — the clip
// stays lean; the confirmed stay follows the guest once they get the full app.
struct ClipWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
