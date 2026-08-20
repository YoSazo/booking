import SwiftUI
import WebKit

// A minimal in-app browser sheet (no native<->web bridge). Used for messaging the
// front desk and opening help links inside Guestel.
struct SimpleWebSheet: View {
    let url: URL
    var title: String = ""

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            PlainWebView(url: url)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

struct PlainWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
