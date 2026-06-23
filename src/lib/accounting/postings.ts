import { ACCOUNT_CODES, accountName, cashAccountForPaymentMethod, DEFAULT_CHART_OF_ACCOUNTS } from './chart-of-accounts';
import type { ChartAccount, JournalLine, JournalSourceType } from './types';

export type PostingDraft = {
  date: Date;
  memo: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  sourceRef: string;
  lines: JournalLine[];
};

function line(code: string, name: string, debit: number, credit: number, memo?: string): JournalLine {
  return { accountCode: code, accountName: name, debit: round2(debit), credit: round2(credit), memo };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function balanced(lines: JournalLine[]): JournalLine[] {
  const dr = lines.reduce((s, l) => s + l.debit, 0);
  const cr = lines.reduce((s, l) => s + l.credit, 0);
  const diff = round2(dr - cr);
  if (Math.abs(diff) > 0.01) {
    throw new Error(`Unbalanced journal: debit ${dr} credit ${cr}`);
  }
  return lines;
}

function names(accounts: ChartAccount[]) {
  return (code: string) => accountName(accounts.length ? accounts : DEFAULT_CHART_OF_ACCOUNTS, code);
}

/** Invoice issued (accrual revenue recognition) */
export function postingInvoiceIssued(
  amount: number,
  invoiceId: string,
  customerName?: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft {
  const n = names(accounts);
  return {
    date: new Date(),
    memo: `Invoice issued${customerName ? ` — ${customerName}` : ''}`,
    sourceType: 'invoice',
    sourceId: invoiceId,
    sourceRef: `invoice:issued:${invoiceId}`,
    lines: balanced([
      line(ACCOUNT_CODES.AR, n(ACCOUNT_CODES.AR), amount, 0),
      line(ACCOUNT_CODES.SALES, n(ACCOUNT_CODES.SALES), 0, amount),
    ]),
  };
}

/** Customer payment received */
export function postingPaymentReceived(
  amount: number,
  paymentId: string,
  method?: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft {
  const n = names(accounts);
  const cashAcct = cashAccountForPaymentMethod(method);
  return {
    date: new Date(),
    memo: `Payment received (${method ?? 'cash'})`,
    sourceType: 'payment',
    sourceId: paymentId,
    sourceRef: `payment:completed:${paymentId}`,
    lines: balanced([
      line(cashAcct, n(cashAcct), amount, 0),
      line(ACCOUNT_CODES.AR, n(ACCOUNT_CODES.AR), 0, amount),
    ]),
  };
}

/** Direct cash sale without invoice (POS) */
export function postingPosSale(
  amount: number,
  orderId: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft {
  const n = names(accounts);
  return {
    date: new Date(),
    memo: 'POS sale',
    sourceType: 'pos',
    sourceId: orderId,
    sourceRef: `pos:completed:${orderId}`,
    lines: balanced([
      line(ACCOUNT_CODES.CASH, n(ACCOUNT_CODES.CASH), amount, 0),
      line(ACCOUNT_CODES.POS_REVENUE, n(ACCOUNT_CODES.POS_REVENUE), 0, amount),
    ]),
  };
}

/** Cashier register transaction */
export function postingCashierTransaction(
  type: string,
  amount: number,
  txId: string,
  description?: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft | null {
  const n = names(accounts);
  const abs = Math.abs(amount);
  if (abs <= 0) return null;

  if (type === 'sale' || type === 'deposit') {
    return {
      date: new Date(),
      memo: description || `Cashier ${type}`,
      sourceType: 'cashier',
      sourceId: txId,
      sourceRef: `cashier:${type}:${txId}`,
      lines: balanced([
        line(ACCOUNT_CODES.CASH, n(ACCOUNT_CODES.CASH), abs, 0),
        line(ACCOUNT_CODES.POS_REVENUE, n(ACCOUNT_CODES.POS_REVENUE), 0, abs),
      ]),
    };
  }
  if (type === 'refund' || type === 'withdrawal') {
    return {
      date: new Date(),
      memo: description || `Cashier ${type}`,
      sourceType: 'cashier',
      sourceId: txId,
      sourceRef: `cashier:${type}:${txId}`,
      lines: balanced([
        line(ACCOUNT_CODES.POS_REVENUE, n(ACCOUNT_CODES.POS_REVENUE), abs, 0),
        line(ACCOUNT_CODES.CASH, n(ACCOUNT_CODES.CASH), 0, abs),
      ]),
    };
  }
  return null;
}

/** Expense approved */
export function postingExpenseApproved(
  amount: number,
  expenseId: string,
  category?: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft {
  const n = names(accounts);
  return {
    date: new Date(),
    memo: `Expense${category ? ` — ${category}` : ''}`,
    sourceType: 'expense',
    sourceId: expenseId,
    sourceRef: `expense:approved:${expenseId}`,
    lines: balanced([
      line(ACCOUNT_CODES.OPEX, n(ACCOUNT_CODES.OPEX), amount, 0),
      line(ACCOUNT_CODES.AP, n(ACCOUNT_CODES.AP), 0, amount),
    ]),
  };
}

/** Payroll accrual */
export function postingPayrollAccrued(
  netPay: number,
  recordId: string,
  employeeLabel?: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft {
  const n = names(accounts);
  return {
    date: new Date(),
    memo: `Payroll${employeeLabel ? ` — ${employeeLabel}` : ''}`,
    sourceType: 'payroll',
    sourceId: recordId,
    sourceRef: `payroll:accrued:${recordId}`,
    lines: balanced([
      line(ACCOUNT_CODES.PAYROLL_EXPENSE, n(ACCOUNT_CODES.PAYROLL_EXPENSE), netPay, 0),
      line(ACCOUNT_CODES.PAYROLL_PAYABLE, n(ACCOUNT_CODES.PAYROLL_PAYABLE), 0, netPay),
    ]),
  };
}

/** Opening balances seed */
export function postingOpeningBalances(
  cash: number,
  bank: number,
  orgId: string,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): PostingDraft | null {
  const total = round2(cash + bank);
  if (total <= 0) return null;
  const n = names(accounts);
  const lines: JournalLine[] = [];
  if (cash > 0) lines.push(line(ACCOUNT_CODES.CASH, n(ACCOUNT_CODES.CASH), cash, 0));
  if (bank > 0) lines.push(line(ACCOUNT_CODES.BANK, n(ACCOUNT_CODES.BANK), bank, 0));
  lines.push(line(ACCOUNT_CODES.EQUITY, n(ACCOUNT_CODES.EQUITY), 0, total));
  return {
    date: new Date(),
    memo: 'Opening cash & bank balances',
    sourceType: 'opening',
    sourceId: orgId,
    sourceRef: `opening:${orgId}`,
    lines: balanced(lines),
  };
}
