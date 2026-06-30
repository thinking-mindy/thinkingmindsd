/** Normalize Mongo-style ids (`string` or `{ $oid }`) for client + API payloads. */
export function normalizeDocumentId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    const oid = (value as { $oid?: unknown }).$oid;
    if (typeof oid === 'string') return oid.trim();
    if (oid != null) return String(oid).trim();
  }
  const asString = String(value).trim();
  return asString === '[object Object]' ? '' : asString;
}
