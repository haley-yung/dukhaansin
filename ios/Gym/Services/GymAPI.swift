import Foundation

struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { "API \(status): \(message)" }
}

struct WorkoutCreateResponse: Decodable {
    let workout: Workout
    let newPRs: [PersonalRecord]
}

struct ExportPayload: Codable {
    var workouts: [Workout]
    var exercises: [Exercise]
    var templates: [Template]
    var personalRecords: [PersonalRecord]
    var bodyMetrics: [BodyMetric]
}

actor GymAPI {
    static let shared = GymAPI()

    private let base: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(base: URL = Secrets.apiBase, session: URLSession = .shared) {
        self.base = base
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
        self.encoder.outputFormatting = []
    }

    // ─── Workouts ──────────────────────────────────────────────

    func fetchWorkouts() async throws -> [Workout] {
        try await get([Workout].self, resource: "workouts")
    }

    func createWorkout(date: String,
                       trainingType: TrainingType,
                       notes: String?,
                       exercises: [LoggedExercise]) async throws -> WorkoutCreateResponse {
        let body = WorkoutCreateRequest(
            date: date,
            trainingType: trainingType,
            notes: notes,
            exercises: exercises
        )
        return try await send(WorkoutCreateResponse.self, method: "POST", resource: "workouts", body: body)
    }

    func deleteWorkout(id: UUID) async throws {
        try await sendVoid(method: "DELETE", resource: "workouts", id: id.uuidString)
    }

    // ─── Exercises ─────────────────────────────────────────────

    func fetchExercises() async throws -> [Exercise] {
        try await get([Exercise].self, resource: "exercises")
    }

    func createExercise(name: String,
                        trainingType: TrainingType,
                        sets: Int?,
                        reps: String?,
                        restSeconds: Int?) async throws -> Exercise {
        let body = ExerciseCreateRequest(
            name: name,
            trainingType: trainingType,
            sets: sets,
            reps: reps,
            restSeconds: restSeconds
        )
        return try await send(Exercise.self, method: "POST", resource: "exercises", body: body)
    }

    func updateExercise(id: UUID,
                        name: String?,
                        sets: Int?,
                        reps: String?,
                        restSeconds: Int?) async throws -> Exercise {
        let body = ExerciseUpdateRequest(name: name, sets: sets, reps: reps, restSeconds: restSeconds)
        return try await send(Exercise.self, method: "PUT", resource: "exercises", id: id.uuidString, body: body)
    }

    func deleteExercise(id: UUID) async throws {
        try await sendVoid(method: "DELETE", resource: "exercises", id: id.uuidString)
    }

    // ─── Templates ─────────────────────────────────────────────

    func fetchTemplates() async throws -> [Template] {
        try await get([Template].self, resource: "templates")
    }

    func createTemplate(name: String,
                        trainingType: TrainingType,
                        exercises: [LoggedExercise]) async throws -> Template {
        let body = TemplateCreateRequest(name: name, trainingType: trainingType, exercises: exercises)
        return try await send(Template.self, method: "POST", resource: "templates", body: body)
    }

    func deleteTemplate(id: UUID) async throws {
        try await sendVoid(method: "DELETE", resource: "templates", id: id.uuidString)
    }

    // ─── Records ───────────────────────────────────────────────

    func fetchRecords() async throws -> [PersonalRecord] {
        try await get([PersonalRecord].self, resource: "records")
    }

    // ─── Body metrics ─────────────────────────────────────────

    func fetchMetrics() async throws -> [BodyMetric] {
        try await get([BodyMetric].self, resource: "metrics")
    }

    func upsertMetric(date: String,
                      weightKg: Double?,
                      energyLevel: Int?,
                      notes: String?) async throws -> BodyMetric {
        let body = MetricUpsertRequest(date: date, weightKg: weightKg, energyLevel: energyLevel, notes: notes)
        return try await send(BodyMetric.self, method: "POST", resource: "metrics", body: body)
    }

    func deleteMetric(id: UUID) async throws {
        try await sendVoid(method: "DELETE", resource: "metrics", id: id.uuidString)
    }

    // ─── Export / import ──────────────────────────────────────

    func exportAll() async throws -> ExportPayload {
        try await get(ExportPayload.self, resource: "export")
    }

    func importAll(_ payload: ExportPayload) async throws {
        try await sendVoid(method: "POST", resource: "import", body: payload)
    }

    // ─── Internal: low-level HTTP ─────────────────────────────

    private func get<T: Decodable>(_ type: T.Type, resource: String, id: String? = nil) async throws -> T {
        let (data, _) = try await perform(method: "GET", resource: resource, id: id, body: Optional<EmptyBody>.none)
        return try decoder.decode(T.self, from: data)
    }

    private func send<Req: Encodable, Res: Decodable>(_ type: Res.Type,
                                                      method: String,
                                                      resource: String,
                                                      id: String? = nil,
                                                      body: Req) async throws -> Res {
        let (data, _) = try await perform(method: method, resource: resource, id: id, body: body)
        return try decoder.decode(Res.self, from: data)
    }

    private func sendVoid(method: String,
                          resource: String,
                          id: String? = nil,
                          body: (some Encodable)? = Optional<EmptyBody>.none) async throws {
        _ = try await perform(method: method, resource: resource, id: id, body: body)
    }

    private func perform(method: String,
                         resource: String,
                         id: String?,
                         body: (some Encodable)?) async throws -> (Data, HTTPURLResponse) {
        var components = URLComponents(url: base.appendingPathComponent("/api/app/gym"),
                                       resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "resource", value: resource)]
        if let id { items.append(URLQueryItem(name: "id", value: id)) }
        components.queryItems = items

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(status: -1, message: "Non-HTTP response")
        }

        if !(200..<300).contains(http.statusCode) {
            let message = (try? decoder.decode(APIErrorBody.self, from: data).error) ?? String(data: data, encoding: .utf8) ?? "Unknown"
            throw APIError(status: http.statusCode, message: message)
        }

        return (data, http)
    }
}

// MARK: - Request bodies

private struct EmptyBody: Encodable {}

private struct APIErrorBody: Decodable { let error: String }

private struct WorkoutCreateRequest: Encodable {
    let date: String
    let trainingType: TrainingType
    let notes: String?
    let exercises: [LoggedExercise]
}

private struct ExerciseCreateRequest: Encodable {
    let name: String
    let trainingType: TrainingType
    let sets: Int?
    let reps: String?
    let restSeconds: Int?
}

private struct ExerciseUpdateRequest: Encodable {
    let name: String?
    let sets: Int?
    let reps: String?
    let restSeconds: Int?
}

private struct TemplateCreateRequest: Encodable {
    let name: String
    let trainingType: TrainingType
    let exercises: [LoggedExercise]
}

private struct MetricUpsertRequest: Encodable {
    let date: String
    let weightKg: Double?
    let energyLevel: Int?
    let notes: String?
}
