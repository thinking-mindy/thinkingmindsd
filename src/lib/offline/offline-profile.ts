/**
 * Offline profile cookie helpers (client + server).
 */
import {
  offlineUserToSessionUser,
  sessionUserFromProfilePayload,
  type OfflineUserLike,
  type SessionProfilePayload,
} from '@/lib/auth/session-user';

export const OFFLINE_PROFILE_COOKIE = 'offline_profile';

export type { OfflineUserLike, SessionProfilePayload };
export type OfflineProfilePayload = SessionProfilePayload;

export { ALL_OFFLINE_ALLOWED_MODULES } from '@/lib/auth/session-user';

export function profilePayloadFromOfflineUser(
  user: OfflineUserLike & { username?: string }
): OfflineProfilePayload {
  const meta = user.metadata || {};
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username || (meta.username as string | undefined),
    phone: meta.phone as string | undefined,
    role: meta.role as string | undefined,
    companyId: user.companyId || (meta.companyId as string | undefined),
    companyName: meta.companyName as string | undefined,
    companyOwnerId: meta.companyOwnerId as string | undefined,
    allowedModules: meta.allowedModules as string[] | undefined,
    onCompleteSetup: meta.onCompleteSetup as boolean | undefined,
    imageUrl: meta.imageUrl as string | undefined,
  };
}

export function serializeOfflineProfileCookie(payload: OfflineProfilePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function deserializeOfflineProfileCookie(raw: string): OfflineProfilePayload | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as OfflineProfilePayload;
    if (parsed?.id && parsed?.email) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
