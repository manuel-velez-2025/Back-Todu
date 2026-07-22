SET search_path TO tasks, public;

CREATE TABLE IF NOT EXISTS historial_fijas_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  fecha DATE NOT NULL,
  estado_final VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tarea_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_historial_fijas_usuario_fecha
  ON historial_fijas_diario (usuario_id, fecha DESC);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON historial_fijas_diario TO rol_app_todu;
  END IF;
END $$;