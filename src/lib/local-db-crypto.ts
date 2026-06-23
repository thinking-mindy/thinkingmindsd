/**
 * At-rest encryption for local JSON database files (AES-256-GCM).
 * Plaintext legacy files are read transparently and re-encrypted on the next write.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import {
  LEGACY_DEV_LOCAL_DB_ENCRYPTION_KEY,
  MINDS_DEFAULT_LOCAL_DB_ENCRYPTION_KEY,
  resolveLocalDbEncryptionKey,
} from '@/lib/desktop-secrets';

const ENVELOPE_VERSION = 1;
const CIPHER_ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const SCRYPT_SALT = 'thinkingminds-local-db-v1';

export type EncryptedEnvelope = {
  v: typeof ENVELOPE_VERSION;
  algo: 'AES-256-GCM';
  iv: string;
  tag: string;
  data: string;
};

let cachedKey: Buffer | null | undefined;

function deriveKey(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return scryptSync(secret, SCRYPT_SALT, KEY_BYTES);
}

/** Master key for local DB files — required in production. */
export function getLocalDbEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  cachedKey = deriveKey(resolveLocalDbEncryptionKey());
  return cachedKey;
}

export function cryptoContextForCollection(dbName: string, fileName: string): string {
  return `${dbName}:${fileName}`;
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const e = value as Partial<EncryptedEnvelope>;
  return e.v === ENVELOPE_VERSION && e.algo === 'AES-256-GCM' && typeof e.iv === 'string' && typeof e.tag === 'string' && typeof e.data === 'string';
}

export function encryptCollectionPayload(plaintext: string, context: string): EncryptedEnvelope {
  const key = getLocalDbEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER_ALGO, key, iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: ENVELOPE_VERSION,
    algo: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64'),
  };
}

function decryptWithSecret(envelope: EncryptedEnvelope, context: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const data = Buffer.from(envelope.data, 'base64');
  const decipher = createDecipheriv(CIPHER_ALGO, key, iv, { authTagLength: 16 });
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function decryptCollectionPayload(envelope: EncryptedEnvelope, context: string): string {
  const secrets = [
    resolveLocalDbEncryptionKey(),
    MINDS_DEFAULT_LOCAL_DB_ENCRYPTION_KEY,
    LEGACY_DEV_LOCAL_DB_ENCRYPTION_KEY,
  ];
  let lastError: unknown;
  for (const secret of Array.from(new Set(secrets))) {
    try {
      return decryptWithSecret(envelope, context, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** Parse on-disk file content into document array (handles legacy plaintext + encrypted). */
export function parseCollectionFileContent(raw: string, context: string): Record<string, unknown>[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`Corrupt local database file (${context})`);
  }

  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }

  if (isEncryptedEnvelope(parsed)) {
    const plaintext = decryptCollectionPayload(parsed, context);
    const docs = JSON.parse(plaintext) as unknown;
    if (!Array.isArray(docs)) return [];
    return docs as Record<string, unknown>[];
  }

  throw new Error(`Unsupported local database format (${context})`);
}

/** Serialize document array for encrypted on-disk storage. */
export function serializeCollectionFileContent(docs: Record<string, unknown>[], context: string): string {
  const plaintext = JSON.stringify(docs);
  const envelope = encryptCollectionPayload(plaintext, context);
  return JSON.stringify(envelope, null, 2);
}

/** Parse encrypted or legacy plaintext JSON object/array from disk. */
export function parseEncryptedJsonFile<T>(raw: string, context: string, fallback: T): T {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`Corrupt encrypted file (${context})`);
  }

  if (isEncryptedEnvelope(parsed)) {
    const plaintext = decryptCollectionPayload(parsed, context);
    return JSON.parse(plaintext) as T;
  }

  return parsed as T;
}

/** Write any JSON value as an encrypted on-disk envelope. */
export function serializeEncryptedJsonFile(value: unknown, context: string): string {
  const envelope = encryptCollectionPayload(JSON.stringify(value), context);
  return JSON.stringify(envelope, null, 2);
}
