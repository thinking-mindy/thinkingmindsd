"use client";

import {
  Grid,
  Box,
  CircularProgress,
  Paper,
  Typography,
  alpha,
  styled,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Inventory2Outlined,
  AttachMoneyOutlined,
  WarningAmberOutlined,
  ShoppingCartOutlined,
  TrendingUpOutlined,
  CategoryOutlined,
  LocationOnOutlined,
  CheckCircleOutlined,
} from "@mui/icons-material";
import { getAllInventoryItems } from "@/lib/desktop/inventory-bridge";
import { getPOSOrders, getMenuItems } from "@/lib/desktop/pos-bridge";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import { FlatCard, statIconSx, type StatTone } from "@/components/FlatCard";

const AlertCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
  backgroundColor: alpha(theme.palette.warning.main, 0.05),
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    transform: 'translateX(4px)',
  },
}));

export default function DashboardTab() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    stockValue: 0,
    lowStockAlerts: 0,
    totalQuantity: 0,
    outOfStock: 0,
    averagePrice: 0,
    itemsInPOS: 0,
    totalSales: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [inventoryResult, ordersResult, menuItemsResult] = await Promise.all([
        getAllInventoryItems(),
        getPOSOrders(100),
        getMenuItems(),
      ]);

      if (inventoryResult.success && inventoryResult.data) {
        const items = inventoryResult.data;
        const totalProducts = items.length;
        const stockValue = items.reduce((sum: number, item: any) => {
          return sum + ((item.price || 0) * (item.quantity || 0));
        }, 0);
        const lowStockAlerts = items.filter((item: any) => {
          return item.reorderLevel && item.quantity <= item.reorderLevel;
        });
        const outOfStock = items.filter((item: any) => (item.quantity || 0) === 0);
        const totalQuantity = items.reduce((sum: number, item: any) => {
          return sum + (item.quantity || 0);
        }, 0);
        const itemsWithPrice = items.filter((item: any) => item.price > 0);
        const averagePrice =
          itemsWithPrice.length > 0
            ? itemsWithPrice.reduce((sum: number, item: any) => sum + (item.price || 0), 0) /
              itemsWithPrice.length
            : 0;

        // Get items in POS
        const itemsInPOS = menuItemsResult.success && menuItemsResult.data
          ? menuItemsResult.data.length
          : 0;

        // Calculate total sales from orders
        const totalSales = ordersResult.success && ordersResult.data
          ? ordersResult.data
              .filter((order: any) => order.status === 'completed')
              .reduce((sum: number, order: any) => sum + (order.total || 0), 0)
          : 0;

        setStats({
          totalProducts,
          stockValue,
          lowStockAlerts: lowStockAlerts.length,
          totalQuantity,
          outOfStock: outOfStock.length,
          averagePrice,
          itemsInPOS,
          totalSales,
        });

        // Set low stock items (sorted by urgency)
        const sortedLowStock = [...lowStockAlerts].sort((a: any, b: any) => {
          const aRatio = a.quantity / (a.reorderLevel || 1);
          const bRatio = b.quantity / (b.reorderLevel || 1);
          return aRatio - bRatio;
        });
        setLowStockItems(sortedLowStock.slice(0, 5));

        // Set recent items (last 5 added)
        const sortedByDate = [...items].sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setRecentItems(sortedByDate.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: <Inventory2Outlined />,
      warning: false,
    },
    {
      title: 'Stock Value',
      value: formatCurrency(stats.stockValue),
      icon: <AttachMoneyOutlined />,
      warning: false,
    },
    {
      title: 'Low Stock Alerts',
      value: stats.lowStockAlerts,
      icon: <WarningAmberOutlined />,
      warning: stats.lowStockAlerts > 0,
    },
    {
      title: 'Total Quantity',
      value: stats.totalQuantity.toLocaleString(),
      icon: <ShoppingCartOutlined />,
      warning: false,
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock,
      icon: <TrendingUpOutlined />,
      error: stats.outOfStock > 0,
    },
    {
      title: 'Average Price',
      value: formatCurrency(stats.averagePrice),
      icon: <CategoryOutlined />,
      warning: false,
    },
    {
      title: 'Items in POS',
      value: stats.itemsInPOS,
      icon: <ShoppingCartOutlined />,
      warning: false,
    },
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: <AttachMoneyOutlined />,
      warning: false,
    },
  ];

  return (
    <Box>
      <TabToolbar
        title="Overview"
        subtitle="Quick snapshot of inventory health and recent activity"
        chips={
          <>
            <StatChip icon={<Inventory2Outlined />} label={`${stats.totalProducts} products`} />
            <StatChip icon={<AttachMoneyOutlined />} label={formatCurrency(stats.stockValue)} color="success" />
            {stats.lowStockAlerts > 0 && (
              <StatChip icon={<WarningAmberOutlined />} label={`${stats.lowStockAlerts} low stock`} color="warning" />
            )}
            {stats.outOfStock > 0 && (
              <StatChip icon={<TrendingUpOutlined />} label={`${stats.outOfStock} out`} color="error" />
            )}
          </>
        }
      />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 1.5 }} key={index}>
            <FlatCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={statIconSx(
                    (card.error ? 'danger' : card.warning ? 'warning' : 'neutral') as StatTone
                  )}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '1.1rem' }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                  {card.title}
                </Typography>
                {card.warning && (
                  <Chip label="Action" size="small" color="warning" variant="outlined" sx={{ mt: 1, height: 20, fontSize: '0.65rem' }} />
                )}
                {card.error && (
                  <Chip label="Critical" size="small" color="error" variant="outlined" sx={{ mt: 1, height: 20, fontSize: '0.65rem' }} />
                )}
              </Box>
            </FlatCard>
      </Grid>
        ))}
      </Grid>

      {/* Low Stock Alerts & Recent Items */}
      <Grid container spacing={3}>
        {/* Low Stock Alerts */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={statIconSx('warning')}>
                <WarningAmberOutlined sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Low Stock Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Items that need restocking
                </Typography>
              </Box>
            </Box>

            {lowStockItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleOutlined sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  All items are well stocked!
                </Typography>
              </Box>
            ) : (
              <List>
                {lowStockItems.map((item: any, index: number) => {
                  const stockRatio = item.quantity / (item.reorderLevel || 1);
                  return (
                    <Box key={item._id?.toString() || index}>
                      <ListItem
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.05),
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.1),
                          },
                        }}
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2),
                              color: 'warning.main',
                            }}
                          >
                            <Inventory2Outlined />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {item.quantity} / {item.reorderLevel} units
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (stockRatio * 100))}
                                color="warning"
                                sx={{ mt: 1, borderRadius: 1, height: 6 }}
                              />
                            </Box>
                          }
                        />
                        {item.location && (
                          <Chip
                            icon={<LocationOnOutlined sx={{ fontSize: 16 }} />}
                            label={item.location}
                            size="small"
                            sx={{ ml: 2 }}
                          />
                        )}
                      </ListItem>
                      {index < lowStockItems.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Items */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={statIconSx('neutral')}>
                <TrendingUpOutlined sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Items
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Latest inventory additions
                </Typography>
              </Box>
            </Box>

            {recentItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Inventory2Outlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No recent items
                </Typography>
              </Box>
            ) : (
              <List>
                {recentItems.map((item: any, index: number) => (
                  <Box key={item._id?.toString() || index}>
                    <ListItem
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        '&:hover': {
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <ListItemIcon>
                        <Avatar
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                            color: 'primary.main',
                          }}
                        >
                          <CategoryOutlined />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Qty: {item.quantity || 0}
                            </Typography>
                            {item.price && (
                              <Typography variant="caption" color="text.secondary">
                                Price: {formatCurrency(item.price)}
                              </Typography>
                            )}
                            {item.sku && (
                              <Typography variant="caption" color="text.secondary">
                                SKU: {item.sku}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentItems.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
      </Grid>
      </Grid>
    </Box>
  );
}
