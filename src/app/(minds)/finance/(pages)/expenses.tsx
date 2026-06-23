"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
  styled,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Tooltip,
  Checkbox,
  TableSortLabel,
  Divider,
  LinearProgress,
  Avatar,
  Badge,
} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
  Search,
  FilterList,
  Download,
  Delete,
  Edit,
  AttachFile,
  Refresh,
  TrendingUp,
  TrendingDown,
  PendingActions,
  Receipt,
  DateRange,
  Category,
  MoreVert,
  CheckBox,
  CheckBoxOutlineBlank,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getExpensesByOrg, createExpense, updateExpense } from "@/lib/desktop/finance-bridge";
import { formatCurrency } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
  "&.Mui-selected": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

export default function ExpensesTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringFrequency: '',
    receipt: null as File | null,
  });

  const categories = [
    "Office Supplies",
    "Travel",
    "Utilities",
    "Marketing",
    "Professional Services",
    "Equipment",
    "Software & Subscriptions",
    "Rent & Facilities",
    "Training & Development",
    "Meals & Entertainment",
    "Insurance",
    "Other",
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.publicMetadata?.companyId) return;
    setLoading(true);
    try {
      const result = await getExpensesByOrg(user.publicMetadata.companyId as string);
      if (result.success) setExpenses(result.data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setSnackbar({ open: true, message: 'Failed to load expenses', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (exp) =>
          exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((exp) => exp.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((exp) => exp.status === filterStatus);
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(
        (exp) => new Date(exp.date) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter(
        (exp) => new Date(exp.date) <= new Date(filterDateTo)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "date") {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortBy === "amount") {
        aVal = a.amount || 0;
        bVal = b.amount || 0;
      } else {
        aVal = a.category || "";
        bVal = b.category || "";
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [expenses, searchQuery, filterCategory, filterStatus, filterDateFrom, filterDateTo, sortBy, sortOrder]);

  const statistics = useMemo(() => {
    const total = filteredAndSortedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const approved = filteredAndSortedExpenses
      .filter((exp) => exp.status === "approved")
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const pending = filteredAndSortedExpenses
      .filter((exp) => exp.status === "pending")
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const rejected = filteredAndSortedExpenses
      .filter((exp) => exp.status === "rejected")
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const pendingCount = filteredAndSortedExpenses.filter((exp) => exp.status === "pending").length;

    return { total, approved, pending, rejected, pendingCount };
  }, [filteredAndSortedExpenses]);

  const handleSubmit = async () => {
    if (!user?.publicMetadata?.companyId || !formData.category || !formData.amount) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const expenseData: any = {
        orgId: user.publicMetadata.companyId as string,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        status: 'pending',
      };

      if (formData.isRecurring && formData.recurringFrequency) {
        expenseData.isRecurring = true;
        expenseData.recurringFrequency = formData.recurringFrequency;
      }

      const result = editExpense
        ? await updateExpense(editExpense._id, expenseData)
        : await createExpense(expenseData);

      if (result.success) {
        setSnackbar({
          open: true,
          message: editExpense ? 'Expense updated successfully' : 'Expense recorded successfully',
          severity: 'success',
        });
        setDialogOpen(false);
        setEditExpense(null);
        setFormData({
          category: '',
          description: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          isRecurring: false,
          recurringFrequency: '',
          receipt: null,
        });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to record expense', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to record expense', severity: 'error' });
    }
  };

  const handleApprove = async (expenseId: string) => {
    try {
      const result = await updateExpense(expenseId, { status: 'approved' });
      if (result.success) {
        setSnackbar({ open: true, message: 'Expense approved', severity: 'success' });
        loadData();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to approve expense', severity: 'error' });
    }
  };

  const handleReject = async (expenseId: string) => {
    try {
      const result = await updateExpense(expenseId, { status: 'rejected' });
      if (result.success) {
        setSnackbar({ open: true, message: 'Expense rejected', severity: 'success' });
        loadData();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reject expense', severity: 'error' });
    }
  };

  const handleBulkApprove = async () => {
    try {
      const promises = selectedExpenses.map((id) => updateExpense(id, { status: 'approved' }));
      await Promise.all(promises);
      setSnackbar({ open: true, message: `${selectedExpenses.length} expenses approved`, severity: 'success' });
      setSelectedExpenses([]);
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to approve expenses', severity: 'error' });
    }
  };

  const handleBulkReject = async () => {
    try {
      const promises = selectedExpenses.map((id) => updateExpense(id, { status: 'rejected' }));
      await Promise.all(promises);
      setSnackbar({ open: true, message: `${selectedExpenses.length} expenses rejected`, severity: 'success' });
      setSelectedExpenses([]);
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reject expenses', severity: 'error' });
    }
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === filteredAndSortedExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredAndSortedExpenses.map((exp) => exp._id));
    }
  };

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(expenseId) ? prev.filter((id) => id !== expenseId) : [...prev, expenseId]
    );
  };

  const handleEdit = (expense: any) => {
    setEditExpense(expense);
    setFormData({
      category: expense.category || '',
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isRecurring: expense.isRecurring || false,
      recurringFrequency: expense.recurringFrequency || '',
      receipt: null,
    });
    setDialogOpen(true);
  };

  const handleExport = () => {
    const csvContent = [
      ["Date", "Category", "Description", "Amount", "Status"].join(","),
      ...filteredAndSortedExpenses.map((exp) =>
        [
          new Date(exp.date).toLocaleDateString(),
          exp.category,
          `"${exp.description || ""}"`,
          exp.amount || 0,
          exp.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Expenses exported successfully', severity: 'success' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSort = (field: "date" | "amount" | "category") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
            Expense Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track, approve, and manage all business expenses
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditExpense(null);
              setFormData({
                category: '',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                isRecurring: false,
                recurringFrequency: '',
                receipt: null,
              });
              setDialogOpen(true);
            }}
          >
            Record Expense
          </Button>
        </Stack>
      </Stack>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Expenses
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(statistics.total)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary' }}>
                  <Receipt />
                </Avatar>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Approved
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {formatCurrency(statistics.approved)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50' }}>
                  <CheckCircle />
                </Avatar>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Pending Approval
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {formatCurrency(statistics.pending)}
                  </Typography>
                  <Chip
                    label={`${statistics.pendingCount} items`}
                    size="small"
                    sx={{ mt: 1 }}
                    color="warning"
                  />
                </Box>
                <Avatar sx={{ bgcolor: alpha('#ff9800', 0.1), color: '#ff9800' }}>
                  <PendingActions />
                </Avatar>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Rejected
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {formatCurrency(statistics.rejected)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#f44336', 0.1), color: '#f44336' }}>
                  <Cancel />
                </Avatar>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <FlatCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                placeholder="Search expenses..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1, minWidth: 250 }}
              />
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Stack>

            {showFilters && (
              <>
                <Divider />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={filterCategory}
                        label="Category"
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <MenuItem value="all">All Categories</MenuItem>
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filterStatus}
                        label="Status"
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      label="From Date"
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      label="To Date"
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </CardContent>
      </FlatCard>

      {/* Bulk Actions */}
      {selectedExpenses.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'action.hover',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              {selectedExpenses.length} selected
            </Typography>
            <Button
              size="small"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleBulkApprove}
            >
              Approve All
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<Cancel />}
              onClick={handleBulkReject}
            >
              Reject All
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedExpenses([])}
            >
              Clear Selection
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Expenses Table */}
      <FlatCard>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Expense Records ({filteredAndSortedExpenses.length})
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedExpenses.length > 0 && selectedExpenses.length < filteredAndSortedExpenses.length}
                      checked={filteredAndSortedExpenses.length > 0 && selectedExpenses.length === filteredAndSortedExpenses.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "date"}
                      direction={sortBy === "date" ? sortOrder : "asc"}
                      onClick={() => handleSort("date")}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "category"}
                      direction={sortBy === "category" ? sortOrder : "asc"}
                      onClick={() => handleSort("category")}
                    >
                      Category
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === "amount"}
                      direction={sortBy === "amount" ? sortOrder : "asc"}
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedExpenses.length > 0 ? (
                  filteredAndSortedExpenses.map((expense: any) => (
                    <StyledTableRow
                      key={expense._id}
                      selected={selectedExpenses.includes(expense._id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedExpenses.includes(expense._id)}
                          onChange={() => handleSelectExpense(expense._id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(expense.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.category}
                          size="small"
                          sx={{
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {expense.description || '-'}
                        </Typography>
                        {expense.isRecurring && (
                          <Chip
                            label={`Recurring: ${expense.recurringFrequency}`}
                            size="small"
                            sx={{ mt: 0.5 }}
                            color="info"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status?.toUpperCase() || 'PENDING'}
                          color={getStatusColor(expense.status) as any}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={700}>
                          {formatCurrency(expense.amount || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {expense.status === 'pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApprove(expense._id)}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleReject(expense._id)}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </StyledTableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery || filterCategory !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo
                          ? "No expenses match your filters"
                          : "No expenses found"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </FlatCard>

      {/* Add/Edit Expense Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditExpense(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight={700}>
            {editExpense ? "Edit Expense" : "Record New Expense"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter expense description..."
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Recurring Frequency</InputLabel>
                  <Select
                    value={formData.recurringFrequency}
                    label="Recurring Frequency"
                    onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value })}
                    disabled={!formData.isRecurring}
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Stack direction="row" alignItems="center" spacing={2}>
              <Checkbox
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              />
              <Typography variant="body2">This is a recurring expense</Typography>
            </Stack>

            <Box
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                id="receipt-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData({ ...formData, receipt: file });
                }}
              />
              <label htmlFor="receipt-upload">
                <Stack alignItems="center" spacing={1}>
                  <AttachFile sx={{ fontSize: 40, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {formData.receipt ? formData.receipt.name : "Click to upload receipt (optional)"}
                  </Typography>
                </Stack>
              </label>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => {
            setDialogOpen(false);
            setEditExpense(null);
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editExpense ? "Update Expense" : "Record Expense"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

