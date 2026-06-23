/** Auto-generated desktop stub for finance.ts */
export type { CashierTransaction, CreateCashierTransactionInput } from '@/lib/finance-shared';

export interface Budget {
  _id?: string;
  orgId: string;
  name: string;
  category: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  startDate: Date;
  endDate: Date;
  spent?: number;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  department?: string;
  project?: string;
  description?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy?: string;
  isRecurring?: boolean;
  parentBudgetId?: string;
  variance?: number;
  variancePercentage?: number;
  alerts?: Array<{ type: 'warning' | 'critical'; threshold: number; message: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function createInvoice(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createInvoice is not available until this module is migrated to Rust.' };
}

export async function getInvoice(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getInvoice is not available until this module is migrated to Rust.' };
}

export async function getInvoicesByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getInvoicesByOrg is not available until this module is migrated to Rust.' };
}

export async function updateInvoice(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateInvoice is not available until this module is migrated to Rust.' };
}

export async function deleteInvoice(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteInvoice is not available until this module is migrated to Rust.' };
}

export async function createPayment(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createPayment is not available until this module is migrated to Rust.' };
}

export async function getPaymentsByInvoice(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getPaymentsByInvoice is not available until this module is migrated to Rust.' };
}

export async function getPaymentsByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getPaymentsByOrg is not available until this module is migrated to Rust.' };
}

export async function updatePayment(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updatePayment is not available until this module is migrated to Rust.' };
}

export async function createExpense(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createExpense is not available until this module is migrated to Rust.' };
}

export async function getExpensesByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getExpensesByOrg is not available until this module is migrated to Rust.' };
}

export async function getExpensesByStatus(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getExpensesByStatus is not available until this module is migrated to Rust.' };
}

export async function updateExpense(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateExpense is not available until this module is migrated to Rust.' };
}

export async function deleteExpense(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteExpense is not available until this module is migrated to Rust.' };
}

export async function getFinanceSettings(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getFinanceSettings is not available until this module is migrated to Rust.' };
}

export async function updateFinanceSettings(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateFinanceSettings is not available until this module is migrated to Rust.' };
}

export async function createCashierTransaction(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createCashierTransaction is not available until this module is migrated to Rust.' };
}

export async function getCashierTransactions(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getCashierTransactions is not available until this module is migrated to Rust.' };
}

export async function getCashierTransactionsFiltered(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getCashierTransactionsFiltered is not available until this module is migrated to Rust.' };
}

export async function getDailyCashSummary(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getDailyCashSummary is not available until this module is migrated to Rust.' };
}

export async function createBudget(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createBudget is not available until this module is migrated to Rust.' };
}

export async function getBudgetsByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getBudgetsByOrg is not available until this module is migrated to Rust.' };
}

export async function updateBudget(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateBudget is not available until this module is migrated to Rust.' };
}

export async function deleteBudget(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteBudget is not available until this module is migrated to Rust.' };
}

export async function updateBudgetStatus(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateBudgetStatus is not available until this module is migrated to Rust.' };
}

export async function getBudgetVariance(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getBudgetVariance is not available until this module is migrated to Rust.' };
}

export async function getBudgetAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getBudgetAnalytics is not available until this module is migrated to Rust.' };
}

export async function getFinancialSummary(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getFinancialSummary is not available until this module is migrated to Rust.' };
}

export async function getFinanceMonthlyTrends(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getFinanceMonthlyTrends is not available until this module is migrated to Rust.' };
}
