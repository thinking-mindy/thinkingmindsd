/**
 * Finance API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriFinanceCreateInvoice,
  tauriFinanceGetInvoice,
  tauriFinanceGetInvoicesByOrg,
  tauriFinanceUpdateInvoice,
  tauriFinanceDeleteInvoice,
  tauriFinanceCreatePayment,
  tauriFinanceGetPaymentsByInvoice,
  tauriFinanceGetPaymentsByOrg,
  tauriFinanceUpdatePayment,
  tauriFinanceCreateExpense,
  tauriFinanceGetExpensesByOrg,
  tauriFinanceGetExpensesByStatus,
  tauriFinanceUpdateExpense,
  tauriFinanceDeleteExpense,
  tauriFinanceGetFinanceSettings,
  tauriFinanceUpdateFinanceSettings,
  tauriFinanceCreateCashierTransaction,
  tauriFinanceGetCashierTransactions,
  tauriFinanceGetCashierTransactionsFiltered,
  tauriFinanceGetDailyCashSummary,
  tauriFinanceCreateBudget,
  tauriFinanceGetBudgetsByOrg,
  tauriFinanceUpdateBudget,
  tauriFinanceDeleteBudget,
  tauriFinanceUpdateBudgetStatus,
  tauriFinanceGetBudgetVariance,
  tauriFinanceGetBudgetAnalytics,
  tauriFinanceGetFinancialSummary,
  tauriFinanceGetFinanceMonthlyTrends,
} from '@/lib/desktop/finance';
export type { CashierTransaction, CreateCashierTransactionInput } from '@/lib/finance-shared';

function toIsoDate(value?: Date): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

export async function createInvoice(data: Record<string, unknown>) {
  const { createInvoice: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceCreateInvoice(data), () => serverFn(data as never));
}

export async function getInvoice(invoiceId: string) {
  const { getInvoice: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetInvoice(invoiceId), () => serverFn(invoiceId));
}

export async function getInvoicesByOrg(orgId: string, startDate?: Date, endDate?: Date) {
  if (isTauriBackendAvailable()) {
    return tauriFinanceGetInvoicesByOrg(orgId, { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) });
  }
  const { getInvoicesByOrg: serverFn } = await import('@/_actions/finance');
  return serverFn(orgId, startDate, endDate);
}

export async function updateInvoice(invoiceId: string, data: Record<string, unknown>) {
  const { updateInvoice: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceUpdateInvoice(invoiceId, data), () => serverFn(invoiceId, data as never));
}

export async function deleteInvoice(invoiceId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriFinanceDeleteInvoice(invoiceId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete invoice' };
  }
  const { deleteInvoice: serverFn } = await import('@/_actions/finance');
  return serverFn(invoiceId);
}

export async function createPayment(data: Record<string, unknown>) {
  const { createPayment: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceCreatePayment(data), () => serverFn(data as never));
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const { getPaymentsByInvoice: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetPaymentsByInvoice(invoiceId), () => serverFn(invoiceId));
}

export async function getPaymentsByOrg(orgId: string) {
  const { getPaymentsByOrg: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetPaymentsByOrg(orgId), () => serverFn(orgId));
}

export async function updatePayment(paymentId: string, data: Record<string, unknown>) {
  const { updatePayment: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceUpdatePayment(paymentId, data), () => serverFn(paymentId, data as never));
}

export async function createExpense(data: Record<string, unknown>) {
  const { createExpense: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceCreateExpense(data), () => serverFn(data as never));
}

export async function getExpensesByOrg(orgId: string, startDate?: Date, endDate?: Date) {
  if (isTauriBackendAvailable()) {
    return tauriFinanceGetExpensesByOrg(orgId, { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) });
  }
  const { getExpensesByOrg: serverFn } = await import('@/_actions/finance');
  return serverFn(orgId, startDate, endDate);
}

export async function getExpensesByStatus(orgId: string, status: string) {
  const { getExpensesByStatus: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetExpensesByStatus(orgId, status), () => serverFn(orgId, status as never));
}

export async function updateExpense(expenseId: string, data: Record<string, unknown>) {
  const { updateExpense: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceUpdateExpense(expenseId, data), () => serverFn(expenseId, data as never));
}

export async function deleteExpense(expenseId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriFinanceDeleteExpense(expenseId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete expense' };
  }
  const { deleteExpense: serverFn } = await import('@/_actions/finance');
  return serverFn(expenseId);
}

export async function getFinanceSettings(orgId?: string) {
  const { getFinanceSettings: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetFinanceSettings(orgId), () => serverFn(orgId));
}

export async function updateFinanceSettings(orgId: string, settings: Record<string, unknown>) {
  const { updateFinanceSettings: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceUpdateFinanceSettings(orgId, settings), () => serverFn(orgId, settings as never));
}

export async function createCashierTransaction(data: Record<string, unknown>) {
  const { createCashierTransaction: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceCreateCashierTransaction(data), () => serverFn(data as never));
}

export async function getCashierTransactions(orgId?: string) {
  const { getCashierTransactions: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetCashierTransactions(orgId), () => serverFn(orgId));
}

export async function getCashierTransactionsFiltered(filters?: {
  orgId?: string;
  cashierId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  if (isTauriBackendAvailable()) {
    return tauriFinanceGetCashierTransactionsFiltered(
      filters
        ? {
            orgId: filters.orgId,
            cashierId: filters.cashierId,
            startDate: toIsoDate(filters.startDate),
            endDate: toIsoDate(filters.endDate),
            limit: filters.limit,
          }
        : undefined
    );
  }
  const { getCashierTransactionsFiltered: serverFn } = await import('@/_actions/finance');
  return serverFn(filters as never);
}

export async function getDailyCashSummary(orgId?: string, date?: Date) {
  const { getDailyCashSummary: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetDailyCashSummary(orgId, toIsoDate(date)), () => serverFn(orgId, date));
}

export async function createBudget(data: Record<string, unknown>) {
  const { createBudget: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceCreateBudget(data), () => serverFn(data as never));
}

export async function getBudgetsByOrg(orgId?: string) {
  const { getBudgetsByOrg: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetBudgetsByOrg(orgId), () => serverFn(orgId));
}

export async function updateBudget(budgetId: string, data: Record<string, unknown>) {
  const { updateBudget: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceUpdateBudget(budgetId, data), () => serverFn(budgetId, data as never));
}

export async function deleteBudget(budgetId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriFinanceDeleteBudget(budgetId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete budget' };
  }
  const { deleteBudget: serverFn } = await import('@/_actions/finance');
  return serverFn(budgetId);
}

export async function updateBudgetStatus(
  budgetId: string,
  status: 'approved' | 'rejected',
  approvedBy?: string
) {
  if (isTauriBackendAvailable()) {
    return tauriFinanceUpdateBudgetStatus({ budgetId, status, approvedBy });
  }
  const { updateBudgetStatus: serverFn } = await import('@/_actions/finance');
  return serverFn(budgetId, status, approvedBy);
}

export async function getBudgetVariance(orgId?: string) {
  const { getBudgetVariance: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetBudgetVariance(orgId), () => serverFn(orgId));
}

export async function getBudgetAnalytics(orgId?: string, period?: 'monthly' | 'quarterly' | 'yearly') {
  const { getBudgetAnalytics: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetBudgetAnalytics({ orgId, period }), () => serverFn(orgId, period));
}

export async function getFinancialSummary(orgId?: string, startDate?: Date, endDate?: Date) {
  if (isTauriBackendAvailable()) {
    return tauriFinanceGetFinancialSummary({ orgId, startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) });
  }
  const { getFinancialSummary: serverFn } = await import('@/_actions/finance');
  return serverFn(orgId, startDate, endDate);
}

export async function getFinanceMonthlyTrends(orgId?: string, months = 6) {
  const { getFinanceMonthlyTrends: serverFn } = await import('@/_actions/finance');
  return desktopBridge(() => tauriFinanceGetFinanceMonthlyTrends({ orgId, months }), () => serverFn(orgId, months));
}
