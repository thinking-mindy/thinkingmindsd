/**
 * Users API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import { tauriUsersGetMembers, tauriUsersUpdateAllowedModules } from '@/lib/desktop/users';

export async function getMembers() {
  if (isTauriBackendAvailable()) {
    const res = await tauriUsersGetMembers();
    return { aye: res.success ? (res.data ?? []) : [] };
  }
  const { getMembers: serverFn } = await import('@/_actions/users');
  return serverFn();
}

export async function updateUserAllowedModules(userId: string, allowedModules: string[]) {
  if (isTauriBackendAvailable()) {
    const res = await tauriUsersUpdateAllowedModules(userId, allowedModules);
    if (res.success) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to update modules' };
  }
  const { updateUserAllowedModules: serverFn } = await import('@/_actions/users');
  return serverFn(userId, allowedModules);
}
