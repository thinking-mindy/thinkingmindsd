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
  CheckCircleOutlined,
  CancelOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EventBusyOutlined,
  PeopleOutlined,
  RefreshOutlined,
  AddOutlined,
  AccountBalanceWalletOutlined,
  GavelOutlined,
  HealthAndSafetyOutlined,
  TrendingUpOutlined,
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
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import {
  createLeaveRequest,
  deleteLeaveRequest,
  getLeaveRequestsForCurrentOrg,
  updateLeaveRequest,
  type LeaveRequest,
} from "@/lib/desktop/payroll-bridge";
import { getOrgMembersForHR, getPayrollRecordsForCurrentOrg, type HREmployee } from "@/lib/desktop/payroll-bridge";
import { payrollRecordNet } from "@/lib/zw-payroll";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

type LeaveRow = LeaveRequest & { _id?: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string | Date) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d)) : "—";

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
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

function leaveStatusColor(status?: string): "default" | "warning" | "success" | "error" {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "error";
  return "warning";
}

type PayrollRow = {
  gross?: number;
  net?: number;
  netPay?: number;
  payPeriod?: string;
  employeeName?: string;
  employeeId?: string;
  zwPaye?: number;
  zwNssaEmployee?: number;
  zwNssaEmployer?: number;
  employerCost?: number;
  deductions?: { paye?: number; tax?: number; insurance?: number };
};

const LEAVE_TYPES = ["Annual", "Sick", "Personal", "Maternity", "Paternity", "Unpaid"] as const;

export default function HRPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRow[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRow[]>([]);
  const [search, setSearch] = useState("");
  const [leaveFilter, setLeaveFilter] = useState("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveType: "Annual" as (typeof LEAVE_TYPES)[number],
    startDate: dayjs() as Dayjs | null,
    endDate: dayjs().add(1, "day") as Dayjs | null,
    reason: "",
  });

  const employeeName = useCallback(
    (id?: string) => employees.find((e) => e.id === id || e.id === String(id))?.name || id || "—",
    [employees]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes, payrollRes] = await Promise.all([
        getOrgMembersForHR(),
        getLeaveRequestsForCurrentOrg(),
        getPayrollRecordsForCurrentOrg(),
      ]);
      if (empRes.success) setEmployees(empRes.data || []);
      if (leaveRes.success) setLeaveRequests((leaveRes.data as unknown as LeaveRow[]) || []);
      if (payrollRes.success) setPayrollRecords((payrollRes.data as PayrollRow[]) || []);
    } catch {
      setSnackbar({ open: true, message: "Failed to load HR data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const pending = leaveRequests.filter((l) => l.status === "Pending").length;
    const onLeave = leaveRequests.filter((l) => l.status === "Approved").length;
    const departments = new Set(employees.map((e) => e.department).filter(Boolean)).size;
    const grossPayroll = payrollRecords.reduce((s, r) => s + (r.gross || 0), 0);
    const netPayroll = payrollRecords.reduce((s, r) => s + payrollRecordNet(r), 0);
    const payeTotal = payrollRecords.reduce(
      (s, r) => s + (r.zwPaye ?? r.deductions?.paye ?? r.deductions?.tax ?? 0),
      0
    );
    const nssaTotal = payrollRecords.reduce(
      (s, r) => s + (r.zwNssaEmployee ?? r.deductions?.insurance ?? 0),
      0
    );
    const employerCost = payrollRecords.reduce(
      (s, r) => s + (r.employerCost ?? (r.gross || 0) + (r.zwNssaEmployer || 0)),
      0
    );
    const avgGross = employees.length ? grossPayroll / Math.max(payrollRecords.length, 1) : 0;
    return {
      employees: employees.length,
      departments,
      pendingLeave: pending,
      approvedLeave: onLeave,
      grossPayroll,
      netPayroll,
      payeTotal,
      nssaTotal,
      employerCost,
      avgGross,
      payrollRuns: payrollRecords.length,
    };
  }, [employees, leaveRequests, payrollRecords]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const filteredLeave = useMemo(() => {
    let list = leaveRequests;
    if (leaveFilter !== "all") list = list.filter((l) => l.status === leaveFilter);
    if (search.trim() && tab === 2) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          employeeName(String(l.employeeId)).toLowerCase().includes(q) ||
          l.leaveType?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leaveRequests, leaveFilter, search, tab, employeeName]);

  const roleChart = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      const role = e.role || "Staff";
      counts[role] = (counts[role] || 0) + 1;
    });
    const rows = Object.entries(counts).map(([label, value]) => ({ label, value }));
    const colors = ["#0AA775", "#2196f3", "#ff9800", "#9c27b0", "#f44336"];
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          data: rows.map((r) => r.value),
          backgroundColor: rows.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [employees]);

  const payrollChart = useMemo(() => {
    const buckets = [
      { label: "Gross", value: kpis.grossPayroll, color: "#0AA775" },
      { label: "PAYE", value: kpis.payeTotal, color: "#f44336" },
      { label: "NSSA", value: kpis.nssaTotal, color: "#2196f3" },
      { label: "Net paid", value: kpis.netPayroll, color: "#9c27b0" },
    ].filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: buckets.map((b) => b.color), borderWidth: 0 }],
    };
  }, [kpis]);

  const leaveChart = useMemo(() => {
    const buckets = [
      { label: "Pending", value: leaveRequests.filter((l) => l.status === "Pending").length, color: "#ff9800" },
      { label: "Approved", value: leaveRequests.filter((l) => l.status === "Approved").length, color: "#0AA775" },
      { label: "Rejected", value: leaveRequests.filter((l) => l.status === "Rejected").length, color: "#757575" },
    ].filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: buckets.map((b) => b.color), borderWidth: 0 }],
    };
  }, [leaveRequests]);

  const saveLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      setSnackbar({ open: true, message: "Employee and dates are required", severity: "error" });
      return;
    }
    const days = Math.max(1, leaveForm.endDate.diff(leaveForm.startDate, "day") + 1);
    const res = await createLeaveRequest({
      employeeId: leaveForm.employeeId,
      leaveType: leaveForm.leaveType,
      status: "Pending",
      startDate: leaveForm.startDate.toDate(),
      endDate: leaveForm.endDate.toDate(),
      days,
      reason: leaveForm.reason.trim() || "Leave request",
      submittedDate: new Date(),
    } as never);

    if (res.success) {
      setSnackbar({ open: true, message: "Leave request submitted", severity: "success" });
      setLeaveDialog(false);
      setLeaveForm({
        employeeId: "",
        leaveType: "Annual",
        startDate: dayjs(),
        endDate: dayjs().add(1, "day"),
        reason: "",
      });
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Failed to submit", severity: "error" });
    }
  };

  const setLeaveStatus = async (row: LeaveRow, status: "Approved" | "Rejected") => {
    const res = await updateLeaveRequest(idStr(row._id), { status });
    if (res.success) {
      setSnackbar({ open: true, message: `Leave ${status.toLowerCase()}`, severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Update failed", severity: "error" });
    }
  };

  const removeLeave = async (row: LeaveRow) => {
    const res = await deleteLeaveRequest(idStr(row._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Leave request deleted", severity: "success" });
      load();
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Role", "Department"],
      ...employees.map((e) => [e.name, e.email, e.role || "", e.department || ""]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="overline" color="text.secondary">
                    People operations
                  </Typography>
                  <Chip
                    size="small"
                    label="Zimbabwe USD payroll"
                    sx={{ fontWeight: 700, bgcolor: alpha("#0AA775", 0.12), color: "#0AA775" }}
                  />
                </Stack>
                <Typography variant="h4" fontWeight={800}>
                  HR & Payroll
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Workforce KPIs with ZIMRA PAYE, NSSA, and AIDS levy — salaries flow to Finance expenses.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
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
                  variant="contained"
                  startIcon={<AddOutlined />}
                  onClick={() => setLeaveDialog(true)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Request leave
                </Button>
              </Stack>
            </Stack>
          </Card>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile label="Headcount" value={String(kpis.employees)} icon={<PeopleOutlined sx={{ fontSize: 20 }} />} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="Gross payroll"
                value={fmt(kpis.grossPayroll)}
                sub={`${kpis.payrollRuns} run${kpis.payrollRuns === 1 ? "" : "s"}`}
                icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
                color="#0AA775"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="Net paid"
                value={fmt(kpis.netPayroll)}
                sub="Take-home"
                icon={<AccountBalanceWalletOutlined sx={{ fontSize: 20 }} />}
                color="#9c27b0"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="Employer cost"
                value={fmt(kpis.employerCost)}
                sub="Gross + NSSA employer"
                icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
                color="#673ab7"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="PAYE + AIDS"
                value={fmt(kpis.payeTotal)}
                sub="Statutory tax"
                icon={<GavelOutlined sx={{ fontSize: 20 }} />}
                color="#f44336"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="NSSA (employee)"
                value={fmt(kpis.nssaTotal)}
                sub="4.5% capped"
                icon={<HealthAndSafetyOutlined sx={{ fontSize: 20 }} />}
                color="#2196f3"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="Pending leave"
                value={String(kpis.pendingLeave)}
                icon={<EventBusyOutlined sx={{ fontSize: 20 }} />}
                color="#ff9800"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatTile
                label="Avg gross / run"
                value={fmt(kpis.avgGross)}
                sub={kpis.departments ? `${kpis.departments} dept` : "No dept set"}
                icon={<CheckCircleOutlined sx={{ fontSize: 20 }} />}
                color="#607d8b"
              />
            </Grid>
          </Grid>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
          >
            <Tab label="Overview" />
            <Tab label={`Employees (${employees.length})`} />
            <Tab label={`Leave (${leaveRequests.length})`} />
          </Tabs>

          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Employees by role
                  </Typography>
                  <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {roleChart.labels.length ? (
                      <Doughnut
                        data={roleChart}
                        options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No employees in your organisation yet.
                      </Typography>
                    )}
                  </Box>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Payroll breakdown (ZW)
                  </Typography>
                  <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {payrollChart.labels.length ? (
                      <Doughnut
                        data={payrollChart}
                        options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                      />
                    ) : (
                      <Stack spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" align="center">
                          No payroll runs yet.
                        </Typography>
                        <Button component={Link} href="/finance" size="small" variant="outlined">
                          Run payroll in Finance
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Leave pipeline
                  </Typography>
                  <Box sx={{ height: 240 }}>
                    {leaveChart.labels.length ? (
                      <Bar
                        data={{
                          labels: leaveChart.labels,
                          datasets: [
                            {
                              label: "Requests",
                              data: leaveChart.datasets[0].data as number[],
                              backgroundColor: leaveChart.datasets[0].backgroundColor as string[],
                              borderRadius: 6,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                      />
                    ) : (
                      <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                        <Typography variant="body2" color="text.secondary">
                          No leave requests recorded.
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Card>
              </Grid>
              {payrollRecords.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Recent payroll runs
                      </Typography>
                    </Box>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Period</TableCell>
                          <TableCell>Employee</TableCell>
                          <TableCell align="right">Gross</TableCell>
                          <TableCell align="right">PAYE</TableCell>
                          <TableCell align="right">NSSA</TableCell>
                          <TableCell align="right">Net</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payrollRecords.slice(0, 5).map((r, i) => (
                          <TableRow key={i} hover>
                            <TableCell>{r.payPeriod || "—"}</TableCell>
                            <TableCell>{r.employeeName || employeeName(r.employeeId) || "—"}</TableCell>
                            <TableCell align="right">{fmt(r.gross || 0)}</TableCell>
                            <TableCell align="right">{fmt(r.zwPaye ?? r.deductions?.paye ?? 0)}</TableCell>
                            <TableCell align="right">{fmt(r.zwNssaEmployee ?? r.deductions?.insurance ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {fmt(payrollRecordNet(r))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {tab === 1 && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <TextField
                  size="small"
                  placeholder="Search employees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  fullWidth
                />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No employees found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                        <TableCell>{e.email}</TableCell>
                        <TableCell>
                          <Chip label={e.role || "staff"} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{e.department || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {tab === 2 && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder="Search leave requests…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={leaveFilter} onChange={(e) => setLeaveFilter(e.target.value)}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLeave.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No leave requests.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeave.map((l) => (
                      <TableRow key={idStr(l._id)} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{employeeName(String(l.employeeId))}</TableCell>
                        <TableCell>{l.leaveType}</TableCell>
                        <TableCell>
                          {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                        </TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell>
                          <Chip label={l.status} size="small" color={leaveStatusColor(l.status)} variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            {l.status === "Pending" && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton size="small" color="success" onClick={() => setLeaveStatus(l, "Approved")}>
                                    <CheckCircleOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton size="small" color="error" onClick={() => setLeaveStatus(l, "Rejected")}>
                                    <CancelOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => removeLeave(l)}>
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>

        <Dialog open={leaveDialog} onClose={() => setLeaveDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>New leave request</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  label="Employee"
                  value={leaveForm.employeeId}
                  onChange={(e: SelectChangeEvent) => setLeaveForm((f) => ({ ...f, employeeId: e.target.value }))}
                >
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Leave type</InputLabel>
                <Select
                  label="Leave type"
                  value={leaveForm.leaveType}
                  onChange={(e: SelectChangeEvent) =>
                    setLeaveForm((f) => ({ ...f, leaveType: e.target.value as (typeof LEAVE_TYPES)[number] }))
                  }
                >
                  {LEAVE_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1.5}>
                <DatePicker
                  label="Start"
                  value={leaveForm.startDate}
                  onChange={(v) => setLeaveForm((f) => ({ ...f, startDate: v }))}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <DatePicker
                  label="End"
                  value={leaveForm.endDate}
                  onChange={(v) => setLeaveForm((f) => ({ ...f, endDate: v }))}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </Stack>
              <TextField
                label="Reason"
                size="small"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLeaveDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveLeave}>
              Submit
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
    </LocalizationProvider>
  );
}
