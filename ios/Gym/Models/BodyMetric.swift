import Foundation

struct BodyMetric: Codable, Identifiable, Hashable {
    let id: UUID
    var date: String
    var weightKg: Double?
    var energyLevel: Int?
    var notes: String?
}
