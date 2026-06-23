import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult, TauriAdminLoadPanel } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri admin API requires the desktop shell');
  }
}

export async function tauriAdminLoadPanel(): Promise<TauriAdminLoadPanel> {
  requireTauri();
  return invoke<TauriAdminLoadPanel>('admin_load_panel_cmd');
}

export async function tauriAdminUpdateOrg(
  companyId: string,
  patch: Record<string, unknown>
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('admin_update_org_cmd', { companyId, patch });
}

export async function tauriAdminUpdateOrgPlan(
  companyId: string,
  planId: string
): Promise<TauriActionResult<Record<string, unknown>>> {
  requireTauri();
  return invoke('admin_update_org_plan_cmd', { companyId, planId });
}

export async function tauriAdminApproveJoinRequest(
  requestId: string
): Promise<TauriActionResult<void>> {
  requireTauri();
  return invoke('admin_approve_join_request_cmd', { requestId });
}

export async function tauriAdminRejectJoinRequest(
  requestId: string
): Promise<TauriActionResult<void>> {
  requireTauri();
  return invoke('admin_reject_join_request_cmd', { requestId });
}

export async function tauriAdminUpdateUserModules(
  userId: string,
  allowedModules: string[]
): Promise<TauriActionResult<void>> {
  requireTauri();
  return invoke('admin_update_user_modules_cmd', { input: { userId, allowedModules } });
}

export async function tauriAdminListLocalUsers(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('admin_list_local_users_cmd');
}

export async function tauriAdminListLocalCompanies(): Promise<
  TauriActionResult<Record<string, unknown>[]>
> {
  requireTauri();
  return invoke('admin_list_local_companies_cmd');
}

export async function tauriAdminDeleteLocalUser(
  userId: string
): Promise<TauriActionResult<void>> {
  requireTauri();
  return invoke('admin_delete_local_user_cmd', { userId });
}

export async function tauriAdminDeleteLocalCompany(
  companyId: string
): Promise<TauriActionResult<void>> {
  requireTauri();
  return invoke('admin_delete_local_company_cmd', { companyId });
}
