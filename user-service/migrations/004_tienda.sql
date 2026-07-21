SET search_path TO gamification, public;

CREATE TABLE IF NOT EXISTS catalogo_decoraciones (
  item_id VARCHAR(30) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  precio INTEGER NOT NULL CHECK (precio >= 0),
  activo BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO catalogo_decoraciones (item_id, nombre, categoria, precio) VALUES
  ('trofeo_bronce', 'Trofeo de Bronce', 'trofeos', 200),
  ('trofeo_plata',  'Trofeo de Plata',  'trofeos', 500),
  ('trofeo_oro',    'Trofeo de Oro',    'trofeos', 1000),
  ('mascota_gato',  'Gatito',           'mascotas', 300),
  ('mascota_ave',   'Pajarito',         'mascotas', 350),
  ('mascota_conejo','Conejito',         'mascotas', 400),
  ('pared_paisaje', 'Cuadro de Paisaje', 'pared', 250),
  ('pared_abstracto', 'Cuadro Abstracto', 'pared', 300),
  ('pared_nocturna', 'Ventana Nocturna', 'pared', 350),
  ('pared_reloj', 'Reloj de Pared', 'pared', 260),
  ('aire_dron', 'Dron Explorador', 'aire', 700),
  ('accesorios_lampara', 'Lamparita', 'accesorios', 220),
  ('accesorios_consola', 'Mini Consola', 'accesorios', 450),
  ('accesorios_acuario', 'Acuario Pequeño', 'accesorios', 500),
  ('piso_alfombra', 'Alfombra', 'piso', 180),
  ('piso_maceta', 'Planta Maceta', 'piso', 200),
  ('ambiente_luces', 'Guirnalda de Luces', 'ambiente', 260)

ON CONFLICT (item_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS decoraciones_compradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  comprado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, item_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_app_todu') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON decoraciones_compradas TO rol_app_todu;
    GRANT SELECT ON catalogo_decoraciones TO rol_app_todu;
  END IF;
END $$;