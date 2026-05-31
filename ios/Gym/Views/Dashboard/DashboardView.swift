import SwiftUI

struct DashboardView: View {
    @Environment(GymStore.self) private var store
    @State private var loggerPresented = false
    @State private var celebrationPRs: [PersonalRecord] = []

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        header
                        if let err = store.lastError {
                            errorBanner(err)
                        }
                        HeatmapView(workouts: store.workouts)
                        statsRow
                        todayCard
                        recentPRs
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 36)
                }
                .refreshable { await store.fetchAll() }
            }
            .toolbar(.hidden)
        }
        .sheet(isPresented: $loggerPresented) {
            WorkoutLoggerSheet { resp in
                if !resp.newPRs.isEmpty { celebrationPRs = resp.newPRs }
            }
            .environment(store)
        }
        .fullScreenCover(isPresented: Binding(
            get: { !celebrationPRs.isEmpty },
            set: { if !$0 { celebrationPRs = [] } }
        )) {
            PRCelebrationView(prs: celebrationPRs) {
                celebrationPRs = []
            }
            .presentationBackground(.clear)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(prettyToday)
                .font(Type.mono(11))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            Text("Today")
                .font(Type.display(52, weight: .bold))
                .textCase(.uppercase)
                .kerning(-1.2)
                .foregroundStyle(Tokens.heading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var statsRow: some View {
        HStack(spacing: 8) {
            StatTile(label: "This Week", value: "\(Stats.workoutsInLastDays(store.workouts, days: 7))", hint: "sessions")
            StatTile(label: "Streak", value: "\(Stats.currentStreak(store.workouts))", hint: "days")
            StatTile(label: "PRs", value: "\(store.records.count)")
        }
    }

    @ViewBuilder
    private var todayCard: some View {
        if let today = Stats.todaysWorkout(store.workouts) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Logged today")
                        .font(Type.mono(10))
                        .textCase(.uppercase)
                        .kerning(1.4)
                        .foregroundStyle(Tokens.muted)
                    Spacer()
                    Text(today.trainingType.label)
                        .font(Type.mono(11))
                        .foregroundStyle(today.trainingType.color)
                }
                Text("\(today.exercises.count) exercises")
                    .font(Type.body(15))
                    .foregroundStyle(Tokens.text)
                Button {
                    loggerPresented = true
                } label: {
                    HStack {
                        Text("Log another")
                            .font(Type.body(13))
                        Image(systemName: "arrow.right")
                    }
                    .foregroundStyle(Tokens.secondary)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 22))
            .shadow(color: Color.black.opacity(0.04), radius: 0, x: 0, y: 2)
        } else {
            Button {
                loggerPresented = true
            } label: {
                HStack {
                    Text("Start session")
                        .font(Type.display(20, weight: .bold))
                        .textCase(.uppercase)
                        .kerning(1.4)
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 15, weight: .semibold))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 18)
                .frame(maxWidth: .infinity)
                .foregroundStyle(Tokens.onCTA)
                .background(Tokens.cta, in: RoundedRectangle(cornerRadius: 24))
                .shadow(color: Tokens.cta.opacity(0.25), radius: 12, x: 0, y: 6)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var recentPRs: some View {
        let recents = Stats.recentPRs(store.records, limit: 5)
        if !recents.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                Text("Recent PRs")
                    .font(Type.mono(10))
                    .textCase(.uppercase)
                    .kerning(1.4)
                    .foregroundStyle(Tokens.muted)
                    .padding(.bottom, 6)
                ForEach(recents) { pr in
                    PRRow(record: pr, isNew: store.newPRIDs.contains(pr.id))
                }
            }
        }
    }

    private var prettyToday: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: Date())
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.DataViz.danger)
            VStack(alignment: .leading, spacing: 2) {
                Text("Sync issue")
                    .font(Type.mono(10))
                    .textCase(.uppercase)
                    .kerning(1.2)
                    .foregroundStyle(Tokens.DataViz.danger)
                Text(message)
                    .font(Type.body(12))
                    .foregroundStyle(Tokens.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Tokens.DataViz.danger.opacity(0.4), lineWidth: 0.5)
        )
    }
}
