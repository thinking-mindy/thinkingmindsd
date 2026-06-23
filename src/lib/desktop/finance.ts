import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri finance API requires the desktop shell');
  }
}

export async function tauriFinanceCreateInvoice(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_create_invoice_cmd', { data });
}

export async function tauriFinanceGetInvoice(invoiceId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_get_invoice_cmd', { invoiceId });
}

export async function tauriFinanceGetInvoicesByOrg(orgId?: string, range?: { startDate?: string; endDate?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_invoices_by_org_cmd', {
    orgId,
    range: range ?? null,
  });
}

export async function tauriFinanceUpdateInvoice(invoiceId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_update_invoice_cmd', { invoiceId, data });
}

export async function tauriFinanceDeleteInvoice(invoiceId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('finance_delete_invoice_cmd', { invoiceId });
}

export async function tauriFinanceCreatePayment(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_create_payment_cmd', { data });
}

export async function tauriFinanceGetPaymentsByInvoice(invoiceId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_payments_by_invoice_cmd', { invoiceId });
}

export async function tauriFinanceGetPaymentsByOrg(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_payments_by_org_cmd', { orgId: orgId ?? null });
}

export async function tauriFinanceUpdatePayment(paymentId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_update_payment_cmd', { paymentId, data });
}

export async function tauriFinanceCreateExpense(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_create_expense_cmd', { data });
}

export async function tauriFinanceGetExpensesByOrg(orgId?: string, range?: { startDate?: string; endDate?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_expenses_by_org_cmd', {
    orgId,
    range: range ?? null,
  });
}

export async function tauriFinanceGetExpensesByStatus(orgId: string | undefined, status: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_expenses_by_status_cmd', { orgId, status });
}

export async function tauriFinanceUpdateExpense(expenseId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_update_expense_cmd', { expenseId, data });
}

export async function tauriFinanceDeleteExpense(expenseId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('finance_delete_expense_cmd', { expenseId });
}

export async function tauriFinanceGetFinanceSettings(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_get_finance_settings_cmd', { orgId: orgId ?? null });
}

export async function tauriFinanceUpdateFinanceSettings(orgId: string | undefined, settings: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('finance_update_finance_settings_cmd', { orgId, settings });
}

export async function tauriFinanceCreateCashierTransaction(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_create_cashier_transaction_cmd', { data });
}

export async function tauriFinanceGetCashierTransactions(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_cashier_transactions_cmd', { orgId: orgId ?? null });
}

export async function tauriFinanceGetCashierTransactionsFiltered(filters?: {
  orgId?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_cashier_transactions_filtered_cmd', {
    filters: filters ?? null,
  });
}

export async function tauriFinanceGetDailyCashSummary(orgId?: string, date?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_get_daily_cash_summary_cmd', {
    orgId: orgId ?? null,
    date: date ?? null,
  });
}

export async function tauriFinanceCreateBudget(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_create_budget_cmd', { data });
}

export async function tauriFinanceGetBudgetsByOrg(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_budgets_by_org_cmd', { orgId: orgId ?? null });
}

export async function tauriFinanceUpdateBudget(budgetId: string, data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_update_budget_cmd', { budgetId, data });
}

export async function tauriFinanceDeleteBudget(budgetId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('finance_delete_budget_cmd', { budgetId });
}

export async function tauriFinanceUpdateBudgetStatus(input: {
  budgetId: string;
  status: string;
  approvedBy?: string;
}) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_update_budget_status_cmd', { input });
}

export async function tauriFinanceGetBudgetVariance(orgId?: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_budget_variance_cmd', { orgId: orgId ?? null });
}

export async function tauriFinanceGetBudgetAnalytics(input?: { orgId?: string; period?: string }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_get_budget_analytics_cmd', { input: input ?? null });
}

export async function tauriFinanceGetFinancialSummary(input?: {
  orgId?: string;
  startDate?: string;
  endDate?: string;
}) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('finance_get_financial_summary_cmd', { input: input ?? null });
}

export async function tauriFinanceGetFinanceMonthlyTrends(input?: { orgId?: string; months?: number }) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('finance_get_finance_monthly_trends_cmd', {
    input: input ?? null,
  });
}
