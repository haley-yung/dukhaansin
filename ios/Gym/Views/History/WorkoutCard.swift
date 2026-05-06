import SwiftUI

struct WorkoutCard: View {
    let workout: Workout
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Circle().fill(workout.trainingType.color).frame(width: 6, height: 6)
                            Text(workout.trainingType.label)
                                .font(Type.body(14, weight: .medium))
                                .foregroundStyle(Tokens.text)
                        }
                        Text(prettyDate)
                            .font(Type.mono(11))
                            .foregroundStyle(Tokens.muted)
                    }
                    Spacer()
                    Text("\(workout.exercises.count) ex")
                        .font(Type.mono(11))
                        .foregroundStyle(Tokens.secondary)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Tokens.muted)
                        .rotationEffect(.degrees(expanded ? 180 : 0))
                }
            }
            .buttonStyle(.plain)

            if expanded {
                VStack(alignment: .leading, spacing: 10) {
                    Divider().background(Tokens.line)
                    ForEach(workout.exercises, id: \.name) { logged in
                        exerciseRow(logged)
                    }
                    if let notes = workout.notes, !notes.isEmpty {
                        Text(notes)
                            .font(Type.body(13))
                            .foregroundStyle(Tokens.secondary)
                            .padding(.top, 4)
                    }
                }
            }
        }
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
    }

    private func exerciseRow(_ logged: LoggedExercise) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(logged.name)
                .font(Type.body(13))
                .foregroundStyle(Tokens.text)
            Spacer()
            Text(setsSummary(logged.sets))
                .font(Type.mono(11))
                .foregroundStyle(Tokens.muted)
        }
    }

    private func setsSummary(_ sets: [LoggedSet]) -> String {
        let weights = sets.compactMap(\.weight).filter { $0 > 0 }
        if let max = weights.max() {
            let reps = sets.compactMap(\.reps).first ?? ""
            return "\(format(max))kg × \(sets.count)\(reps.isEmpty ? "" : " · \(reps)")"
        }
        return "\(sets.count) sets"
    }

    private func format(_ kg: Double) -> String {
        kg.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(kg)) : String(format: "%.1f", kg)
    }

    private var prettyDate: String {
        guard let date = Stats.date(from: workout.date) else { return workout.date }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        return f.string(from: date)
    }
}
