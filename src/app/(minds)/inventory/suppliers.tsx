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
  Menu,
  MenuItem,
  ListItemIcon,
  Select,
} from "@mui/material";
import {
  CloseOutlined,
  Add,
  EditOutlined,
  DeleteOutlined,
  BusinessOutlined,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
  LanguageOutlined,
  PersonOutlined,
  MoreVertOutlined,
  VisibilityOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  SearchOutlined,
  UploadFileOutlined,
  DownloadOutlined,
} from "@mui/icons-material";
import TabToolbar, { StatChip } from "@/components/TabToolbar";
import SupplierCsvDialog from "./components/SupplierCsvDialog";
import { downloadSuppliersCsv } from "@/lib/supplier-csv";
import {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
} from "@/lib/desktop/inventory-bridge";
import { Alert } from "@mui/material";

const SupplierCard = styled(Card)(({ theme }) => ({
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
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
    opacity: 0.6,
    transition: 'opacity 0.4s ease',
  },
  '&:hover': {
    transform: 'translateY(-12px) scale(1.02)',
    boxShadow: `0 24px 72px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
    borderColor: theme.palette.primary.main,
    '&::before': {
      opacity: 1,
      height: '6px',
    },
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

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<any | null>(null);
  const [name, setName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [zipCode, setZipCode] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const result = await getAllSuppliers();
      if (result.success && result.data) {
        setSuppliers(result.data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (supplier) =>
          supplier.name?.toLowerCase().includes(query) ||
          supplier.contactEmail?.toLowerCase().includes(query) ||
          supplier.contactPhone?.toLowerCase().includes(query) ||
          supplier.contactPerson?.toLowerCase().includes(query) ||
          supplier.city?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [suppliers, searchQuery]);

  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.status === 'active').length;
    const inactiveSuppliers = suppliers.filter((s) => s.status === 'inactive').length;

    return {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers,
    };
  }, [suppliers]);

  const handleExportCsv = () => {
    downloadSuppliersCsv(
      suppliers.map((s) => ({
        name: s.name ?? "",
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        country: s.country,
        website: s.website,
        contactPerson: s.contactPerson,
        status: s.status,
      }))
    );
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSupplier(null);
    setName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setCity("");
    setState("");
    setZipCode("");
    setCountry("");
    setWebsite("");
    setContactPerson("");
    setNotes("");
    setStatus("active");
    setError(null);
  };

  const handleOpenEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setName(supplier.name || "");
    setContactEmail(supplier.contactEmail || "");
    setContactPhone(supplier.contactPhone || "");
    setAddress(supplier.address || "");
    setCity(supplier.city || "");
    setState(supplier.state || "");
    setZipCode(supplier.zipCode || "");
    setCountry(supplier.country || "");
    setWebsite(supplier.website || "");
    setContactPerson(supplier.contactPerson || "");
    setNotes(supplier.notes || "");
    setStatus(supplier.status || "active");
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleOpenView = (supplier: any) => {
    setViewingSupplier(supplier);
    setOpenViewDialog(true);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, supplier: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedSupplier(supplier);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSupplier(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Supplier name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingSupplier) {
        const result = await updateSupplier(editingSupplier._id, {
          name: name.trim(),
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zipCode: zipCode || undefined,
          country: country || undefined,
          website: website || undefined,
          contactPerson: contactPerson || undefined,
          notes: notes || undefined,
          status,
        });

        if (result.success) {
          setSuccessMessage("Supplier updated successfully!");
          setSuccess(true);
          handleCloseDialog();
          fetchSuppliers();
        } else {
          setError(result.error || "Failed to update supplier");
        }
      } else {
        const result = await createSupplier({
          name: name.trim(),
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zipCode: zipCode || undefined,
          country: country || undefined,
          website: website || undefined,
          contactPerson: contactPerson || undefined,
          notes: notes || undefined,
        });

        if (result.success) {
          setSuccessMessage("Supplier created successfully!");
          setSuccess(true);
          handleCloseDialog();
          fetchSuppliers();
        } else {
          setError(result.error || "Failed to create supplier");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      const result = await deleteSupplier(supplierId);
      if (result.success) {
        setSuccessMessage("Supplier deleted successfully!");
        setSuccess(true);
        fetchSuppliers();
        handleMenuClose();
      } else {
        setError("Failed to delete supplier");
      }
    } catch (err) {
      setError("An error occurred while deleting");
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

      {/* Add/Edit Supplier Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
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
              {editingSupplier ? <EditOutlined /> : <BusinessOutlined />}
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
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editingSupplier ? "Update supplier information" : "Add a new supplier to your inventory system"}
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
                <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                  Supplier Name *
                </FormLabel>
                <TextField
                  placeholder="Enter supplier name"
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
                      <EmailOutlined sx={{ fontSize: 16 }} />
                      Contact Email
                    </FormLabel>
                    <TextField
                      type="email"
                      placeholder="supplier@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
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
                      <PhoneOutlined sx={{ fontSize: 16 }} />
                      Contact Phone
                    </FormLabel>
                    <TextField
                      placeholder="+1 (555) 123-4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
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
                  <PersonOutlined sx={{ fontSize: 16 }} />
                  Contact Person
                </FormLabel>
                <TextField
                  placeholder="John Doe"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  fullWidth
                />
              </FormControl>
            </Paper>

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
                  Address
                </FormLabel>
                <TextField
                  placeholder="Street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  fullWidth
                />
              </FormControl>
            </Paper>

            <Grid container spacing={2.5}>
              <Grid size={4}>
                <FormControl fullWidth>
                  <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                    City
                  </FormLabel>
                  <TextField
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid size={4}>
                <FormControl fullWidth>
                  <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                    State/Province
                  </FormLabel>
                  <TextField
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid size={4}>
                <FormControl fullWidth>
                  <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                    ZIP/Postal Code
                  </FormLabel>
                  <TextField
                    placeholder="ZIP Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2.5}>
              <Grid size={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                    Country
                  </FormLabel>
                  <TextField
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid size={6}>
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
                    <LanguageOutlined sx={{ fontSize: 16 }} />
                    Website
                  </FormLabel>
                  <TextField
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>

            {editingSupplier && (
              <FormControl fullWidth>
                <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                  Status
                </FormLabel>
                <Select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value as "active" | "inactive")}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            )}

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
                <FormLabel sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.95rem' }}>
                  Notes
                </FormLabel>
                <TextField
                  placeholder="Additional notes about this supplier..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
              </FormControl>
            </Paper>
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
            {loading ? <CircularProgress size={20} color="inherit" /> : editingSupplier ? "Update Supplier" : "Add Supplier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Supplier Dialog */}
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
        {viewingSupplier && (
          <>
            <Box
              sx={{
                position: 'relative',
                background: (theme) =>
                  viewingSupplier.status === 'active'
                    ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.dark, 0.05)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.dark, 0.05)} 100%)`,
                p: 3,
                borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: (theme) =>
                      viewingSupplier.status === 'active'
                        ? alpha(theme.palette.success.main, 0.15)
                        : alpha(theme.palette.error.main, 0.15),
                    color: (theme) =>
                      viewingSupplier.status === 'active' ? 'success.main' : 'error.main',
                    width: 64,
                    height: 64,
                  }}
                >
                  <BusinessOutlined sx={{ fontSize: 32 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      background: (theme) =>
                        viewingSupplier.status === 'active'
                          ? `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                          : `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {viewingSupplier.name}
                  </Typography>
                  <Chip
                    label={viewingSupplier.status === 'active' ? 'Active' : 'Inactive'}
                    color={viewingSupplier.status === 'active' ? 'success' : 'error'}
                    size="small"
                    icon={
                      viewingSupplier.status === 'active' ? (
                        <CheckCircleOutlined sx={{ fontSize: 14 }} />
                      ) : (
                        <CancelOutlined sx={{ fontSize: 14 }} />
                      )
                    }
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
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
                {viewingSupplier.contactEmail && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
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
                          <EmailOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Email
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {viewingSupplier.contactEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {viewingSupplier.contactPhone && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
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
                          <PhoneOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Phone
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {viewingSupplier.contactPhone}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {(viewingSupplier.address || viewingSupplier.city || viewingSupplier.state) && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                            width: 40,
                            height: 40,
                            mt: 0.5,
                          }}
                        >
                          <LocationOnOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Address
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {viewingSupplier.address}
                          </Typography>
                          {(viewingSupplier.city || viewingSupplier.state || viewingSupplier.zipCode) && (
                            <Typography variant="body2" color="text.secondary">
                              {[viewingSupplier.city, viewingSupplier.state, viewingSupplier.zipCode]
                                .filter(Boolean)
                                .join(', ')}
                            </Typography>
                          )}
                          {viewingSupplier.country && (
                            <Typography variant="body2" color="text.secondary">
                              {viewingSupplier.country}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {viewingSupplier.website && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
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
                          <LanguageOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Website
                          </Typography>
                          <Typography
                            variant="body1"
                            component="a"
                            href={viewingSupplier.website}
                            rel="noopener noreferrer"
                            sx={{
                              fontWeight: 600,
                              color: 'primary.main',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {viewingSupplier.website}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {viewingSupplier.contactPerson && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
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
                          <PersonOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Contact Person
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {viewingSupplier.contactPerson}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}

                {viewingSupplier.notes && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.5),
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                        Notes
                      </Typography>
                      <Typography variant="body2">{viewingSupplier.notes}</Typography>
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
                  handleOpenEdit(viewingSupplier);
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
                Edit Supplier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <SupplierCsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} onImported={() => void fetchSuppliers()} />

      <TabToolbar
        title="Suppliers"
        subtitle="Vendor contacts for purchase orders and procurement"
        chips={
          <>
            <StatChip icon={<BusinessOutlined />} label={`${stats.totalSuppliers} total`} />
            <StatChip icon={<CheckCircleOutlined />} label={`${stats.activeSuppliers} active`} color="success" />
            <StatChip icon={<CancelOutlined />} label={`${stats.inactiveSuppliers} inactive`} color="error" />
          </>
        }
        actions={
          <>
            <Button variant="outlined" size="small" startIcon={<UploadFileOutlined />} onClick={() => setCsvOpen(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Import CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<DownloadOutlined />} onClick={handleExportCsv} disabled={!suppliers.length} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Export CSV
            </Button>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenDialog(true)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
              Add supplier
            </Button>
          </>
        }
      />

      {/* Search */}
      <Paper
        sx={{
          p: 1.5,
          mb: 3,
          borderRadius: 2,
          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        }}
      >
        <TextField
          fullWidth
          placeholder="Search suppliers by name, email, phone, contact person, or city..."
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

      {/* Suppliers Grid */}
      {loading && suppliers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredSuppliers.length === 0 ? (
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
            <BusinessOutlined sx={{ fontSize: 64 }} />
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
            {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            {searchQuery
              ? 'Try adjusting your search terms to find what you\'re looking for'
              : 'Get started by adding your first supplier to track contacts and manage relationships.'}
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
              Add First Supplier
            </Button>
          )}
        </Paper>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {filteredSuppliers.map((supplier: any) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={supplier._id.toString()}>
                <SupplierCard>
                  <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            mb: 0.5,
                            fontSize: '1.1rem',
                            background: (theme) =>
                              supplier.status === 'active'
                                ? `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                                : `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                          noWrap
                        >
                          {supplier.name}
                        </Typography>
                        <Chip
                          label={supplier.status === 'active' ? 'Active' : 'Inactive'}
                          color={supplier.status === 'active' ? 'success' : 'error'}
                          size="small"
                          icon={
                            supplier.status === 'active' ? (
                              <CheckCircleOutlined sx={{ fontSize: 14 }} />
                            ) : (
                              <CancelOutlined sx={{ fontSize: 14 }} />
                            )
                          }
                          sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, supplier)}
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

                    <Divider sx={{ my: 2, borderColor: (theme) => alpha(theme.palette.divider, 0.3) }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {supplier.contactEmail && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                            {supplier.contactEmail}
                          </Typography>
                        </Box>
                      )}
                      {supplier.contactPhone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                            {supplier.contactPhone}
                          </Typography>
                        </Box>
                      )}
                      {supplier.contactPerson && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                            {supplier.contactPerson}
                          </Typography>
                        </Box>
                      )}
                      {(supplier.city || supplier.state) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                            {[supplier.city, supplier.state].filter(Boolean).join(', ') || 'Location not set'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </SupplierCard>
              </Grid>
            ))}
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
        <MenuItem onClick={() => selectedSupplier && handleOpenView(selectedSupplier)}>
          <ListItemIcon>
            <VisibilityOutlined fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedSupplier && handleOpenEdit(selectedSupplier)}>
          <ListItemIcon>
            <EditOutlined fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedSupplier && handleDelete(selectedSupplier._id.toString())}
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
