import SwiftUI

struct DashboardView: View {
    @Environment(GymStore.self) private var store
    @State private var loggerPresented = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        header
                        statsRow
                        todayCard
                        recentPRs
                        HeatmapView(workouts: store.workouts)
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
            // Phase 4 hooks the real WorkoutLoggerSheet here.
            ZStack {
                Tokens.bg.ignoresSafeArea()
                Text("Workout logger lands in phase 4")
                    .foregroundStyle(Tokens.muted)
            }
            .presentationDetents([.large])
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
                .font(Type.display(40, weight: .light))
                .kerning(-0.8)
                .foregroundStyle(Tokens.heading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var statsRow: some View {
        HStack(spacing: 8) {
            StatTile(
                label: "This Week",
                value: "\(Stats.workoutsInLastDays(store.workouts, days: 7))",
                hint: "sessions"
            )
            StatTile(
                label: "Streak",
                value: "\(Stats.currentStreak(store.workouts))",
                hint: "days"
            )
            StatTile(
                label: "PRs",
                value: "\(store.records.count)"
            )
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
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Tokens.line, lineWidth: 0.5)
            )
        } else {
            Button {
                loggerPresented = true
            } label: {
                HStack {
                    Text("Start session")
                        .font(Type.body(16, weight: .medium))
                    Spacer()
                    Image(systemName: "arrow.right")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity)
                .foregroundStyle(Tokens.bg)
                .background(Tokens.heading, in: RoundedRectangle(cornerRadius: 14))
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
}

#Preview {
    DashboardView()
        .environment({
            let s = GymStore()
            s.records = [
                PersonalRecord(id: UUID(), exerciseName: "Bench Press", weight: 80, reps: 5, date: "2026-04-30", workoutId: nil),
                PersonalRecord(id: UUID(), exerciseName: "Squat", weight: 105.5, reps: 3, date: "2026-04-28", workoutId: nil),
            ]
            return s
        }())
        .preferredColorScheme(.dark)
}
