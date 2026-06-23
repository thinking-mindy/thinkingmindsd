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
} from "@mui/material";
import {
  Add,
  Receipt,
  Send,
  CheckCircle,
  Warning,
  Schedule,
  TrendingUp,
  TrendingDown,
  Refresh,
  Search,
  Download,
  Print,
  Email,
  Assessment,
  AccountBalance,
  Delete,
  Edit,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getInvoicesByOrg, createInvoice, updateInvoice } from "@/lib/desktop/finance-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";
import { getSchoolStudentsWithBalances } from "@/lib/desktop/school-bridge";

type ReceivableRow = {
  _id: string;
  source: "invoice" | "school_fee";
  customerName?: string;
  customerEmail?: string;
  description?: string;
  total: number;
  remaining?: number;
  dueDate?: string | Date;
  status: string;
  invoiceId?: string;
  studentNumber?: string;
  className?: string;
  termLabel?: string;
};
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

function mapSchoolToReceivable(student: Record<string, any>): ReceivableRow | null {
  const balance = student.feeBalance;
  if (!balance?.hasClassFees || Number(balance.feesPerTerm ?? 0) <= 0) return null;
  const remaining = Number(balance.remainingBalance ?? 0);
  return {
    _id: `school-${student._id}`,
    source: "school_fee",
    customerName: `${student.firstName} ${student.lastName}`,
    customerEmail: student.studentNumber,
    studentNumber: student.studentNumber,
    className: balance.className ?? student.className,
    termLabel: balance.termLabel,
    description: `${balance.termLabel} school fees · ${balance.className ?? student.className ?? "Class"}`,
    total: Number(balance.feesPerTerm ?? 0),
    remaining,
    dueDate: new Date().toISOString(),
    status: remaining > 0 ? "outstanding" : "paid",
  };
}

export default function ReceivablesTab() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [schoolReceivables, setSchoolReceivables] = useState<ReceivableRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    lines: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    dueDate: '',
  });

  useEffect(() => {
    if (isLoaded) loadData();
  }, [user, isLoaded]);

  const loadData = async (showRefresh = false) => {
    if (!isLoaded) return;
    const orgId = user?.publicMetadata?.companyId as string | undefined;
    if (!orgId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [invoiceRes, schoolRes] = await Promise.all([
        getInvoicesByOrg(orgId),
        getSchoolStudentsWithBalances(orgId),
      ]);
      if (invoiceRes.success) setInvoices(invoiceRes.data || []);
      if (schoolRes.success) {
        const rows = (schoolRes.data || [])
          .map((s: Record<string, unknown>) => mapSchoolToReceivable(s as Record<string, any>))
          .filter(Boolean) as ReceivableRow[];
        setSchoolReceivables(rows);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setSnackbar({ open: true, message: 'Failed to load receivables', severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.publicMetadata?.companyId) return;

    const total = formData.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const dueDate = formData.dueDate ? new Date(formData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      const result = await createInvoice({
        orgId: user.publicMetadata.companyId as string,
        customerName: formData.customerName.trim() || undefined,
        customerEmail: formData.customerEmail.trim() || undefined,
        lines: formData.lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
        })),
        total,
        status: 'draft',
        dueDate,
      });

      if (result.success) {
        setSnackbar({ open: true, message: 'Invoice created successfully', severity: 'success' });
        setDialogOpen(false);
        setFormData({
          customerName: '',
          customerEmail: '',
          lines: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
          dueDate: '',
        });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to create invoice', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create invoice', severity: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'sent':
        return 'info';
      case 'overdue':
        return 'error';
      case 'draft':
        return 'default';
      case 'outstanding':
        return 'warning';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle fontSize="small" />;
      case 'sent':
        return <Send fontSize="small" />;
      case 'overdue':
        return <Warning fontSize="small" />;
      case 'outstanding':
        return <Warning fontSize="small" />;
      case 'draft':
        return <Edit fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  const allReceivables = useMemo((): ReceivableRow[] => {
    const invoiceRows: ReceivableRow[] = invoices.map((inv: any) => ({
      _id: String(inv._id ?? inv.invoiceId),
      source: "invoice" as const,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      description: inv.lines?.[0]?.description,
      total: Number(inv.total ?? 0),
      dueDate: inv.dueDate,
      status: inv.status ?? "draft",
      invoiceId: String(inv.invoiceId ?? inv._id ?? ""),
    }));
    return [...invoiceRows, ...schoolReceivables];
  }, [invoices, schoolReceivables]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allInvoices = invoices;
    const thisMonthInvoices = invoices.filter((inv: any) => new Date(inv.createdAt) >= startOfMonth);
    
    const invoiceOutstanding = allInvoices
      .filter((inv: any) => inv.status !== 'paid')
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const schoolOutstanding = schoolReceivables
      .filter((row) => row.status === "outstanding")
      .reduce((sum, row) => sum + Number(row.remaining ?? row.total ?? 0), 0);
    const totalReceivables = invoiceOutstanding + schoolOutstanding;
    
    const overdueAmount = allInvoices
      .filter((inv: any) => {
        const dueDate = new Date(inv.dueDate);
        return inv.status !== 'paid' && dueDate < now;
      })
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    
    const thisMonthTotal = thisMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    
    const paidAmount = allInvoices
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    
    return {
      totalReceivables,
      overdueAmount,
      thisMonthTotal,
      paidAmount,
      totalCount: allInvoices.length,
      overdueCount: allInvoices.filter((inv: any) => {
        const dueDate = new Date(inv.dueDate);
        return inv.status !== 'paid' && dueDate < now;
      }).length,
      paidCount: allInvoices.filter((inv: any) => inv.status === 'paid').length,
      schoolOutstandingCount: schoolReceivables.length,
    };
  }, [invoices, schoolReceivables]);

  // Status breakdown
  const statusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      const status = inv.status || 'draft';
      statuses[status] = (statuses[status] || 0) + (inv.total || 0);
    });
    return Object.entries(statuses).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [invoices]);

  // Monthly invoice trend
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      const date = new Date(inv.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = (months[monthKey] || 0) + (inv.total || 0);
    });
    return Object.entries(months)
      .sort()
      .slice(-6)
      .map(([name, value]) => ({
        month: name,
        amount: value,
      }));
  }, [invoices]);

  const filteredReceivables = useMemo(() => {
    let filtered = allReceivables;

    if (filterStatus !== "all") {
      filtered = filtered.filter((row) => row.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.customerName?.toLowerCase().includes(query) ||
          row.customerEmail?.toLowerCase().includes(query) ||
          row.studentNumber?.toLowerCase().includes(query) ||
          row.description?.toLowerCase().includes(query) ||
          row.total?.toString().includes(query) ||
          row._id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allReceivables, filterStatus, searchQuery]);

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Loading invoices...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Accounts Receivable Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create, track, and manage customer invoices
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => loadData(true)} disabled={refreshing}>
              <Refresh sx={{ rotate: refreshing ? '360deg' : '0deg', transition: 'rotate 0.5s' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 3 }}
          >
            Create Invoice
          </Button>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha('#2196f3', 0.15),
                    color: 'info.main',
                  }}
                >
                  <AccountBalance sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total Receivables
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="info.main">
                    {formatCurrency(summary.totalReceivables)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.totalCount} invoices
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
                    bgcolor: alpha('#f44336', 0.15),
                    color: 'error.main',
                  }}
                >
                  <Warning sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Overdue
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main">
                    {formatCurrency(summary.overdueAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.overdueCount} overdue
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
                    bgcolor: alpha('#4caf50', 0.15),
                    color: 'success.main',
                  }}
                >
                  <TrendingUp sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    This Month
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main">
                    {formatCurrency(summary.thisMonthTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total invoiced
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
                    bgcolor: alpha('#4caf50', 0.15),
                    color: 'success.main',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Paid
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main">
                    {formatCurrency(summary.paidAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.paidCount} paid
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                    Invoice Status
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Distribution by status
                  </Typography>
                </Box>
              </Stack>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    No invoice data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                    Invoice Trend
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Last 6 months
                  </Typography>
                </Box>
              </Stack>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={alpha('#000', 0.5)}
                      tick={{ fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value) => value.split('-')[1]}
                    />
                    <YAxis
                      stroke={alpha('#000', 0.5)}
                      tick={{ fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        padding: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#2196f3"
                      strokeWidth={3}
                      dot={{ fill: '#2196f3', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    No trend data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <FlatCard>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                Receivable Records
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {filteredReceivables.length} {filteredReceivables.length === 1 ? 'record' : 'records'} found
                {schoolReceivables.length > 0 ? ` · ${schoolReceivables.length} school fee balance${schoolReceivables.length === 1 ? '' : 's'}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder="Search customer, student, reference…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                      <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </Box>
                  ),
                }}
                sx={{ width: 280 }}
              />
              <FormControl
                size="small"
                sx={{
                  minWidth: 140,
                }}
              >
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="outstanding">School outstanding</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
          <TableContainer
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha('#000', 0.08)}`,
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: alpha('#000', 0.03),
                    '& th': {
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${alpha('#000', 0.1)}`,
                    },
                  }}
                >
                  <TableCell>Reference</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Due / Term</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReceivables.length > 0 ? (
                  filteredReceivables.map((row, index) => {
                    const isSchool = row.source === "school_fee";
                    const isOverdue =
                      !isSchool &&
                      row.dueDate &&
                      new Date(row.dueDate) < new Date() &&
                      row.status !== "paid";
                    const displayAmount = isSchool ? Number(row.remaining ?? row.total) : Number(row.total);
                    return (
                      <TableRow
                        key={row._id}
                        sx={{
                          '&:hover': {
                            bgcolor: alpha('#000', 0.03),
                            transform: 'scale(1.001)',
                          },
                          transition: 'all 0.2s ease',
                          borderBottom: index < filteredReceivables.length - 1 ? `1px solid ${alpha('#000', 0.05)}` : 'none',
                          bgcolor: isOverdue ? alpha('#f44336', 0.05) : 'transparent',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {isSchool ? row.studentNumber : `#${(row.invoiceId ?? row._id).slice(-8)}`}
                          </Typography>
                          {isSchool && (
                            <Chip label="School fees" size="small" sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {row.customerName || 'N/A'}
                            </Typography>
                            {(row.customerEmail || row.description) && (
                              <Typography variant="caption" color="text.secondary">
                                {isSchool ? row.description : row.customerEmail}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {isSchool
                                ? row.termLabel || "Current term"
                                : row.dueDate
                                  ? new Date(row.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : "—"}
                            </Typography>
                            {isOverdue && (
                              <Chip
                                label="OVERDUE"
                                size="small"
                                color="error"
                                sx={{ mt: 0.5, fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(row.status)}
                            label={row.status?.toUpperCase() || 'DRAFT'}
                            color={getStatusColor(row.status) as any}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 24,
                              boxShadow: `0 2px 8px ${alpha(
                                getStatusColor(row.status) === 'success' ? '#4caf50' :
                                getStatusColor(row.status) === 'error' ? '#f44336' :
                                getStatusColor(row.status) === 'info' ? '#2196f3' : '#9e9e9e',
                                0.2
                              )}`,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 0.25,
                              p: 1,
                              borderRadius: 2,
                              bgcolor: alpha(isSchool ? '#ff9800' : '#2196f3', 0.1),
                            }}
                          >
                            <Typography variant="h6" fontWeight={800} color={isSchool ? "warning.main" : "info.main"} component="span">
                              {formatCurrency(displayAmount)}
                            </Typography>
                            {isSchool && (
                              <Typography variant="caption" color="text.secondary">
                                of {formatCurrency(row.total)} term fees
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {!isSchool && row.status === 'draft' && (
                              <Tooltip title="Send Invoice">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={async () => {
                                    try {
                                      const result = await updateInvoice(row.invoiceId || row._id, { status: 'sent' });
                                      if (result.success) {
                                        setSnackbar({ open: true, message: 'Invoice sent successfully', severity: 'success' });
                                        loadData();
                                      }
                                    } catch (error) {
                                      setSnackbar({ open: true, message: 'Failed to send invoice', severity: 'error' });
                                    }
                                  }}
                                >
                                  <Send fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Stack spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: alpha('#000', 0.05),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Receipt sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                        </Box>
                        <Typography variant="body1" fontWeight={600} color="text.secondary">
                          No receivables found
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your search or filter criteria'
                            : 'Create invoices or record school fee balances with remaining amounts'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </FlatCard>

      {/* Create Invoice Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: `0 8px 32px ${alpha('#000', 0.15)}`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha('#2196f3', 0.15),
                color: 'primary.main',
              }}
            >
              <Add sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Create New Invoice
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add a new invoice for your customer
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Customer Name"
                  fullWidth
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Customer Email"
                  type="email"
                  fullWidth
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </Grid>
            </Grid>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            <Divider />
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Invoice Line Items
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      lines: [...formData.lines, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
                    });
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Add Item
                </Button>
              </Stack>
              {formData.lines.map((line, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha('#000', 0.1)}`,
                    bgcolor: alpha('#000', 0.02),
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        label="Description"
                        fullWidth
                        size="small"
                        value={line.description}
                        onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index].description = e.target.value;
                          setFormData({ ...formData, lines: newLines });
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4, md: 2 }}>
                      <TextField
                        label="Qty"
                        type="number"
                        fullWidth
                        size="small"
                        value={line.quantity}
                        onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index].quantity = parseInt(e.target.value) || 0;
                          newLines[index].total = newLines[index].quantity * newLines[index].unitPrice;
                          setFormData({ ...formData, lines: newLines });
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4, md: 2 }}>
                      <TextField
                        label="Unit Price"
                        type="number"
                        fullWidth
                        size="small"
                        value={line.unitPrice}
                        onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index].unitPrice = parseFloat(e.target.value) || 0;
                          newLines[index].total = newLines[index].quantity * newLines[index].unitPrice;
                          setFormData({ ...formData, lines: newLines });
                        }}
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1, fontSize: '0.875rem' }}>$</Typography>,
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4, md: 2 }}>
                      <TextField
                        label="Total"
                        fullWidth
                        size="small"
                        value={formatCurrency(line.total)}
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const newLines = formData.lines.filter((_, i) => i !== index);
                          setFormData({ ...formData, lines: newLines });
                        }}
                        disabled={formData.lines.length === 1}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha('#2196f3', 0.1),
                border: `2px solid ${alpha('#2196f3', 0.3)}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  Total Amount
                </Typography>
                <Typography variant="h5" fontWeight={900} color="primary.main">
                  {formatCurrency(formData.lines.reduce((sum, line) => sum + line.total, 0))}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ borderRadius: 2, px: 4 }}
            startIcon={<CheckCircle />}
          >
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
