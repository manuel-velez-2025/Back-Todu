SET search_path TO tasks, public;

CREATE TABLE IF NOT EXISTS push_subscripciones (
  usuario_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  tarea_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tarea_id, tipo)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones_enviadas TO rol_app_todu;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscripciones TO rol_app_todu;
  END IF;
END $$;