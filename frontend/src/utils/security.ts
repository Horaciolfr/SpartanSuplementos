/**
 * Módulo de almacenamiento compatible con las sesiones existentes.
 * Proyecto: Spartan Suplementos Bolivia
 *
 * La transformación XOR mantiene compatibilidad y evita texto plano accidental,
 * pero no es cifrado ni protege frente a JavaScript ejecutado en el navegador.
 * La autorización real siempre se valida en el backend.
 */

export const STORAGE_KEYS = {
  TOKEN: 'spartan_auth_tk_0x7b',
  ROLE: 'spartan_sec_rl_0x4e',
  USER: 'spartan_usr_ctx_0x9a',
} as const;

// Máscara de compatibilidad; no es una clave criptográfica.
const ROTARY_SALT = 0x6d;

/**
 * Ofusca un string mediante XOR y Base64. No debe considerarse cifrado.
 */
export function obfuscate(input: string): string {
  if (!input) return '';
  try {
    let masked = '';
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i) ^ (ROTARY_SALT + (i % 11));
      masked += String.fromCharCode(code);
    }
    return btoa(unescape(encodeURIComponent(masked)));
  } catch {
    return btoa(input);
  }
}

/**
 * Desofusca un string generado por obfuscate().
 */
export function deobfuscate(encoded: string): string {
  if (!encoded) return '';
  try {
    const raw = decodeURIComponent(escape(atob(encoded)));
    let original = '';
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i) ^ (ROTARY_SALT + (i % 11));
      original += String.fromCharCode(code);
    }
    return original;
  } catch {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }
}

/**
 * Guarda un elemento en localStorage con clave y valor totalmente ofuscados.
 */
export function setSecureItem(key: string, value: string): void {
  try {
    const obfKey = obfuscate(key);
    const obfValue = obfuscate(value);
    localStorage.setItem(obfKey, obfValue);
  } catch {
    // Protección en caso de cuota de almacenamiento o modo incógnito restringido
  }
}

/**
 * Obtiene y desofusca un elemento desde localStorage.
 */
export function getSecureItem(key: string): string | null {
  try {
    const obfKey = obfuscate(key);
    const obfValue = localStorage.getItem(obfKey);
    if (!obfValue) return null;
    return deobfuscate(obfValue);
  } catch {
    return null;
  }
}

/**
 * Elimina un elemento seguro de localStorage.
 */
export function removeSecureItem(key: string): void {
  try {
    const obfKey = obfuscate(key);
    localStorage.removeItem(obfKey);
  } catch {}
}

/**
 * Purga cualquier clave antigua en texto plano (como 'token', 'role', 'user')
 * para garantizar que ningún dato quede expuesto en DevTools.
 */
export function purgeLegacyStorage(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  } catch {}
}

/**
 * Transforma un rol interno de base de datos a una etiqueta profesional y neutral,
 * evitando que la palabra exacta 'ADMINISTRADOR' o 'CAJERO' sea evidente en el DOM.
 */
export function getMaskedRoleLabel(role?: string | null): string {
  if (!role) return 'Visitante Élite';
  switch (role.toUpperCase()) {
    case 'ADMINISTRADOR':
      return 'Supervisión Élite (Nivel 1)';
    case 'EMPLEADO':
    case 'CAJERO':
      return 'Operador Comercial (Nivel 2)';
    case 'CLIENTE':
      return 'Atleta Spartan';
    case 'INVITADO':
      return 'Visitante Élite';
    default:
      return 'Atleta Spartan';
  }
}
