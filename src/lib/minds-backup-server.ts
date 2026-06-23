import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { mergeDocumentArrays, type MergeStats } from "@/lib/minds-backup-merge";
import type { MindsServerBackup, MindsServerRestoreResult } from "@/lib/minds-backup-types";
import { cryptoContextForCollection } from "@/lib/local-db-crypto";
import {
  readEncryptedCollectionFile,
  writeEncryptedCollectionFile,
} from "@/lib/local-json-db";
import { readFile, writeFile } from "node:fs/promises";

export { MINDS_BACKUP_FORMAT, MINDS_BACKUP_VERSION } from "@/lib/minds-backup-types";
export type { MindsServerBackup, MindsServerRestoreResult };

const DB_ROOT = path.join(process.cwd(), "db");
const DB_NAME = "thinkingminds";
const SECRETS_FILE = path.join(process.cwd(), "secrets", "login-details.enc.json");

async function dbDir(): Promise<string> {
  const dir = path.join(DB_ROOT, DB_NAME);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function exportServerBackup(): Promise<MindsServerBackup> {
  const dir = await dbDir();
  const names = await readdir(dir);
  const files: Record<string, unknown[]> = {};

  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const context = cryptoContextForCollection(DB_NAME, name);
    try {
      files[name] = await readEncryptedCollectionFile(path.join(dir, name), context);
    } catch {
      files[name] = [];
    }
  }

  let secrets: Record<string, unknown> | null = null;
  try {
    const raw = await readFile(SECRETS_FILE, "utf8");
    secrets = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    secrets = null;
  }

  return { dbName: DB_NAME, files, secrets };
}

export async function restoreServerBackupMerge(payload: MindsServerBackup): Promise<MindsServerRestoreResult> {
  const dir = await dbDir();
  const fileStats: Record<string, MergeStats> = {};
  let added = 0;
  let skipped = 0;

  for (const [fileName, incoming] of Object.entries(payload.files ?? {})) {
    if (!fileName.endsWith(".json")) continue;
    const incomingDocs = Array.isArray(incoming)
      ? (incoming as Record<string, unknown>[])
      : incoming != null
        ? [incoming as Record<string, unknown>]
        : [];

    const filePath = path.join(dir, fileName);
    const context = cryptoContextForCollection(DB_NAME, fileName);
    let existing: Record<string, unknown>[] = [];
    try {
      existing = await readEncryptedCollectionFile(filePath, context);
    } catch {
      existing = [];
    }

    const { merged, stats } = mergeDocumentArrays(existing, incomingDocs);
    await writeEncryptedCollectionFile(filePath, context, merged);
    fileStats[fileName] = stats;
    added += stats.added;
    skipped += stats.skipped;
  }

  let secretsResult = { applied: false, skipped: false };
  if (payload.secrets && typeof payload.secrets === "object") {
    try {
      await readFile(SECRETS_FILE, "utf8");
      secretsResult = { applied: false, skipped: true };
    } catch {
      await mkdir(path.dirname(SECRETS_FILE), { recursive: true });
      await writeFile(SECRETS_FILE, JSON.stringify(payload.secrets, null, 2), "utf8");
      secretsResult = { applied: true, skipped: false };
    }
  }

  return {
    files: fileStats,
    secrets: secretsResult,
    totals: { added, skipped },
  };
}
