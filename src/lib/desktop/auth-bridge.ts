/**
 * Unified auth API — uses Rust/Tauri when available, otherwise browser offline storage.
 */
import {
  offlineAuth,
  type OfflineUser,
  getRecentUserIds,
  recordRecentUser,
  removeRecentUser,
  avatarColorFromId,
} from '@/lib/offline/auth';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriAuthGetCurrentUser,
  tauriAuthHasUsers,
  tauriAuthListCompanies,
  tauriAuthListPublicProfiles,
  tauriAuthLogin,
  tauriAuthLogout,
  tauriAuthRegisterJoin,
  tauriAuthRegisterOwner,
  tauriUserToOfflineUser,
} from '@/lib/desktop/auth';
import type { TauriPublicProfile } from '@/lib/desktop/auth-types';

export type PublicProfile = TauriPublicProfile;

export { getRecentUserIds, recordRecentUser, removeRecentUser, avatarColorFromId };

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  if (isTauriBackendAvailable()) {
    return tauriAuthListPublicProfiles();
  }
  return offlineAuth.listPublicProfiles();
}

export async function hasUsers(): Promise<boolean> {
  if (isTauriBackendAvailable()) {
    return tauriAuthHasUsers();
  }
  return offlineAuth.hasUsers();
}

export async function authenticate(
  identifier: string,
  password: string
): Promise<OfflineUser | null> {
  if (isTauriBackendAvailable()) {
    try {
      const res = await tauriAuthLogin(identifier, password);
      return tauriUserToOfflineUser(res.user);
    } catch {
      return null;
    }
  }
  return offlineAuth.authenticate(identifier, password);
}

export async function getCurrentUser(): Promise<OfflineUser | null> {
  if (isTauriBackendAvailable()) {
    const res = await tauriAuthGetCurrentUser();
    return res ? tauriUserToOfflineUser(res.user) : null;
  }
  return offlineAuth.getCurrentUser();
}

export async function getCurrentSessionUser(): Promise<
  import('@/lib/auth/types').SessionUser | null
> {
  if (isTauriBackendAvailable()) {
    const res = await tauriAuthGetCurrentUser();
    return (res?.sessionUser ?? null) as import('@/lib/auth/types').SessionUser | null;
  }
  const user = await offlineAuth.getCurrentUser();
  if (!user) return null;
  const { offlineUserToSessionUser } = await import('@/lib/auth/session-user');
  return offlineUserToSessionUser(user);
}

export async function logout(): Promise<void> {
  if (isTauriBackendAvailable()) {
    await tauriAuthLogout();
  } else {
    await offlineAuth.logout();
  }
  const { clearOfflineClientSession, notifyOfflineAuthChanged } = await import(
    '@/lib/offline/client-session'
  );
  clearOfflineClientSession();
  notifyOfflineAuthChanged();
}

export async function registerOwner(input: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
}): Promise<OfflineUser> {
  if (isTauriBackendAvailable()) {
    const res = await tauriAuthRegisterOwner(input);
    return tauriUserToOfflineUser(res.user);
  }

  const user = await offlineAuth.registerUser(input.email, input.password, {
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
    metadata: { role: 'owner', onCompleteSetup: false },
  });
  const { createOfflineCompany } = await import('@/lib/offline/company');
  const created = await createOfflineCompany(input.companyName, user.id);
  if (!created.success || !created.company) {
    throw new Error(created.error || 'Failed to create company');
  }
  await offlineAuth.updateUser(user.id, {
    companyId: created.company.id,
    metadata: {
      role: 'owner',
      companyOwnerId: user.id,
      onCompleteSetup: true,
      companyId: created.company.id,
      companyName: created.company.name,
    },
  });
  const loggedIn = await offlineAuth.authenticate(input.email, input.password);
  if (!loggedIn) throw new Error('Registration succeeded but login failed');
  return loggedIn;
}

export async function registerJoin(input: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  companyId: string;
  companyName: string;
  ownerId: string;
}): Promise<OfflineUser> {
  if (isTauriBackendAvailable()) {
    const res = await tauriAuthRegisterJoin(input);
    return tauriUserToOfflineUser(res.user);
  }

  const user = await offlineAuth.registerUser(input.email, input.password, {
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
    metadata: {
      role: 'pending',
      onCompleteSetup: false,
      pendingCompanyId: input.companyId,
      pendingCompanyName: input.companyName,
    },
  });
  const { createOfflineJoinRequest } = await import('@/lib/offline/company');
  await createOfflineJoinRequest({
    companyId: input.companyId,
    userId: user.id,
    email: user.email,
    name:
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
  });
  const loggedIn = await offlineAuth.authenticate(input.email, input.password);
  if (!loggedIn) throw new Error('Registration succeeded but login failed');
  return loggedIn;
}

export async function listCompaniesForRegister(): Promise<
  Array<{ id: string; name: string; createdByUserId: string }>
> {
  if (isTauriBackendAvailable()) {
    return tauriAuthListCompanies();
  }
  const { getOfflineCompanies } = await import('@/lib/offline/company');
  const companies = await getOfflineCompanies();
  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    createdByUserId: c.createdByUserId,
  }));
}
