import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri users API requires the desktop shell');
  }
}

export async function tauriUsersGetMembers() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('users_get_members_cmd');
}

export async function tauriUsersUpdateAllowedModules(userId: string, allowedModules: string[]) {
  requireTauri();
  return invoke<TauriActionResult<void>>('users_update_allowed_modules_cmd', {
    input: { userId, allowedModules },
  });
}
