"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  AddOutlined,
  BusinessOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  HourglassEmptyOutlined,
  RefreshOutlined,
  ShoppingCartOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useUser } from "@/lib/auth/client";
import {
  approvePurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrdersForCurrentOrg,
  updatePurchaseOrder,
} from "@/lib/desktop/purchase-orders-bridge";
import { getAllSuppliers } from "@/lib/desktop/inventory-bridge";
type Supplier = {
  _id?: string | { toString(): string };
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
};

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

type PoLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemId?: string;
};

type PurchaseOrderRow = {
  _id?: string | { toString(): string };
  poNumber?: string | { toString(): string };
  vendor?: string;
  vendorId?: string;
  lines?: PoLine[];
  total?: number;
  status?: string;
  createdAt?: string | Date;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(d)
  );

function StatTile({
  label,
  value,
  sub,
  icon,
  color = "#0AA775",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: "100%" }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(color, 0.12),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function statusColor(status?: string): "default" | "info" | "warning" | "success" | "error" | "secondary" {
  switch (status) {
    case "approved":
      return "success";
    case "sent":
      return "warning";
    case "draft":
      return "info";
    case "received":
      return "secondary";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function PoFormFields({
  form,
  setForm,
  suppliers,
}: {
  form: { vendor: string; vendorId: string; lines: PoLine[] };
  setForm: React.Dispatch<React.SetStateAction<{ vendor: string; vendorId: string; lines: PoLine[] }>>;
  suppliers: Supplier[];
}) {
  const updateLine = (index: number, field: keyof PoLine, value: string | number) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      const line = { ...lines[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        line.total = Number(line.quantity) * Number(line.unitPrice);
      }
      lines[index] = line;
      return { ...prev, lines };
    });
  };

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Supplier</InputLabel>
        <Select
          label="Supplier"
          value={form.vendorId}
          onChange={(e: SelectChangeEvent) => {
            const supplier = suppliers.find((s) => s._id?.toString() === e.target.value);
            setForm((prev) => ({
              ...prev,
              vendorId: e.target.value,
              vendor: supplier?.name || prev.vendor,
            }));
          }}
        >
          {suppliers.length === 0 && (
            <MenuItem value="">
              <em>No suppliers — enter vendor name below</em>
            </MenuItem>
          )}
          {suppliers.map((s) => (
            <MenuItem key={s._id?.toString()} value={s._id?.toString()}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Vendor name"
        value={form.vendor}
        onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
        required
      />
      {form.lines.map((line, index) => (
        <Card key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700}>
                Line {index + 1}
              </Typography>
              {form.lines.length > 1 && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      lines: prev.lines.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              )}
            </Stack>
            <TextField
              size="small"
              label="Description"
              value={line.description}
              onChange={(e) => updateLine(index, "description", e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Qty"
                type="number"
                value={line.quantity}
                onChange={(e) => updateLine(index, "quantity", Number(e.target.value) || 0)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Unit price"
                type="number"
                value={line.unitPrice}
                onChange={(e) => updateLine(index, "unitPrice", Number(e.target.value) || 0)}
                sx={{ flex: 1 }}
              />
              <TextField size="small" label="Total" value={fmt(line.total)} disabled sx={{ flex: 1 }} />
            </Stack>
          </Stack>
        </Card>
      ))}
      <Button
        size="small"
        startIcon={<AddOutlined />}
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            lines: [...prev.lines, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
          }))
        }
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Add line
      </Button>
      <Typography variant="subtitle2" fontWeight={700} textAlign="right">
        Total: {fmt(form.lines.reduce((s, l) => s + l.total, 0))}
      </Typography>
    </Stack>
  );
}

export default function ProcurementPage() {
  const { user } = useUser();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [formOpen, setFormOpen] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<PurchaseOrderRow | null>(null);
  const [form, setForm] = useState({ vendor: "", vendorId: "", lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }] });

  const load = useCallback(async () => {
    if (!user?.publicMetadata?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [poRes, supRes] = await Promise.all([
        getPurchaseOrdersForCurrentOrg(200),
        getAllSuppliers(),
      ]);
      if (poRes.success) setOrders((poRes.data as unknown as PurchaseOrderRow[]) || []);
      if (supRes.success) setSuppliers((supRes.data as Supplier[]) || []);
    } catch {
      setSnackbar({ open: true, message: "Failed to load procurement data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [user?.publicMetadata?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const totalSpend = active.reduce((s, o) => s + (o.total || 0), 0);
    return {
      total: orders.length,
      draft: orders.filter((o) => o.status === "draft").length,
      pending: orders.filter((o) => o.status === "sent").length,
      approved: orders.filter((o) => o.status === "approved").length,
      received: orders.filter((o) => o.status === "received").length,
      spend: totalSpend,
      suppliers: suppliers.length,
    };
  }, [orders, suppliers]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.vendor?.toLowerCase().includes(q) ||
          o._id?.toString().includes(q) ||
          o.lines?.some((l) => l.description?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const statusChart = useMemo(() => {
    const buckets = [
      { label: "Draft", value: kpis.draft, color: "#42a5f5" },
      { label: "Sent", value: kpis.pending, color: "#ff9800" },
      { label: "Approved", value: kpis.approved, color: "#0AA775" },
      { label: "Received", value: kpis.received, color: "#7e57c2" },
    ].filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          data: buckets.map((b) => b.value),
          backgroundColor: buckets.map((b) => b.color),
          borderWidth: 0,
        },
      ],
    };
  }, [kpis]);

  const vendorChart = useMemo(() => {
    const spend: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status === "cancelled" || !o.vendor) return;
      spend[o.vendor] = (spend[o.vendor] || 0) + (o.total || 0);
    });
    const rows = Object.entries(spend)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
    return {
      labels: rows.map((r) => r.vendor),
      datasets: [
        {
          label: "Spend",
          data: rows.map((r) => r.amount),
          backgroundColor: alpha("#0AA775", 0.75),
          borderRadius: 6,
        },
      ],
    };
  }, [orders]);

  const resetForm = () =>
    setForm({ vendor: "", vendorId: "", lines: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }] });

  const poId = (po: PurchaseOrderRow): string => {
    const id = po.poNumber ?? po._id;
    return id == null ? "" : String(id);
  };

  const handleSave = async () => {
    if (!user?.publicMetadata?.companyId || !form.vendor || form.lines.length === 0) {
      setSnackbar({ open: true, message: "Vendor and at least one line are required", severity: "error" });
      return;
    }
    const total = form.lines.reduce((s, l) => s + l.total, 0);
    const payload = {
      orgId: user.publicMetadata.companyId as string,
      vendor: form.vendor,
      vendorId: form.vendorId || undefined,
      lines: form.lines,
      total,
      status: "draft" as const,
      requestedBy: user.id,
    };

    const res =
      formOpen === "edit" && selected
        ? await updatePurchaseOrder(poId(selected), {
            vendor: form.vendor,
            ...(form.vendorId ? { vendorId: form.vendorId } : {}),
            lines: form.lines,
            total,
          } as Parameters<typeof updatePurchaseOrder>[1])
        : await createPurchaseOrder(payload as never);

    if (res.success) {
      setSnackbar({
        open: true,
        message: formOpen === "edit" ? "Purchase order updated" : "Purchase order created",
        severity: "success",
      });
      setFormOpen(null);
      setSelected(null);
      resetForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const handleDelete = async (po: PurchaseOrderRow) => {
    const res = await deletePurchaseOrder(poId(po));
    if (res.success) {
      setSnackbar({ open: true, message: "Purchase order deleted", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const handleApprove = async (po: PurchaseOrderRow) => {
    if (!user?.id) return;
    const res = await approvePurchaseOrder(poId(po), user.id);
    if (res.success) {
      setSnackbar({ open: true, message: "Purchase order approved", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Approval failed", severity: "error" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["PO", "Vendor", "Status", "Total", "Date"],
      ...filtered.map((o) => [
        poId(o).slice(-8) || "",
        o.vendor || "",
        o.status || "",
        String(o.total || 0),
        o.createdAt ? fmtDate(o.createdAt) : "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Card
          variant="outlined"
          sx={(t) => ({
            borderRadius: 3,
            p: { xs: 2, md: 2.5 },
            borderColor: alpha(t.palette.primary.main, 0.25),
            bgcolor: alpha(t.palette.primary.main, 0.05),
          })}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Supply chain
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                Procurement
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Purchase orders, supplier spend, and approvals from your organisation data.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlined />}
                onClick={exportCsv}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshOutlined />}
                onClick={load}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => {
                  resetForm();
                  setFormOpen("create");
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                New PO
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Purchase orders"
              value={String(kpis.total)}
              icon={<ShoppingCartOutlined sx={{ fontSize: 20 }} />}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Total spend"
              value={fmt(kpis.spend)}
              icon={<BusinessOutlined sx={{ fontSize: 20 }} />}
              color="#2196f3"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Pending"
              value={String(kpis.pending + kpis.draft)}
              sub={`${kpis.draft} draft · ${kpis.pending} sent`}
              icon={<HourglassEmptyOutlined sx={{ fontSize: 20 }} />}
              color="#ff9800"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Approved"
              value={String(kpis.approved)}
              sub={`${kpis.received} received`}
              icon={<CheckCircleOutlined sx={{ fontSize: 20 }} />}
              color="#0AA775"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Suppliers"
              value={String(kpis.suppliers)}
              icon={<BusinessOutlined sx={{ fontSize: 20 }} />}
              color="#667eea"
            />
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
        >
          <Tab label="Overview" />
          <Tab label={`Orders (${orders.length})`} />
          <Tab label={`Suppliers (${suppliers.length})`} />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Orders by status
                </Typography>
                <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {statusChart.labels.length ? (
                    <Doughnut
                      data={statusChart}
                      options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No purchase orders yet.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Spend by vendor
                </Typography>
                <Box sx={{ height: 260 }}>
                  {vendorChart.labels.length ? (
                    <Bar
                      data={vendorChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { ticks: { callback: (v) => fmt(Number(v)) } },
                        },
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                      <Typography variant="body2" color="text.secondary">
                        No vendor spend recorded.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  placeholder="Search vendor or item…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="received">Received</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PO</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Items</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No purchase orders match your filters.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((po) => (
                    <TableRow key={po._id?.toString() || po.poNumber?.toString()} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {poId(po).slice(-8)}
                      </TableCell>
                      <TableCell>{po.vendor || "—"}</TableCell>
                      <TableCell align="right">{po.lines?.length || 0}</TableCell>
                      <TableCell align="right">{fmt(po.total || 0)}</TableCell>
                      <TableCell>
                        <Chip label={po.status || "draft"} size="small" color={statusColor(po.status)} variant="outlined" />
                      </TableCell>
                      <TableCell>{po.createdAt ? fmtDate(po.createdAt) : "—"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelected(po);
                                setFormOpen("view");
                              }}
                            >
                              <VisibilityOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {po.status === "draft" && (
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelected(po);
                                  setForm({
                                    vendor: po.vendor || "",
                                    vendorId: po.vendorId?.toString() || "",
                                    lines: po.lines?.length
                                      ? po.lines
                                      : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
                                  });
                                  setFormOpen("edit");
                                }}
                              >
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(po.status === "draft" || po.status === "sent") && (
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => handleApprove(po)}>
                                <CheckCircleOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {po.status === "draft" && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(po)}>
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 2 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Contact</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No suppliers yet. Add them from the Inventory → Suppliers tab.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s._id?.toString()}>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                      <TableCell>{s.contactEmail || "—"}</TableCell>
                      <TableCell>{s.contactPhone || "—"}</TableCell>
                      <TableCell>{s.contactPerson || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>

      <Dialog
        open={formOpen === "create" || formOpen === "edit"}
        onClose={() => setFormOpen(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{formOpen === "edit" ? "Edit purchase order" : "New purchase order"}</DialogTitle>
        <DialogContent>
          <PoFormFields form={form} setForm={setForm} suppliers={suppliers} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {formOpen === "edit" ? "Save changes" : "Create PO"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen === "view"} onClose={() => setFormOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Purchase order</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={selected.status || "draft"} size="small" color={statusColor(selected.status)} />
                <Chip label={selected.vendor || "Vendor"} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {selected.createdAt ? fmtDate(selected.createdAt) : ""} · Total {fmt(selected.total || 0)}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selected.lines || []).map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{fmt(line.unitPrice)}</TableCell>
                      <TableCell align="right">{fmt(line.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
