"use client";

import { offlineStorage } from "./storage";

const DASHBOARD_ANALYTICS_FILE = "dashboard-analytics.json";

export type OfflineOverviewAnalytics = {
  income: number;
  sales: number;
  expenses: number;
  revenue: number;
  orders: number;
  ordersThisMonth: number;
  posRevenue: number;
  posRevenueThisMonth: number;
  inventoryTotalItems: number;
  inventoryLowStock: number;
  inventoryOutOfStock: number;
};

export type OfflineFinanceAnalytics = {
  revenue: {
    totalRevenue: number;
    profit: number;
    revenueProgress: number;
    profitProgress: number;
  };
  expenses: {
    expenses: number;
    pendingPayments: number;
    invoicesPaid: string;
    expensesProgress: number;
    paymentsProgress: number;
    invoicesProgress: number;
  };
  refunds: {
    invoicesPaid: string;
    invoicesProgress: number;
  };
};

export type OfflineHRAnalytics = {
  employees: {
    employees: string;
    newHires: string;
    openPositions: string;
    employeesProgress: number;
    newHiresProgress: number;
    positionsProgress: number;
  };
  activities: {
    interviewsScheduled: string;
    leavesApproved: string;
    trainingSessions: string;
    interviewsProgress: number;
    leavesProgress: number;
    trainingProgress: number;
  };
};

export type OfflineInventoryPOSAnalytics = {
  inventory: {
    totalItems: string;
    inStock: string;
    lowStock: string;
    outOfStock: string;
    inventoryProgress: number;
    lowStockProgress: number;
  };
  pos: {
    totalOrders: string;
    ordersToday: string;
    ordersThisMonth: string;
    revenue: string;
    revenueToday: string;
    posOrdersProgress: number;
    posRevenueProgress: number;
  };
};

export type OfflineDashboardAnalytics = {
  overview: OfflineOverviewAnalytics;
  finance: OfflineFinanceAnalytics;
  hr: OfflineHRAnalytics;
  inventoryPos: OfflineInventoryPOSAnalytics;
  updatedAt: string;
};

const defaultDashboardAnalytics: OfflineDashboardAnalytics = {
  overview: {
    income: 14520,
    sales: 18430,
    expenses: 5130,
    revenue: 13300,
    orders: 286,
    ordersThisMonth: 97,
    posRevenue: 9240,
    posRevenueThisMonth: 3120,
    inventoryTotalItems: 523,
    inventoryLowStock: 28,
    inventoryOutOfStock: 6,
  },
  finance: {
    revenue: {
      totalRevenue: 13300,
      profit: 8170,
      revenueProgress: 74,
      profitProgress: 61,
    },
    expenses: {
      expenses: 5130,
      pendingPayments: 1210,
      invoicesPaid: "34",
      expensesProgress: 56,
      paymentsProgress: 42,
      invoicesProgress: 68,
    },
    refunds: {
      invoicesPaid: "34",
      invoicesProgress: 68,
    },
  },
  hr: {
    employees: {
      employees: "42",
      newHires: "5",
      openPositions: "3",
      employeesProgress: 70,
      newHiresProgress: 38,
      positionsProgress: 22,
    },
    activities: {
      interviewsScheduled: "7",
      leavesApproved: "12",
      trainingSessions: "4",
      interviewsProgress: 46,
      leavesProgress: 64,
      trainingProgress: 35,
    },
  },
  inventoryPos: {
    inventory: {
      totalItems: "523",
      inStock: "489",
      lowStock: "28",
      outOfStock: "6",
      inventoryProgress: 81,
      lowStockProgress: 29,
    },
    pos: {
      totalOrders: "286",
      ordersToday: "21",
      ordersThisMonth: "97",
      revenue: "9240",
      revenueToday: "810",
      posOrdersProgress: 67,
      posRevenueProgress: 72,
    },
  },
  updatedAt: new Date().toISOString(),
};

export async function getOfflineDashboardAnalytics(): Promise<OfflineDashboardAnalytics> {
  const existing = await offlineStorage.loadFromFile(DASHBOARD_ANALYTICS_FILE);
  if (existing && typeof existing === "object") {
    return existing as OfflineDashboardAnalytics;
  }
  await offlineStorage.saveToFile(DASHBOARD_ANALYTICS_FILE, defaultDashboardAnalytics);
  return defaultDashboardAnalytics;
}

