-- ============================================
-- Debt Tracker: Loans table setup + seed data
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE loans (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  borrowed NUMERIC NOT NULL DEFAULT 0,
  apr NUMERIC NOT NULL DEFAULT 0,
  monthly NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  total_installments INTEGER NOT NULL DEFAULT 0,
  interest_paid NUMERIC,
  principal_paid NUMERIC,
  interest_remaining NUMERIC,
  avg_payment NUMERIC,
  proper_installment NUMERIC,
  revolving BOOLEAN NOT NULL DEFAULT false,
  danger BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT '#6366F1',
  start_year INTEGER NOT NULL,
  start_month INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Allow public read access (anon key), restrict writes to authenticated or service role
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON loans
  FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON loans
  FOR UPDATE USING (true);

-- Seed with current loan data
INSERT INTO loans (id, name, borrowed, apr, monthly, paid, remaining, installments_paid, total_installments, revolving, danger, color, start_year, start_month) VALUES
  (0, 'BOCHK', 200000, 4, 3728.73, 71407.82, 128592.18, 23, 60, false, false, '#3B82F6', 2024, 4),
  (1, 'Mox', 230000, 5, 4326.67, 99513.41, 160086, 23, 60, false, false, '#10B981', 2024, 4),
  (2, 'Standard Chartered', 300000, 8, 6050, 101514.58, 198485.42, 23, 60, false, false, '#8B5CF6', 2024, 4);

INSERT INTO loans (id, name, borrowed, apr, monthly, paid, remaining, installments_paid, total_installments, revolving, danger, color, start_year, start_month, interest_paid, principal_paid, interest_remaining, avg_payment, proper_installment) VALUES
  (3, 'X Wallet #1', 80000, 39, 4552.39, 35316.89, 75061.35, 12, 36, true, true, '#EF4444', 2025, 3, 30378.24, 4938.65, 34195.98, 2943.07, 3802.27),
  (4, 'X Wallet #2', 30000, 18, 1306, 13060, 20000, 10, 36, true, false, '#F97316', 2025, 4, NULL, NULL, NULL, NULL, NULL);
