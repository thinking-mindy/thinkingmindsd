// Define which modules require pro plan
export const PRO_MODULES = [
  '/it',
  '/helpdesk',
  '/crm',
  '/audit',
] as const;

// Define which modules are available in free plan
export const FREE_MODULES = [
  '/',
  '/hr',
  '/inventory',
  '/finance',
  '/procurement',
  '/payroll',
  '/pos',
  '/cashier',
  '/school',
] as const;

export type ModulePath = typeof PRO_MODULES[number] | typeof FREE_MODULES[number];

