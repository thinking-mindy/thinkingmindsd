import { invoke } from '@tauri-apps/api/core';
import type { TauriAppPaths, TauriCollectionMeta, TauriHealthResponse } from '@/lib/desktop/types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri backend is not available in this environment');
  }
}

/** Phase 0 — foundation commands (Rust local DB + paths). */
export async function tauriHealthCheck(): Promise<TauriHealthResponse> {
  requireTauri();
  return invoke<TauriHealthResponse>('health_check');
}

export async function tauriGetAppPaths(): Promise<TauriAppPaths> {
  requireTauri();
  return invoke<TauriAppPaths>('get_app_paths');
}

export async function tauriListDbCollections(): Promise<TauriCollectionMeta[]> {
  requireTauri();
  return invoke<TauriCollectionMeta[]>('list_db_collections');
}

export async function tauriReadCollection(
  collection: string
): Promise<Record<string, unknown>[]> {
  requireTauri();
  return invoke<Record<string, unknown>[]>('read_collection', { collection });
}

export async function tauriWriteCollection(
  collection: string,
  docs: Record<string, unknown>[]
): Promise<void> {
  requireTauri();
  return invoke<void>('write_collection', { collection, docs });
}
