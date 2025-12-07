import { getToken } from "./auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Crear un asiento contable en el API de contabilidad
 */
export async function crearAsientoContable(data: {
  description: string;
  accountId: number | string;
  movementType: "DB" | "CR";
  amount: number | string;
  entryDate?: string;
}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/api/v1/accounting-entries`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("⚠ Error del API contable:", text);
    throw new Error(`Error creando asiento: ${res.status}`);
  }
 const json = await res.clone().json();
  console.log("✅ Asiento contable creado:", json);

  return json;
}

/**
 * Genera automáticamente los asientos contables de una orden de compra.
 * Requiere que la orden tenga articulos.descripcion y proveedores.nombre_comercial.
 */
export async function generarAsientoCompra(orden: any) {
  if (!orden) {
    console.error("Orden nula al generar asiento.");
    throw new Error("Orden inválida para generar asiento.");
  }

  const total = Number(orden.cantidad) * Number(orden.costo_unitario);

  // Asiento 1: Inventario (DB)
  await crearAsientoContable({
    description: `Compra de ${orden.articulos.descripcion} al proveedor ${orden.proveedores.nombre_comercial}`,
    accountId: 1,          // Cuenta Inventario
    movementType: "DB",
    amount: total
  });

  // Asiento 2: Cuentas por Pagar (CR)
  await crearAsientoContable({
    description: `Cuenta por pagar a ${orden.proveedores.nombre_comercial}`,
    accountId: 2,          // Cuenta CXP
    movementType: "CR",
    amount: total
  });
}
