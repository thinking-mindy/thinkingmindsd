"use client";

import { useCallback, useEffect, useState } from "react";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";
import { getSchoolStudentsWithBalances } from "@/lib/desktop/school-bridge";
import {
  aggregateSchoolPayments,
  isSchoolCollectionTx,
  mapStudentBalances,
  normalizeSchoolPaymentTx,
  summarizeOutstanding,
  type SchoolPaymentTx,
} from "@/lib/school-finance";

function termRange(now = new Date()) {
  const month = now.getMonth();
  const termStartMonth = month < 4 ? 0 : month < 8 ? 4 : 8;
  return {
    start: new Date(now.getFullYear(), termStartMonth, 1),
    end: now,
  };
}

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
      const { start, end } = termRange(now);

      const [txRes, studentsRes] = await Promise.all([
        getCashierTransactionsFiltered(orgId ? { orgId } : undefined),
        getSchoolStudentsWithBalances(orgId),
      ]);

      const txs = ((txRes.success ? txRes.data : []) ?? []) as SchoolPaymentTx[];
      const schoolTxs = txs.map(normalizeSchoolPaymentTx).filter(isSchoolCollectionTx);
      const monthAgg = aggregateSchoolPayments(schoolTxs, start, end);
      const balances = mapStudentBalances(
        ((studentsRes.success ? studentsRes.data : []) ?? []) as Record<string, unknown>[]
      );
      const outstanding = summarizeOutstanding(balances);

      setStats({
        tuition: monthAgg.tuition,
        transport: monthAgg.transport,
        uniform: monthAgg.uniform,
        total: monthAgg.total,
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
