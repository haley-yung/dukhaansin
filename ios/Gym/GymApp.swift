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
                .preferredColorScheme(.light)
                .tint(Tokens.cta)
                .task { await store.fetchAll() }
        }
    }

    private static func configureAppearance() {
        let bg      = uiColor(Tokens.bg)        // cream paper
        let surface = UIColor.white              // tab/nav backgrounds
        let heading = uiColor(Tokens.heading)
        let muted   = uiColor(Tokens.muted)
        let cta     = uiColor(Tokens.cta)        // active tab tint

        // Tab bar — white surface with soft hairline, cream-ink labels, blue active.
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = surface
        tab.shadowColor = uiColor(Tokens.line)
        for app in [tab.stackedLayoutAppearance, tab.inlineLayoutAppearance, tab.compactInlineLayoutAppearance] {
            let labelFont = barlow(.semibold, size: 10)
            app.normal.iconColor = muted
            app.normal.titleTextAttributes = [
                .foregroundColor: muted,
                .font: labelFont,
                .kern: 1.0
            ]
            app.selected.iconColor = cta
            app.selected.titleTextAttributes = [
                .foregroundColor: cta,
                .font: barlow(.bold, size: 10),
                .kern: 1.0
            ]
        }
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab

        // Nav bar — cream background, dark ink title.
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = bg
        nav.shadowColor = .clear
        nav.titleTextAttributes = [
            .foregroundColor: heading,
            .font: barlow(.bold, size: 17)
        ]
        nav.largeTitleTextAttributes = [
            .foregroundColor: heading,
            .font: barlow(.bold, size: 38),
            .kern: -1.0
        ]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
    }

    private static func uiColor(_ color: Color) -> UIColor {
        UIColor(color)
    }

    private static func barlow(_ weight: BarlowWeight, size: CGFloat) -> UIFont {
        UIFont(name: weight.rawValue, size: size) ?? .systemFont(ofSize: size, weight: weight.systemWeight)
    }

    private enum BarlowWeight: String {
        case regular   = "BarlowCondensed-Regular"
        case semibold  = "BarlowCondensed-SemiBold"
        case bold      = "BarlowCondensed-Bold"
        case extraBold = "BarlowCondensed-ExtraBold"

        var systemWeight: UIFont.Weight {
            switch self {
            case .regular: .regular
            case .semibold: .semibold
            case .bold: .bold
            case .extraBold: .heavy
            }
        }
    }
}

private func uiColor(_ color: Color) -> UIColor { UIColor(color) }
