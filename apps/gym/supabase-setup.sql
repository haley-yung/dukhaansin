-- Gym Tracker — Supabase Setup
-- Run this in the Supabase SQL Editor (https://drlimemicsthqpwofytm.supabase.co)

-- Exercise library
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  sets INT,
  reps TEXT,
  rest_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  training_type TEXT NOT NULL,
  notes TEXT DEFAULT '',
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved workout templates
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal records
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  date DATE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Body metrics
CREATE TABLE body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight_kg NUMERIC,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workouts_date ON workouts(date DESC);
CREATE INDEX idx_workouts_training_type ON workouts(training_type);
CREATE INDEX idx_personal_records_exercise ON personal_records(exercise_name);
CREATE INDEX idx_body_metrics_date ON body_metrics(date DESC);

-- RLS: public read + write (single-user personal app)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON workouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON personal_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON body_metrics FOR ALL USING (true) WITH CHECK (true);

-- Seed default exercises (sets/reps/rest are optional — configurable in Settings)
INSERT INTO exercises (name, training_type, sort_order, sets, reps, rest_seconds) VALUES
  -- Push + Run
  ('Chest Press',        'push_run', 1, 3, '10-12', 90),
  ('Pec Deck Fly',       'push_run', 2, 3, '12',    60),
  ('Shoulder Press',     'push_run', 3, 3, '10-12', 90),
  ('Lateral Raise',      'push_run', 4, 3, '12-15', 60),
  ('Tricep Pushdown',    'push_run', 5, 3, '12-15', 60),
  ('Treadmill Run',      'push_run', 6, NULL, '15 min easy', NULL),
  -- Leg Day
  ('Leg Press',          'leg_day', 1, 4, '10-12', 120),
  ('Leg Extension',      'leg_day', 2, 3, '12-15', 60),
  -- Pull + Run
  ('Lat Pulldown',       'pull_run', 1, 3, '10-12', 90),
  ('Seated Cable Row',   'pull_run', 2, 3, '10-12', 90),
  ('Rear Delt Fly',      'pull_run', 3, 3, '12-15', 60),
  ('Bicep Curl',         'pull_run', 4, 3, '12',    60),
  ('Face Pull',          'pull_run', 5, 3, '15',    60),
  ('Treadmill Run',      'pull_run', 6, NULL, '15 min easy', NULL);
