-- Track why a candidate profile was frozen/removed, and whether it was the
-- candidate or an admin who did it
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS removal_reason TEXT,
  ADD COLUMN IF NOT EXISTS removal_reason_other TEXT,
  ADD COLUMN IF NOT EXISTS removed_by TEXT;
