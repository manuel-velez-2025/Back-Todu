CREATE SCHEMA IF NOT EXISTS geo;
SET search_path TO geo, public;

CREATE TABLE IF NOT EXISTS place_summaries (
  place_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  rating DOUBLE PRECISION,
  user_ratings_total INTEGER NOT NULL DEFAULT 0,
  types TEXT[] NOT NULL DEFAULT '{}',
  tip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_summaries_place_id ON place_summaries(place_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    CREATE ROLE rol_app_todu LOGIN PASSWORD 'CambiaEstaPassword2026';
  END IF;
END $$;

GRANT USAGE ON SCHEMA geo TO rol_app_todu;
GRANT SELECT, INSERT, UPDATE, DELETE ON place_summaries TO rol_app_todu;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    CREATE ROLE rol_reportes_todu LOGIN PASSWORD 'CambiaEstaPassword2026';
  END IF;
END $$;

GRANT USAGE ON SCHEMA geo TO rol_reportes_todu;
GRANT SELECT ON place_summaries TO rol_reportes_todu;
