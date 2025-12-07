const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function login(username: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error de login ${response.status}: ${text}`);
  }

  const json = await response.json();
  return json.data.token;
}

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function autoLogin() {
  const existing = getToken();
  if (existing) return existing;

  const username = import.meta.env.VITE_AUTO_USER;
  const password = import.meta.env.VITE_AUTO_PASS;

  if (!username || !password) {
    console.error("Variables VITE_AUTO_USER o PASS no están definidas");
    return null;
  }

  try {
    const newToken = await login(username, password);
    saveToken(newToken);
    return newToken;
  } catch (err) {
    console.error("Error autologin:", err);
    clearToken();
    return null;
  }
}

// --- NUEVO: fetch con token automático ---
export async function authorizedFetch(url: string, options: RequestInit = {}) {
  const token = getToken() || (await autoLogin());

  if (!token) {
    throw new Error("No hay token disponible");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
