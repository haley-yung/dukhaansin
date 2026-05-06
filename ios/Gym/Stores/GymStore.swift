import Foundation
import Observation

@MainActor
@Observable
final class GymStore {
    var workouts: [Workout] = []
    var exercises: [Exercise] = []
    var templates: [Template] = []
    var records: [PersonalRecord] = []
    var metrics: [BodyMetric] = []

    var loading: Bool = false
    var lastError: String?
    var newPRIDs: Set<UUID> = []

    private let api: GymAPI

    init(api: GymAPI = .shared) {
        self.api = api
    }

    // ─── Bulk fetch ──────────────────────────────────────────

    func fetchAll() async {
        loading = true
        lastError = nil
        defer { loading = false }
        do {
            async let w = api.fetchWorkouts()
            async let e = api.fetchExercises()
            async let t = api.fetchTemplates()
            async let r = api.fetchRecords()
            async let m = api.fetchMetrics()
            let (ww, ee, tt, rr, mm) = try await (w, e, t, r, m)
            workouts = ww
            exercises = ee.sorted { lhs, rhs in
                if lhs.trainingType == rhs.trainingType { return lhs.sortOrder < rhs.sortOrder }
                return lhs.trainingType.rawValue < rhs.trainingType.rawValue
            }
            templates = tt
            records = rr
            metrics = mm
        } catch {
            lastError = error.localizedDescription
        }
    }

    // ─── Workouts ───────────────────────────────────────────

    func recordWorkout(date: String,
                       trainingType: TrainingType,
                       notes: String?,
                       exercises: [LoggedExercise]) async -> WorkoutCreateResponse? {
        do {
            let resp = try await api.createWorkout(
                date: date,
                trainingType: trainingType,
                notes: notes,
                exercises: exercises
            )
            workouts.insert(resp.workout, at: 0)
            if !resp.newPRs.isEmpty {
                records.insert(contentsOf: resp.newPRs, at: 0)
                newPRIDs = Set(resp.newPRs.map(\.id))
            }
            return resp
        } catch {
            lastError = error.localizedDescription
            return nil
        }
    }

    func deleteWorkout(_ workout: Workout) async {
        do {
            try await api.deleteWorkout(id: workout.id)
            workouts.removeAll { $0.id == workout.id }
        } catch {
            lastError = error.localizedDescription
        }
    }

    // ─── Exercises ──────────────────────────────────────────

    func addExercise(name: String,
                     trainingType: TrainingType,
                     sets: Int?,
                     reps: String?,
                     restSeconds: Int?) async {
        do {
            let new = try await api.createExercise(
                name: name,
                trainingType: trainingType,
                sets: sets,
                reps: reps,
                restSeconds: restSeconds
            )
            exercises.append(new)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func updateExercise(_ exercise: Exercise) async {
        do {
            let updated = try await api.updateExercise(
                id: exercise.id,
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.restSeconds
            )
            if let idx = exercises.firstIndex(where: { $0.id == exercise.id }) {
                exercises[idx] = updated
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    func deleteExercise(_ exercise: Exercise) async {
        do {
            try await api.deleteExercise(id: exercise.id)
            exercises.removeAll { $0.id == exercise.id }
        } catch {
            lastError = error.localizedDescription
        }
    }

    // ─── Templates ─────────────────────────────────────────

    func saveTemplate(name: String, trainingType: TrainingType, exercises: [LoggedExercise]) async {
        do {
            let new = try await api.createTemplate(name: name, trainingType: trainingType, exercises: exercises)
            templates.insert(new, at: 0)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func deleteTemplate(_ template: Template) async {
        do {
            try await api.deleteTemplate(id: template.id)
            templates.removeAll { $0.id == template.id }
        } catch {
            lastError = error.localizedDescription
        }
    }

    // ─── Body metrics ───────────────────────────────────────

    func upsertMetric(date: String, weightKg: Double?, energyLevel: Int?, notes: String?) async {
        do {
            let updated = try await api.upsertMetric(
                date: date, weightKg: weightKg, energyLevel: energyLevel, notes: notes
            )
            if let idx = metrics.firstIndex(where: { $0.date == date }) {
                metrics[idx] = updated
            } else {
                metrics.insert(updated, at: 0)
                metrics.sort { $0.date > $1.date }
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    func deleteMetric(_ metric: BodyMetric) async {
        do {
            try await api.deleteMetric(id: metric.id)
            metrics.removeAll { $0.id == metric.id }
        } catch {
            lastError = error.localizedDescription
        }
    }

    // ─── PR celebration glow ────────────────────────────────

    func clearNewPRs() {
        newPRIDs = []
    }
}
