"use client";

import { useCallback, useEffect, useState } from "react";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";
import { getSchoolStudentsWithBalances } from "@/lib/desktop/school-bridge";
import {
  aggregateSchoolPayments,
  getCurrentSchoolTerm,
  isSchoolCollectionTx,
  mapStudentBalances,
  normalizeSchoolPaymentTx,
  summarizeOutstanding,
  type SchoolPaymentTx,
} from "@/lib/school-finance";

export function useSchoolFinanceStats(orgId?: string, enabled = false) {
  const [stats, setStats] = useState({
    tuition: 0,
    transport: 0,
    uniform: 0,
    total: 0,
    outstanding: 0,
    collectionRate: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const now = new Date();
      const { start, end } = getCurrentSchoolTerm(now);

      const [txRes, studentsRes] = await Promise.all([
        getCashierTransactionsFiltered(orgId ? { orgId } : undefined),
        getSchoolStudentsWithBalances(orgId),
      ]);

      const txs = ((txRes.success ? txRes.data : []) ?? []) as SchoolPaymentTx[];
      const schoolTxs = txs.map(normalizeSchoolPaymentTx).filter(isSchoolCollectionTx);
      const termAgg = aggregateSchoolPayments(schoolTxs, start, end, "term");
      const balances = mapStudentBalances(
        ((studentsRes.success ? studentsRes.data : []) ?? []) as Record<string, unknown>[]
      );
      const outstanding = summarizeOutstanding(balances);

      setStats({
        tuition: termAgg.tuition,
        transport: termAgg.transport,
        uniform: termAgg.uniform,
        total: termAgg.total,
        outstanding: outstanding.totalDue,
        collectionRate: outstanding.collectionRate,
      });
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
