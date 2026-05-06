import Foundation

enum Stats {
    static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    static func date(from iso: String) -> Date? {
        isoFormatter.date(from: iso)
    }

    static func iso(_ date: Date = Date()) -> String {
        isoFormatter.string(from: date)
    }

    /// Workouts logged in the last `days` days.
    static func workoutsInLastDays(_ workouts: [Workout], days: Int) -> Int {
        guard let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) else { return 0 }
        return workouts.filter { (date(from: $0.date) ?? .distantPast) >= cutoff }.count
    }

    /// Consecutive day streak counting today (or last logged day).
    static func currentStreak(_ workouts: [Workout]) -> Int {
        let dates: Set<String> = Set(workouts.map(\.date))
        if dates.isEmpty { return 0 }
        var cursor = Date()
        var streak = 0
        let cal = Calendar.current
        if !dates.contains(iso(cursor)) {
            guard let yesterday = cal.date(byAdding: .day, value: -1, to: cursor) else { return 0 }
            cursor = yesterday
            if !dates.contains(iso(cursor)) { return 0 }
        }
        while dates.contains(iso(cursor)) {
            streak += 1
            guard let prev = cal.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = prev
        }
        return streak
    }

    static func todaysWorkout(_ workouts: [Workout]) -> Workout? {
        let today = iso()
        return workouts.first(where: { $0.date == today })
    }

    static func recentPRs(_ records: [PersonalRecord], limit: Int = 5) -> [PersonalRecord] {
        Array(records.sorted { $0.date > $1.date }.prefix(limit))
    }

    static func workoutsByDate(_ workouts: [Workout]) -> [String: Workout] {
        Dictionary(workouts.map { ($0.date, $0) }, uniquingKeysWith: { a, _ in a })
    }

    /// Most recent prior weight for an exercise, by id then by name fallback.
    static func previousWeight(for exercise: Exercise, in workouts: [Workout]) -> Double? {
        for workout in workouts.sorted(by: { $0.date > $1.date }) {
            for logged in workout.exercises {
                let matchesId = logged.exerciseId == exercise.id
                let matchesName = logged.name == exercise.name
                if matchesId || matchesName {
                    let weights = logged.sets.compactMap(\.weight).filter { $0 > 0 }
                    if let max = weights.max() { return max }
                }
            }
        }
        return nil
    }

    /// Parse a free-text reps field like "10-12" or "15 min easy" into an int (or nil).
    static func parseReps(_ raw: String?) -> Int? {
        guard let raw, !raw.isEmpty else { return nil }
        // Take leading digits.
        var digits = ""
        for ch in raw {
            if ch.isNumber { digits.append(ch) } else if !digits.isEmpty { break }
        }
        return Int(digits)
    }

    /// Group workouts by Month YYYY label, newest month first.
    static func groupByMonth(_ workouts: [Workout]) -> [(label: String, workouts: [Workout])] {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        var seen: [String] = []
        var groups: [String: [Workout]] = [:]
        for workout in workouts.sorted(by: { $0.date > $1.date }) {
            guard let date = date(from: workout.date) else { continue }
            let label = f.string(from: date)
            if groups[label] == nil { seen.append(label) }
            groups[label, default: []].append(workout)
        }
        return seen.map { ($0, groups[$0] ?? []) }
    }
}
