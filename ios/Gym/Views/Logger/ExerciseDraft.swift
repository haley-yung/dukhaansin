import Foundation

/// Local sheet state for one exercise during a logging session.
struct ExerciseDraft: Identifiable, Hashable {
    let exercise: Exercise
    var weight: String
    var setChecks: [Bool]
    var lastWeight: Double?

    var id: UUID { exercise.id }

    static func make(from exercise: Exercise, lastWeight: Double?) -> ExerciseDraft {
        let count = max(exercise.sets ?? 1, 1)
        return ExerciseDraft(
            exercise: exercise,
            weight: lastWeight.flatMap { $0 > 0 ? formatted($0) : nil } ?? "",
            setChecks: Array(repeating: false, count: count),
            lastWeight: lastWeight
        )
    }

    static func formatted(_ kg: Double) -> String {
        kg.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(kg)) : String(format: "%.1f", kg)
    }

    var anyChecked: Bool { setChecks.contains(true) }

    /// True if the user actually engaged with this exercise — strength: weight entered;
    /// cardio: at least one set checked.
    var isActive: Bool {
        if exercise.isCardio { return anyChecked }
        return Double(weight.replacingOccurrences(of: ",", with: ".")) != nil
    }

    func toLoggedExercise() -> LoggedExercise {
        let repsString = exercise.reps
        if exercise.isCardio {
            return LoggedExercise(
                exerciseId: exercise.id,
                name: exercise.name,
                sets: setChecks.filter { $0 }.map { _ in
                    LoggedSet(weight: nil, reps: repsString, distance: nil, duration: nil)
                }
            )
        }
        let parsedWeight = Double(weight.replacingOccurrences(of: ",", with: "."))
        return LoggedExercise(
            exerciseId: exercise.id,
            name: exercise.name,
            sets: setChecks.indices.map { _ in
                LoggedSet(weight: parsedWeight, reps: repsString, distance: nil, duration: nil)
            }
        )
    }
}
