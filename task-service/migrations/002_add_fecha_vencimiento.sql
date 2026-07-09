SET search_path TO tasks, public;

ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMPTZ;
