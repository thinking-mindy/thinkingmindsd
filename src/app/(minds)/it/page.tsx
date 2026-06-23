"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Avatar,
  Stack,
  Chip,
  alpha,
  useTheme,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  Computer,
  Support,
  Storage,
  Dashboard,
  Refresh,
  Add,
  Warning,
  CheckCircle,
  Close,
  Edit,
  Delete,
  Visibility,
} from "@mui/icons-material";
import { FlatCard, statIconSx } from "@/components/FlatCard";
import PlanGate from "@/components/PlanGate";
import { useUser } from "@/lib/auth/client";
import {
  createAsset,
  getAssetsByOrg,
} from "@/lib/desktop/assets-bridge";
import {
  createTicket,
  getTicketsByOrg,
} from "@/lib/desktop/helpdesk-bridge";

// Support Tickets component
function SupportTickets() {
  const theme = useTheme();
  const { user } = useUser();
  const [value, setValue] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "info" });
  const [newTicket, setNewTicket] = useState({
    subject: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    message: "",
  });
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        const response = await getTicketsByOrg(orgId);
        if (response.success && response.data) {
          setTickets(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [orgId]);

  const openTickets = tickets.filter((t) => t.status === "open");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return theme.palette.error.main;
      case "in_progress":
        return theme.palette.warning.main;
      case "resolved":
      case "closed":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return theme.palette.error.main;
      case "high":
        return theme.palette.warning.main;
      case "medium":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box sx={{ pt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Support Ticket Management
          </Typography>
          <Typography color="text.secondary">
            Track support tickets, issues, and escalation reports.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Ticket
        </Button>
      </Stack>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        <Tab label="All Tickets" />
        <Tab label="Open" />
        <Tab label="In Progress" />
        <Tab label="Resolved" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <Box sx={{ pt: 2 }}>
          {value === 0 && (
            <Grid container spacing={2}>
              {tickets.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", py: 6 }}>
                      <Support sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary">
                        No tickets found
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                tickets.map((ticket) => (
                  <Grid size={{ xs: 12, md: 6 }} key={ticket.ticketId || ticket._id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="h6" fontWeight={700}>
                              {ticket.subject || "Untitled Ticket"}
                            </Typography>
                            <Chip
                              label={ticket.status?.replace("_", " ").toUpperCase() || "OPEN"}
                              size="small"
                              sx={{
                                backgroundColor: alpha(getStatusColor(ticket.status || "open"), 0.15),
                                color: getStatusColor(ticket.status || "open"),
                                fontWeight: 700,
                                border: `1px solid ${alpha(getStatusColor(ticket.status || "open"), 0.3)}`,
                              }}
                            />
                          </Stack>
                          <Chip
                            label={ticket.priority?.toUpperCase() || "MEDIUM"}
                            size="small"
                            sx={{
                              backgroundColor: alpha(getPriorityColor(ticket.priority || "medium"), 0.15),
                              color: getPriorityColor(ticket.priority || "medium"),
                              fontWeight: 600,
                              width: "fit-content",
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {ticket.messages?.[0]?.message || "No description"}
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Created: {new Date(ticket.createdAt).toLocaleDateString()}
                            </Typography>
                            {ticket.assignedTo && (
                              <Chip label="Assigned" size="small" variant="outlined" />
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}
          {value === 1 && (
            <Grid container spacing={2}>
              {openTickets.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", py: 6 }}>
                      <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary">
                        No open tickets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                openTickets.map((ticket) => (
                  <Grid size={{ xs: 12, md: 6 }} key={ticket.ticketId || ticket._id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
                        backgroundColor: alpha(theme.palette.error.main, 0.05),
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="h6" fontWeight={700}>
                              {ticket.subject || "Untitled Ticket"}
                            </Typography>
                            <Chip label="OPEN" size="small" color="error" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {ticket.messages?.[0]?.message || "No description"}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}
          {value === 2 && (
            <Grid container spacing={2}>
              {inProgressTickets.map((ticket) => (
                <Grid size={{ xs: 12, md: 6 }} key={ticket.ticketId || ticket._id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      backgroundColor: alpha(theme.palette.warning.main, 0.05),
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" fontWeight={700}>
                            {ticket.subject || "Untitled Ticket"}
                          </Typography>
                          <Chip label="IN PROGRESS" size="small" color="warning" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.messages?.[0]?.message || "No description"}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {value === 3 && (
            <Grid container spacing={2}>
              {resolvedTickets.map((ticket) => (
                <Grid size={{ xs: 12, md: 6 }} key={ticket.ticketId || ticket._id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      backgroundColor: alpha(theme.palette.success.main, 0.05),
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" fontWeight={700}>
                            {ticket.subject || "Untitled Ticket"}
                          </Typography>
                          <Chip label="RESOLVED" size="small" color="success" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.messages?.[0]?.message || "No description"}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Create Ticket Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Create New Ticket
            </Typography>
            <IconButton size="small" onClick={() => setCreateDialogOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Subject"
              fullWidth
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTicket.priority}
                label="Priority"
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={newTicket.message}
              onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!newTicket.subject || !newTicket.message) {
                setSnackbar({ open: true, message: "Please fill in all required fields", severity: "error" });
                return;
              }
              setCreateLoading(true);
              try {
                if (!user?.id) {
                  setSnackbar({ open: true, message: "User not authenticated", severity: "error" });
                  return;
                }
                // Server action will handle ObjectId conversion from strings
                const result = await createTicket({
                  orgId: orgId as string | any, // Pass as string, server will convert
                  createdBy: user.id as string | any, // Pass as string, server will convert
                  subject: newTicket.subject,
                  priority: newTicket.priority,
                  status: "open",
                  messages: [
                    {
                      message: newTicket.message,
                      userId: user.id as string | any, // Pass as string, server will convert
                      timestamp: new Date(),
                    },
                  ],
                });
                if (result.success) {
                  setSnackbar({ open: true, message: "Ticket created successfully", severity: "success" });
                  setCreateDialogOpen(false);
                  setNewTicket({ subject: "", priority: "medium", message: "" });
                  // Refresh tickets
                  const response = await getTicketsByOrg(orgId);
                  if (response.success && response.data) {
                    setTickets(response.data || []);
                  }
                } else {
                  setSnackbar({ open: true, message: result.error || "Failed to create ticket", severity: "error" });
                }
              } catch (error) {
                console.error("Error creating ticket:", error);
                setSnackbar({ open: true, message: "Failed to create ticket", severity: "error" });
              } finally {
                setCreateLoading(false);
              }
            }}
            disabled={createLoading}
            startIcon={createLoading && <CircularProgress size={16} />}
          >
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Asset Management component
function Assets() {
  const theme = useTheme();
  const { user } = useUser();
  const [value, setValue] = useState(0);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "info" });
  const [newAsset, setNewAsset] = useState({
    tag: "",
    type: "",
    serial: "",
    status: "active" as "active" | "maintenance" | "retired" | "lost",
  });
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchAssets = async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        const response = await getAssetsByOrg(orgId);
        if (response.success && response.data) {
          setAssets(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [orgId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return theme.palette.success.main;
      case "maintenance":
        return theme.palette.warning.main;
      case "retired":
        return theme.palette.grey[500];
      case "lost":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const activeAssets = assets.filter((a) => a.status === "active");
  const maintenanceAssets = assets.filter((a) => a.status === "maintenance");

  return (
    <Box sx={{ pt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Asset Management
          </Typography>
          <Typography color="text.secondary">
            Track hardware assets, maintenance, and inventory.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Asset
        </Button>
      </Stack>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        <Tab label="All Assets" />
        <Tab label="Active" />
        <Tab label="Maintenance" />
        <Tab label="Details" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <Box sx={{ pt: 2 }}>
          {value === 0 && (
            <Grid container spacing={2}>
              {assets.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", py: 6 }}>
                      <Storage sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary">
                        No assets found
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                assets.map((asset) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={asset._id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        "&:hover": {
                          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                          transform: "translateY(-2px)",
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                        },
                      }}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="h6" fontWeight={700} gutterBottom>
                                {asset.tag || "Unnamed Asset"}
                              </Typography>
                              {asset.type && (
                                <Typography variant="body2" color="text.secondary">
                                  {asset.type}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={asset.status?.toUpperCase() || "ACTIVE"}
                              size="small"
                              sx={{
                                backgroundColor: alpha(getStatusColor(asset.status || "active"), 0.15),
                                color: getStatusColor(asset.status || "active"),
                                fontWeight: 700,
                                border: `1px solid ${alpha(getStatusColor(asset.status || "active"), 0.3)}`,
                              }}
                            />
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={asset.type || "Unknown"}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                            {asset.serial && (
                              <Typography variant="caption" color="text.secondary">
                                S/N: {asset.serial}
                              </Typography>
                            )}
                          </Stack>
                          {asset.purchaseDate && (
                            <Typography variant="caption" color="text.secondary">
                              Purchased: {new Date(asset.purchaseDate).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}
          {value === 1 && (
            <Grid container spacing={2}>
              {activeAssets.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", py: 6 }}>
                      <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary">
                        No active assets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                activeAssets.map((asset) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={asset._id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        backgroundColor: alpha(theme.palette.success.main, 0.05),
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="h6" fontWeight={700}>
                              {asset.tag || "Unnamed Asset"}
                            </Typography>
                            <Chip label="ACTIVE" size="small" color="success" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Type: {asset.type || "Unknown"}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}
          {value === 2 && (
            <Grid container spacing={2}>
              {maintenanceAssets.map((asset) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={asset._id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      backgroundColor: alpha(theme.palette.warning.main, 0.05),
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" fontWeight={700}>
                            {asset.name || asset.tag || "Unnamed Asset"}
                          </Typography>
                          <Chip label="MAINTENANCE" size="small" color="warning" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Type: {asset.type || "Unknown"}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {value === 3 && selectedAsset && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                p: 3,
              }}
            >
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight={700}>
                  Asset Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Asset Tag
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedAsset.tag || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Name
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedAsset.tag || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedAsset.type || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={selectedAsset.status?.toUpperCase() || "ACTIVE"}
                      sx={{
                        backgroundColor: alpha(getStatusColor(selectedAsset.status || "active"), 0.15),
                        color: getStatusColor(selectedAsset.status || "active"),
                        fontWeight: 700,
                      }}
                    />
                  </Grid>
                  {selectedAsset.serial && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Serial Number
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedAsset.serial}
                      </Typography>
                    </Grid>
                  )}
                  {selectedAsset.purchaseDate && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Purchase Date
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {new Date(selectedAsset.purchaseDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Stack>
            </Card>
          )}
          {value === 3 && !selectedAsset && (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <Storage sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No asset selected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on an asset from the list to view details
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Create Asset Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Add New Asset
            </Typography>
            <IconButton size="small" onClick={() => setCreateDialogOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Asset Tag"
              fullWidth
              value={newAsset.tag}
              onChange={(e) => setNewAsset({ ...newAsset, tag: e.target.value })}
              helperText="Unique identifier for the asset (e.g., ASSET-001)"
              required
            />
            <TextField
              label="Type"
              fullWidth
              value={newAsset.type}
              onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
              placeholder="e.g., Server, Laptop, Monitor"
            />
            <TextField
              label="Serial Number"
              fullWidth
              value={newAsset.serial}
              onChange={(e) => setNewAsset({ ...newAsset, serial: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newAsset.status}
                label="Status"
                onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value as any })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
                <MenuItem value="lost">Lost</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!newAsset.tag) {
                setSnackbar({ open: true, message: "Please enter asset tag", severity: "error" });
                return;
              }
              if (!newAsset.type) {
                setSnackbar({ open: true, message: "Please enter asset type", severity: "error" });
                return;
              }
              setCreateLoading(true);
              try {
                const result = await createAsset({
                  orgId: orgId as string | any,
                  tag: newAsset.tag,
                  type: newAsset.type,
                  serial: newAsset.serial || undefined,
                  status: newAsset.status,
                });
                if (result.success) {
                  setSnackbar({ open: true, message: "Asset created successfully", severity: "success" });
                  setCreateDialogOpen(false);
                  setNewAsset({ tag: "", type: "", serial: "", status: "active" });
                  // Refresh assets
                  const response = await getAssetsByOrg(orgId);
                  if (response.success && response.data) {
                    setAssets(response.data || []);
                  }
                } else {
                  setSnackbar({ open: true, message: result.error || "Failed to create asset", severity: "error" });
                }
              } catch (error) {
                console.error("Error creating asset:", error);
                setSnackbar({ open: true, message: "Failed to create asset", severity: "error" });
              } finally {
                setCreateLoading(false);
              }
            }}
            disabled={createLoading}
            startIcon={createLoading && <CircularProgress size={16} />}
          >
            Create Asset
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Dashboard Overview Component
function ITDashboard({ orgId }: { orgId: string }) {
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    totalAssets: 0,
    activeAssets: 0,
    maintenanceAssets: 0,
    retiredAssets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        
        // Fetch tickets and assets in parallel
        const [ticketsRes, assetsRes] = await Promise.all([
          getTicketsByOrg(orgId),
          getAssetsByOrg(orgId),
        ]);

        // Process tickets
        const tickets = ticketsRes.success && ticketsRes.data ? ticketsRes.data : [];
        const totalTickets = tickets.length;
        const openTickets = tickets.filter((t: any) => t.status === "open").length;
        const inProgressTickets = tickets.filter((t: any) => t.status === "in_progress").length;
        const resolvedTickets = tickets.filter((t: any) => 
          t.status === "resolved" || t.status === "closed"
        ).length;

        // Process assets
        const assets = assetsRes.success && assetsRes.data ? assetsRes.data : [];
        const totalAssets = assets.length;
        const activeAssets = assets.filter((a: any) => a.status === "active").length;
        const maintenanceAssets = assets.filter((a: any) => a.status === "maintenance").length;
        const retiredAssets = assets.filter((a: any) => a.status === "retired" || a.status === "lost").length;

        setStats({
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          totalAssets,
          activeAssets,
          maintenanceAssets,
          retiredAssets,
        });

        // Get recent tickets (last 5)
        setRecentTickets(tickets.slice(0, 5));
        
        // Get recent assets (last 5)
        setRecentAssets(assets.slice(0, 5));
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [orgId]);

  const metricCards = [
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: <Support />,
      color: theme.palette.primary.main,
      subtitle: `${stats.openTickets} open, ${stats.resolvedTickets} resolved`,
    },
    {
      title: "Open Tickets",
      value: stats.openTickets,
      icon: <Warning />,
      color: theme.palette.warning.main,
      subtitle: `${stats.inProgressTickets} in progress`,
      urgent: stats.openTickets > 0,
    },
    {
      title: "Resolved",
      value: stats.resolvedTickets,
      icon: <CheckCircle />,
      color: theme.palette.success.main,
      subtitle: `${stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0}% resolution rate`,
    },
    {
      title: "Total Assets",
      value: stats.totalAssets,
      icon: <Storage />,
      color: theme.palette.info.main,
      subtitle: `${stats.activeAssets} active, ${stats.maintenanceAssets} in maintenance`,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          Loading IT dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {metricCards.map((metric, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <FlatCard>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      sx={{
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {metric.title}
                    </Typography>
                    <Typography variant="h3" fontWeight={800} color="text.primary" sx={{ mt: 1, mb: 1 }}>
                      {metric.value}
                    </Typography>
                    {metric.subtitle && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          fontSize: "0.7rem",
                        }}
                      >
                        {metric.subtitle}
                      </Typography>
                    )}
                    {metric.urgent && (
                      <Chip
                        label="Action Required"
                        size="small"
                        color="error"
                        sx={{
                          mt: 1,
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          height: 20,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={[statIconSx(metric.urgent ? 'danger' : 'neutral'), { width: 48, height: 48 }]}>
                    {metric.icon}
                  </Box>
                </Stack>
              </CardContent>
            </FlatCard>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Recent Tickets
                </Typography>
                <Button size="small" sx={{ textTransform: "none" }}>
                  View All
                </Button>
              </Stack>
              {recentTickets.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Support sx={{ fontSize: 48, color: "text.secondary", mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    No recent tickets
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {recentTickets.map((ticket) => (
                    <Box
                      key={ticket.ticketId || ticket._id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {ticket.subject || "Untitled Ticket"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip
                          label={ticket.status?.replace("_", " ").toUpperCase() || "OPEN"}
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              ticket.status === "open"
                                ? theme.palette.error.main
                                : ticket.status === "in_progress"
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                              0.15
                            ),
                            color:
                              ticket.status === "open"
                                ? theme.palette.error.main
                                : ticket.status === "in_progress"
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                            }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Recent Assets
                </Typography>
                <Button size="small" sx={{ textTransform: "none" }}>
                  View All
                </Button>
              </Stack>
              {recentAssets.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Storage sx={{ fontSize: 48, color: "text.secondary", mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    No recent assets
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {recentAssets.map((asset) => (
                    <Box
                      key={asset._id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {asset.tag || "Unnamed Asset"}
                          </Typography>
                          {asset.type && (
                            <Typography variant="caption" color="text.secondary">
                              {asset.type}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={asset.status?.toUpperCase() || "ACTIVE"}
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              asset.status === "active"
                                ? theme.palette.success.main
                                : asset.status === "maintenance"
                                ? theme.palette.warning.main
                                : theme.palette.grey[500],
                              0.15
                            ),
                            color:
                              asset.status === "active"
                                ? theme.palette.success.main
                                : asset.status === "maintenance"
                                ? theme.palette.warning.main
                                : theme.palette.grey[500],
                          }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Main Dashboard component
function ITDepartmentDashboard() {
  const theme = useTheme();
  const { user } = useUser();
  const [mainTab, setMainTab] = useState(0);
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleMainTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setMainTab(newValue);
  };

  if (!orgId) {
    return (
      <Alert severity="warning">Organization ID not found. Please complete your profile setup.</Alert>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 2 }}>
      <Card
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.background.paper, 0.9)})`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Avatar
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  width: 56,
                  height: 56,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <Computer sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 0.5,
                  }}
                >
                  IT & Systems Management
                </Typography>
                <Typography color="text.secondary" fontWeight={500}>
                  Manage support tickets, assets, system monitoring, and IT infrastructure.
                </Typography>
              </Box>
            </Stack>
          </Box>
          <IconButton
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                transform: "rotate(180deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <Refresh />
          </IconButton>
        </Stack>
      </Card>

      <Tabs
        value={mainTab}
        onChange={handleMainTabChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 4,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            minHeight: 48,
            borderRadius: 2,
            mx: 0.5,
            "&.Mui-selected": {
              color: theme.palette.primary.main,
            },
          },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: 2,
          },
        }}
      >
        <Tab icon={<Dashboard sx={{ mr: 1 }} />} iconPosition="start" label="Dashboard" />
        <Tab icon={<Support sx={{ mr: 1 }} />} iconPosition="start" label="Support Tickets" />
        <Tab icon={<Storage sx={{ mr: 1 }} />} iconPosition="start" label="Asset Management" />
      </Tabs>

      {mainTab === 0 && <ITDashboard orgId={orgId} />}
      {mainTab === 1 && <SupportTickets />}
      {mainTab === 2 && <Assets />}
    </Box>
  );
}

export default function ITPage() {
  return (
    <PlanGate modulePath="/it" moduleName="IT Management">
      <ITDepartmentDashboard />
    </PlanGate>
  );
}