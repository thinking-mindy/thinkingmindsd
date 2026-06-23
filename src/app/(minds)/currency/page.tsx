"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  AddOutlined,
  CurrencyExchangeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  RefreshOutlined,
  SwapHorizOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useUser } from "@/lib/auth/client";
import Link from "next/link";
import {
  convertCurrency,
  createCurrency,
  deleteCurrency,
  getAllCurrencies,
  getUsdExchangeRates,
  updateCurrency,
  updateExchangeRates,
} from "@/lib/desktop/currencies-bridge";
import { getPayrollRecordsForCurrentOrg } from "@/lib/desktop/payroll-bridge";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

type CurrencyRow = {
  _id?: string;
  code?: string;
  symbol?: string;
  decimals?: number;
  exchangeRates?: {
    base?: string;
    rates?: Record<string, number>;
    lastUpdated?: string | Date;
  };
};

const BASE = "USD";

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
}

function fmt(amount: number, code: string, symbol?: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code.length === 3 ? code : "USD",
      maximumFractionDigits: code === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${symbol || ""}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function convertLocal(amount: number, from: string, to: string, rates: Record<string, number>) {
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  const inUsd = from === BASE ? amount : amount / fromRate;
  return to === BASE ? inUsd : inUsd * toRate;
}

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
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
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

export default function CurrencyPage() {
  const { user } = useUser();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesUpdated, setRatesUpdated] = useState<string | null>(null);
  const [payrollNetUsd, setPayrollNetUsd] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [currencyDialog, setCurrencyDialog] = useState<"create" | "edit" | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyRow | null>(null);
  const [currencyForm, setCurrencyForm] = useState({ code: "", symbol: "", decimals: "2", rate: "" });

  const [ratesDialog, setRatesDialog] = useState(false);
  const [ratesDraft, setRatesDraft] = useState<Record<string, string>>({});

  const [convertForm, setConvertForm] = useState({
    amount: "1000",
    from: "USD",
    to: "EUR",
    result: null as number | null,
  });

  const [displayCurrency, setDisplayCurrency] = useState("USD");

  const codes = useMemo(() => currencies.map((c) => c.code).filter(Boolean) as string[], [currencies]);

  const load = useCallback(async () => {
    if (!user?.publicMetadata?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [curRes, rateRes, payrollRes] = await Promise.all([
        getAllCurrencies(),
        getUsdExchangeRates(),
        getPayrollRecordsForCurrentOrg(),
      ]);
      if (curRes.success) setCurrencies((curRes.data as unknown as CurrencyRow[]) || []);
      if (rateRes.success && rateRes.data) {
        setRates(rateRes.data.rates || { USD: 1 });
        setRatesUpdated(
          rateRes.data.lastUpdated
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(rateRes.data.lastUpdated)
              )
            : null
        );
      }
      if (payrollRes.success) {
        const total = ((payrollRes.data as { net?: number }[]) || []).reduce((s, r) => s + (r.net || 0), 0);
        setPayrollNetUsd(total);
      }
    } catch {
      setSnackbar({ open: true, message: "Failed to load currency data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [user?.publicMetadata?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const nonBase = codes.filter((c) => c !== BASE);
    return {
      currencies: codes.length,
      pairs: nonBase.length,
      payrollUsd: payrollNetUsd,
      payrollDisplay: convertLocal(payrollNetUsd, BASE, displayCurrency, rates),
    };
  }, [codes, payrollNetUsd, displayCurrency, rates]);

  const rateChart = useMemo(() => {
    const rows = codes
      .filter((c) => c !== BASE)
      .map((code) => ({ code, rate: rates[code] || 0 }))
      .sort((a, b) => b.rate - a.rate);
    return {
      labels: rows.map((r) => r.code),
      datasets: [
        {
          label: `Units per 1 ${BASE}`,
          data: rows.map((r) => r.rate),
          backgroundColor: alpha("#0AA775", 0.75),
          borderRadius: 6,
        },
      ],
    };
  }, [codes, rates]);

  const payrollByCurrency = useMemo(() => {
    return codes.map((code) => ({
      code,
      amount: convertLocal(payrollNetUsd, BASE, code, rates),
      symbol: currencies.find((c) => c.code === code)?.symbol,
    }));
  }, [codes, currencies, payrollNetUsd, rates]);

  const openRatesEditor = () => {
    const draft: Record<string, string> = {};
    codes.forEach((code) => {
      draft[code] = String(rates[code] ?? (code === BASE ? 1 : ""));
    });
    setRatesDraft(draft);
    setRatesDialog(true);
  };

  const saveRates = async () => {
    const parsed: Record<string, number> = {};
    Object.entries(ratesDraft).forEach(([k, v]) => {
      parsed[k] = Number(v) || 0;
    });
    parsed[BASE] = 1;
    const res = await updateExchangeRates(parsed);
    if (res.success) {
      setSnackbar({ open: true, message: "Exchange rates updated", severity: "success" });
      setRatesDialog(false);
      load();
    } else {
      setSnackbar({ open: true, message: "Failed to update rates", severity: "error" });
    }
  };

  const saveCurrency = async () => {
    if (!currencyForm.code.trim() || !currencyForm.symbol.trim()) {
      setSnackbar({ open: true, message: "Code and symbol are required", severity: "error" });
      return;
    }
    const code = currencyForm.code.toUpperCase();
    const payload = {
      code,
      symbol: currencyForm.symbol,
      decimals: Number(currencyForm.decimals) || 2,
    };

    if (currencyDialog === "edit" && selectedCurrency) {
      const res = await updateCurrency(idStr(selectedCurrency._id), payload);
      if (res.success) {
        if (currencyForm.rate && code !== BASE) {
          const next = { ...rates, [code]: Number(currencyForm.rate) || rates[code] || 1 };
          await updateExchangeRates(next);
        }
        setSnackbar({ open: true, message: "Currency updated", severity: "success" });
        setCurrencyDialog(null);
        load();
      } else {
        setSnackbar({ open: true, message: "Update failed", severity: "error" });
      }
      return;
    }

    const res = await createCurrency(payload);
    if (res.success) {
      if (currencyForm.rate) {
        const next = { ...rates, [code]: Number(currencyForm.rate) || 1 };
        await updateExchangeRates(next);
      }
      setSnackbar({ open: true, message: "Currency added", severity: "success" });
      setCurrencyDialog(null);
      setCurrencyForm({ code: "", symbol: "", decimals: "2", rate: "" });
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Create failed", severity: "error" });
    }
  };

  const removeCurrency = async (row: CurrencyRow) => {
    const res = await deleteCurrency(idStr(row._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Currency removed", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Delete failed", severity: "error" });
    }
  };

  const runConvert = async () => {
    const amount = Number(convertForm.amount);
    if (!amount) return;
    const res = await convertCurrency(amount, convertForm.from, convertForm.to);
    if (res.success && res.data) {
      setConvertForm((f) => ({ ...f, result: res.data!.amount }));
    } else {
      setConvertForm((f) => ({
        ...f,
        result: convertLocal(amount, convertForm.from, convertForm.to, rates),
      }));
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Code", "Symbol", "Decimals", `Rate per 1 ${BASE}`],
      ...currencies.map((c) => [
        c.code || "",
        c.symbol || "",
        String(c.decimals ?? 2),
        String(rates[c.code || ""] ?? ""),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exchange-rates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
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
                Finance tools
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                Multi-Currency
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage exchange rates, convert amounts, and view payroll in any currency.
              </Typography>
              {ratesUpdated && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Rates last updated: {ratesUpdated}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                component={Link}
                href="/payroll"
                size="small"
                variant="outlined"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Open payroll
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlined />}
                onClick={exportCsv}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshOutlined />}
                onClick={load}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditOutlined />}
                onClick={openRatesEditor}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Edit rates
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => {
                  setSelectedCurrency(null);
                  setCurrencyForm({ code: "", symbol: "", decimals: "2", rate: "" });
                  setCurrencyDialog("create");
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Add currency
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Currencies"
              value={String(kpis.currencies)}
              icon={<CurrencyExchangeOutlined sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="FX pairs"
              value={String(kpis.pairs)}
              sub={`Base: ${BASE}`}
              icon={<SwapHorizOutlined sx={{ fontSize: 20 }} />}
              color="#2196f3"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Payroll (USD)"
              value={fmt(kpis.payrollUsd, "USD")}
              sub="Total net processed"
              icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
              color="#ff9800"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Payroll converted"
              value={fmt(kpis.payrollDisplay, displayCurrency)}
              sub={`In ${displayCurrency}`}
              icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
              color="#0AA775"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <FormControl size="small" fullWidth sx={{ mt: { xs: 0, md: 1 } }}>
              <InputLabel>Display currency</InputLabel>
              <Select
                label="Display currency"
                value={displayCurrency}
                onChange={(e: SelectChangeEvent) => setDisplayCurrency(e.target.value)}
              >
                {codes.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
        >
          <Tab label="Overview" />
          <Tab label={`Currencies (${currencies.length})`} />
          <Tab label="Converter" />
          <Tab label="Payroll FX" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Exchange rates (per 1 {BASE})
                </Typography>
                <Box sx={{ height: 280 }}>
                  {rateChart.labels.length ? (
                    <Bar
                      data={rateChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                      <Typography variant="body2" color="text.secondary">
                        Add currencies to see rate chart.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Quick converter
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    label="Amount"
                    type="number"
                    value={convertForm.amount}
                    onChange={(e) => setConvertForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>From</InputLabel>
                      <Select
                        label="From"
                        value={convertForm.from}
                        onChange={(e: SelectChangeEvent) =>
                          setConvertForm((f) => ({ ...f, from: e.target.value }))
                        }
                      >
                        {codes.map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>To</InputLabel>
                      <Select
                        label="To"
                        value={convertForm.to}
                        onChange={(e: SelectChangeEvent) =>
                          setConvertForm((f) => ({ ...f, to: e.target.value }))
                        }
                      >
                        {codes.map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Button variant="contained" onClick={runConvert} sx={{ textTransform: "none", fontWeight: 600 }}>
                    Convert
                  </Button>
                  {convertForm.result != null && (
                    <Alert severity="info">
                      {convertForm.amount} {convertForm.from} ={" "}
                      <strong>
                        {fmt(convertForm.result, convertForm.to, currencies.find((c) => c.code === convertForm.to)?.symbol)}
                      </strong>
                    </Alert>
                  )}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Decimals</TableCell>
                  <TableCell align="right">Rate / {BASE}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currencies.map((c) => (
                  <TableRow key={idStr(c._id)} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                    <TableCell>{c.symbol}</TableCell>
                    <TableCell align="right">{c.decimals ?? 2}</TableCell>
                    <TableCell align="right">
                      {c.code === BASE ? (
                        <Chip label="Base" size="small" color="primary" variant="outlined" />
                      ) : (
                        rates[c.code || ""]?.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "—"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCurrency(c);
                              setCurrencyForm({
                                code: c.code || "",
                                symbol: c.symbol || "",
                                decimals: String(c.decimals ?? 2),
                                rate: c.code === BASE ? "1" : String(rates[c.code || ""] ?? ""),
                              });
                              setCurrencyDialog("edit");
                            }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {c.code !== BASE && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => removeCurrency(c)}>
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 2 && (
          <Card variant="outlined" sx={{ borderRadius: 3, p: 3, maxWidth: 480 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Currency converter
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Amount"
                type="number"
                size="small"
                value={convertForm.amount}
                onChange={(e) => setConvertForm((f) => ({ ...f, amount: e.target.value, result: null }))}
                fullWidth
              />
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>From</InputLabel>
                  <Select
                    label="From"
                    value={convertForm.from}
                    onChange={(e: SelectChangeEvent) =>
                      setConvertForm((f) => ({ ...f, from: e.target.value, result: null }))
                    }
                  >
                    {codes.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>To</InputLabel>
                  <Select
                    label="To"
                    value={convertForm.to}
                    onChange={(e: SelectChangeEvent) =>
                      setConvertForm((f) => ({ ...f, to: e.target.value, result: null }))
                    }
                  >
                    {codes.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Button variant="contained" size="large" onClick={runConvert} sx={{ textTransform: "none", fontWeight: 700 }}>
                Convert
              </Button>
              {convertForm.result != null && (
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
                  <Typography variant="body2" color="text.secondary">
                    Result
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {fmt(convertForm.result, convertForm.to, currencies.find((c) => c.code === convertForm.to)?.symbol)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {convertForm.amount} {convertForm.from} at current organisation rates
                  </Typography>
                </Card>
              )}
            </Stack>
          </Card>
        )}

        {tab === 3 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                Total net payroll processed in your organisation, converted from {BASE} using stored rates.
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Currency</TableCell>
                  <TableCell align="right">Converted payroll</TableCell>
                  <TableCell align="right">Rate / {BASE}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payrollByCurrency.map((row) => (
                  <TableRow key={row.code} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.code} {row.symbol && `(${row.symbol})`}
                    </TableCell>
                    <TableCell align="right">{fmt(row.amount, row.code, row.symbol)}</TableCell>
                    <TableCell align="right">{rates[row.code]?.toLocaleString() ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>

      <Dialog open={!!currencyDialog} onClose={() => setCurrencyDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{currencyDialog === "edit" ? "Edit currency" : "Add currency"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Code"
              size="small"
              value={currencyForm.code}
              onChange={(e) => setCurrencyForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              disabled={currencyDialog === "edit"}
              placeholder="EUR"
              fullWidth
            />
            <TextField
              label="Symbol"
              size="small"
              value={currencyForm.symbol}
              onChange={(e) => setCurrencyForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="€"
              fullWidth
            />
            <TextField
              label="Decimals"
              size="small"
              type="number"
              value={currencyForm.decimals}
              onChange={(e) => setCurrencyForm((f) => ({ ...f, decimals: e.target.value }))}
              fullWidth
            />
            {currencyForm.code !== BASE && (
              <TextField
                label={`Exchange rate (units per 1 ${BASE})`}
                size="small"
                type="number"
                value={currencyForm.rate}
                onChange={(e) => setCurrencyForm((f) => ({ ...f, rate: e.target.value }))}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCurrencyDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveCurrency}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ratesDialog} onClose={() => setRatesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit exchange rates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rates express how many units of each currency equal 1 {BASE}.
          </Typography>
          <Stack spacing={1.5}>
            {codes.map((code) => (
              <TextField
                key={code}
                size="small"
                label={code}
                type="number"
                value={ratesDraft[code] ?? ""}
                onChange={(e) => setRatesDraft((d) => ({ ...d, [code]: e.target.value }))}
                disabled={code === BASE}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRatesDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRates}>
            Save rates
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
