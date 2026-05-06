import SwiftUI

struct RootView: View {
    @Environment(GymStore.self) private var store
    @State private var tab: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard, history, analytics, body, settings
    }

    var body: some View {
        TabView(selection: $tab) {
            DashboardView()
                .tabItem { Label("Today", systemImage: "flame") }
                .tag(Tab.dashboard)

            HistoryView()
                .tabItem { Label("History", systemImage: "list.bullet.rectangle") }
                .tag(Tab.history)

            AnalyticsView()
                .tabItem { Label("Analytics", systemImage: "chart.bar") }
                .tag(Tab.analytics)

            BodyView()
                .tabItem { Label("Body", systemImage: "figure") }
                .tag(Tab.body)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
        .background(Tokens.bg)
    }
}

#Preview {
    RootView()
        .environment(GymStore())
        .preferredColorScheme(.dark)
}
