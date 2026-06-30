"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  alpha,
  styled,
  Stack,
  Grid,
  Snackbar,
  Alert,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { Receipt } from "../types";
import { generateAndDownloadPdf } from "../utils/receipt";
import { getPOSOrders } from "@/lib/desktop/pos-bridge";
import { fiscalisePosCreditNote } from "@/lib/desktop/fiscal-bridge";
import { useReceiptDesign } from "@/hooks/useReceiptDesign";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: 20,
    boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.12)}`,
    maxHeight: "90vh",
  },
}));

const OrderCard = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  padding: theme.spacing(2),
  transition: "all 0.2s ease",
  background: theme.palette.background.paper,
  "&:hover": {
    borderColor: alpha(theme.palette.primary.main, 0.4),
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
  },
}));

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderHistory({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config: receiptDesign } = useReceiptDesign();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "info" });

  const load = async () => {
    setLoading(true);
    try {
      const result = await getPOSOrders(50);
      if (result.success && result.data) {
        setOrders(result.data);
      } else {
        try {
          const raw = localStorage.getItem("pos_receipts");
          const list: Receipt[] = raw ? JSON.parse(raw) : [];
          setOrders(
            list.map((r) => ({
              _id: r.id,
              orderId: r.id,
              total: r.total,
              createdAt: r.date,
              paymentMethod: r.payment?.method,
              status: "completed",
              items: r.entries?.map((e: any) => ({ name: e.item?.name, quantity: e.qty })) || [],
            }))
          );
        } catch {
          setOrders([]);
        }
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          (o.orderId || o._id?.toString() || "").toLowerCase().includes(q) ||
          (o.tableNumber && String(o.tableNumber).includes(q))
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((o) => (o.status || "completed") === statusFilter);
    }
    return list;
  }, [orders, search, statusFilter]);

  const handleDownload = async (order: any) => {
    try {
      const receipt: Receipt = {
        id: order.orderId || order._id?.toString() || "",
        date: order.createdAt || new Date().toISOString(),
        table: order.tableNumber,
        entries: (order.items || []).map((item: any) => ({
          item: {
            id: item.itemId || item._id,
            name: item.name || "Item",
            price: item.price ?? 0,
            img: "",
          },
          qty: item.quantity ?? 1,
        })),
        subtotal: order.subtotal ?? order.total,
        tax: order.tax ?? 0,
        total: order.total ?? 0,
        payment: {
          method: (order.paymentMethod || "cash") as "cash" | "paynow" | "card",
          reference: order.paymentReference,
        },
        cashierName: order.completedByName || order.createdByName,
        fiscal: order.fiscal,
      };
      await generateAndDownloadPdf(receipt, receiptDesign);
    } catch {
      alert("Failed to generate PDF for this receipt.");
    }
  };

  const handleCreditNote = async (order: any) => {
    const orderId = order._id?.toString() || order.orderId;
    if (!orderId) return;
    if (!order.fiscal?.receiptId) {
      alert("This order has no ZIMRA fiscal receipt — credit note not available.");
      return;
    }
    const notes = window.prompt("Credit note reason (optional):", "Customer refund");
    if (notes === null) return;
    setRefundingId(orderId);
    try {
      const res = await fiscalisePosCreditNote({ orderId, receiptNotes: notes || undefined });
      if (!res.success) {
        setSnackbar({
          open: true,
          severity: "error",
          message: res.error || "Failed to issue credit note.",
        });
        return;
      }
      await load();
      if (res.skipped) {
        setSnackbar({
          open: true,
          severity: "warning",
          message: res.warning || "Refund recorded without a fiscal credit note.",
        });
        return;
      }
      setSnackbar({
        open: true,
        severity: "success",
        message: res.data?.verificationCode
          ? `Credit note issued. Verification: ${res.data.verificationCode}`
          : "Credit note issued successfully.",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err instanceof Error ? err.message : "Credit note failed.",
      });
    } finally {
      setRefundingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this stored receipt?")) return;
    setOrders((prev) =>
      prev.filter((o) => (o.orderId || o._id?.toString()) !== id)
    );
  };

  const statusOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.status || "completed"));
    return ["all", ...Array.from(set)];
  }, [orders]);

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          pb: 1,
          pt: 3,
          px: 3,
          borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.2)}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              }}
            >
              <ReceiptLongOutlinedIcon color="primary" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Order History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            sx={{ color: "text.secondary" }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {/* Filters */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            size="small"
            placeholder="Search by order ID or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: (t) => alpha(t.palette.action.hover, 0.4) },
            }}
            sx={{ flex: 1, maxWidth: 320 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {statusOptions.map((s) => (
              <Chip
                key={s}
                label={s === "all" ? "All" : s}
                size="small"
                onClick={() => setStatusFilter(s)}
                variant={statusFilter === s ? "filled" : "outlined"}
                color={statusFilter === s ? "primary" : "default"}
                sx={{ textTransform: "capitalize" }}
              />
            ))}
          </Stack>
        </Stack>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Box
            sx={{
              py: 8,
              textAlign: "center",
              borderRadius: 4,
              bgcolor: (t) => alpha(t.palette.action.hover, 0.3),
            }}
          >
            <ReceiptLongOutlinedIcon
              sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="body1" color="text.secondary">
              {orders.length === 0
                ? "No orders yet."
                : "No orders match your search."}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredOrders.map((order) => {
              const orderId = order.orderId || order._id?.toString() || "";
              const date = order.createdAt
                ? new Date(order.createdAt)
                : new Date();
              const status = order.status || "completed";
              const itemCount =
                order.items?.reduce(
                  (acc: number, i: any) => acc + (i.quantity ?? 1),
                  0
                ) ?? 0;

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={orderId}>
                  <OrderCard>
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          #{orderId.slice(-8)}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            label={status}
                            size="small"
                            color={status === "completed" ? "success" : status === "refunded" ? "warning" : "default"}
                            sx={{ textTransform: "capitalize" }}
                          />
                          {order.fiscal?.receiptId && (
                            <Chip label="Fiscal" size="small" color="info" variant="outlined" />
                          )}
                        </Stack>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={1} sx={{ color: "text.secondary" }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption">
                          {formatDate(date)}
                        </Typography>
                      </Stack>
                      {order.tableNumber && (
                        <Typography variant="caption" color="text.secondary">
                          Table {order.tableNumber}
                        </Typography>
                      )}
                      <Stack direction="row" alignItems="center" gap={1}>
                        <PaymentOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                          {order.paymentMethod || "cash"}
                        </Typography>
                        {itemCount > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                            {itemCount} item{itemCount !== 1 ? "s" : ""}
                          </Typography>
                        )}
                      </Stack>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ pt: 1, borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.3)}` }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          ${Number(order.total ?? 0).toFixed(2)}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {status === "completed" && order.fiscal?.receiptId && (
                            <IconButton
                              size="small"
                              onClick={() => handleCreditNote(order)}
                              disabled={refundingId === orderId}
                              aria-label="issue credit note"
                              sx={{
                                color: "warning.main",
                                bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                                "&:hover": { bgcolor: (t) => alpha(t.palette.warning.main, 0.16) },
                              }}
                            >
                              {refundingId === orderId ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <UndoOutlined fontSize="small" />
                              )}
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(order)}
                            aria-label="download receipt"
                            sx={{
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                              "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.16) },
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(orderId)}
                            aria-label="delete"
                            sx={{
                              color: "error.main",
                              bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                              "&:hover": { bgcolor: (t) => alpha(t.palette.error.main, 0.16) },
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Stack>
                  </OrderCard>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>

      {refundingId && (
        <Box
          sx={{
            px: 3,
            pb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Submitting credit note to ZIMRA…
          </Typography>
        </Box>
      )}

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.2)}`,
        }}
      >
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledDialog>
  );
}
