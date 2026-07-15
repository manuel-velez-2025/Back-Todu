SET search_path TO users, public;

CREATE TABLE IF NOT EXISTS catalogo_items (
  item_id VARCHAR(30) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  precio INTEGER NOT NULL CHECK (precio >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


INSERT INTO catalogo_items (item_id, nombre, precio) VALUES
  ('bunny',     'Orejas de Conejo',   100),
  ('halloween', 'Halloween',          150),
  ('ninja',     'Ninja',              250),
  ('robot',     'Robot Clásico',      250),
  ('pirate',    'Pirata',             400),
  ('princess',  'Princesa',           400),
  ('superhero', 'Superhéroe',         600),
  ('wizard',    'Mago',               800)
ON CONFLICT (item_id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON catalogo_items TO rol_app_todu;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_reportes_todu') THEN
    GRANT SELECT ON catalogo_items TO rol_reportes_todu;
  END IF;
END $$;