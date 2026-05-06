import SwiftUI

struct ExerciseDraftRow: View {
    @Binding var draft: ExerciseDraft
    var onSetChecked: (() -> Void)?
    @FocusState private var weightFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(draft.exercise.name)
                    .font(Type.body(16, weight: .medium))
                    .foregroundStyle(Tokens.text)
                Spacer()
                metaLine
            }

            if draft.exercise.isCardio {
                Button {
                    let current = draft.setChecks.first ?? false
                    let now = !current
                    if draft.setChecks.isEmpty { draft.setChecks = [now] } else { draft.setChecks[0] = now }
                    if now { onSetChecked?() }
                } label: {
                    HStack(spacing: 10) {
                        checkbox(isOn: draft.setChecks.first ?? false)
                        Text(draft.exercise.reps ?? "Done")
                            .font(Type.body(14))
                            .foregroundStyle(Tokens.secondary)
                        Spacer()
                    }
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 10) {
                    weightField
                    Text("kg")
                        .font(Type.mono(12))
                        .foregroundStyle(Tokens.muted)
                    Spacer()
                }
                HStack(spacing: 8) {
                    ForEach(draft.setChecks.indices, id: \.self) { i in
                        Button {
                            let willCheck = !draft.setChecks[i]
                            draft.setChecks[i] = willCheck
                            if willCheck { onSetChecked?() }
                        } label: {
                            HStack(spacing: 6) {
                                checkbox(isOn: draft.setChecks[i])
                                Text("\(i + 1)")
                                    .font(Type.mono(11))
                                    .foregroundStyle(draft.setChecks[i] ? Tokens.heading : Tokens.muted)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule().fill(draft.setChecks[i] ? Tokens.lineHi : Tokens.surface)
                            )
                            .overlay(Capsule().stroke(Tokens.line, lineWidth: 0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(draft.isActive ? Tokens.lineHi : Tokens.line, lineWidth: 0.5)
        )
    }

    @ViewBuilder
    private var metaLine: some View {
        let parts: [String] = [
            (draft.exercise.sets.map { "\($0)×" } ?? "") + (draft.exercise.reps ?? ""),
            draft.lastWeight.map { "last \(ExerciseDraft.formatted($0))kg" } ?? ""
        ].filter { !$0.isEmpty }
        Text(parts.joined(separator: " · "))
            .font(Type.mono(11))
            .foregroundStyle(Tokens.muted)
    }

    private var weightField: some View {
        TextField("0", text: $draft.weight)
            .focused($weightFocused)
            .keyboardType(.decimalPad)
            .font(Type.display(22, weight: .light))
            .foregroundStyle(Tokens.heading)
            .frame(width: 80)
            .padding(.vertical, 4)
            .padding(.horizontal, 8)
            .background(Tokens.bg, in: RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(weightFocused ? Tokens.lineHi : Tokens.line, lineWidth: 0.5)
            )
    }

    private func checkbox(isOn: Bool) -> some View {
        Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
            .font(.system(size: 18, weight: .regular))
            .foregroundStyle(isOn ? Tokens.heading : Tokens.muted)
    }
}
