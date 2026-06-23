/**
 * User requests API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriUserRequestsCreateUserRequest,
  tauriUserRequestsDeleteUserRequest,
  tauriUserRequestsGetUserRequest,
  tauriUserRequestsGetUserRequestsByOrg,
  tauriUserRequestsGetUserRequestsByStatus,
  tauriUserRequestsGetUserRequestsByUser,
  tauriUserRequestsUpdateUserRequest,
} from '@/lib/desktop/user-requests';

export async function createUserRequest(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriUserRequestsCreateUserRequest(data);
  const { createUserRequest: serverFn } = await import('@/_actions/user-requests');
  return serverFn(data as never);
}

export async function getUserRequest(requestId: string) {
  if (isTauriBackendAvailable()) return tauriUserRequestsGetUserRequest(requestId);
  const { getUserRequest: serverFn } = await import('@/_actions/user-requests');
  return serverFn(requestId);
}

export async function getUserRequestsByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriUserRequestsGetUserRequestsByOrg(orgId);
  const { getUserRequestsByOrg: serverFn } = await import('@/_actions/user-requests');
  return serverFn(orgId);
}

export async function getUserRequestsByUser(userId: string) {
  if (isTauriBackendAvailable()) return tauriUserRequestsGetUserRequestsByUser(userId);
  const { getUserRequestsByUser: serverFn } = await import('@/_actions/user-requests');
  return serverFn(userId);
}

export async function getUserRequestsByStatus(orgId: string, status: string) {
  if (isTauriBackendAvailable()) return tauriUserRequestsGetUserRequestsByStatus(orgId, status);
  const { getUserRequestsByStatus: serverFn } = await import('@/_actions/user-requests');
  return serverFn(orgId, status as never);
}

export async function updateUserRequest(requestId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriUserRequestsUpdateUserRequest(requestId, data);
  const { updateUserRequest: serverFn } = await import('@/_actions/user-requests');
  return serverFn(requestId, data as never);
}

export async function deleteUserRequest(requestId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriUserRequestsDeleteUserRequest(requestId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete user request' };
  }
  const { deleteUserRequest: serverFn } = await import('@/_actions/user-requests');
  return serverFn(requestId);
}
