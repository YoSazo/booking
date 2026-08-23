import SwiftUI
import UIKit

// AsyncImage owns an opaque loader, so downloading a URL elsewhere does not
// guarantee that its first render can reuse the bytes. Guestel uses one explicit
// memory + disk cache for Wallet covers and room photos; preloading and rendering
// therefore share the exact same image pipeline.
enum ImagePrefetch {
    private static let memory = NSCache<NSURL, UIImage>()
    private static let urlCache = URLCache(
        memoryCapacity: 64 * 1_024 * 1_024,
        diskCapacity: 256 * 1_024 * 1_024,
        diskPath: "guestel-property-images"
    )
    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.requestCachePolicy = .returnCacheDataElseLoad
        configuration.urlCache = urlCache
        return URLSession(configuration: configuration)
    }()

    static func image(for url: URL) async -> UIImage? {
        if let image = memory.object(forKey: url as NSURL) { return image }

        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        if let cached = urlCache.cachedResponse(for: request),
           let image = UIImage(data: cached.data) {
            memory.setObject(image, forKey: url as NSURL)
            return image
        }

        guard let (data, response) = try? await session.data(for: request),
              let image = UIImage(data: data) else { return nil }
        urlCache.storeCachedResponse(CachedURLResponse(response: response, data: data), for: request)
        memory.setObject(image, forKey: url as NSURL)
        return image
    }

    static func warm(data: BookingAPI.HotelPublic) {
        var urls = data.rooms.flatMap(\.images)
        if let wallet = data.walletImage { urls.append(wallet) }
        let uniqueURLs = Array(Set(urls))
        guard !uniqueURLs.isEmpty else { return }

        Task(priority: .utility) {
            await withTaskGroup(of: Void.self) { group in
                for url in uniqueURLs {
                    group.addTask { _ = await image(for: url) }
                }
            }
        }
    }
}

struct CachedRemoteImage<Content: View, Placeholder: View>: View {
    let url: URL?
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder
    @State private var loadedImage: UIImage?

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let loadedImage {
                content(Image(uiImage: loadedImage))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            guard let url else {
                loadedImage = nil
                return
            }
            loadedImage = await ImagePrefetch.image(for: url)
        }
    }
}
