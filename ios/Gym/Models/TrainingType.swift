import SwiftUI

enum TrainingType: String, Codable, CaseIterable, Identifiable {
    case pushRun = "push_run"
    case lowerA  = "lower_a"
    case pullRun = "pull_run"
    case rest

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pushRun: "Push + Run"
        case .lowerA:  "Lower A"
        case .pullRun: "Pull + Run"
        case .rest:    "Rest"
        }
    }

    var color: Color {
        switch self {
        case .pushRun: Tokens.DataViz.pushRun
        case .lowerA:  Tokens.DataViz.lowerA
        case .pullRun: Tokens.DataViz.pullRun
        case .rest:    Tokens.DataViz.rest
        }
    }
}
