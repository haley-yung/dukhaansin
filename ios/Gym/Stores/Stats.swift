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
    /// Mirrors the web logic: walk back from today; a day "counts" if any
    /// workout exists for it. Stops at the first day with nothing.
    static func currentStreak(_ workouts: [Workout]) -> Int {
        let dates: Set<String> = Set(workouts.map(\.date))
        if dates.isEmpty { return 0 }
        var cursor = Date()
        var streak = 0
        let cal = Calendar.current
        // If today has no workout, start from yesterday so a long streak still counts.
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

    /// Latest workout for today, if any.
    static func todaysWorkout(_ workouts: [Workout]) -> Workout? {
        let today = iso()
        return workouts.first(where: { $0.date == today })
    }

    /// Top N PRs by date (newest first).
    static func recentPRs(_ records: [PersonalRecord], limit: Int = 5) -> [PersonalRecord] {
        Array(records.sorted { $0.date > $1.date }.prefix(limit))
    }

    /// Workouts indexed by ISO date for quick lookup.
    static func workoutsByDate(_ workouts: [Workout]) -> [String: Workout] {
        Dictionary(workouts.map { ($0.date, $0) }, uniquingKeysWith: { a, _ in a })
    }
}
