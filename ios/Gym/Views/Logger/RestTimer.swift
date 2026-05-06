import SwiftUI
import Observation

@MainActor
@Observable
final class RestTimer {
    var totalSeconds: Int = 0
    var remaining: Int = 0
    var isRunning: Bool = false
    var completedTick: Int = 0

    private var task: Task<Void, Never>?

    func start(seconds: Int) {
        guard seconds > 0 else { return }
        cancel()
        totalSeconds = seconds
        remaining = seconds
        isRunning = true
        task = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self, self.isRunning, self.remaining > 0 else { return }
                self.remaining = max(0, self.remaining - 1)
                if self.remaining == 0 {
                    self.isRunning = false
                    self.completedTick += 1
                    return
                }
            }
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
        isRunning = false
        remaining = 0
    }
}

struct RestTimerBanner: View {
    @Bindable var timer: RestTimer

    var body: some View {
        if timer.isRunning {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .stroke(Tokens.line, lineWidth: 2)
                        .frame(width: 32, height: 32)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(Tokens.heading, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                        .frame(width: 32, height: 32)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 0.5), value: progress)
                }
                Text("\(timer.remaining)s")
                    .font(Type.mono(15, weight: .medium))
                    .foregroundStyle(Tokens.heading)
                Spacer()
                Button {
                    timer.cancel()
                } label: {
                    Text("Skip")
                        .font(Type.mono(11))
                        .textCase(.uppercase)
                        .kerning(1.2)
                        .foregroundStyle(Tokens.muted)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.regularMaterial, in: Capsule())
            .overlay(Capsule().stroke(Tokens.lineHi, lineWidth: 0.5))
            .padding(.horizontal, 20)
            .transition(.move(edge: .top).combined(with: .opacity))
            .sensoryFeedback(.success, trigger: timer.completedTick)
        }
    }

    private var progress: CGFloat {
        guard timer.totalSeconds > 0 else { return 0 }
        return CGFloat(timer.totalSeconds - timer.remaining) / CGFloat(timer.totalSeconds)
    }
}
