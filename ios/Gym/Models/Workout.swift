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

struct LoggedSet: Codable, Hashable {
    var weight: Double?
    var reps: Int?
    var distance: Double?
    var duration: Double?
}
