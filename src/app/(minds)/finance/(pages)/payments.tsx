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
  Payment,
  CreditCard,
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
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getPaymentsByOrg, createPayment, updatePayment, getInvoicesByOrg } from "@/lib/desktop/finance-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";
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

export default function PaymentsTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'credit_card' | 'check',
    status: 'pending' as 'pending' | 'completed' | 'failed',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async (showRefresh = false) => {
    if (!user?.publicMetadata?.companyId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [paymentsRes, invoicesRes] = await Promise.all([
        getPaymentsByOrg(user.publicMetadata.companyId as string),
        getInvoicesByOrg(user.publicMetadata.companyId as string),
      ]);
      if (paymentsRes.success) setPayments(paymentsRes.data || []);
      if (invoicesRes.success) setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      setSnackbar({ open: true, message: 'Failed to load payments', severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.publicMetadata?.companyId || !formData.amount) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const result = await createPayment({
        orgId: user.publicMetadata.companyId as string,
        invoiceId: formData.invoiceId || undefined,
        amount: parseFloat(formData.amount),
        method: formData.method,
        status: formData.status,
        transactionId: formData.reference || undefined,
      });

      if (result.success) {
        setSnackbar({ open: true, message: 'Payment recorded successfully', severity: 'success' });
        setDialogOpen(false);
        setFormData({
          invoiceId: '',
          amount: '',
          method: 'bank_transfer',
          status: 'pending',
          reference: '',
          notes: '',
        });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to record payment', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to record payment', severity: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'pending':
        return <Pending fontSize="small" />;
      case 'failed':
        return <Error fontSize="small" />;
      default:
        return <Payment fontSize="small" />;
    }
  };

  const getSourceLabel = (payment: any) => {
    const source = payment.sourceType;
    if (source === 'pos') return 'POS';
    if (source === 'cashier') return 'Cashier';
    return payment.invoiceId ? 'Invoice' : 'Manual';
  };

  const getSourceColor = (payment: any): 'primary' | 'secondary' | 'success' | 'default' => {
    const source = payment.sourceType;
    if (source === 'pos') return 'primary';
    if (source === 'cashier') return 'secondary';
    if (payment.invoiceId) return 'success';
    return 'default';
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <AccountBalance fontSize="small" />;
      case 'card':
        return <CreditCard fontSize="small" />;
      case 'cash':
        return <LocalAtm fontSize="small" />;
      case 'credit_card':
        return <CreditCard fontSize="small" />;
      case 'check':
        return <Receipt fontSize="small" />;
      default:
        return <Payment fontSize="small" />;
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allPayments = payments;
    const thisMonthPayments = payments.filter((p: any) => new Date(p.createdAt) >= startOfMonth);
    
    const totalPaid = allPayments
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const pendingAmount = allPayments
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const thisMonthTotal = thisMonthPayments
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const failedCount = allPayments.filter((p: any) => p.status === 'failed').length;
    
    return {
      totalPaid,
      pendingAmount,
      thisMonthTotal,
      failedCount,
      totalCount: allPayments.length,
      pendingCount: allPayments.filter((p: any) => p.status === 'pending').length,
    };
  }, [payments]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = {};
    payments.forEach((p: any) => {
      if (p.status === 'completed') {
        const method = p.method || 'unknown';
        methods[method] = (methods[method] || 0) + (p.amount || 0);
      }
    });
    return Object.entries(methods).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
  }, [payments]);

  // Monthly payment trend
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    payments.forEach((p: any) => {
      if (p.status === 'completed') {
        const date = new Date(p.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months[monthKey] = (months[monthKey] || 0) + (p.amount || 0);
      }
    });
    return Object.entries(months)
      .sort()
      .slice(-6)
      .map(([name, value]) => ({
        month: name,
        amount: value,
      }));
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p: any) => p.status === filterStatus);
    }
    
    if (filterMethod !== 'all') {
      filtered = filtered.filter((p: any) => p.method === filterMethod);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.reference?.toLowerCase().includes(query) ||
        p.transactionId?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query) ||
        p.receivedBy?.toLowerCase().includes(query) ||
        p.sourceType?.toLowerCase().includes(query) ||
        p.amount?.toString().includes(query) ||
        p.invoiceId?.toString().toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [payments, filterStatus, filterMethod, searchQuery]);

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Loading payments...
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
            Payment Collections
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Invoice payments, POS sales, and cashier receipts
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
            Record Payment
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
                    bgcolor: alpha('#4caf50', 0.15),
                    color: 'success.main',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Total Paid
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main">
                    {formatCurrency(summary.totalPaid)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.totalCount} payments
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
                    bgcolor: alpha('#ff9800', 0.15),
                    color: 'warning.main',
                  }}
                >
                  <Pending sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Pending
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="warning.main">
                    {formatCurrency(summary.pendingAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.pendingCount} pending
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
                    bgcolor: alpha('#2196f3', 0.15),
                    color: 'info.main',
                  }}
                >
                  <TrendingUp sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    This Month
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="info.main">
                    {formatCurrency(summary.thisMonthTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed payments
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
                  <Error sx={{ fontSize: 36 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Failed
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main">
                    {summary.failedCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Require attention
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
                    Payment Methods
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Distribution breakdown
                  </Typography>
                </Box>
              </Stack>
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
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
                      {paymentMethodData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Payment sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    No payment data available
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
                    Payment Trend
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
                      stroke="#4caf50"
                      strokeWidth={3}
                      dot={{ fill: '#4caf50', r: 4 }}
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

      {/* Payments Table */}
      <FlatCard>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                Payment Records
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'} found
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder="Search payments..."
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
                sx={{ minWidth: 140 }}
              >
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size="small"
                sx={{ minWidth: 160 }}
              >
                <InputLabel>Method</InputLabel>
                <Select
                  value={filterMethod}
                  label="Method"
                  onChange={(e) => setFilterMethod(e.target.value)}
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
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
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment: any, index: number) => (
                    <TableRow
                      key={payment._id}
                      sx={{
                        '&:hover': {
                          bgcolor: alpha('#000', 0.03),
                          transform: 'scale(1.001)',
                        },
                        transition: 'all 0.2s ease',
                        borderBottom: index < filteredPayments.length - 1 ? `1px solid ${alpha('#000', 0.05)}` : 'none',
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {new Date(payment.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            label={getSourceLabel(payment)}
                            size="small"
                            color={getSourceColor(payment)}
                            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                          />
                          {payment.invoiceId && (
                            <Typography variant="caption" color="text.secondary">
                              #{payment.invoiceId.toString().slice(-8)}
                            </Typography>
                          )}
                          {payment.receivedBy && (
                            <Typography variant="caption" color="text.secondary">
                              {payment.receivedBy}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: alpha('#2196f3', 0.15),
                              color: 'primary.main',
                            }}
                          >
                            {getMethodIcon(payment.method)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                            {payment.method?.replace('_', ' ') || 'N/A'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {payment.reference || payment.transactionId || payment.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(payment.status)}
                          label={payment.status?.toUpperCase() || 'PENDING'}
                          color={getStatusColor(payment.status) as any}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 24,
                            boxShadow: `0 2px 8px ${alpha(
                              getStatusColor(payment.status) === 'success' ? '#4caf50' :
                              getStatusColor(payment.status) === 'warning' ? '#ff9800' : '#f44336',
                              0.2
                            )}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 1,
                            borderRadius: 2,
                            bgcolor: alpha('#4caf50', 0.1),
                          }}
                        >
                          <Typography variant="h6" fontWeight={800} color="success.main" component="span">
                            {formatCurrency(payment.amount || 0)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" sx={{ color: 'primary.main' }}>
                            <Assessment fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
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
                          <Payment sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                        </Box>
                        <Typography variant="body1" fontWeight={600} color="text.secondary">
                          No payments found
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {searchQuery || filterStatus !== 'all' || filterMethod !== 'all'
                            ? 'Try adjusting your search or filter criteria'
                            : 'Start recording payments to see them here'}
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

      {/* Create Payment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
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
                Record New Payment
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create a new payment record
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Invoice (Optional)</InputLabel>
              <Select
                value={formData.invoiceId}
                label="Invoice (Optional)"
                onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {invoices
                  .filter((inv: any) => inv.status !== 'paid')
                  .map((inv: any) => (
                    <MenuItem key={inv._id} value={inv._id}>
                      #{inv.invoiceId?.toString().slice(-8)} - {formatCurrency(inv.total || 0)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              InputProps={{
                startAdornment: (
                  <Typography sx={{ mr: 1, fontWeight: 700, color: 'primary.main' }}>$</Typography>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.method}
                label="Payment Method"
                onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
              >
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="paynow">PayNow</MenuItem>
                <MenuItem value="check">Check</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Reference Number"
              fullWidth
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Transaction reference or check number"
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or comments..."
            />
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
            Record Payment
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
