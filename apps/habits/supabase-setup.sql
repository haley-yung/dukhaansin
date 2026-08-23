-- Habits Tracker — Supabase Setup
-- Run this in the Supabase SQL Editor (https://drlimemicsthqpwofytm.supabase.co)
-- Idempotent: safe to re-run.

-- Habit definitions
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkle',
  color TEXT NOT NULL DEFAULT 'blue',
  -- weekdays the habit is scheduled: 0=Sun … 6=Sat
  schedule JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  sort_order INT DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per habit per completed day
CREATE TABLE IF NOT EXISTS habit_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_checks_habit_date ON habit_checks(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_checks_date ON habit_checks(date DESC);

-- RLS: public read + write (single-user personal app)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON habits;
DROP POLICY IF EXISTS "public_all" ON habit_checks;
CREATE POLICY "public_all" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON habit_checks FOR ALL USING (true) WITH CHECK (true);
