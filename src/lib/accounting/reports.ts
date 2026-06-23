import type {
  AccountingBasis,
  AccountingSettings,
  ChartAccount,
  FinancialStatements,
  JournalEntry,
  TrialBalanceRow,
} from './types';
import { ACCOUNT_CODES } from './chart-of-accounts';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildTrialBalance(
  accounts: ChartAccount[],
  entries: JournalEntry[],
  periodEnd?: Date
): TrialBalanceRow[] {
  const end = periodEnd ?? new Date();
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const entry of entries) {
    if (entry.status !== 'posted') continue;
    const d = new Date(entry.date);
    if (d > end) continue;
    for (const ln of entry.lines) {
      const cur = totals.get(ln.accountCode) ?? { debit: 0, credit: 0 };
      cur.debit += ln.debit;
      cur.credit += ln.credit;
      totals.set(ln.accountCode, cur);
    }
  }

  return accounts
    .filter((a) => a.enabled)
    .map((a) => {
      const t = totals.get(a.code) ?? { debit: 0, credit: 0 };
      const balance =
        a.type === 'asset' || a.type === 'expense'
          ? round2(t.debit - t.credit)
          : round2(t.credit - t.debit);
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: round2(t.debit),
        credit: round2(t.credit),
        balance,
      };
    })
    .filter((r) => r.debit > 0 || r.credit > 0 || Math.abs(r.balance) > 0.001);
}

export function buildFinancialStatements(
  accounts: ChartAccount[],
  entries: JournalEntry[],
  settings: AccountingSettings,
  start: Date,
  end: Date
): FinancialStatements {
  const trialBalance = buildTrialBalance(accounts, entries, end);

  const inPeriod = entries.filter((e) => {
    if (e.status !== 'posted') return false;
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const revenueCodes = new Set(accounts.filter((a) => a.type === 'revenue').map((a) => a.code));
  const expenseCodes = new Set(accounts.filter((a) => a.type === 'expense').map((a) => a.code));

  let revenue = 0;
  let expenses = 0;
  let payroll = 0;
  const isLines: FinancialStatements['incomeStatement']['lines'] = [];

  for (const entry of inPeriod) {
    const basis = settings.basis;
    if (basis === 'cash') {
      if (!['payment', 'pos', 'cashier', 'expense', 'payroll'].includes(entry.sourceType)) continue;
    } else if (basis === 'accrual') {
      if (entry.sourceType === 'payment' && entry.lines.some((l) => l.accountCode === ACCOUNT_CODES.AR)) {
        // payment clearing AR — skip for P&L (revenue already on invoice)
        if (entry.lines.some((l) => revenueCodes.has(l.accountCode))) continue;
      }
    }
    // hybrid: post all journal P&L lines except pure AR/AP movements

    for (const ln of entry.lines) {
      if (revenueCodes.has(ln.accountCode)) {
        const amt = round2(ln.credit - ln.debit);
        if (amt !== 0) {
          revenue += amt;
          isLines.push({ code: ln.accountCode, name: ln.accountName, amount: amt, section: 'revenue' });
        }
      }
      if (expenseCodes.has(ln.accountCode)) {
        const amt = round2(ln.debit - ln.credit);
        if (amt !== 0) {
          expenses += amt;
          if (ln.accountCode === ACCOUNT_CODES.PAYROLL_EXPENSE) payroll += amt;
          isLines.push({ code: ln.accountCode, name: ln.accountName, amount: amt, section: 'expense' });
        }
      }
    }
  }

  const bsLines: FinancialStatements['balanceSheet']['lines'] = trialBalance
    .filter((r) => ['asset', 'liability', 'equity'].includes(r.type))
    .map((r) => ({
      code: r.code,
      name: r.name,
      amount: r.balance,
      section: r.type as 'asset' | 'liability' | 'equity',
    }));

  const assets = round2(bsLines.filter((l) => l.section === 'asset').reduce((s, l) => s + l.amount, 0));
  const liabilities = round2(bsLines.filter((l) => l.section === 'liability').reduce((s, l) => s + l.amount, 0));
  const equity = round2(bsLines.filter((l) => l.section === 'equity').reduce((s, l) => s + l.amount, 0));

  return {
    basis: settings.basis,
    period: { start: start.toISOString(), end: end.toISOString() },
    incomeStatement: {
      revenue: round2(revenue),
      expenses: round2(expenses),
      payroll: round2(payroll),
      netIncome: round2(revenue - expenses),
      lines: isLines,
    },
    balanceSheet: { assets, liabilities, equity, lines: bsLines },
    trialBalance,
  };
}
