import SwiftUI

struct PRCelebrationView: View {
    let prs: [PersonalRecord]
    var onDismiss: () -> Void

    @State private var visible = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()
            VStack(spacing: 24) {
                Text("New PR\(prs.count > 1 ? "s" : "")")
                    .font(Type.mono(11))
                    .textCase(.uppercase)
                    .kerning(2.0)
                    .foregroundStyle(Tokens.DataViz.good)

                ForEach(prs) { pr in
                    VStack(spacing: 6) {
                        Text(pr.exerciseName)
                            .font(Type.body(15, weight: .medium))
                            .foregroundStyle(Tokens.heading)
                        Text("\(formatted(pr.weight))kg × \(pr.reps)")
                            .font(Type.display(56, weight: .light))
                            .kerning(-1.5)
                            .foregroundStyle(Tokens.heading)
                    }
                }
            }
            .opacity(visible ? 1 : 0)
            .scaleEffect(visible ? 1 : 0.94)
            .animation(.easeOut(duration: 0.25), value: visible)
        }
        .onAppear {
            visible = true
            Task {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                onDismiss()
            }
        }
        .onTapGesture { onDismiss() }
        .sensoryFeedback(.success, trigger: prs.count)
    }

    private func formatted(_ kg: Double) -> String {
        kg.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(kg)) : String(format: "%.1f", kg)
    }
}
