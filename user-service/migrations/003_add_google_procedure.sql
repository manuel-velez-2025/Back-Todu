CREATE OR REPLACE PROCEDURE registrar_usuario_google(
  p_username VARCHAR,
  p_email VARCHAR,
  p_google_id VARCHAR,
  p_fecha_nacimiento DATE,
  INOUT p_usuario_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT es_mayor_de_edad(p_fecha_nacimiento) THEN
    RAISE EXCEPTION 'Debes ser mayor de 18 años para registrarte'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO usuarios (username, email, auth_provider, google_id, fecha_nacimiento)
  VALUES (p_username, p_email, 'google', p_google_id, p_fecha_nacimiento)
  RETURNING id INTO p_usuario_id;
END;
$$;

GRANT EXECUTE ON PROCEDURE registrar_usuario_google(VARCHAR, VARCHAR, VARCHAR, DATE, UUID) TO rol_app_todu;