import SwiftUI

struct WorkoutLoggerSheet: View {
    @Environment(GymStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var trainingType: TrainingType?
    @State private var drafts: [ExerciseDraft] = []
    @State private var notes: String = ""
    @State private var sessionDate: Date = Date()
    @State private var saving: Bool = false
    @State private var error: String?
    @State private var showSaveTemplate: Bool = false
    @State private var templateName: String = ""
    @State private var didRestore: Bool = false
    @State private var timer = RestTimer()
    @FocusState private var anyFieldFocused: Bool

    var onComplete: (WorkoutCreateResponse) -> Void

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        typePicker
                        if let trainingType {
                            templateChips(for: trainingType)
                            exerciseList
                            notesField
                            saveTemplateButton
                            saveButton
                        }
                        if let error {
                            Text(error)
                                .font(Type.mono(12))
                                .foregroundStyle(Tokens.DataViz.danger)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                }
                .scrollDismissesKeyboard(.interactively)
                RestTimerBanner(timer: timer)
                    .padding(.top, 8)
            }
            .navigationTitle("Log session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Tokens.muted)
                }
                ToolbarItem(placement: .principal) {
                    DatePicker("", selection: $sessionDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { dismissKeyboard() }
                        .foregroundStyle(Tokens.heading)
                }
            }
            .sheet(isPresented: $showSaveTemplate) { saveTemplateSheet }
        }
        .onAppear { restoreIfPossible() }
        .onChange(of: trainingType) { _, _ in persist() }
        .onChange(of: drafts) { _, _ in persist() }
        .onChange(of: notes) { _, _ in persist() }
        .onChange(of: sessionDate) { _, _ in persist() }
    }

    // MARK: - Type picker

    private var typePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Training type")
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            HStack(spacing: 8) {
                ForEach([TrainingType.pushRun, .legDay, .pullRun]) { type in
                    Button {
                        select(type: type)
                    } label: {
                        VStack(spacing: 4) {
                            Circle().fill(type.color).frame(width: 8, height: 8)
                            Text(type.label)
                                .font(Type.body(13, weight: .medium))
                                .foregroundStyle(trainingType == type ? Tokens.heading : Tokens.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(trainingType == type ? Tokens.lineHi : Tokens.surface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Tokens.line, lineWidth: 0.5)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func select(type: TrainingType) {
        trainingType = type
        let exercisesForType = store.exercises.filter { $0.trainingType == type }
        drafts = exercisesForType.map {
            ExerciseDraft.make(from: $0, lastWeight: Stats.previousWeight(for: $0, in: store.workouts))
        }
    }

    // MARK: - Templates

    @ViewBuilder
    private func templateChips(for type: TrainingType) -> some View {
        let templates = store.templates.filter { $0.trainingType == type }
        if !templates.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Templates")
                    .font(Type.mono(10))
                    .textCase(.uppercase)
                    .kerning(1.4)
                    .foregroundStyle(Tokens.muted)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(templates) { template in
                            Button {
                                apply(template: template)
                            } label: {
                                Text(template.name)
                                    .font(Type.body(13))
                                    .foregroundStyle(Tokens.text)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(Tokens.surface, in: Capsule())
                                    .overlay(Capsule().stroke(Tokens.line, lineWidth: 0.5))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private func apply(template: Template) {
        for templateEx in template.exercises {
            guard let idx = drafts.firstIndex(where: {
                $0.exercise.id == templateEx.exerciseId || $0.exercise.name == templateEx.name
            }) else { continue }
            if let firstSet = templateEx.sets.first, let w = firstSet.weight, w > 0 {
                drafts[idx].weight = ExerciseDraft.formatted(w)
            }
        }
    }

    // MARK: - Exercise list

    private var exerciseList: some View {
        VStack(spacing: 10) {
            ForEach($drafts) { $draft in
                ExerciseDraftRow(draft: $draft) {
                    if let rest = draft.exercise.restSeconds, rest > 0 {
                        timer.start(seconds: rest)
                    }
                }
            }
        }
    }

    // MARK: - Notes

    private var notesField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Notes")
                .font(Type.mono(10))
                .textCase(.uppercase)
                .kerning(1.4)
                .foregroundStyle(Tokens.muted)
            TextField("Optional", text: $notes, axis: .vertical)
                .lineLimit(2...4)
                .focused($anyFieldFocused)
                .font(Type.body(14))
                .foregroundStyle(Tokens.text)
                .padding(12)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(anyFieldFocused ? Tokens.lineHi : Tokens.line, lineWidth: 0.5)
                )
        }
    }

    // MARK: - Save

    private var saveButton: some View {
        Button {
            Task { await save() }
        } label: {
            HStack {
                if saving { ProgressView().tint(Tokens.onCTA) }
                Text(saving ? "Saving…" : "End session")
                    .font(Type.display(20, weight: .bold))
                    .textCase(.uppercase)
                    .kerning(1.4)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .foregroundStyle(Tokens.onCTA)
            .background(
                activeCount > 0 ? Tokens.cta : Tokens.muted.opacity(0.45),
                in: RoundedRectangle(cornerRadius: 24)
            )
            .shadow(
                color: activeCount > 0 ? Tokens.cta.opacity(0.25) : .clear,
                radius: 12, x: 0, y: 6
            )
        }
        .buttonStyle(.plain)
        .disabled(activeCount == 0 || saving)
    }

    private var saveTemplateButton: some View {
        Button {
            templateName = ""
            showSaveTemplate = true
        } label: {
            HStack {
                Image(systemName: "bookmark")
                Text("Save as template")
            }
            .font(Type.body(13))
            .foregroundStyle(Tokens.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Tokens.line, lineWidth: 0.5))
        }
        .buttonStyle(.plain)
        .disabled(activeCount == 0 || saving)
    }

    private var activeCount: Int {
        drafts.filter(\.isActive).count
    }

    private func save() async {
        guard let trainingType else { return }
        saving = true
        error = nil
        defer { saving = false }
        let active = drafts.filter(\.isActive).map { $0.toLoggedExercise() }
        if let resp = await store.recordWorkout(
            date: Stats.iso(sessionDate),
            trainingType: trainingType,
            notes: notes.isEmpty ? nil : notes,
            exercises: active
        ) {
            DraftStore.clear()
            onComplete(resp)
            dismiss()
        } else {
            error = store.lastError ?? "Failed to save."
        }
    }

    // MARK: - Save template sheet

    private var saveTemplateSheet: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Template name", text: $templateName)
                        .textFieldStyle(.roundedBorder)
                    Button("Save") {
                        Task {
                            guard let trainingType else { return }
                            let active = drafts.filter(\.isActive).map { $0.toLoggedExercise() }
                            await store.saveTemplate(name: templateName, trainingType: trainingType, exercises: active)
                            showSaveTemplate = false
                        }
                    }
                    .disabled(templateName.isEmpty)
                    Spacer()
                }
                .padding(20)
            }
            .navigationTitle("Save template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showSaveTemplate = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Persistence

    private func restoreIfPossible() {
        guard !didRestore else { return }
        didRestore = true
        guard let saved = DraftStore.loadForToday() else { return }
        sessionDate = Stats.date(from: saved.sessionDateISO) ?? Date()
        notes = saved.notes
        trainingType = saved.trainingType

        let exercisesForType = store.exercises.filter { $0.trainingType == saved.trainingType }
        drafts = exercisesForType.map { exercise in
            var draft = ExerciseDraft.make(
                from: exercise,
                lastWeight: Stats.previousWeight(for: exercise, in: store.workouts)
            )
            if let entry = saved.entries.first(where: { $0.exerciseId == exercise.id }) {
                draft.weight = entry.weight
                if entry.setChecks.count == draft.setChecks.count {
                    draft.setChecks = entry.setChecks
                }
            }
            return draft
        }
    }

    private func persist() {
        guard let trainingType else {
            DraftStore.clear()
            return
        }
        let entries = drafts.compactMap { draft -> SessionDraft.Entry? in
            // Skip blank entries to keep the blob small.
            guard !draft.weight.isEmpty || draft.setChecks.contains(true) else { return nil }
            return SessionDraft.Entry(
                exerciseId: draft.exercise.id,
                weight: draft.weight,
                setChecks: draft.setChecks
            )
        }
        DraftStore.save(SessionDraft(
            trainingType: trainingType,
            sessionDateISO: Stats.iso(sessionDate),
            notes: notes,
            entries: entries
        ))
    }

    private func dismissKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil, from: nil, for: nil
        )
    }
}
