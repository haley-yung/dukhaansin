import Foundation

struct Exercise: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var trainingType: TrainingType
    var sets: Int?
    var reps: String?
    var restSeconds: Int?
    var sortOrder: Int

    var isCardio: Bool {
        let lower = name.lowercased()
        return ["run", "treadmill", "bike", "row erg", "walk"].contains { lower.contains($0) }
    }
}
