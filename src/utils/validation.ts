// ✅ Validación combinada de Cédula y RNC (según lo que dejó el maestro)
export function validateCedulaRNC(value: string): boolean {
  const cleaned = value.replace(/[-\s]/g, '');

  // 🔹 Validación de CÉDULA (11 dígitos)
  if (cleaned.length === 11) {
    if (!/^\d{11}$/.test(cleaned)) return false;

    const digitoMult = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
    let vnTotal = 0;

    for (let i = 0; i < 11; i++) {
      const calc = parseInt(cleaned.charAt(i)) * digitoMult[i];
      vnTotal += calc < 10 ? calc : Math.floor(calc / 10) + (calc % 10);
    }

    return vnTotal % 10 === 0;
  }

  // 🔹 Validación de RNC (9 dígitos)
  if (cleaned.length === 9) {
    if (!/^\d{9}$/.test(cleaned)) return false;

    const firstDigit = cleaned.charAt(0);
    if (!['1', '4', '5'].includes(firstDigit)) return false;

    const digitoMult = [7, 9, 8, 6, 5, 4, 3, 2];
    let vnTotal = 0;

    for (let i = 0; i < 8; i++) {
      vnTotal += parseInt(cleaned.charAt(i)) * digitoMult[i];
    }

    const vDigito = parseInt(cleaned.charAt(8));
    const mod = vnTotal % 11;

    return (
      (mod === 0 && vDigito === 1) ||
      (mod === 1 && vDigito === 1) ||
      11 - mod === vDigito
    );
  }

  // Si no tiene 9 o 11 dígitos → inválido
  return false;
}

// ✅ Formateo visual de Cédula o RNC
export function formatCedulaRNC(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  // Formato Cédula (11 dígitos) → 000-0000000-0
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10)}`;
  }

  // Formato RNC (9 dígitos) → 000-00000-0
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 8)}-${cleaned.slice(8)}`;
  }

  return value;
}

// ✅ Validación de nombre de departamento
export function validateDepartamentoNombre(value: string): boolean {
  if (!value) return false;

  // Solo letras (incluye acentos) + espacios
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;

  // Máximo 50 caracteres
  return regex.test(value.trim()) && value.trim().length <= 50;
}
