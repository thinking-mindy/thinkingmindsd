/**
 * Plans API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriGetAllPlans,
  tauriGetPlan,
  tauriGetPlanBySlug,
} from '@/lib/desktop/plans';
import type { TauriActionResult } from '@/lib/desktop/admin-types';

export async function getPlanBridge(
  planId: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  if (isTauriBackendAvailable()) {
    return tauriGetPlan(planId);
  }
  const { getPlan } = await import('@/_actions/plans');
  return getPlan(planId) as Promise<TauriActionResult<Record<string, unknown> | null>>;
}

export async function getPlanBySlugBridge(
  slug: string
): Promise<TauriActionResult<Record<string, unknown> | null>> {
  if (isTauriBackendAvailable()) {
    return tauriGetPlanBySlug(slug);
  }
  const { getPlanBySlug } = await import('@/_actions/plans');
  return getPlanBySlug(slug as 'free' | 'pro' | 'enterprise') as Promise<
    TauriActionResult<Record<string, unknown> | null>
  >;
}

export async function getAllPlansBridge(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  if (isTauriBackendAvailable()) {
    return tauriGetAllPlans();
  }
  const { getAllPlans } = await import('@/_actions/plans');
  return getAllPlans() as Promise<TauriActionResult<Record<string, unknown>[]>>;
}
