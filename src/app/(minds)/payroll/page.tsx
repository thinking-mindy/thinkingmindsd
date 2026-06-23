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
  AccountBalanceWalletOutlined,
  AddOutlined,
  AttachMoneyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PeopleOutlined,
  RefreshOutlined,
} from "@mui/icons-material";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useUser } from "@/lib/auth/client";
import Link from "next/link";
import {
  createPayrollRecord,
  deletePayrollRecord,
  getOrgMembersForHR,
  getPayrollRecordsForCurrentOrg,
  updatePayrollRecord,
  type HREmployee,
} from "@/lib/desktop/payroll-bridge";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

type PayrollRow = {
  _id?: string;
  payPeriod?: string;
  employeeId?: string;
  gross?: number;
  net?: number;
  deductions?: {
    tax?: number;
    insurance?: number;
    retirement?: number;
    other?: number;
  };
  createdAt?: string | Date;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
}

function calcNet(
  gross: number,
  deductions: { tax?: number; insurance?: number; retirement?: number; other?: number }
) {
  return (
    gross -
    (deductions.tax || 0) -
    (deductions.insurance || 0) -
    (deductions.retirement || 0) -
    (deductions.other || 0)
  );
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

export default function PayrollPage() {
  const { user } = useUser();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PayrollRow[]>([]);
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<PayrollRow | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    payPeriod: new Date().toISOString().slice(0, 7),
    gross: "",
    tax: "",
    insurance: "",
    retirement: "",
    other: "",
  });

  const employeeName = useCallback(
    (id?: string) => employees.find((e) => e.id === id || e.id === String(id))?.name || "—",
    [employees]
  );

  const load = useCallback(async () => {
    if (!user?.publicMetadata?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [recRes, empRes] = await Promise.all([getPayrollRecordsForCurrentOrg(), getOrgMembersForHR()]);
      if (recRes.success) setRecords((recRes.data as unknown as PayrollRow[]) || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch {
      setSnackbar({ open: true, message: "Failed to load payroll data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [user?.publicMetadata?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const periods = useMemo(() => {
    const set = new Set(records.map((r) => r.payPeriod).filter(Boolean) as string[]);
    return Array.from(set).sort().reverse();
  }, [records]);

  const kpis = useMemo(() => {
    const gross = records.reduce((s, r) => s + (r.gross || 0), 0);
    const net = records.reduce((s, r) => s + (r.net || 0), 0);
    const deductions = gross - net;
    const uniqueEmployees = new Set(records.map((r) => String(r.employeeId))).size;
    return {
      records: records.length,
      employees: uniqueEmployees,
      gross,
      net,
      deductions,
    };
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (periodFilter !== "all") list = list.filter((r) => r.payPeriod === periodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          employeeName(String(r.employeeId)).toLowerCase().includes(q) ||
          r.payPeriod?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, periodFilter, search, employeeName]);

  const periodSummary = useMemo(() => {
    const map = new Map<string, { period: string; count: number; gross: number; net: number }>();
    records.forEach((r) => {
      const p = r.payPeriod || "Unknown";
      const row = map.get(p) || { period: p, count: 0, gross: 0, net: 0 };
      row.count += 1;
      row.gross += r.gross || 0;
      row.net += r.net || 0;
      map.set(p, row);
    });
    return Array.from(map.values()).sort((a, b) => b.period.localeCompare(a.period));
  }, [records]);

  const periodChart = useMemo(() => {
    const rows = periodSummary.slice(0, 8).reverse();
    return {
      labels: rows.map((r) => r.period),
      datasets: [
        {
          label: "Net pay",
          data: rows.map((r) => r.net),
          backgroundColor: alpha("#0AA775", 0.75),
          borderRadius: 6,
        },
      ],
    };
  }, [periodSummary]);

  const deductionChart = useMemo(() => {
    const tax = records.reduce((s, r) => s + (r.deductions?.tax || 0), 0);
    const insurance = records.reduce((s, r) => s + (r.deductions?.insurance || 0), 0);
    const retirement = records.reduce((s, r) => s + (r.deductions?.retirement || 0), 0);
    const other = records.reduce((s, r) => s + (r.deductions?.other || 0), 0);
    const buckets = [
      { label: "Tax", value: tax, color: "#f44336" },
      { label: "Insurance", value: insurance, color: "#2196f3" },
      { label: "Retirement", value: retirement, color: "#ff9800" },
      { label: "Other", value: other, color: "#9e9e9e" },
    ].filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: buckets.map((b) => b.color), borderWidth: 0 }],
    };
  }, [records]);

  const resetForm = () =>
    setForm({
      employeeId: "",
      payPeriod: new Date().toISOString().slice(0, 7),
      gross: "",
      tax: "",
      insurance: "",
      retirement: "",
      other: "",
    });

  const buildPayload = () => {
    const gross = Number(form.gross) || 0;
    const deductions = {
      tax: Number(form.tax) || 0,
      insurance: Number(form.insurance) || 0,
      retirement: Number(form.retirement) || 0,
      other: Number(form.other) || 0,
    };
    return {
      employeeId: form.employeeId,
      payPeriod: form.payPeriod,
      gross,
      deductions,
      net: calcNet(gross, deductions),
    };
  };

  const saveRecord = async () => {
    if (!user?.publicMetadata?.companyId || !form.employeeId || !form.payPeriod || !form.gross) {
      setSnackbar({ open: true, message: "Employee, period, and gross pay are required", severity: "error" });
      return;
    }
    const payload = buildPayload();
    const orgId = user.publicMetadata.companyId as string;

    const res =
      dialog === "edit" && selected
        ? await updatePayrollRecord(idStr(selected._id), payload as never)
        : await createPayrollRecord({ orgId, ...payload } as never);

    if (res.success) {
      setSnackbar({
        open: true,
        message: dialog === "edit" ? "Payroll record updated" : "Payroll record created",
        severity: "success",
      });
      setDialog(null);
      setSelected(null);
      resetForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const removeRecord = async (row: PayrollRow) => {
    const res = await deletePayrollRecord(idStr(row._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Record deleted", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Employee", "Period", "Gross", "Tax", "Insurance", "Retirement", "Other", "Net"],
      ...filtered.map((r) => [
        employeeName(String(r.employeeId)),
        r.payPeriod || "",
        String(r.gross || 0),
        String(r.deductions?.tax || 0),
        String(r.deductions?.insurance || 0),
        String(r.deductions?.retirement || 0),
        String(r.deductions?.other || 0),
        String(r.net || 0),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const netPreview = calcNet(Number(form.gross) || 0, {
    tax: Number(form.tax) || 0,
    insurance: Number(form.insurance) || 0,
    retirement: Number(form.retirement) || 0,
    other: Number(form.other) || 0,
  });

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
                Compensation
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                Payroll
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Process pay runs, track deductions, and review payroll by period.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                component={Link}
                href="/hr"
                size="small"
                variant="outlined"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Open HR
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
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => {
                  resetForm();
                  setDialog("create");
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                New record
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label="Records" value={String(kpis.records)} icon={<AccountBalanceWalletOutlined sx={{ fontSize: 20 }} />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Employees paid"
              value={String(kpis.employees)}
              icon={<PeopleOutlined sx={{ fontSize: 20 }} />}
              color="#2196f3"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label="Gross pay" value={fmt(kpis.gross)} icon={<AttachMoneyOutlined sx={{ fontSize: 20 }} />} color="#ff9800" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label="Deductions" value={fmt(kpis.deductions)} icon={<AttachMoneyOutlined sx={{ fontSize: 20 }} />} color="#f44336" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label="Net pay" value={fmt(kpis.net)} icon={<AccountBalanceWalletOutlined sx={{ fontSize: 20 }} />} color="#0AA775" />
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
        >
          <Tab label="Overview" />
          <Tab label={`Records (${records.length})`} />
          <Tab label="By period" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Deductions breakdown
                </Typography>
                <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {deductionChart.labels.length ? (
                    <Doughnut
                      data={deductionChart}
                      options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No payroll records yet.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Net pay by period
                </Typography>
                <Box sx={{ height: 260 }}>
                  {periodChart.labels.length ? (
                    <Bar
                      data={periodChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { ticks: { callback: (v) => fmt(Number(v)) } } },
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                      <Typography variant="body2" color="text.secondary">
                        Add payroll records to see trends.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  placeholder="Search employee or period…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Period</InputLabel>
                  <Select label="Period" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                    <MenuItem value="all">All periods</MenuItem>
                    {periods.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Deductions</TableCell>
                  <TableCell align="right">Net</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No payroll records match your filters.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const ded =
                      (r.deductions?.tax || 0) +
                      (r.deductions?.insurance || 0) +
                      (r.deductions?.retirement || 0) +
                      (r.deductions?.other || 0);
                    return (
                      <TableRow key={idStr(r._id)} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{employeeName(String(r.employeeId))}</TableCell>
                        <TableCell>
                          <Chip label={r.payPeriod || "—"} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{fmt(r.gross || 0)}</TableCell>
                        <TableCell align="right">{fmt(ded)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {fmt(r.net || 0)}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelected(r);
                                  setForm({
                                    employeeId: String(r.employeeId || ""),
                                    payPeriod: r.payPeriod || "",
                                    gross: String(r.gross || 0),
                                    tax: String(r.deductions?.tax || 0),
                                    insurance: String(r.deductions?.insurance || 0),
                                    retirement: String(r.deductions?.retirement || 0),
                                    other: String(r.deductions?.other || 0),
                                  });
                                  setDialog("edit");
                                }}
                              >
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => removeRecord(r)}>
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 2 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pay period</TableCell>
                  <TableCell align="right">Records</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No pay periods to summarise.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  periodSummary.map((row) => (
                    <TableRow key={row.period} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.period}</TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      <TableCell align="right">{fmt(row.gross)}</TableCell>
                      <TableCell align="right">{fmt(row.net)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog === "edit" ? "Edit payroll record" : "New payroll record"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                label="Employee"
                value={form.employeeId}
                onChange={(e: SelectChangeEvent) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              >
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Pay period (YYYY-MM)"
              size="small"
              value={form.payPeriod}
              onChange={(e) => setForm((f) => ({ ...f, payPeriod: e.target.value }))}
              placeholder="2026-06"
              fullWidth
            />
            <TextField
              label="Gross pay"
              size="small"
              type="number"
              value={form.gross}
              onChange={(e) => setForm((f) => ({ ...f, gross: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <TextField
                label="Tax"
                size="small"
                type="number"
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="Insurance"
                size="small"
                type="number"
                value={form.insurance}
                onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="Retirement"
                size="small"
                type="number"
                value={form.retirement}
                onChange={(e) => setForm((f) => ({ ...f, retirement: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="Other"
                size="small"
                type="number"
                value={form.other}
                onChange={(e) => setForm((f) => ({ ...f, other: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
              />
            </Stack>
            <Typography variant="subtitle2" fontWeight={700} textAlign="right">
              Net pay: {fmt(netPreview)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveRecord}>
            {dialog === "edit" ? "Save" : "Create"}
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
