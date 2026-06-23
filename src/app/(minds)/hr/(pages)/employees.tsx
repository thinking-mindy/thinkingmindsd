"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
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
  Avatar,
  TablePagination,
  Paper,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  Visibility,
  Email,
  Phone,
  Business,
  Person,
  Download,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getMembers } from "@/lib/desktop/users-bridge";
import { FlatCard, statIconSx } from "@/components/FlatCard";

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

export default function EmployeesTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

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
      console.error('Error loading employees:', error);
      setSnackbar({ open: true, message: 'Failed to load employees', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((emp: any) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.role?.toLowerCase().includes(query)
      );
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter((emp: any) => emp.department === departmentFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((emp: any) => emp.role === roleFilter);
    }

    return filtered;
  }, [employees, searchQuery, departmentFilter, roleFilter]);

  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredEmployees, page, rowsPerPage]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map((emp: any) => emp.department).filter(Boolean));
    return Array.from(depts);
  }, [employees]);

  const roles = useMemo(() => {
    const roleSet = new Set(employees.map((emp: any) => emp.role).filter(Boolean));
    return Array.from(roleSet);
  }, [employees]);

  const handleView = (emp: any) => {
    setSelectedEmployee(emp);
    setViewDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'default';
    }
  };

  const exportToCSV = () => {
    const csvRows: string[] = [];
    csvRows.push('Employee Report');
    csvRows.push(`Generated: ${new Date().toLocaleDateString()}`);
    csvRows.push('');
    csvRows.push('Name,Email,Role,Department,Status');
    filteredEmployees.forEach((emp: any) => {
      csvRows.push(
        `${emp.name || 'N/A'},${emp.email || 'N/A'},${emp.role || 'N/A'},${emp.department || 'N/A'},${emp.status || 'active'}`
      );
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Employee report exported successfully', severity: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Loading employees...
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
            Employee Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'} found
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} sx={{ borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToCSV}
            sx={{ borderRadius: 2 }}
          >
            Export
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <FlatCard sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, department, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </FlatCard>

      {/* Employees Table */}
      <FlatCard>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Employee</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Department</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Stack spacing={2} alignItems="center">
                        <Person sx={{ fontSize: 48, color: 'text.secondary' }} />
                        <Typography variant="body1" color="text.secondary">
                          No employees found
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((emp: any) => (
                    <StyledTableRow key={emp._id?.toString() || emp.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                            {(emp.name || emp.email || 'U').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {emp.name || emp.firstName || 'Unknown'}
                            </Typography>
                            {emp.email && (
                              <Typography variant="caption" color="text.secondary">
                                {emp.email}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {emp.email || 'N/A'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={emp.role || 'user'}
                          size="small"
                          color={getRoleColor(emp.role) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {emp.department || 'Unassigned'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={emp.status || 'active'}
                          size="small"
                          color={emp.status === 'active' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleView(emp)}
                            >
                              <Visibility fontSize="small" />
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
          <TablePagination
            component="div"
            count={filteredEmployees.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </FlatCard>

      {/* View Employee Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={statIconSx('neutral')}>
              <Person sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Employee Details</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                  {(selectedEmployee.name || selectedEmployee.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedEmployee.name || selectedEmployee.firstName || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.email || 'N/A'}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Role</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedEmployee.role || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedEmployee.department || 'Unassigned'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedEmployee.status || 'active'}
                    size="small"
                    color={selectedEmployee.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Employee ID</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedEmployee._id?.toString().slice(-8) || selectedEmployee.id || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ borderRadius: 2 }}>
            Close
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
