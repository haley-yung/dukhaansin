import SwiftUI

struct HistoryView: View {
    @Environment(GymStore.self) private var store
    @State private var pendingDelete: Workout?

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                if store.workouts.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            ForEach(Stats.groupByMonth(store.workouts), id: \.label) { group in
                                section(label: group.label, workouts: group.workouts)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 40)
                    }
                    .refreshable { await store.fetchAll() }
                }
            }
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Tokens.bg, for: .navigationBar)
        }
        .alert("Delete workout?", isPresented: Binding(
            get: { pendingDelete != nil },
            set: { if !$0 { pendingDelete = nil } }
        )) {
            Button("Delete", role: .destructive) {
                if let w = pendingDelete {
                    Task { await store.deleteWorkout(w) }
                }
                pendingDelete = nil
            }
            Button("Cancel", role: .cancel) { pendingDelete = nil }
        } message: {
            Text("This can't be undone.")
        }
    }

    private func section(label: String, workouts: [Workout]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label)
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            ForEach(workouts) { workout in
                WorkoutCard(workout: workout)
                    .contextMenu {
                        Button("Delete", role: .destructive) {
                            pendingDelete = workout
                        }
                    }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Text("No history yet")
                .font(Type.display(28, weight: .light))
                .foregroundStyle(Tokens.heading)
            Text("Log a session from the Today tab.")
                .font(Type.body(14))
                .foregroundStyle(Tokens.muted)
        }
    }
}
