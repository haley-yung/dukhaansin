import SwiftUI

struct ExerciseListSection: View {
    let trainingType: TrainingType
    @Environment(GymStore.self) private var store
    @State private var showAdd = false
    @State private var editing: Exercise?
    @State private var pendingDelete: Exercise?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 8) {
                    Circle().fill(trainingType.color).frame(width: 6, height: 6)
                    Text(trainingType.label)
                        .font(Type.mono(11))
                        .textCase(.uppercase)
                        .kerning(1.4)
                        .foregroundStyle(Tokens.muted)
                }
                Spacer()
                Button {
                    showAdd = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Tokens.secondary)
                        .padding(6)
                        .background(Tokens.surface, in: Circle())
                        .overlay(Circle().stroke(Tokens.line, lineWidth: 0.5))
                }
                .buttonStyle(.plain)
            }
            ForEach(filtered) { ex in
                row(for: ex)
            }
        }
        .sheet(isPresented: $showAdd) {
            ExerciseEditorSheet(trainingType: trainingType, existing: nil)
                .environment(store)
        }
        .sheet(item: $editing) { ex in
            ExerciseEditorSheet(trainingType: trainingType, existing: ex)
                .environment(store)
        }
        .alert("Delete \(pendingDelete?.name ?? "exercise")?", isPresented: Binding(
            get: { pendingDelete != nil },
            set: { if !$0 { pendingDelete = nil } }
        )) {
            Button("Delete", role: .destructive) {
                if let ex = pendingDelete {
                    Task { await store.deleteExercise(ex) }
                }
                pendingDelete = nil
            }
            Button("Cancel", role: .cancel) { pendingDelete = nil }
        } message: {
            Text("This removes the exercise from the library. Past workouts that used it stay in history.")
        }
    }

    private var filtered: [Exercise] {
        store.exercises.filter { $0.trainingType == trainingType }
    }

    private func row(for ex: Exercise) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Button {
                editing = ex
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(ex.name)
                        .font(Type.body(15))
                        .foregroundStyle(Tokens.text)
                    Text(meta(for: ex))
                        .font(Type.mono(11))
                        .foregroundStyle(Tokens.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Button {
                pendingDelete = ex
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.DataViz.danger.opacity(0.85))
                    .padding(8)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Tokens.muted)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Tokens.line).frame(height: 0.5)
        }
    }

    private func meta(for ex: Exercise) -> String {
        var parts: [String] = []
        if let sets = ex.sets, let reps = ex.reps { parts.append("\(sets)× \(reps)") }
        else if let reps = ex.reps { parts.append(reps) }
        if let rest = ex.restSeconds, rest > 0 { parts.append("\(rest)s rest") }
        return parts.joined(separator: " · ")
    }
}

struct ExerciseEditorSheet: View {
    let trainingType: TrainingType
    let existing: Exercise?
    @Environment(GymStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var sets = ""
    @State private var reps = ""
    @State private var rest = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                Form {
                    Section {
                        TextField("Name", text: $name)
                        TextField("Sets", text: $sets).keyboardType(.numberPad)
                        TextField("Reps (e.g. 10-12)", text: $reps)
                        TextField("Rest seconds", text: $rest).keyboardType(.numberPad)
                    }
                }
                .scrollContentBackground(.hidden)
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle(existing == nil ? "New exercise" : "Edit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(name.isEmpty)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(
                            #selector(UIResponder.resignFirstResponder),
                            to: nil, from: nil, for: nil
                        )
                    }
                }
            }
        }
        .onAppear {
            if let existing {
                name = existing.name
                sets = existing.sets.map(String.init) ?? ""
                reps = existing.reps ?? ""
                rest = existing.restSeconds.map(String.init) ?? ""
            }
        }
    }

    private func save() async {
        let setsInt = Int(sets)
        let restInt = Int(rest)
        if let existing {
            var updated = existing
            updated.name = name
            updated.sets = setsInt
            updated.reps = reps.isEmpty ? nil : reps
            updated.restSeconds = restInt
            await store.updateExercise(updated)
        } else {
            await store.addExercise(
                name: name,
                trainingType: trainingType,
                sets: setsInt,
                reps: reps.isEmpty ? nil : reps,
                restSeconds: restInt
            )
        }
        dismiss()
    }
}
