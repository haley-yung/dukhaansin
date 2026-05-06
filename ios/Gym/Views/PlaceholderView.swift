import SwiftUI

struct PlaceholderView: View {
    let title: String
    let subtitle: String

    var body: some View {
        ZStack {
            Tokens.bg.ignoresSafeArea()
            VStack(spacing: 8) {
                Text(title)
                    .font(Type.display(40, weight: .light))
                    .foregroundStyle(Tokens.heading)
                    .kerning(-0.8)
                Text(subtitle)
                    .font(Type.mono(11))
                    .textCase(.uppercase)
                    .kerning(1.4)
                    .foregroundStyle(Tokens.muted)
            }
        }
    }
}

#Preview {
    PlaceholderView(title: "History", subtitle: "Phase 6")
        .preferredColorScheme(.dark)
}
