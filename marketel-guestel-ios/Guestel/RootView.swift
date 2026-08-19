import SwiftUI

// Two tabs only. On iOS 26 the tab bar renders as Liquid Glass automatically.
struct RootView: View {
    var body: some View {
        TabView {
            HotelsView()
                .tabItem { Label("Hotels", systemImage: "door.left.hand.open") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}
