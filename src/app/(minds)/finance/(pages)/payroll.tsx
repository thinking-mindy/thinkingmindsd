"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
  styled,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Avatar,
  Paper,
} from "@mui/material";
import {
  Add,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Pending,
  Error,
  Refresh,
  Download,
  Search,
  FilterList,
  Receipt,
  Schedule,
  Assessment,
  AccountBalanceWallet,
  LocalAtm,
  AccountBox,
  Edit,
  Delete,
  People,
  AttachMoney,
  Calculate,
  Description,
  CalendarToday,
  Payment,
} from "@mui/icons-material";
import { FlatCard, statIconSx } from "@/components/FlatCard";
import {
  getPayrollRecordsForCurrentOrg,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  getOrgMembersForHR,
} from "@/lib/desktop/payroll-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import { calculateZwUsdMonthly, payrollRecordNet } from "@/lib/zw-payroll";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { PayrollRecord } from "@/types/database";

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    cursor: 'pointer',
    transform: 'scale(1.01)',
    boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
  },
}));

export default function PayrollTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [formData, setFormData] = useState({
    employeeId: '',
    payPeriod: '',
    gross: '',
    tax: '',
    insurance: '',
    retirement: '',
    other: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        getPayrollRecordsForCurrentOrg(),
        getOrgMembersForHR(),
      ]);

      if (payrollRes.success) {
        setPayrollRecords(payrollRes.data || []);
      }

      if (employeesRes.success) {
        setEmployees(employeesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading payroll data:', error);
      setSnackbar({ open: true, message: 'Failed to load payroll data', severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const zwPreview = useMemo(() => {
    const gross = parseFloat(formData.gross || "0");
    if (!gross) return null;
    return calculateZwUsdMonthly(gross);
  }, [formData.gross]);

  const applyZwToForm = (gross: number) => {
    const zw = calculateZwUsdMonthly(gross);
    setFormData((f) => ({
      ...f,
      gross: String(gross),
      tax: String(zw.paye + zw.aidsLevy),
      insurance: String(zw.nssaEmployee),
      retirement: "",
      other: "",
    }));
  };

  const handleCreate = async () => {
    if (!formData.employeeId || !formData.payPeriod || !formData.gross) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const employeeId = formData.employeeId;
      const gross = parseFloat(formData.gross);
      const zw = calculateZwUsdMonthly(gross);
      const employee = employees.find((e: { id?: string }) => e.id === employeeId);

      const result = await createPayrollRecord({
        employeeId,
        employeeName: employee?.name,
        payPeriod: formData.payPeriod,
        payrollCountry: "ZW",
        currency: "USD",
        gross,
        deductions: {
          tax: zw.paye + zw.aidsLevy,
          insurance: zw.nssaEmployee,
          paye: zw.paye,
          aidsLevy: zw.aidsLevy,
          nssaEmployee: zw.nssaEmployee,
          nssaEmployer: zw.nssaEmployer,
        },
        zwPaye: zw.paye,
        zwAidsLevy: zw.aidsLevy,
        zwNssaEmployee: zw.nssaEmployee,
        zwNssaEmployer: zw.nssaEmployer,
        employerCost: zw.employerCost,
        net: zw.net,
        netPay: zw.net,
      });

      if (result.success) {
        setSnackbar({ open: true, message: 'Payroll record created successfully', severity: 'success' });
        setDialogOpen(false);
        resetForm();
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to create payroll record', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create payroll record', severity: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!selectedRecord || !formData.employeeId || !formData.payPeriod || !formData.gross) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const gross = parseFloat(formData.gross);
      const zw = calculateZwUsdMonthly(gross);

      const result = await updatePayrollRecord(selectedRecord._id, {
        employeeId: formData.employeeId,
        payPeriod: formData.payPeriod,
        payrollCountry: "ZW",
        currency: "USD",
        gross,
        deductions: {
          tax: zw.paye + zw.aidsLevy,
          insurance: zw.nssaEmployee,
          paye: zw.paye,
          aidsLevy: zw.aidsLevy,
          nssaEmployee: zw.nssaEmployee,
          nssaEmployer: zw.nssaEmployer,
        },
        zwPaye: zw.paye,
        zwAidsLevy: zw.aidsLevy,
        zwNssaEmployee: zw.nssaEmployee,
        zwNssaEmployer: zw.nssaEmployer,
        employerCost: zw.employerCost,
        net: zw.net,
        netPay: zw.net,
      });

      if (result.success) {
        setSnackbar({ open: true, message: 'Payroll record updated successfully', severity: 'success' });
        setEditDialogOpen(false);
        resetForm();
        setSelectedRecord(null);
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to update payroll record', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update payroll record', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    try {
      const result = await deletePayrollRecord(selectedRecord._id);
      if (result.success) {
        setSnackbar({ open: true, message: 'Payroll record deleted successfully', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedRecord(null);
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to delete payroll record', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete payroll record', severity: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      payPeriod: '',
      gross: '',
      tax: '',
      insurance: '',
      retirement: '',
      other: '',
    });
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    const gross = parseFloat(record.gross?.toString() || "0");
    const zw = gross > 0 ? calculateZwUsdMonthly(gross) : null;
    setFormData({
      employeeId: record.employeeId?.toString() || "",
      payPeriod: record.payPeriod || "",
      gross: record.gross?.toString() || "",
      tax: String(zw ? zw.paye + zw.aidsLevy : record.deductions?.tax ?? ""),
      insurance: String(zw ? zw.nssaEmployee : record.deductions?.insurance ?? ""),
      retirement: "",
      other: "",
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (record: any) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const getEmployeeName = (employeeId: string | { toString(): string }) => {
    const id = employeeId?.toString();
    const employee = employees.find((emp: { id?: string }) => emp.id === id);
    return employee?.name || employee?.email || 'Unknown Employee';
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalGross = payrollRecords.reduce((sum, record) => sum + (record.gross || 0), 0);
    const totalDeductions = payrollRecords.reduce((sum, record) => {
      const deductions = record.deductions || {};
      return sum + (deductions.tax || 0) + (deductions.insurance || 0) + 
             (deductions.retirement || 0) + (deductions.other || 0);
    }, 0);
    const totalNet = payrollRecords.reduce((sum, record) => sum + payrollRecordNet(record), 0);
    const recordCount = payrollRecords.length;
    const uniqueEmployees = new Set(payrollRecords.map((r: any) => r.employeeId?.toString())).size;

    return {
      totalGross,
      totalDeductions,
      totalNet,
      recordCount,
      uniqueEmployees,
      averageGross: recordCount > 0 ? totalGross / recordCount : 0,
      averageNet: recordCount > 0 ? totalNet / recordCount : 0,
    };
  }, [payrollRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = payrollRecords;

    if (filterPeriod !== 'all') {
      filtered = filtered.filter((record: any) => record.payPeriod === filterPeriod);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((record: any) => {
        const employeeName = getEmployeeName(record.employeeId).toLowerCase();
        return (
          employeeName.includes(query) ||
          record.payPeriod?.toLowerCase().includes(query) ||
          record.gross?.toString().includes(query) ||
          record.net?.toString().includes(query)
        );
      });
    }

    return filtered;
  }, [payrollRecords, filterPeriod, searchQuery, employees]);

  // Chart data
  const payrollByPeriod = useMemo(() => {
    const periodMap: Record<string, { gross: number; net: number; count: number }> = {};
    payrollRecords.forEach((record: any) => {
      const period = record.payPeriod || 'Unknown';
      if (!periodMap[period]) {
        periodMap[period] = { gross: 0, net: 0, count: 0 };
      }
      periodMap[period].gross += record.gross || 0;
      periodMap[period].net += record.net || 0;
      periodMap[period].count += 1;
    });
    return Object.entries(periodMap)
      .map(([period, data]) => ({
        period,
        gross: data.gross,
        net: data.net,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [payrollRecords]);

  const deductionsBreakdown = useMemo(() => {
    const breakdown = {
      tax: 0,
      insurance: 0,
      retirement: 0,
      other: 0,
    };
    payrollRecords.forEach((record: any) => {
      const deductions = record.deductions || {};
      breakdown.tax += deductions.tax || 0;
      breakdown.insurance += deductions.insurance || 0;
      breakdown.retirement += deductions.retirement || 0;
      breakdown.other += deductions.other || 0;
    });
    return [
      { name: 'Tax', value: breakdown.tax },
      { name: 'Insurance', value: breakdown.insurance },
      { name: 'Retirement', value: breakdown.retirement },
      { name: 'Other', value: breakdown.other },
    ].filter(item => item.value > 0);
  }, [payrollRecords]);

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];

  // Get unique pay periods for filter
  const payPeriods = useMemo(() => {
    const periods = new Set(payrollRecords.map((r: any) => r.payPeriod).filter(Boolean));
    return Array.from(periods).sort();
  }, [payrollRecords]);

  // Export to CSV function
  const exportToCSV = () => {
    const csvRows: string[] = [];
    csvRows.push('Payroll Report');
    csvRows.push(`Generated: ${new Date().toLocaleDateString()}`);
    csvRows.push('');
    csvRows.push('Employee,Pay Period,Gross Pay,Tax,Insurance,Retirement,Other Deductions,Total Deductions,Net Pay,Date');
    filteredRecords.forEach((record: any) => {
      const deductions = record.deductions || {};
      const totalDeductions = (deductions.tax || 0) + (deductions.insurance || 0) + 
                             (deductions.retirement || 0) + (deductions.other || 0);
      csvRows.push(
        `${getEmployeeName(record.employeeId)},${record.payPeriod || 'N/A'},${record.gross || 0},${deductions.tax || 0},${deductions.insurance || 0},${deductions.retirement || 0},${deductions.other || 0},${totalDeductions},${record.net || 0},${new Date(record.createdAt).toLocaleDateString()}`
      );
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Payroll report exported successfully', severity: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Loading payroll data...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
            Payroll Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zimbabwe USD payroll — ZIMRA PAYE, NSSA & AIDS levy auto-calculated. Salaries post to Finance expenses.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={() => loadData(true)}
              disabled={refreshing}
              sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}
            >
              <Refresh sx={{ rotate: refreshing ? '360deg' : '0deg', transition: 'rotate 0.6s linear' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            New Payroll Record
          </Button>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('safe')}>
                  <AttachMoney sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Gross Pay
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                    {formatCurrency(summary.totalGross)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                    <TrendingUp fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                      {summary.recordCount} records
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
                  <Calculate sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Deductions
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mb: 1 }}>
                    {formatCurrency(summary.totalDeductions)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                    <Calculate fontSize="small" color="warning" />
                <Typography variant="caption" color="text.secondary">
                  {summary.totalGross > 0 ? ((summary.totalDeductions / summary.totalGross) * 100).toFixed(1) : 0}% of gross
                    </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('neutral')}>
                  <AccountBalanceWallet sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Net Pay
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                    {formatUsd(summary.totalNet)}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                    <AccountBalanceWallet fontSize="small" color="primary" />
                <Typography variant="caption" color="text.secondary">
                      Avg: {formatUsd(summary.averageNet)}
                    </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('neutral')}>
                  <People sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Employees Paid
                  </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                    {summary.uniqueEmployees}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                    <People fontSize="small" color="secondary" />
                <Typography variant="caption" color="text.secondary">
                      Active employees
                    </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                Payroll by Period
              </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip icon={<BarChart />} label="Gross" size="small" sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50' }} />
                  <Chip icon={<BarChart />} label="Net" size="small" sx={{ bgcolor: alpha('#2196f3', 0.1), color: '#2196f3' }} />
                </Stack>
              </Stack>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={payrollByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.1)} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fill: '#666', fontSize: 12 }}
                    stroke={alpha('#000', 0.3)}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                    stroke={alpha('#000', 0.3)}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${alpha('#000', 0.1)}`,
                      boxShadow: `0 4px 20px ${alpha('#000', 0.1)}`,
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: 20 }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="gross" 
                    fill="#4caf50" 
                    name="Gross Pay"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="net" 
                    fill="#2196f3" 
                    name="Net Pay"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                Deductions Breakdown
              </Typography>
                <Chip icon={<PieChart />} label="Breakdown" size="small" variant="outlined" />
              </Stack>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={deductionsBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={alpha('#fff', 0.8)}
                    strokeWidth={2}
                  >
                    {deductionsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${alpha('#000', 0.1)}`,
                      boxShadow: `0 4px 20px ${alpha('#000', 0.1)}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <FlatCard sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Search by employee, period, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Pay Period</InputLabel>
              <Select
                value={filterPeriod}
                label="Pay Period"
                onChange={(e) => setFilterPeriod(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Periods</MenuItem>
                {payPeriods.map((period) => (
                  <MenuItem key={period} value={period}>
                    {period}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportToCSV}
              sx={{ borderRadius: 2 }}
            >
              Export CSV
            </Button>
          </Stack>
        </CardContent>
      </FlatCard>

      {/* Payroll Records Table */}
      <FlatCard>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Payroll Records
          </Typography>
            <Chip 
              label={`${filteredRecords.length} ${filteredRecords.length === 1 ? 'record' : 'records'}`} 
              color="primary" 
              variant="outlined"
            />
          </Stack>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Employee</strong></TableCell>
                  <TableCell><strong>Pay Period</strong></TableCell>
                  <TableCell align="right"><strong>Gross Pay</strong></TableCell>
                  <TableCell align="right"><strong>Deductions</strong></TableCell>
                  <TableCell align="right"><strong>Net Pay</strong></TableCell>
                  <TableCell align="right"><strong>Date</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Stack spacing={2} alignItems="center">
                        <Receipt sx={{ fontSize: 48, color: 'text.secondary' }} />
                        <Typography variant="body1" color="text.secondary">
                          No payroll records found
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => {
                            resetForm();
                            setDialogOpen(true);
                          }}
                        >
                          Create First Record
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record: any) => (
                    <StyledTableRow key={record._id?.toString()}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {getEmployeeName(record.employeeId).charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {getEmployeeName(record.employeeId)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.payPeriod || 'N/A'}
                          size="small"
                          icon={<CalendarToday fontSize="small" />}
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(record.gross || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main">
                          {formatCurrency(
                            (record.deductions?.tax || 0) +
                            (record.deductions?.insurance || 0) +
                            (record.deductions?.retirement || 0) +
                            (record.deductions?.other || 0)
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {formatUsd(record.net || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(record)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </StyledTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </FlatCard>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={statIconSx('neutral')}>
              <Add sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Create Payroll Record</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={formData.employeeId}
                label="Employee"
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              >
                {employees.map((emp: { id: string; name: string; email?: string }) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name || emp.email || 'Unknown'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Pay Period"
              value={formData.payPeriod}
              onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
              placeholder="e.g., 2024-01, January 2024"
              helperText="Enter the pay period (e.g., month/year format)"
            />

            <TextField
              fullWidth
              label="Gross Pay (USD monthly)"
              type="number"
              value={formData.gross}
              onChange={(e) => applyZwToForm(parseFloat(e.target.value || "0"))}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              helperText="Zimbabwe statutory deductions applied automatically"
            />

            <Divider>Zimbabwe deductions (auto)</Divider>

            <TextField
              fullWidth
              label="PAYE + AIDS levy"
              type="number"
              value={formData.tax}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                readOnly: true,
              }}
            />

            <TextField
              fullWidth
              label="NSSA (employee)"
              type="number"
              value={formData.insurance}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                readOnly: true,
              }}
            />

            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight={600} color="text.secondary">
                    Calculated Net Pay:
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="text.primary">
                    {formatUsd(zwPreview?.net ?? (
                      parseFloat(formData.gross || '0') -
                      parseFloat(formData.tax || '0') -
                      parseFloat(formData.insurance || '0')
                    ))}
                  </Typography>
                </Stack>
                {zwPreview && (
                  <Typography variant="caption" color="text.secondary">
                    Employer cost {formatUsd(zwPreview.employerCost)} incl. NSSA employer
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} sx={{ borderRadius: 2 }}>
            Create Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={statIconSx('neutral')}>
              <Edit sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Edit Payroll Record</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={formData.employeeId}
                label="Employee"
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              >
                {employees.map((emp: { id: string; name: string; email?: string }) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name || emp.email || 'Unknown'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Pay Period"
              value={formData.payPeriod}
              onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
              placeholder="e.g., 2024-01, January 2024"
            />

            <TextField
              fullWidth
              label="Gross Pay (USD monthly)"
              type="number"
              value={formData.gross}
              onChange={(e) => applyZwToForm(parseFloat(e.target.value || "0"))}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />

            <Divider>Zimbabwe deductions (auto)</Divider>

            <TextField
              fullWidth
              label="PAYE + AIDS levy"
              type="number"
              value={formData.tax}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                readOnly: true,
              }}
            />

            <TextField
              fullWidth
              label="NSSA (employee)"
              type="number"
              value={formData.insurance}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                readOnly: true,
              }}
            />

            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight={600} color="text.secondary">
                    Calculated Net Pay:
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="text.primary">
                    {formatUsd(zwPreview?.net ?? 0)}
                  </Typography>
                </Stack>
                {zwPreview && (
                  <Typography variant="caption" color="text.secondary">
                    Employer cost {formatUsd(zwPreview.employerCost)} incl. NSSA employer
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpdate} sx={{ borderRadius: 2 }}>
            Update Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                background: alpha('#f44336', 0.1),
              }}
            >
              <Delete sx={{ color: '#f44336' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Confirm Delete</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this payroll record for{' '}
            <strong>{selectedRecord ? getEmployeeName(selectedRecord.employeeId) : ''}</strong>?
            <br />
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This action cannot be undone.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            sx={{ 
              borderRadius: 2,
              boxShadow: `0 4px 15px ${alpha('#f44336', 0.4)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha('#f44336', 0.5)}`,
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
