"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  AssessmentOutlined,
  DownloadOutlined,
  Inventory2Outlined,
  PictureAsPdfOutlined,
  PointOfSaleOutlined,
  RefreshOutlined,
  TrendingUpOutlined,
  AccountBalanceWalletOutlined,
} from "@mui/icons-material";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  getReportsPageData,
  type ReportsPageData,
  type ReportsRange,
} from "@/lib/desktop/analytics-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ChartTooltip, Legend, Filler);

const RANGE_OPTIONS: { value: ReportsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
];

const TABS = ["Overview", "Sales", "Finance", "Inventory"] as const;

const fmtN = (n: number) => new Intl.NumberFormat("en-US").format(n);

function StatTile({
  label,
  value,
  sub,
  icon,
  color = "#0AA775",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: "100%" }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(color, 0.12),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ReportsAnalyticsPage() {
  const [tab, setTab] = useState(0);
  const [range, setRange] = useState<ReportsRange>("30d");
  const [data, setData] = useState<ReportsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportsPageData(range);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to load reports");
        setData(null);
      } else {
        setData(res.data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const chartConfig = useMemo(() => {
    if (!data?.trend.length) return null;
    const labels = data.trend.map((t) => t.label);

    if (tab === 1) {
      return {
        labels,
        datasets: [
          {
            label: "POS revenue",
            data: data.trend.map((t) => t.posRevenue),
            borderColor: "#0AA775",
            backgroundColor: "rgba(10, 167, 117, 0.12)",
            fill: true,
            tension: 0.35,
          },
        ],
      };
    }
    if (tab === 2) {
      return {
        labels,
        datasets: [
          {
            label: "Invoice revenue",
            data: data.trend.map((t) => t.financeRevenue),
            borderColor: "#2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            fill: true,
            tension: 0.35,
          },
          {
            label: "Expenses",
            data: data.trend.map((t) => t.expenses),
            borderColor: "#e57373",
            backgroundColor: "rgba(229, 115, 115, 0.08)",
            fill: true,
            tension: 0.35,
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          label: "Total sales (POS)",
          data: data.trend.map((t) => t.posRevenue),
          borderColor: "#0AA775",
          backgroundColor: "rgba(10, 167, 117, 0.1)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "Finance revenue",
          data: data.trend.map((t) => t.financeRevenue),
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.08)",
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [data, tab]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" as const },
      plugins: {
        legend: { position: "bottom" as const, labels: { boxWidth: 12, usePointStyle: true } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: {
            callback: (v: string | number) => formatCurrency(Number(v)),
          },
        },
      },
    }),
    []
  );

  const handleExportCsv = () => {
    if (!data?.trend.length) return;
    const header = ["Period", "POS revenue", "Finance revenue", "Expenses"];
    const rows = data.trend.map((t) => [
      t.label,
      t.posRevenue.toFixed(2),
      t.financeRevenue.toFixed(2),
      t.expenses.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${range}.csv`;
    a.click();
  };

  const handleExportPdf = async () => {
    const el = reportRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`reports-${range}.pdf`);
  };

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? range;
  const s = data?.summary;

  return (
    <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Card
          variant="outlined"
          sx={(t) => ({
            borderRadius: 3,
            p: { xs: 2, md: 2.5 },
            borderColor: alpha(t.palette.primary.main, 0.25),
            bgcolor: alpha(t.palette.primary.main, 0.05),
          })}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Insights
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
                Reports & Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
                Live numbers from POS, finance, and inventory — filtered by your organisation.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={range}
                  label="Period"
                  onChange={(e: SelectChangeEvent) => setRange(e.target.value as ReportsRange)}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshOutlined />}
                onClick={load}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Card>

        {error && (
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "error.light", p: 2 }}>
            <Typography color="error.main" variant="body2">
              {error}
            </Typography>
          </Card>
        )}

        {loading && !data ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPI row */}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <StatTile
                  label="POS revenue"
                  value={formatCurrency(s?.posRevenue ?? 0)}
                  sub={`${fmtN(s?.posOrders ?? 0)} orders`}
                  icon={<PointOfSaleOutlined sx={{ fontSize: 20 }} />}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <StatTile
                  label="Finance revenue"
                  value={formatCurrency(s?.financeRevenue ?? 0)}
                  icon={<AccountBalanceWalletOutlined sx={{ fontSize: 20 }} />}
                  color="#2196f3"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <StatTile
                  label="Expenses"
                  value={formatCurrency(s?.expenses ?? 0)}
                  icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
                  color="#e57373"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <StatTile
                  label="Net (range)"
                  value={formatUsd(s?.netIncome ?? 0)}
                  icon={<AssessmentOutlined sx={{ fontSize: 20 }} />}
                  color="#667eea"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <StatTile
                  label="Inventory"
                  value={fmtN(s?.inventoryItems ?? 0)}
                  sub={
                    (s?.lowStock ?? 0) > 0 || (s?.outOfStock ?? 0) > 0
                      ? `${s?.lowStock} low · ${s?.outOfStock} out`
                      : "Stock healthy"
                  }
                  icon={<Inventory2Outlined sx={{ fontSize: 20 }} />}
                  color="#ff9800"
                />
              </Grid>
            </Grid>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
            >
              {TABS.map((t) => (
                <Tab key={t} label={t} />
              ))}
            </Tabs>

            <Grid container spacing={2} ref={reportRef}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 2.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Trend · {rangeLabel}
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {TABS[tab]} performance
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Export CSV">
                        <IconButton size="small" onClick={handleExportCsv}>
                          <DownloadOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export PDF">
                        <IconButton size="small" onClick={handleExportPdf}>
                          <PictureAsPdfOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Box sx={{ height: 300 }}>
                    {chartConfig ? (
                      <Line data={chartConfig} options={chartOptions} />
                    ) : (
                      <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                        <Typography color="text.secondary" variant="body2">
                          No trend data for this period yet.
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, lg: 4 }}>
                {tab === 3 ? (
                  <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Stock snapshot
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Total SKUs
                        </Typography>
                        <Typography fontWeight={700}>{fmtN(s?.inventoryItems ?? 0)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Low stock
                        </Typography>
                        <Chip
                          size="small"
                          label={fmtN(s?.lowStock ?? 0)}
                          color={(s?.lowStock ?? 0) > 0 ? "warning" : "default"}
                        />
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Out of stock
                        </Typography>
                        <Chip
                          size="small"
                          label={fmtN(s?.outOfStock ?? 0)}
                          color={(s?.outOfStock ?? 0) > 0 ? "error" : "default"}
                        />
                      </Box>
                    </Stack>
                  </Card>
                ) : (
                  <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Top products
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        By POS revenue · {rangeLabel}
                      </Typography>
                    </Box>
                    {data?.topProducts.length ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="right">Qty</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.topProducts.map((row) => (
                            <TableRow key={row.name}>
                              <TableCell sx={{ maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {row.name}
                              </TableCell>
                              <TableCell align="right">{fmtN(row.quantity)}</TableCell>
                              <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No POS sales in this period.
                      </Typography>
                    )}
                  </Card>
                )}
              </Grid>

              {tab <= 1 && (data?.paymentMix.length ?? 0) > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Payment methods
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {data!.paymentMix.map((p) => (
                        <Chip
                          key={p.method}
                          label={`${p.method}: ${formatCurrency(p.amount)} (${p.count})`}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Stack>
                  </Card>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Stack>
    </Box>
  );
}
