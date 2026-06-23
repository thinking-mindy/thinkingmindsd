'use client';

import { useContext, useMemo } from 'react';
import { useUser } from '@/lib/auth/client';
import {
  accessSeedFromUser,
  buildAccessSnapshot,
  mergeAccessIdentity,
  type AccessSnapshot,
} from '@/lib/access-control';
import { AccessControlContext } from '@/components/AccessControlProvider';

export type UseAccessControlResult = AccessSnapshot & {
  /** Clerk/offline auth finished loading. */
  isLoaded: boolean;
  /** Identity is available (client user or server seed). */
  isReady: boolean;
  isSignedIn: boolean;
};

/**
 * Centralised client access hook — import anywhere inside `(minds)` layout.
 *
 * @example
 * const { isOwner, canAccess, hasAssignedModules } = useAccessControl();
 * if (!canAccess('/finance')) return null;
 */
export function useAccessControl(): UseAccessControlResult {
  const serverSeed = useContext(AccessControlContext);
  const { user, isLoaded, isSignedIn } = useUser();

  const identity = useMemo(
    () => mergeAccessIdentity(accessSeedFromUser(user), serverSeed),
    [user, serverSeed]
  );

  const snapshot = useMemo(() => buildAccessSnapshot(identity), [identity]);

  const isReady = Boolean(identity.userId);

  return {
    ...snapshot,
    isLoaded,
    isReady,
    isSignedIn: isSignedIn ?? isReady,
  };
}
