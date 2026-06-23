import type { MergeStats } from "@/lib/minds-backup-merge";

export const MINDS_BACKUP_FORMAT = "thinkingminds-backup";
export const MINDS_BACKUP_VERSION = 1;

export type MindsServerBackup = {
  dbName: string;
  files: Record<string, unknown[]>;
  secrets?: Record<string, unknown> | null;
};

export type MindsServerRestoreResult = {
  files: Record<string, MergeStats>;
  secrets: { applied: boolean; skipped: boolean };
  totals: MergeStats;
};

export type MindsBackupFile = {
  format: typeof MINDS_BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  app: string;
  client: {
    localStorage: Record<string, unknown>;
    files: Record<string, unknown>;
  };
  server: MindsServerBackup;
};

export type MindsRestoreSummary = {
  client: {
    localStorage: MergeStats;
    files: Record<string, MergeStats>;
  };
  server: MindsServerRestoreResult | null;
};
