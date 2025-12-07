import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Departamento {
  id: string;
  nombre: string;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnidadMedida {
  id: string;
  descripcion: string;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Proveedor {
  id: string;
  cedula_rnc: string;
  nombre_comercial: string;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Articulo {
  id: string;
  descripcion: string;
  marca: string | null;
  unidad_medida_id: string;
  existencia: number;
  estado: boolean;
  created_at: string;
  updated_at: string;
  unidades_medida?: UnidadMedida;
}

export interface OrdenCompra {
  id: string;
  numero_orden: string;
  fecha: string;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Completada';
  articulo_id: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  proveedor_id: string;
  created_at: string;
  updated_at: string;
  articulos?: Articulo;
  proveedores?: Proveedor;
}
