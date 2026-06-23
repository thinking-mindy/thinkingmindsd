"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import {
  AnalyticsOutlined,
  BusinessOutlined,
  DashboardOutlined,
  Inventory2Outlined,
  ShoppingCartOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import { getAllInventoryItems } from "@/lib/desktop/inventory-bridge";
import DashboardTab from "./dashboard";
import ProductsTab from "./products";
import StockTab from "./stock";
import SuppliersTab from "./suppliers";
import OrdersTab from "./orders";
import AnalyticsTab from "./analytics";
import InventoryShell, {
  type InventoryStats,
  type LowStockItem,
} from "./components/InventoryShell";

function computeStats(items: any[]): { stats: InventoryStats; lowStockItems: LowStockItem[] } {
  const lowStockItems = items
    .filter((item) => item.reorderLevel && item.quantity <= item.reorderLevel)
    .sort((a, b) => a.quantity / (a.reorderLevel || 1) - b.quantity / (b.reorderLevel || 1));

  const stockValue = items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );

  return {
    stats: {
      totalItems: items.length,
      inStock: items.filter((i) => (i.quantity || 0) > 0).length,
      lowStock: lowStockItems.length,
      outOfStock: items.filter((i) => (i.quantity || 0) === 0).length,
      stockValue,
    },
    lowStockItems: lowStockItems.map((i) => ({
      _id: i._id?.toString?.() ?? i._id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity ?? 0,
      reorderLevel: i.reorderLevel,
    })),
  };
}

export default function InventoryPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);

  const loadItems = useCallback(async () => {
    const result = await getAllInventoryItems();
    if (result.success && result.data) {
      setItems(result.data);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const { stats, lowStockItems } = useMemo(() => computeStats(items), [items]);

  const tabs = useMemo(
    () => [
      { id: 0, label: "Dashboard", description: "Overview & alerts", icon: <DashboardOutlined /> },
      {
        id: 1,
        label: "Products",
        description: "Stock levels & CSV",
        icon: <Inventory2Outlined />,
        badge: stats.lowStock > 0 ? stats.lowStock : undefined,
      },
      { id: 2, label: "Movements", description: "In, out & adjust", icon: <TrendingUpOutlined /> },
      { id: 3, label: "Suppliers", description: "Vendor directory", icon: <BusinessOutlined /> },
      { id: 4, label: "Orders", description: "Purchase orders", icon: <ShoppingCartOutlined /> },
      { id: 5, label: "Analytics", description: "Trends & value", icon: <AnalyticsOutlined /> },
    ],
    [stats.lowStock]
  );

  const handleInventoryChange = () => {
    void loadItems();
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", py: 3, px: { xs: 2, md: 4 } }}>
      <InventoryShell
        tabIndex={tabIndex}
        onTabChange={setTabIndex}
        stats={stats}
        lowStockItems={lowStockItems}
        tabs={tabs}
      >
        {tabIndex === 0 && <DashboardTab />}
        {tabIndex === 1 && <ProductsTab onInventoryChange={handleInventoryChange} />}
        {tabIndex === 2 && <StockTab />}
        {tabIndex === 3 && <SuppliersTab />}
        {tabIndex === 4 && <OrdersTab />}
        {tabIndex === 5 && <AnalyticsTab />}
      </InventoryShell>
    </Box>
  );
}
