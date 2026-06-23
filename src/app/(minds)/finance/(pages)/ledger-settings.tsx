"use client";

import ModuleConfigurationTab from "@/components/ModuleConfigurationTab";
import FinanceLedgerConfig from "./finance-ledger-config";

export default function LedgerSettingsTab() {
  return (
    <ModuleConfigurationTab
      moduleTitle="Ledger settings"
      moduleDescription="Reporting basis, auto-posting, and opening balances for the general ledger."
      sections={[
        {
          id: "ledger",
          title: "General ledger",
          description: "How operations events flow into formal books.",
          children: <FinanceLedgerConfig />,
        },
      ]}
    />
  );
}
