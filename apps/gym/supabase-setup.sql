-- Gym Tracker — Supabase Setup
-- Run this in the Supabase SQL Editor (https://drlimemicsthqpwofytm.supabase.co)

-- Exercise library
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  sort_order INT DEFAULT 0,
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

-- Seed default exercises
INSERT INTO exercises (name, training_type, sort_order) VALUES
  -- Push + Run
  ('Arm Circles + Band Pull-Aparts (Warm-up)', 'push_run', 0),
  ('Chest Press', 'push_run', 1),
  ('Pec Deck Fly', 'push_run', 2),
  ('Shoulder Press', 'push_run', 3),
  ('Lateral Raise', 'push_run', 4),
  ('Tricep Pushdown', 'push_run', 5),
  ('Treadmill Run', 'push_run', 6),
  -- Lower A: Quad Focus
  ('Bodyweight Squats + Leg Swings (Warm-up)', 'lower_a', 0),
  ('Leg Press', 'lower_a', 1),
  ('Leg Extension', 'lower_a', 2),
  ('Walking Lunges', 'lower_a', 3),
  ('Calf Raise', 'lower_a', 4),
  ('Plank', 'lower_a', 5),
  -- Pull + Run
  ('Shoulder Rolls + Light Cable Pulldown (Warm-up)', 'pull_run', 0),
  ('Lat Pulldown', 'pull_run', 1),
  ('Seated Cable Row', 'pull_run', 2),
  ('Rear Delt Fly', 'pull_run', 3),
  ('Bicep Curl', 'pull_run', 4),
  ('Face Pull', 'pull_run', 5),
  ('Treadmill Run', 'pull_run', 6),
  -- Lower B: Posterior Chain
  ('Glute Bridge + Hip Circles (Warm-up)', 'lower_b', 0),
  ('Romanian Deadlift', 'lower_b', 1),
  ('Leg Curl', 'lower_b', 2),
  ('Hip Thrust', 'lower_b', 3),
  ('Hip Abductor', 'lower_b', 4),
  ('Dead Bug', 'lower_b', 5);
