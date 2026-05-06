import SwiftUI
import Charts

struct BodyView: View {
    @Environment(GymStore.self) private var store

    @State private var entryDate: Date = Date()
    @State private var weight: String = ""
    @State private var energy: Int = 0
    @State private var notes: String = ""
    @State private var saving: Bool = false
    @FocusState private var weightFocused: Bool
    @FocusState private var notesFocused: Bool

    private let energyEmoji = ["", "😴", "😑", "🙂", "😊", "🔥"]

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        trendChart
                        logForm
                        recentList
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable { await store.fetchAll() }
            }
            .navigationTitle("Body")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Tokens.bg, for: .navigationBar)
            .onAppear { prefillForToday() }
        }
    }

    // MARK: - Trend chart

    @ViewBuilder
    private var trendChart: some View {
        let points = trendPoints()
        VStack(alignment: .leading, spacing: 10) {
            Text("Weight trend")
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            if points.count < 2 {
                Text(points.isEmpty ? "Log your weight to see a trend." : "Need at least 2 entries.")
                    .font(Type.body(13))
                    .foregroundStyle(Tokens.muted)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
            } else {
                Chart {
                    ForEach(points) { p in
                        LineMark(x: .value("Date", p.date), y: .value("kg", p.weight))
                            .foregroundStyle(Tokens.heading)
                            .interpolationMethod(.catmullRom)
                        PointMark(x: .value("Date", p.date), y: .value("kg", p.weight))
                            .foregroundStyle(Tokens.heading)
                            .symbolSize(20)
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { _ in
                        AxisValueLabel().foregroundStyle(Tokens.muted)
                        AxisGridLine().foregroundStyle(Tokens.line)
                    }
                }
                .chartXAxis {
                    AxisMarks { _ in
                        AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                            .foregroundStyle(Tokens.muted)
                    }
                }
                .frame(height: 220)
                .padding(14)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
            }
        }
    }

    private struct TrendPoint: Identifiable {
        let id: UUID
        let date: Date
        let weight: Double
    }

    private func trendPoints() -> [TrendPoint] {
        store.metrics
            .compactMap { m -> TrendPoint? in
                guard let date = Stats.date(from: m.date), let w = m.weightKg else { return nil }
                return TrendPoint(id: m.id, date: date, weight: w)
            }
            .sorted(by: { $0.date < $1.date })
            .suffix(30)
            .map { $0 }
    }

    // MARK: - Form

    private var logForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Log entry")
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)

            DatePicker("Date", selection: $entryDate, displayedComponents: .date)
                .datePickerStyle(.compact)
                .foregroundStyle(Tokens.text)
                .onChange(of: entryDate) { _, _ in prefillForDate() }

            HStack(spacing: 10) {
                TextField("0", text: $weight)
                    .focused($weightFocused)
                    .keyboardType(.decimalPad)
                    .font(Type.display(28, weight: .light))
                    .foregroundStyle(Tokens.heading)
                    .frame(width: 100)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .background(Tokens.bg, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(weightFocused ? Tokens.lineHi : Tokens.line, lineWidth: 0.5)
                    )
                Text("kg")
                    .font(Type.mono(13))
                    .foregroundStyle(Tokens.muted)
                Spacer()
            }

            HStack(spacing: 10) {
                ForEach(1...5, id: \.self) { level in
                    Button {
                        energy = energy == level ? 0 : level
                    } label: {
                        Text(energyEmoji[level])
                            .font(.system(size: 22))
                            .frame(width: 44, height: 44)
                            .background(energy == level ? Tokens.lineHi : Tokens.surface, in: Circle())
                            .overlay(Circle().stroke(Tokens.line, lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)
                }
            }

            TextField("Notes (optional)", text: $notes, axis: .vertical)
                .lineLimit(1...3)
                .focused($notesFocused)
                .font(Type.body(14))
                .foregroundStyle(Tokens.text)
                .padding(12)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(notesFocused ? Tokens.lineHi : Tokens.line, lineWidth: 0.5)
                )

            Button {
                Task { await save() }
            } label: {
                HStack {
                    if saving { ProgressView().tint(Tokens.bg) }
                    Text(saving ? "Saving…" : "Save entry")
                        .font(Type.body(15, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .foregroundStyle(Tokens.bg)
                .background(canSave ? Tokens.heading : Tokens.muted, in: RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .disabled(!canSave || saving)
        }
        .padding(16)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
    }

    private var canSave: Bool {
        Double(weight.replacingOccurrences(of: ",", with: ".")) != nil || energy > 0
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let parsedWeight = Double(weight.replacingOccurrences(of: ",", with: "."))
        await store.upsertMetric(
            date: Stats.iso(entryDate),
            weightKg: parsedWeight,
            energyLevel: energy > 0 ? energy : nil,
            notes: notes.isEmpty ? nil : notes
        )
    }

    private func prefillForToday() {
        prefillForDate()
    }

    private func prefillForDate() {
        let iso = Stats.iso(entryDate)
        if let m = store.metrics.first(where: { $0.date == iso }) {
            weight = m.weightKg.map { ExerciseDraft.formatted($0) } ?? ""
            energy = m.energyLevel ?? 0
            notes = m.notes ?? ""
        } else {
            weight = ""
            energy = 0
            notes = ""
        }
    }

    // MARK: - Recent list

    @ViewBuilder
    private var recentList: some View {
        if !store.metrics.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                Text("Recent")
                    .font(Type.mono(10))
                    .textCase(.uppercase)
                    .kerning(1.4)
                    .foregroundStyle(Tokens.muted)
                    .padding(.bottom, 6)
                ForEach(Array(store.metrics.prefix(14))) { metric in
                    metricRow(metric)
                }
            }
        }
    }

    private func metricRow(_ m: BodyMetric) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(m.date)
                    .font(Type.mono(11))
                    .foregroundStyle(Tokens.muted)
                if let notes = m.notes, !notes.isEmpty {
                    Text(notes)
                        .font(Type.body(12))
                        .foregroundStyle(Tokens.secondary)
                }
            }
            Spacer()
            HStack(spacing: 8) {
                if let e = m.energyLevel, e > 0, e < energyEmoji.count {
                    Text(energyEmoji[e])
                }
                if let w = m.weightKg {
                    Text("\(ExerciseDraft.formatted(w)) ")
                        .font(Type.display(18, weight: .light))
                        .foregroundStyle(Tokens.heading)
                    + Text("kg")
                        .font(Type.mono(11))
                        .foregroundStyle(Tokens.muted)
                }
            }
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Tokens.line).frame(height: 0.5)
        }
    }
}
