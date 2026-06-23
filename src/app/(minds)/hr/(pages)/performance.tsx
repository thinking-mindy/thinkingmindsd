"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Grid,
  Rating,
  TextField,
  alpha,
  styled,
  CircularProgress,
  Avatar,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp,
  Star,
  Search,
  Refresh,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { getMembers } from "@/lib/desktop/users-bridge";
import { FlatCard } from "@/components/FlatCard";

export default function PerformanceTab() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp: any) =>
    searchQuery === '' ||
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock performance ratings - in real app, this would come from database
  const getPerformanceRating = (emp: any) => {
    // Generate consistent rating based on employee ID
    const seed = (emp._id?.toString() || emp.id || '').length;
    return 3 + (seed % 3) * 0.5; // Ratings between 3.0 and 4.5
  };

  const averageRating = employees.length > 0
    ? employees.reduce((sum, emp) => sum + getPerformanceRating(emp), 0) / employees.length
    : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading performance data...
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
            Performance Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and evaluate employee performance
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 250 }}
          />
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average Rating
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {averageRating.toFixed(1)}
                  </Typography>
                  <Rating value={averageRating} precision={0.1} readOnly size="small" sx={{ mt: 1 }} />
                </Box>
                <Star sx={{ fontSize: 40, color: 'primary.main' }} />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Employees
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="info.main">
                    {employees.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Performance tracked
      </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Top Performers
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {employees.filter(emp => getPerformanceRating(emp) >= 4).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Rating ≥ 4.0
                  </Typography>
                </Box>
                <Star sx={{ fontSize: 40, color: 'success.main' }} />
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      {/* Performance List */}
      <Grid container spacing={3}>
        {filteredEmployees.slice(0, 12).map((emp: any) => {
          const rating = getPerformanceRating(emp);
          const progress = (rating / 5) * 100;
          
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={emp._id?.toString() || emp.id}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                        {(emp.name || emp.email || 'U').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {emp.name || emp.firstName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.department || 'Unassigned'}
                        </Typography>
      </Box>
                    </Stack>
      <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Performance Rating
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          {rating.toFixed(1)}
                        </Typography>
                      </Stack>
                      <Rating value={rating} precision={0.1} readOnly size="small" />
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ 
                          mt: 1, 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: alpha('#000', 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: rating >= 4 ? 'success.main' :
                                     rating >= 3 ? 'warning.main' :
                                     'error.main',
                          },
                        }} 
                      />
                    </Box>
                    <Chip
                      label={rating >= 4 ? 'Top Performer' : rating >= 3.5 ? 'Good' : 'Needs Improvement'}
                      size="small"
                      color={rating >= 4 ? 'success' : rating >= 3.5 ? 'warning' : 'error'}
                      variant="outlined"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      </Box>
  );
}
