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
  Chip,
} from "@mui/material";
import {
  People,
  Business,
  EventBusy,
  AttachMoney,
  TrendingUp,
  Schedule,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getMembers } from "@/lib/desktop/users-bridge";
import { getPayrollRecordsByOrg } from "@/lib/desktop/payroll-bridge";
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
import { FlatCard, statIconSx } from "@/components/FlatCard";

export default function DashboardTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.publicMetadata?.companyId) return;
    setLoading(true);
    try {
      const orgId = user.publicMetadata.companyId as string;
      const [membersRes, payrollRes] = await Promise.all([
        getMembers(),
        getPayrollRecordsByOrg(orgId),
      ]);

      if (membersRes?.aye) {
        setEmployees(membersRes.aye || []);
      }
      if (payrollRes.success) {
        setPayrollRecords(payrollRes.data || []);
      }
    } catch (error) {
      console.error('Error loading HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const kpis = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((emp: any) => emp.status !== 'inactive').length;
    const departments = new Set(employees.map((emp: any) => emp.department || 'Unassigned')).size;
    
    const totalPayroll = payrollRecords.reduce((sum, record) => sum + (record.net || 0), 0);
    const monthlyPayroll = payrollRecords
      .filter((r: any) => {
        const recordDate = new Date(r.createdAt || r.payPeriod);
        const now = new Date();
        return recordDate.getMonth() === now.getMonth() && 
               recordDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, record) => sum + (record.net || 0), 0);

    const roleDistribution = employees.reduce((acc: Record<string, number>, emp: any) => {
      const role = emp.role || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEmployees,
      activeEmployees,
      departments,
      totalPayroll,
      monthlyPayroll,
      roleDistribution,
    };
  }, [employees, payrollRecords]);

  const roleChartData = useMemo(() => {
    return Object.entries(kpis.roleDistribution).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
    }));
  }, [kpis.roleDistribution]);

  const payrollTrendData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    payrollRecords.forEach((record: any) => {
      const date = new Date(record.createdAt || record.payPeriod);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (record.net || 0);
    });
    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, amount]) => ({
        month: new Date(month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount,
      }));
  }, [payrollRecords]);

  const COLORS = ['#2e7d32', '#ed6c02', '#d32f2f', '#757575', '#388e3c', '#f57c00'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Loading HR dashboard...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('neutral')}>
                  <People sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Total Employees
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                {kpis.totalEmployees}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  {kpis.activeEmployees} active
                </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={statIconSx('safe')}>
                  <Business sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Departments
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                {kpis.departments}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Business fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  Active departments
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
                  <EventBusy sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Active Leaves
              </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mb: 1 }}>
                0
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Schedule fontSize="small" color="warning" />
                <Typography variant="caption" color="text.secondary">
                  This month
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
                  <AttachMoney sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Monthly Payroll
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                {formatCurrency(kpis.monthlyPayroll)}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp fontSize="small" color="info" />
                <Typography variant="caption" color="text.secondary">
                  Total: {formatCurrency(kpis.totalPayroll)}
                </Typography>
              </Stack>
            </CardContent>
          </FlatCard>
      </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Role Distribution
                </Typography>
                <Chip icon={<People />} label="Employees" size="small" variant="outlined" />
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={alpha('#fff', 0.8)}
                    strokeWidth={2}
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Payroll Trend
                </Typography>
                <Chip icon={<TrendingUp />} label="6 Months" size="small" variant="outlined" />
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={payrollTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.1)} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
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
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#2e7d32"
                    strokeWidth={3}
                    dot={{ fill: '#2e7d32', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
      </Grid>
      </Grid>
    </Box>
  );
}
