import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri user profile API requires the desktop shell');
  }
}

export async function tauriUserProfileGetCurrent() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('user_profile_get_current_cmd');
}

export async function tauriUserProfileUpdateCurrent(input: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('user_profile_update_current_cmd', { input });
}

export async function tauriUserProfileGetDisplayName() {
  requireTauri();
  return invoke<string>('user_profile_get_display_name_cmd');
}
