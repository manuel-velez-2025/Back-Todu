-- ============================================================
-- task-service — Esquema de base de datos
-- ============================================================

CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL, -- referencia lógica a usuarios (otra BD/servicio)
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  xp_valor INTEGER NOT NULL DEFAULT 10,
  estado VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | completed | rejected | vencida
  url_evidencia TEXT,
  proof_status VARCHAR(20),
  proof_reason TEXT,
  proof_confidence VARCHAR(20),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial de intentos de evidencia (una tarea puede intentarse
-- varias veces si la IA la rechaza) — separado de "tareas" para
-- no perder el registro de intentos rechazados.
CREATE TABLE IF NOT EXISTS historial_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  url_evidencia TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  reason TEXT,
  confidence VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- ÍNDICE: acelera GET /tareas/mis-tareas, que siempre filtra por
-- usuario_id (la consulta más frecuente de todo el servicio).
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_id ON tareas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_tarea_id ON historial_evidencias(tarea_id);

-- ------------------------------------------------------------
-- VISTA 2 (de las 2 que pide la materia, la 1a está en
-- user-service): reporte de tareas con su último intento de
-- evidencia. Usa INNER JOIN (variante distinta al LEFT JOIN de
-- la vista de user-service) contra una subconsulta que saca el
-- intento más reciente por tarea.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_tareas_con_evidencia AS
SELECT
  t.id AS tarea_id,
  t.usuario_id,
  t.titulo,
  t.xp_valor,
  t.estado,
  h.approved AS ultimo_intento_aprobado,
  h.reason AS ultimo_intento_razon,
  h.created_at AS ultimo_intento_fecha
FROM tareas t
INNER JOIN (
  SELECT DISTINCT ON (tarea_id) *
  FROM historial_evidencias
  ORDER BY tarea_id, created_at DESC
) h ON h.tarea_id = t.id;

-- ============================================================
-- Roles (mismo esquema de permisos que user-service, aplicado a
-- esta base de datos)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    CREATE ROLE rol_app_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_tasks TO rol_app_todu;
GRANT USAGE ON SCHEMA public TO rol_app_todu;
GRANT SELECT, INSERT, UPDATE, DELETE ON tareas, historial_evidencias TO rol_app_todu;
GRANT SELECT ON vista_tareas_con_evidencia TO rol_app_todu;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    CREATE ROLE rol_reportes_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_tasks TO rol_reportes_todu;
GRANT USAGE ON SCHEMA public TO rol_reportes_todu;
GRANT SELECT ON tareas, historial_evidencias, vista_tareas_con_evidencia TO rol_reportes_todu;
