import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // NIST SP 800-38D standard IV length for GCM (96 bits)
const PREFIX = 'enc:v1:';

/**
 * Hash a plain token using SHA-256 for secure storage in MongoDB
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically strong random token
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Escape regular expression metacharacters to safely use in dynamic RegExp construction (ReDoS prevention)
 */
export function escapeRegex(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retrieve the 32-byte (256-bit) encryption key from validated environment configuration
 */
function getEncryptionKeyBuffer(): Buffer {
  const keyHex = env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a valid 64-hexadecimal character string (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Determine if a string is already encrypted in the application's format
 */
export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext string using AES-256-GCM authenticated encryption.
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string | undefined | null): string | undefined | null {
  if (plaintext === undefined || plaintext === null || plaintext === '') {
    return plaintext;
  }

  // Idempotent: avoid re-encrypting already encrypted ciphertext
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Gracefully preserves and returns legacy plaintext values for seamless data migration.
 */
export function decrypt(ciphertext: string | undefined | null): string | undefined | null {
  if (ciphertext === undefined || ciphertext === null || ciphertext === '') {
    return ciphertext;
  }

  // Backward compatibility: If not in enc:v1 format, assume legacy plaintext
  if (!isEncrypted(ciphertext)) {
    return ciphertext;
  }

  try {
    const raw = ciphertext.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      // Malformed format, return as-is
      return ciphertext;
    }

    const [ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKeyBuffer();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error: any) {
    throw new Error(`Failed to decrypt sensitive field: ${error.message}`);
  }
}
