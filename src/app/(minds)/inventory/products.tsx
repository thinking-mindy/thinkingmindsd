"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
  Paper,
  Grid,
  Chip,
  alpha,
  styled,
  CircularProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  Menu,
  LinearProgress,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  ListItemIcon,
  Stack,
} from "@mui/material";
import {
  CloseOutlined,
  HighlightOffOutlined,
  TaskAltOutlined,
  Add,
  Inventory2Outlined,
  ShoppingCartOutlined,
  EditOutlined,
  SearchOutlined,
  FilterListOutlined,
  SortOutlined,
  MoreVertOutlined,
  VisibilityOutlined,
  DeleteOutlined,
  LocationOnOutlined,
  WarningAmberOutlined,
  CheckCircleOutlined,
  AttachMoneyOutlined,
  CategoryOutlined,
  UploadFileOutlined,
  DownloadOutlined,
} from "@mui/icons-material";
import StockCsvDialog from "./components/StockCsvDialog";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import { downloadStockCsv } from "@/lib/inventory-csv";
import {
  createInventoryItem,
  getAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  syncInventoryItemToPOS,
  getInventoryItemsForPOS,
} from "@/lib/desktop/inventory-bridge";
import { getMenuCategories } from "@/lib/desktop/pos-bridge";

const ProductCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'stockStatus',
})<{ stockStatus?: string }>(({ theme, stockStatus }) => ({
  height: '100%',
  borderRadius: 24,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  background: theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    background: stockStatus === 'error'
      ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.light})`
      : stockStatus === 'warning'
      ? `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
    opacity: 0.6,
    transition: 'opacity 0.4s ease',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    background: stockStatus === 'error'
      ? alpha(theme.palette.error.main, 0.05)
      : stockStatus === 'warning'
      ? alpha(theme.palette.warning.main, 0.05)
      : alpha(theme.palette.primary.main, 0.05),
    transition: 'all 0.4s ease',
  },
  '&:hover': {
    transform: 'translateY(-12px) scale(1.02)',
    boxShadow: stockStatus === 'error'
      ? `0 24px 72px ${alpha(theme.palette.error.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.error.main, 0.1)}`
      : stockStatus === 'warning'
      ? `0 24px 72px ${alpha(theme.palette.warning.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.warning.main, 0.1)}`
      : `0 24px 72px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
    borderColor: stockStatus === 'error'
      ? theme.palette.error.main
      : stockStatus === 'warning'
      ? theme.palette.warning.main
      : theme.palette.primary.main,
    '&::before': {
      opacity: 1,
      height: '6px',
    },
    '&::after': {
      transform: 'scale(1.5)',
      opacity: 0.1,
    },
  },
}));

const SearchBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}, 0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    transform: 'translateY(-2px)',
  },
}));

const FilterSelect = styled(Select)(({ theme }) => ({
  borderRadius: 16,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  '&.Mui-focused': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}));

export default function ProductsTab({ onInventoryChange }: { onInventoryChange?: () => void } = {}) {
  const [name, setName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [location, setLocation] = useState<string>("");
  const [reorderLevel, setReorderLevel] = useState<number>(0);
  const [addToPOS, setAddToPOS] = useState<boolean>(false);
  const [posCategoryId, setPosCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "price" | "recent">("name");
  const [filterBy, setFilterBy] = useState<"all" | "lowStock" | "outOfStock" | "inStock">("all");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  // Fetch items and categories
  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await getAllInventoryItems();
      if (result.success && result.data) {
        setItems(result.data);
        onInventoryChange?.();
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    downloadStockCsv(
      items.map((item) => ({
        sku: item.sku ?? "",
        name: item.name ?? "",
        quantity: item.quantity ?? 0,
        location: item.location,
        reorderLevel: item.reorderLevel,
        price: item.price,
      }))
    );
  };

  const fetchCategories = async () => {
    try {
      const result = await getMenuCategories();
      if (result.success && result.data) {
        setCategories(result.data);
        if (result.data.length > 0) {
          setPosCategoryId(String((result.data[0] as { _id: unknown })._id));
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterBy === "lowStock") {
      filtered = filtered.filter(
        (item) => item.reorderLevel && item.quantity <= item.reorderLevel
      );
    } else if (filterBy === "outOfStock") {
      filtered = filtered.filter((item) => (item.quantity || 0) === 0);
    } else if (filterBy === "inStock") {
      filtered = filtered.filter((item) => (item.quantity || 0) > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "quantity":
          return (b.quantity || 0) - (a.quantity || 0);
        case "price":
          return (b.price || 0) - (a.price || 0);
        case "recent":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchQuery, sortBy, filterBy]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setName("");
    setSku("");
    setQuantity(0);
    setPrice(0);
    setLocation("");
    setReorderLevel(0);
    setAddToPOS(false);
    setError(null);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name || "");
    setSku(item.sku || "");
    setQuantity(item.quantity || 0);
    setPrice(item.price || 0);
    setLocation(item.location || "");
    setReorderLevel(item.reorderLevel || 0);
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleOpenView = (item: any) => {
    setViewingItem(item);
    setOpenViewDialog(true);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Item name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingItem) {
        // Update existing item
        const result = await updateInventoryItem(editingItem._id, {
          sku: sku || `SKU-${Date.now()}`,
          name: name.trim(),
          quantity,
          price,
          location: location || undefined,
          reorderLevel: reorderLevel || undefined,
        });

        if (result.success) {
          setSuccessMessage("Item updated successfully!");
          setSuccess(true);
          handleCloseDialog();
          fetchItems();
        } else {
          setError(result.error || "Failed to update item");
        }
      } else {
        // Create new item
        const result = await createInventoryItem({
          sku: sku || `SKU-${Date.now()}`,
          name: name.trim(),
          quantity,
          price,
          location: location || undefined,
          reorderLevel: reorderLevel || undefined,
        });

        if (result.success && result.data) {
          // If addToPOS is checked, sync to POS
          if (addToPOS && posCategoryId) {
            const syncResult = await syncInventoryItemToPOS(
              String((result.data as { _id: unknown })._id),
              posCategoryId,
              {
                description: `Stock: ${quantity} | Location: ${location || 'N/A'}`,
              }
            );

            if (!syncResult.success) {
              console.warn('Failed to sync to POS:', syncResult.error);
            }
          }

          setSuccessMessage("Item created successfully!");
          setSuccess(true);
          handleCloseDialog();
          fetchItems();
        } else {
          setError(result.error || "Failed to create item");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const result = await deleteInventoryItem(itemId);
      if (result.success) {
        setSuccessMessage("Item deleted successfully!");
        setSuccess(true);
        fetchItems();
        handleMenuClose();
      } else {
        setError("Failed to delete item");
      }
    } catch (err) {
      setError("An error occurred while deleting");
    }
  };

  const getStockStatus = (item: any) => {
    if ((item.quantity || 0) === 0) return { label: "Out of Stock", color: "error" as const };
    if (item.reorderLevel && item.quantity <= item.reorderLevel)
      return { label: "Low Stock", color: "warning" as const };
    return { label: "In Stock", color: "success" as const };
  };

  const getStockPercentage = (item: any) => {
    if (!item.reorderLevel) return 100;
    const ratio = item.quantity / (item.reorderLevel * 2);
    return Math.min(100, Math.max(0, ratio * 100));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" variant="filled">
          {successMessage || "Operation successful!"}
        </Alert>
      </Snackbar>

      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
                : theme.palette.background.paper,
            backdropFilter: 'blur(20px)',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            boxShadow: (theme) =>
              `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
            p: 3,
            borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
                width: 48,
                height: 48,
              }}
            >
              {editingItem ? <EditOutlined /> : <Add />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editingItem ? "Update item details below" : "Fill in the details to add a new inventory item"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={(theme) => ({
              position: 'absolute',
              right: 16,
              top: 16,
              color: theme.palette.grey[500],
              backgroundColor: alpha(theme.palette.action.hover, 0.5),
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              },
            })}
          >
            <CloseOutlined />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <FormControl fullWidth>
                <FormLabel
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    fontSize: '0.95rem',
                    color: 'text.primary',
                  }}
                >
                  Item Name *
                </FormLabel>
                <TextField
                  placeholder="Enter item name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                />
              </FormControl>
            </Paper>

            <Grid container spacing={2.5}>
              <Grid size={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  }}
                >
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <CategoryOutlined sx={{ fontSize: 16 }} />
                      SKU
                    </FormLabel>
                    <TextField
                      placeholder="Auto-generated if empty"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      fullWidth
                    />
                  </FormControl>
                </Paper>
              </Grid>
              <Grid size={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) => alpha(theme.palette.success.main, 0.03),
                    border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  }}
                >
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <AttachMoneyOutlined sx={{ fontSize: 16, color: 'success.main' }} />
                      Price ($)
                    </FormLabel>
                    <TextField
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                    />
                  </FormControl>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2.5}>
              <Grid size={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Inventory2Outlined sx={{ fontSize: 16, color: 'primary.main' }} />
                      Quantity
                    </FormLabel>
                    <TextField
                      type="number"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0 }}
                      fullWidth
                    />
                  </FormControl>
                </Paper>
              </Grid>
              <Grid size={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.03),
                    border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                  }}
                >
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <WarningAmberOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
                      Reorder Level
                    </FormLabel>
                    <TextField
                      type="number"
                      placeholder="0"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0 }}
                      fullWidth
                    />
                  </FormControl>
                </Paper>
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <FormControl fullWidth>
                <FormLabel
                  sx={{
                    fontWeight: 600,
                    mb: 1.5,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <LocationOnOutlined sx={{ fontSize: 16 }} />
                  Location
                </FormLabel>
                <TextField
                  placeholder="Warehouse, Shelf, etc."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  fullWidth
                />
              </FormControl>
            </Paper>

            {!editingItem && (
              <>
                <Divider sx={{ my: 1 }} />
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={addToPOS}
                        onChange={(e) => setAddToPOS(e.target.checked)}
                        color="primary"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'primary.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'primary.main',
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <ShoppingCartOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Add to POS Menu
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Make this item available in the Point of Sale system
                        </Typography>
                      </Box>
                    }
                  />

                  {addToPOS && categories.length > 0 && (
                    <Box sx={{ mt: 2.5 }}>
                      <FormControl fullWidth>
                        <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                          POS Category
                        </FormLabel>
                        <Select
                          value={posCategoryId}
                          onChange={(e) => setPosCategoryId(e.target.value)}
                        >
                          {categories.map((cat: any) => (
                            <MenuItem key={cat._id.toString()} value={cat._id.toString()}>
                              {cat.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            p: 3,
            borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            background: (theme) => alpha(theme.palette.background.paper, 0.5),
          }}
        >
          <Button
            variant="outlined"
            startIcon={<HighlightOffOutlined />}
            onClick={handleCloseDialog}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            endIcon={<TaskAltOutlined />}
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: (theme) => `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                transform: 'translateY(-2px)',
              },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : editingItem ? "Update Item" : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Item Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
                : theme.palette.background.paper,
            backdropFilter: 'blur(20px)',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            boxShadow: (theme) =>
              `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        {viewingItem && (
          <>
            <Box
              sx={{
                position: 'relative',
                background: (theme) => {
                  const status = getStockStatus(viewingItem);
                  return status.color === 'error'
                    ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.dark, 0.05)} 100%)`
                    : status.color === 'warning'
                    ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.dark, 0.05)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`;
                },
                p: 3,
                borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: (theme) => {
                      const status = getStockStatus(viewingItem);
                      return status.color === 'error'
                        ? alpha(theme.palette.error.main, 0.15)
                        : status.color === 'warning'
                        ? alpha(theme.palette.warning.main, 0.15)
                        : alpha(theme.palette.primary.main, 0.15);
                    },
                    color: (theme) => {
                      const status = getStockStatus(viewingItem);
                      return status.color === 'error'
                        ? 'error.main'
                        : status.color === 'warning'
                        ? 'warning.main'
                        : 'primary.main';
                    },
                    width: 64,
                    height: 64,
                  }}
                >
                  <Inventory2Outlined sx={{ fontSize: 32 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      background: (theme) => {
                        const status = getStockStatus(viewingItem);
                        return status.color === 'error'
                          ? `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                          : status.color === 'warning'
                          ? `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                          : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`;
                      },
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {viewingItem.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={getStockStatus(viewingItem).label}
                      color={getStockStatus(viewingItem).color}
                      size="small"
                      icon={
                        getStockStatus(viewingItem).color === 'success' ? (
                          <CheckCircleOutlined sx={{ fontSize: 14 }} />
                        ) : getStockStatus(viewingItem).color === 'warning' ? (
                          <WarningAmberOutlined sx={{ fontSize: 14 }} />
                        ) : (
                          <HighlightOffOutlined sx={{ fontSize: 14 }} />
                        )
                      }
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    {viewingItem.sku && (
                      <Typography variant="caption" color="text.secondary">
                        SKU: {viewingItem.sku}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <IconButton
                aria-label="close"
                onClick={() => setOpenViewDialog(false)}
                sx={(theme) => ({
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  color: theme.palette.grey[500],
                  backgroundColor: alpha(theme.palette.action.hover, 0.5),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main',
                  },
                })}
              >
                <CloseOutlined />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid size={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      textAlign: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                      <Inventory2Outlined sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Quantity
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {viewingItem.quantity || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      backgroundColor: (theme) => alpha(theme.palette.success.main, 0.08),
                      border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      textAlign: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                      <AttachMoneyOutlined sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Price
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      ${(viewingItem.price || 0).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>

                {viewingItem.location && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                            width: 40,
                            height: 40,
                          }}
                        >
                          <LocationOnOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Location
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {viewingItem.location}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {viewingItem.reorderLevel && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Stock Level
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Reorder Level: {viewingItem.reorderLevel}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${Math.round(getStockPercentage(viewingItem))}%`}
                          color={getStockStatus(viewingItem).color}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getStockPercentage(viewingItem)}
                        color={getStockStatus(viewingItem).color}
                        sx={{
                          borderRadius: 2,
                          height: 10,
                          backgroundColor: (theme) => alpha(theme.palette.action.disabled, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions
              sx={{
                p: 3,
                borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                background: (theme) => alpha(theme.palette.background.paper, 0.5),
              }}
            >
              <Button
                onClick={() => setOpenViewDialog(false)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<EditOutlined />}
                onClick={() => {
                  setOpenViewDialog(false);
                  handleOpenEdit(viewingItem);
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: (theme) => `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Edit Item
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <StockCsvDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImported={() => void fetchItems()}
      />

      <TabToolbar
        title="Products & stock"
        subtitle="Manage items and sync to POS"
        chips={
          <>
            <StatChip icon={<Inventory2Outlined />} label={`${items.length} items`} />
            <StatChip
              icon={<WarningAmberOutlined />}
              label={`${items.filter((i: any) => i.reorderLevel && i.quantity <= i.reorderLevel).length} low`}
              color="warning"
            />
          </>
        }
        actions={
          <>
            <Button variant="outlined" size="small" startIcon={<UploadFileOutlined />} onClick={() => setCsvOpen(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Import CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<DownloadOutlined />} onClick={handleExportCsv} disabled={!items.length} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Export CSV
            </Button>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenDialog(true)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
              Add item
            </Button>
          </>
        }
      />

      {/* Search and Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SearchBox>
            <TextField
              fullWidth
              placeholder="Search by name, SKU, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined color="action" />
                  </InputAdornment>
                ),
                disableUnderline: true,
              }}
              variant="standard"
            />
          </SearchBox>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <FormControl fullWidth>
            <FilterSelect
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              startAdornment={<FilterListOutlined sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="all">All Items</MenuItem>
              <MenuItem value="inStock">In Stock</MenuItem>
              <MenuItem value="lowStock">Low Stock</MenuItem>
              <MenuItem value="outOfStock">Out of Stock</MenuItem>
            </FilterSelect>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <FormControl fullWidth>
            <FilterSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              startAdornment={<SortOutlined sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="name">Sort by Name</MenuItem>
              <MenuItem value="quantity">Sort by Quantity</MenuItem>
              <MenuItem value="price">Sort by Price</MenuItem>
              <MenuItem value="recent">Sort by Recent</MenuItem>
            </FilterSelect>
          </FormControl>
        </Grid>
      </Grid>

      {/* Items Grid */}
      {loading && items.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredAndSortedItems.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.6),
            borderRadius: 4,
            border: (theme) => `2px dashed ${alpha(theme.palette.divider, 0.5)}`,
            backgroundImage: (theme) =>
              theme.palette.mode === 'dark'
                ? `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`
                : `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 70%)`,
          }}
        >
          <Avatar
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 3,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            <Inventory2Outlined sx={{ fontSize: 64 }} />
          </Avatar>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {searchQuery ? 'No items found' : 'No inventory items yet'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            {searchQuery
              ? 'Try adjusting your search terms or filters to find what you\'re looking for'
              : 'Get started by adding your first inventory item. You can sync it to POS and track stock levels.'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  boxShadow: (theme) => `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Add First Item
            </Button>
          )}
        </Paper>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Showing {filteredAndSortedItems.length} of {items.length} items
                </Typography>
                {searchQuery && (
                  <Chip
                    label={`Search: "${searchQuery}"`}
                    size="small"
                    onDelete={() => setSearchQuery('')}
                    sx={{ fontWeight: 500 }}
                  />
                )}
              </Box>
              {filterBy !== 'all' && (
                <Chip
                  label={`Filter: ${filterBy === 'inStock' ? 'In Stock' : filterBy === 'lowStock' ? 'Low Stock' : 'Out of Stock'}`}
                  size="small"
                  color="primary"
                  onDelete={() => setFilterBy('all')}
                  sx={{ fontWeight: 500 }}
                />
              )}
            </Box>
          </Paper>
          <Grid container spacing={3}>
            {filteredAndSortedItems.map((item: any) => {
              const stockStatus = getStockStatus(item);
              const stockPercentage = getStockPercentage(item);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item._id.toString()}>
                  <ProductCard stockStatus={stockStatus.color}>
                    <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              mb: 0.5,
                              fontSize: '1.1rem',
                              background: (theme) =>
                                stockStatus.color === 'error'
                                  ? `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                                  : stockStatus.color === 'warning'
                                  ? `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`
                                  : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                            noWrap
                          >
                            {item.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CategoryOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {item.sku || 'No SKU'}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, item)}
                          sx={{
                            backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.5),
                            '&:hover': {
                              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            },
                          }}
                        >
                          <MoreVertOutlined fontSize="small" />
                        </IconButton>
                      </Box>

                      <Divider sx={{ my: 2.5, borderColor: (theme) => alpha(theme.palette.divider, 0.3) }} />

                      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                        <Grid size={6}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: (theme) => alpha(theme.palette.primary.main, 0.08),
                              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Inventory2Outlined
                                fontSize="small"
                                sx={{ color: 'primary.main' }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Quantity
                              </Typography>
                            </Box>
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 700,
                                color: 'primary.main',
                                lineHeight: 1.2,
                              }}
                            >
                              {item.quantity || 0}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={6}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: (theme) => alpha(theme.palette.success.main, 0.08),
                              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <AttachMoneyOutlined
                                fontSize="small"
                                sx={{ color: 'success.main' }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Price
                              </Typography>
                            </Box>
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 700,
                                color: 'success.main',
                                lineHeight: 1.2,
                              }}
                            >
                              ${(item.price || 0).toFixed(2)}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {item.reorderLevel && (
                        <Box sx={{ mb: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Stock Level
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {Math.round(stockPercentage)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={stockPercentage}
                            color={stockStatus.color}
                            sx={{
                              borderRadius: 2,
                              height: 8,
                              backgroundColor: (theme) => alpha(theme.palette.action.disabled, 0.1),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          label={stockStatus.label}
                          color={stockStatus.color}
                          size="small"
                          icon={
                            stockStatus.color === 'success' ? (
                              <CheckCircleOutlined sx={{ fontSize: 16 }} />
                            ) : stockStatus.color === 'warning' ? (
                              <WarningAmberOutlined sx={{ fontSize: 16 }} />
                            ) : (
                              <HighlightOffOutlined sx={{ fontSize: 16 }} />
                            )
                          }
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            height: 28,
                          }}
                        />
                        {item.location && (
                          <Chip
                            icon={<LocationOnOutlined sx={{ fontSize: 16 }} />}
                            label={item.location}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              height: 28,
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </ProductCard>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 180,
          },
        }}
      >
        <MenuItem onClick={() => selectedItem && handleOpenView(selectedItem)}>
          <ListItemIcon>
            <VisibilityOutlined fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedItem && handleOpenEdit(selectedItem)}>
          <ListItemIcon>
            <EditOutlined fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedItem && handleDelete(selectedItem._id.toString())}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlined fontSize="small" color="error" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
