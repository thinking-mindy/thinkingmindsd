"use client";

import { useCallback, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  AccountBalanceOutlined,
  AssessmentOutlined,
  AttachMoneyOutlined,
  AutoGraphOutlined,
  ScaleOutlined,
  BookOutlined,
  DashboardOutlined,
  PaidOutlined,
  PaymentOutlined,
  ReceiptLongOutlined,
  ReceiptOutlined,
  SettingsOutlined,
  SyncAltOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import ModuleShell from "@/components/ModuleShell";
import type { ModuleTab } from "@/components/ModuleShell";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import { useUser } from "@/lib/auth/client";
import FinanceCategoryToggle, { type FinanceCategory } from "./components/FinanceCategoryToggle";
import FinanceBridgeBar from "./components/FinanceBridgeBar";
import { useFinancePageData } from "./hooks/useFinancePageData";
import DashboardTab from "./(pages)/dashboard";
import PaymentsTab from "./(pages)/payments";
import ReceivablesTab from "./(pages)/receivables";
import BudgetsTab from "./(pages)/budgets";
import PayrollTab from "./(pages)/payroll";
import ExpensesTab from "./(pages)/expenses";
import ReportsTab from "./(pages)/reports";
import ConfigurationTab from "./(pages)/configuration";
import LedgerAccountingPanel from "./(pages)/accounting-ledger";
import LedgerSettingsTab from "./(pages)/ledger-settings";

const OPS_TABS: Omit<ModuleTab, "id">[] = [
  { label: "Dashboard", description: "Cashflow overview", icon: <DashboardOutlined /> },
  { label: "Payments", description: "Outgoing payments", icon: <PaymentOutlined /> },
  { label: "Receivables", description: "Invoices & AR", icon: <ReceiptLongOutlined /> },
  { label: "Budgets", description: "Plan & track", icon: <AccountBalanceOutlined /> },
  { label: "Payroll", description: "Staff compensation", icon: <PaidOutlined /> },
  { label: "Expenses", description: "Cost tracking", icon: <ReceiptOutlined /> },
  { label: "Reports", description: "Ops exports", icon: <AssessmentOutlined /> },
  { label: "Settings", description: "Currency & cashier", icon: <SettingsOutlined /> },
];

const LEDGER_TABS: Omit<ModuleTab, "id">[] = [
  { label: "Statements", description: "P&L & trial balance", icon: <BookOutlined /> },
  { label: "Journal", description: "Posted entries", icon: <ReceiptLongOutlined /> },
  { label: "Chart of accounts", description: "GL accounts", icon: <AccountBalanceOutlined /> },
  { label: "Reconcile", description: "Cash & bank", icon: <SyncAltOutlined /> },
  { label: "Settings", description: "Basis & auto-post", icon: <SettingsOutlined /> },
];

export default function FinanceDashboard() {
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;

  const [category, setCategory] = useState<FinanceCategory>("ops");
  const [opsTab, setOpsTab] = useState(0);
  const [ledgerTab, setLedgerTab] = useState(0);

  const data = useFinancePageData(orgId);

  const handleCategoryChange = useCallback((next: FinanceCategory) => {
    setCategory(next);
  }, []);

  const handleSync = useCallback(async () => {
    await data.syncToLedger();
    setCategory("ledger");
    setLedgerTab(0);
  }, [data]);

  const tabs = useMemo<ModuleTab[]>(() => {
    if (category === "ops") {
      return OPS_TABS.map((t, id) => ({ ...t, id }));
    }
    return LEDGER_TABS.map((t, id) => ({
      ...t,
      id,
      badge: id === 1 && data.journals.length > 0 ? data.journals.length : undefined,
    }));
  }, [category, data.journals.length]);

  const tabIndex = category === "ops" ? opsTab : ledgerTab;
  const onTabChange = category === "ops" ? setOpsTab : setLedgerTab;

  const statCards = useMemo(() => {
    if (category === "ops") {
      const overdue = data.summary?.overdueInvoices ?? 0;
      return [
        {
          label: "Revenue (MTD)",
          value: formatCurrency(data.summary?.totalRevenue ?? 0),
          icon: <TrendingUpOutlined />,
        },
        {
          label: "Expenses (MTD)",
          value: formatCurrency(data.summary?.totalExpenses ?? 0),
          icon: <ReceiptOutlined />,
        },
        {
          label: "Net income",
          value: formatUsd(data.summary?.netIncome ?? 0),
          icon: <AttachMoneyOutlined />,
          pulse: (data.summary?.netIncome ?? 0) < 0,
        },
        {
          label: "Overdue invoices",
          value: overdue,
          icon: <PaymentOutlined />,
          pulse: overdue > 0,
        },
      ];
    }

    const glRev = data.statements?.incomeStatement?.revenue ?? 0;
    const glExp = data.statements?.incomeStatement?.expenses ?? 0;
    const glNet = data.glNet;
    const assets = data.statements?.balanceSheet?.assets ?? 0;
    const liabilities = data.statements?.balanceSheet?.liabilities ?? 0;

    return [
      { label: "GL revenue", value: formatCurrency(glRev), icon: <BookOutlined /> },
      { label: "GL expenses", value: formatCurrency(glExp), icon: <AutoGraphOutlined /> },
      {
        label: "Net income (GL)",
        value: formatUsd(glNet),
        icon: <ScaleOutlined />,
        pulse: glNet < 0,
      },
      {
        label: "Assets / liabilities",
        value: `${formatCurrency(assets)} / ${formatCurrency(liabilities)}`,
        icon: <AccountBalanceOutlined />,
      },
    ];
  }, [category, data]);

  const ledgerViews = ["overview", "journal", "coa", "reconcile"] as const;

  if (data.loading && !data.summary && !data.statements) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", py: 3, px: { xs: 2, md: 4 } }}>
      <ModuleShell
        overline={category === "ops" ? "Operations accounting" : "General ledger"}
        title="Finance"
        subtitle={
          category === "ops"
            ? "Run the business — invoices, payments, payroll, expenses, and ops reporting."
            : "The books — double-entry ledger, financial statements, and reconciliation."
        }
        heroIcon={<AccountBalanceOutlined sx={{ fontSize: 30 }} />}
        heroChips={<FinanceCategoryToggle value={category} onChange={handleCategoryChange} />}
        statCards={statCards}
        alertSlot={
          <>
            <FinanceBridgeBar
              opsNet={data.opsNet}
              glNet={data.glNet}
              journalCount={data.journals.length}
              syncing={data.syncing}
              onSync={() => void handleSync()}
              onRefresh={() => void data.refresh()}
            />
          </>
        }
        tabIndex={tabIndex}
        onTabChange={onTabChange}
        tabs={tabs}
      >
        {category === "ops" && (
          <>
            {opsTab === 0 && <DashboardTab />}
            {opsTab === 1 && <PaymentsTab />}
            {opsTab === 2 && <ReceivablesTab />}
            {opsTab === 3 && <BudgetsTab />}
            {opsTab === 4 && <PayrollTab />}
            {opsTab === 5 && <ExpensesTab />}
            {opsTab === 6 && <ReportsTab />}
            {opsTab === 7 && <ConfigurationTab />}
          </>
        )}

        {category === "ledger" && (
          <>
            {ledgerTab < 4 && (
              <LedgerAccountingPanel
                view={ledgerViews[ledgerTab]}
                statements={data.statements}
                trialBalance={data.trialBalance}
                journals={data.journals}
                coa={data.coa}
                onReconcile={data.reconcile}
              />
            )}
            {ledgerTab === 4 && <LedgerSettingsTab />}
          </>
        )}
      </ModuleShell>
    </Box>
  );
}
