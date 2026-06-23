import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri receipt API requires the desktop shell');
  }
}

export async function tauriReceiptGetDesignForCurrentOrg() {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('receipt_get_design_for_current_org_cmd');
}

export async function tauriReceiptUpdateDesignForCurrentOrg(settings: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('receipt_update_design_for_current_org_cmd', {
    settings,
  });
}
