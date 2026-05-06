import SwiftUI
import Charts

struct AnalyticsView: View {
    @Environment(GymStore.self) private var store

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        summary
                        trainingSplit
                        weeklyVolume
                        prShowcase
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable { await store.fetchAll() }
            }
            .navigationTitle("Analytics")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Tokens.bg, for: .navigationBar)
        }
    }

    // MARK: - Summary

    private var summary: some View {
        let total = store.workouts.count
        let streak = Stats.currentStreak(store.workouts)
        let monthCount = monthWorkoutCount
        let prCount = store.records.count

        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            StatTile(label: "Total", value: "\(total)", hint: "workouts")
            StatTile(label: "Streak", value: "\(streak)", hint: "days")
            StatTile(label: "This Month", value: "\(monthCount)", hint: "sessions")
            StatTile(label: "PRs", value: "\(prCount)")
        }
    }

    private var monthWorkoutCount: Int {
        let cal = Calendar.current
        let now = Date()
        return store.workouts.filter {
            guard let date = Stats.date(from: $0.date) else { return false }
            return cal.isDate(date, equalTo: now, toGranularity: .month)
        }.count
    }

    // MARK: - Training split

    private var trainingSplit: some View {
        let split = Dictionary(grouping: store.workouts, by: \.trainingType)
            .map { ($0.key, $0.value.count) }
            .sorted(by: { $0.1 > $1.1 })

        return VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Training split")
            if store.workouts.isEmpty {
                emptyHint("Log workouts to see your split.")
            } else {
                Chart {
                    ForEach(split, id: \.0) { type, count in
                        BarMark(
                            x: .value("Count", count),
                            y: .value("Type", type.label)
                        )
                        .foregroundStyle(type.color)
                        .annotation(position: .trailing) {
                            Text("\(count)")
                                .font(Type.mono(11))
                                .foregroundStyle(Tokens.muted)
                        }
                    }
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { _ in
                        AxisValueLabel().foregroundStyle(Tokens.secondary)
                    }
                }
                .frame(height: CGFloat(split.count) * 36 + 16)
                .padding(14)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
            }
        }
    }

    // MARK: - Weekly volume (8 weeks)

    private var weeklyVolume: some View {
        let buckets = weeklyBuckets()
        return VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Last 8 weeks")
            if buckets.allSatisfy({ $0.volume == 0 }) {
                emptyHint("No volume yet.")
            } else {
                Chart {
                    ForEach(buckets, id: \.weekStart) { bucket in
                        BarMark(
                            x: .value("Week", bucket.shortLabel),
                            y: .value("Volume", bucket.volume)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Tokens.DataViz.lowerA, Tokens.DataViz.pullRun],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .cornerRadius(2)
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { _ in
                        AxisValueLabel().foregroundStyle(Tokens.muted)
                        AxisGridLine().foregroundStyle(Tokens.line)
                    }
                }
                .chartXAxis {
                    AxisMarks { _ in
                        AxisValueLabel().foregroundStyle(Tokens.muted)
                    }
                }
                .frame(height: 180)
                .padding(14)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
            }
        }
    }

    private struct WeekBucket {
        let weekStart: Date
        let shortLabel: String
        let volume: Double
    }

    private func weeklyBuckets() -> [WeekBucket] {
        let cal = Calendar(identifier: .iso8601)
        var anchor = cal.startOfDay(for: Date())
        let weekday = cal.component(.weekday, from: anchor) - cal.firstWeekday
        anchor = cal.date(byAdding: .day, value: -weekday, to: anchor) ?? anchor
        let f = DateFormatter()
        f.dateFormat = "M/d"

        var buckets: [WeekBucket] = []
        for offset in stride(from: 7, through: 0, by: -1) {
            guard let start = cal.date(byAdding: .weekOfYear, value: -offset, to: anchor),
                  let end = cal.date(byAdding: .day, value: 7, to: start)
            else { continue }
            let volume = store.workouts.reduce(into: 0.0) { acc, workout in
                guard let date = Stats.date(from: workout.date), date >= start, date < end else { return }
                for ex in workout.exercises {
                    for set in ex.sets {
                        if let w = set.weight, let r = set.repsInt { acc += w * Double(r) }
                        else if let dist = set.distance { acc += dist * 100 }
                    }
                }
            }
            buckets.append(WeekBucket(weekStart: start, shortLabel: f.string(from: start), volume: volume))
        }
        return buckets
    }

    // MARK: - PRs

    private var prShowcase: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("Personal records")
            if store.records.isEmpty {
                emptyHint("Hit a new max to log a PR.")
            } else {
                ForEach(store.records.prefix(20)) { record in
                    PRRow(record: record, isNew: store.newPRIDs.contains(record.id))
                }
            }
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(Type.mono(10))
            .textCase(.uppercase)
            .kerning(1.4)
            .foregroundStyle(Tokens.muted)
            .padding(.bottom, 4)
    }

    private func emptyHint(_ text: String) -> some View {
        Text(text)
            .font(Type.body(13))
            .foregroundStyle(Tokens.muted)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
    }
}
