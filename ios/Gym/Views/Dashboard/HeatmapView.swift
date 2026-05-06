import SwiftUI

struct HeatmapView: View {
    let workouts: [Workout]
    var year: Int = Calendar.current.component(.year, from: Date())

    private struct Cell {
        let date: Date?
        let workout: Workout?
    }

    var body: some View {
        let weeks = buildWeeks()
        let weekCount = max(weeks.count, 1)

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Activity")
                    .font(Type.mono(10))
                    .textCase(.uppercase)
                    .kerning(1.4)
                    .foregroundStyle(Tokens.muted)
                Spacer()
                Text(String(year))
                    .font(Type.mono(10))
                    .foregroundStyle(Tokens.muted)
            }

            GeometryReader { geo in
                let gap: CGFloat = 2
                let cellSize = max(0, (geo.size.width - CGFloat(weekCount - 1) * gap) / CGFloat(weekCount))
                HStack(alignment: .top, spacing: gap) {
                    ForEach(weeks.indices, id: \.self) { wi in
                        VStack(spacing: gap) {
                            ForEach(0..<7, id: \.self) { di in
                                cellView(weeks[wi][di])
                                    .frame(width: cellSize, height: cellSize)
                            }
                        }
                    }
                }
            }
            .aspectRatio(CGFloat(weekCount) / 7.0, contentMode: .fit)
        }
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
    }

    @ViewBuilder
    private func cellView(_ cell: Cell) -> some View {
        if cell.date == nil {
            Color.clear
        } else {
            let isToday = Calendar.current.isDateInToday(cell.date!)
            let base: Color = cell.workout?.trainingType.color ?? Tokens.DataViz.rest.opacity(0.55)
            RoundedRectangle(cornerRadius: 1.5)
                .fill(base)
                .opacity(cell.workout == nil ? 0.45 : 1.0)
                .overlay(
                    RoundedRectangle(cornerRadius: 1.5)
                        .stroke(isToday ? Tokens.heading : .clear, lineWidth: 1)
                )
        }
    }

    private func buildWeeks() -> [[Cell]] {
        let cal = Calendar(identifier: .gregorian)
        let byDate = Stats.workoutsByDate(workouts)

        guard let start = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let end = cal.date(from: DateComponents(year: year, month: 12, day: 31))
        else { return [] }

        let startWeekday = cal.component(.weekday, from: start) - 1 // 0=Sun
        var weeks: [[Cell]] = []
        var current: [Cell] = Array(repeating: Cell(date: nil, workout: nil), count: startWeekday)

        var date = start
        while date <= end {
            let weekday = cal.component(.weekday, from: date) - 1
            let iso = Stats.iso(date)
            current.append(Cell(date: date, workout: byDate[iso]))
            if weekday == 6 {
                weeks.append(current)
                current = []
            }
            guard let next = cal.date(byAdding: .day, value: 1, to: date) else { break }
            date = next
        }
        while current.count < 7 { current.append(Cell(date: nil, workout: nil)) }
        if current.contains(where: { $0.date != nil }) {
            weeks.append(current)
        }
        return weeks
    }
}
