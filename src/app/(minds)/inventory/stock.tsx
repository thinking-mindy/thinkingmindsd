"use client";

import { useState, useEffect, useMemo } from "react";
import {
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
  InputAdornment,
  Avatar,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import {
  CloseOutlined,
  Add,
  TrendingUpOutlined,
  TrendingDownOutlined,
  SwapHorizOutlined,
  Inventory2Outlined,
  SearchOutlined,
  FilterListOutlined,
  DeleteOutlined,
  RefreshOutlined,
  HistoryOutlined,
  DownloadOutlined,
} from "@mui/icons-material";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import { downloadMovementsCsv } from "@/lib/stock-movements-csv";
import {
  createStockMovement,
  getStockMovements,
  deleteStockMovement,
  getAllInventoryItems,
} from "@/lib/desktop/inventory-bridge";
import { Alert } from "@mui/material";

const MovementCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
    borderColor: theme.palette.primary.main,
  },
}));

const StatCard = styled(Paper)<{ color?: string }>(({ theme, color }) => ({
  padding: theme.spacing(3),
  borderRadius: 20,
  background: color
    ? `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`
    : theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: color ? `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})` : 'transparent',
  },
}));

export default function StockTab() {
  const [movements, setMovements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "IN" | "OUT" | "ADJUST">("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movementsRes, itemsRes] = await Promise.all([
        getStockMovements({ limit: 200 }),
        getAllInventoryItems(),
      ]);

      if (movementsRes.success && movementsRes.data) {
        setMovements(movementsRes.data);
      }

      if (itemsRes.success && itemsRes.data) {
        setItems(itemsRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (movement) =>
          movement.itemName?.toLowerCase().includes(query) ||
          movement.itemSku?.toLowerCase().includes(query) ||
          movement.reason?.toLowerCase().includes(query) ||
          movement.reference?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((movement) => movement.type === filterType);
    }

    return filtered;
  }, [movements, searchQuery, filterType]);

  const stats = useMemo(() => {
    const totalMovements = movements.length;
    const inMovements = movements.filter((m) => m.type === 'IN').length;
    const outMovements = movements.filter((m) => m.type === 'OUT').length;
    const adjustMovements = movements.filter((m) => m.type === 'ADJUST').length;
    const totalIn = movements
      .filter((m) => m.type === 'IN')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);
    const totalOut = movements
      .filter((m) => m.type === 'OUT')
      .reduce((sum, m) => sum + (m.quantity || 0), 0);

    return {
      totalMovements,
      inMovements,
      outMovements,
      adjustMovements,
      totalIn,
      totalOut,
    };
  }, [movements]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItemId("");
    setMovementType("IN");
    setQuantity(0);
    setReason("");
    setReference("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      setError("Please select an item");
      return;
    }

    if (quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedItem = items.find((item) => item._id.toString() === selectedItemId);
      if (!selectedItem) {
        setError("Selected item not found");
        return;
      }

      const result = await createStockMovement({
        itemId: selectedItemId,
        itemName: selectedItem.name,
        itemSku: selectedItem.sku,
        type: movementType,
        quantity,
        reason: reason || undefined,
        reference: reference || undefined,
        location: selectedItem.location,
      });

      if (result.success) {
        setSuccess(true);
        handleCloseDialog();
        fetchData();
      } else {
        setError(result.error || "Failed to create stock movement");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (movementId: string) => {
    if (!confirm("Are you sure you want to delete this stock movement? This will reverse the quantity change.")) return;

    try {
      const result = await deleteStockMovement(movementId);
      if (result.success) {
        setSuccess(true);
        fetchData();
      } else {
        setError("Failed to delete movement");
      }
    } catch (err) {
      setError("An error occurred while deleting");
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <TrendingUpOutlined sx={{ color: 'success.main' }} />;
      case 'OUT':
        return <TrendingDownOutlined sx={{ color: 'error.main' }} />;
      case 'ADJUST':
        return <SwapHorizOutlined sx={{ color: 'warning.main' }} />;
      default:
        return <Inventory2Outlined />;
    }
  };

  const handleExportCsv = () => {
    downloadMovementsCsv(
      filteredMovements.map((m) => ({
        date: m.createdAt ? new Date(m.createdAt).toISOString() : "",
        type: m.type ?? "",
        itemName: m.itemName ?? "",
        itemSku: m.itemSku ?? "",
        quantity: m.quantity ?? 0,
        reason: m.reason ?? "",
        reference: m.reference ?? "",
      }))
    );
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'IN':
        return 'success';
      case 'OUT':
        return 'error';
      case 'ADJUST':
        return 'warning';
      default:
        return 'default';
    }
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
          Stock movement recorded successfully!
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

      {/* Add Stock Movement Dialog */}
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
              <Add />
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
                Record Stock Movement
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add stock in, out, or adjust inventory levels
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
            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                Item *
              </FormLabel>
              <Select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {items.map((item: any) => (
                  <MenuItem key={item._id.toString()} value={item._id.toString()}>
                    {item.name} {item.sku && `(${item.sku})`} - Qty: {item.quantity || 0}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                Movement Type *
              </FormLabel>
              <Select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as any)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="IN">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpOutlined sx={{ color: 'success.main' }} />
                    <Typography>Stock In (Add)</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUT">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDownOutlined sx={{ color: 'error.main' }} />
                    <Typography>Stock Out (Remove)</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="ADJUST">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapHorizOutlined sx={{ color: 'warning.main' }} />
                    <Typography>Adjust (Set Quantity)</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                {movementType === 'ADJUST' ? 'New Quantity *' : 'Quantity *'}
              </FormLabel>
              <TextField
                type="number"
                placeholder={movementType === 'ADJUST' ? 'Enter new quantity' : 'Enter quantity'}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: movementType === 'ADJUST' ? 1 : 0.01 }}
                fullWidth
              />
              {selectedItemId && movementType !== 'ADJUST' && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Current quantity: {items.find((i: any) => i._id.toString() === selectedItemId)?.quantity || 0}
                  {movementType === 'IN' && ` → ${(items.find((i: any) => i._id.toString() === selectedItemId)?.quantity || 0) + quantity}`}
                  {movementType === 'OUT' && ` → ${Math.max(0, (items.find((i: any) => i._id.toString() === selectedItemId)?.quantity || 0) - quantity)}`}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                Reason (Optional)
              </FormLabel>
              <TextField
                placeholder="e.g., Purchase order, Sale, Stock take, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                Reference (Optional)
              </FormLabel>
              <TextField
                placeholder="e.g., PO-12345, Order-67890, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                fullWidth
              />
            </FormControl>
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
            onClick={handleSubmit}
            disabled={loading || !selectedItemId || quantity <= 0}
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
            {loading ? <CircularProgress size={20} color="inherit" /> : "Record Movement"}
          </Button>
        </DialogActions>
      </Dialog>

      <TabToolbar
        title="Stock movements"
        subtitle="Track stock in, out, and quantity adjustments"
        chips={
          <>
            <StatChip icon={<HistoryOutlined />} label={`${stats.totalMovements} total`} />
            <StatChip icon={<TrendingUpOutlined />} label={`${stats.totalIn} in`} color="success" />
            <StatChip icon={<TrendingDownOutlined />} label={`${stats.totalOut} out`} color="error" />
            <StatChip icon={<SwapHorizOutlined />} label={`${stats.adjustMovements} adjust`} color="warning" />
          </>
        }
        actions={
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadOutlined />}
              onClick={handleExportCsv}
              disabled={filteredMovements.length === 0}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshOutlined />}
              onClick={() => void fetchData()}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Record movement
            </Button>
          </>
        }
      />

      {/* Search and Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by item name, SKU, reason, or reference..."
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
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              startAdornment={<FilterListOutlined sx={{ mr: 1, color: 'text.secondary' }} />}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="IN">Stock In</MenuItem>
              <MenuItem value="OUT">Stock Out</MenuItem>
              <MenuItem value="ADJUST">Adjustments</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Movements Table */}
      {loading && movements.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredMovements.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.6),
            borderRadius: 4,
            border: (theme) => `2px dashed ${alpha(theme.palette.divider, 0.5)}`,
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
            <HistoryOutlined sx={{ fontSize: 64 }} />
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
            No stock movements yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            Start tracking your inventory by recording stock movements
          </Typography>
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
            Record First Movement
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Previous</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>New</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMovements.map((movement: any) => (
                <TableRow
                  key={movement._id.toString()}
                  sx={{
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
                    },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {movement.itemName}
                      </Typography>
                      {movement.itemSku && (
                        <Typography variant="caption" color="text.secondary">
                          SKU: {movement.itemSku}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getMovementIcon(movement.type)}
                      label={movement.type}
                      color={getMovementColor(movement.type) as any}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color:
                          movement.type === 'IN'
                            ? 'success.main'
                            : movement.type === 'OUT'
                            ? 'error.main'
                            : 'warning.main',
                      }}
                    >
                      {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : '='}{' '}
                      {movement.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {movement.previousQuantity || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {movement.newQuantity || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {movement.reason || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(movement.createdAt).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Delete movement (reverses quantity change)">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(movement._id.toString())}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
