import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri assets API requires the desktop shell');
  }
}

export async function tauriAssetsCreateAsset(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('assets_create_asset_cmd', { data });
}

export async function tauriAssetsGetAsset(assetId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('assets_get_asset_cmd', { assetId });
}

export async function tauriAssetsGetAssetsByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('assets_get_assets_by_org_cmd', { orgId });
}

export async function tauriAssetsGetAssetsByStatus(orgId: string, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('assets_get_assets_by_status_cmd', {
    orgId,
    status,
  });
}

export async function tauriAssetsGetAssetsByUser(userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('assets_get_assets_by_user_cmd', {
    userId,
  });
}

export async function tauriAssetsGetAssetByTag(tag: string, orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('assets_get_asset_by_tag_cmd', {
    tag,
    orgId,
  });
}

export async function tauriAssetsUpdateAsset(assetId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('assets_update_asset_cmd', {
    assetId,
    data,
  });
}

export async function tauriAssetsAssignAssetToUser(assetId: string, userId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('assets_assign_asset_to_user_cmd', {
    assetId,
    userId,
  });
}

export async function tauriAssetsDeleteAsset(assetId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('assets_delete_asset_cmd', { assetId });
}
