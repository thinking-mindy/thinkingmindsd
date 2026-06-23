/** Shared merge helpers for .minds backup restore (skip existing records). */

export type MergeStats = { added: number; skipped: number };

function normalizeId(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/** Stable identity for a document or offline record. */
export function documentIdentity(doc: Record<string, unknown>): string | null {
  const candidates = [
    doc._id,
    doc.id,
    doc.invoiceId,
    doc.orderId,
    doc.orderNumber,
    doc.poNumber,
    doc.sku && doc.orgId ? `${doc.orgId}:${doc.sku}` : null,
    doc.clerkId,
    doc.email && doc.orgId ? `${doc.orgId}:${String(doc.email).toLowerCase()}` : null,
    doc.email ? `email:${String(doc.email).toLowerCase()}` : null,
    doc.username ? `user:${String(doc.username).toLowerCase()}` : null,
  ];
  for (const c of candidates) {
    const id = normalizeId(c);
    if (id) return id;
  }
  return null;
}

export function mergeDocumentArrays(
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[]
): { merged: Record<string, unknown>[]; stats: MergeStats } {
  const seen = new Set<string>();
  const signatures = new Set<string>();

  for (const doc of existing) {
    const key = documentIdentity(doc);
    if (key) seen.add(key);
    else signatures.add(JSON.stringify(doc));
  }

  let added = 0;
  let skipped = 0;
  const merged = [...existing];

  for (const doc of incoming) {
    const key = documentIdentity(doc);
    if (key) {
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      merged.push(doc);
      added += 1;
      continue;
    }

    const sig = JSON.stringify(doc);
    if (signatures.has(sig)) {
      skipped += 1;
      continue;
    }
    signatures.add(sig);
    merged.push(doc);
    added += 1;
  }

  return { merged, stats: { added, skipped } };
}

export function mergeKeyedStore(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): { merged: Record<string, unknown>; stats: MergeStats } {
  let added = 0;
  let skipped = 0;
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (key in merged) {
      skipped += 1;
      continue;
    }
    merged[key] = value;
    added += 1;
  }

  return { merged, stats: { added, skipped } };
}
