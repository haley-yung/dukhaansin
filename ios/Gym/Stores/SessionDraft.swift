import Foundation

/// Persisted snapshot of an in-progress workout session — survives app
/// suspension/termination so users can swap apps and resume without
/// losing weights/checks. Web app uses localStorage keyed by date; we
/// store one JSON blob in UserDefaults that's only restored if its date
/// matches today.
struct SessionDraft: Codable {
    var trainingType: TrainingType
    var sessionDateISO: String
    var notes: String
    var entries: [Entry]

    struct Entry: Codable {
        var exerciseId: UUID
        var weight: String
        var setChecks: [Bool]
    }
}

enum DraftStore {
    private static let key = "gym_session_draft_v1"

    static func load() -> SessionDraft? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(SessionDraft.self, from: data)
    }

    static func save(_ draft: SessionDraft) {
        guard let data = try? JSONEncoder().encode(draft) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }

    /// Convenience: load only if the saved draft is for today.
    static func loadForToday() -> SessionDraft? {
        guard let saved = load() else { return nil }
        let today = Stats.iso(Date())
        if saved.sessionDateISO == today { return saved }
        clear() // stale
        return nil
    }
}
