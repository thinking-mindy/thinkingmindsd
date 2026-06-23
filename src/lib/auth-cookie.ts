import { cookies } from 'next/headers';
import { canAccessPath } from '@/lib/access-control';
import { sessionUserFromProfilePayload } from '@/lib/auth/session-user';
import {
  deserializeOfflineProfileCookie,
  OFFLINE_PROFILE_COOKIE,
} from '@/lib/offline/offline-profile';

/** Middleware helper: read offline profile cookie from the request. */
export function userFromRequestCookie(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  const raw = req.cookies.get(OFFLINE_PROFILE_COOKIE)?.value;
  if (!raw) return null;
  const payload = deserializeOfflineProfileCookie(raw);
  if (!payload) return null;
  return sessionUserFromProfilePayload(payload) as {
    id: string;
    publicMetadata?: Record<string, unknown>;
  };
}

export function canAccessRequestPath(
  user: { id?: string; publicMetadata?: Record<string, unknown> } | null,
  pathname: string
): boolean {
  if (!user) return false;
  const role = user.publicMetadata?.role as string | undefined;
  const allowedModules = user.publicMetadata?.allowedModules as string[] | undefined;
  const orgOwnerId = user.publicMetadata?.companyOwnerId as string | undefined;
  return canAccessPath(role, allowedModules, pathname, user.id, orgOwnerId);
}

/** Resolve user from cookie jar (server components / route handlers). */
export async function getUserFromCookies() {
  const jar = await cookies();
  const raw = jar.get(OFFLINE_PROFILE_COOKIE)?.value;
  if (!raw) return null;
  const payload = deserializeOfflineProfileCookie(raw);
  if (!payload) return null;
  return sessionUserFromProfilePayload(payload) as {
    id: string;
    publicMetadata?: Record<string, unknown>;
  };
}
