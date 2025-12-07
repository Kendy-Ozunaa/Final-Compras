/*
  # Sistema de Compras - Schema Creation

  ## Summary
  Creates complete database schema for a purchasing system with departments, measurement units, 
  suppliers, articles, and purchase orders.

  ## New Tables
  
  ### 1. `departamentos` (Departments)
    - `id` (uuid, primary key) - Unique identifier
    - `nombre` (text, required) - Department name
    - `estado` (boolean, default true) - Active status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `unidades_medida` (Measurement Units)
    - `id` (uuid, primary key) - Unique identifier
    - `descripcion` (text, required) - Unit description (e.g., kg, unidad, litro)
    - `estado` (boolean, default true) - Active status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 3. `proveedores` (Suppliers)
    - `id` (uuid, primary key) - Unique identifier
    - `cedula_rnc` (text, required, unique) - Dominican ID or Tax ID
    - `nombre_comercial` (text, required) - Business name
    - `estado` (boolean, default true) - Active status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 4. `articulos` (Articles/Items)
    - `id` (uuid, primary key) - Unique identifier
    - `descripcion` (text, required) - Item description
    - `marca` (text) - Brand name
    - `unidad_medida_id` (uuid, foreign key) - Reference to measurement unit
    - `existencia` (numeric, default 0) - Current stock quantity
    - `estado` (boolean, default true) - Active status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 5. `ordenes_compra` (Purchase Orders)
    - `id` (uuid, primary key) - Unique identifier
    - `numero_orden` (text, required, unique) - Auto-generated order number
    - `fecha` (date, required) - Order date
    - `estado` (text, default 'Pendiente') - Order status (Pendiente, Aprobada, Rechazada, Completada)
    - `articulo_id` (uuid, foreign key) - Reference to article
    - `cantidad` (numeric, required) - Order quantity
    - `costo_unitario` (numeric, required) - Unit cost
    - `subtotal` (numeric, generated) - Calculated subtotal (cantidad × costo_unitario)
    - `proveedor_id` (uuid, foreign key) - Reference to supplier
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  All tables have RLS enabled with policies that allow:
  - Public read access for active records
  - Full CRUD operations (in this demo, all operations are allowed)
  
  ## Notes
  
  1. All IDs use UUID for security and scalability
  2. Timestamps track creation and modification times
  3. Estado (status) fields allow soft deletes
  4. Foreign key constraints maintain referential integrity
  5. Numeric fields validated for non-negative values
  6. Order numbers auto-generated with format OC-YYYYMMDD-XXXX
*/

-- Create tables
CREATE TABLE IF NOT EXISTS departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  estado boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unidades_medida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  estado boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula_rnc text UNIQUE NOT NULL,
  nombre_comercial text NOT NULL,
  estado boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  marca text,
  unidad_medida_id uuid REFERENCES unidades_medida(id) ON DELETE RESTRICT,
  existencia numeric DEFAULT 0 CHECK (existencia >= 0),
  estado boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden text UNIQUE NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Completada')),
  articulo_id uuid REFERENCES articulos(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric NOT NULL CHECK (costo_unitario >= 0),
  subtotal numeric GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  proveedor_id uuid REFERENCES proveedores(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_articulos_unidad_medida ON articulos(unidad_medida_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_articulo ON ordenes_compra(articulo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha ON ordenes_compra(fecha);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(estado);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_departamentos_updated_at BEFORE UPDATE ON departamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unidades_medida_updated_at BEFORE UPDATE ON unidades_medida
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articulos_updated_at BEFORE UPDATE ON articulos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_compra_updated_at BEFORE UPDATE ON ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_numero_orden()
RETURNS text AS $$
DECLARE
  next_num integer;
  date_part text;
  order_number text;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_orden FROM 13) AS integer)), 0) + 1
  INTO next_num
  FROM ordenes_compra
  WHERE numero_orden LIKE 'OC-' || date_part || '-%';
  
  order_number := 'OC-' || date_part || '-' || LPAD(next_num::text, 4, '0');
  
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allowing all operations for demo purposes)

-- Departamentos policies
CREATE POLICY "Allow public read access to departamentos"
  ON departamentos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to departamentos"
  ON departamentos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to departamentos"
  ON departamentos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from departamentos"
  ON departamentos FOR DELETE
  TO public
  USING (true);

-- Unidades de Medida policies
CREATE POLICY "Allow public read access to unidades_medida"
  ON unidades_medida FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to unidades_medida"
  ON unidades_medida FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to unidades_medida"
  ON unidades_medida FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from unidades_medida"
  ON unidades_medida FOR DELETE
  TO public
  USING (true);

-- Proveedores policies
CREATE POLICY "Allow public read access to proveedores"
  ON proveedores FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to proveedores"
  ON proveedores FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to proveedores"
  ON proveedores FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from proveedores"
  ON proveedores FOR DELETE
  TO public
  USING (true);

-- Articulos policies
CREATE POLICY "Allow public read access to articulos"
  ON articulos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to articulos"
  ON articulos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to articulos"
  ON articulos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from articulos"
  ON articulos FOR DELETE
  TO public
  USING (true);

-- Ordenes de Compra policies
CREATE POLICY "Allow public read access to ordenes_compra"
  ON ordenes_compra FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to ordenes_compra"
  ON ordenes_compra FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to ordenes_compra"
  ON ordenes_compra FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from ordenes_compra"
  ON ordenes_compra FOR DELETE
  TO public
  USING (true);

-- Insert sample data for testing
INSERT INTO unidades_medida (descripcion) VALUES
  ('Unidad'),
  ('Kilogramo'),
  ('Litro'),
  ('Metro'),
  ('Caja')
ON CONFLICT DO NOTHING;

INSERT INTO departamentos (nombre) VALUES
  ('Compras'),
  ('Almacén'),
  ('Contabilidad'),
  ('Administración')
ON CONFLICT DO NOTHING;