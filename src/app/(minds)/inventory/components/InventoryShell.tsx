"use client";

import { Alert, Chip, Collapse, Typography } from "@mui/material";
import type { ReactElement, ReactNode } from "react";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import TrendingDownOutlined from "@mui/icons-material/TrendingDownOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import AttachMoneyOutlined from "@mui/icons-material/AttachMoneyOutlined";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import ModuleShell from "@/components/ModuleShell";

export type InventoryTab = {
  id: number;
  label: string;
  description: string;
  icon: ReactElement;
  badge?: string | number;
};

export type InventoryStats = {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  stockValue: number;
};

export type LowStockItem = {
  _id?: string;
  name: string;
  sku?: string;
  quantity: number;
  reorderLevel?: number;
};

export default function InventoryShell({
  tabIndex,
  onTabChange,
  stats,
  lowStockItems,
  tabs,
  children,
}: {
  tabIndex: number;
  onTabChange: (index: number) => void;
  stats: InventoryStats;
  lowStockItems: LowStockItem[];
  tabs: InventoryTab[];
  children: ReactNode;
}) {
  const showAlert = stats.lowStock > 0 || stats.outOfStock > 0;

  return (
    <ModuleShell
      overline="Stock & supply"
      title="Inventory"
      subtitle="Products sync to POS automatically. Import/export CSV, track movements, and watch reorder levels."
      heroIcon={<Inventory2Outlined sx={{ fontSize: 30 }} />}
      heroChips={
        <>
          {stats.outOfStock > 0 && (
            <Chip
              icon={<TrendingDownOutlined sx={{ color: "inherit !important" }} />}
              label={`${stats.outOfStock} out of stock`}
              sx={{ bgcolor: "error.main", color: "#fff", fontWeight: 700 }}
            />
          )}
          {stats.lowStock > 0 && (
            <Chip
              icon={<WarningAmberOutlined />}
              label={`${stats.lowStock} need reorder`}
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </>
      }
      statCards={[
        { label: "Total SKUs", value: stats.totalItems, icon: <CategoryOutlined /> },
        { label: "In stock", value: stats.inStock, icon: <Inventory2Outlined /> },
        {
          label: "Low stock",
          value: stats.lowStock,
          icon: <WarningAmberOutlined />,
          pulse: stats.lowStock > 0,
        },
        {
          label: "Stock value",
          value: `$${stats.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          icon: <AttachMoneyOutlined />,
        },
      ]}
      alertSlot={
        <Collapse in={showAlert}>
          <Alert
            severity={stats.outOfStock > 0 ? "error" : "warning"}
            icon={<WarningAmberOutlined />}
            sx={{ mb: 2, borderRadius: 3, alignItems: "flex-start" }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {stats.outOfStock > 0
                ? `${stats.outOfStock} item${stats.outOfStock !== 1 ? "s" : ""} completely out of stock`
                : "Low stock alert"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {lowStockItems
                .slice(0, 5)
                .map((i) => i.name)
                .join(" · ")}
              {lowStockItems.length > 5 ? ` · +${lowStockItems.length - 5} more` : ""}
            </Typography>
            <Typography
              component="button"
              variant="caption"
              onClick={() => onTabChange(1)}
              sx={{
                mt: 1,
                display: "inline-block",
                cursor: "pointer",
                textDecoration: "underline",
                background: "none",
                border: 0,
                color: "inherit",
                p: 0,
              }}
            >
              Review in Products →
            </Typography>
          </Alert>
        </Collapse>
      }
      tabIndex={tabIndex}
      onTabChange={onTabChange}
      tabs={tabs}
    >
      {children}
    </ModuleShell>
  );
}
