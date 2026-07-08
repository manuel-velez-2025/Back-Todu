-- ============================================================
-- user-service — Esquema de base de datos
-- ============================================================

-- Tabla principal de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT, -- NULL si el usuario entró por Google
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email' | 'google'
  google_id VARCHAR(100),
  fecha_nacimiento DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventario de accesorios cosméticos del usuario (ninja, wizard, etc.)
CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  item_id VARCHAR(30) NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, item_id)
);

-- ------------------------------------------------------------
-- ÍNDICE 1 (de los 2 que pide la materia de BD Avanzadas):
-- acelera el login, que siempre busca por email.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- ------------------------------------------------------------
-- ÍNDICE 2: acelera "ver mi inventario" (GET /inventario),
-- que siempre filtra por usuario_id.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inventario_usuario_id ON inventario(usuario_id);

-- ------------------------------------------------------------
-- VISTA 1 (de las 2 que pide la materia): resumen de inventario
-- por usuario — usada en GET /inventario para no tener que unir
-- manualmente en el código de la aplicación cada vez.
-- Esta vista YA usa un LEFT JOIN (variante de JOIN) por dentro.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_inventario_usuario AS
SELECT
  u.id AS usuario_id,
  u.username,
  i.item_id,
  i.is_equipped
FROM usuarios u
LEFT JOIN inventario i ON i.usuario_id = u.id;

-- ------------------------------------------------------------
-- FUNCIÓN 1 (de las 2 que pide la materia): valida mayoría de
-- edad directamente en SQL — reutilizable desde cualquier
-- consulta/trigger, no solo desde el código de la aplicación.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION es_mayor_de_edad(p_fecha_nacimiento DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN AGE(CURRENT_DATE, p_fecha_nacimiento) >= INTERVAL '18 years';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- PROCEDIMIENTO 1 (de los 2 que pide la materia): registra un
-- usuario nuevo validando la edad DENTRO de la misma transacción
-- (evita el caso de que dos peticiones concurrentes se cuelen).
-- ------------------------------------------------------------
CREATE OR REPLACE PROCEDURE registrar_usuario(
  p_username VARCHAR,
  p_email VARCHAR,
  p_password_hash TEXT,
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

  INSERT INTO usuarios (username, email, password_hash, fecha_nacimiento)
  VALUES (p_username, p_email, p_password_hash, p_fecha_nacimiento)
  RETURNING id INTO p_usuario_id;
END;
$$;

-- ============================================================
-- Roles y permisos (requisito de Bases de Datos Avanzadas):
-- - Un usuario DUEÑO de la BD (no root/postgres) para la app.
-- - 2 roles con permisos distintos.
-- ============================================================

-- Rol 1: la app en sí (puede leer/escribir lo normal, no puede
-- borrar la tabla ni cambiar el esquema).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    CREATE ROLE rol_app_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_users TO rol_app_todu;
GRANT USAGE ON SCHEMA public TO rol_app_todu;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios, inventario TO rol_app_todu;
GRANT SELECT ON vista_inventario_usuario TO rol_app_todu;
GRANT EXECUTE ON FUNCTION es_mayor_de_edad(DATE) TO rol_app_todu;
GRANT EXECUTE ON PROCEDURE registrar_usuario(VARCHAR, VARCHAR, TEXT, DATE, UUID) TO rol_app_todu;

-- Rol 2: solo lectura, para futuros reportes/analítica (ej. un
-- dashboard interno que solo necesita consultar, nunca modificar).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    CREATE ROLE rol_reportes_todu LOGIN PASSWORD 'CAMBIAR_EN_PRODUCCION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE db_users TO rol_reportes_todu;
GRANT USAGE ON SCHEMA public TO rol_reportes_todu;
GRANT SELECT ON usuarios, inventario, vista_inventario_usuario TO rol_reportes_todu;
