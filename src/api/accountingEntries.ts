import { authorizedFetch } from "./auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Crear un asiento contable
export async function createAccountingEntry(entry: {
  description: string;
  accountId: number;
  movementType: "DB" | "CR";
  amount: number | string;
  entryDate?: string;
}) {
  const res = await authorizedFetch(`${BASE_URL}/api/v1/accounting-entries`, {
    method: "POST",
    body: JSON.stringify(entry),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error creando asiento: ${errorText}`);
  }

  return await res.json();
}

// Listar asientos enviados
export async function listAccountingEntries() {
  const res = await authorizedFetch(`${BASE_URL}/api/v1/accounting-entries`);
  return await res.json();
}
