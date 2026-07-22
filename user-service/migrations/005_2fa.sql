SET search_path TO users, public;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_habilitado BOOLEAN NOT NULL DEFAULT false;