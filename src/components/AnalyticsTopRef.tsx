'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  alpha,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
  type Theme,
} from '@mui/material';
import {
  AccountBalanceWalletOutlined,
  ArrowForwardOutlined,
  AttachMoneyOutlined,
  CheckCircleOutlined,
  ErrorOutlineOutlined,
  EventOutlined,
  GppGoodOutlined,
  Inventory2Outlined,
  PaymentOutlined,
  PeopleOutlined,
  PersonAddOutlined,
  PointOfSaleOutlined,
  ReceiptLongOutlined,
  ReceiptOutlined,
  SchoolOutlined,
  TrendingDownOutlined,
  TrendingUpOutlined,
  WarningAmberOutlined,
  WorkOutlineOutlined,
} from '@mui/icons-material';
import {
  getFinanceAnalytics,
  getHRAnalytics,
  getInventoryAndPOSAnalytics,
  getOverviewAnalytics,
} from '@/lib/desktop/analytics-bridge';
import { getFinancialSummary } from '@/lib/desktop/finance-bridge';
import { formatCurrency, formatUsd } from '@/lib/format-currency';

type MetricTone = 'safe' | 'warning' | 'danger' | 'neutral';

type Metric = {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: MetricTone;
  progress?: number;
  progressLabel?: string;
};

type DashboardAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'success' | 'neutral';
  title: string;
  detail: string;
  href: string;
};

function toneColor(theme: Theme, tone: MetricTone): string {
  switch (tone) {
    case 'warning':
      return theme.palette.warning.main;
    case 'danger':
      return theme.palette.error.main;
    case 'neutral':
      return theme.palette.text.secondary;
    case 'safe':
    default:
      return theme.palette.success.main;
  }
}

function TabPanel({ value, index, children }: { value: string; index: string; children: ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 1.5 }}>{children}</Box>;
}

function MetricTile({ metric }: { metric: Metric }) {
  const theme = useTheme();
  const tone = metric.tone ?? 'safe';
  const color = toneColor(theme, tone);
  const isNeutral = tone === 'neutral';

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        height: '100%',
        border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
        bgcolor: isNeutral ? 'background.paper' : alpha(color, 0.05),
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: alpha(isNeutral ? theme.palette.divider : color, 0.5),
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isNeutral ? alpha(theme.palette.divider, 0.35) : alpha(color, 0.12),
            color,
          }}
        >
          {metric.icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.4 }}>
            {metric.label}
          </Typography>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.25} sx={{ mt: 0.25 }}>
            {metric.value}
          </Typography>
          {metric.hint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.3 }}>
              {metric.hint}
            </Typography>
          )}
          {metric.progress != null && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, metric.progress))}
                sx={{
                  height: 5,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.divider, 0.5),
                  '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
                }}
              />
              {metric.progressLabel && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.35, display: 'block' }}>
                  {metric.progressLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function DepartmentPanel({
  title,
  subtitle,
  tabs,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  tabs: { key: string; label: string; metrics: Metric[] }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const active = tabs.find((t) => t.key === value) ?? tabs[0];
  const accent = theme.palette.success.main;

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          bgcolor: alpha(theme.palette.divider, 0.12),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={800} color="text.primary">
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <Chip
            label="Live"
            size="small"
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: alpha(accent, 0.1),
              color: accent,
              border: `1px solid ${alpha(accent, 0.25)}`,
            }}
          />
        </Stack>
      </Box>

      <Tabs
        value={value}
        onChange={(_, v) => onChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          px: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
          '& .MuiTab-root': { minHeight: 40, py: 0.75, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' },
          '& .MuiTabs-indicator': { height: 2, bgcolor: accent },
          '& .Mui-selected': { color: accent },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} />
        ))}
      </Tabs>

      <Box sx={{ p: 1.75, flex: 1 }}>
        {tabs.map((tab) => (
          <TabPanel key={tab.key} value={value} index={tab.key}>
            <Grid container spacing={1.25}>
              {tab.metrics.map((metric) => (
                <Grid key={metric.label} size={{ xs: 12, sm: 6 }}>
                  <MetricTile metric={metric} />
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        ))}
        {!active?.metrics.length && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No data in this view yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const theme = useTheme();
  const severityStyles = {
    critical: { color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.08) },
    warning: { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1) },
    neutral: {
      color: theme.palette.text.secondary,
      bg: alpha(theme.palette.divider, 0.25),
    },
    success: { color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.1) },
  };

  const icons = {
    critical: <ErrorOutlineOutlined fontSize="small" />,
    warning: <WarningAmberOutlined fontSize="small" />,
    neutral: <GppGoodOutlined fontSize="small" />,
    success: <CheckCircleOutlined fontSize="small" />,
  };

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          bgcolor: alpha(theme.palette.divider, 0.12),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={800} color="text.primary">
          Attention needed
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Stock, receivables, and finance flags across modules
        </Typography>
      </Box>

      <Stack spacing={1} sx={{ p: 1.75, flex: 1 }}>
        {alerts.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 5, flex: 1 }} spacing={1}>
            <CheckCircleOutlined sx={{ fontSize: 40, color: 'success.main', opacity: 0.85 }} />
            <Typography variant="body2" fontWeight={600}>
              All clear
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              No overdue invoices, stock emergencies, or pending approvals right now.
            </Typography>
          </Stack>
        ) : (
          alerts.map((alert) => {
            const style = severityStyles[alert.severity];
            return (
              <Box
                key={alert.id}
                component={Link}
                href={alert.href}
                sx={{
                  display: 'block',
                  textDecoration: 'none',
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(style.color, 0.25)}`,
                  bgcolor: style.bg,
                  color: 'text.primary',
                  transition: 'transform 0.2s ease',
                  '&:hover': { transform: 'translateX(4px)' },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ color: style.color, mt: 0.25 }}>{icons[alert.severity]}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {alert.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {alert.detail}
                    </Typography>
                  </Box>
                  <ArrowForwardOutlined sx={{ fontSize: 16, color: style.color, mt: 0.25 }} />
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
}

function buildAlerts(input: {
  finance: any;
  financeSummary: any;
  inventory: any;
  overview: any;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const lowStock = Number(input.inventory?.inventory?.lowStock ?? input.overview?.inventoryLowStock ?? 0);
  const outOfStock = Number(input.inventory?.inventory?.outOfStock ?? input.overview?.inventoryOutOfStock ?? 0);
  const overdue = Number(
    input.financeSummary?.overdueInvoices ?? input.finance?.revenue?.overdueInvoices ?? 0
  );
  const pendingExpenses = Number(
    input.financeSummary?.pendingExpenses ?? input.finance?.revenue?.pendingExpenses ?? 0
  );
  const ar = Number(input.financeSummary?.accountsReceivable ?? 0);
  const pendingPayments = Number(input.finance?.expenses?.pendingPayments ?? 0);

  if (outOfStock > 0) {
    alerts.push({
      id: 'out-of-stock',
      severity: 'critical',
      title: `${outOfStock} SKU${outOfStock === 1 ? '' : 's'} out of stock`,
      detail: 'Reorder or adjust inventory before you lose sales.',
      href: '/inventory',
    });
  }
  if (lowStock > 0) {
    alerts.push({
      id: 'low-stock',
      severity: 'warning',
      title: `${lowStock} item${lowStock === 1 ? '' : 's'} below reorder level`,
      detail: 'Review stock movements and supplier lead times.',
      href: '/inventory',
    });
  }
  if (overdue > 0) {
    alerts.push({
      id: 'overdue-invoices',
      severity: 'critical',
      title: `${overdue} overdue invoice${overdue === 1 ? '' : 's'}`,
      detail: 'Follow up on receivables to improve cash flow.',
      href: '/finance',
    });
  }
  if (pendingExpenses > 0) {
    alerts.push({
      id: 'pending-expenses',
      severity: 'warning',
      title: `${pendingExpenses} expense${pendingExpenses === 1 ? '' : 's'} awaiting approval`,
      detail: 'Clear the queue in Finance → Expenses.',
      href: '/finance',
    });
  }
  if (ar > 0) {
    alerts.push({
      id: 'accounts-receivable',
      severity: 'neutral',
      title: `${formatCurrency(ar)} in open receivables`,
      detail: 'Outstanding invoices not yet collected.',
      href: '/finance',
    });
  }
  if (pendingPayments > 0) {
    alerts.push({
      id: 'pending-payments',
      severity: 'neutral',
      title: `${formatCurrency(pendingPayments)} pending collection`,
      detail: 'Sent or overdue invoices still unpaid.',
      href: '/finance',
    });
  }

  const revenueToday = parseFloat(input.inventory?.pos?.revenueToday ?? '0');
  if (revenueToday > 0) {
    alerts.push({
      id: 'pos-today',
      severity: 'success',
      title: `${formatCurrency(revenueToday)} POS sales today`,
      detail: 'Register activity is flowing into finance totals.',
      href: '/pos',
    });
  }

  return alerts;
}

export default function AnalyticsTopRef() {
  const [financeTab, setFinanceTab] = useState('revenue');
  const [inventoryTab, setInventoryTab] = useState('inventory');
  const [hrTab, setHrTab] = useState('employees');
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<any>(null);
  const [hrData, setHrData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [financeRes, hrRes, invRes, summaryRes, overviewRes] = await Promise.allSettled([
          getFinanceAnalytics(),
          getHRAnalytics(),
          getInventoryAndPOSAnalytics(),
          getFinancialSummary(),
          getOverviewAnalytics(),
        ]);
        if (financeRes.status === 'fulfilled' && financeRes.value.success) {
          setFinanceData(financeRes.value.data);
        }
        if (hrRes.status === 'fulfilled' && hrRes.value.success) setHrData(hrRes.value.data);
        if (invRes.status === 'fulfilled' && invRes.value.success) setInventoryData(invRes.value.data);
        if (summaryRes.status === 'fulfilled' && summaryRes.value.success) {
          setFinanceSummary(summaryRes.value.data);
        }
        if (overviewRes.status === 'fulfilled' && overviewRes.value.success) {
          setOverview(overviewRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const financeTabs = useMemo((): { key: string; label: string; metrics: Metric[] }[] => {
    if (!financeData && !overview) return [];
    const rev = financeData?.revenue;
    const exp = financeData?.expenses;
    const posFromOverview = Number(overview?.posRevenue ?? 0);
    const totalRevenue = rev ? parseFloat(rev.totalRevenue) : Number(overview?.revenue ?? 0) + posFromOverview;
    const posRevenue = rev ? parseFloat(rev.posRevenue ?? '0') : posFromOverview;
    const invoiceRevenue = rev ? parseFloat(rev.invoiceRevenue ?? '0') : Number(overview?.revenue ?? 0);
    const profit = rev ? parseFloat(rev.profit) : totalRevenue - Number(overview?.expenses ?? 0);

    return [
      {
        key: 'revenue',
        label: 'Revenue',
        metrics: [
          {
            label: 'Total revenue',
            value: formatCurrency(totalRevenue),
            hint:
              posRevenue > 0
                ? `${formatCurrency(invoiceRevenue)} invoices · ${formatCurrency(posRevenue)} POS`
                : 'Paid invoices + completed POS',
            icon: <AttachMoneyOutlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'Net position',
            value: formatUsd(profit),
            hint: 'Revenue minus approved expenses',
            icon: <TrendingUpOutlined fontSize="small" />,
            tone: (profit >= 0 ? 'safe' : 'danger') as MetricTone,
          },
        ],
      },
      {
        key: 'expenses',
        label: 'Payables',
        metrics: [
          {
            label: 'Approved expenses',
            value: formatCurrency(parseFloat(exp?.expenses ?? String(overview?.expenses ?? 0))),
            hint: 'Recorded cost this period',
            icon: <ReceiptOutlined fontSize="small" />,
            tone: 'neutral',
          },
          {
            label: 'Open receivables',
            value: formatCurrency(parseFloat(exp?.pendingPayments ?? '0')),
            hint: 'Sent / overdue invoice balance',
            icon: <ReceiptLongOutlined fontSize="small" />,
            tone: 'warning',
          },
          {
            label: 'Invoices paid',
            value: exp?.invoicesPaid ?? '0',
            hint: 'Settled billing documents',
            icon: <CheckCircleOutlined fontSize="small" />,
            tone: 'safe',
          },
        ],
      },
      {
        key: 'cashflow',
        label: 'Cashflow',
        metrics: [
          {
            label: 'Accounts receivable',
            value: formatCurrency(financeSummary?.accountsReceivable ?? 0),
            hint: 'Unpaid customer invoices',
            icon: <AccountBalanceWalletOutlined fontSize="small" />,
            tone: 'neutral',
          },
          {
            label: 'Accounts payable',
            value: formatCurrency(financeSummary?.accountsPayable ?? 0),
            hint: 'Outgoing payments pending',
            icon: <PaymentOutlined fontSize="small" />,
            tone: 'warning',
          },
        ],
      },
    ];
  }, [financeData, financeSummary, overview]);

  const inventoryTabs = useMemo((): { key: string; label: string; metrics: Metric[] }[] => {
    if (!inventoryData) return [];
    const inv = inventoryData.inventory;
    const pos = inventoryData.pos;
    const totalItems = parseInt(inv.totalItems, 10) || 0;
    const lowStock = parseInt(inv.lowStock, 10) || 0;

    return [
      {
        key: 'inventory',
        label: 'Stock',
        metrics: [
          {
            label: 'Catalog size',
            value: inv.totalItems,
            hint: `${inv.inStock} SKUs in stock`,
            icon: <Inventory2Outlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'Low stock',
            value: inv.lowStock,
            hint: 'At or below reorder level',
            icon: <WarningAmberOutlined fontSize="small" />,
            tone: (lowStock > 0 ? 'warning' : 'safe') as MetricTone,
            progress: totalItems ? Math.round((lowStock / totalItems) * 100) : 0,
            progressLabel: totalItems ? `${Math.round((lowStock / totalItems) * 100)}% of catalog` : undefined,
          },
          {
            label: 'Out of stock',
            value: inv.outOfStock,
            hint: 'Needs immediate replenishment',
            icon: <TrendingDownOutlined fontSize="small" />,
            tone: (parseInt(inv.outOfStock, 10) > 0 ? 'danger' : 'safe') as MetricTone,
          },
        ],
      },
      {
        key: 'pos',
        label: 'POS',
        metrics: [
          {
            label: 'Sales today',
            value: formatCurrency(parseFloat(pos.revenueToday)),
            hint: `${pos.ordersToday} completed order${pos.ordersToday === '1' ? '' : 's'}`,
            icon: <PointOfSaleOutlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'Month to date',
            value: formatCurrency(parseFloat(pos.revenueThisMonth)),
            hint: `${pos.ordersThisMonth} orders this month`,
            icon: <TrendingUpOutlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'Lifetime POS',
            value: formatCurrency(parseFloat(pos.revenue)),
            hint: `${pos.totalOrders} completed sales total`,
            icon: <AttachMoneyOutlined fontSize="small" />,
            tone: 'neutral',
          },
        ],
      },
    ];
  }, [inventoryData]);

  const hrTabs = useMemo((): { key: string; label: string; metrics: Metric[] }[] => {
    if (!hrData) return [];
    const emp = hrData.employees;
    const act = hrData.activities;
    return [
      {
        key: 'employees',
        label: 'Team',
        metrics: [
          {
            label: 'Active members',
            value: emp.employees,
            hint: 'Users in your organisation',
            icon: <PeopleOutlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'New hires (30d)',
            value: emp.newHires,
            hint: 'Recently added accounts',
            icon: <PersonAddOutlined fontSize="small" />,
            tone: 'neutral',
          },
          {
            label: 'Open roles',
            value: emp.openPositions,
            hint: 'Positions to fill',
            icon: <WorkOutlineOutlined fontSize="small" />,
            tone: 'neutral',
          },
        ],
      },
      {
        key: 'activities',
        label: 'Activity',
        metrics: [
          {
            label: 'Interviews',
            value: act.interviewsScheduled,
            hint: 'Interview-related tasks',
            icon: <EventOutlined fontSize="small" />,
            tone: 'neutral',
          },
          {
            label: 'Leave approved',
            value: act.leavesApproved,
            hint: 'Approved time-off records',
            icon: <CheckCircleOutlined fontSize="small" />,
            tone: 'safe',
          },
          {
            label: 'Training',
            value: act.trainingSessions,
            hint: 'Training tasks on file',
            icon: <SchoolOutlined fontSize="small" />,
            tone: 'neutral',
          },
        ],
      },
    ];
  }, [hrData]);

  const alerts = useMemo(
    () => buildAlerts({ finance: financeData, financeSummary, inventory: inventoryData, overview }),
    [financeData, financeSummary, inventoryData, overview]
  );

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, md: 6, xl: 3 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
                minHeight: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={32} />
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  }

  const hasAnyPanel = financeTabs.length || inventoryTabs.length || hrTabs.length;

  if (!hasAnyPanel) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Module analytics will appear once your organisation has activity.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {financeTabs.length > 0 && (
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <DepartmentPanel
            title="Finance"
            subtitle="Revenue, payables & cashflow"
            tabs={financeTabs}
            value={financeTab}
            onChange={setFinanceTab}
          />
        </Grid>
      )}
      {inventoryTabs.length > 0 && (
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <DepartmentPanel
            title="Inventory & POS"
            subtitle="Stock health & register sales"
            tabs={inventoryTabs}
            value={inventoryTab}
            onChange={setInventoryTab}
          />
        </Grid>
      )}
      {hrTabs.length > 0 && (
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <DepartmentPanel
            title="Human Resources"
            subtitle="Team roster & HR activity"
            tabs={hrTabs}
            value={hrTab}
            onChange={setHrTab}
          />
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 6, xl: 3 }}>
        <AlertsPanel alerts={alerts} />
      </Grid>
    </Grid>
  );
}
