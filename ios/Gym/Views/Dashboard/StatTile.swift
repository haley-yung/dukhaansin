import SwiftUI

struct StatTile: View {
    let label: String
    let value: String
    var hint: String? = nil
    var accent: Color = Tokens.heading

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            Text(value)
                .font(Type.display(28, weight: .light))
                .foregroundStyle(accent)
                .kerning(-0.5)
            if let hint {
                Text(hint)
                    .font(Type.body(11))
                    .foregroundStyle(Tokens.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Tokens.line, lineWidth: 0.5)
        )
    }
}

#Preview {
    HStack(spacing: 8) {
        StatTile(label: "This Week", value: "3")
        StatTile(label: "Streak", value: "12", hint: "days")
        StatTile(label: "PRs", value: "47")
    }
    .padding()
    .background(Tokens.bg)
    .preferredColorScheme(.dark)
}
