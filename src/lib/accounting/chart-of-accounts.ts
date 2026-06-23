import type { ChartAccount } from './types';

/** Standard SME chart — ops tags map into these GL accounts */
export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  { code: '1000', name: 'Cash on hand', type: 'asset', subtype: 'cash', enabled: true, system: true },
  { code: '1010', name: 'Bank', type: 'asset', subtype: 'bank', enabled: true, system: true },
  { code: '1100', name: 'Accounts receivable', type: 'asset', subtype: 'ar', enabled: true, system: true },
  { code: '1200', name: 'Inventory', type: 'asset', subtype: 'inventory', enabled: true, system: true },
  { code: '2000', name: 'Accounts payable', type: 'liability', subtype: 'ap', enabled: true, system: true },
  { code: '2100', name: 'Payroll payable', type: 'liability', subtype: 'payroll', enabled: true, system: true },
  { code: '3000', name: 'Owner equity', type: 'equity', subtype: 'equity', enabled: true, system: true },
  { code: '3900', name: 'Retained earnings', type: 'equity', subtype: 'retained', enabled: true, system: true },
  { code: '4000', name: 'Sales revenue', type: 'revenue', subtype: 'sales', enabled: true, system: true },
  { code: '4100', name: 'POS & cashier revenue', type: 'revenue', subtype: 'pos', enabled: true, system: true },
  { code: '4200', name: 'Other income', type: 'revenue', subtype: 'other', enabled: true, system: true },
  { code: '5000', name: 'Operating expenses', type: 'expense', subtype: 'opex', enabled: true, system: true },
  { code: '5100', name: 'Payroll expense', type: 'expense', subtype: 'payroll', enabled: true, system: true },
  { code: '5200', name: 'Cost of goods sold', type: 'expense', subtype: 'cogs', enabled: true, system: true },
];

export const ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1010',
  AR: '1100',
  AP: '2000',
  PAYROLL_PAYABLE: '2100',
  EQUITY: '3000',
  RETAINED: '3900',
  SALES: '4000',
  POS_REVENUE: '4100',
  OPEX: '5000',
  PAYROLL_EXPENSE: '5100',
} as const;

export function accountName(accounts: ChartAccount[], code: string): string {
  return accounts.find((a) => a.code === code)?.name ?? code;
}

export function cashAccountForPaymentMethod(method?: string): string {
  switch (method) {
    case 'bank_transfer':
    case 'check':
      return ACCOUNT_CODES.BANK;
    default:
      return ACCOUNT_CODES.CASH;
  }
}
