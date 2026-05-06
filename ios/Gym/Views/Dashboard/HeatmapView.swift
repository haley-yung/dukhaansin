import SwiftUI

struct HeatmapView: View {
    let workouts: [Workout]
    var year: Int = Calendar.current.component(.year, from: Date())

    private struct Cell: Identifiable {
        let id: Int
        let date: Date
        let workout: Workout?
        let weekIndex: Int
        let dayIndex: Int
    }

    var body: some View {
        let cells = buildCells()
        let weekCount = (cells.map(\.weekIndex).max() ?? 0) + 1

        VStack(alignment: .leading, spacing: 8) {
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
                let cellSize = max(8, (geo.size.width - CGFloat(weekCount - 1) * 2) / CGFloat(weekCount))
                ZStack(alignment: .topLeading) {
                    ForEach(cells) { cell in
                        let x = CGFloat(cell.weekIndex) * (cellSize + 2)
                        let y = CGFloat(cell.dayIndex) * (cellSize + 2)
                        cellView(cell)
                            .frame(width: cellSize, height: cellSize)
                            .position(x: x + cellSize / 2, y: y + cellSize / 2)
                    }
                }
            }
            .frame(height: CGFloat(7) * 12)
        }
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Tokens.line, lineWidth: 0.5)
        )
    }

    @ViewBuilder
    private func cellView(_ cell: Cell) -> some View {
        let isToday = Calendar.current.isDateInToday(cell.date)
        let base: Color = cell.workout?.trainingType.color ?? Tokens.DataViz.rest.opacity(0.55)
        RoundedRectangle(cornerRadius: 2)
            .fill(base)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .stroke(isToday ? Tokens.heading : .clear, lineWidth: 1)
            )
            .opacity(cell.workout == nil ? 0.45 : 1.0)
    }

    private func buildCells() -> [Cell] {
        let cal = Calendar(identifier: .gregorian)
        let byDate = Stats.workoutsByDate(workouts)

        guard let start = cal.date(from: DateComponents(year: year, month: 1, day: 1)),
              let end = cal.date(from: DateComponents(year: year, month: 12, day: 31))
        else { return [] }

        var cells: [Cell] = []
        var date = start
        var counter = 0

        // Align to start of the week containing Jan 1.
        let startWeekday = cal.component(.weekday, from: start) - 1 // 0=Sun

        while date <= end {
            let iso = Stats.iso(date)
            let weekday = cal.component(.weekday, from: date) - 1
            let daysFromStart = cal.dateComponents([.day], from: start, to: date).day ?? 0
            let weekIndex = (daysFromStart + startWeekday) / 7
            cells.append(Cell(
                id: counter,
                date: date,
                workout: byDate[iso],
                weekIndex: weekIndex,
                dayIndex: weekday
            ))
            guard let next = cal.date(byAdding: .day, value: 1, to: date) else { break }
            date = next
            counter += 1
        }
        return cells
    }
}

#Preview {
    HeatmapView(workouts: [])
        .padding()
        .background(Tokens.bg)
        .preferredColorScheme(.dark)
}
