/**
 * Assets API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriAssetsAssignAssetToUser,
  tauriAssetsCreateAsset,
  tauriAssetsDeleteAsset,
  tauriAssetsGetAsset,
  tauriAssetsGetAssetByTag,
  tauriAssetsGetAssetsByOrg,
  tauriAssetsGetAssetsByStatus,
  tauriAssetsGetAssetsByUser,
  tauriAssetsUpdateAsset,
} from '@/lib/desktop/assets';

export async function createAsset(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriAssetsCreateAsset(data);
  const { createAsset: serverFn } = await import('@/_actions/assets');
  return serverFn(data as never);
}

export async function getAsset(assetId: string) {
  if (isTauriBackendAvailable()) return tauriAssetsGetAsset(assetId);
  const { getAsset: serverFn } = await import('@/_actions/assets');
  return serverFn(assetId);
}

export async function getAssetsByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriAssetsGetAssetsByOrg(orgId);
  const { getAssetsByOrg: serverFn } = await import('@/_actions/assets');
  return serverFn(orgId);
}

export async function getAssetsByStatus(orgId: string, status: string) {
  if (isTauriBackendAvailable()) return tauriAssetsGetAssetsByStatus(orgId, status);
  const { getAssetsByStatus: serverFn } = await import('@/_actions/assets');
  return serverFn(orgId, status as never);
}

export async function getAssetsByUser(userId: string) {
  if (isTauriBackendAvailable()) return tauriAssetsGetAssetsByUser(userId);
  const { getAssetsByUser: serverFn } = await import('@/_actions/assets');
  return serverFn(userId);
}

export async function getAssetByTag(tag: string, orgId: string) {
  if (isTauriBackendAvailable()) return tauriAssetsGetAssetByTag(tag, orgId);
  const { getAssetByTag: serverFn } = await import('@/_actions/assets');
  return serverFn(tag, orgId);
}

export async function updateAsset(assetId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriAssetsUpdateAsset(assetId, data);
  const { updateAsset: serverFn } = await import('@/_actions/assets');
  return serverFn(assetId, data as never);
}

export async function assignAssetToUser(assetId: string, userId: string) {
  if (isTauriBackendAvailable()) return tauriAssetsAssignAssetToUser(assetId, userId);
  const { assignAssetToUser: serverFn } = await import('@/_actions/assets');
  return serverFn(assetId, userId);
}

export async function deleteAsset(assetId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriAssetsDeleteAsset(assetId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete asset' };
  }
  const { deleteAsset: serverFn } = await import('@/_actions/assets');
  return serverFn(assetId);
}
