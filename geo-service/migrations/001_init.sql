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
