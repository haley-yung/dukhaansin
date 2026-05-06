import Foundation

struct Template: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var trainingType: TrainingType
    var exercises: [LoggedExercise]
}
