import SwiftUI
import UIKit

@main
struct GymApp: App {
    @State private var store = GymStore()

    init() { Self.configureAppearance() }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(.dark)
                .tint(Tokens.heading)
                .task { await store.fetchAll() }
        }
    }

    private static func configureAppearance() {
        let bg = UIColor(red: 0x0A/255, green: 0x0A/255, blue: 0x0B/255, alpha: 1)
        let muted = UIColor(red: 0x6F/255, green: 0x6F/255, blue: 0x76/255, alpha: 1)
        let heading = UIColor(red: 0xFA/255, green: 0xFA/255, blue: 0xF7/255, alpha: 1)

        // Tab bar
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = bg
        tab.shadowColor = UIColor.white.withAlphaComponent(0.06)
        for app in [tab.stackedLayoutAppearance, tab.inlineLayoutAppearance, tab.compactInlineLayoutAppearance] {
            app.normal.iconColor = muted
            app.normal.titleTextAttributes = [.foregroundColor: muted, .font: UIFont.systemFont(ofSize: 10, weight: .medium)]
            app.selected.iconColor = heading
            app.selected.titleTextAttributes = [.foregroundColor: heading, .font: UIFont.systemFont(ofSize: 10, weight: .semibold)]
        }
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab

        // Nav bar
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = bg
        nav.shadowColor = .clear
        nav.titleTextAttributes = [.foregroundColor: heading]
        nav.largeTitleTextAttributes = [
            .foregroundColor: heading,
            .font: UIFont.systemFont(ofSize: 34, weight: .light)
        ]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
    }
}
