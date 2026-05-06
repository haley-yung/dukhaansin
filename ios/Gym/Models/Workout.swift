import Foundation

struct Workout: Codable, Identifiable, Hashable {
    let id: UUID
    var date: String
    var trainingType: TrainingType
    var notes: String?
    var exercises: [LoggedExercise]
}

struct LoggedExercise: Codable, Hashable {
    var exerciseId: UUID?
    var name: String
    var sets: [LoggedSet]
}

/// `reps` is stored as free text in the JSONB column ("10-12", "15 min easy")
/// but historic data sometimes encoded it as an int. The decoder accepts both
/// shapes; `repsInt` is the convenience integer used for PR display.
struct LoggedSet: Codable, Hashable {
    var weight: Double?
    var reps: String?
    var distance: Double?
    var duration: Double?

    enum CodingKeys: String, CodingKey {
        case weight, reps, distance, duration
    }

    init(weight: Double?, reps: String?, distance: Double?, duration: Double?) {
        self.weight = weight
        self.reps = reps
        self.distance = distance
        self.duration = duration
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        weight   = try? c.decodeIfPresent(Double.self, forKey: .weight)
        distance = try? c.decodeIfPresent(Double.self, forKey: .distance)
        duration = try? c.decodeIfPresent(Double.self, forKey: .duration)
        if let s = try? c.decodeIfPresent(String.self, forKey: .reps) {
            reps = s
        } else if let i = try? c.decodeIfPresent(Int.self, forKey: .reps) {
            reps = String(i)
        } else {
            reps = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(weight, forKey: .weight)
        try c.encodeIfPresent(reps, forKey: .reps)
        try c.encodeIfPresent(distance, forKey: .distance)
        try c.encodeIfPresent(duration, forKey: .duration)
    }

    var repsInt: Int? { Stats.parseReps(reps) }
}
