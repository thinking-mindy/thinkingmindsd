"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFinancialSummary } from "@/lib/desktop/finance-bridge";
import {
  backfillLedgerFromOps,
  getAccountingSettings,
  getAccountingStatements,
  getChartOfAccounts,
  getJournalEntries,
  getTrialBalance,
  reconcileCash,
  updateAccountingBasis,
} from "@/lib/desktop/accounting-bridge";
import type { AccountingBasis } from "@/lib/accounting/types";

export type FinancePageSummary = {
  totalRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
  opsNetIncome?: number;
  glNetIncome?: number;
  overdueInvoices?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
};

export function useFinancePageData(orgId?: string) {
  const period = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<FinancePageSummary | null>(null);
  const [basis, setBasis] = useState<AccountingBasis>("hybrid");
  const [statements, setStatements] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [summaryRes, settingsRes, stmtRes, tbRes, journalRes, coaRes] = await Promise.all([
        getFinancialSummary(orgId, period.start, period.end),
        getAccountingSettings(orgId),
        getAccountingStatements(orgId, period.start, period.end),
        getTrialBalance(orgId),
        getJournalEntries(orgId, 100),
        getChartOfAccounts(orgId),
      ]);

      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data as FinancePageSummary);
      if (settingsRes.success && settingsRes.data) {
        setBasis((settingsRes.data as { basis?: AccountingBasis }).basis ?? "hybrid");
      }
      if (stmtRes.success) setStatements(stmtRes.data);
      if (tbRes.success) setTrialBalance(tbRes.data ?? []);
      if (journalRes.success) setJournals(journalRes.data ?? []);
      if (coaRes.success) setCoa(coaRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [orgId, period.start, period.end]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const opsNet = summary?.netIncome ?? summary?.opsNetIncome ?? 0;
  const glNet = statements?.incomeStatement?.netIncome ?? summary?.glNetIncome ?? 0;

  const syncToLedger = useCallback(async () => {
    if (!orgId) return;
    setSyncing(true);
    try {
      await backfillLedgerFromOps(orgId);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [orgId, refresh]);

  const setBasisAndSave = useCallback(
    async (next: AccountingBasis) => {
      if (!orgId) return;
      setBasis(next);
      await updateAccountingBasis(orgId, next);
      await refresh();
    },
    [orgId, refresh]
  );

  const reconcile = useCallback(
    async (cash: number, bank: number, notes?: string) => {
      if (!orgId) return;
      await reconcileCash(orgId, cash, bank, notes);
      await refresh();
    },
    [orgId, refresh]
  );

  return {
    loading,
    syncing,
    summary,
    basis,
    statements,
    trialBalance,
    journals,
    coa,
    opsNet,
    glNet,
    refresh,
    syncToLedger,
    setBasisAndSave,
    reconcile,
  };
}
