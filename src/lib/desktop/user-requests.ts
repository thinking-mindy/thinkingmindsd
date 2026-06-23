import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri user requests API requires the desktop shell');
  }
}

export async function tauriUserRequestsCreateUserRequest(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('user_requests_create_user_request_cmd', {
    data,
  });
}

export async function tauriUserRequestsGetUserRequest(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('user_requests_get_user_request_cmd', {
    requestId,
  });
}

export async function tauriUserRequestsGetUserRequestsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'user_requests_get_user_requests_by_org_cmd',
    { orgId }
  );
}

export async function tauriUserRequestsGetUserRequestsByUser(userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'user_requests_get_user_requests_by_user_cmd',
    { userId }
  );
}

export async function tauriUserRequestsGetUserRequestsByStatus(orgId: string, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'user_requests_get_user_requests_by_status_cmd',
    { orgId, status }
  );
}

export async function tauriUserRequestsUpdateUserRequest(
  requestId: string,
  data: Record<string, unknown>
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>(
    'user_requests_update_user_request_cmd',
    {
      requestId,
      data,
    }
  );
}

export async function tauriUserRequestsDeleteUserRequest(requestId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('user_requests_delete_user_request_cmd', { requestId });
}
