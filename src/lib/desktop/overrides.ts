import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri overrides API requires the desktop shell');
  }
}

export async function tauriOverridesEnsureProject() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('overrides_ensure_project_cmd');
}

export async function tauriOverridesListFiles() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('overrides_list_files_cmd');
}

export async function tauriOverridesGetFile(path: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('overrides_get_file_cmd', { path });
}

export async function tauriOverridesUpsertFile(input: { path: string; content: string; contentType?: string }) {
  requireTauri();
  return invoke<TauriActionResult<void>>('overrides_upsert_file_cmd', { input });
}

export async function tauriOverridesDeleteFile(path: string) {
  requireTauri();
  return invoke<TauriActionResult<void>>('overrides_delete_file_cmd', { path });
}

export async function tauriOverridesResolveOrDefault(path: string, defaultContent: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('overrides_resolve_or_default_cmd', {
    path,
    defaultContent,
  });
}

export async function tauriOverridesRunShellCommand(input: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('overrides_run_shell_command_cmd', { input });
}
