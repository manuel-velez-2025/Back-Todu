CREATE OR REPLACE FUNCTION dias_restantes_prueba(p_fecha_registro TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  dias_restantes INTEGER;
BEGIN
  dias_restantes := 20 - (EXTRACT(DAY FROM (NOW() - p_fecha_registro)))::INTEGER;
  IF dias_restantes < 0 THEN
    RETURN 0;
  END IF;
  RETURN dias_restantes;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE VIEW vista_usuarios_trial AS
SELECT
  id,
  username,
  email,
  dias_restantes_prueba(created_at) AS dias_restantes
FROM usuarios
WHERE dias_restantes_prueba(created_at) > 0;

GRANT EXECUTE ON FUNCTION dias_restantes_prueba(TIMESTAMPTZ) TO rol_app_todu;
GRANT SELECT ON vista_usuarios_trial TO rol_app_todu;
