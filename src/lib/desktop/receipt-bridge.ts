/**
 * Receipt design API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriReceiptGetDesignForCurrentOrg,
  tauriReceiptUpdateDesignForCurrentOrg,
} from '@/lib/desktop/receipt';

export async function getReceiptDesignForCurrentOrg() {
  if (isTauriBackendAvailable()) {
    const res = await tauriReceiptGetDesignForCurrentOrg();
    return res.success ? (res.data as never) : null;
  }
  const { getReceiptDesignForCurrentOrg: serverFn } = await import('@/_actions/receipt-design');
  return serverFn();
}

export async function updateReceiptDesignForCurrentOrg(settings: Record<string, unknown>) {
  if (isTauriBackendAvailable()) {
    const res = await tauriReceiptUpdateDesignForCurrentOrg(settings);
    if (!res.success) return { success: false as const, error: res.error ?? 'Failed to save receipt design' };
    return { success: true as const, data: res.data as never };
  }
  const { updateReceiptDesignForCurrentOrg: serverFn } = await import('@/_actions/receipt-design');
  return serverFn(settings as never);
}
