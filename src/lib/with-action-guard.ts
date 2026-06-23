import {
  assertAnyModuleAccess,
  assertModuleAccess,
  assertOwner,
  assertOwnerOrDeveloper,
  requireAuth,
  requireCompanyMember,
} from '@/lib/module-access-server';
import { assertHasAssignedModules } from '@/lib/module-access-server';

type AsyncFn = (...args: never[]) => Promise<unknown>;

export function withAuthGuard<T extends AsyncFn>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await requireAuth();
    return fn(...args);
  }) as T;
}

export function withCompanyGuard<T extends AsyncFn>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await requireCompanyMember();
    return fn(...args);
  }) as T;
}

export function withModuleGuard<T extends AsyncFn>(moduleKey: string, fn: T): T {
  return (async (...args: Parameters<T>) => {
    await assertModuleAccess(moduleKey);
    return fn(...args);
  }) as T;
}

export function withAnyModuleGuard<T extends AsyncFn>(moduleKeys: string[], fn: T): T {
  return (async (...args: Parameters<T>) => {
    await assertAnyModuleAccess(moduleKeys);
    return fn(...args);
  }) as T;
}

export function withOwnerGuard<T extends AsyncFn>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await assertOwner();
    return fn(...args);
  }) as T;
}

export function withOwnerOrDeveloperGuard<T extends AsyncFn>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await assertOwnerOrDeveloper();
    return fn(...args);
  }) as T;
}

export function withHasAssignedModulesGuard<T extends AsyncFn>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await assertHasAssignedModules();
    return fn(...args);
  }) as T;
}
