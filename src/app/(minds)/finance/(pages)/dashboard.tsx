"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  CircularProgress,
  alpha,
  styled,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Payment,
  AttachMoney,
  CreditCard,
  Assessment,
  ArrowForward,
  Warning,
  CheckCircle,
  Info,
  CalendarToday,
  Refresh,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import {
  getFinancialSummary,
  getFinanceMonthlyTrends,
  getInvoicesByOrg,
  getExpensesByOrg,
} from "@/lib/desktop/finance-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import { FlatCard, statIconSx, statToneColor, type StatTone } from "@/components/FlatCard";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [previousSummary, setPreviousSummary] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [quickFilter, setQuickFilter] = useState<string>('month');

  const getDateRange = (filter: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (filter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setDate(now.getDate() + (6 - dayOfWeek));
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        return { start: dateRange.start, end: dateRange.end };
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start, end };
  };

  const loadData = async (showRefresh = false) => {
    if (!user?.publicMetadata?.companyId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const orgId = user.publicMetadata.companyId as string;
      const { start, end } = getDateRange(quickFilter);

      let prevStart: Date | undefined;
      let prevEnd: Date | undefined;
      if (start && end) {
        const duration = end.getTime() - start.getTime();
        prevEnd = new Date(start.getTime() - 1);
        prevStart = new Date(prevEnd.getTime() - duration);
      }

      const [summaryRes, prevSummaryRes, invoicesRes, expensesRes, trendsRes] = await Promise.all([
        getFinancialSummary(orgId, start || undefined, end || undefined),
        prevStart && prevEnd
          ? getFinancialSummary(orgId, prevStart, prevEnd)
          : Promise.resolve({ success: true, data: null }),
        getInvoicesByOrg(orgId, start || undefined, end || undefined),
        getExpensesByOrg(orgId, start || undefined, end || undefined),
        getFinanceMonthlyTrends(orgId, 6),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (prevSummaryRes.success) setPreviousSummary(prevSummaryRes.data);
      if (invoicesRes.success) setInvoices(invoicesRes.data || []);
      if (expensesRes.success) setExpenses(expensesRes.data || []);
      if (trendsRes.success) setMonthlyTrends(trendsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, quickFilter, dateRange.start, dateRange.end]);

  const handleQuickFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: string | null) => {
    if (newFilter !== null) {
      setQuickFilter(newFilter);
      if (newFilter !== 'custom') {
        setDateRange({ start: null, end: null });
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (dateRange.start && dateRange.end) {
      setQuickFilter('custom');
      setDateRangeDialogOpen(false);
    }
  };

  const formatDateRange = () => {
    const { start, end } = getDateRange(quickFilter);
    if (!start || !end) return 'Select date range';
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Calculate financial health score
  const financialHealth = useMemo(() => {
    if (!summary) return { score: 0, status: 'unknown', color: 'default' };
    
    let score = 100;
    const revenue = summary.totalRevenue || 0;
    const expenses = summary.totalExpenses || 0;
    const ar = summary.accountsReceivable || 0;
    const overdue = summary.overdueInvoices || 0;
    
    // Profitability (40 points)
    if (revenue > 0) {
      const profitMargin = ((revenue - expenses) / revenue) * 100;
      score += Math.max(0, profitMargin * 0.4);
    }
    
    // Cash flow (30 points)
    if (revenue > expenses) score += 30;
    else score -= 20;
    
    // AR management (20 points)
    if (ar > 0 && overdue > 0) {
      const overdueRatio = (overdue / ar) * 100;
      score -= overdueRatio * 0.2;
    }
    
    // Expense control (10 points)
    if (expenses < revenue * 0.7) score += 10;
    
    score = Math.max(0, Math.min(100, score));
    
    let status = 'excellent';
    let color = 'success';
    if (score < 40) {
      status = 'critical';
      color = 'error';
    } else if (score < 60) {
      status = 'needs attention';
      color = 'warning';
    } else if (score < 80) {
      status = 'good';
      color = 'success';
    }
    
    return { score: Math.round(score), status, color };
  }, [summary]);

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? "No change" : "+100%";
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };

  const revenueExpenseData = monthlyTrends;

  const categoryExpenseData = useMemo(() => {
    const categories = expenses.reduce((acc: any, exp: any) => {
      const cat = exp.category || 'Other';
      acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
      return acc;
    }, {});
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);
  }, [expenses]);

  const invoiceStatusData = useMemo(() => {
    const statuses = invoices.reduce((acc: any, inv: any) => {
      const status = inv.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

  const posRevenue = summary?.posRevenue || 0;
  const revenue = summary?.totalRevenue || 0;
  const prevRevenue = previousSummary?.totalRevenue || 0;
  const totalExp = summary?.totalExpenses || 0;
  const prevExp = previousSummary?.totalExpenses || 0;
  const net = summary?.netIncome || 0;
  const prevNet = previousSummary?.netIncome || 0;

  const stats: {
    title: string;
    value: string;
    icon: React.ReactNode;
    tone: StatTone;
    change: string;
  }[] = [
    {
      title: 'Total Revenue',
      value: formatCurrency(revenue),
      icon: <TrendingUp sx={{ fontSize: 22 }} />,
      tone: revenue > 0 ? 'safe' : 'neutral',
      change:
        posRevenue > 0
          ? `${formatCurrency(posRevenue)} from POS · ${pctChange(revenue, prevRevenue)} vs prior period`
          : `${pctChange(revenue, prevRevenue)} vs prior period`,
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExp),
      icon: <TrendingDown sx={{ fontSize: 22 }} />,
      tone: 'neutral',
      change: `${pctChange(totalExp, prevExp)} vs prior period`,
    },
    {
      title: 'Net Income',
      value: formatUsd(net),
      icon: <AccountBalance sx={{ fontSize: 22 }} />,
      tone: net >= 0 ? 'safe' : 'danger',
      change: `${pctChange(net, prevNet)} vs prior period`,
    },
    {
      title: 'Accounts Receivable',
      value: formatCurrency(summary?.accountsReceivable || 0),
      icon: <Receipt sx={{ fontSize: 22 }} />,
      tone: (summary?.overdueInvoices ?? 0) > 0 ? 'warning' : 'neutral',
      change: `${summary?.overdueInvoices || 0} overdue`,
    },
  ];

  const recentInvoices = invoices.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);
  const pendingExpenses = expenses.filter((e: any) => e.status === 'pending').length;
  const profitMargin = summary?.totalRevenue 
    ? ((summary.netIncome / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Loading financial data...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Financial Overview
            </Typography>
            {quickFilter === 'custom' && dateRange.start && dateRange.end && (
              <Chip
                label="Custom Range"
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatDateRange()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={quickFilter}
            exclusive
            onChange={handleQuickFilterChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="week">This Week</ToggleButton>
            <ToggleButton value="month">This Month</ToggleButton>
            <ToggleButton value="year">This Year</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => loadData(true)} disabled={refreshing}>
              <Refresh sx={{ rotate: refreshing ? '360deg' : '0deg', transition: 'rotate 0.5s' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<CalendarToday />}
            onClick={() => setDateRangeDialogOpen(true)}
            sx={{ borderRadius: 3 }}
          >
            Custom Range
          </Button>
        </Stack>
      </Stack>

      {/* Date Range Dialog */}
      <Dialog open={dateRangeDialogOpen} onClose={() => setDateRangeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setDateRange({ ...dateRange, start: date });
              }}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                if (date) {
                  date.setHours(23, 59, 59, 999);
                }
                setDateRange({ ...dateRange, end: date });
              }}
              inputProps={{
                min: dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined,
              }}
            />
            {dateRange.start && dateRange.end && dateRange.start > dateRange.end && (
              <Typography variant="body2" color="error">
                End date must be after start date
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyCustomRange}
            disabled={!dateRange.start || !dateRange.end || dateRange.start > dateRange.end}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>

      {/* Financial Health Indicator */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <FlatCard>
            <CardContent sx={{ py: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Financial Health Score
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="h4" fontWeight={800} color={`${financialHealth.color}.main`}>
                      {financialHealth.score}
                    </Typography>
                    <Chip
                      label={financialHealth.status.toUpperCase()}
                      size="small"
                      variant="outlined"
                      color={financialHealth.color as 'success' | 'warning' | 'error' | 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 200 } }}>
                  <LinearProgress
                    variant="determinate"
                    value={financialHealth.score}
                    color={financialHealth.color as 'success' | 'warning' | 'error'}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: (t) => alpha(t.palette.divider, 0.6),
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Main Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <FlatCard>
              <CardContent sx={{ py: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.3 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color={statToneColor(stat.tone)} sx={{ mt: 0.5, mb: 0.75 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                      {stat.change}
                    </Typography>
                  </Box>
                  <Box sx={statIconSx(stat.tone)}>
                    {stat.icon}
                  </Box>
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Revenue vs Expenses Trend
                </Typography>
                <Chip label="Last 6 Months" size="small" />
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueExpenseData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.1)} />
                  <XAxis dataKey="month" stroke={alpha('#000', 0.5)} />
                  <YAxis stroke={alpha('#000', 0.5)} />
                  <RechartsTooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4caf50"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f44336"
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Expense by Category
              </Typography>
              {categoryExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryExpenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryExpenseData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No expense data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Key Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha('#2196f3', 0.1),
                    color: 'info.main',
                  }}
                >
                  <AccountBalance sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Accounts Payable
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {formatCurrency(summary?.accountsPayable || 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha('#4caf50', 0.1),
                    color: 'success.main',
                  }}
                >
                  <Assessment sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Profit Margin
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {profitMargin}%
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha('#ff9800', 0.1),
                    color: 'warning.main',
                  }}
                >
                  <Warning sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Expenses
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {pendingExpenses}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha('#f44336', 0.1),
                    color: 'error.main',
                  }}
                >
                  <Receipt sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Invoices
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    {summary?.overdueInvoices || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Receipt color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Recent Invoices
                  </Typography>
                </Stack>
                <Button size="small" endIcon={<ArrowForward />}>
                  View All
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice: any) => (
                    <Box
                      key={invoice.invoiceId || invoice._id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha('#000', 0.08)}`,
                        bgcolor: alpha('#000', 0.02),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#000', 0.04),
                          borderColor: 'primary.main',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={700}>
                              Invoice #{invoice.invoiceId?.toString().slice(-8) || invoice._id?.toString().slice(-8) || 'N/A'}
                            </Typography>
                            <Chip
                              label={invoice.status?.toUpperCase() || 'DRAFT'}
                              size="small"
                              color={
                                invoice.status === 'paid' ? 'success' :
                                invoice.status === 'overdue' ? 'error' :
                                invoice.status === 'sent' ? 'info' : 'default'
                              }
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(invoice.createdAt || invoice.dueDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          {formatCurrency(invoice.total || 0)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Info sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No recent invoices
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Payment color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Recent Expenses
                  </Typography>
                </Stack>
                <Button size="small" endIcon={<ArrowForward />}>
                  View All
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((expense: any) => (
                    <Box
                      key={expense._id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha('#000', 0.08)}`,
                        bgcolor: alpha('#000', 0.02),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha('#000', 0.04),
                          borderColor: 'error.main',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {expense.description || 'Expense'}
                            </Typography>
                            <Chip
                              label={expense.category}
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                            <Chip
                              label={expense.status?.toUpperCase() || 'PENDING'}
                              size="small"
                              color={
                                expense.status === 'approved' ? 'success' :
                                expense.status === 'rejected' ? 'error' : 'warning'
                              }
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(expense.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          {formatCurrency(expense.amount || 0)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Info sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No recent expenses
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

    </Box>
  );
}
