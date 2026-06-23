/** Auto-generated desktop stub for analytics.ts */
export type ReportsRange = '7d' | '30d' | '90d' | '12m';

export type ReportsPageData = {
  range: ReportsRange;
  summary: {
    posRevenue: number;
    posOrders: number;
    financeRevenue: number;
    expenses: number;
    netIncome: number;
    inventoryItems: number;
    lowStock: number;
    outOfStock: number;
  };
  trend: { label: string; posRevenue: number; financeRevenue: number; expenses: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMix: { method: string; count: number; amount: number }[];
};

export async function getFinanceAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getFinanceAnalytics is not available until this module is migrated to Rust.' };
}

export async function getHRAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getHRAnalytics is not available until this module is migrated to Rust.' };
}

export async function getMarketingAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getMarketingAnalytics is not available until this module is migrated to Rust.' };
}

export async function getOverviewAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getOverviewAnalytics is not available until this module is migrated to Rust.' };
}

export async function getInventoryAndPOSAnalytics(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getInventoryAndPOSAnalytics is not available until this module is migrated to Rust.' };
}

export async function getReportsPageData(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getReportsPageData is not available until this module is migrated to Rust.' };
}
