import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  deserializeOfflineProfileCookie,
  OFFLINE_PROFILE_COOKIE,
} from '@/lib/offline/offline-profile';
import { sessionUserFromProfilePayload } from '@/lib/auth/session-user';
import { userAdmin } from '@/lib/auth/user-admin';
import type { SessionUser } from '@/lib/auth/types';

export type { SessionUser } from '@/lib/auth/types';

async function currentUserFromCookie(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(OFFLINE_PROFILE_COOKIE)?.value;
    if (!raw) return null;
    const payload = deserializeOfflineProfileCookie(raw);
    if (!payload) return null;
    return sessionUserFromProfilePayload(payload) as SessionUser;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  return currentUserFromCookie();
}

export async function auth() {
  const user = await currentUser();
  const isSignedIn = Boolean(user?.id);
  return {
    userId: isSignedIn ? String(user!.id) : null,
    sessionClaims: {
      publicMetadata: user?.publicMetadata,
      metadata: user?.publicMetadata,
    },
    redirectToSignIn: () => '/sign-in',
    protect: async () => isSignedIn,
    getToken: async () => null,
  };
}

export { userAdmin };
export type { UserJSON } from '@/lib/auth/types';

export function createRouteMatcher(_routes: string[]) {
  return (_req: Request | { nextUrl?: { pathname?: string } }) => false;
}

export function authMiddleware(
  handler: (
    authFn: typeof auth,
    req: unknown
  ) => Promise<Response | NextResponse | void> | Response | NextResponse | void
) {
  return async (req: unknown) => {
    const result = await handler(auth, req);
    return result ?? NextResponse.next();
  };
}
