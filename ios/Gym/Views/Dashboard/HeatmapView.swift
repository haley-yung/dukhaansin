import SwiftUI

struct HeatmapView: View {
    let workouts: [Workout]

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
                Text(monthLabel)
                    .font(Type.mono(10))
                    .foregroundStyle(Tokens.muted)
            }

            GeometryReader { geo in
                let gap: CGFloat = 3
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
            RoundedRectangle(cornerRadius: 3)
                .fill(base)
                .opacity(cell.workout == nil ? 0.45 : 1.0)
                .overlay(
                    RoundedRectangle(cornerRadius: 3)
                        .stroke(isToday ? Tokens.heading : .clear, lineWidth: 1)
                )
        }
    }

    private var monthLabel: String {
        let cal = Calendar(identifier: .gregorian)
        let now = Date()
        guard let twoMonthsAgo = cal.date(byAdding: .month, value: -2, to: now) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM"
        let yearF = DateFormatter()
        yearF.dateFormat = "yyyy"
        return "\(f.string(from: twoMonthsAgo)) – \(f.string(from: now)) \(yearF.string(from: now))".uppercased()
    }

    private func buildWeeks() -> [[Cell]] {
        let cal = Calendar(identifier: .gregorian)
        let now = Date()

        guard let twoMonthsAgo = cal.date(byAdding: .month, value: -2, to: now),
              let firstMonth = cal.dateInterval(of: .month, for: twoMonthsAgo),
              let currentMonth = cal.dateInterval(of: .month, for: now)
        else { return [] }
        let start = firstMonth.start
        let end = cal.date(byAdding: .day, value: -1, to: currentMonth.end) ?? currentMonth.end

        let byDate = Stats.workoutsByDate(workouts)

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
