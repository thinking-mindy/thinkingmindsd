"use client";

import ModuleConfigurationTab from "@/components/ModuleConfigurationTab";
import FinanceGeneralConfig from "./finance-general-config";
import FinanceCashierConfig from "./finance-cashier-config";

export default function FinanceConfigurationTab() {
  return (
    <ModuleConfigurationTab
      moduleTitle="Operations settings"
      moduleDescription="Currency, cashier register, and other day-to-day finance preferences."
      sections={[
        {
          id: "general",
          title: "General",
          description: "Base currency used across finance reports and transactions.",
          children: <FinanceGeneralConfig />,
        },
        {
          id: "cashier",
          title: "Cashier register",
          description: "Account categories and payment types for the /cashier module.",
          children: <FinanceCashierConfig embedded />,
        },
      ]}
    />
  );
}
