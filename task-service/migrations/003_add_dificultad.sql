SET search_path TO tasks, public;

ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS dificultad VARCHAR(10) NOT NULL DEFAULT 'easy';
