SET search_path TO gamification, public;

CREATE TABLE IF NOT EXISTS recompensas_memorama (
  usuario_id UUID NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  veces INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, fecha)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON recompensas_memorama TO rol_app_todu;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    GRANT SELECT ON recompensas_memorama TO rol_reportes_todu;
  END IF;
END $$;