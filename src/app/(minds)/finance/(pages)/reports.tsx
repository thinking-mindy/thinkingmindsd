"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Grid,
  alpha,
  styled,
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Assessment,
  TrendingUp,
  Receipt,
  Payment,
  Download,
  PictureAsPdf,
  FileDownload,
  FilterList,
  Refresh,
  DateRange,
  BarChart,
  PieChart,
  ShowChart,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getFinancialSummary, getInvoicesByOrg, getExpensesByOrg } from "@/lib/desktop/finance-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import CashierReports from "./cashier-reports";
import { FlatCard, statIconSx } from "@/components/FlatCard";

const StatRow = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: 12,
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
}));

export default function ReportsTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportType, setReportType] = useState<string>('summary');

  const getReportDateRange = () => {
    const now = new Date();
    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (dateRange === 'month') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    if (dateRange === 'quarter') {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0, 23, 59, 59, 999);
      return { start: qStart, end: qEnd };
    }
    if (dateRange === 'year') {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    }
    return { start: undefined, end: undefined };
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.publicMetadata?.companyId) return;
      setLoading(true);
      try {
        const orgId = user.publicMetadata.companyId as string;
        const { start, end } = getReportDateRange();
        const [summaryRes, invoicesRes, expensesRes] = await Promise.all([
          getFinancialSummary(orgId, start, end),
          getInvoicesByOrg(orgId, start, end),
          getExpensesByOrg(orgId, start, end),
        ]);

        if (summaryRes.success) setSummary(summaryRes.data);
        if (invoicesRes.success) setInvoices(invoicesRes.data || []);
        if (expensesRes.success) setExpenses(expensesRes.data || []);
      } catch (error) {
        console.error('Error loading reports data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange, startDate, endDate]);

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  // Filter data based on date range
  const filteredData = useMemo(() => {
    let filteredInvoices = [...invoices];
    let filteredExpenses = [...expenses];

    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.date);
        return invDate >= start && invDate <= end;
      });
      filteredExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date);
        return expDate >= start && expDate <= end;
      });
    } else if (dateRange === 'month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.date);
        return invDate >= start;
      });
      filteredExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date);
        return expDate >= start;
      });
    } else if (dateRange === 'quarter') {
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.date);
        return invDate >= quarterStart;
      });
      filteredExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date);
        return expDate >= quarterStart;
      });
    } else if (dateRange === 'year') {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      filteredInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.date);
        return invDate >= start;
      });
      filteredExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date);
        return expDate >= start;
      });
    }

    return { filteredInvoices, filteredExpenses };
  }, [invoices, expenses, dateRange, startDate, endDate]);

  const metrics = useMemo(() => {
    const { filteredInvoices, filteredExpenses } = filteredData;

    const paidInvoices = filteredInvoices.filter((inv: any) => inv.status === 'paid');
    const pendingInvoices = filteredInvoices.filter((inv: any) => inv.status === 'sent' || inv.status === 'overdue');
    const overdueInvoices = filteredInvoices.filter((inv: any) => inv.status === 'overdue');
    const approvedExpenses = filteredExpenses.filter((exp: any) => exp.status === 'approved');

    const totalRevenue = Number(summary?.totalRevenue ?? 0);
    const totalExpenses = Number(summary?.totalExpenses ?? 0);
    const accountsReceivable = Number(summary?.accountsReceivable ?? 0);
    const netIncome = Number(summary?.netIncome ?? totalRevenue - totalExpenses);
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const posRevenue = Number(summary?.posRevenue ?? 0);
    const invoiceRevenue = Number(summary?.invoiceRevenue ?? 0);

    return {
      totalRevenue,
      totalExpenses,
      accountsReceivable,
      netIncome,
      profitMargin,
      posRevenue,
      invoiceRevenue,
      paidInvoices: paidInvoices.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices: overdueInvoices.length,
      approvedExpenses: approvedExpenses.length,
      totalInvoices: filteredInvoices.length,
      totalExpenseItems: filteredExpenses.length,
    };
  }, [filteredData, summary]);

  // Export functions
  const exportToCSV = () => {
    const { filteredInvoices, filteredExpenses } = filteredData;
    const csvRows: string[] = [];
    
    // Summary
    csvRows.push('Financial Report Summary');
    csvRows.push(`Date Range: ${dateRange}`);
    csvRows.push('');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Revenue,${metrics.totalRevenue}`);
    csvRows.push(`Total Expenses,${metrics.totalExpenses}`);
    csvRows.push(`Net Income,${metrics.netIncome}`);
    csvRows.push(`Profit Margin,${metrics.profitMargin.toFixed(2)}%`);
    csvRows.push('');
    
    // Invoices
    csvRows.push('Invoices');
    csvRows.push('ID,Date,Amount,Status,Customer');
    filteredInvoices.forEach((inv: any) => {
      csvRows.push(`${inv._id || inv.id},${formatDate(inv.createdAt || inv.date)},${inv.amount || inv.total},${inv.status},${inv.customer || 'N/A'}`);
    });
    csvRows.push('');
    
    // Expenses
    csvRows.push('Expenses');
    csvRows.push('ID,Date,Amount,Status,Category');
    filteredExpenses.forEach((exp: any) => {
      csvRows.push(`${exp._id || exp.id},${formatDate(exp.createdAt || exp.date)},${exp.amount || exp.total},${exp.status},${exp.category || 'N/A'}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // This would typically use a library like jsPDF or react-pdf
    // For now, we'll create a printable version
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body2" color="text.secondary">
            Loading financial reports...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
    <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
        Financial Reports
      </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive financial analysis and insights
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Tooltip title="Export to CSV">
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={exportToCSV}
              sx={{ borderRadius: 2 }}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Export to PDF">
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              sx={{ borderRadius: 2 }}
            >
              PDF
            </Button>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => window.location.reload()} sx={{ borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Filters Section */}
      <Card sx={{ mb: 4, borderRadius: 3, border: `1px solid ${alpha('#000', 0.1)}` }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
                startAdornment={<DateRange sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
            {dateRange === 'custom' && (
              <>
                <TextField
                  size="small"
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
              </>
            )}
            <FormControl size="small" sx={{ minWidth: 150, ml: 'auto' }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="summary">Summary</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="comparative">Comparative</MenuItem>
                <MenuItem value="cashier">Cashier transactions</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {reportType === "cashier" ? (
        <CashierReports dateRange={dateRange} startDate={startDate} endDate={endDate} />
      ) : (
        <>
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('safe')}>
                  <TrendingUp sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Revenue
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                {formatCurrency(metrics.totalRevenue)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  {metrics.paidInvoices} paid invoices
                </Typography>
                {metrics.posRevenue > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    · Cashier/POS {formatCurrency(metrics.posRevenue)}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('danger')}>
                  <Payment sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Expenses
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mb: 1 }}>
                {formatCurrency(metrics.totalExpenses)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {metrics.approvedExpenses} approved
                  </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('warning')}>
                  <Receipt sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Accounts Receivable
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mb: 1 }}>
                {formatCurrency(metrics.accountsReceivable)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {metrics.pendingInvoices} pending
                  </Typography>
                {metrics.overdueInvoices > 0 && (
                  <Chip label={`${metrics.overdueInvoices} overdue`} size="small" color="error" />
                )}
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx(metrics.netIncome >= 0 ? 'safe' : 'danger')}>
                  <Assessment sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Net Income
                  </Typography>
              <Typography
                variant="h4"
                fontWeight={800}
                color={metrics.netIncome >= 0 ? 'success.main' : 'error.main'}
                sx={{ mb: 1 }}
              >
                {formatUsd(metrics.netIncome)}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {metrics.profitMargin.toFixed(2)}% margin
                </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Detailed Analysis Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <FlatCard>
            <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                Financial Overview
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip icon={<BarChart />} label="Revenue" size="small" color="success" variant="outlined" />
                <Chip icon={<BarChart />} label="Expenses" size="small" color="error" variant="outlined" />
              </Stack>
            </Stack>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center', height: 200 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.max((metrics.totalRevenue / (metrics.totalRevenue + metrics.totalExpenses || 1)) * 100, 10)}%`,
                      bgcolor: 'success.main',
                      borderRadius: '8px 8px 0 0',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                      {formatCurrency(metrics.totalRevenue)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Revenue
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.max((metrics.totalExpenses / (metrics.totalRevenue + metrics.totalExpenses || 1)) * 100, 10)}%`,
                      bgcolor: 'error.main',
                      borderRadius: '8px 8px 0 0',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                      {formatCurrency(metrics.totalExpenses)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Expenses
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.max((Math.abs(metrics.netIncome) / (metrics.totalRevenue + metrics.totalExpenses || 1)) * 100, 10)}%`,
                      bgcolor: metrics.netIncome >= 0 ? 'success.main' : 'warning.main',
                      borderRadius: '8px 8px 0 0',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                      {formatUsd(metrics.netIncome)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Net Income
                  </Typography>
                </Box>
              </Box>
            </Box>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Profitability Analysis
            </Typography>
            <Stack spacing={3}>
              <StatRow>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Profit Margin
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color={metrics.profitMargin >= 0 ? 'success.main' : 'error.main'}>
                    {metrics.profitMargin.toFixed(2)}%
                  </Typography>
                </Stack>
                <Box sx={{ mt: 2, height: 8, borderRadius: 4, background: alpha('#000', 0.1), overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.min(Math.abs(metrics.profitMargin), 100)}%`,
                      bgcolor: metrics.profitMargin >= 0 ? 'success.main' : 'error.main',
                      borderRadius: 4,
                    }}
                  />
                </Box>
              </StatRow>
              <StatRow>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Revenue Ratio
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {metrics.totalRevenue + metrics.totalExpenses > 0
                      ? ((metrics.totalRevenue / (metrics.totalRevenue + metrics.totalExpenses)) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Stack>
              </StatRow>
              <StatRow>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Expense Ratio
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {metrics.totalRevenue + metrics.totalExpenses > 0
                      ? ((metrics.totalExpenses / (metrics.totalRevenue + metrics.totalExpenses)) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Stack>
              </StatRow>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Detailed Tables */}
      {reportType !== 'summary' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FlatCard>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Recent Invoices
                </Typography>
                <Chip label={`${filteredData.filteredInvoices.length} total`} size="small" />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.filteredInvoices.slice(0, 5).map((inv: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>{formatDate(inv.createdAt || inv.date)}</TableCell>
                        <TableCell>{formatCurrency(inv.amount || inv.total || 0)}</TableCell>
                        <TableCell>
                          <Chip
                            label={inv.status}
                            size="small"
                            color={
                              inv.status === 'paid' ? 'success' :
                              inv.status === 'sent' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredData.filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No invoices found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </FlatCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FlatCard>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Recent Expenses
                </Typography>
                <Chip label={`${filteredData.filteredExpenses.length} total`} size="small" />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.filteredExpenses.slice(0, 5).map((exp: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>{formatDate(exp.createdAt || exp.date)}</TableCell>
                        <TableCell>{formatCurrency(exp.amount || exp.total || 0)}</TableCell>
                        <TableCell>
                          <Chip
                            label={exp.status}
                            size="small"
                            color={
                              exp.status === 'approved' ? 'success' :
                              exp.status === 'pending' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredData.filteredExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No expenses found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </FlatCard>
          </Grid>
        </Grid>
      )}
        </>
      )}
    </Box>
  );
}

