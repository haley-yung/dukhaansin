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
      case 'debt': return await handleDebt(req, res);
      case 'gym': return await handleGym(req, res);
      default: return res.status(404).json({ error: `Unknown app: ${app}` });
    }
  } catch (err) {
    console.error(`App API error (${app}):`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ══════════════════════════════════════════════════════════════
//  DEBT TRACKER
// ══════════════════════════════════════════════════════════════

async function handleDebt(req, res) {
  // GET /api/app/debt — list all loans
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('loans').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });

    const loans = data.map(row => ({
      id: row.id,
      name: row.name,
      borrowed: Number(row.borrowed),
      apr: Number(row.apr),
      monthly: Number(row.monthly),
      paid: Number(row.paid),
      remaining: Number(row.remaining),
      installmentsPaid: row.installments_paid,
      totalInstallments: row.total_installments,
      interestPaid: row.interest_paid ? Number(row.interest_paid) : undefined,
      principalPaid: row.principal_paid ? Number(row.principal_paid) : undefined,
      interestRemaining: row.interest_remaining ? Number(row.interest_remaining) : undefined,
      avgPayment: row.avg_payment ? Number(row.avg_payment) : undefined,
      properInstallment: row.proper_installment ? Number(row.proper_installment) : undefined,
      revolving: row.revolving,
      danger: row.danger,
      color: row.color,
      startYear: row.start_year,
      startMonth: row.start_month,
    }));

    return res.json({ loans });
  }

  // PUT /api/app/debt — pay or undo
  if (req.method === 'PUT') {
    const { action, loanId, previous } = req.body || {};
    const id = parseInt(loanId, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid loanId' });

    if (action === 'pay') {
      const { data: loan, error: fetchErr } = await supabase
        .from('loans').select('*').eq('id', id).single();

      if (fetchErr || !loan) return res.status(404).json({ error: 'Loan not found' });
      if (loan.installments_paid >= loan.total_installments || Number(loan.remaining) <= 0) {
        return res.status(400).json({ error: 'Loan already fully paid' });
      }

      const remaining = Number(loan.remaining);
      const monthly = Number(loan.monthly);
      const apr = Number(loan.apr);
      const interest = remaining * (apr / 100 / 12);
      const principal = Math.max(monthly - interest, 0);

      const updates = {
        installments_paid: loan.installments_paid + 1,
        paid: Math.round((Number(loan.paid) + monthly) * 100) / 100,
        remaining: Math.max(Math.round((remaining - principal) * 100) / 100, 0),
      };

      const { error: updateErr } = await supabase.from('loans').update(updates).eq('id', id);
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      return res.json({
        ok: true,
        previous: { installmentsPaid: loan.installments_paid, paid: Number(loan.paid), remaining },
      });
    }

    if (action === 'undo') {
      if (!previous || previous.installmentsPaid == null || previous.paid == null || previous.remaining == null) {
        return res.status(400).json({ error: 'Previous state required' });
      }

      const { error } = await supabase.from('loans').update({
        installments_paid: previous.installmentsPaid,
        paid: previous.paid,
        remaining: previous.remaining,
      }).eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

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
    const { name, trainingType } = req.body || {};
    if (!name || !trainingType) return res.status(400).json({ error: 'name and trainingType are required' });

    const { data: existing } = await supabase
      .from('exercises')
      .select('sort_order')
      .eq('training_type', trainingType)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = existing ? (existing.sort_order || 0) + 1 : 0;

    const { data, error } = await supabase.from('exercises').insert({
      name,
      training_type: trainingType,
      sort_order: sortOrder,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(rowToCamel(data));
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
