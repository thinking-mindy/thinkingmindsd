"use client";

import {
  MINDS_BACKUP_FORMAT,
  MINDS_BACKUP_VERSION,
  type MindsBackupFile,
  type MindsRestoreSummary,
  type MindsServerBackup,
  type MindsServerRestoreResult,
} from "@/lib/minds-backup-types";
import {
  mergeDocumentArrays,
  mergeKeyedStore,
  type MergeStats,
} from "@/lib/minds-backup-merge";
import { offlineStorage } from "@/lib/offline/storage";

export type { MindsBackupFile, MindsRestoreSummary };

const OFFLINE_PREFIX = "offline_";

function isMindsBackup(value: unknown): value is MindsBackupFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<MindsBackupFile>;
  return v.format === MINDS_BACKUP_FORMAT && typeof v.version === "number" && !!v.client && !!v.server;
}

async function exportClientLocalStorage(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (typeof window === "undefined") return out;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(OFFLINE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = localStorage.getItem(key);
    }
  }
  return out;
}

async function exportClientFiles(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const files = await offlineStorage.listFiles();
  for (const file of files) {
    const data = await offlineStorage.loadFromFile(file);
    if (data != null) out[file] = data;
  }
  return out;
}

export async function createMindsBackup(): Promise<MindsBackupFile> {
  const serverRes = await fetch("/api/minds-backup", { method: "GET", cache: "no-store" });
  if (!serverRes.ok) {
    throw new Error((await serverRes.json().catch(() => ({}))).error || "Failed to export server data");
  }
  const server = (await serverRes.json()) as MindsServerBackup;

  return {
    format: MINDS_BACKUP_FORMAT,
    version: MINDS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "thinkingmindserp",
    client: {
      localStorage: await exportClientLocalStorage(),
      files: await exportClientFiles(),
    },
    server,
  };
}

function resolveBackupFilename(filename?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = filename ?? `thinkingminds-${stamp}.minds`;
  return name.endsWith(".minds") ? name : `${name}.minds`;
}

function downloadMindsBackupBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** @deprecated Prefer saveMindsBackup for folder/file picker support */
export function downloadMindsBackup(backup: MindsBackupFile, filename?: string): void {
  const finalName = resolveBackupFilename(filename);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  downloadMindsBackupBlob(blob, finalName);
}

export type SaveMindsBackupResult = {
  savedAs: string;
  /** True when the user picked location via the native save dialog */
  usedSavePicker: boolean;
};

/**
 * Save a .minds backup. Uses the system save dialog (folder + filename) when supported,
 * otherwise falls back to a browser download.
 */
export async function saveMindsBackup(
  backup: MindsBackupFile,
  filename?: string
): Promise<SaveMindsBackupResult> {
  const finalName = resolveBackupFilename(filename);
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const handle = await (
        window as Window & {
          showSaveFilePicker: (options?: {
            suggestedName?: string;
            types?: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName: finalName,
        types: [
          {
            description: "Thinking Minds backup",
            accept: { "application/json": [".minds"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { savedAs: handle.name || finalName, usedSavePicker: true };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error("Backup cancelled");
      }
      console.warn("Save file picker failed, using download fallback:", error);
    }
  }

  downloadMindsBackupBlob(blob, finalName);
  return { savedAs: finalName, usedSavePicker: false };
}

function mergeLocalValue(existing: unknown, incoming: unknown): { value: unknown; stats: MergeStats } {
  if (existing == null) {
    const count = Array.isArray(incoming) ? incoming.length : 1;
    return { value: incoming, stats: { added: count, skipped: 0 } };
  }
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const { merged, stats } = mergeDocumentArrays(
      existing as Record<string, unknown>[],
      incoming as Record<string, unknown>[]
    );
    return { value: merged, stats };
  }
  if (
    existing &&
    incoming &&
    typeof existing === "object" &&
    typeof incoming === "object" &&
    !Array.isArray(existing) &&
    !Array.isArray(incoming)
  ) {
    const { merged, stats } = mergeKeyedStore(
      existing as Record<string, unknown>,
      incoming as Record<string, unknown>
    );
    return { value: merged, stats };
  }
  return { value: existing, stats: { added: 0, skipped: 1 } };
}

async function mergeFilePayload(_key: string, existing: unknown, incoming: unknown): Promise<{ value: unknown; stats: MergeStats }> {
  return mergeLocalValue(existing, incoming);
}

export async function restoreMindsBackupMerge(backup: MindsBackupFile): Promise<MindsRestoreSummary> {
  if (!isMindsBackup(backup)) {
    throw new Error("Invalid .minds backup file");
  }
  if (backup.version > MINDS_BACKUP_VERSION) {
    throw new Error(`Backup version ${backup.version} is newer than this app supports`);
  }

  const clientSummary: MindsRestoreSummary["client"] = {
    localStorage: { added: 0, skipped: 0 },
    files: {},
  };

  if (typeof window !== "undefined") {
    for (const [key, value] of Object.entries(backup.client?.localStorage ?? {})) {
      let existing: unknown = null;
      const raw = localStorage.getItem(key);
      if (raw != null) {
        try {
          existing = JSON.parse(raw);
        } catch {
          existing = raw;
        }
      }
      const { value: merged, stats } = mergeLocalValue(existing, value);
      localStorage.setItem(key, typeof merged === "string" ? merged : JSON.stringify(merged));
      clientSummary.localStorage.added += stats.added;
      clientSummary.localStorage.skipped += stats.skipped;
    }

    for (const [fileKey, payload] of Object.entries(backup.client?.files ?? {})) {
      const existing = await offlineStorage.loadFromFile(fileKey);
      const { value, stats } = await mergeFilePayload(fileKey, existing, payload);
      await offlineStorage.saveToFile(fileKey, value);
      clientSummary.files[fileKey] = stats;
    }
  }

  let serverResult: MindsServerRestoreResult | null = null;
  if (backup.server) {
    const res = await fetch("/api/minds-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup.server),
    });
    if (!res.ok) {
      throw new Error((await res.json().catch(() => ({}))).error || "Failed to restore server data");
    }
    serverResult = (await res.json()) as MindsServerRestoreResult;
  }

  return { client: clientSummary, server: serverResult };
}

export async function parseMindsBackupFile(file: File): Promise<MindsBackupFile> {
  if (!file.name.toLowerCase().endsWith(".minds")) {
    throw new Error("Please choose a .minds backup file");
  }
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON");
  }
  if (!isMindsBackup(parsed)) {
    throw new Error("Unrecognized .minds backup format");
  }
  return parsed;
}

export function formatRestoreSummary(summary: MindsRestoreSummary): string {
  const parts: string[] = [];
  const c = summary.client.localStorage;
  parts.push(`Browser data: ${c.added} added, ${c.skipped} skipped`);

  const fileAdded = Object.values(summary.client.files).reduce((n, s) => n + s.added, 0);
  const fileSkipped = Object.values(summary.client.files).reduce((n, s) => n + s.skipped, 0);
  if (fileAdded || fileSkipped) {
    parts.push(`Offline files: ${fileAdded} records added, ${fileSkipped} skipped`);
  }

  if (summary.server) {
    parts.push(
      `Database: ${summary.server.totals.added} records added, ${summary.server.totals.skipped} skipped`
    );
    if (summary.server.secrets.skipped) parts.push("Encrypted login secrets kept (already on disk)");
    if (summary.server.secrets.applied) parts.push("Encrypted login secrets restored");
  }

  return parts.join(" · ");
}
