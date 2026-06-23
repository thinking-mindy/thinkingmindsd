/**
 * Accounting / GL API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriAccountingBackfill,
  tauriAccountingGetChartOfAccounts,
  tauriAccountingGetJournalEntries,
  tauriAccountingGetSettings,
  tauriAccountingGetStatements,
  tauriAccountingGetTrialBalance,
  tauriAccountingReconcile,
  tauriAccountingUpdateSettings,
} from '@/lib/desktop/accounting';
import type { AccountingBasis } from '@/lib/accounting/types';

function toIsoDate(value?: Date): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

export async function getAccountingSettings(orgId?: string) {
  const { getAccountingSettings: serverFn } = await import('@/_actions/accounting');
  return desktopBridge(() => tauriAccountingGetSettings(orgId), () => serverFn(orgId));
}

export async function updateAccountingSettings(orgId: string, patch: Record<string, unknown>) {
  const { updateAccountingSettings: serverFn } = await import('@/_actions/accounting');
  return desktopBridge(
    () => tauriAccountingUpdateSettings(orgId, patch),
    () => serverFn(orgId, patch as never)
  );
}

export async function updateAccountingBasis(orgId: string, basis: AccountingBasis) {
  return updateAccountingSettings(orgId, { basis });
}

export async function getChartOfAccounts(orgId?: string) {
  if (isTauriBackendAvailable()) return tauriAccountingGetChartOfAccounts(orgId);
  const { getChartOfAccounts: serverFn } = await import('@/_actions/accounting');
  return serverFn(orgId);
}

export async function getJournalEntries(orgId?: string, limit?: number) {
  if (isTauriBackendAvailable()) return tauriAccountingGetJournalEntries(orgId, limit);
  const { getJournalEntries: serverFn } = await import('@/_actions/accounting');
  return serverFn(orgId, { limit });
}

export async function getTrialBalance(orgId?: string) {
  if (isTauriBackendAvailable()) return tauriAccountingGetTrialBalance(orgId);
  const { getTrialBalance: serverFn } = await import('@/_actions/accounting');
  return serverFn(orgId);
}

export async function getAccountingStatements(orgId?: string, startDate?: Date, endDate?: Date) {
  if (isTauriBackendAvailable()) {
    return tauriAccountingGetStatements(orgId, {
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
    });
  }
  const { getAccountingStatements: serverFn } = await import('@/_actions/accounting');
  return serverFn(orgId, startDate, endDate);
}

export async function backfillLedgerFromOps(orgId?: string) {
  if (isTauriBackendAvailable()) return tauriAccountingBackfill(orgId);
  const { backfillLedgerFromOps: serverFn } = await import('@/_actions/accounting');
  return serverFn(orgId);
}

export async function reconcileCash(
  orgId: string,
  countedCash: number,
  countedBank: number,
  notes?: string
) {
  const { reconcileCash: serverFn } = await import('@/_actions/accounting');
  return desktopBridge(
    () => tauriAccountingReconcile(orgId, countedCash, countedBank, notes),
    () => serverFn(orgId, countedCash, countedBank, notes)
  );
}
