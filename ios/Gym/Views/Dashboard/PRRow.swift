import SwiftUI

struct PRRow: View {
    let record: PersonalRecord
    let isNew: Bool

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(record.exerciseName)
                    .font(Type.body(15, weight: .regular))
                    .foregroundStyle(Tokens.text)
                Text(record.date)
                    .font(Type.mono(11))
                    .foregroundStyle(Tokens.muted)
            }
            Spacer()
            (Text("\(weightString) ")
                .font(Type.display(20, weight: .light))
                .foregroundStyle(Tokens.heading)
            +
            Text("kg × \(record.reps)")
                .font(Type.mono(12))
                .foregroundStyle(Tokens.secondary))
            .kerning(-0.3)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(isNew ? Tokens.DataViz.good : Tokens.line)
                .frame(height: isNew ? 1.2 : 0.5)
        }
    }

    private var weightString: String {
        record.weight.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(record.weight))
            : String(format: "%.1f", record.weight)
    }
}

#Preview {
    VStack(spacing: 0) {
        PRRow(record: PersonalRecord(id: UUID(), exerciseName: "Bench Press", weight: 80, reps: 5, date: "2026-04-30", workoutId: nil), isNew: true)
        PRRow(record: PersonalRecord(id: UUID(), exerciseName: "Squat", weight: 105.5, reps: 3, date: "2026-04-28", workoutId: nil), isNew: false)
    }
    .padding()
    .background(Tokens.bg)
    .preferredColorScheme(.dark)
}
