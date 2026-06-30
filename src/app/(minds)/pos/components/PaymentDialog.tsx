import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  alpha,
  styled,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PaymentIcon from "@mui/icons-material/Payment";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useUser } from "@/lib/auth/client";
import { getCashierDisplayName } from "@/lib/cashier-display-name";
import { FiscalReceiptInfo, MenuItem, Receipt } from "../types";
import ReceiptPreview from "./ReceiptPreview";
import { initiatePOSPayNowPayment, checkPlanPaymentStatus } from "@/lib/desktop/payments-bridge";

type CartEntry = { item: MenuItem; qty: number };

export default function PaymentDialog({
  open,
  onClose,
  entries,
  subtotal,
  tax,
  total,
  table,
  onSuccess,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  entries: CartEntry[];
  subtotal: number;
  tax: number;
  total: number;
  table?: string;
  onSuccess: (info: { method: "cash" | "paynow" | "card"; paidAmount?: number; reference?: string }) => void;
  onCheckout?: (
    info: {
      method: "cash" | "paynow" | "card";
      paidAmount?: number;
      reference?: string;
    },
    onProgress?: (message: string) => void
  ) => Promise<{ fiscal?: FiscalReceiptInfo; invoiceNo?: string; fiscalWarning?: string } | void>;
}) {
  const [method, setMethod] = useState<"cash" | "paynow" | "card">("cash");

  // Cash input as string so typing is instant; parsed when needed
  const [cashPaidStr, setCashPaidStr] = useState<string>("");
  const cashPaid = useMemo(() => {
    const v = parseFloat(cashPaidStr as string);
    return Number.isFinite(v) ? v : 0;
  }, [cashPaidStr]);

  const change = useMemo(() => {
    if (method !== "cash") return 0;
    return Math.max(0, cashPaid - total);
  }, [cashPaid, method, total]);

  // PayNow phone/number (supports EcoCash, OneMoney, Telecash)
  const [paynowNumber, setPaynowNumber] = useState<string>("");
  const paynowValid = useMemo(() => {
    const cleaned = paynowNumber.replace(/\s+/g, "");
    // Zimbabwe format: 263XXXXXXXXX
    return /^263\d{9}$/.test(cleaned) || /^\+?263\d{9}$/.test(cleaned);
  }, [paynowNumber]);

  // Card flow
  const [cardTrack, setCardTrack] = useState<string>("");
  const [cardProcessing, setCardProcessing] = useState<boolean>(false);
  const [cardAuthorized, setCardAuthorized] = useState<boolean>(false);
  const [cardReference, setCardReference] = useState<string>("");

  // Receipt preview state
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // PayNow: wait for real payment before showing receipt
  const [paynowProcessing, setPaynowProcessing] = useState<boolean>(false);
  const [paynowError, setPaynowError] = useState<string | null>(null);

  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [fiscalWarningMsg, setFiscalWarningMsg] = useState<string | null>(null);
  const paynowPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useUser();
  const orgId = (user?.publicMetadata?.companyId as string) || "";
  const cashierName = getCashierDisplayName(user);

  useEffect(() => {
    if (open) {
      setMethod("cash");
      setCashPaidStr("");
      setPaynowNumber("");
      setCardTrack("");
      setCardProcessing(false);
      setCardAuthorized(false);
      setCardReference("");
      setReceipt(null);
      setShowReceipt(false);
      setPaynowProcessing(false);
      setPaynowError(null);
      setCheckoutProcessing(false);
      setCheckoutStatus(null);
      setCheckoutError(null);
      setFiscalWarningMsg(null);
    }
  }, [open]);

  // Clear PayNow poll on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (paynowPollRef.current) {
        clearInterval(paynowPollRef.current);
        paynowPollRef.current = null;
      }
    };
  }, []);

  const startCardProcessing = async () => {
    if (cardProcessing) return;
    setCardProcessing(true);
    setCardAuthorized(false);
    setCardReference("");
    await new Promise((r) => setTimeout(r, 2000));
    const ref = `CARD-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    setCardReference(ref);
    setCardAuthorized(true);
    setCardProcessing(false);
  };

  // save receipt to localStorage helper
  const persistReceipt = (receipt: Receipt) => {
    try {
      const key = "pos_receipts";
      const raw = localStorage.getItem(key);
      const list: Receipt[] = raw ? JSON.parse(raw) : [];
      list.unshift(receipt); // newest first
      // keep last 200 receipts just in case
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    } catch (err) {
      console.warn("Failed to persist receipt", err);
    }
  };

  const buildReceiptAndShow = (payment: {
    method: "cash" | "paynow" | "card";
    paidAmount?: number;
    reference?: string;
    paynowNumber?: string;
  }, fiscal?: FiscalReceiptInfo) => {
    const changeAmount =
      payment.method === "cash" && typeof payment.paidAmount === "number"
        ? Math.max(0, payment.paidAmount - total)
        : undefined;
    const rec: Receipt = {
      id: fiscal?.invoiceNo ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      table,
      cashierName,
      entries: entries.map((e) => ({ item: e.item, qty: e.qty })),
      subtotal,
      tax,
      total,
      payment: {
        ...payment,
        changeAmount,
        ecocashNumber: payment.paynowNumber,
        cardReference: payment.reference,
      },
      fiscal,
    };
    persistReceipt(rec);
    setReceipt(rec);
    setShowReceipt(true);
  };

  const finalizeCheckout = async (payment: {
    method: "cash" | "paynow" | "card";
    paidAmount?: number;
    reference?: string;
    paynowNumber?: string;
    ecocashNumber?: string;
    cardReference?: string;
  }) => {
    setCheckoutProcessing(true);
    setCheckoutError(null);
    setFiscalWarningMsg(null);
    setCheckoutStatus("Completing sale…");

    let fiscal: FiscalReceiptInfo | undefined;
    try {
      if (onCheckout) {
        const result = await onCheckout(payment, (message) => setCheckoutStatus(message));
        fiscal = result?.fiscal;
        if (result?.fiscalWarning) {
          setFiscalWarningMsg(result.fiscalWarning);
        }
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      const message =
        err instanceof Error ? err.message : "Checkout failed. Please try again.";
      setCheckoutError(message);
      setCheckoutProcessing(false);
      setCheckoutStatus(null);
      return;
    }
    try {
      setCheckoutStatus("Preparing receipt…");
      buildReceiptAndShow(payment, fiscal);
    } catch (err) {
      console.error("Failed to create receipt:", err);
      setCheckoutError("Failed to create receipt. Please try again.");
      setCheckoutProcessing(false);
      setCheckoutStatus(null);
      return;
    }
    setCheckoutProcessing(false);
    setCheckoutStatus(null);
  };

  const handleConfirm = async () => {
    if (method === "cash") {
      if (cashPaid < total) {
        alert("Paid amount is less than total.");
        return;
      }
    } else if (method === "paynow") {
      if (!paynowValid) {
        alert("Please enter a valid mobile number in 2637XXXXXXX format (Zimbabwe).");
        return;
      }
    } else if (method === "card") {
      if (!cardAuthorized) {
        alert("Please authorize the card payment (use the 'Start Card Payment' action).");
        return;
      }
    }

    // PayNow: initiate payment and wait for confirmation before showing receipt
    if (method === "paynow") {
      if (!orgId) {
        setPaynowError("Organization not found. Please sign in again.");
        return;
      }
      setPaynowError(null);
      setPaynowProcessing(true);
      const msisdn = paynowNumber.replace(/\s+/g, "").replace(/^\+/, "");
      try {
        const result = await initiatePOSPayNowPayment({
          orgId,
          amount: total,
          msisdn,
          method: "ecocash",
        });
        if (!result.success || !result.data?.paymentId) {
          setPaynowError(result.error || "Failed to start PayNow payment.");
          setPaynowProcessing(false);
          return;
        }
        const paymentId = result.data.paymentId;
        const poll = async () => {
          const statusResult = await checkPlanPaymentStatus(paymentId);
          if (!statusResult.success) return;
          const { data } = statusResult;
          if (data?.paid) {
            if (paynowPollRef.current) {
              clearInterval(paynowPollRef.current);
              paynowPollRef.current = null;
            }
            setPaynowProcessing(false);
            setPaynowError(null);
            await finalizeCheckout({
              method: "paynow",
              paynowNumber: paynowNumber.trim() || undefined,
            });
            return;
          }
          if (data?.status === "failed") {
            if (paynowPollRef.current) {
              clearInterval(paynowPollRef.current);
              paynowPollRef.current = null;
            }
            setPaynowProcessing(false);
            setPaynowError("Payment was not completed or was cancelled.");
          }
        };
        await poll();
        paynowPollRef.current = setInterval(poll, 3000);
        return;
      } catch (err) {
        console.error("PayNow error:", err);
        setPaynowError("Failed to start PayNow. Please try again.");
        setPaynowProcessing(false);
        return;
      }
    }

    await finalizeCheckout({
      method,
      paidAmount: method === "cash" ? cashPaid : undefined,
      reference: method === "card" ? cardReference || undefined : undefined,
      paynowNumber: undefined,
      ecocashNumber: undefined,
      cardReference: method === "card" ? cardReference || undefined : undefined,
    });
  };

  const canConfirm = useMemo(() => {
    if (checkoutProcessing) return false;
    if (paynowProcessing) return false;
    if (method === "cash") return cashPaid >= total;
    if (method === "paynow") return paynowValid;
    if (method === "card") return cardAuthorized && !cardProcessing;
    return false;
  }, [method, cashPaid, total, paynowValid, cardAuthorized, cardProcessing, paynowProcessing, checkoutProcessing]);

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setReceipt(null);
    setFiscalWarningMsg(null);
    // Call onSuccess after receipt is closed
    if (receipt) {
      onSuccess({
        method: receipt.payment.method,
        paidAmount: receipt.payment.paidAmount,
        reference: receipt.payment.reference,
      });
    }
    onClose();
  };

  // If showing receipt, show receipt preview dialog
  if (showReceipt && receipt) {
    return (
      <Dialog
        open={showReceipt}
        onClose={handleReceiptClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            "@media print": {
              backgroundColor: "#fff",
            },
          },
        }}
      >
        <DialogContent sx={{ p: 0, "@media print": { p: 2 } }}>
          {fiscalWarningMsg && (
            <Alert severity="warning" sx={{ m: 2, mb: 0, "@media print": { display: "none" } }}>
              {fiscalWarningMsg}
            </Alert>
          )}
          <ReceiptPreview receipt={receipt} onClose={handleReceiptClose} />
        </DialogContent>
      </Dialog>
    );
  }

  const theme = useTheme();

  const methodOptions: { value: "cash" | "paynow" | "card"; label: string; icon: React.ReactNode }[] = [
    { value: "cash", label: "Cash", icon: <AttachMoneyIcon /> },
    { value: "paynow", label: "PayNow", icon: <SmartphoneIcon /> },
    { value: "card", label: "Card", icon: <CreditCardIcon /> },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: theme.shadows[20],
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          px: 3,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <PaymentIcon sx={{ color: "primary.main", fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700}>
          Complete payment
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Order total card */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            mb: 2.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
            Total to pay
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: "primary.main", mt: 0.5 }}>
            ${total.toFixed(2)}
          </Typography>
          {table && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Table: {table}
            </Typography>
          )}
        </Box>

        {/* Payment method selector */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
          Payment method
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
          {methodOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={method === opt.value ? "contained" : "outlined"}
              onClick={() => setMethod(opt.value)}
              startIcon={opt.icon}
              sx={{
                flex: 1,
                py: 1.25,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                borderWidth: 2,
                "&.MuiButton-outlined": { borderColor: alpha(theme.palette.primary.main, 0.5) },
                "&.MuiButton-outlined:hover": { borderWidth: 2, borderColor: "primary.main", backgroundColor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {method === "cash" && (
          <Box>
            <TextField
              label="Amount received"
              type="number"
              fullWidth
              size="small"
              value={cashPaidStr}
              onChange={(e) => setCashPaidStr(e.target.value)}
              inputProps={{ inputMode: "decimal", min: 0 }}
            />
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: alpha(theme.palette.common.black, 0.03),
              }}
            >
              <Typography variant="body2" fontWeight={600}>Change due</Typography>
              <Typography variant="body1" fontWeight={700} color="success.main">${change.toFixed(2)}</Typography>
            </Box>
            {cashPaid < total && cashPaid > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                Amount received is less than total.
              </Alert>
            )}
          </Box>
        )}

        {method === "paynow" && (
          <Box>
            {paynowError && (
              <Alert severity="error" onClose={() => setPaynowError(null)} sx={{ mb: 1.5, borderRadius: 2 }}>
                {paynowError}
              </Alert>
            )}
            {paynowProcessing ? (
              <Box
                sx={{
                  py: 3,
                  px: 2,
                  borderRadius: 2,
                  textAlign: "center",
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <CircularProgress size={32} sx={{ mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Complete payment on your phone
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Waiting for PayNow confirmation…
                </Typography>
                {paynowNumber && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Mobile: <Typography component="span" fontWeight={600} color="text.primary">{paynowNumber}</Typography>
                  </Typography>
                )}
              </Box>
            ) : (
              <>
                <TextField
                  label="Mobile number"
                  placeholder="263771XXXXXX"
                  fullWidth
                  size="small"
                  value={paynowNumber}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (!value.startsWith("263")) value = "263" + value;
                    if (value.length > 12) value = value.slice(0, 12);
                    setPaynowNumber(value);
                  }}
                  inputProps={{ maxLength: 12 }}
                />
                <Typography
                  variant="caption"
                  color={paynowValid ? "success.main" : "text.secondary"}
                  sx={{ mt: 1, display: "block", fontWeight: 500 }}
                >
                  {paynowValid ? "✓ Valid number (EcoCash, OneMoney, Telecash)" : "Format: 2637XXXXXXX"}
                </Typography>
              </>
            )}
          </Box>
        )}

        {method === "card" && (
          <Box>
            <TextField
              label="Card data or last 4 digits"
              fullWidth
              size="small"
              value={cardTrack}
              onChange={(e) => setCardTrack(e.target.value)}
              disabled={cardProcessing || cardAuthorized}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={startCardProcessing}
                disabled={cardProcessing || cardAuthorized || !cardTrack}
                startIcon={cardProcessing ? <CircularProgress size={18} /> : <CreditCardIcon />}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                {cardProcessing ? "Processing…" : cardAuthorized ? "Authorized" : "Authorize card"}
              </Button>
              {cardAuthorized && (
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  Ref: {cardReference}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {checkoutError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setCheckoutError(null)}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Sale could not be completed
            </Typography>
            {checkoutError}
          </Alert>
        )}

        {checkoutProcessing && checkoutStatus && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CircularProgress size={22} />
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {checkoutStatus}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Button
          onClick={() => {
            if (paynowPollRef.current) {
              clearInterval(paynowPollRef.current);
              paynowPollRef.current = null;
            }
            setPaynowProcessing(false);
            onClose();
          }}
          disabled={cardProcessing || checkoutProcessing}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm}
          startIcon={
            !canConfirm || paynowProcessing || checkoutProcessing ? undefined : <PaymentIcon />
          }
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, px: 3 }}
        >
          {checkoutProcessing ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} color="inherit" />
              {checkoutStatus ?? "Processing…"}
            </Box>
          ) : method === "card" && cardProcessing ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} color="inherit" />
              Processing…
            </Box>
          ) : method === "paynow" && paynowProcessing ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} color="inherit" />
              Waiting for payment…
            </Box>
          ) : (
            "Pay & print receipt"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}