"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  styled,
  Grid,
  Chip,
  Avatar,
  Paper,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  AnalyticsOutlined,
  TrendingUpOutlined,
  CategoryOutlined,
  Inventory2Outlined,
  AttachMoneyOutlined,
  ShoppingCartOutlined,
  RefreshOutlined,
  FilterListOutlined,
} from "@mui/icons-material";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import { getAllInventoryItems, getStockMovements } from "@/lib/desktop/inventory-bridge";
import { getPOSOrders } from "@/lib/desktop/pos-bridge";
import { FlatCard } from "@/components/FlatCard";

const COLORS = [
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#757575",
  "#388e3c",
  "#f57c00",
  "#c62828",
  "#9e9e9e",
];

export default function AnalyticsTab() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [posOrders, setPosOrders] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, ordersRes, movementsRes] = await Promise.all([
        getAllInventoryItems(),
        getPOSOrders(200),
        getStockMovements(),
      ]);

      if (inventoryRes.success && inventoryRes.data) {
        setInventoryItems(inventoryRes.data);
      }

      if (ordersRes.success && ordersRes.data) {
        setPosOrders(ordersRes.data);
      }

      if (movementsRes.success && movementsRes.data) {
        setStockMovements(movementsRes.data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by time range
  const filteredOrders = useMemo(() => {
    if (!posOrders.length) return [];
    const now = new Date();
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : Infinity;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return posOrders.filter((order: any) => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= cutoffDate;
    });
  }, [posOrders, timeRange]);

  // Stock by Category
  const stockByCategory = useMemo(() => {
    const categoryMap: Record<string, { stock: number; value: number }> = {};
    
    inventoryItems.forEach((item: any) => {
      const category = item.category || "Uncategorized";
      if (!categoryMap[category]) {
        categoryMap[category] = { stock: 0, value: 0 };
      }
      categoryMap[category].stock += item.quantity || 0;
      categoryMap[category].value += (item.price || 0) * (item.quantity || 0);
    });

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        stock: data.stock,
        value: data.value,
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);
  }, [inventoryItems]);

  // Sales Trend (Daily)
  const salesTrend = useMemo(() => {
    const dailySales: Record<string, { sales: number; orders: number }> = {};
    
    filteredOrders
      .filter((order: any) => order.status === "completed")
      .forEach((order: any) => {
        if (!order.createdAt) return;
        const date = new Date(order.createdAt).toISOString().split("T")[0];
        if (!dailySales[date]) {
          dailySales[date] = { sales: 0, orders: 0 };
        }
        dailySales[date].sales += order.total || 0;
        dailySales[date].orders += 1;
      });

    return Object.entries(dailySales)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [filteredOrders]);

  // Top Selling Items
  const topSellingItems = useMemo(() => {
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    filteredOrders
      .filter((order: any) => order.status === "completed" && order.items)
      .forEach((order: any) => {
        order.items.forEach((item: any) => {
          const key = item.itemId || item.name;
          if (!itemMap[key]) {
            itemMap[key] = { name: item.name || "Unknown", quantity: 0, revenue: 0 };
          }
          itemMap[key].quantity += item.quantity || 0;
          itemMap[key].revenue += (item.price || 0) * (item.quantity || 0);
        });
      });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Stock Value Distribution
  const stockValueDistribution = useMemo(() => {
    const ranges = [
      { name: "$0-$50", min: 0, max: 50 },
      { name: "$50-$100", min: 50, max: 100 },
      { name: "$100-$200", min: 100, max: 200 },
      { name: "$200-$500", min: 200, max: 500 },
      { name: "$500+", min: 500, max: Infinity },
    ];

    return ranges.map((range) => {
      const count = inventoryItems.filter((item: any) => {
        const value = (item.price || 0) * (item.quantity || 0);
        return value >= range.min && value < range.max;
      }).length;
      return { name: range.name, value: count };
    });
  }, [inventoryItems]);

  // Movement Trends
  const movementTrends = useMemo(() => {
    const dailyMovements: Record<string, { in: number; out: number }> = {};
    
    stockMovements.forEach((movement: any) => {
      if (!movement.createdAt) return;
      const date = new Date(movement.createdAt).toISOString().split("T")[0];
      if (!dailyMovements[date]) {
        dailyMovements[date] = { in: 0, out: 0 };
      }
      if (movement.type === "in" || movement.type === "purchase") {
        dailyMovements[date].in += movement.quantity || 0;
      } else if (movement.type === "out" || movement.type === "sale") {
        dailyMovements[date].out += movement.quantity || 0;
      }
    });

    return Object.entries(dailyMovements)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        in: data.in,
        out: data.out,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [stockMovements]);

  // Key Metrics
  const metrics = useMemo(() => {
    const totalStockValue = inventoryItems.reduce(
      (sum, item: any) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    const totalSales = filteredOrders
      .filter((order: any) => order.status === "completed")
      .reduce((sum, order: any) => sum + (order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const lowStockItems = inventoryItems.filter(
      (item: any) => item.reorderLevel && item.quantity <= item.reorderLevel
    ).length;

    return {
      totalStockValue,
      totalSales,
      totalOrders,
      avgOrderValue,
      lowStockItems,
      totalItems: inventoryItems.length,
    };
  }, [inventoryItems, filteredOrders]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={64} />
          <Typography variant="h6" color="text.secondary">
            Analyzing your inventory data…
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <TabToolbar
        title="Analytics"
        subtitle="Inventory performance, sales trends, and stock movement insights"
        chips={
          <>
            <StatChip icon={<AttachMoneyOutlined />} label={formatCurrency(metrics.totalStockValue)} />
            <StatChip icon={<ShoppingCartOutlined />} label={`${metrics.totalOrders} orders`} color="primary" />
            {metrics.lowStockItems > 0 && (
              <StatChip icon={<Inventory2Outlined />} label={`${metrics.lowStockItems} low stock`} color="warning" />
            )}
          </>
        }
        actions={
          <TextField
            select
            size="small"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "7d" | "30d" | "90d" | "all")}
            sx={{ minWidth: 140 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="all">All time</MenuItem>
          </TextField>
        }
      />

      {/* Key Metrics */}
      <Grid container spacing={3}>
        {[
          {
            title: "Total Stock Value",
            value: formatCurrency(metrics.totalStockValue),
            icon: <AttachMoneyOutlined />,
            color: "#2e7d32",
          },
          {
            title: "Total Sales",
            value: formatCurrency(metrics.totalSales),
            icon: <ShoppingCartOutlined />,
            color: "#00b894",
          },
          {
            title: "Total Orders",
            value: metrics.totalOrders.toString(),
            icon: <TrendingUpOutlined />,
            color: "#f093fb",
          },
          {
            title: "Avg Order Value",
            value: formatCurrency(metrics.avgOrderValue),
            icon: <AnalyticsOutlined />,
            color: "#4facfe",
          },
          {
            title: "Total Items",
            value: metrics.totalItems.toString(),
            icon: <Inventory2Outlined />,
            color: "#43e97b",
          },
          {
            title: "Low Stock Alerts",
            value: metrics.lowStockItems.toString(),
            icon: <CategoryOutlined />,
            color: "#fa709a",
          },
        ].map((metric) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={metric.title}>
            <FlatCard>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: alpha(metric.color, 0.15),
                    color: metric.color,
                    width: 56,
                    height: 56,
                  }}
                >
                  {metric.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {metric.value}
                  </Typography>
                </Box>
              </Stack>
            </FlatCard>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <FlatCard>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Sales Trend
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Daily sales and order volume over time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.1)} />
                <XAxis dataKey="date" stroke={alpha("#000", 0.5)} />
                <YAxis stroke={alpha("#000", 0.5)} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${alpha("#2e7d32", 0.2)}`,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2e7d32"
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <FlatCard>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Stock Value Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Items grouped by stock value ranges
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockValueDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockValueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <FlatCard>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Stock by Category
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Total stock quantity per category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.1)} />
                <XAxis dataKey="category" stroke={alpha("#000", 0.5)} />
                <YAxis stroke={alpha("#000", 0.5)} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${alpha("#2e7d32", 0.2)}`,
                  }}
                />
                <Bar dataKey="stock" fill="#2e7d32" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <FlatCard>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Stock Movements
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Daily stock in vs stock out trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={movementTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.1)} />
                <XAxis dataKey="date" stroke={alpha("#000", 0.5)} />
                <YAxis stroke={alpha("#000", 0.5)} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${alpha("#2e7d32", 0.2)}`,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="in"
                  stroke="#00b894"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Stock In"
                />
                <Line
                  type="monotone"
                  dataKey="out"
                  stroke="#e17055"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Stock Out"
                />
              </LineChart>
            </ResponsiveContainer>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Top Selling Items */}
      <FlatCard>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Top Selling Items
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Best performing products by revenue
        </Typography>
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          <Stack spacing={2}>
            {topSellingItems.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No sales data available for the selected time range
              </Typography>
            ) : (
              topSellingItems.map((item, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha("#2e7d32", index < 3 ? 0.1 : 0.05),
                    border: `1px solid ${alpha("#2e7d32", index < 3 ? 0.3 : 0.1)}`,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: COLORS[index % COLORS.length],
                          width: 40,
                          height: 40,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.quantity} units sold
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {formatCurrency(item.revenue)}
                    </Typography>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Box>
      </FlatCard>
    </Box>
  );
}
