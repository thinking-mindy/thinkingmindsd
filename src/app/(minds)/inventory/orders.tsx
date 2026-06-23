"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import {
  Add,
  CheckCircleOutline,
  FilterList,
  LocalMall,
  Refresh,
  Search,
  ShoppingBag,
  SwapHoriz,
  TrendingUp,
  DownloadOutlined,
} from "@mui/icons-material";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import { getPOSOrders } from "@/lib/desktop/pos-bridge";
import { getPurchaseOrdersForCurrentOrg } from "@/lib/desktop/purchase-orders-bridge";

type PurchaseOrderRecord = {
  _id?: string;
  poNumber?: string;
  vendor?: string;
  total?: number;
  status?: "draft" | "sent" | "approved" | "received" | "cancelled";
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lines?: Array<{ quantity?: number; description?: string; total?: number }>;
};

type SalesOrderRecord = {
  _id?: string;
  orderId?: string;
  customerName?: string;
  total?: number;
  status?: "pending" | "completed" | "cancelled" | "refunded";
  paymentMethod?: string;
  createdAt?: string | Date;
  items?: Array<{ quantity?: number }>;
};

type UnifiedOrder = {
  id: string;
  type: "purchase" | "sales";
  reference: string;
  partner: string;
  total: number;
  status: string;
  date: string;
  itemsCount: number;
  meta?: {
    paymentMethod?: string;
    lines?: number;
  };
};

const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: 24,
  padding: theme.spacing(3),
  height: "100%",
  background: theme.palette.mode === "dark"
    ? alpha(theme.palette.primary.main, 0.15)
    : alpha(theme.palette.primary.light, 0.08),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  boxShadow: `0 20px 45px ${alpha(theme.palette.common.black, 0.08)}`,
  backdropFilter: "blur(14px)",
}));

const FilterCard = styled(Card)(({ theme }) => ({
  borderRadius: 28,
  padding: theme.spacing(3),
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  boxShadow: `0 30px 80px ${alpha(theme.palette.common.black, 0.08)}`,
  background: theme.palette.mode === "dark"
    ? alpha("#0f172a", 0.9)
    : alpha("#ffffff", 0.9),
  backdropFilter: "blur(16px)",
}));

const OrderCard = styled(Card)(({ theme }) => ({
  borderRadius: 26,
  padding: theme.spacing(3),
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  background: theme.palette.mode === "dark"
    ? alpha("#0b1220", 0.85)
    : alpha("#ffffff", 0.95),
  backdropFilter: "blur(12px)",
  boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.1)}`,
  transition: "transform 0.4s ease, border 0.4s ease",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, transparent 70%)`,
    pointerEvents: "none",
  },
  "&:hover": {
    transform: "translateY(-6px)",
    borderColor: alpha(theme.palette.primary.main, 0.5),
  },
}));

const EmptyStateCard = styled(Card)(({ theme }) => ({
  borderRadius: 28,
  padding: theme.spacing(6),
  textAlign: "center",
  border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
  background: alpha(theme.palette.primary.light, 0.05),
}));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | Date) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles: Record<
  string,
  { color: string; background: string; label?: string }
> = {
  draft: { color: "#6c5ce7", background: alpha("#6c5ce7", 0.12), label: "Draft" },
  sent: { color: "#00cec9", background: alpha("#00cec9", 0.15), label: "Sent" },
  approved: { color: "#00b894", background: alpha("#00b894", 0.16), label: "Approved" },
  received: { color: "#0984e3", background: alpha("#0984e3", 0.16), label: "Received" },
  cancelled: { color: "#e17055", background: alpha("#e17055", 0.16), label: "Cancelled" },
  pending: { color: "#f1c40f", background: alpha("#f1c40f", 0.2), label: "Pending" },
  completed: { color: "#2ecc71", background: alpha("#2ecc71", 0.18), label: "Completed" },
  refunded: { color: "#a29bfe", background: alpha("#a29bfe", 0.18), label: "Refunded" },
};

export default function OrdersTab() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "sales">("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchaseResponse, salesResponse] = await Promise.all([
        getPurchaseOrdersForCurrentOrg(80),
        getPOSOrders(120),
      ]);

      if (purchaseResponse.success && purchaseResponse.data) {
        const normalizedPurchases = purchaseResponse.data.map((order: any) => ({
          ...order,
          _id: order._id ? order._id.toString() : undefined,
          poNumber: order.poNumber ? order.poNumber.toString() : undefined,
        }));
        setPurchaseOrders(normalizedPurchases);
      }

      if (salesResponse.success && salesResponse.data) {
        const normalizedSales = salesResponse.data.map((order: any) => ({
          ...order,
          _id: order._id ? order._id.toString() : undefined,
          orderId: order.orderId ? order.orderId.toString() : undefined,
        }));
        setSalesOrders(normalizedSales);
      }

      if ((!purchaseResponse.success && purchaseResponse.error) || (!salesResponse.success && salesResponse.error)) {
        setError(purchaseResponse.error || salesResponse.error || "Unable to load orders.");
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setError("Something went wrong while loading orders.");
    } finally {
      setLoading(false);
    }
  };

  const unifiedOrders: UnifiedOrder[] = useMemo(() => {
    const mappedPurchases = purchaseOrders.map((order, index) => ({
      id: order._id?.toString() || order.poNumber?.toString() || `PO-${index}`,
      type: "purchase" as const,
      reference: order.poNumber ? `PO-${String(order.poNumber).slice(-6)}` : "Purchase Order",
      partner: order.vendor || "Unknown vendor",
      total: order.total || 0,
      status: order.status || "draft",
      date: (order.createdAt ? new Date(order.createdAt) : new Date()).toISOString(),
      itemsCount: order.lines?.reduce((sum, line) => sum + (line.quantity || 0), 0) || 0,
      meta: {
        lines: order.lines?.length || 0,
      },
    }));

    const mappedSales = salesOrders.map((order, index) => ({
      id: order._id?.toString() || order.orderId || `SO-${index}`,
      type: "sales" as const,
      reference: order.orderId || "POS Order",
      partner: order.customerName || "Walk-in customer",
      total: order.total || 0,
      status: order.status || "pending",
      date: (order.createdAt ? new Date(order.createdAt) : new Date()).toISOString(),
      itemsCount: order.items?.reduce((sum, line) => sum + (line.quantity || 0), 0) || 0,
      meta: {
        paymentMethod: order.paymentMethod,
      },
    }));

    return [...mappedPurchases, ...mappedSales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchaseOrders, salesOrders]);

  const filteredOrders = useMemo(() => {
    return unifiedOrders.filter((order) => {
      const matchesSearch =
        order.partner.toLowerCase().includes(search.toLowerCase()) ||
        order.reference.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesType = typeFilter === "all" || order.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter, unifiedOrders]);

  const stats = useMemo(() => {
    const purchaseVolume = purchaseOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const approved = purchaseOrders.filter((order) => order.status === "approved").length;
    const pending = purchaseOrders.filter((order) =>
      ["draft", "sent"].includes(order.status || "")
    ).length;
    const salesRevenue = salesOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const completedSales = salesOrders.filter((order) => order.status === "completed").length;

    return {
      purchaseVolume,
      approved,
      pending,
      salesRevenue,
      completedSales,
    };
  }, [purchaseOrders, salesOrders]);

  const statCards = [
    {
      title: "Purchase Volume",
      value: formatCurrency(stats.purchaseVolume),
      change: "+12% vs last month",
      icon: <ShoppingBag />,
      accent: ["#8a2be2", "#ff6fb7"],
    },
    {
      title: "Sales Revenue",
      value: formatCurrency(stats.salesRevenue),
      change: "+7.4% vs last week",
      icon: <TrendingUp />,
      accent: ["#5ee7df", "#b490ca"],
    },
    {
      title: "Pending Approvals",
      value: stats.pending,
      change: `${stats.approved} approved this week`,
      icon: <CheckCircleOutline />,
      accent: ["#f6d365", "#fda085"],
    },
  ];

  const timeline = filteredOrders.slice(0, 6);

  const handleExportCsv = () => {
    const headers = ["Type", "Reference", "Partner", "Total", "Status", "Date", "Items"];
    const lines = filteredOrders.map((o) =>
      [o.type, o.reference, o.partner, o.total, o.status, o.date, o.itemsCount]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusChip = (status: string) => {
    const style = statusStyles[status] || {
      color: "#636e72",
      background: alpha("#636e72", 0.15),
      label: status,
    };
    return (
      <Chip
        label={style.label || status}
        size="small"
        sx={{
          color: style.color,
          backgroundColor: style.background,
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      />
    );
  };

  if (loading) {
    return (
      <Card
        sx={{
          borderRadius: 28,
          p: 6,
          minHeight: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={64} />
          <Typography variant="h6" color="text.secondary">
            Gathering the latest orders…
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <TabToolbar
        title="Orders"
        subtitle="Purchase orders and POS sales in one view"
        chips={
          <>
            <StatChip icon={<ShoppingBag />} label={`${formatCurrency(stats.purchaseVolume)} purchases`} />
            <StatChip icon={<TrendingUp />} label={`${formatCurrency(stats.salesRevenue)} sales`} color="success" />
            <StatChip icon={<CheckCircleOutline />} label={`${stats.pending} pending`} color="warning" />
          </>
        }
        actions={
          <>
            <Button variant="outlined" size="small" startIcon={<DownloadOutlined />} onClick={handleExportCsv} disabled={!filteredOrders.length} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Export CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => void fetchOrders()} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Refresh
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      <FilterCard>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            fullWidth
            placeholder="Search vendor, customer, or reference…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            fullWidth
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterList />
                </InputAdornment>
              ),
            }}
          >
              <MenuItem value="all">All statuses</MenuItem>
              {Object.keys(statusStyles).map((status) => (
                <MenuItem key={status} value={status}>
                  {statusStyles[status]?.label || status}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            fullWidth
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | "purchase" | "sales")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SwapHoriz />
                </InputAdornment>
              ),
            }}
          >
              <MenuItem value="all">All order types</MenuItem>
              <MenuItem value="purchase">Purchase orders</MenuItem>
              <MenuItem value="sales">POS sales</MenuItem>
          </TextField>
        </Stack>
      </FilterCard>

      {filteredOrders.length === 0 ? (
        <EmptyStateCard>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              mb: 2,
              bgcolor: alpha("#667eea", 0.1),
              color: "#667eea",
            }}
          >
            <ShoppingBag fontSize="large" />
          </Avatar>
          <Typography variant="h6" gutterBottom>
            No orders match your filters
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 420, mx: "auto" }}>
            Try changing the status or order type filters, or record a new purchase order to kick things off.
          </Typography>
        </EmptyStateCard>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" },
          }}
        >
          <Box>
            <Stack spacing={3}>
              {filteredOrders.map((order) => (
                <Fade in key={order.id}>
                  <OrderCard>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Stack spacing={1}>
                        <Chip
                          label={order.type === "purchase" ? "Purchase" : "POS Sale"}
                          icon={
                            order.type === "purchase" ? (
                              <ShoppingBag fontSize="small" />
                            ) : (
                              <LocalMall fontSize="small" />
                            )
                          }
                          sx={{
                            alignSelf: "flex-start",
                            background:
                              order.type === "purchase"
                                ? alpha("#6c5ce7", 0.15)
                                : alpha("#00b894", 0.15),
                            color: order.type === "purchase" ? "#6c5ce7" : "#00b894",
                          }}
                        />
                        <Typography variant="h6">{order.partner}</Typography>
                        <Typography color="text.secondary">{order.reference}</Typography>
                      </Stack>
                      <Stack alignItems="flex-end" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>
                          {formatCurrency(order.total)}
                        </Typography>
                        {renderStatusChip(order.status)}
                      </Stack>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: alpha("#fff", 0.1),
                            color: "text.primary",
                            border: `1px solid ${alpha("#667eea", 0.2)}`,
                          }}
                        >
                          {order.itemsCount || order.meta?.lines || 0}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Items / Lines
                          </Typography>
                          <Typography fontWeight={600}>
                            {order.itemsCount || order.meta?.lines || 0} tracked items
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack>
                        <Typography variant="body2" color="text.secondary">
                          Last activity
                        </Typography>
                        <Typography fontWeight={600}>{formatDate(order.date)}</Typography>
                      </Stack>
                      {order.meta?.paymentMethod && (
                        <Stack>
                          <Typography variant="body2" color="text.secondary">
                            Payment method
                          </Typography>
                          <Typography fontWeight={600} textTransform="capitalize">
                            {order.meta.paymentMethod}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </OrderCard>
                </Fade>
              ))}
            </Stack>
          </Box>
          <Box>
            <Stack spacing={3}>
              <Card sx={{ borderRadius: 26, p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">Recent activity</Typography>
                  <Tooltip title="Based on the latest purchase and POS events">
                    <IconButton size="small">
                      <FilterList fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <List>
                  {timeline.map((item) => (
                    <ListItem key={`timeline-${item.id}`} disableGutters>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              item.type === "purchase"
                                ? alpha("#6c5ce7", 0.15)
                                : alpha("#00b894", 0.15),
                            color: item.type === "purchase" ? "#6c5ce7" : "#00b894",
                          }}
                        >
                          {item.type === "purchase" ? (
                            <ShoppingBag fontSize="small" />
                          ) : (
                            <LocalMall fontSize="small" />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography fontWeight={600}>
                            {item.partner} — {formatCurrency(item.total)}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {item.reference} · {formatDate(item.date)}
                          </Typography>
                        }
                      />
                      {renderStatusChip(item.status)}
                    </ListItem>
                  ))}
                </List>
              </Card>

              <Card sx={{ borderRadius: 26, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Fulfilment health
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.completedSales} POS orders completed · {stats.approved} POs approved
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (stats.completedSales / Math.max(1, salesOrders.length)) * 100)}
                  sx={{
                    mt: 2,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: alpha("#2ecc71", 0.15),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #43cea2, #185a9d)",
                    },
                  }}
                />
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Pending approvals</Typography>
                    <Typography fontWeight={600}>{stats.pending}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Completed sales</Typography>
                    <Typography fontWeight={600}>{stats.completedSales}</Typography>
                  </Stack>
                </Stack>
              </Card>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
