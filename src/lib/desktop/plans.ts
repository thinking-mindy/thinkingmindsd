import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri plans API requires the desktop shell');
  }
}

export async function tauriGetPlan(
  planId: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  requireTauri();
  return invoke('plan_get_cmd', { planId });
}

export async function tauriGetPlanBySlug(
  slug: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  requireTauri();
  return invoke('plan_get_by_slug_cmd', { slug });
}

export async function tauriGetAllPlans(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('plan_get_all_cmd');
}
