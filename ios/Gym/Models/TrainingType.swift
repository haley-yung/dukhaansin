import SwiftUI

enum TrainingType: String, Codable, CaseIterable, Identifiable {
    case pushRun = "push_run"
    case legDay  = "leg_day"
    case pullRun = "pull_run"
    case rest

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pushRun: "Push + Run"
        case .legDay:  "Leg Day"
        case .pullRun: "Pull + Run"
        case .rest:    "Rest"
        }
    }

    var color: Color {
        switch self {
        case .pushRun: Tokens.DataViz.pushRun
        case .legDay:  Tokens.DataViz.legDay
        case .pullRun: Tokens.DataViz.pullRun
        case .rest:    Tokens.DataViz.rest
        }
    }

    /// Resilient decoder: any unknown rawValue (e.g. a training type the DB
    /// has but iOS doesn't yet know about) falls back to `.rest` so a single
    /// renamed row can't break the entire fetchAll. The fallback shows up
    /// in the UI as "Rest" with the neutral color — a sign to add a new
    /// case here.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = TrainingType(rawValue: raw) ?? .rest
    }
}
