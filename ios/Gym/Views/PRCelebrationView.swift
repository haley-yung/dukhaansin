import SwiftUI

struct PRCelebrationView: View {
    let prs: [PersonalRecord]
    var onDismiss: () -> Void

    @State private var visible = false

    var body: some View {
        ZStack {
            // Soft pastel overlay instead of dark.
            LinearGradient(
                colors: [
                    Tokens.pink.opacity(0.92),
                    Tokens.cta.opacity(0.88)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Text("New PR\(prs.count > 1 ? "s" : "")")
                    .font(Type.display(16, weight: .bold))
                    .textCase(.uppercase)
                    .kerning(3.0)
                    .foregroundStyle(Color.white)

                ForEach(prs) { pr in
                    VStack(spacing: 8) {
                        Text(pr.exerciseName)
                            .font(Type.body(16, weight: .semibold))
                            .foregroundStyle(Color.white.opacity(0.92))
                        Text("\(formatted(pr.weight))kg × \(pr.reps)")
                            .font(Type.display(72, weight: .extraBold))
                            .kerning(-2.5)
                            .foregroundStyle(Color.white)
                    }
                }
            }
            .opacity(visible ? 1 : 0)
            .scaleEffect(visible ? 1 : 0.94)
            .animation(.easeOut(duration: 0.28), value: visible)
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

private extension Font.Weight {
    static let extraBold: Font.Weight = .heavy
}
