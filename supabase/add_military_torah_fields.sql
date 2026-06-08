-- Add military_service and torah_education columns to candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS military_service TEXT,
  ADD COLUMN IF NOT EXISTS torah_education TEXT;
