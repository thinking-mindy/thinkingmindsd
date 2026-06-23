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
  LinearProgress,
  alpha,
  styled,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Autocomplete,
  Switch,
  FormControlLabel,
  Badge,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add,
  AccountBalance,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Download,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Pending,
  BarChart,
  PieChart,
  Assessment,
  ContentCopy,
  Archive,
  Refresh,
  Visibility,
  Approval,
  Cancel,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import {
  getBudgetsByOrg,
  createBudget,
  deleteBudget,
  updateBudget,
  updateBudgetStatus,
  getBudgetVariance,
  getBudgetAnalytics,
} from "@/lib/desktop/finance-bridge";
import { formatCurrency, formatUsd } from "@/lib/format-currency";
import { FlatCard } from "@/components/FlatCard";
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function BudgetsTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [varianceData, setVarianceData] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    period: "all",
    category: "all",
  });
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    period: "monthly" as "monthly" | "quarterly" | "yearly",
    amount: "",
    startDate: "",
    endDate: "",
    department: "",
    project: "",
    description: "",
    status: "draft" as "draft" | "pending_approval" | "approved",
    isRecurring: false,
  });

  const categories = [
    "Operations",
    "Marketing",
    "Sales",
    "HR",
    "IT",
    "R&D",
    "Administration",
    "Facilities",
    "Travel",
    "Training",
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.publicMetadata?.companyId) return;
    setLoading(true);
    try {
      const [budgetsResult, analyticsResult, varianceResult] = await Promise.all([
        getBudgetsByOrg(),
        getBudgetAnalytics(),
        getBudgetVariance(),
      ]);

      if (budgetsResult.success) setBudgets(budgetsResult.data || []);
      if (analyticsResult.success) setAnalytics(analyticsResult.data);
      if (varianceResult.success) setVarianceData(varianceResult.data || []);
    } catch (error) {
      console.error("Error loading budgets:", error);
      setSnackbar({
        open: true,
        message: "Failed to load budget data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.publicMetadata?.companyId || !formData.name || !formData.amount) {
      setSnackbar({
        open: true,
        message: "Please fill in all required fields",
        severity: "error",
      });
      return;
    }

    try {
      const budgetDataForCreate = {
        orgId: user.publicMetadata.companyId as string,
        name: formData.name,
        category: formData.category,
        period: formData.period,
        amount: parseFloat(formData.amount),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        department: formData.department,
        project: formData.project,
        description: formData.description,
        status: formData.status,
        isRecurring: formData.isRecurring,
      };

      const budgetDataForUpdate = {
        name: formData.name,
        category: formData.category,
        period: formData.period,
        amount: parseFloat(formData.amount),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        department: formData.department,
        project: formData.project,
        description: formData.description,
        status: formData.status,
        isRecurring: formData.isRecurring,
      };

      const result = editBudget
        ? await updateBudget(editBudget._id, budgetDataForUpdate)
        : await createBudget(budgetDataForCreate);

      if (result.success) {
        setSnackbar({
          open: true,
          message: editBudget ? "Budget updated successfully" : "Budget created successfully",
          severity: "success",
        });
        setDialogOpen(false);
        resetForm();
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: result.error || "Failed to save budget",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to save budget",
        severity: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!budgetToDelete) return;
    try {
      const result = await deleteBudget(budgetToDelete._id);
      if (result.success) {
        setSnackbar({
          open: true,
          message: "Budget deleted successfully",
          severity: "success",
        });
        setDeleteDialogOpen(false);
        setBudgetToDelete(null);
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: "Failed to delete budget",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to delete budget",
        severity: "error",
      });
    }
  };

  const handleApprove = async (budgetId: string, approve: boolean) => {
    try {
      const result = await updateBudgetStatus(budgetId, approve ? "approved" : "rejected");
      if (result.success) {
        setSnackbar({
          open: true,
          message: approve ? "Budget approved successfully" : "Budget rejected",
          severity: "success",
        });
        loadData();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to update budget status",
        severity: "error",
      });
    }
    setMenuAnchor(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      period: "monthly",
      amount: "",
      startDate: "",
      endDate: "",
      department: "",
      project: "",
      description: "",
      status: "draft",
      isRecurring: false,
    });
    setEditBudget(null);
  };

  const handleEdit = (budget: any) => {
    setEditBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category,
      period: budget.period,
      amount: budget.amount.toString(),
      startDate: new Date(budget.startDate).toISOString().split("T")[0],
      endDate: new Date(budget.endDate).toISOString().split("T")[0],
      department: budget.department || "",
      project: budget.project || "",
      description: budget.description || "",
      status: budget.status || "draft",
      isRecurring: budget.isRecurring || false,
    });
    setDialogOpen(true);
    setMenuAnchor(null);
  };

  const getUsagePercentage = (spent: number, amount: number) => {
    if (!amount) return 0;
    return Math.min((spent / amount) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "pending_approval":
        return "warning";
      case "rejected":
        return "error";
      case "draft":
        return "default";
      case "archived":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle fontSize="small" />;
      case "pending_approval":
        return <Pending fontSize="small" />;
      case "rejected":
        return <Cancel fontSize="small" />;
      default:
        return <Pending fontSize="small" />;
    }
  };

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const matchesSearch =
        filters.search === "" ||
        budget.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        budget.category.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "all" || budget.status === filters.status;
      const matchesPeriod = filters.period === "all" || budget.period === filters.period;
      const matchesCategory = filters.category === "all" || budget.category === filters.category;
      return matchesSearch && matchesStatus && matchesPeriod && matchesCategory;
    });
  }, [budgets, filters]);

  const categoryChartData = useMemo(() => {
    if (!analytics?.categoryBreakdown) return [];
    return Object.entries(analytics.categoryBreakdown).map(([category, data]: [string, any]) => ({
      name: category,
      budgeted: data.budgeted,
      spent: data.spent,
      remaining: data.budgeted - data.spent,
    }));
  }, [analytics]);

  const varianceChartData = useMemo(() => {
    return varianceData.slice(0, 10).map((budget: any) => ({
      name: budget.name.length > 15 ? budget.name.substring(0, 15) + "..." : budget.name,
      budgeted: budget.amount,
      spent: budget.spent || 0,
      variance: budget.variance || 0,
    }));
  }, [varianceData]);

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Category",
      "Period",
      "Status",
      "Budgeted",
      "Spent",
      "Remaining",
      "Usage %",
      "Start Date",
      "End Date",
    ];
    const rows = filteredBudgets.map((budget) => [
      budget.name,
      budget.category,
      budget.period,
      budget.status || "draft",
      budget.amount,
      budget.spent || 0,
      (budget.amount || 0) - (budget.spent || 0),
      getUsagePercentage(budget.spent || 0, budget.amount || 0).toFixed(2),
      new Date(budget.startDate).toLocaleDateString(),
      new Date(budget.endDate).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budgets_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Budget data exported successfully",
      severity: "success",
    });
  };

  if (loading && !analytics) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Budget Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToCSV}
            disabled={filteredBudgets.length === 0}
          >
            Export
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Create Budget
          </Button>
        </Stack>
      </Stack>

      {/* Overview Stats */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FlatCard>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Budgeted
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {formatCurrency(analytics.totalBudgeted || 0)}
                    </Typography>
                  </Box>
                  <AccountBalance sx={{ fontSize: 40, opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FlatCard>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Spent
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="error.main">
                      {formatCurrency(analytics.totalSpent || 0)}
                    </Typography>
                  </Box>
                  <TrendingDown sx={{ fontSize: 40, opacity: 0.3, color: "error.main" }} />
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FlatCard>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Variance
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color={analytics.variance >= 0 ? "success.main" : "error.main"}
                    >
                      {formatUsd(analytics.variance || 0)}
                    </Typography>
                  </Box>
                  {analytics.variance >= 0 ? (
                    <TrendingUp sx={{ fontSize: 40, opacity: 0.3, color: "success.main" }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 40, opacity: 0.3, color: "error.main" }} />
                  )}
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FlatCard>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Utilization Rate
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {(analytics.utilizationRate || 0).toFixed(1)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={analytics.utilizationRate || 0}
                      color={analytics.utilizationRate > 90 ? "error" : analytics.utilizationRate > 75 ? "warning" : "success"}
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Assessment sx={{ fontSize: 40, opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Overview" icon={<BarChart />} iconPosition="start" />
          <Tab label="Budgets" icon={<AccountBalance />} iconPosition="start" />
          <Tab label="Analytics" icon={<Assessment />} iconPosition="start" />
          <Tab label="Variance Analysis" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <FlatCard>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Budget vs Actual
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={varianceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#0088FE" name="Budgeted" />
                    <Bar dataKey="spent" fill="#00C49F" name="Spent" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </FlatCard>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FlatCard>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Budget by Category
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        const { name, percent } = props;
                        return `${name}: ${((percent as number) * 100).toFixed(0)}%`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="budgeted"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </FlatCard>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Budgets Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search budgets..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="pending_approval">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={filters.period}
                  label="Period"
                  onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadData}
                size="small"
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <FlatCard>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Budgets ({filteredBudgets.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Budget Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Budgeted</TableCell>
                    <TableCell>Spent</TableCell>
                    <TableCell>Remaining</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBudgets.length > 0 ? (
                    filteredBudgets.map((budget: any) => {
                      const spent = budget.spent || 0;
                      const amount = budget.amount || 0;
                      const remaining = amount - spent;
                      const usage = getUsagePercentage(spent, amount);
                      const isOverBudget = spent > amount;

                      return (
                        <TableRow key={budget._id} hover>
                          <TableCell>
                            <Stack>
                              <Typography fontWeight={600}>{budget.name}</Typography>
                              {budget.department && (
                                <Typography variant="caption" color="text.secondary">
                                  {budget.department}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={budget.category} size="small" />
                          </TableCell>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {budget.period}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(budget.status || "draft") || undefined}
                              label={(budget.status || "draft").replace("_", " ")}
                              size="small"
                              color={getStatusColor(budget.status || "draft")}
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(amount)}</TableCell>
                          <TableCell>
                            <Typography color={isOverBudget ? "error.main" : "text.primary"}>
                              {formatCurrency(spent)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography color={remaining < 0 ? "error.main" : "success.main"}>
                              {formatUsd(remaining)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 120 }}>
                              <LinearProgress
                                variant="determinate"
                                value={usage}
                                color={usage > 100 ? "error" : usage > 80 ? "warning" : "success"}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {usage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setMenuAnchor(e.currentTarget);
                                setSelectedBudget(budget);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No budgets found. Create one to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </FlatCard>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <FlatCard>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Budget Utilization Trends
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={varianceChartData}>
                    <defs>
                      <linearGradient id="colorBudgeted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="budgeted"
                      stroke="#0088FE"
                      fillOpacity={1}
                      fill="url(#colorBudgeted)"
                      name="Budgeted"
                    />
                    <Area
                      type="monotone"
                      dataKey="spent"
                      stroke="#00C49F"
                      fillOpacity={1}
                      fill="url(#colorSpent)"
                      name="Spent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </FlatCard>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Variance Analysis Tab */}
      <TabPanel value={tabValue} index={3}>
        <FlatCard>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Budget Variance Analysis
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Budget Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Budgeted</TableCell>
                    <TableCell>Spent</TableCell>
                    <TableCell>Variance</TableCell>
                    <TableCell>Variance %</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {varianceData.length > 0 ? (
                    varianceData.map((budget: any) => {
                      const variance = budget.variance || 0;
                      const variancePercent = budget.variancePercentage || 0;
                      const isFavorable = variance > 0;

                      return (
                        <TableRow key={budget._id} hover>
                          <TableCell><Typography fontWeight={600}>{budget.name}</Typography></TableCell>
                          <TableCell>
                            <Chip label={budget.category} size="small" />
                          </TableCell>
                          <TableCell>{formatCurrency(budget.amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.spent || 0)}</TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {isFavorable ? (
                                <TrendingUp color="success" fontSize="small" />
                              ) : (
                                <TrendingDown color="error" fontSize="small" />
                              )}
                              <Typography
                                color={isFavorable ? "success.main" : "error.main"}
                                fontWeight={600}
                              >
                                {formatCurrency(Math.abs(variance))}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography
                              color={isFavorable ? "success.main" : "error.main"}
                              fontWeight={600}
                            >
                              {variancePercent > 0 ? "+" : ""}
                              {variancePercent.toFixed(2)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {Math.abs(variancePercent) > 10 ? (
                              <Chip
                                icon={<Warning />}
                                label="High Variance"
                                size="small"
                                color="warning"
                              />
                            ) : (
                              <Chip label="On Track" size="small" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No variance data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </FlatCard>
      </TabPanel>

      {/* Create/Edit Budget Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editBudget ? "Edit Budget" : "Create New Budget"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Budget Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={formData.period}
                    label="Period"
                    onChange={(e) =>
                      setFormData({ ...formData, period: e.target.value as any })
                    }
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending_approval">Pending Approval</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="Budget Amount"
              type="number"
              fullWidth
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Department"
                  fullWidth
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Project"
                  fullWidth
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
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
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
              }
              label="Recurring Budget"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editBudget ? "Update" : "Create"} Budget
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Budget</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{budgetToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => selectedBudget && handleEdit(selectedBudget)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {selectedBudget?.status === "pending_approval" && (
          <>
            <MenuItem
              onClick={() => selectedBudget && handleApprove(selectedBudget._id, true)}
            >
              <ListItemIcon>
                <CheckCircle fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText>Approve</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => selectedBudget && handleApprove(selectedBudget._id, false)}
            >
              <ListItemIcon>
                <Cancel fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Reject</ListItemText>
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={() => {
            if (selectedBudget) {
              setBudgetToDelete(selectedBudget);
              setDeleteDialogOpen(true);
            }
          }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
