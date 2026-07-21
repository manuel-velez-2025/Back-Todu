SET search_path TO tasks, public;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS dias_semana SMALLINT[];
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS hora_recordatorio TIME;

CREATE TABLE IF NOT EXISTS recordatorios_enviados (
  tarea_id UUID NOT NULL,
  fecha DATE NOT NULL,
  PRIMARY KEY (tarea_id, fecha)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON recordatorios_enviados TO rol_app_todu;
  END IF;
END $$;