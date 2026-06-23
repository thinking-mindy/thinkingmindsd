/**
 * Join requests API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriJoinRequestsCreate,
  tauriJoinRequestsGetForCurrentOrg,
  tauriJoinRequestsImportOffline,
  tauriJoinRequestsApprove,
  tauriJoinRequestsReject,
} from '@/lib/desktop/join-requests';

export async function createJoinRequest(
  orgId: string | { toString(): string },
  userEmail: string,
  userName: string,
  options?: { companyName?: string; ownerId?: string }
) {
  if (isTauriBackendAvailable()) {
    return tauriJoinRequestsCreate({ orgId: String(orgId), userEmail, userName });
  }
  const { createJoinRequest: serverFn } = await import('@/_actions/join-requests');
  return serverFn(orgId as never, userEmail, userName, options);
}

export async function getJoinRequestsForCurrentOrg() {
  if (isTauriBackendAvailable()) return tauriJoinRequestsGetForCurrentOrg();
  const { getJoinRequestsForCurrentOrg: serverFn } = await import('@/_actions/join-requests');
  return serverFn();
}

export async function importOfflineJoinRequests(requests: Array<Record<string, unknown>>) {
  if (isTauriBackendAvailable()) return tauriJoinRequestsImportOffline(requests);
  const { importOfflineJoinRequests: serverFn } = await import('@/_actions/join-requests');
  return serverFn(requests as never);
}

export async function approveJoinRequest(requestId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriJoinRequestsApprove(requestId);
    if (res.success) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to approve request' };
  }
  const { approveJoinRequest: serverFn } = await import('@/_actions/join-requests');
  return serverFn(requestId);
}

export async function rejectJoinRequest(requestId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriJoinRequestsReject(requestId);
    if (res.success) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to reject request' };
  }
  const { rejectJoinRequest: serverFn } = await import('@/_actions/join-requests');
  return serverFn(requestId);
}

export async function getJoinRequestsForOrg(orgId: string) {
  const { getJoinRequestsForOrg: serverFn } = await import('@/_actions/join-requests');
  return serverFn(orgId);
}

export async function getJoinRequestsForUser() {
  const { getJoinRequestsForUser: serverFn } = await import('@/_actions/join-requests');
  return serverFn();
}
