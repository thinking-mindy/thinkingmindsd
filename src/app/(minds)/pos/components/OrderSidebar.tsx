import React, { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  alpha,
  styled,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Badge,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import { MenuItem, type CartState, type HeldOrder } from "../types";
import PaymentDialog from "./PaymentDialog";
import HeldOrdersDock from "./HeldOrdersDock";
import { createPOSOrder, completePOSOrder } from "@/lib/desktop/pos-bridge";
import { fiscalisePosSale } from "@/lib/desktop/fiscal-bridge";
import { normalizeDocumentId } from "@/lib/document-id";
import { POS_VAT_RATE, posTaxLabel } from "@/lib/pos-tax";

const HELD_STORAGE_KEY = "pos_held_orders";

function cloneCart(cart: CartState): CartState {
  return JSON.parse(JSON.stringify(cart));
}

function newHeldId() {
  return `hold_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function OrderSidebar({
  cart,
  onAdd,
  onRemove,
  onClear,
  onLoadCart,
  onSaleComplete,
}: {
  cart: CartState;
  onAdd: (item: MenuItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onLoadCart: (cart: CartState) => void;
  onSaleComplete?: () => void | Promise<void>;
}) {
  const entries = Object.values(cart);
  const TAX_RATE = POS_VAT_RATE;
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HELD_STORAGE_KEY);
      if (raw) setHeldOrders(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HELD_STORAGE_KEY, JSON.stringify(heldOrders));
    } catch {
      /* ignore */
    }
  }, [heldOrders]);

  const subtotal = useMemo(
    () => entries.reduce((s, e) => s + e.item.price * e.qty, 0),
    [entries]
  );
  const tax = useMemo(() => (taxEnabled ? subtotal * TAX_RATE : 0), [subtotal, taxEnabled]);
  const total = subtotal + tax;

  const [paymentOpen, setPaymentOpen] = useState(false);

  const parkCurrentOrder = (label?: string) => {
    if (entries.length === 0) return;
    const order: HeldOrder = {
      id: newHeldId(),
      label: label?.trim() || `Parked #${heldOrders.length + 1}`,
      cart: cloneCart(cart),
      taxEnabled,
      heldAt: new Date().toISOString(),
    };
    setHeldOrders((prev) => [...prev, order]);
    onClear();
    setDockExpanded(true);
    setSnackbar({ open: true, message: `"${order.label}" parked — tap to resume anytime` });
  };

  const activateHeldOrder = (heldId: string) => {
    const target = heldOrders.find((h) => h.id === heldId);
    if (!target) return;

    const remaining = heldOrders.filter((h) => h.id !== heldId);

    if (entries.length > 0) {
      remaining.push({
        id: newHeldId(),
        label: `Parked #${remaining.length + 1}`,
        cart: cloneCart(cart),
        taxEnabled,
        heldAt: new Date().toISOString(),
      });
    }

    setHeldOrders(remaining);
    onLoadCart(cloneCart(target.cart));
    setTaxEnabled(target.taxEnabled);
    setSnackbar({ open: true, message: `Resumed "${target.label}"` });
  };

  const deleteHeldOrder = (heldId: string) => {
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
  };

  const handleHoldClick = () => {
    if (entries.length === 0) return;
    setHoldLabel(`Parked #${heldOrders.length + 1}`);
    setHoldDialogOpen(true);
  };

  const handleCheckout = async (
    paymentInfo: {
      method: "cash" | "paynow" | "card";
      paidAmount?: number;
      reference?: string;
    },
    onProgress?: (message: string) => void
  ) => {
    const invoiceNo = `INV-${Date.now()}`;
    onProgress?.("Saving order…");
    const orderData = {
      items: entries.map((e) => ({
        itemId: normalizeDocumentId(e.item.id),
        inventoryItemId: normalizeDocumentId(e.item.id),
        sku: e.item.sku,
        name: e.item.name,
        price: e.item.price,
        quantity: e.qty,
      })),
      subtotal,
      tax,
      total,
      paymentMethod: paymentInfo.method,
      paymentReference: paymentInfo.reference,
      createdBy: null as unknown as string,
    };

    const result = await createPOSOrder(orderData);
    if (!result.success || result.data?._id == null) {
      throw new Error(result.error || "Failed to save order");
    }

    onProgress?.("Recording payment…");
    const completeResult = await completePOSOrder(normalizeDocumentId(result.data._id), {
      method: paymentInfo.method,
      reference: paymentInfo.reference,
    });
    if (!completeResult.success) {
      throw new Error(completeResult.error || "Failed to complete order");
    }

    onProgress?.("Fiscalising with ZIMRA…");
    const fiscalResult = await fiscalisePosSale({
      orderId: String(result.data._id),
      invoiceNo,
      items: entries.map((e) => ({
        name: e.item.name,
        price: e.item.price,
        quantity: e.qty,
      })),
      payments: [{ method: paymentInfo.method, amount: total }],
      taxEnabled,
    });

    if (!fiscalResult.success) {
      throw new Error(fiscalResult.error || "ZIMRA fiscalisation failed");
    }

    if (fiscalResult.skipped) {
      return {
        invoiceNo,
        fiscalWarning: fiscalResult.warning,
      };
    }

    return {
      invoiceNo,
      fiscal: fiscalResult.data ?? undefined,
    };
  };

  const handlePaymentSuccess = () => {
    setPaymentOpen(false);
    onClear();
    void onSaleComplete?.();
  };

  const StyledPaper = styled(Paper)(({ theme }) => ({
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 0,
    background: theme.palette.background.paper,
    borderLeft: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    overflow: "hidden",
  }));

  return (
    <StyledPaper sx={{ p: 2, pb: 1.25, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, fontSize: "1rem" }}>
          Order Summary
        </Typography>
        {heldOrders.length > 0 && (
          <Chip
            label={`${heldOrders.length} parked`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ mr: 1, height: 22, fontWeight: 600 }}
          />
        )}
        <IconButton
          onClick={onClear}
          disabled={entries.length === 0}
          sx={{
            color: "error.main",
            "&:hover": { backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1) },
          }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      <HeldOrdersDock
        orders={heldOrders}
        expanded={dockExpanded}
        onToggleExpand={() => setDockExpanded((v) => !v)}
        onActivate={activateHeldOrder}
        onDelete={deleteHeldOrder}
      />

      <Divider sx={{ flexShrink: 0 }} />

      <List sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", py: 0 }}>
        {entries.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No items in order
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {heldOrders.length > 0
                ? "Resume a parked order above or add new items"
                : "Add items from the menu to get started"}
            </Typography>
          </Box>
        )}

        {entries.map((e) => {
          const lineTotal = e.item.price * e.qty;
          const serial = e.item.sku ?? null;
          return (
            <ListItem
              key={e.item.id}
              disablePadding
              sx={{
                borderRadius: 1.5,
                mb: 0.75,
                py: 0.75,
                px: 1.25,
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                alignItems: "flex-start",
              }}
              secondaryAction={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.25 }}>
                  <IconButton
                    size="small"
                    onClick={() => onRemove(e.item.id)}
                    sx={{ p: 0.25, color: "error.main", "&:hover": { backgroundColor: (t) => alpha(t.palette.error.main, 0.1) } }}
                  >
                    <RemoveIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center", fontWeight: 700, color: "primary.main", fontSize: "0.75rem" }}>
                    {e.qty}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onAdd(e.item)}
                    sx={{ p: 0.25, color: "primary.main", "&:hover": { backgroundColor: (t) => alpha(t.palette.primary.main, 0.1) } }}
                  >
                    <AddIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                disableTypography
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pr: 1 }}>
                    {e.item.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 0.25, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 0.5 }}>
                    {serial && (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.65rem" }}>
                        {serial}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                      ${e.item.price.toFixed(2)} × {e.qty}
                      <Box component="span" sx={{ fontWeight: 600, color: "primary.main", ml: 0.5 }}>
                        ${lineTotal.toFixed(2)}
                      </Box>
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ flexShrink: 0 }} />

      <Box
        sx={{
          flexShrink: 0,
          mt: "auto",
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          pt: 1.5,
          pb: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
          backgroundColor: "background.paper",
          borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
          <Typography variant="body2" fontWeight={600}>${subtotal.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 1.25 }}>
          <Button
            variant={taxEnabled ? "contained" : "outlined"}
            size="small"
            onClick={() => setTaxEnabled((prev) => !prev)}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5, flex: 1 }}
          >
            {posTaxLabel()} {taxEnabled ? "On" : "Off"}
          </Button>
          <Badge badgeContent={heldOrders.length} color="warning" invisible={heldOrders.length === 0}>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              startIcon={<PauseCircleOutline />}
              onClick={handleHoldClick}
              disabled={entries.length === 0}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5, flex: 1 }}
            >
              Park order
            </Button>
          </Badge>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{posTaxLabel()}</Typography>
          <Typography variant="body2" fontWeight={600}>${tax.toFixed(2)}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>Total</Typography>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ${total.toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" fullWidth onClick={onClear} disabled={entries.length === 0} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
            Clear
          </Button>
          <Button
            variant="contained"
            fullWidth
            color="primary"
            onClick={() => setPaymentOpen(true)}
            disabled={entries.length === 0}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            Process Payment
          </Button>
        </Box>
      </Box>

      <Dialog open={holdDialogOpen} onClose={() => setHoldDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Park this order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save the current cart and start a new order. You can park multiple orders and swap between them.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Label (optional)"
            placeholder="e.g. Table 4, John"
            value={holdLabel}
            onChange={(e) => setHoldLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                parkCurrentOrder(holdLabel);
                setHoldDialogOpen(false);
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHoldDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              parkCurrentOrder(holdLabel);
              setHoldDialogOpen(false);
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Park order
          </Button>
        </DialogActions>
      </Dialog>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        entries={entries}
        subtotal={subtotal}
        tax={tax}
        total={total}
        onCheckout={handleCheckout}
        onSuccess={handlePaymentSuccess}
      />

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="info" variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
}
