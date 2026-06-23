import { invoke } from '@tauri-apps/api/core';
import type {
  TauriAuthLoginResponse,
  TauriCompanyOption,
  TauriOfflineUserSafe,
  TauriPublicProfile,
} from '@/lib/desktop/auth-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri auth requires the desktop shell');
  }
}

/** Map Rust auth user → legacy `OfflineUser` shape for session helpers. */
export function tauriUserToOfflineUser(
  user: TauriAuthLoginResponse['user']
): import('@/lib/offline/auth').OfflineUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    passwordHash: '',
    firstName: user.firstName,
    lastName: user.lastName,
    companyId: user.companyId,
    metadata: user.metadata,
    createdAt: user.createdAt,
  };
}

export async function tauriAuthLogin(
  identifier: string,
  password: string
): Promise<TauriAuthLoginResponse> {
  requireTauri();
  return invoke<TauriAuthLoginResponse>('auth_login', { identifier, password });
}

export async function tauriAuthLogout(): Promise<void> {
  requireTauri();
  return invoke<void>('auth_logout');
}

export async function tauriAuthGetCurrentUser(): Promise<TauriAuthLoginResponse | null> {
  requireTauri();
  return invoke<TauriAuthLoginResponse | null>('auth_get_current_user');
}

export async function tauriAuthListPublicProfiles(): Promise<TauriPublicProfile[]> {
  requireTauri();
  return invoke<TauriPublicProfile[]>('auth_list_public_profiles');
}

export async function tauriAuthHasUsers(): Promise<boolean> {
  requireTauri();
  return invoke<boolean>('auth_has_users');
}

export async function tauriAuthRegisterOwner(input: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
}): Promise<TauriAuthLoginResponse> {
  requireTauri();
  return invoke<TauriAuthLoginResponse>('auth_register_owner', input);
}

export async function tauriAuthRegisterJoin(input: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  companyId: string;
  companyName: string;
  ownerId: string;
}): Promise<TauriAuthLoginResponse> {
  requireTauri();
  return invoke<TauriAuthLoginResponse>('auth_register_join', input);
}

export async function tauriAuthListCompanies(): Promise<TauriCompanyOption[]> {
  requireTauri();
  return invoke<TauriCompanyOption[]>('auth_list_companies');
}

export async function tauriAuthListOfflineUsers(): Promise<TauriOfflineUserSafe[]> {
  requireTauri();
  return invoke<TauriOfflineUserSafe[]>('auth_list_offline_users');
}

export async function tauriAuthDeleteOfflineUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  requireTauri();
  const res = await invoke<{ success: boolean; error?: string }>('auth_delete_offline_user', {
    userId,
  });
  return res;
}
