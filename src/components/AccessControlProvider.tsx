'use client';

import React, { createContext, useMemo } from 'react';
import type { AccessSeed } from '@/lib/access-control';

export const AccessControlContext = createContext<AccessSeed>({});

type Props = {
  seed: AccessSeed;
  children: React.ReactNode;
};

/** Supplies server-resolved access seed (incl. org ownerId from DB) to client hooks. */
export default function AccessControlProvider({ seed, children }: Props) {
  const value = useMemo(
    () => seed,
    [seed.role, seed.allowedModules, seed.userId, seed.orgOwnerId, seed.companyId]
  );
  return (
    <AccessControlContext.Provider value={value}>{children}</AccessControlContext.Provider>
  );
}
