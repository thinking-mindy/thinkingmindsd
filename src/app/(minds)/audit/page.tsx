"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DownloadOutlined,
  ErrorOutlineOutlined,
  FactCheckOutlined,
  GppGoodOutlined,
  HistoryOutlined,
  Inventory2Outlined,
  ListAltOutlined,
  PaidOutlined,
  RefreshOutlined,
  SearchOutlined,
  ShieldOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import PlanGate from "@/components/PlanGate";
import ModuleShell from "@/components/ModuleShell";
import { useUser } from "@/lib/auth/client";
import { formatCurrency } from "@/lib/format-currency";
import {
  exportEventsCsv,
  loadAuditDashboard,
  type AuditDashboardData,
  type AuditEvent,
  type AuditSeverity,
  type AuditSource,
  type ComplianceCheck,
  type ComplianceStatus,
} from "./audit-data";

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  critical: "#d32f2f",
  high: "#ed6c02",
  medium: "#0288d1",
  low: "#5c6bc0",
  info: "#2e7d32",
};

const STATUS_COLORS: Record<ComplianceStatus, string> = {
  pass: "#2e7d32",
  warn: "#ed6c02",
  fail: "#d32f2f",
  pending: "#757575",
};

const SOURCE_LABELS: Record<AuditSource, string> = {
  audit_log: "Audit log",
  stock_movement: "Inventory",
  payroll: "Payroll",
  expense: "Expense",
};

function ComplianceRing({ score, size = 120 }: { score: number; size?: number }) {
  const theme = useTheme();
  const color =
    score >= 80 ? theme.palette.success.main : score >= 55 ? theme.palette.warning.main : theme.palette.error.main;

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={3}
        sx={{ color: alpha(theme.palette.divider, 0.35) }}
      />
      <CircularProgress
        variant="determinate"
        value={score}
        size={size}
        thickness={3}
        sx={{ color, position: "absolute", left: 0 }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <Typography variant="h4" fontWeight={800} lineHeight={1}>
          {score}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          health
        </Typography>
      </Box>
    </Box>
  );
}

function SeverityChip({ severity }: { severity: AuditSeverity }) {
  return (
    <Chip
      size="small"
      label={severity}
      sx={{
        textTransform: "capitalize",
        fontWeight: 700,
        fontSize: "0.7rem",
        bgcolor: alpha(SEVERITY_COLORS[severity], 0.12),
        color: SEVERITY_COLORS[severity],
        border: `1px solid ${alpha(SEVERITY_COLORS[severity], 0.35)}`,
      }}
    />
  );
}

function StatusChip({ status }: { status: ComplianceStatus }) {
  const icons = {
    pass: <CheckCircleOutlined sx={{ fontSize: 14 }} />,
    warn: <WarningAmberOutlined sx={{ fontSize: 14 }} />,
    fail: <ErrorOutlineOutlined sx={{ fontSize: 14 }} />,
    pending: <HistoryOutlined sx={{ fontSize: 14 }} />,
  };
  return (
    <Chip
      size="small"
      icon={icons[status]}
      label={status}
      sx={{
        textTransform: "capitalize",
        fontWeight: 700,
        bgcolor: alpha(STATUS_COLORS[status], 0.12),
        color: STATUS_COLORS[status],
      }}
    />
  );
}

function DomainIcon({ domain }: { domain: ComplianceCheck["domain"] }) {
  const map = {
    Finance: <AccountBalanceWalletOutlined fontSize="small" />,
    HR: <PaidOutlined fontSize="small" />,
    Security: <ShieldOutlined fontSize="small" />,
    Licensing: <GppGoodOutlined fontSize="small" />,
    Inventory: <Inventory2Outlined fontSize="small" />,
    Operations: <FactCheckOutlined fontSize="small" />,
  };
  return <Box sx={{ color: "primary.main" }}>{map[domain]}</Box>;
}

function OverviewTab({ data }: { data: AuditDashboardData }) {
  const theme = useTheme();
  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    "#7e57c2",
  ];
  const recent = data.events.slice(0, 8);
  const failing = data.compliance.filter((c) => c.status === "warn" || c.status === "fail");

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            height: "100%",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Activity pulse — last 14 days
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Combined events from audit logs, inventory, payroll, and finance.
          </Typography>
          <Box sx={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={data.activityByDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="auditActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.6)} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Events"
                  stroke={theme.palette.primary.main}
                  fill="url(#auditActivity)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack
          spacing={2}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} alignSelf="flex-start">
            Compliance health
          </Typography>
          <ComplianceRing score={data.stats.complianceScore} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {data.stats.openIssues === 0
              ? "All checks passing — no open governance issues."
              : `${data.stats.openIssues} item(s) need attention.`}
          </Typography>
          {failing.slice(0, 2).map((c) => (
            <Box
              key={c.id}
              sx={{
                width: "100%",
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(STATUS_COLORS[c.status], 0.08),
                border: `1px solid ${alpha(STATUS_COLORS[c.status], 0.25)}`,
              }}
            >
              <Typography variant="caption" fontWeight={700} color={STATUS_COLORS[c.status]}>
                {c.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {c.detail}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: "100%",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Events by domain
          </Typography>
          {data.categoryBreakdown.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No categorized activity yet.
            </Typography>
          ) : (
            <Box sx={{ width: "100%", height: 220, display: "flex", alignItems: "center" }}>
              <ResponsiveContainer width="55%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Stack spacing={0.75} sx={{ flex: 1 }}>
                {data.categoryBreakdown.slice(0, 5).map((row, i) => (
                  <Stack key={row.category} direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: pieColors[i % pieColors.length],
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {row.category}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {row.count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Recent activity
          </Typography>
          {recent.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              Activity will appear here as your team works across modules.
            </Typography>
          ) : (
            <Stack spacing={0}>
              {recent.map((event, idx) => (
                <Box
                  key={event.id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    py: 1.5,
                    borderBottom:
                      idx < recent.length - 1
                        ? `1px solid ${alpha(theme.palette.divider, 0.4)}`
                        : undefined,
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      mt: 0.75,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: SEVERITY_COLORS[event.severity],
                        boxShadow: `0 0 0 3px ${alpha(SEVERITY_COLORS[event.severity], 0.2)}`,
                      }}
                    />
                    {idx < recent.length - 1 && (
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          minHeight: 24,
                          bgcolor: alpha(theme.palette.divider, 0.5),
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="body2" fontWeight={700}>
                        {event.action}
                      </Typography>
                      <Chip label={SOURCE_LABELS[event.source]} size="small" variant="outlined" sx={{ height: 20 }} />
                      <SeverityChip severity={event.severity} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {event.timestamp.toLocaleString()} · {event.actor}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
                      {event.summary}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}

function TrailTab({ events }: { events: AuditEvent[] }) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<AuditSeverity | "all">("all");
  const [source, setSource] = useState<AuditSource | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (severity !== "all" && e.severity !== severity) return false;
      if (source !== "all" && e.source !== source) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [events, query, severity, source]);

  const handleExport = () => {
    const csv = exportEventsCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
        <TextField
          size="small"
          placeholder="Search action, actor, summary…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AuditSeverity | "all")}
          sx={{ minWidth: 130 }}
          SelectProps={{ native: true }}
        >
          <option value="all">All</option>
          {(["critical", "high", "medium", "low", "info"] as AuditSeverity[]).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Source"
          value={source}
          onChange={(e) => setSource(e.target.value as AuditSource | "all")}
          sx={{ minWidth: 140 }}
          SelectProps={{ native: true }}
        >
          <option value="all">All sources</option>
          {(Object.keys(SOURCE_LABELS) as AuditSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </TextField>
        <Button
          variant="outlined"
          startIcon={<DownloadOutlined />}
          onClick={handleExport}
          disabled={filtered.length === 0}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Export CSV
        </Button>
      </Stack>

      <TableContainer
        sx={{
          borderRadius: 2.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Domain</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No events match your filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 100).map((event) => (
                <TableRow
                  key={event.id}
                  hover
                  sx={{ "&:last-child td": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="caption">
                      {event.timestamp.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {event.action}
                    </Typography>
                  </TableCell>
                  <TableCell>{event.actor}</TableCell>
                  <TableCell>
                    <Chip label={event.category} size="small" variant="outlined" sx={{ height: 22 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{SOURCE_LABELS[event.source]}</Typography>
                  </TableCell>
                  <TableCell>
                    <SeverityChip severity={event.severity} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Tooltip title={event.details ?? event.summary}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {event.summary}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {filtered.length > 100 && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Showing first 100 of {filtered.length} events. Export CSV for the full filtered set.
        </Typography>
      )}
    </Stack>
  );
}

function ComplianceTab({ checks }: { checks: ComplianceCheck[] }) {
  const theme = useTheme();

  return (
    <Grid container spacing={2}>
      {checks.map((check) => (
        <Grid key={check.id} size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: "100%",
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              borderLeft: `4px solid ${STATUS_COLORS[check.status]}`,
              transition: "box-shadow 0.2s ease",
              "&:hover": {
                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }}
                >
                  <DomainIcon domain={check.domain} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    {check.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {check.domain}
                  </Typography>
                </Box>
              </Stack>
              <StatusChip status={check.status} />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {check.detail}
            </Typography>

            {check.recommendation && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                }}
              >
                <Typography variant="caption" fontWeight={700} color="info.main">
                  Recommended action
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {check.recommendation}
                </Typography>
              </Box>
            )}

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={check.score}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.divider, 0.4),
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                    bgcolor: STATUS_COLORS[check.status],
                  },
                }}
              />
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                {check.score}%
              </Typography>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

function PayrollTab({ filings }: { filings: AuditDashboardData["payrollFilings"] }) {
  const theme = useTheme();

  if (filings.length === 0) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
        <PaidOutlined sx={{ fontSize: 56, color: "text.disabled" }} />
        <Typography variant="h6" color="text.secondary">
          No payroll filings on record
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
          Process payroll in Finance → Payroll to build a verifiable compensation trail for audits.
        </Typography>
      </Stack>
    );
  }

  return (
    <Grid container spacing={2}>
      {filings.map((filing) => (
        <Grid key={filing.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: "100%",
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Pay period
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {filing.period}
                </Typography>
              </Box>
              <Chip
                size="small"
                icon={<CheckCircleOutlined />}
                label="On file"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Records
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {filing.recordCount}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Net disbursed
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formatCurrency(filing.totalNet)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Tax withheld
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(filing.totalTax)}
                </Typography>
              </Stack>
              {filing.lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last updated {filing.lastUpdated.toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

function AuditDashboard() {
  const { user } = useUser();
  const orgId = (user?.publicMetadata?.companyId as string) || "";
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AuditDashboardData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadAuditDashboard(orgId);
      setData(result);
    } catch (error) {
      console.error("Failed to load audit dashboard:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = useMemo(
    () => [
      { id: 0, label: "Overview", description: "Health & pulse", icon: <DashboardOutlined /> },
      {
        id: 1,
        label: "Activity trail",
        description: "Searchable log",
        icon: <ListAltOutlined />,
        badge: data?.stats.totalEvents,
      },
      {
        id: 2,
        label: "Compliance",
        description: "Live checks",
        icon: <GppGoodOutlined />,
        badge: data?.stats.openIssues,
      },
      {
        id: 3,
        label: "Payroll filings",
        description: "Compensation trail",
        icon: <PaidOutlined />,
        badge: data?.payrollFilings.length || undefined,
      },
    ],
    [data]
  );

  const statCards = useMemo(
    () => [
      {
        label: "Events (7d)",
        value: data?.stats.eventsLast7Days ?? "—",
        icon: <HistoryOutlined />,
      },
      {
        label: "Compliance",
        value: data ? `${data.stats.complianceScore}%` : "—",
        icon: <GppGoodOutlined />,
        pulse: (data?.stats.openIssues ?? 0) > 0,
      },
      {
        label: "High priority",
        value: data?.stats.criticalCount ?? "—",
        icon: <WarningAmberOutlined />,
        pulse: (data?.stats.criticalCount ?? 0) > 0,
      },
      {
        label: "Audit logs",
        value: data?.stats.auditLogCount ?? "—",
        icon: <ShieldOutlined />,
      },
    ],
    [data]
  );

  const heroChips = data ? (
    <>
      <Chip
        size="small"
        label={`${data.stats.memberCount} team members`}
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
      <Chip
        size="small"
        label={`${data.stats.totalEvents} total events`}
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
    </>
  ) : undefined;

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", py: 3, px: { xs: 2, md: 4 } }}>
      <ModuleShell
        overline="Governance & traceability"
        title="Audit & Compliance"
        subtitle="Live activity from your ERP modules, automated compliance checks, and exportable audit trails."
        heroIcon={<ShieldOutlined sx={{ fontSize: 30 }} />}
        heroChips={heroChips}
        statCards={statCards}
        tabIndex={tabIndex}
        onTabChange={setTabIndex}
        tabs={tabs}
        alertSlot={
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Tooltip title="Refresh data">
              <IconButton onClick={() => void load()} disabled={loading} size="small">
                <RefreshOutlined />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
            <CircularProgress />
            <Typography color="text.secondary">Gathering audit data across modules…</Typography>
          </Stack>
        ) : !data ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
            <ErrorOutlineOutlined sx={{ fontSize: 48, color: "text.disabled" }} />
            <Typography color="text.secondary">Unable to load audit data. Try refreshing.</Typography>
            <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={() => void load()}>
              Retry
            </Button>
          </Stack>
        ) : (
          <>
            {tabIndex === 0 && <OverviewTab data={data} />}
            {tabIndex === 1 && <TrailTab events={data.events} />}
            {tabIndex === 2 && <ComplianceTab checks={data.compliance} />}
            {tabIndex === 3 && <PayrollTab filings={data.payrollFilings} />}
          </>
        )}
      </ModuleShell>
    </Box>
  );
}

export default function AuditPage() {
  return (
    <PlanGate modulePath="/audit" moduleName="Audit & Compliance">
      <AuditDashboard />
    </PlanGate>
  );
}
