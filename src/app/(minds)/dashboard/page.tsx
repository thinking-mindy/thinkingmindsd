/* eslint-disable react/no-unescaped-entities */
'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Grid,
  Stack,
  Typography,
  alpha,
  styled,
  CircularProgress,
} from '@mui/material';
import {
  ArrowRightAltOutlined,
  HomeOutlined,
  Groups2Outlined,
  Inventory2Outlined,
  ComputerOutlined,
  AttachMoneyOutlined,
  HelpOutlineOutlined,
  PeopleAltOutlined,
  PaidOutlined,
  ShoppingCartOutlined,
  PointOfSaleOutlined,
  ListAltOutlined,
} from '@mui/icons-material';
import { useUser } from '@/lib/auth/client';
import Link from 'next/link';
import LockOutlined from '@mui/icons-material/LockOutlined';
import AnalyticsOverviewCard from '@/components/AnalyticsOverviewCard';
import AnalyticsTopRef from '@/components/AnalyticsTopRef';
import { useAccessControl } from '@/hooks/useAccessControl';

const QuickLinkCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  transition: 'all 0.25s ease',
  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0,
    transition: 'opacity 0.25s ease',
    background: theme.palette.primary.main,
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
    borderColor: alpha(theme.palette.primary.main, 0.35),
    '&::before': {
      opacity: 1,
    },
  },
}));

const primaryMenu = [
  { title: 'HR Management', subtitle: 'Talent & engagement', icon: Groups2Outlined, path: '/hr', color: '#667eea' },
  { title: 'Inventory', subtitle: 'Track stock & orders', icon: Inventory2Outlined, path: '/inventory', color: '#4facfe' },
  { title: 'POS', subtitle: 'Point of sale', icon: PointOfSaleOutlined, path: '/pos', color: '#2e7d32' },
  { title: 'Cashier', subtitle: 'Record payments', icon: PointOfSaleOutlined, path: '/cashier', color: '#00897b' },
  { title: 'IT Management', subtitle: 'Devices & access', icon: ComputerOutlined, path: '/it', color: '#2196f3' },
  { title: 'Finance', subtitle: 'Billing & cashflow', icon: AttachMoneyOutlined, path: '/finance', color: '#81c784' },
  { title: 'Helpdesk', subtitle: 'Conversations & SLAs', icon: HelpOutlineOutlined, path: '/helpdesk', color: '#ff9800' },
  { title: 'CRM', subtitle: 'Lifecycle & health', icon: PeopleAltOutlined, path: '/crm', color: '#9c27b0' },
  { title: 'Payroll', subtitle: 'Run payroll in 2 clicks', icon: PaidOutlined, path: '/payroll', color: '#00bcd4' },
  { title: 'Procurement', subtitle: 'Vendors & contracts', icon: ShoppingCartOutlined, path: '/procurement', color: '#e91e63' },
];

export default function DashboardHomePage() {
  const { user } = useUser();
  const { isReady, hasAssignedModules, canAccess } = useAccessControl();

  const visibleMenu = primaryMenu.filter((item) => canAccess(item.path));
  const showTasks = canAccess('/tasks');
  const showHelpdesk = canAccess('/helpdesk');

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { sm: '100%', md: 1700 },
        mx: 'auto',
        py: 3,
        px: { xs: 2, md: 3 },
      }}
    >
      <Stack spacing={2.5}>
        <Card
          variant="outlined"
          sx={(t) => ({
            borderRadius: 3,
            p: { xs: 1.5, md: 1.75 },
            borderColor: alpha(t.palette.primary.main, 0.2),
            bgcolor: alpha(t.palette.primary.main, 0.06),
          })}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Dashboard
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.75 }}>
                Welcome back{user?.firstName ? `, ${user.firstName}` : ''}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.35 }}>
                Quick executive overview + fast navigation to your workspaces.
              </Typography>
            </Box>
            {(showTasks || showHelpdesk) && (
              <Stack direction="row" spacing={0.8}>
                {showTasks && (
                  <Button
                    component={Link}
                    href="/tasks"
                    variant="contained"
                    startIcon={<ArrowRightAltOutlined />}
                    size="small"
                    sx={{ textTransform: 'none', fontWeight: 700, minHeight: 30, px: 1.25 }}
                  >
                    Open Tasks
                  </Button>
                )}
                {showHelpdesk && (
                  <Button
                    component={Link}
                    href="/helpdesk"
                    variant="outlined"
                    startIcon={<HelpOutlineOutlined />}
                    size="small"
                    sx={{ textTransform: 'none', fontWeight: 700, minHeight: 30, px: 1.25 }}
                  >
                    Support
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Card>

        {!hasAssignedModules && (
          <Card
            variant="outlined"
            sx={(t) => ({
              borderRadius: 3,
              p: { xs: 3, md: 4 },
              textAlign: 'center',
              borderColor: alpha(t.palette.warning.main, 0.35),
              bgcolor: alpha(t.palette.warning.main, 0.06),
            })}
          >
            <Box
              sx={(t) => ({
                width: 56,
                height: 56,
                borderRadius: 2,
                mx: 'auto',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(t.palette.warning.main, 0.12),
                color: 'warning.dark',
              })}
            >
              <LockOutlined />
            </Box>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              No modules assigned
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              Your account is active, but you don&apos;t have access to any workspaces yet. Ask your organisation
              owner to assign modules in the Administration panel.
            </Typography>
          </Card>
        )}

        {hasAssignedModules && <AnalyticsOverviewCard />}

        {hasAssignedModules && visibleMenu.length > 0 && (
        <Box>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                quick navigation
              </Typography>
              <Typography variant="subtitle1" fontWeight={800}>
                Launch the right workspace faster
              </Typography>
            </Box>
            <Chip
              icon={<HomeOutlined />}
              label="Your modules"
              variant="outlined"
              sx={{ fontWeight: 700, borderRadius: 2 }}
            />
          </Stack>

          <Grid container spacing={1.5}>
            {visibleMenu.map((item) => {
              const IconComponent = item.icon;
              return (
                <Grid key={item.title} size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }}>
                  <QuickLinkCard>
                    <CardActionArea
                      component={Link}
                      href={item.path}
                      sx={{
                        p: 1.5,
                        height: '100%',
                        '&:hover .icon-container': { transform: 'scale(1.05)' },
                        '&:hover .arrow-icon': { transform: 'translateX(2px)' },
                      }}
                    >
                      <Stack spacing={1.25} sx={{ height: '100%' }}>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
                          <Box
                            className="icon-container"
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: '#0AA775',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: (t) => `0 4px 12px ${alpha('#0AA775', 0.35)}`,
                              transition: 'all 0.25s ease',
                            }}
                          >
                            <IconComponent sx={{ fontSize: 20 }} />
                          </Box>
                          <Chip
                            size="small"
                            label="Live"
                            sx={{
                              bgcolor: alpha(item.color, 0.1),
                              color: item.color,
                              fontWeight: 700,
                              border: `1px solid ${alpha(item.color, 0.3)}`,
                              height: 20,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Stack>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25, fontSize: '0.875rem' }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                            {item.subtitle}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ pt: 0.75, borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}` }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            Explore
                          </Typography>
                          <ArrowRightAltOutlined
                            className="arrow-icon"
                            sx={{ fontSize: 16, color: item.color, transition: 'transform 0.2s ease' }}
                          />
                        </Stack>
                      </Stack>
                    </CardActionArea>
                  </QuickLinkCard>
                </Grid>
              );
            })}
          </Grid>
        </Box>
        )}

        {hasAssignedModules && <AnalyticsTopRef />}
      </Stack>
    </Box>
  );
}

