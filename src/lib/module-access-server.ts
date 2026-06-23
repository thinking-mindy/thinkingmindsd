import { currentUser } from '@/lib/auth/server';
import {
  canAccessPath,
  getEffectiveAllowedModules,
  hasAssignedModules,
  isCompanyOwner,
  pathToModule,
} from '@/lib/access-control';
import { getAccessContext, requireAccessContext } from '@/lib/access-control-server';

export type AuthUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** Require a signed-in user; returns the Clerk/offline user record. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

async function accessContextFrom(_user: AuthUser) {
  const ctx = await getAccessContext();
  if (!ctx) throw new Error('Not authenticated');
  return ctx;
}

/** Require membership in the user's organisation (has companyId). */
export async function requireCompanyMember(): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await requireAccessContext();
  if (!ctx.companyId) throw new Error('No organisation linked to this account');
  return user;
}

/** Only organisation owners may proceed. */
export async function assertOwner(): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await accessContextFrom(user);
  if (!isCompanyOwner(ctx.role, ctx.userId, ctx.orgOwnerId)) {
    throw new Error('Only the organisation owner can perform this action');
  }
  return user;
}

/** Owners and developers (dev overrides tooling). */
export async function assertOwnerOrDeveloper(): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await accessContextFrom(user);
  if (ctx.role !== 'developer' && !isCompanyOwner(ctx.role, ctx.userId, ctx.orgOwnerId)) {
    throw new Error('Only the organisation owner or a developer can perform this action');
  }
  return user;
}

/** Server-side guard for actions — throws if user lacks module access */
export async function assertModuleAccessForPath(pathname: string): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await accessContextFrom(user);
  if (!canAccessPath(ctx.role, ctx.allowedModules, pathname, ctx.userId, ctx.orgOwnerId)) {
    const mod = pathToModule(pathname);
    throw new Error(`Access denied${mod ? ` for ${mod}` : ''}`);
  }
  return user;
}

export async function assertModuleAccess(moduleKey: string): Promise<AuthUser> {
  return assertModuleAccessForPath(`/${moduleKey}`);
}

/** User must have access to at least one of the listed modules (or be owner). */
/** Dashboard overview — user must have at least one assigned module. */
export async function assertHasAssignedModules(): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await accessContextFrom(user);
  if (!hasAssignedModules(ctx.role, ctx.allowedModules, ctx.userId, ctx.orgOwnerId)) {
    throw new Error('Access denied — no modules assigned');
  }
  return user;
}

export async function assertAnyModuleAccess(moduleKeys: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  const ctx = await accessContextFrom(user);
  if (getEffectiveAllowedModules(ctx.role, ctx.allowedModules, ctx.userId, ctx.orgOwnerId) === null) {
    return user;
  }
  const allowed = moduleKeys.some((key) =>
    canAccessPath(ctx.role, ctx.allowedModules, `/${key}`, ctx.userId, ctx.orgOwnerId)
  );
  if (!allowed) {
    throw new Error(`Access denied for ${moduleKeys.join(', ')}`);
  }
  return user;
}

export { getEffectiveAllowedModules };
