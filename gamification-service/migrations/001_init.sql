-- ============================================================
-- gamification-service — Esquema de base de datos
-- (incluye lo que antes era robot-service: expresión/accesorio
-- del avatar, ya que ambos módulos se llamaban entre sí en cada
-- evento y hoy viven como llamadas de función internas, no HTTP)
-- ============================================================

CREATE TABLE IF NOT EXISTS progreso (
  usuario_id UUID PRIMARY KEY,
  xp_total INTEGER NOT NULL DEFAULT 0,
  racha_actual INTEGER NOT NULL DEFAULT 0,
  tareas_completadas INTEGER NOT NULL DEFAULT 0,
  ultima_actividad DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado del avatar (antes en robot-service, hoy es solo otra
-- tabla dentro del mismo servicio de gamificación)
CREATE TABLE IF NOT EXISTS avatar_estado (
  usuario_id UUID PRIMARY KEY,
  expression VARCHAR(20) NOT NULL DEFAULT 'Smiling',
  accessory VARCHAR(20) NOT NULL DEFAULT 'None',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progreso_usuario_id ON progreso(usuario_id);

-- ------------------------------------------------------------
-- FUNCIÓN 2 (la 1a está en user-service): calcula el nivel a
-- partir del XP total, con la misma fórmula que ya usaba el
-- servicio (Nivel = floor(sqrt(XP)/10)) — ahora vive en la BD
-- para poder usarse directo en consultas/reportes, no solo
-- calculada en el código de la aplicación.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_nivel(p_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(p_xp) / 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vista de progreso legible (usa la función de arriba), práctica
-- para reportes rápidos por SQL directo sin pasar por la app.
CREATE OR REPLACE VIEW vista_progreso_nivel AS
SELECT
  usuario_id,
  xp_total,
  calcular_nivel(xp_total) AS nivel,
  racha_actual,
  tareas_completadas
FROM progreso;

-- ------------------------------------------------------------
-- PROCEDIMIENTO 2 (el 1o está en user-service): suma XP de forma
-- atómica con bloqueo de fila (SELECT ... FOR UPDATE), evitando
-- la condición de carrera que antes se manejaba a mano desde
-- TypeScript en dos pasos separados (leer, luego escribir).
-- ------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sumar_xp_atomico(
  p_usuario_id UUID,
  p_xp INTEGER,
  INOUT p_xp_total INTEGER DEFAULT NULL,
  INOUT p_subio_de_nivel BOOLEAN DEFAULT false
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nivel_anterior INTEGER;
  v_nivel_nuevo INTEGER;
BEGIN
  -- Bloquea la fila del usuario hasta que termine esta transacción,
  -- así dos peticiones simultáneas de XP nunca se pisan entre sí.
  INSERT INTO progreso (usuario_id, xp_total, tareas_completadas, ultima_actividad)
  VALUES (p_usuario_id, 0, 0, CURRENT_DATE)
  ON CONFLICT (usuario_id) DO NOTHING;

  SELECT calcular_nivel(xp_total) INTO v_nivel_anterior
  FROM progreso WHERE usuario_id = p_usuario_id FOR UPDATE;

  UPDATE progreso
  SET xp_total = xp_total + p_xp,
      tareas_completadas = tareas_completadas + 1,
      racha_actual = CASE
        WHEN ultima_actividad = CURRENT_DATE - INTERVAL '1 day' THEN racha_actual + 1
        WHEN ultima_actividad = CURRENT_DATE THEN racha_actual
        ELSE 1
      END,
      ultima_actividad = CURRENT_DATE,
      updated_at = now()
  WHERE usuario_id = p_usuario_id
  RETURNING xp_total, calcular_nivel(xp_total) INTO p_xp_total, v_nivel_nuevo;

  p_subio_de_nivel := v_nivel_nuevo > v_nivel_anterior;
END;
$$;

-- ============================================================
-- Roles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    CREATE ROLE rol_app_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_gamification TO rol_app_todu;
GRANT USAGE ON SCHEMA public TO rol_app_todu;
GRANT SELECT, INSERT, UPDATE, DELETE ON progreso, avatar_estado TO rol_app_todu;
GRANT SELECT ON vista_progreso_nivel TO rol_app_todu;
GRANT EXECUTE ON FUNCTION calcular_nivel(INTEGER) TO rol_app_todu;
GRANT EXECUTE ON PROCEDURE sumar_xp_atomico(UUID, INTEGER, INTEGER, BOOLEAN) TO rol_app_todu;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    CREATE ROLE rol_reportes_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_gamification TO rol_reportes_todu;
GRANT USAGE ON SCHEMA public TO rol_reportes_todu;
GRANT SELECT ON progreso, avatar_estado, vista_progreso_nivel TO rol_reportes_todu;
