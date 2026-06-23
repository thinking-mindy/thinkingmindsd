/**
 * Centralised module access — import from here across UI, API helpers, and server guards.
 *
 * Client: `useAccessControl()` from `@/hooks/useAccessControl`
 * Server: `getAccessContext()` from `@/lib/access-control-server`
 */

import {
  canAccessPath,
  getEffectiveAllowedModules,
  hasAssignedModules,
  isCompanyOwner,
  MODULE_LABELS,
  moduleLabel,
  pathToModule,
  type ModuleAccessIdentity,
} from '@/lib/modules';

export type { ModuleAccessIdentity };

/** Partial identity from Clerk metadata, cookies, or the org record. */
export type AccessSeed = ModuleAccessIdentity & {
  allowedModules?: string[] | null;
  companyId?: string;
};

export type AccessSnapshot = AccessSeed & {
  isOwner: boolean;
  hasAssignedModules: boolean;
  /** `null` = unrestricted (org owner). */
  effectiveModules: string[] | null;
  canAccess: (path: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
};

/** Merge client + server sources; server fills gaps (e.g. org ownerId from DB). */
export function mergeAccessIdentity(
  client?: AccessSeed | null,
  server?: AccessSeed | null
): AccessSeed {
  return {
    role: client?.role ?? server?.role,
    allowedModules: client?.allowedModules ?? server?.allowedModules ?? undefined,
    userId: client?.userId ?? server?.userId,
    orgOwnerId: client?.orgOwnerId ?? server?.orgOwnerId,
    companyId: client?.companyId ?? server?.companyId,
  };
}

/** Build computed flags from a resolved identity. */
export function buildAccessSnapshot(identity: AccessSeed): AccessSnapshot {
  const role = identity.role;
  const allowedModules = identity.allowedModules;
  const userId = identity.userId;
  const orgOwnerId = identity.orgOwnerId;

  return {
    ...identity,
    isOwner: isCompanyOwner(role, userId, orgOwnerId),
    hasAssignedModules: hasAssignedModules(role, allowedModules, userId, orgOwnerId),
    effectiveModules: getEffectiveAllowedModules(role, allowedModules, userId, orgOwnerId),
    canAccess: (path: string) => canAccessPath(role, allowedModules, path, userId, orgOwnerId),
    canAccessModule: (moduleKey: string) =>
      canAccessPath(role, allowedModules, `/${moduleKey}`, userId, orgOwnerId),
  };
}

export function accessSeedFromUser(user: {
  id?: string;
  publicMetadata?: Record<string, unknown>;
} | null | undefined): AccessSeed | null {
  if (!user?.id) return null;
  const meta = user.publicMetadata ?? {};
  return {
    userId: user.id,
    role: meta.role as string | undefined,
    allowedModules: meta.allowedModules as string[] | undefined,
    orgOwnerId: meta.companyOwnerId as string | undefined,
    companyId: meta.companyId as string | undefined,
  };
}

export {
  canAccessPath,
  getEffectiveAllowedModules,
  hasAssignedModules,
  isCompanyOwner,
  MODULE_LABELS,
  moduleLabel,
  pathToModule,
};
