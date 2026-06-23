/**
 * Analytics API — Rust/Tauri when available, Next server actions otherwise.
 */
import { desktopBridge } from '@/lib/desktop/bridge-utils';
import {
  tauriAnalyticsGetFinanceAnalytics,
  tauriAnalyticsGetHrAnalytics,
  tauriAnalyticsGetMarketingAnalytics,
  tauriAnalyticsGetOverviewAnalytics,
  tauriAnalyticsGetInventoryAndPosAnalytics,
  tauriAnalyticsGetReportsPageData,
} from '@/lib/desktop/analytics';

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

export async function getFinanceAnalytics(orgId?: string) {
  const { getFinanceAnalytics: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetFinanceAnalytics(orgId), () => serverFn(orgId));
}

export async function getHRAnalytics(orgId?: string) {
  const { getHRAnalytics: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetHrAnalytics(orgId), () => serverFn(orgId));
}

export async function getMarketingAnalytics(orgId?: string) {
  const { getMarketingAnalytics: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetMarketingAnalytics(orgId), () => serverFn(orgId));
}

export async function getOverviewAnalytics(orgId?: string) {
  const { getOverviewAnalytics: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetOverviewAnalytics(orgId), () => serverFn(orgId));
}

export async function getInventoryAndPOSAnalytics(orgId?: string) {
  const { getInventoryAndPOSAnalytics: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetInventoryAndPosAnalytics(orgId), () => serverFn(orgId));
}

export async function getReportsPageData(range: ReportsRange = '30d') {
  const { getReportsPageData: serverFn } = await import('@/_actions/analytics');
  return desktopBridge(() => tauriAnalyticsGetReportsPageData(range), () => serverFn(range));
}
