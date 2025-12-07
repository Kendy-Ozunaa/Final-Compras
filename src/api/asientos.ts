import { getToken } from "./auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function obtenerAsientos() {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/api/v1/accounting-entries`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error consultando asientos: ${res.status} - ${text}`);
  }

  return await res.json();
}
