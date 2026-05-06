import Foundation

struct PersonalRecord: Codable, Identifiable, Hashable {
    let id: UUID
    var exerciseName: String
    var weight: Double
    var reps: Int
    var date: String
    var workoutId: UUID?
}
