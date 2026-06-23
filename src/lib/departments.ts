/**
 * ERP Departments - Core operational departments common to any organization
 * This list represents the main departments that any organization would have
 */
export const ERP_DEPARTMENTS = [
  'Finance & Accounting',
  'HR & Payroll',
  'Inventory',
  'Procurement',
  'Projects & Tasks',
  'CRM & Clients',
  'IT & Systems',
  'Helpdesk & Support',
] as const;

export type Department = typeof ERP_DEPARTMENTS[number];

