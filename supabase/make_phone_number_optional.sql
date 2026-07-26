-- Ambassador-managed candidates no longer collect the candidate's own phone_number
-- (all communication goes through the ambassador's contact_person_phone/email instead),
-- so phone_number can no longer be guaranteed non-null.
ALTER TABLE candidates
  ALTER COLUMN phone_number DROP NOT NULL;
