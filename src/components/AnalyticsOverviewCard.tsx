'use client';

import React, { useEffect, useState } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';
import {
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  TrendingUpOutlined,
  AccountBalanceWalletOutlined,
  ShoppingCartOutlined,
  ReceiptOutlined,
  AttachMoneyOutlined,
  Inventory2Outlined,
  PointOfSaleOutlined,
} from '@mui/icons-material';
import { getOverviewAnalytics } from '@/lib/desktop/analytics-bridge';
import { formatUsdMagnitude } from '@/lib/format-currency';

const StatCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  borderRadius: 14,
  padding: theme.spacing(1.75),
  height: '100%',
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: theme.palette.primary.main,
    opacity: 0,
    transition: 'opacity 0.35s ease',
  },
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? `0 20px 60px ${alpha(theme.palette.primary.main, 0.3)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`
      : `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
    borderColor: alpha(theme.palette.primary.main, 0.3),
    '&::before': {
      opacity: 1,
    },
  },
}));

const IconWrapper = styled(Box)<{ color: string }>(({ color }) => ({
  width: 36,
  height: 36,
  borderRadius: 11,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: color,
  color: '#ffffff',
  transition: 'all 0.35s ease',
  '& svg': {
    fontSize: 18,
  },
}));

const TrendChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'trendUp',
})<{ trendUp: boolean }>(({ theme, trendUp }) => ({
  height: 24,
  fontSize: '0.75rem',
  fontWeight: 600,
  backgroundColor: trendUp
    ? alpha(theme.palette.success.main, 0.1)
    : alpha(theme.palette.error.main, 0.1),
  color: trendUp ? theme.palette.success.main : theme.palette.error.main,
  '& .MuiChip-avatar': {
    color: trendUp ? theme.palette.success.main : theme.palette.error.main,
    marginLeft: 4,
  },
}));

/***************************   OVERVIEW - CARDS  ***************************/

export default function AnalyticsOverviewCard() {
  const theme = useTheme();
  const [data, setData] = useState<{
    income: number;
    sales: number;
    expenses: number;
    revenue: number;
    orders: number;
    ordersThisMonth: number;
    posRevenue: number;
    posRevenueThisMonth: number;
    inventoryTotalItems: number;
    inventoryLowStock: number;
    inventoryOutOfStock: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverviewAnalytics().then((res) => {
      if (res.success && res.data) {
        const raw = res.data as Record<string, unknown>;
        setData({
          income: Number(raw.income) || 0,
          sales: Number(raw.sales) || 0,
          expenses: Number(raw.expenses) || 0,
          revenue: Number(raw.revenue) || 0,
          orders: Number(raw.orders) || 0,
          ordersThisMonth: Number(raw.ordersThisMonth) || 0,
          posRevenue: Number(raw.posRevenue) || 0,
          posRevenueThisMonth: Number(raw.posRevenueThisMonth) || 0,
          inventoryTotalItems: Number(raw.inventoryTotalItems) || 0,
          inventoryLowStock: Number(raw.inventoryLowStock) || 0,
          inventoryOutOfStock: Number(raw.inventoryOutOfStock) || 0,
        });
      }
      setLoading(false);
    });
  }, []);

  // Limited palette: green (first), red, warning, and a couple of cool colors for card icons
  const cards = data
    ? [
        {
          title: 'Income',
          value: formatUsdMagnitude(data.income),
          compare: 'Payments received',
          trend: '—',
          trendUp: true,
          icon: <AccountBalanceWalletOutlined />,
          color: '#0AA775',
        },
        {
          title: 'Sales',
          value: formatUsdMagnitude(data.sales),
          compare: 'Invoices + POS',
          trend: '—',
          trendUp: true,
          icon: <ShoppingCartOutlined />,
          color: '#ed6c02',
        },
        {
          title: 'Expenses',
          value: formatUsdMagnitude(data.expenses),
          compare: 'Approved expenses',
          trend: '—',
          trendUp: false,
          icon: <ReceiptOutlined />,
          color: '#d32f2f',
        },
        {
          title: 'Revenue',
          value: formatUsdMagnitude(data.revenue),
          compare: 'Total revenue',
          trend: '—',
          trendUp: true,
          icon: <AttachMoneyOutlined />,
          color: '#0288d1',
        },
        {
          title: 'Inventory',
          value: data.inventoryTotalItems.toString(),
          compare: `${data.inventoryLowStock} low stock, ${data.inventoryOutOfStock} out`,
          trend: '—',
          trendUp: data.inventoryOutOfStock === 0,
          icon: <Inventory2Outlined />,
          color: '#00897b',
        },
        {
          title: 'POS Orders',
          value: data.orders.toString(),
          compare: `${data.ordersThisMonth} this month · ${formatUsdMagnitude(data.posRevenueThisMonth)}`,
          trend: '—',
          trendUp: true,
          icon: <PointOfSaleOutlined />,
          color: '#1976d2',
        },
      ]
    : [];

  return (
    <Grid container spacing={{ xs: 1.25, md: 1.5 }}>
      {loading
        ? [1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard>
                <Stack spacing={1.25}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Skeleton variant="rounded" width={36} height={36} />
                    <Skeleton variant="rounded" width={60} height={24} />
                  </Box>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="80%" height={40} />
                  <Skeleton variant="text" width="70%" />
                </Stack>
              </StatCard>
            </Grid>
          ))
        : cards.map((item, index) => (
            <Grid key={index} size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard
                sx={{
                  '&:hover': {
                    [`& .icon-wrapper`]: {
                      transform: 'scale(1.06)',
                    },
                  },
                }}
              >
                <Stack spacing={1.25}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <IconWrapper color={item.color} className="icon-wrapper">
                      {item.icon}
                    </IconWrapper>
                    {item.trend !== '—' && (
                      <TrendChip
                        trendUp={item.trendUp}
                        avatar={item.trendUp ? <ArrowUpwardOutlined fontSize="small" /> : <ArrowDownwardOutlined fontSize="small" />}
                        label={item.trend}
                        size="small"
                      />
                    )}
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.68rem',
                        mb: 0.25,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.text.primary,
                        lineHeight: 1.2,
                        mb: 0.3,
                      }}
                    >
                      {item.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: '0.63rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.35,
                      }}
                    >
                      <TrendingUpOutlined sx={{ fontSize: 12, opacity: 0.6 }} />
                      {item.compare}
                    </Typography>
                  </Box>
                </Stack>
              </StatCard>
            </Grid>
          ))}
    </Grid>
  );
}
