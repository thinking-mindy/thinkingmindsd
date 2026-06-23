/** General ledger types — sits alongside ops finance (invoices, cashier, etc.). */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type AccountingBasis = 'accrual' | 'cash' | 'hybrid';

export type JournalSourceType =
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'pos'
  | 'cashier'
  | 'payroll'
  | 'manual'
  | 'opening'
  | 'reconciliation';

export type ChartAccount = {
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  enabled: boolean;
  system?: boolean;
};

export type JournalLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};

export type JournalEntry = {
  _id?: string;
  entryId?: string;
  orgId: string;
  date: string | Date;
  memo: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  /** Idempotency key — one posted entry per ops event */
  sourceRef: string;
  lines: JournalLine[];
  status: 'posted' | 'void';
  postedAt: string | Date;
  createdBy?: string;
};

export type AccountingSettings = {
  orgId: string;
  basis: AccountingBasis;
  fiscalYearStartMonth: number;
  autoPostFromOps: boolean;
  seededAt?: string | Date;
  cashOpeningBalance: number;
  bankOpeningBalance: number;
  lastReconciledAt?: string | Date;
};

export type TrialBalanceRow = {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  balance: number;
};

export type FinancialStatements = {
  basis: AccountingBasis;
  period: { start: string; end: string };
  incomeStatement: {
    revenue: number;
    expenses: number;
    payroll: number;
    netIncome: number;
    lines: { code: string; name: string; amount: number; section: 'revenue' | 'expense' }[];
  };
  balanceSheet: {
    assets: number;
    liabilities: number;
    equity: number;
    lines: { code: string; name: string; amount: number; section: 'asset' | 'liability' | 'equity' }[];
  };
  trialBalance: TrialBalanceRow[];
};

export const DEFAULT_ACCOUNTING_SETTINGS: Omit<AccountingSettings, 'orgId'> = {
  basis: 'hybrid',
  fiscalYearStartMonth: 1,
  autoPostFromOps: true,
  cashOpeningBalance: 0,
  bankOpeningBalance: 0,
};
