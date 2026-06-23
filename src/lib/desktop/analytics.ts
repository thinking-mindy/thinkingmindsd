import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri analytics API requires the desktop shell');
  }
}

export async function tauriAnalyticsGetFinanceAnalytics(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_finance_analytics_cmd', {
    input: { orgId: orgId ?? null },
  });
}

export async function tauriAnalyticsGetHrAnalytics(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_hr_analytics_cmd', {
    input: { orgId: orgId ?? null },
  });
}

export async function tauriAnalyticsGetMarketingAnalytics(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_marketing_analytics_cmd', {
    input: { orgId: orgId ?? null },
  });
}

export async function tauriAnalyticsGetOverviewAnalytics(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_overview_analytics_cmd', {
    input: { orgId: orgId ?? null },
  });
}

export async function tauriAnalyticsGetInventoryAndPosAnalytics(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_inventory_and_pos_analytics_cmd', {
    input: { orgId: orgId ?? null },
  });
}

export async function tauriAnalyticsGetReportsPageData(range?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('analytics_get_reports_page_data_cmd', {
    input: { range: range ?? null },
  });
}
