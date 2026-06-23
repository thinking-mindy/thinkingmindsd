import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri accounting API requires the desktop shell');
  }
}

export async function tauriAccountingGetSettings(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('accounting_get_settings_cmd', { orgId: orgId ?? null });
}

export async function tauriAccountingUpdateSettings(orgId: string, patch: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('accounting_update_settings_cmd', { orgId, patch });
}

export async function tauriAccountingGetChartOfAccounts(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('accounting_get_chart_of_accounts_cmd', {
    orgId: orgId ?? null,
  });
}

export async function tauriAccountingGetJournalEntries(orgId?: string, limit?: number) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('accounting_get_journal_entries_cmd', {
    orgId: orgId ?? null,
    limit: limit ?? 100,
  });
}

export async function tauriAccountingGetTrialBalance(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('accounting_get_trial_balance_cmd', {
    orgId: orgId ?? null,
  });
}

export async function tauriAccountingGetStatements(
  orgId?: string,
  range?: { startDate?: string; endDate?: string }
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('accounting_get_statements_cmd', {
    orgId: orgId ?? null,
    range: range ?? null,
  });
}

export async function tauriAccountingBackfill(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<{ posted: number }>>('accounting_backfill_cmd', { orgId: orgId ?? null });
}

export async function tauriAccountingReconcile(
  orgId: string,
  countedCash: number,
  countedBank: number,
  notes?: string
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('accounting_reconcile_cmd', {
    orgId,
    countedCash,
    countedBank,
    notes: notes ?? null,
  });
}
