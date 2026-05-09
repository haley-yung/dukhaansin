import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(GymStore.self) private var store
    @State private var exporting = false
    @State private var importing = false
    @State private var importJSON: String = ""
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        exercisesSection
                        templatesSection
                        dataSection
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 40)
                }
                .refreshable { await store.fetchAll() }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Tokens.bg, for: .navigationBar)
        }
        .sheet(isPresented: $importing) {
            importSheet
        }
        .alert("Status", isPresented: Binding(
            get: { statusMessage != nil },
            set: { if !$0 { statusMessage = nil } }
        )) {
            Button("OK") { statusMessage = nil }
        } message: {
            Text(statusMessage ?? "")
        }
    }

    private var exercisesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionLabel("Exercises")
            ExerciseListSection(trainingType: .pushRun)
            ExerciseListSection(trainingType: .legDay)
            ExerciseListSection(trainingType: .pullRun)
        }
    }

    private var templatesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Templates")
            if store.templates.isEmpty {
                Text("No templates yet.")
                    .font(Type.body(13))
                    .foregroundStyle(Tokens.muted)
                    .padding(.vertical, 8)
            } else {
                ForEach(store.templates) { template in
                    HStack {
                        Circle().fill(template.trainingType.color).frame(width: 6, height: 6)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(template.name)
                                .font(Type.body(14))
                                .foregroundStyle(Tokens.text)
                            Text(template.trainingType.label)
                                .font(Type.mono(11))
                                .foregroundStyle(Tokens.muted)
                        }
                        Spacer()
                        Button {
                            Task { await store.deleteTemplate(template) }
                        } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 13))
                                .foregroundStyle(Tokens.muted)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 10)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Tokens.line).frame(height: 0.5)
                    }
                }
            }
        }
    }

    private var dataSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Data")
            Button {
                Task { await runExport() }
            } label: {
                rowButton("Export all", systemImage: "square.and.arrow.up", busy: exporting)
            }
            .buttonStyle(.plain)
            .disabled(exporting)

            Button {
                importJSON = ""
                importing = true
            } label: {
                rowButton("Import from JSON", systemImage: "square.and.arrow.down", busy: false)
            }
            .buttonStyle(.plain)
        }
    }

    private func rowButton(_ title: String, systemImage: String, busy: Bool) -> some View {
        HStack {
            Image(systemName: systemImage)
                .font(.system(size: 14))
            Text(title)
                .font(Type.body(14))
            Spacer()
            if busy { ProgressView() }
        }
        .foregroundStyle(Tokens.text)
        .padding(14)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Tokens.line, lineWidth: 0.5))
    }

    private func runExport() async {
        exporting = true
        defer { exporting = false }
        do {
            let payload = try await GymAPI.shared.exportAll()
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(payload)
            UIPasteboard.general.string = String(data: data, encoding: .utf8) ?? ""
            statusMessage = "Export copied to clipboard (\(data.count.formatted()) bytes)."
        } catch {
            statusMessage = "Export failed: \(error.localizedDescription)"
        }
    }

    private var importSheet: some View {
        NavigationStack {
            ZStack {
                Tokens.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Paste a previously exported JSON payload. This replaces ALL data.")
                            .font(Type.body(13))
                            .foregroundStyle(Tokens.muted)
                        TextEditor(text: $importJSON)
                            .font(Type.mono(11))
                            .frame(minHeight: 240)
                            .padding(8)
                            .scrollContentBackground(.hidden)
                            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Tokens.line, lineWidth: 0.5))
                        Button("Replace all data") {
                            Task { await runImport() }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(Tokens.bg)
                        .background(Tokens.DataViz.danger, in: RoundedRectangle(cornerRadius: 12))
                        .disabled(importJSON.isEmpty)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Import")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { importing = false }
                }
            }
        }
    }

    private func runImport() async {
        guard let data = importJSON.data(using: .utf8) else {
            statusMessage = "Invalid text encoding."
            return
        }
        do {
            let payload = try JSONDecoder().decode(ExportPayload.self, from: data)
            try await GymAPI.shared.importAll(payload)
            await store.fetchAll()
            importing = false
            statusMessage = "Import complete."
        } catch {
            statusMessage = "Import failed: \(error.localizedDescription)"
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(Type.mono(10))
            .textCase(.uppercase)
            .kerning(1.4)
            .foregroundStyle(Tokens.muted)
    }
}
