SET search_path TO gamification, public;

ALTER TABLE progreso
  ADD COLUMN IF NOT EXISTS xp_disponible INTEGER NOT NULL DEFAULT 0;

UPDATE progreso
SET xp_disponible = xp_total
WHERE xp_disponible = 0 AND xp_total > 0;
DROP PROCEDURE IF EXISTS sumar_xp_atomico(UUID, INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE PROCEDURE sumar_xp_atomico(
  p_usuario_id UUID,
  p_xp INTEGER,
  INOUT p_xp_total INTEGER DEFAULT NULL,
  INOUT p_subio_de_nivel BOOLEAN DEFAULT false,
  INOUT p_xp_ganado INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nivel_anterior INTEGER;
  v_nivel_nuevo INTEGER;
  v_racha_nueva INTEGER;
  v_multiplicador NUMERIC;
BEGIN
  INSERT INTO progreso (usuario_id, xp_total, xp_disponible, tareas_completadas, ultima_actividad)
  VALUES (p_usuario_id, 0, 0, 0, NULL)
  ON CONFLICT (usuario_id) DO NOTHING;

  SELECT
    calcular_nivel(xp_total),
    CASE
      WHEN ultima_actividad = CURRENT_DATE - INTERVAL '1 day' THEN racha_actual + 1
      WHEN ultima_actividad = CURRENT_DATE THEN GREATEST(racha_actual, 1)
      ELSE 1
    END
  INTO v_nivel_anterior, v_racha_nueva
  FROM progreso
  WHERE usuario_id = p_usuario_id
  FOR UPDATE;

  v_multiplicador := LEAST(1 + (v_racha_nueva * 0.1), 2.0);
  p_xp_ganado := ROUND(p_xp * v_multiplicador);

  UPDATE progreso
  SET xp_total = xp_total + p_xp_ganado,
      xp_disponible = xp_disponible + p_xp_ganado,
      tareas_completadas = tareas_completadas + 1,
      racha_actual = v_racha_nueva,
      ultima_actividad = CURRENT_DATE,
      updated_at = now()
  WHERE usuario_id = p_usuario_id
  RETURNING xp_total, calcular_nivel(xp_total) INTO p_xp_total, v_nivel_nuevo;

  p_subio_de_nivel := v_nivel_nuevo > v_nivel_anterior;
END;
$$;

CREATE OR REPLACE PROCEDURE gastar_xp_atomico(
  p_usuario_id UUID,
  p_monto INTEGER,
  INOUT p_xp_disponible INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo INTEGER;
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO';
  END IF;

  SELECT xp_disponible INTO v_saldo
  FROM progreso
  WHERE usuario_id = p_usuario_id
  FOR UPDATE;

  IF v_saldo IS NULL THEN
    RAISE EXCEPTION 'SIN_PROGRESO';
  END IF;

  IF v_saldo < p_monto THEN
    RAISE EXCEPTION 'SALDO_INSUFICIENTE';
  END IF;

  UPDATE progreso
  SET xp_disponible = xp_disponible - p_monto,
      updated_at = now()
  WHERE usuario_id = p_usuario_id
  RETURNING xp_disponible INTO p_xp_disponible;
END;
$$;

CREATE OR REPLACE PROCEDURE acreditar_xp_disponible(
  p_usuario_id UUID,
  p_monto INTEGER,
  INOUT p_xp_disponible INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO';
  END IF;

  INSERT INTO progreso (usuario_id, xp_total, xp_disponible, tareas_completadas)
  VALUES (p_usuario_id, 0, 0, 0)
  ON CONFLICT (usuario_id) DO NOTHING;

  UPDATE progreso
  SET xp_disponible = xp_disponible + p_monto,
      updated_at = now()
  WHERE usuario_id = p_usuario_id
  RETURNING xp_disponible INTO p_xp_disponible;
END;
$$;

CREATE TABLE IF NOT EXISTS partidas_farkle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  apuesta INTEGER NOT NULL CHECK (apuesta > 0),
  estado VARCHAR(10) NOT NULL DEFAULT 'en_curso',
  premio INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelta_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farkle_una_en_curso
  ON partidas_farkle (usuario_id)
  WHERE estado = 'en_curso';

CREATE INDEX IF NOT EXISTS idx_farkle_usuario
  ON partidas_farkle (usuario_id);

DROP VIEW IF EXISTS vista_progreso_nivel;
CREATE VIEW vista_progreso_nivel AS
SELECT
  usuario_id,
  xp_total,
  xp_disponible,
  calcular_nivel(xp_total) AS nivel,
  racha_actual,
  tareas_completadas
FROM progreso;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON partidas_farkle TO rol_app_todu;
    GRANT SELECT ON vista_progreso_nivel TO rol_app_todu;
    GRANT EXECUTE ON PROCEDURE sumar_xp_atomico(UUID, INTEGER, INTEGER, BOOLEAN, INTEGER) TO rol_app_todu;
    GRANT EXECUTE ON PROCEDURE gastar_xp_atomico(UUID, INTEGER, INTEGER) TO rol_app_todu;
    GRANT EXECUTE ON PROCEDURE acreditar_xp_disponible(UUID, INTEGER, INTEGER) TO rol_app_todu;
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    GRANT SELECT ON partidas_farkle, vista_progreso_nivel TO rol_reportes_todu;
  END IF;
END $$;