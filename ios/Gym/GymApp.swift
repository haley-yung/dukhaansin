import SwiftUI

@main
struct GymApp: App {
    @State private var store = GymStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(.dark)
                .tint(Tokens.heading)
                .task { await store.fetchAll() }
        }
    }
}
