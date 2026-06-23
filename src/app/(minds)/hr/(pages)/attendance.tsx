"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Grid,
  TextField,
  Button,
  alpha,
  styled,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  AccessTime,
  CheckCircle,
  Cancel,
  Refresh,
  Download,
  Search,
  CalendarToday,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getMembers } from "@/lib/desktop/users-bridge";
import { FlatCard } from "@/components/FlatCard";

export default function AttendanceTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.publicMetadata?.companyId) return;
    setLoading(true);
    try {
      const membersRes = await getMembers();
      if (membersRes?.aye) {
        setEmployees(membersRes.aye || []);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp: any) =>
    searchQuery === '' ||
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock attendance data - in real app, this would come from database
  const attendanceStats = {
    present: Math.floor(employees.length * 0.85),
    absent: Math.floor(employees.length * 0.10),
    onLeave: Math.floor(employees.length * 0.05),
    late: Math.floor(employees.length * 0.08),
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading attendance data...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Attendance Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage employee attendance records
      </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} sx={{ borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Present Today
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {attendanceStats.present}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
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
                    Absent
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="error.main">
                    {attendanceStats.absent}
                  </Typography>
                </Box>
                <Cancel sx={{ fontSize: 40, color: 'error.main' }} />
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
                    On Leave
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="warning.main">
                    {attendanceStats.onLeave}
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 40, color: 'warning.main' }} />
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
                    Late Arrivals
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="info.main">
                    {attendanceStats.late}
                  </Typography>
                </Box>
                <AccessTime sx={{ fontSize: 40, color: 'info.main' }} />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Search */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Today's Attendance ({new Date(selectedDate).toLocaleDateString()})
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Employee</strong></TableCell>
                  <TableCell><strong>Check In</strong></TableCell>
                  <TableCell><strong>Check Out</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Hours</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No employees found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.slice(0, 10).map((emp: any) => {
                    // Mock attendance data
                    const isPresent = Math.random() > 0.2;
                    const checkIn = isPresent ? '09:00 AM' : null;
                    const checkOut = isPresent ? '05:30 PM' : null;
                    const status = isPresent ? 'Present' : Math.random() > 0.5 ? 'Absent' : 'On Leave';
                    
                    return (
                      <TableRow key={emp._id?.toString() || emp.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {(emp.name || emp.email || 'U').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {emp.name || emp.firstName || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {emp.department || 'Unassigned'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {checkIn || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {checkOut || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={status}
                            size="small"
                            color={
                              status === 'Present' ? 'success' :
                              status === 'Absent' ? 'error' : 'warning'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {isPresent ? '8.5 hrs' : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
