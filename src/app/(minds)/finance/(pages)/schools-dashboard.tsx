"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  CheckroomOutlined,
  DirectionsBusOutlined,
  MenuBookOutlined,
  PaymentsOutlined,
  PeopleOutlined,
  Refresh,
  SchoolOutlined,
  TrendingUpOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getCashierTransactionsFiltered } from "@/lib/desktop/finance-bridge";
import { getSchoolDashboardStats, getSchoolStudentsWithBalances } from "@/lib/desktop/school-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard, statIconSx } from "@/components/FlatCard";
import {
  aggregateSchoolPayments,
  classifySchoolPayment,
  inDateRange,
  isSchoolCollectionTx,
  mapStudentBalances,
  normalizeSchoolPaymentTx,
  parseSchoolTxDate,
  schoolPaymentsByMonth,
  signedSchoolAmount,
  summarizeOutstanding,
  type SchoolPaymentTx,
} from "@/lib/school-finance";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const FEE_COLORS = {
  tuition: "#2196f3",
  transport: "#ff9800",
  uniform: "#9c27b0",
  other: "#607d8b",
};

type PeriodKey = "month" | "term" | "year";

function getPeriodRange(period: PeriodKey): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      label: "This month",
    };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: "This year",
    };
  }
  const month = now.getMonth();
  const termStartMonth = month < 4 ? 0 : month < 8 ? 4 : 8;
  return {
    start: new Date(now.getFullYear(), termStartMonth, 1),
    end: now,
    label: "Current term",
  };
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  tone = "neutral" as const,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  tone?: "neutral" | "safe" | "warning" | "danger";
}) {
  return (
    <FlatCard sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.6 }}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: tone === "neutral" ? "text.primary" : undefined }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, display: "block" }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ ...statIconSx(tone), bgcolor: alpha(color, 0.12), color }}>{icon}</Box>
        </Stack>
      </CardContent>
    </FlatCard>
  );
}

export default function SchoolsDashboardTab() {
  const { user } = useUser();
  const orgId = user?.publicMetadata?.companyId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("term");
  const [transactions, setTransactions] = useState<SchoolPaymentTx[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    schoolPayments: 0,
    feesThisMonth: 0,
    institutionName: "",
  });
  const [studentBalances, setStudentBalances] = useState<ReturnType<typeof mapStudentBalances>>([]);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [txRes, statsRes, studentsRes] = await Promise.all([
          getCashierTransactionsFiltered(orgId ? { orgId } : undefined),
          orgId ? getSchoolDashboardStats(orgId) : getSchoolDashboardStats(),
          orgId ? getSchoolStudentsWithBalances(orgId) : getSchoolStudentsWithBalances(),
        ]);

        if (txRes.success && txRes.data) {
          setTransactions(
            (txRes.data as SchoolPaymentTx[])
              .map(normalizeSchoolPaymentTx)
              .filter(isSchoolCollectionTx)
          );
        }
        if (statsRes.success && statsRes.data) {
          setStats({
            totalStudents: Number(statsRes.data.totalStudents ?? 0),
            activeStudents: Number(statsRes.data.activeStudents ?? 0),
            schoolPayments: Number(statsRes.data.schoolPayments ?? 0),
            feesThisMonth: Number(statsRes.data.feesThisMonth ?? 0),
            institutionName: String(statsRes.data.institutionName ?? ""),
          });
        }
        if (studentsRes.success && studentsRes.data) {
          setStudentBalances(mapStudentBalances(studentsRes.data as Record<string, unknown>[]));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const { start, end, label: periodLabel } = useMemo(() => getPeriodRange(period), [period]);

  const aggregates = useMemo(
    () => aggregateSchoolPayments(transactions, start, end),
    [transactions, start, end]
  );

  const outstanding = useMemo(() => summarizeOutstanding(studentBalances), [studentBalances]);

  const monthlyTrend = useMemo(() => schoolPaymentsByMonth(transactions, 6), [transactions]);

  const allTimeTotals = useMemo(() => aggregateSchoolPayments(transactions), [transactions]);

  const feeBreakdown = useMemo(
    () =>
      [
        { name: "Tuition", value: aggregates.tuition, color: FEE_COLORS.tuition },
        { name: "Transport", value: aggregates.transport, color: FEE_COLORS.transport },
        { name: "Uniform", value: aggregates.uniform, color: FEE_COLORS.uniform },
        { name: "Other", value: aggregates.other, color: FEE_COLORS.other },
      ].filter((item) => item.value > 0),
    [aggregates]
  );

  const recentPayments = useMemo(
    () =>
      [...transactions]
        .filter((tx) => inDateRange(tx.createdAt, start, end))
        .sort(
          (a, b) =>
            (parseSchoolTxDate(b.createdAt)?.getTime() ?? 0) -
            (parseSchoolTxDate(a.createdAt)?.getTime() ?? 0)
        )
        .slice(0, 8),
    [transactions, start, end]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            School finance overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
            {stats.institutionName
              ? `${stats.institutionName} — fees collected, transport, uniform, and outstanding balances.`
              : "Track tuition, transport, uniform collections and term fee balances."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, v: PeriodKey | null) => v && setPeriod(v)}
            sx={(t) => ({
              bgcolor: alpha(t.palette.divider, 0.1),
              borderRadius: 2,
              p: 0.5,
              "& .MuiToggleButton-root": {
                border: 0,
                borderRadius: 1.5,
                px: 1.75,
                py: 0.5,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
              },
            })}
          >
            <ToggleButton value="month">This month</ToggleButton>
            <ToggleButton value="term">This term</ToggleButton>
            <ToggleButton value="year">This year</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton onClick={() => void loadData(true)} disabled={refreshing}>
              <Refresh sx={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label={`Total collected · ${periodLabel}`}
            value={formatCurrency(aggregates.total)}
            sub={`${aggregates.transactionCount} payment${aggregates.transactionCount === 1 ? "" : "s"}`}
            icon={<PaymentsOutlined />}
            color="#2e7d32"
            tone="safe"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Tuition fees"
            value={formatCurrency(aggregates.tuition)}
            sub="Term & class fees"
            icon={<MenuBookOutlined />}
            color={FEE_COLORS.tuition}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Transport fees"
            value={formatCurrency(aggregates.transport)}
            sub="Bus & travel"
            icon={<DirectionsBusOutlined />}
            color={FEE_COLORS.transport}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Uniform fees"
            value={formatCurrency(aggregates.uniform)}
            sub="Kit & dress code"
            icon={<CheckroomOutlined />}
            color={FEE_COLORS.uniform}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Outstanding fees"
            value={formatCurrency(outstanding.totalDue)}
            sub={`${outstanding.outstandingCount} student${outstanding.outstandingCount === 1 ? "" : "s"} with balance`}
            icon={<WarningAmberOutlined />}
            color="#ed6c02"
            tone={outstanding.totalDue > 0 ? "warning" : "safe"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Collection rate"
            value={`${outstanding.collectionRate.toFixed(0)}%`}
            sub={`${formatCurrency(outstanding.totalPaid)} of ${formatCurrency(outstanding.totalBilled)} billed`}
            icon={<TrendingUpOutlined />}
            color="#1976d2"
            tone={outstanding.collectionRate >= 80 ? "safe" : outstanding.collectionRate >= 50 ? "warning" : "danger"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Enrolled students"
            value={String(stats.activeStudents)}
            sub={`${stats.totalStudents} total on roll`}
            icon={<PeopleOutlined />}
            color="#5c6bc0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="All-time collections"
            value={formatCurrency(allTimeTotals.total)}
            sub={`${stats.schoolPayments} school transactions`}
            icon={<SchoolOutlined />}
            color="#00897b"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <FlatCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                Fee mix
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {periodLabel} breakdown by category
              </Typography>
              {feeBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={feeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {feeBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <Typography color="text.secondary" fontWeight={600}>
                    No school payments in this period
                  </Typography>
                </Box>
              )}
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <FlatCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                Collections trend
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Last 6 months by fee type
              </Typography>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyTrend} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha("#000", 0.08)} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v) => v.split("-")[1]}
                      tick={{ fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 12 }} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="tuition" name="Tuition" fill={FEE_COLORS.tuition} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="transport" name="Transport" fill={FEE_COLORS.transport} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="uniform" name="Uniform" fill={FEE_COLORS.uniform} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <Typography color="text.secondary" fontWeight={600}>
                    No collection history yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <FlatCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                Recent collections
              </Typography>
              <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (t) => alpha(t.palette.divider, 0.06) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                          <Typography color="text.secondary">No payments in {periodLabel.toLowerCase()}</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPayments.map((tx) => {
                        const category = classifySchoolPayment(tx);
                        const color =
                          category === "tuition"
                            ? FEE_COLORS.tuition
                            : category === "transport"
                              ? FEE_COLORS.transport
                              : category === "uniform"
                                ? FEE_COLORS.uniform
                                : FEE_COLORS.other;
                        return (
                          <TableRow key={String(tx._id)} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {tx.studentName || "Walk-in"}
                              </Typography>
                              {tx.className && (
                                <Typography variant="caption" color="text.secondary">
                                  {tx.className}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={tx.paymentType || category}
                                size="small"
                                sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, fontSize: "0.7rem" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {tx.createdAt
                                  ? new Date(tx.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={800} color="success.main">
                                {formatCurrency(signedSchoolAmount(tx))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <FlatCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                Outstanding balances
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>
                Students with term fees still due
              </Typography>
              {outstanding.topOutstanding.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <CheckroomOutlined sx={{ fontSize: 40, color: "success.main", mb: 1, opacity: 0.6 }} />
                  <Typography fontWeight={700} color="success.main">
                    All caught up
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No outstanding term fee balances
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {outstanding.topOutstanding.map((student) => (
                    <Box key={student._id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {student.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.className || "Class"} · {student.termLabel || "Current term"}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={800} color="warning.main">
                          {formatCurrency(student.remaining)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={student.percentPaid}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha("#ff9800", 0.15),
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor: student.percentPaid >= 100 ? "#2e7d32" : "#1976d2",
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
                        {student.percentPaid.toFixed(0)}% paid · {formatCurrency(student.paidThisTerm)} of{" "}
                        {formatCurrency(student.feesPerTerm)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>
    </Box>
  );
}
