const { supabase } = require('../_utils/supabase');

// snake_case <-> camelCase helpers
function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

function rowToCamel(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamel(k)] = v;
  }
  return out;
}

function rowToSnake(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[toSnake(k)] = v;
  }
  return out;
}

function rowsToCamel(rows) {
  return (rows || []).map(rowToCamel);
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const app = req.query.app;

  try {
    switch (app) {
      case 'gym': return await handleGym(req, res);
      case 'habits': return await handleHabitsApp(req, res);
      default: return res.status(404).json({ error: `Unknown app: ${app}` });
    }
  } catch (err) {
    console.error(`App API error (${app}):`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ══════════════════════════════════════════════════════════════
//  GYM TRACKER
// ══════════════════════════════════════════════════════════════

async function handleGym(req, res) {
  const resource = req.query.resource;
  if (!resource) return res.status(400).json({ error: 'Missing resource query parameter' });

  switch (resource) {
    case 'workouts': return await handleWorkouts(req, res);
    case 'exercises': return await handleExercises(req, res);
    case 'templates': return await handleTemplates(req, res);
    case 'records': return await handleRecords(req, res);
    case 'metrics': return await handleMetrics(req, res);
    case 'export': return await handleExport(req, res);
    case 'import': return await handleImport(req, res);
    default: return res.status(400).json({ error: `Unknown resource: ${resource}` });
  }
}

// ── Workouts ──────────────────────────────────────────────

async function handleWorkouts(req, res) {
  if (req.method === 'GET') {
    const id = req.query.id;
    if (id) {
      const { data, error } = await supabase.from('workouts').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: 'Workout not found' });
      return res.json(rowToCamel(data));
    }
    const { data, error } = await supabase.from('workouts').select('*').order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  if (req.method === 'POST') {
    const { date, trainingType, notes, exercises } = req.body || {};
    if (!date || !trainingType) return res.status(400).json({ error: 'date and trainingType are required' });

    const { data: workout, error } = await supabase.from('workouts').insert({
      date,
      training_type: trainingType,
      notes: notes || null,
      exercises: exercises || [],
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Auto-detect PRs
    const newPRs = [];
    if (Array.isArray(exercises)) {
      for (const exercise of exercises) {
        const exName = exercise.name;
        if (!exName) continue;

        let bestWeight = 0;
        let bestReps = 0;
        for (const set of (exercise.sets || [])) {
          const w = parseFloat(set.weight) || 0;
          if (w > bestWeight) {
            bestWeight = w;
            bestReps = parseInt(set.reps) || 0;
          }
        }
        if (bestWeight <= 0) continue;

        const { data: currentPR } = await supabase
          .from('personal_records')
          .select('weight')
          .eq('exercise_name', exName)
          .order('weight', { ascending: false })
          .limit(1)
          .single();

        const currentMax = currentPR ? parseFloat(currentPR.weight) : 0;
        if (bestWeight > currentMax) {
          const { data: pr, error: prError } = await supabase.from('personal_records').insert({
            exercise_name: exName,
            weight: bestWeight,
            reps: bestReps,
            date,
            workout_id: workout.id,
          }).select().single();
          if (!prError && pr) newPRs.push(rowToCamel(pr));
        }
      }
    }

    return res.status(201).json({ ok: true, workout: rowToCamel(workout), newPRs });
  }

  if (req.method === 'PUT') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { exercises, notes } = req.body || {};

    const updates = {};
    if (exercises !== undefined) updates.exercises = exercises;
    if (notes !== undefined) updates.notes = notes;

    const { data: workout, error } = await supabase.from('workouts')
      .update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Auto-detect PRs from updated exercises
    const newPRs = [];
    if (Array.isArray(exercises)) {
      for (const exercise of exercises) {
        const exName = exercise.name;
        if (!exName) continue;

        let bestWeight = 0;
        let bestReps = 0;
        for (const set of (exercise.sets || [])) {
          const w = parseFloat(set.weight) || 0;
          if (w > bestWeight) {
            bestWeight = w;
            bestReps = parseInt(set.reps) || 0;
          }
        }
        if (bestWeight <= 0) continue;

        const { data: currentPR } = await supabase
          .from('personal_records')
          .select('weight')
          .eq('exercise_name', exName)
          .order('weight', { ascending: false })
          .limit(1)
          .single();

        const currentMax = currentPR ? parseFloat(currentPR.weight) : 0;
        if (bestWeight > currentMax) {
          const { data: pr, error: prError } = await supabase.from('personal_records').insert({
            exercise_name: exName,
            weight: bestWeight,
            reps: bestReps,
            date: workout.date,
            workout_id: workout.id,
          }).select().single();
          if (!prError && pr) newPRs.push(rowToCamel(pr));
        }
      }
    }

    return res.json({ ok: true, workout: rowToCamel(workout), newPRs });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Exercises ─────────────────────────────────────────────

async function handleExercises(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('training_type')
      .order('sort_order');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  if (req.method === 'POST') {
    const { name, trainingType, sets, reps, restSeconds } = req.body || {};
    if (!name || !trainingType) return res.status(400).json({ error: 'name and trainingType are required' });

    const { data: existing } = await supabase
      .from('exercises')
      .select('sort_order')
      .eq('training_type', trainingType)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = existing ? (existing.sort_order || 0) + 1 : 0;

    const row = {
      name,
      training_type: trainingType,
      sort_order: sortOrder,
    };
    if (sets != null && sets !== '') row.sets = parseInt(sets, 10) || null;
    if (reps != null && reps !== '') row.reps = String(reps);
    if (restSeconds != null && restSeconds !== '') row.rest_seconds = parseInt(restSeconds, 10) || null;

    const { data, error } = await supabase.from('exercises').insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(rowToCamel(data));
  }

  if (req.method === 'PUT') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { name, sets, reps, restSeconds } = req.body || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (sets !== undefined) updates.sets = sets === '' || sets == null ? null : parseInt(sets, 10);
    if (reps !== undefined) updates.reps = reps === '' || reps == null ? null : String(reps);
    if (restSeconds !== undefined) updates.rest_seconds = restSeconds === '' || restSeconds == null ? null : parseInt(restSeconds, 10);

    const { data, error } = await supabase.from('exercises').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowToCamel(data));
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Templates ─────────────────────────────────────────────

async function handleTemplates(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  if (req.method === 'POST') {
    const { name, trainingType, exercises } = req.body || {};
    if (!name || !trainingType) return res.status(400).json({ error: 'name and trainingType are required' });

    const { data, error } = await supabase.from('templates').insert({
      name,
      training_type: trainingType,
      exercises: exercises || [],
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(rowToCamel(data));
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Personal Records ──────────────────────────────────────

async function handleRecords(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(rowsToCamel(data));
}

// ── Body Metrics ──────────────────────────────────────────

async function handleMetrics(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  if (req.method === 'POST') {
    const { date, weightKg, energyLevel, notes } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date is required' });

    const { data, error } = await supabase.from('body_metrics').upsert({
      date,
      weight_kg: weightKg != null ? weightKg : null,
      energy_level: energyLevel != null ? energyLevel : null,
      notes: notes || null,
    }, { onConflict: 'date' }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(rowToCamel(data));
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('body_metrics').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Export ─────────────────────────────────────────────────

async function handleExport(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [workouts, exercises, templates, records, metrics] = await Promise.all([
    supabase.from('workouts').select('*').order('date', { ascending: false }),
    supabase.from('exercises').select('*').order('training_type').order('sort_order'),
    supabase.from('templates').select('*'),
    supabase.from('personal_records').select('*').order('date', { ascending: false }),
    supabase.from('body_metrics').select('*').order('date', { ascending: false }),
  ]);

  for (const result of [workouts, exercises, templates, records, metrics]) {
    if (result.error) return res.status(500).json({ error: result.error.message });
  }

  return res.json({
    workouts: rowsToCamel(workouts.data),
    exercises: rowsToCamel(exercises.data),
    templates: rowsToCamel(templates.data),
    personalRecords: rowsToCamel(records.data),
    bodyMetrics: rowsToCamel(metrics.data),
  });
}

// ══════════════════════════════════════════════════════════════
//  HABITS TRACKER
// ══════════════════════════════════════════════════════════════

async function handleHabitsApp(req, res) {
  const resource = req.query.resource;
  if (!resource) return res.status(400).json({ error: 'Missing resource query parameter' });

  switch (resource) {
    case 'habits': return await handleHabits(req, res);
    case 'checks': return await handleChecks(req, res);
    case 'reorder': return await handleHabitsReorder(req, res);
    case 'export': return await handleHabitsExport(req, res);
    case 'import': return await handleHabitsImport(req, res);
    default: return res.status(400).json({ error: `Unknown resource: ${resource}` });
  }
}

// ── Habits ────────────────────────────────────────────────

const HABIT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return HABIT_WEEKDAYS;
  const days = [...new Set(schedule.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6))].sort();
  return days.length ? days : HABIT_WEEKDAYS;
}

async function handleHabits(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  if (req.method === 'POST') {
    const { name, icon, color, schedule } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const { data: existing } = await supabase
      .from('habits')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    const sortOrder = existing ? (existing.sort_order || 0) + 1 : 0;

    const { data, error } = await supabase.from('habits').insert({
      name: name.trim(),
      icon: icon || 'sparkle',
      color: color || 'blue',
      schedule: normalizeSchedule(schedule),
      sort_order: sortOrder,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(rowToCamel(data));
  }

  if (req.method === 'PUT') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { name, icon, color, schedule, archived, sortOrder } = req.body || {};

    const updates = {};
    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name.trim();
    }
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (schedule !== undefined) updates.schedule = normalizeSchedule(schedule);
    if (archived !== undefined) updates.archived = !!archived;
    if (sortOrder !== undefined) updates.sort_order = parseInt(sortOrder, 10) || 0;

    const { data, error } = await supabase.from('habits').update(updates).eq('id', id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Habit not found' });
    return res.json(rowToCamel(data));
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Checks (one row per habit per completed day) ──────────

async function handleChecks(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('habit_checks')
      .select('id, habit_id, date')
      .order('date');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rowsToCamel(data));
  }

  // POST sets or toggles a day.
  // With body.checked (boolean): idempotent set — safe to retry, converges.
  // Without it: legacy toggle behavior.
  if (req.method === 'POST') {
    const { habitId, date, checked } = req.body || {};
    if (!habitId || !date) return res.status(400).json({ error: 'habitId and date are required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

    if (checked === true) {
      const { error } = await supabase.from('habit_checks').insert({ habit_id: habitId, date });
      if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
      return res.status(201).json({ ok: true, checked: true });
    }
    if (checked === false) {
      const { error } = await supabase.from('habit_checks').delete().eq('habit_id', habitId).eq('date', date);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, checked: false });
    }

    const { data: existing, error: findError } = await supabase
      .from('habit_checks')
      .select('id')
      .eq('habit_id', habitId)
      .eq('date', date)
      .maybeSingle();
    if (findError) return res.status(500).json({ error: findError.message });

    if (existing) {
      const { error } = await supabase.from('habit_checks').delete().eq('id', existing.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, checked: false });
    }

    const { data, error } = await supabase.from('habit_checks').insert({
      habit_id: habitId,
      date,
    }).select('id, habit_id, date').single();
    if (error) {
      // unique(habit_id, date) race: a concurrent toggle already inserted it
      if (error.code === '23505') return res.json({ ok: true, checked: true });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ ok: true, checked: true, check: rowToCamel(data) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Reorder ───────────────────────────────────────────────

async function handleHabitsReorder(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from('habits').update({ sort_order: i }).eq('id', ids[i]);
    if (error) return res.status(500).json({ error: error.message });
  }
  return res.json({ ok: true });
}

// ── Export / Import ───────────────────────────────────────

async function handleHabitsExport(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [habits, checks] = await Promise.all([
    supabase.from('habits').select('*').order('sort_order'),
    supabase.from('habit_checks').select('*').order('date'),
  ]);
  for (const result of [habits, checks]) {
    if (result.error) return res.status(500).json({ error: result.error.message });
  }
  return res.json({
    habits: rowsToCamel(habits.data),
    habitChecks: rowsToCamel(checks.data),
  });
}

async function handleHabitsImport(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { habits, habitChecks } = req.body || {};

  // Validate the whole payload BEFORE touching existing data — the wipe below
  // is destructive and non-transactional.
  if (!Array.isArray(habits) || !Array.isArray(habitChecks)) {
    return res.status(400).json({ error: 'Invalid import payload: habits and habitChecks arrays are required' });
  }
  for (const h of habits) {
    if (!h || !h.id || !h.name) return res.status(400).json({ error: 'Invalid habit row in import payload' });
  }
  for (const c of habitChecks) {
    if (!c || !(c.habitId || c.habit_id) || !c.date) {
      return res.status(400).json({ error: 'Invalid habit check row in import payload' });
    }
  }

  for (const table of ['habit_checks', 'habits']) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ error: `Failed to clear ${table}: ${error.message}` });
  }

  const counts = {};
  for (const { table, rows } of [
    { table: 'habits', rows: habits },
    { table: 'habit_checks', rows: habitChecks },
  ]) {
    if (!Array.isArray(rows) || rows.length === 0) {
      counts[table] = 0;
      continue;
    }
    const snakeRows = rows.map(rowToSnake);
    const { error } = await supabase.from(table).insert(snakeRows);
    if (error) return res.status(500).json({ error: `Failed to import ${table}: ${error.message}` });
    counts[table] = rows.length;
  }

  return res.json({ ok: true, imported: counts });
}

// ── Import ────────────────────────────────────────────────

async function handleImport(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { workouts, exercises, templates, personalRecords, bodyMetrics } = req.body || {};

  const tables = ['personal_records', 'body_metrics', 'workouts', 'templates', 'exercises'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ error: `Failed to clear ${table}: ${error.message}` });
  }

  const inserts = [
    { table: 'exercises', rows: exercises },
    { table: 'templates', rows: templates },
    { table: 'workouts', rows: workouts },
    { table: 'personal_records', rows: personalRecords },
    { table: 'body_metrics', rows: bodyMetrics },
  ];

  const counts = {};
  for (const { table, rows } of inserts) {
    if (!Array.isArray(rows) || rows.length === 0) {
      counts[table] = 0;
      continue;
    }
    const snakeRows = rows.map(rowToSnake);
    const { error } = await supabase.from(table).insert(snakeRows);
    if (error) return res.status(500).json({ error: `Failed to import ${table}: ${error.message}` });
    counts[table] = rows.length;
  }

  return res.json({ ok: true, imported: counts });
}
