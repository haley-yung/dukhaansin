import SwiftUI

struct StatTile: View {
    let label: String
    let value: String
    var hint: String? = nil
    var accent: Color = Tokens.heading

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(Type.display(11, weight: .semibold))
                .textCase(.uppercase)
                .kerning(1.6)
                .foregroundStyle(Tokens.muted)
            Text(value)
                .font(Type.display(40, weight: .bold))
                .foregroundStyle(accent)
                .kerning(-0.8)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if let hint {
                Text(hint)
                    .font(Type.mono(9))
                    .textCase(.uppercase)
                    .kerning(1.0)
                    .foregroundStyle(Tokens.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: Color.black.opacity(0.04), radius: 0, x: 0, y: 2)
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
