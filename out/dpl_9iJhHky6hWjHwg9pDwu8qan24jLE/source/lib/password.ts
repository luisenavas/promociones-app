// Server-only helper de hash de contraseñas usando el módulo "crypto" incorporado
// de Node (scrypt), para no depender de paquetes nativos como bcrypt.
// Formato almacenado: "<salt-hex>:<hash-hex>"
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
const KEY_LENGTH = 64;
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const hash = scryptSync(password, salt, KEY_LENGTH);
  const storedHash = Buffer.from(hashHex, 'hex');
  if (hash.length !== storedHash.length) return false;
  return timingSafeEqual(hash, storedHash);
}
