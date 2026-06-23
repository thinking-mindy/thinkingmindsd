/** Stable defaults for Thinking Minds desktop — no per-machine setup required. */
export const MINDS_DEFAULT_LOCAL_DB_ENCRYPTION_KEY = 'thinkingminds-minds-local-db-v1';
export const MINDS_DEFAULT_LICENSE_ANCHOR_SECRET = 'thinkingminds-minds-license-anchor-v1';

/** Legacy Next dev key — files encrypted before key alignment with the Rust backend. */
export const LEGACY_DEV_LOCAL_DB_ENCRYPTION_KEY = 'dev-only-local-db-encryption-key';

export function resolveLocalDbEncryptionKey(): string {
  const fromEnv = process.env.LOCAL_DB_ENCRYPTION_KEY?.trim();
  if (fromEnv) return fromEnv;
  // Match Rust `db/crypto.rs` default so `npm run dev` and Tauri share `db/thinkingminds`.
  return MINDS_DEFAULT_LOCAL_DB_ENCRYPTION_KEY;
}

export function resolveLicenseAnchorSecret(): string {
  const fromEnv = process.env.LICENSE_ANCHOR_SECRET?.trim();
  if (fromEnv) return fromEnv;
  return MINDS_DEFAULT_LICENSE_ANCHOR_SECRET;
}
