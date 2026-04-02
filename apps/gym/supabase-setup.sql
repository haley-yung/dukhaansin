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
  -- Legs
  ('Squats', 'legs', 1),
  ('Leg Press', 'legs', 2),
  ('Lunges', 'legs', 3),
  ('Leg Curl', 'legs', 4),
  ('Leg Extension', 'legs', 5),
  ('Calf Raise', 'legs', 6),
  ('Hip Abduction', 'legs', 7),
  ('Hip Adduction', 'legs', 8),
  ('Romanian Deadlift', 'legs', 9),
  -- Pull
  ('Pull-ups', 'pull', 1),
  ('Lat Pulldown', 'pull', 2),
  ('Barbell Row', 'pull', 3),
  ('Seated Cable Row', 'pull', 4),
  ('Face Pull', 'pull', 5),
  ('Bicep Curl', 'pull', 6),
  ('Hammer Curl', 'pull', 7),
  ('Rear Delt Fly', 'pull', 8),
  -- Push
  ('Bench Press', 'push', 1),
  ('Overhead Press', 'push', 2),
  ('Incline Dumbbell Press', 'push', 3),
  ('Tricep Pushdown', 'push', 4),
  ('Lateral Raise', 'push', 5),
  ('Chest Fly', 'push', 6),
  ('Dips', 'push', 7),
  ('Skull Crushers', 'push', 8),
  -- Running
  ('Treadmill', 'running', 1),
  ('Outdoor Run', 'running', 2),
  ('Interval Sprints', 'running', 3),
  ('Hill Run', 'running', 4),
  ('Recovery Jog', 'running', 5);
