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
  Chip,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useUser } from "@/lib/auth/client";
import { getMembers } from "@/lib/desktop/users-bridge";
import { getPayrollRecordsByOrg } from "@/lib/desktop/payroll-bridge";
import { FlatCard } from "@/components/FlatCard";

const COLORS = ['#2e7d32', '#ed6c02', '#d32f2f', '#757575', '#388e3c', '#f57c00', '#c62828'];

export default function AnalyticsTab() {
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
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const departmentData = useMemo(() => {
    const deptMap: Record<string, number> = {};
    employees.forEach((emp: any) => {
      const dept = emp.department || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    return Object.entries(deptMap).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const roleData = useMemo(() => {
    const roleMap: Record<string, number> = {};
    employees.forEach((emp: any) => {
      const role = emp.role || 'user';
      roleMap[role] = (roleMap[role] || 0) + 1;
    });
    return Object.entries(roleMap).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [employees]);

  const payrollByMonth = useMemo(() => {
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
        month: new Date(month).toLocaleDateString('en-US', { month: 'short' }),
        amount,
      }));
  }, [payrollRecords]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading analytics...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 4 }}>
        HR Analytics & Insights
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Employee Distribution by Department
                </Typography>
                <Chip label="Departments" size="small" variant="outlined" />
              </Stack>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
                    data={departmentData}
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
                    {departmentData.map((entry, index) => (
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
                  Employee Distribution by Role
                </Typography>
                <Chip label="Roles" size="small" variant="outlined" />
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.1)} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <RechartsTooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#2e7d32"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Payroll Trend (Last 6 Months)
                </Typography>
                <Chip label="Payroll" size="small" variant="outlined" />
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payrollByMonth}>
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
                    formatter={(value: number) => 
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
                    }
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#2e7d32"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>
    </Box>
  );
}
