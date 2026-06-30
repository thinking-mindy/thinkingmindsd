"use client"
import React, { useMemo, useState, useEffect } from "react";
import {
  IconButton,
  Box,
  Paper,
  InputBase,
  Button,
  Divider,
  Typography,
  alpha,
  styled,
  CircularProgress,
  Chip,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MenuItemCard from "./components/MenuItemCard";
import OrderSidebar from "./components/OrderSidebar";
import { MenuCategory, MenuItem } from "./types";
import { ShoppingCartCheckoutOutlined, ArrowDownward, ArrowUpward, PointOfSaleOutlined, VerifiedUserOutlined } from "@mui/icons-material";
import OrderHistory from "./components/OrderHistory";
import RegisterDialog from "./components/RegisterDialog";
import FiscalSettingsDialog from "./components/FiscalSettingsDialog";
import { getAllInventoryItems } from "@/lib/desktop/inventory-bridge";
import { normalizeDocumentId } from "@/lib/document-id";

const SearchContainer = styled(Paper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  padding: theme.spacing(1.5, 2.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
    transform: 'translateY(-1px)',
  },
}));

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  width: '100%',
  overflow: 'hidden',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.default} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.03)} 0%, ${theme.palette.background.default} 100%)`,
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  position: 'relative',
}));

const ProductsSection = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: theme.spacing(3),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.2),
    borderRadius: '4px',
    '&:hover': {
      background: alpha(theme.palette.primary.main, 0.3),
    },
  },
}));

const SidebarContainer = styled(Box)<{ minimized?: boolean }>(({ theme, minimized }) => ({
  flexShrink: 0,
  width: '420px',
  borderLeft: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.95)
    : alpha(theme.palette.background.paper, 0.98),
  backdropFilter: 'blur(20px)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'visible',
  position: 'relative',
  transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  [theme.breakpoints.down('md')]: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: minimized ? '60px' : '50vh',
    borderLeft: 'none',
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
    zIndex: 1000,
    boxShadow: `0 -4px 20px ${alpha(theme.palette.common.black, 0.1)}`,
    overflow: 'visible',
  },
}));

const MinimizeButton = styled(IconButton)<{ minimized?: boolean }>(({ theme, minimized }) => ({
  position: 'absolute',
  top: -24,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: theme.palette.background.paper,
  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
  zIndex: 1001,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.2)}`,
    transform: 'translateX(-50%) translateY(-2px)',
  },
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'flex',
  },
}));

export default function POSPage() {
  const theme = useTheme();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  const loadInventoryProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const itemsRes = await getAllInventoryItems();

      if (itemsRes.success && itemsRes.data) {
        const sellableItems = itemsRes.data.filter((item: any) =>
          item.price && item.price > 0
        );

        const locationMap = new Map<string, { id: string; title: string; itemsCount: number }>();
        locationMap.set('all', { id: 'all', title: 'All Items', itemsCount: sellableItems.length });

        sellableItems.forEach((item: any) => {
          const locName = item.location || 'No location';
          if (!locationMap.has(locName)) {
            locationMap.set(locName, { id: locName, title: locName, itemsCount: 0 });
          }
          locationMap.get(locName)!.itemsCount++;
        });

        const locs = Array.from(locationMap.values()).sort((a, b) => {
          if (a.id === 'all') return -1;
          if (b.id === 'all') return 1;
          if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
          return a.title.localeCompare(b.title);
        });
        setCategories(locs);

        setSelectedCategory((current) => current ?? (locs.length > 0 ? 'all' : null));

        const items = sellableItems.map((item: any) => ({
          id: normalizeDocumentId(item._id),
          name: item.name,
          price: item.price || 0,
          img: item.imageUrl || "",
          categoryId: item.location || 'No location',
          sku: item.sku,
          quantity: Number(item.quantity) || 0,
        }));

        setMenuItems(items);
      } else {
        setCategories([]);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching inventory items for POS:', error);
      setCategories([]);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inventory items from database and use them as POS items
  useEffect(() => {
    void loadInventoryProducts();
  }, [loadInventoryProducts]);

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const availableQty = Math.max(0, item.quantity || 0);
      const nextQty = (existing?.qty || 0) + 1;
      if (nextQty > availableQty) {
        return prev;
      }
      return {
        ...prev,
        [item.id]: {
          item,
          qty: nextQty,
        },
      };
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, qty: existing.qty - 1 },
      };
    });
  };

  const clearCart = () => setCart({});
  const loadCart = (next: Record<string, { item: MenuItem; qty: number }>) => setCart(next);

  // Filter items by selected location
  const items = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return menuItems;
    return menuItems.filter((item) => item.categoryId === selectedCategory);
  }, [menuItems, selectedCategory]);

  // Multi-word, case-insensitive filtering
  const filteredItems = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    const words = q.split(/\s+/).filter(Boolean);
    return items.filter((it) =>
      words.every(
        (w) =>
          it.name.toLowerCase().includes(w) ||
          String(it.price).toLowerCase().includes(w)
      )
    );
  }, [items, search]);

  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((sum, entry) => sum + entry.qty, 0);
  }, [cart]);

  return (
    <MainContainer>
      <ContentWrapper>
        {/* Products Section */}
        <ProductsSection>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={48} />
                <Typography variant="body2" color="text.secondary">
                  Loading products...
                </Typography>
              </Stack>
            </Box>
          ) : (
            <>
              {/* Location tabs: small, tab-like, with product count */}
              {categories.length > 0 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs
                    value={selectedCategory ?? 'all'}
                    onChange={(_, v: string) => setSelectedCategory(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                      minHeight: 40,
                      '& .MuiTab-root': { minHeight: 36, py: 0.75, px: 1.5, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 },
                      '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                    }}
                  >
                    {categories.map((loc) => (
                      <Tab
                        key={loc.id}
                        label={`${loc.title} (${loc.itemsCount ?? 0})`}
                        value={loc.id}
                      />
                    ))}
                  </Tabs>
                </Box>
              )}

              {/* Search + History */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <SearchContainer sx={{ py: 1, px: 1.5, flex: 1 }}>
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                  <InputBase
                    placeholder="Search products..."
                    sx={{ flex: 1, fontSize: '0.9rem' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    inputProps={{ "aria-label": "search items" }}
                  />
                  {search && (
                    <IconButton size="small" onClick={() => setSearch("")} aria-label="clear search" sx={{ color: 'text.secondary' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </SearchContainer>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShoppingCartCheckoutOutlined />}
                  onClick={() => setHistoryOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  History
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PointOfSaleOutlined />}
                  onClick={() => setRegisterOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  Register
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VerifiedUserOutlined />}
                  onClick={() => setFiscalOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  ZIMRA
                </Button>
              </Stack>

              <Divider sx={{ my: 2, borderWidth: 1 }} />

              {/* Products Grid */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {selectedCategory === 'all' ? 'All Products' : selectedCategory ? `Products at ${selectedCategory}` : 'Products'}
                  </Typography>
                  {filteredItems.length > 0 && (
                    <Chip
                      label={`${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Stack>

                {filteredItems.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: 'center',
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.background.paper, 0.6),
                      border: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {search ? 'No products found' : 'No products available'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {search
                        ? 'Try adjusting your search terms'
                        : 'Add products to your inventory to see them here'}
                    </Typography>
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr 1fr',
                        sm: 'repeat(auto-fill, minmax(260px, 1fr))',
                      },
                      gap: 1.25,
                      '& > *': { minWidth: 0 },
                    }}
                  >
                    {filteredItems.map((it) => (
                      <Box key={it.id} sx={{ width: '100%', minWidth: 0 }}>
                        <MenuItemCard
                          item={it}
                          onAdd={() => addItem(it)}
                          inCartQty={cart[it.id]?.qty ?? 0}
                          fullWidth
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          )}
        </ProductsSection>

        {/* Fixed Sidebar */}
        <SidebarContainer minimized={sidebarMinimized}>
          <MinimizeButton
            minimized={sidebarMinimized}
            onClick={() => setSidebarMinimized(!sidebarMinimized)}
            aria-label={sidebarMinimized ? "Expand checkout" : "Minimize checkout"}
          >
            {sidebarMinimized ? <ArrowUpward /> : <ArrowDownward />}
          </MinimizeButton>
          {!sidebarMinimized && (
            <OrderSidebar
              cart={cart}
              onAdd={addItem}
              onRemove={removeItem}
              onClear={clearCart}
              onLoadCart={loadCart}
              onSaleComplete={loadInventoryProducts}
            />
          )}
          {sidebarMinimized && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <ShoppingCartCheckoutOutlined sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart
                </Typography>
              </Stack>
            </Box>
          )}
        </SidebarContainer>
      </ContentWrapper>

      <OrderHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <RegisterDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <FiscalSettingsDialog open={fiscalOpen} onClose={() => setFiscalOpen(false)} />
    </MainContainer>
  );
}
