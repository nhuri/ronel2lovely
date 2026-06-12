-- Track whether a candidate without email has already received the "please update your email" SMS
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS no_email_sms_sent boolean NOT NULL DEFAULT false;
