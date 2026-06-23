'use client';

import type { ReactNode } from 'react';
import { useAccessControl } from '@/hooks/useAccessControl';

type Props = {
  /** Route path, e.g. `/finance` or `finance` */
  path?: string;
  /** Module key, e.g. `finance` */
  module?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Render children only when the user may access the given path/module.
 *
 * @example
 * <CanAccess module="admin" fallback={<p>Owners only</p>}>
 *   <AdminPanel />
 * </CanAccess>
 */
export default function CanAccess({ path, module, children, fallback = null }: Props) {
  const { isReady, canAccess, canAccessModule } = useAccessControl();

  if (!isReady) return null;

  const allowed = path
    ? canAccess(path.startsWith('/') ? path : `/${path}`)
    : module
      ? canAccessModule(module)
      : true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
