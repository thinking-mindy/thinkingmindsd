/**
 * Session user shape used across client hooks and server actions (local auth only).
 */
import type { SessionUser } from '@/lib/auth/types';

export const ALL_OFFLINE_ALLOWED_MODULES = [
  'dashboard',
  'finance',
  'inventory',
  'procurement',
  'hr',
  'tasks',
  'crm',
  'it',
  'helpdesk',
  'currency',
  'audit',
  'admin',
  'reports',
  'logs',
  'notifications',
  'payroll',
  'pos',
  'cashier',
] as const;

export type OfflineUserLike = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
};

const FALLBACK_COMPANY_ID = '000000000000000000000001';

export function offlineUserToSessionUser(user: OfflineUserLike): SessionUser {
  const meta = user.metadata || {};
  const firstName =
    (typeof user.firstName === 'string' && user.firstName.trim()) ||
    user.email.split('@')[0] ||
    'User';
  const lastName = (typeof user.lastName === 'string' && user.lastName.trim()) || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user.email;
  const companyOwnerId = meta.companyOwnerId as string | undefined;
  const role = (meta.role as string) || (user.id === companyOwnerId ? 'owner' : 'user');
  const companyId =
    user.companyId ||
    (meta.companyId as string | undefined) ||
    (meta.pendingCompanyId as string | undefined) ||
    FALLBACK_COMPANY_ID;
  const companyName =
    (meta.companyName as string | undefined) ||
    (meta.pendingCompanyName as string | undefined) ||
    'Company';

  const isOwner = role === 'owner' || (companyOwnerId && user.id === companyOwnerId);
  const allowedFromMeta = meta.allowedModules as string[] | undefined;
  const allowedModules = isOwner
    ? [...ALL_OFFLINE_ALLOWED_MODULES]
    : allowedFromMeta && allowedFromMeta.length > 0
      ? allowedFromMeta
      : ['dashboard'];

  return {
    id: user.id,
    email: user.email,
    username: meta.username as string | undefined,
    firstName,
    lastName,
    fullName,
    imageUrl: (meta.imageUrl as string) || '',
    emailAddresses: [{ emailAddress: user.email }],
    primaryEmailAddress: { emailAddress: user.email },
    publicMetadata: {
      ...meta,
      role: isOwner ? 'owner' : role,
      companyOwnerId: companyOwnerId || (isOwner ? user.id : undefined),
      onCompleteSetup: meta.onCompleteSetup !== false,
      companyId,
      companyName,
      allowedModules,
    },
    privateMetadata: {},
  };
}

export type SessionProfilePayload = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  role?: string;
  companyId?: string;
  companyName?: string;
  companyOwnerId?: string;
  allowedModules?: string[];
  onCompleteSetup?: boolean;
  imageUrl?: string;
};

export function sessionUserFromProfilePayload(payload: SessionProfilePayload): SessionUser {
  return offlineUserToSessionUser({
    id: payload.id,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    companyId: payload.companyId,
    metadata: {
      role: payload.role,
      companyId: payload.companyId,
      companyName: payload.companyName,
      companyOwnerId: payload.companyOwnerId,
      allowedModules: payload.allowedModules,
      onCompleteSetup: payload.onCompleteSetup,
      imageUrl: payload.imageUrl,
      username: payload.username,
      phone: payload.phone,
    },
  });
}
