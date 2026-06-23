import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri join requests API requires the desktop shell');
  }
}

export async function tauriJoinRequestsCreate(input: { orgId: string; userEmail: string; userName: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('join_requests_create_cmd', { input });
}

export async function tauriJoinRequestsGetForCurrentOrg() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('join_requests_get_for_current_org_cmd');
}

export async function tauriJoinRequestsImportOffline(requests: Array<Record<string, unknown>>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('join_requests_import_offline_cmd', { requests });
}

export async function tauriJoinRequestsApprove(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<void>>('join_requests_approve_cmd', { requestId });
}

export async function tauriJoinRequestsReject(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<void>>('join_requests_reject_cmd', { requestId });
}
